import {
  Droplets,
  Layers,
  Link2,
  Ruler,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Product } from "./types";

export type ProductCopy = {
  hook: string;
  highlights: { icon: LucideIcon; text: string }[];
  howTo: string[];
  specs: { label: string; value: string }[];
  caution?: string;
};

const HEADING_RE =
  /^(📌|📍)?\s*(ข้อมูลเฉพาะรุ่น|ข้อมูลสำคัญทั่วไป|ข้อควรระวัง|วิธีใช้|ผลิตโดย)/i;
const BOILERPLATE_START_RE =
  /^(BlackSmith|จำหน่าย|-{5,}|ขอบคุณลูกค้า|หากสินค้ามีปัญหา|https?:\/\/|แบ่งบรรจุเพิ่ม)/i;

function blocks(description: string): string[] {
  return description
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
}

function bulletsOf(block: string): string[] {
  return block
    .split("\n")
    .slice(1)
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);
}

function findBlock(list: string[], re: RegExp): string | undefined {
  return list.find((b) => re.test(b));
}

function cleanHook(raw: string): string {
  let text = raw.replace(/^(📌|📍)\s*/g, "").trim();
  text = text.replace(/\s+/g, " ");
  const max = 170;
  if (text.length > max) {
    text = `${text.slice(0, max).trim()}…`;
  }
  return text;
}

function extractHook(list: string[]): string {
  const candidate = list
    .slice(1)
    .find((b) => !HEADING_RE.test(b) && !BOILERPLATE_START_RE.test(b) && b.length > 10);
  return candidate ? cleanHook(candidate) : "";
}

function detectMaterial(description: string): string | null {
  if (/PETG/i.test(description)) return "PETG (แข็ง ทนความร้อนกว่า PLA)";
  if (/PLA\+/i.test(description)) return "PLA+ (ไบโอพลาสติกจากข้าวโพด)";
  if (/เรซิ่น|Resin/i.test(description)) return "เรซิ่น SLA (ผิวเรียบ ละเอียด)";
  if (/\bPLA\b/i.test(description)) return "PLA";
  return null;
}

function productText(product: Product) {
  return `${product.slug}\n${product.nameTh}\n${product.description || ""}`;
}

export type CatalogKind = "chem" | "adhesive" | "reuse" | "print" | "other";

export function catalogKind(product: Product): CatalogKind {
  const t = productText(product);
  if (/reuse|แกลลอนเปล่า|โรลม้วนสายไฟ|hand-?caster/i.test(t)) return "reuse";
  if (/kleenboy|adhesive cleaner|ลอกสติ๊กเกอร์|น้ำยาขจัดคราบเหนียว/i.test(t)) return "adhesive";
  if (product.categoryIds.includes("c-chem") || /gooporange|เจลล้างมือ/i.test(t)) return "chem";
  if (detectMaterial(t) || /3d\s*print|fdm|เส้นพลาสติก/i.test(t)) return "print";
  return "other";
}

function detectPackSize(name: string, description: string): string | null {
  const m = `${name} ${description}`.match(/(\d[\d,]*\.?\d*)\s*(ml\.?|มล)/i);
  if (!m) return null;
  return `${m[1].replace(/,/g, "")} มล.`;
}

const TYPE_LABEL: Record<string, string> = {
  "c-chem": "เคมีช่าง / เจลล้างมือ",
  "c-holder": "ที่เก็บเครื่องมือ / ดอกสว่าน-ไขควง",
  "c-wall": "ที่แขวนผนัง",
  "c-blower": "หัวท่อเสริมเครื่องเป่าลม",
  "c-battery": "ที่เก็บแบตเตอรี่",
  "c-storage": "ถาด/เพลตจัดระเบียบกล่อง",
};

function physicalType(product: Product): keyof typeof TYPE_LABEL {
  const order: (keyof typeof TYPE_LABEL)[] = [
    "c-chem",
    "c-holder",
    "c-wall",
    "c-blower",
    "c-battery",
    "c-storage",
  ];
  return order.find((id) => product.categoryIds.includes(id)) ?? "c-holder";
}

function compatText(product: Product): string {
  const list = product.compatibilities.filter(Boolean);
  if (list.length === 0) return "เครื่องมือช่างแบรนด์ที่ระบุ";
  return list.slice(0, 3).join(", ");
}

export function getProductCopy(product: Product): ProductCopy {
  const list = blocks(product.description || "");
  const type = physicalType(product);
  const kind = catalogKind(product);
  const hook = extractHook(list) || product.nameTh;

  const generalBlock = findBlock(list, /ข้อมูลสำคัญทั่วไป/);
  const cautionBlock = findBlock(list, /ข้อควรระวัง/);
  const usageStepsBlock = findBlock(list, /วิธีใช้/);

  const material = detectMaterial(product.description || "");
  const variantCount = product.variants?.length ?? 0;
  const optionSpec = { label: "ตัวเลือก", value: variantCount > 1 ? `${variantCount} แบบ` : "1 แบบ" };

  if (kind === "reuse") {
    return {
      hook,
      highlights: [{ icon: Layers, text: "สินค้ามือสองหรือของเหลือใช้ ตามสต็อกที่มี" }],
      howTo: [
        "เลือกสีหรือแบบที่มีในสต็อก",
        "ตรวจสภาพสินค้าก่อนใช้",
        "ล้างทำความสะอาดหากจะบรรจุของเหลวหรือเก็บสาย",
      ],
      specs: [
        { label: "ประเภท", value: "ของใช้ซ้ำ / ตามสต็อก" },
        optionSpec,
      ],
      caution: "สินค้ามือสองหรือของเหลือใช้ จำนวนตามที่ลงสต็อก อาจมีรอยจากการใช้งาน",
    };
  }

  if (kind === "adhesive") {
    return {
      hook,
      highlights: [
        { icon: Droplets, text: "ลบคราบเหนียว สติ๊กเกอร์ และเทปกาว สำหรับงานติดตั้งภาคสนาม" },
        { icon: ShieldCheck, text: "ขนาดพกพา ใช้กับพื้นผิวหลายชนิด ควรทดสอบมุมเล็ก ๆ ก่อน" },
      ],
      howTo: [
        "ทดสอบบนมุมเล็ก ๆ ของพื้นผิวก่อนใช้",
        "ทาลงบนคราบเหนียว รอสักครู่ให้ซึม",
        "เช็ดออกด้วยผ้าสะอาด แล้วล้างมือหลังใช้",
      ],
      specs: [
        { label: "ประเภท", value: "น้ำยาขจัดคราบเหนียว" },
        optionSpec,
      ],
      caution: "ใช้ในที่ระบายอากาศ หลีกเลี่ยงเปลวไฟ หากมีอาการแพ้ให้หยุดใช้และปรึกษาแพทย์",
    };
  }

  if (type === "c-chem" || kind === "chem") {
    const packSize = detectPackSize(product.nameTh, product.description || "");
    const stepLines = usageStepsBlock
      ? bulletsOf(usageStepsBlock)
          .map((l) => l.replace(/^\d\)\s*/, "").trim())
          .filter(Boolean)
      : [];
    const highlights: ProductCopy["highlights"] = [
      { icon: Droplets, text: "ขจัดคราบฝังแน่น น้ำมันเครื่อง จารบี สี กาว ซิลิโคนได้หมดจด" },
      { icon: ShieldCheck, text: "ปลอดภัยต่อผิวหนัง ไม่แสบกัดมือ ไม่ต้องล้างน้ำก็ใช้ได้" },
      { icon: Wrench, text: "พกพาสะดวก ใช้ในไซต์งานได้ทันที ไม่ต้องหาน้ำล้าง" },
    ];
    return {
      hook,
      highlights,
      howTo:
        stepLines.length >= 2
          ? stepLines
          : [
              "บีบ/กดผลิตภัณฑ์ปริมาณเล็กน้อยลงบนฝ่ามือ",
              "ลูบไล้ถูมือไปมาจนสิ่งสกปรกเริ่มหลุดออก",
              "เช็ดออกด้วยผ้าแห้ง หรือล้างออกด้วยน้ำสะอาด",
            ],
      specs: [
        { label: "ประเภท", value: TYPE_LABEL[type] },
        ...(packSize ? [{ label: "ขนาดบรรจุ", value: packSize }] : []),
        { label: "ตัวเลือก", value: variantCount > 1 ? `${variantCount} แบบ` : "1 แบบ" },
      ],
      caution:
        (cautionBlock && bulletsOf(cautionBlock).join(" ")) ||
        "ห้ามรับประทาน เก็บให้ห่างจากมือเด็ก หากมีอาการแพ้ควรหยุดใช้และปรึกษาแพทย์",
    };
  }

  const categoryHighlight: Record<string, { icon: LucideIcon; text: string }> = {
    "c-holder": { icon: Layers, text: "จัดระเบียบดอกสว่าน/ไขควงให้หาง่าย ไม่หายในกล่อง" },
    "c-wall": { icon: ShieldCheck, text: "แขวนติดผนัง ยึดแน่น ประหยัดพื้นที่โต๊ะทำงาน" },
    "c-blower": { icon: Layers, text: "เปลี่ยนหัวท่อได้หลายแบบ ใช้งานได้หลายจุด" },
    "c-battery": { icon: ShieldCheck, text: "เก็บแบตเป็นระเบียบ หยิบใช้เร็ว ไม่ตกหล่น" },
    "c-storage": { icon: Layers, text: "แบ่งช่องในกล่องให้เป็นระเบียบ หาของไม่ต้องคุ้ย" },
  };

  const howToByType: Record<string, string[]> = {
    "c-holder": [
      "เลือกรุ่นให้ตรงกับเครื่องมือ/ดอกที่ใช้",
      "ยึดเข้ากับจุดที่ต้องการ เช่น ผนัง กล่อง หรือโต๊ะทำงาน",
      "เสียบเครื่องมือหรือดอกเข้าช่องให้แน่น",
    ],
    "c-wall": [
      "เลือกจุดติดผนังที่ต้องการ",
      "ยึดด้วยสกรู (ตามรุ่นที่เลือก)",
      "แขวน/เสียบเครื่องมือหรือกล่องเข้าที่",
    ],
    "c-blower": [
      "เลือกปลายท่อให้ตรงกับงาน แคบ กว้าง หรือแบน",
      "เสียบเข้าปากเครื่องเป่าลมให้สนิท",
      "หมุนล็อกให้แน่นก่อนใช้งาน",
    ],
    "c-battery": [
      "เลือกรุ่นให้ตรงกับแบตเตอรี่ที่ใช้",
      "ยึดเข้าผนัง ใต้โต๊ะ หรือจุดที่ต้องการ",
      "เสียบแบตเตอรี่เข้าที่ให้แน่น",
    ],
    "c-storage": [
      "เลือกรุ่นให้ตรงกับกล่องที่มี",
      "วางถาด/เพลตเข้าไปในกล่อง",
      "จัดเรียงของให้เข้าช่องที่แบ่งไว้",
    ],
  };

  const printed = kind === "print";
  const materialText = material ?? (printed ? "พิมพ์ 3D (FDM)" : null);
  const highlights: ProductCopy["highlights"] = [
    { icon: Wrench, text: `เข้ากับ ${compatText(product)}` },
    ...(materialText
      ? [{ icon: Ruler, text: `ขึ้นรูปด้วย ${materialText} น้ำหนักเบา แข็งแรง ทนทาน` }]
      : [{ icon: Ruler, text: "ออกแบบให้หยิบใช้จริงในไซต์งาน น้ำหนักเบา ทนทาน" }]),
    categoryHighlight[type] ?? { icon: Link2, text: "ออกแบบให้ใช้งานง่าย ติดตั้งเอง 2-3 ขั้นตอน" },
  ];

  const listingCaution = cautionBlock ? bulletsOf(cautionBlock).join(" ") : "";
  const fallbackHowTo = howToByType[type] ?? [
    "เลือกรุ่นให้ตรงกับเครื่องมือหรือรุ่นที่ใช้",
    "ยึด/เสียบเข้ากับจุดที่ต้องการ",
    "ตรวจสอบว่าติดแน่น พร้อมใช้งาน",
  ];

  return {
    hook,
    highlights,
    howTo: printed
      ? fallbackHowTo
      : [
          "เลือกจำนวนหรือชุดที่ต้องการ",
          "ตรวจสินค้าให้ตรงกับงานก่อนใช้",
          "ใช้ตามลักษณะงานที่ระบุในรายละเอียด",
        ],
    specs: [
      { label: "ประเภท", value: TYPE_LABEL[type] },
      ...(materialText ? [{ label: "วัสดุ", value: materialText }] : []),
      { label: "เข้ากับ", value: compatText(product) },
      optionSpec,
    ],
    caution:
      listingCaution ||
      (printed
        ? generalBlock
          ? undefined
          : "ไม่ควรใช้งานในพื้นที่ที่มีอุณหภูมิสูงเกิน 60°C หากช่องแน่นเกินไปสามารถใช้ตะไบขัดเพิ่มเติมได้"
        : "ตรวจขนาดและรุ่นให้ตรงกับงาน หากไม่แน่ใจทัก LINE ร้านก่อนสั่ง"),
  };
}
