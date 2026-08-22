import "server-only";

import { extractShopeeJson, normalizeParsedShopee, type ParsedShopeeOrder } from "@/lib/parse-shopee-order";
import { parseBillCustomerText, parseRecipientText, sanitizeLabelRecipient } from "@/lib/parse-recipient-text";
import { completeThaiAddress } from "@/lib/thai-address";

const SHOPEE_PROMPT = `คุณคือผู้ช่วยร้านค้าไทย อ่านภาพหน้าออเดอร์จาก Shopee Seller Centre (หลังบ้านผู้ขาย) หรือแคปรายละเอียดออเดอร์ช้อปปี้
ตอบเป็น JSON เท่านั้น ตามโครงนี้:
{
  "buyerName": "",
  "phone": "",
  "email": "",
  "line1": "",
  "subdistrict": "",
  "district": "",
  "province": "",
  "postalCode": "",
  "note": "",
  "orderDiscount": 0,
  "taxId": "",
  "items": [
    { "name": "", "variantName": "", "price": 0, "quantity": 1, "discount": 0 }
  ]
}

กฎ:
- price คือราคาต่อชิ้นเป็นบาท ไม่ใช่ราคารวมแถว
- quantity คือจำนวนชิ้นของรายการนั้น
- discount คือส่วนลดของรายการนั้นเป็นบาท ถ้าไม่มีใส่ 0
- ถ้ามีส่วนลดทั้งออเดอร์ ให้ใส่ orderDiscount เป็นบาท อย่าใส่ค่าส่งเป็นรายการสินค้า
- taxId คือเลขผู้เสียภาษี 13 หลัก ถ้ามีในภาพ
- ห้ามใส่ค่าจัดส่ง / ค่าส่ง / shipping fee ลงใน items
- variantName คือตัวเลือกสินค้า เช่น สี ขนาด รุ่น ถ้าแยกได้ไม่ต้องต่อท้ายชื่อสินค้า
- line1 คือบ้านเลขที่ หมู่ ซอย ถนน อาคาร ห้อง ไม่รวมตำบล อำเภอ จังหวัด รหัสไปรษณีย์
- จังหวัดใช้ชื่อทางการ เช่น กรุงเทพมหานคร ไม่ใช้ กทม.
- ถ้าเบอร์ถูกปิดเป็น *** หรือ x ไม่ต้องเดา ใส่สตริงว่าง
- ถ้าอ่านไม่ได้ใส่สตริงว่างหรือ 0 อย่าแต่งข้อมูลที่ไม่มีในภาพ`;

function visionKeys() {
  return {
    gemini:
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim() ||
      "",
    openai: process.env.OPENAI_API_KEY?.trim() || "",
  };
}

export function hasShopeeVisionKey() {
  const keys = visionKeys();
  return Boolean(keys.gemini || keys.openai);
}

async function parseWithGemini(b64: string, mime: string, key: string) {
  const models = [
    process.env.GEMINI_MODEL?.trim(),
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
  ].filter((m, i, all): m is string => Boolean(m) && all.indexOf(m) === i);

  let last = "Gemini อ่านภาพไม่ได้";
  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: SHOPEE_PROMPT },
                { inlineData: { mimeType: mime, data: b64 } },
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json", temperature: 0 },
        }),
      },
    );
    const payload = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    if (!res.ok) {
      last = payload.error?.message || `Gemini ${res.status}`;
      continue;
    }
    const textOut = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!textOut.trim()) {
      last = "Gemini ไม่ส่งข้อความกลับ";
      continue;
    }
    return normalizeParsedShopee(extractShopeeJson(textOut));
  }
  throw new Error(last);
}

async function parseWithOpenAI(b64: string, mime: string, key: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SHOPEE_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "อ่านภาพนี้" },
            { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
          ],
        },
      ],
    }),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (!res.ok) throw new Error(payload.error?.message || `OpenAI ${res.status}`);
  const textOut = payload.choices?.[0]?.message?.content ?? "";
  return normalizeParsedShopee(extractShopeeJson(textOut));
}

function completeParsedAddress(parsed: ParsedShopeeOrder): ParsedShopeeOrder {
  const loc = completeThaiAddress({
    province: parsed.province,
    district: parsed.district,
    subdistrict: parsed.subdistrict,
    postalCode: parsed.postalCode,
  });
  return {
    ...parsed,
    province: loc.province || parsed.province,
    district: loc.district || parsed.district,
    subdistrict: loc.subdistrict || parsed.subdistrict,
    postalCode: loc.postalCode || parsed.postalCode,
  };
}

export async function parseShopeeOrderImage(bytes: Uint8Array, mimeType: string): Promise<ParsedShopeeOrder> {
  const keys = visionKeys();
  if (!keys.gemini && !keys.openai) {
    throw new Error("ตั้งค่า GEMINI_API_KEY หรือ OPENAI_API_KEY ใน .env.local เพื่ออ่านแคปช้อปปี้");
  }
  const mime = mimeType.startsWith("image/") ? mimeType : "image/jpeg";
  const b64 = Buffer.from(bytes).toString("base64");
  const parsed = keys.gemini
    ? await parseWithGemini(b64, mime, keys.gemini).catch(async (err) => {
        if (!keys.openai) throw err;
        return parseWithOpenAI(b64, mime, keys.openai);
      })
    : await parseWithOpenAI(b64, mime, keys.openai);
  return completeParsedAddress(parsed);
}

const ADDRESS_PROMPT = `คุณคือผู้ช่วยร้านค้าไทย อ่านข้อความที่อยู่จัดส่งจากช้อปปี้ / LINE / ลูกค้า
ตอบเป็น JSON เท่านั้น ตามโครงนี้:
{
  "buyerName": "",
  "phone": "",
  "email": "",
  "line1": "",
  "subdistrict": "",
  "district": "",
  "province": "",
  "postalCode": "",
  "note": "",
  "items": []
}

กฎ:
- ดึงเฉพาะชื่อผู้รับ เบอร์โทรหนึ่งเบอร์ และที่อยู่
- ตัดคำนำหน้าบริษัท เช่น ห้างหุ้นส่วนจำกัด บริษัท จำกัด ออกจากชื่อ เหลือชื่อร้าน/ชื่อคน
- เบอร์โทรใช้เบอร์แรกเท่านั้น ห้ามรวมเบอร์ที่สอง
- ห้ามใส่เลขผู้เสียภาษี อีเมล เบอร์สำรอง ลงใน field ใดทั้งสิ้น
- email และ note ต้องเป็นสตริงว่างเสมอ
- line1 คือบ้านเลขที่ หมู่ ซอย ถนน อาคาร ห้อง ไม่รวมตำบล อำเภอ จังหวัด รหัสไปรษณีย์
- จังหวัดใช้ชื่อทางการ เช่น กรุงเทพมหานคร ไม่ใช้ กทม.
- items ต้องเป็นอาเรย์ว่างเสมอ
- ถ้าเบอร์ถูกปิดเป็น *** ไม่ต้องเดา
- ถ้าอ่านไม่ได้ใส่สตริงว่าง อย่าแต่งข้อมูล`;

function mergeRecipient(heuristic: ParsedShopeeOrder, ai: ParsedShopeeOrder): ParsedShopeeOrder {
  return sanitizeLabelRecipient({
    buyerName: ai.buyerName || heuristic.buyerName,
    phone: ai.phone || heuristic.phone,
    email: "",
    line1: ai.line1 || heuristic.line1,
    subdistrict: ai.subdistrict || heuristic.subdistrict,
    district: ai.district || heuristic.district,
    province: ai.province || heuristic.province,
    postalCode: ai.postalCode || heuristic.postalCode,
    note: "",
    taxId: "",
    items: [],
  });
}

async function parseTextWithGemini(text: string, key: string, prompt: string) {
  const models = [
    process.env.GEMINI_MODEL?.trim(),
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
  ].filter((m, i, all): m is string => Boolean(m) && all.indexOf(m) === i);
  let last = "Gemini อ่านข้อความไม่ได้";
  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${prompt}\n\nข้อความ:\n${text}` }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0 },
        }),
      },
    );
    const payload = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    if (!res.ok) {
      last = payload.error?.message || `Gemini ${res.status}`;
      continue;
    }
    const textOut = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!textOut.trim()) {
      last = "Gemini ไม่ส่งข้อความกลับ";
      continue;
    }
    return normalizeParsedShopee(extractShopeeJson(textOut));
  }
  throw new Error(last);
}

async function parseTextWithOpenAI(text: string, key: string, prompt: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: text },
      ],
    }),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (!res.ok) throw new Error(payload.error?.message || `OpenAI ${res.status}`);
  return normalizeParsedShopee(extractShopeeJson(payload.choices?.[0]?.message?.content ?? ""));
}

async function parsePastedTextWithAi(text: string, prompt: string) {
  const keys = visionKeys();
  if (!keys.gemini && !keys.openai) return null;
  if (keys.gemini) {
    try {
      return await parseTextWithGemini(text, keys.gemini, prompt);
    } catch (err) {
      if (!keys.openai) throw err;
      return parseTextWithOpenAI(text, keys.openai, prompt);
    }
  }
  return parseTextWithOpenAI(text, keys.openai, prompt);
}

export async function parseRecipientPaste(text: string): Promise<ParsedShopeeOrder> {
  const heuristic = completeParsedAddress(parseRecipientText(text));
  try {
    const ai = await parsePastedTextWithAi(text, ADDRESS_PROMPT);
    if (!ai) return sanitizeLabelRecipient(heuristic);
    return sanitizeLabelRecipient(completeParsedAddress(mergeRecipient(heuristic, ai)));
  } catch {
    return sanitizeLabelRecipient(heuristic);
  }
}

const BILL_PROMPT = `คุณคือผู้ช่วยร้านค้าไทย อ่านข้อความบิล / ออเดอร์ช้อปปี้ / ใบสั่งซื้อ ให้ครบทุกช่องสำหรับออกบิลเงินสด
ตอบเป็น JSON เท่านั้น ตามโครงนี้:
{
  "buyerName": "",
  "phone": "",
  "email": "",
  "line1": "",
  "subdistrict": "",
  "district": "",
  "province": "",
  "postalCode": "",
  "note": "",
  "taxId": "",
  "orderDiscount": 0,
  "items": [
    { "name": "", "variantName": "", "price": 0, "quantity": 1, "discount": 0 }
  ]
}

กฎ:
- ชื่อผู้ซื้อใช้ชื่อเต็ม รวมห้างหุ้นส่วนจำกัด / บริษัท / จำกัด ถ้ามีในข้อความ ห้ามตัด
- เบอร์โทรใช้เบอร์แรก
- อีเมลใส่ถ้ามี
- taxId คือเลขผู้เสียภาษี 13 หลัก ถ้ามี
- line1 คือบ้านเลขที่ หมู่ ซอย ถนน ไม่รวมตำบล อำเภอ จังหวัด รหัสไปรษณีย์
- จังหวัดใช้ชื่อทางการ เช่น กรุงเทพมหานคร
- ดึงรายการสินค้าทุกชิ้น: ชื่อสินค้า ตัวเลือก ราคาต่อชิ้น จำนวน ส่วนลดเป็นบาท
- ห้ามใส่ค่าส่งเป็นรายการสินค้า
- ถ้ามีส่วนลดทั้งออเดอร์ใส่ orderDiscount
- ถ้าอ่านไม่ได้ใส่สตริงว่างหรือ 0 อย่าแต่งข้อมูล`;

function mergeBill(heuristic: ParsedShopeeOrder, ai: ParsedShopeeOrder): ParsedShopeeOrder {
  return {
    buyerName: ai.buyerName || heuristic.buyerName,
    phone: ai.phone || heuristic.phone,
    email: ai.email || heuristic.email,
    line1: ai.line1 || heuristic.line1,
    subdistrict: ai.subdistrict || heuristic.subdistrict,
    district: ai.district || heuristic.district,
    province: ai.province || heuristic.province,
    postalCode: ai.postalCode || heuristic.postalCode,
    note: ai.note || heuristic.note,
    taxId: ai.taxId || heuristic.taxId,
    items: ai.items.length ? ai.items : heuristic.items,
  };
}

export async function parseBillPaste(text: string): Promise<ParsedShopeeOrder> {
  const heuristic = completeParsedAddress(parseBillCustomerText(text));
  try {
    const ai = await parsePastedTextWithAi(text, BILL_PROMPT);
    if (!ai) return heuristic;
    return completeParsedAddress(mergeBill(heuristic, ai));
  } catch {
    return heuristic;
  }
}
