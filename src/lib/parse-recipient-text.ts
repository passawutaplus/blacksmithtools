import {
  addressesForPostalCode,
  completeThaiAddress,
  districtsIn,
  subdistrictsIn,
  thaiProvinces,
} from "./thai-address";
import { stripThaiAdminPrefix } from "./thai-address-format";
import { usableShopeePhone, type ParsedShopeeOrder } from "./parse-shopee-order";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function labeled(raw: string, keys: string[]) {
  const re = new RegExp(`(?:${keys.map(escapeRegExp).join("|")})\\s*[:：\\-]?\\s*(.+)`, "u");
  const m = raw.match(re);
  return m?.[1]?.trim().split(/\n/)[0]?.trim() ?? "";
}

function extractPhone(raw: string) {
  const match = raw.match(/0(?:[\s-]?\d){8,9}/);
  if (!match) {
    const intl = raw.match(/\+?66(?:[\s-]?\d){8,9}/);
    if (!intl) return "";
    const digits = intl[0].replace(/\D/g, "");
    const local = digits.startsWith("66") ? `0${digits.slice(2)}` : digits;
    return usableShopeePhone(local);
  }
  return usableShopeePhone(match[0].replace(/\D/g, ""));
}

function stripTaxIds(raw: string) {
  return raw
    .replace(/(เลขที่ผู้เสียภาษี|เลขประจำตัวผู้เสียภาษี|เลขผู้เสียภาษี)[^\n]*/giu, " ")
    .replace(/(?<!\d)\d{13}(?!\d)/g, " ");
}

function stripEmails(raw: string) {
  return raw
    .replace(/(อีเมลล์|อีเมล์|อีเมล|email)\s*[:：.]?[^\n]*/giu, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, " ");
}

function stripPhones(raw: string) {
  return raw.replace(/0(?:[\s-]?\d){8,9}/g, " ").replace(/\+?66(?:[\s-]?\d){8,9}/g, " ");
}

export function simplifyRecipientName(name: string) {
  return name
    .replace(
      /^(ห้างหุ้นส่วนสามัญนิติบุคคล|ห้างหุ้นส่วนจำกัด|ห้างหุ้นส่วนสามัญ|หจก\.?|บริษัท\s*จำกัด\s*\(มหาชน\)|บริษัทจำกัด|บริษัท|บมจ\.?|บจก\.?|บจ\.?)\s*/u,
      "",
    )
    .replace(/\s*จำกัด\s*(\(มหาชน\))?\s*$/u, "")
    .trim();
}

export function sanitizeLabelLine1(line1: string) {
  return stripPhones(stripEmails(stripTaxIds(line1)))
    .replace(/ห้างหุ้นส่วนสามัญนิติบุคคล|ห้างหุ้นส่วนจำกัด|ห้างหุ้นส่วนสามัญ|หจก\.?|บริษัทจำกัด|บริษัท|บมจ\.?|บจก\.?|บจ\.?/gu, " ")
    .replace(/จำกัด\s*(\(มหาชน\))?/gu, " ")
    .replace(/โทร\.?/gu, " ")
    .replace(/[,;|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[,\-–./]+|[,\-–./]+$/g, "")
    .trim();
}

export function sanitizeLabelRecipient(parsed: ParsedShopeeOrder): ParsedShopeeOrder {
  return {
    ...parsed,
    buyerName: simplifyRecipientName(parsed.buyerName),
    phone: extractPhone(parsed.phone) || parsed.phone,
    email: "",
    note: "",
    taxId: "",
    line1: sanitizeLabelLine1(parsed.line1),
    items: [],
  };
}

function extractZip(raw: string) {
  const match = raw.match(/(?<!\d)(\d{5})(?!\d)/);
  return match?.[1] ?? "";
}

function findLongest(haystack: string, names: string[], extraPrefixes: string[] = []) {
  const sorted = names.slice().sort((a, b) => stripThaiAdminPrefix(b).length - stripThaiAdminPrefix(a).length);
  for (const name of sorted) {
    const short = stripThaiAdminPrefix(name);
    if (short.length < 2) continue;
    const prefixes = ["", ...extraPrefixes].map(escapeRegExp).join("|");
    const re = new RegExp(`(?:${prefixes})\\s*${escapeRegExp(short)}`, "u");
    if (re.test(haystack)) return name;
  }
  return "";
}

function findProvinceInText(raw: string) {
  if (/(กทม\.?|กรุงเทพฯ|กรุงเทพ(?!มหานคร))/u.test(raw) || raw.includes("กรุงเทพมหานคร")) {
    return "กรุงเทพมหานคร";
  }
  const names = thaiProvinces();
  const prefixed = findLongest(raw, names, ["จังหวัด", "จ\\.", "จ\\s"]);
  if (prefixed) return prefixed;
  for (const name of names.slice().sort((a, b) => b.length - a.length)) {
    if (name.length < 4) continue;
    if (raw.includes(name) || raw.includes(stripThaiAdminPrefix(name))) return name;
  }
  return "";
}

function findDistrictInText(raw: string, province: string) {
  const rows = districtsIn(province);
  const names = rows.map((d) => d.n);
  const hit = findLongest(raw, names, ["เขต", "อำเภอ", "อ\\."]);
  if (hit) return hit;
  if (/(?:อำเภอ|อ\.)\s*เมือง/u.test(raw)) {
    const city = rows.find((d) => stripThaiAdminPrefix(d.n).startsWith("เมือง"));
    if (city) return city.n;
  }
  return "";
}

function findSubdistrictInText(raw: string, province: string, district: string) {
  const names = subdistrictsIn(province, district).map((s) => s.n);
  return findLongest(raw, names, ["แขวง", "ตำบล", "ต\\."]);
}

function pickFromZip(zip: string, province: string, district: string, subdistrict: string) {
  let hits = addressesForPostalCode(zip);
  if (!hits.length) return { province, district, subdistrict, postalCode: zip };
  if (province) hits = hits.filter((h) => h.province === province);
  if (district) {
    const narrowed = hits.filter((h) => stripThaiAdminPrefix(h.district) === stripThaiAdminPrefix(district));
    if (narrowed.length) hits = narrowed;
  }
  if (subdistrict) {
    const narrowed = hits.filter((h) => stripThaiAdminPrefix(h.subdistrict) === stripThaiAdminPrefix(subdistrict));
    if (narrowed.length) hits = narrowed;
  }
  if (hits.length === 1) return hits[0];
  const uniqueProvince = new Set(hits.map((h) => h.province));
  const uniqueDistrict = new Set(hits.map((h) => h.district));
  if (uniqueProvince.size === 1 && uniqueDistrict.size === 1) {
    return {
      province: hits[0].province,
      district: hits[0].district,
      subdistrict: subdistrict || (hits.length === 1 ? hits[0].subdistrict : ""),
      postalCode: zip,
    };
  }
  return hits[0]
    ? {
        province: hits[0].province,
        district: uniqueDistrict.size === 1 ? hits[0].district : district,
        subdistrict,
        postalCode: zip,
      }
    : { province, district, subdistrict, postalCode: zip };
}

function extractEmail(raw: string) {
  const match = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] ?? "";
}

function extractTaxId(raw: string) {
  const labeled = raw.match(
    /(?:เลขที่ผู้เสียภาษี|เลขประจำตัวผู้เสียภาษี|เลขผู้เสียภาษี)\s*[:：]?\s*(\d{13})/iu,
  );
  if (labeled?.[1]) return labeled[1];
  const bare = raw.match(/(?<!\d)(\d{13})(?!\d)/);
  return bare?.[1] ?? "";
}

function extractName(raw: string, phone: string, simplify: boolean) {
  const fromLabel = labeled(raw, ["ชื่อผู้รับ", "ชื่อ-นามสกุล", "ชื่อ", "ผู้รับ", "ลูกค้า"]);
  if (fromLabel && !/(ซอย|ถนน|หมู่|ตำบล|แขวง|อำเภอ|จังหวัด)/u.test(fromLabel) && fromLabel.length < 80) {
    const name = fromLabel.replace(phone, "").trim();
    return simplify ? simplifyRecipientName(name) : name;
  }
  const lines = raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !/^(ที่อยู่|โทร|เบอร์|จังหวัด|อำเภอ|ตำบล|แขวง|เขต|เลขที่ผู้เสีย|เลขประจำตัว|เลขผู้เสีย|อีเมล|อีเมล์|email)/iu.test(
          line,
        ),
    );
  const first = lines[0] ?? "";
  if (phone && first.includes(phone.replace(/-/g, ""))) {
    const name = first.replace(phone, "").replace(/0\d{8,9}/, "").trim();
    return simplify ? simplifyRecipientName(name) : name;
  }
  if (first && first.length <= 80 && !/(ซอย|ถนน|หมู่\s*\d|ตำบล|แขวง|อำเภอ|จังหวัด|\d{5})/u.test(first)) {
    return simplify ? simplifyRecipientName(first) : first;
  }
  return "";
}

function stripLocality(raw: string, parsed: ParsedShopeeOrder) {
  let out = raw;
  const replacements = [
    parsed.phone,
    parsed.email,
    parsed.postalCode,
    parsed.buyerName,
    parsed.province,
    stripThaiAdminPrefix(parsed.province),
    parsed.district,
    stripThaiAdminPrefix(parsed.district),
    parsed.subdistrict,
    stripThaiAdminPrefix(parsed.subdistrict),
  ].filter((part) => part && part.length >= 2);
  replacements.sort((a, b) => b.length - a.length);
  for (const part of replacements) {
    out = out.replace(new RegExp(escapeRegExp(part), "gu"), " ");
  }
  out = out
    .replace(/(ชื่อผู้รับ|ชื่อ-นามสกุล|ผู้รับ|ลูกค้า|ชื่อ|ที่อยู่จัดส่ง|ที่อยู่|โทรศัพท์|เบอร์โทร|โทร\.?|อีเมลล์|อีเมล์|อีเมล|หมายเหตุ|โน้ต)\s*[:：\-]?\s*/gu, " ")
    .replace(/จังหวัด|อำเภอ|เขต|แขวง|ตำบล|จ\.|อ\.|ต\./gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[,\-–/]+|[,\-–/]+$/g, "")
    .trim();
  return sanitizeLabelLine1(out);
}

function parseBillItemsFromText(raw: string) {
  const items: ParsedShopeeOrder["items"] = [];
  for (const line of raw.split(/\n+/)) {
    const t = line.trim();
    if (!t || /เลขที่ผู้เสีย|เลขประจำตัว|อีเมล|ที่อยู่|จังหวัด|อำเภอ|ตำบล|โทร\.?|ห้างหุ้นส่วน|บริษัท/u.test(t)) {
      continue;
    }
    const priceMatch = t.match(/฿\s*([\d,]+)|ราคา\s*[:：]?\s*([\d,]+)/u);
    if (!priceMatch) continue;
    const qtyMatch = t.match(/(?:จำนวน|[x×*])\s*[:：]?\s*(\d+)/iu);
    const discMatch = t.match(/ส่วนลด\s*[:：]?\s*([\d,]+)/u);
    const variantMatch = t.match(/ตัวเลือก\s*[:：]?\s*(.+?)(?:\s+ราคา|\s+จำนวน|\s+ส่วนลด|\s*฿|$)/u);
    const name = t
      .replace(/฿\s*[\d,]+|ราคา\s*[:：]?\s*[\d,]+|(?:จำนวน|[x×*])\s*[:：]?\s*\d+|ส่วนลด\s*[:：]?\s*[\d,]+|ตัวเลือก\s*[:：]?\s*[^|]+/giu, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!name) continue;
    items.push({
      name,
      variantName: (variantMatch?.[1] ?? "").trim(),
      price: Number((priceMatch[1] || priceMatch[2] || "0").replace(/,/g, "")),
      quantity: Math.max(1, Number(qtyMatch?.[1] || 1)),
      discount: Number((discMatch?.[1] || "0").replace(/,/g, "")),
    });
  }
  return items;
}

export function parseCustomerFromText(raw: string, mode: "label" | "bill"): ParsedShopeeOrder {
  const original = raw.replace(/\u200b/g, " ").trim();
  const email = extractEmail(original);
  const taxId = extractTaxId(original);
  const source = stripEmails(stripTaxIds(original));
  const phone = extractPhone(source);
  const zip = extractZip(source);
  let province = findProvinceInText(source);
  let district = province ? findDistrictInText(source, province) : "";
  let subdistrict = province && district ? findSubdistrictInText(source, province, district) : "";
  if (zip) {
    const fromZip = pickFromZip(zip, province, district, subdistrict);
    province = fromZip.province || province;
    district = fromZip.district || district;
    subdistrict = fromZip.subdistrict || subdistrict;
  }
  if (province && !district) district = findDistrictInText(source, province);
  if (province && district && !subdistrict) subdistrict = findSubdistrictInText(source, province, district);

  const loc = completeThaiAddress({
    province,
    district,
    subdistrict,
    postalCode: zip,
  });

  const draft: ParsedShopeeOrder = {
    buyerName: "",
    phone,
    email: mode === "bill" ? email : "",
    line1: "",
    subdistrict: loc.subdistrict || subdistrict,
    district: loc.district || district,
    province: loc.province || province,
    postalCode: loc.postalCode || zip,
    note: "",
    taxId: mode === "bill" ? taxId : "",
    items: mode === "bill" ? parseBillItemsFromText(original) : [],
  };
  draft.buyerName = extractName(source, phone, mode === "label");
  const fromLabel = labeled(source, ["ที่อยู่จัดส่ง", "ที่อยู่"]);
  draft.line1 = stripLocality(fromLabel || source, draft);
  if (draft.line1 === draft.buyerName) draft.line1 = "";
  return mode === "label" ? sanitizeLabelRecipient(draft) : draft;
}

export function parseRecipientText(raw: string): ParsedShopeeOrder {
  return parseCustomerFromText(raw, "label");
}

export function parseBillCustomerText(raw: string): ParsedShopeeOrder {
  return parseCustomerFromText(raw, "bill");
}

export function recipientParseLooksComplete(parsed: ParsedShopeeOrder) {
  return Boolean(parsed.buyerName && parsed.phone && parsed.line1 && parsed.subdistrict && parsed.postalCode);
}
