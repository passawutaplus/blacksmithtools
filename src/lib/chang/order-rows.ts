/**
 * แปลงแถวผลคำนวณเป็น "รายการสั่งของ" สำหรับใบสั่งของ
 *
 * แถวผลลัพธ์ของเครื่องมือเป็นข้อความล้วน (ป้าย + ค่า) ไม่มีธงบอกว่าแถวไหนคือของที่ต้องซื้อ
 * ไฟล์นี้จึงอ่านจากรูปของค่า: "ตัวเลข + หน่วยที่ซื้อขายกัน" (แผ่น ถุง กล่อง เส้น กก. ม. …) = ของที่สั่งได้
 * ส่วนค่าที่เป็นขนาด/ระยะ/ผลวัด (ตร.ม. มม. A % …) ไม่นับ — ผู้ใช้ยังติ๊กเพิ่มเองได้ในหน้าจอก่อนส่งออก
 *
 * กติกาเลือกให้อัตโนมัติถูกเขียนให้ "พลาดไปทางไม่ใส่" ดีกว่าใส่ของผิดลงใบสั่ง
 */
import type { ResultRow } from "./types";

/** หน่วยนับเป็นชิ้น/บรรจุภัณฑ์ — จำนวนต้องเป็นจำนวนเต็มจึงนับเป็นของที่สั่ง */
const COUNT_UNITS = [
  "แผ่น",
  "กล่อง",
  "ถุง",
  "ก้อน",
  "ม้วน",
  "เส้น",
  "ตัว",
  "ชุด",
  "หลอด",
  "แกลลอน",
  "ขวด",
  "ใบ",
  "แพ็ก",
  "อัน",
  "ด้าม",
  "ผืน",
  "แผง",
  "ถัง",
  "ท่อน",
  "คู่",
  "ลัง",
  "กระป๋อง",
  "กระสอบ",
  "ดอก",
] as const;

/** หน่วยตวง/ชั่ง/วัดความยาวที่ร้านขายตามปริมาณ (ตร.ม. ไม่นับ: เกือบทุกแถวที่เป็น ตร.ม. คือพื้นที่หน้างาน ไม่ใช่ของ) */
const BULK_UNITS = ["ลบ.ม.", "กก.", "ลิตร", "มล.", "ม."] as const;

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const unitPattern = [...COUNT_UNITS, ...BULK_UNITS]
  .slice()
  .sort((a, b) => b.length - a.length)
  .map(esc)
  .join("|");
const countPattern = COUNT_UNITS.map(esc).join("|");

const NUM = "[\\d,]+(?:\\.\\d+)?";
/** "59 แผ่น" · "99.0 กก." · "9 แผง × 450 W" · "1 ใบ (เผื่อตัด 45°)" — หน่วยต้องจบคำ (กัน "ม./วินาที", "ลิตร/นาที") */
const QUANTITY = new RegExp(`^(?:ประมาณ\\s*)?(${NUM})\\s*(${unitPattern})(?=$|[\\s(×x])\\s*(.*)$`);
/** "400 มม. × 3 ชุด" — สเปกนำหน้า จำนวนอยู่ท้าย */
const SPEC_TIMES_COUNT = new RegExp(`^(.+?)\\s*[×x]\\s*(${NUM})\\s*(${countPattern})$`);
/** ป้ายแบบขนาดบรรจุ: "ถุง 5 กก." · "เส้น 2.5 ม." · "กล่อง 250" */
const PACK_LABEL = new RegExp(`^(${countPattern})\\s*(${NUM})\\s*(.*)$`);
/** ค่าแบบ "ตัวเลข + หน่วยอะไรก็ได้" ใช้เทียบกับขนาดบรรจุของแถวถัดไป */
const ANY_AMOUNT = new RegExp(`^(?:ประมาณ\\s*)?(${NUM})\\s*(\\S*)`);

/**
 * ป้ายที่เป็นค่าที่กรอก/ผลวัด/ตัวเลือกสำรอง ไม่ใช่ของที่สั่ง
 * (ระยะเดินท่อ 8 ม. · น้ำหนักกระจก 36 กก. · เหลือเก็บซ่อม 1 แผ่น · ถ้าใช้ปูนก่อสำเร็จแทน 9 ถุง · น้ำประมาณ 31 ลิตร)
 */
const NOT_AN_ITEM =
  /ระยะ|ความยาว|^ยาว|กว้าง|Head|เส้นรอบ|น้ำหนัก|ช่วง|พื้นที่|ปริมาตร|มวล|ผลลัพธ์|^ด้าน|^กิโลกรัม|^เหลือ|เศษ|^ถ้า|แทน$|^น้ำ(?!ยา)|^ใช้น้ำ|ชาร์จ|^ต่อ|ต่อ(?:ช่อง|จุด|หลอด|แผ่น|ถุง)|ละ(?:ได้|ปู)/;

export type ParsedQuantity = {
  /** ตัวเลขตามที่แสดง เช่น "1,760" */
  qty: string;
  amount: number;
  unit: string;
  kind: "count" | "bulk";
  /** ข้อความที่เหลือ เช่น "× 450 W" หรือ "เผื่อตัด 45°" */
  rest: string;
};

const toNumber = (text: string) => Number(text.replace(/,/g, ""));
const isCount = (unit: string) => (COUNT_UNITS as readonly string[]).includes(unit);
/** ตัดวงเล็บครอบทั้งก้อนออก: "(ประมาณ 2 ขวด 50 มล.)" → "ประมาณ 2 ขวด 50 มล." */
const unwrap = (text: string) => text.trim().replace(/^\((.*)\)$/, "$1").trim();

/** อ่าน "จำนวน + หน่วยที่ซื้อขายกัน" จากค่าของแถว — คืน null ถ้าไม่ใช่รูปนี้ */
export function parseQuantity(value: string): ParsedQuantity | null {
  const text = value.trim();
  const direct = QUANTITY.exec(text);
  if (direct) {
    const amount = toNumber(direct[1]);
    if (!Number.isFinite(amount)) return null;
    return { qty: direct[1], amount, unit: direct[2], kind: isCount(direct[2]) ? "count" : "bulk", rest: unwrap(direct[3]) };
  }
  const spec = SPEC_TIMES_COUNT.exec(text);
  if (spec) {
    const amount = toNumber(spec[2]);
    if (!Number.isFinite(amount)) return null;
    return { qty: spec[2], amount, unit: spec[3], kind: "count", rest: spec[1].trim() };
  }
  return null;
}

export type OrderItem = {
  /** ชื่อรายการ */
  name: string;
  /** บรรทัดรอง: สเปก/ที่มาของตัวเลข */
  detail?: string;
  /** ว่าง = ให้ช่างเขียนจำนวนเอง */
  qty: string;
  unit: string;
};

export type OrderCandidate = {
  /** คีย์คงที่ของแถว ใช้จำว่าผู้ใช้ติ๊ก/เอาออก */
  key: string;
  item: OrderItem;
  /** เลือกให้อัตโนมัติหรือไม่ (ผู้ใช้เปลี่ยนได้) */
  selected: boolean;
};

/**
 * แถว "ขนาดบรรจุ" ที่ตามหลังแถวปริมาณของวัสดุเดียวกันหรือไม่
 * เช่น "ปูนกาว 99.0 กก." แล้วตามด้วย "ถุง 20 กก. → 5 ถุง"
 * ต้องผ่านทั้งหน่วยตรงกันและจำนวนบรรจุ = ปัดขึ้นของ (ปริมาณ ÷ ขนาดบรรจุ) พอดี จึงจะถือว่าเป็นของชิ้นเดียวกัน
 * (หน้า "คิดทั้งงาน" ตัดแถวจากหลายเครื่องมือมาต่อกัน แถวติดกันจึงไม่ได้แปลว่าเป็นวัสดุเดียวกันเสมอ)
 */
function isPackOf(pack: ResultRow, packQty: ParsedQuantity, source: ResultRow): boolean {
  const label = PACK_LABEL.exec(pack.label.trim());
  if (!label || label[1] !== packQty.unit) return false;
  const size = toNumber(label[2]);
  const sizeUnit = label[3].trim();
  const amount = ANY_AMOUNT.exec(source.value.trim());
  if (!amount || !(size > 0)) return false;
  const total = toNumber(amount[1]);
  const totalUnit = amount[2];
  if (!Number.isFinite(total) || total <= 0) return false;
  if (sizeUnit ? totalUnit !== sizeUnit : !isCount(totalUnit)) return false;
  return Math.ceil(total / size - 1e-9) === packQty.amount;
}

/** รายการที่ใส่ใบสั่งของได้ทั้งหมด เรียงตามแถวผลลัพธ์ — selected คือชุดที่เลือกให้อัตโนมัติ */
export function orderCandidates(rows: ResultRow[]): OrderCandidate[] {
  const firstEmphasized = rows.findIndex((r) => r.emphasize);
  const out: OrderCandidate[] = [];
  /** ดัชนีใน out ของแถวก่อนหน้า (ถ้ายังไม่ถูกรวมกับใคร) */
  let previous: { row: ResultRow; at: number } | null = null;

  rows.forEach((row, i) => {
    const label = row.label.trim();
    const parsed = parseQuantity(row.value);

    if (parsed?.kind === "count" && previous && isPackOf(row, parsed, previous.row)) {
      out[previous.at] = {
        key: `${i - 1}+${i}:${previous.row.label}`,
        selected: true,
        item: {
          name: `${previous.row.label.trim()} · ${label}`,
          detail: `ใช้จริง ${previous.row.value.trim()}`,
          qty: parsed.qty,
          unit: parsed.unit,
        },
      };
      previous = null;
      return;
    }

    if (!parsed) {
      out.push({ key: `${i}:${label}`, selected: false, item: { name: label, detail: row.value.trim(), qty: "", unit: "" } });
      previous = { row, at: out.length - 1 };
      return;
    }

    // แถวก่อนแถวเน้นแรกเป็นค่าที่กรอก/ค่าระหว่างทาง (เช่น "แผ่นประมาณ 56 แผ่น" ของตัวปรับระดับ) ไม่ใช่ของที่สั่ง
    const afterInputs = firstEmphasized === -1 ? parsed.kind === "count" : i >= firstEmphasized;
    const selected =
      !NOT_AN_ITEM.test(label) &&
      afterInputs &&
      (parsed.kind === "count" ? Number.isInteger(parsed.amount) && parsed.amount > 0 : parsed.amount > 0);

    out.push({
      key: `${i}:${label}`,
      selected,
      item: { name: label, detail: parsed.rest || undefined, qty: parsed.qty, unit: parsed.unit },
    });
    previous = { row, at: out.length - 1 };
  });

  return out;
}

/** มีของที่สั่งได้อย่างน้อยหนึ่งรายการ = หน้านี้เสนอ "ใบสั่งของ" ได้ */
export function hasOrderRows(rows: ResultRow[]): boolean {
  return orderCandidates(rows).some((c) => c.selected);
}

/** รายการที่จะลงใบสั่งของ: ชุดอัตโนมัติ ปรับด้วยที่ผู้ใช้ติ๊กเพิ่ม/เอาออก (overrides: key → เลือกหรือไม่) */
export function pickOrderItems(candidates: OrderCandidate[], overrides: Record<string, boolean> = {}): OrderItem[] {
  return candidates.filter((c) => overrides[c.key] ?? c.selected).map((c) => c.item);
}
