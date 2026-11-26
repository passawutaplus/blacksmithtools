/**
 * แปลงข้อความที่ช่างพิมพ์ในช่องตัวเลขให้เป็นตัวเลขจริง
 *
 * เดิมใช้ <input type="number"> ซึ่งทิ้งคอมมาเงียบ ๆ — พิมพ์ "4,5" ได้ 45 และทิ้งเลขไทยทั้งตัว
 * ที่นี่รับ: เลขไทย ๐–๙, ทศนิยมคอมมา (4,5 → 4.5), คอมมาคั่นหลักพัน (1,500 → 1500)
 * อะไรที่ตีความไม่ได้ต้องบอกว่า "ไม่ใช่ตัวเลข" ห้ามเดาเป็นค่าอื่น
 */

export type ParsedNumber =
  | { kind: "empty" }
  | { kind: "number"; value: number }
  | { kind: "invalid" };

const THAI_ZERO = 0x0e50;
const FULLWIDTH_ZERO = 0xff10;

/** เลขไทย/เลขเต็มความกว้าง → เลขอารบิก, ขีดลบแบบต่าง ๆ → "-", ตัดช่องว่างทิ้ง */
export function normalizeNumberText(raw: string): string {
  let out = "";
  for (const ch of raw) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= THAI_ZERO && code <= THAI_ZERO + 9) out += String(code - THAI_ZERO);
    else if (code >= FULLWIDTH_ZERO && code <= FULLWIDTH_ZERO + 9) out += String(code - FULLWIDTH_ZERO);
    else if (ch === "−" || ch === "–" || ch === "—") out += "-";
    else if (ch === "，" || ch === "٫") out += ",";
    else if (ch === "．") out += ".";
    else if (/\s/.test(ch)) continue;
    else out += ch;
  }
  return out;
}

export function parseNumberInput(raw: string): ParsedNumber {
  let s = normalizeNumberText(raw);
  if (s === "") return { kind: "empty" };

  if (s.includes(",")) {
    const thousands = /^-?[1-9]\d{0,2}(,\d{3})+(\.\d*)?$/.test(s);
    const decimalComma = /^-?\d*,\d*$/.test(s);
    if (thousands) s = s.replace(/,/g, "");
    else if (decimalComma) s = s.replace(",", ".");
    else return { kind: "invalid" };
  }

  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return { kind: "invalid" };
  const value = Number(s);
  return Number.isFinite(value) ? { kind: "number", value } : { kind: "invalid" };
}

/** ค่าที่เก็บในฟอร์ม: ตัวเลข, "" = ยังว่าง, NaN = พิมพ์มาแล้วแต่ไม่ใช่ตัวเลข (validateFields จะแจ้ง "ใส่เป็นตัวเลข") */
export function toFieldValue(parsed: ParsedNumber): number | "" {
  if (parsed.kind === "empty") return "";
  if (parsed.kind === "invalid") return Number.NaN;
  return parsed.value;
}

/** ข้อความที่ช่างพิมพ์ค้างไว้ยังหมายถึงค่าเดียวกับที่ฟอร์มเก็บอยู่ไหม (ใช้ตัดสินว่าจะคงข้อความที่พิมพ์ หรือแสดงค่าจากฟอร์ม) */
export function draftMatchesValue(draft: string, value: unknown): boolean {
  const parsed = toFieldValue(parseNumberInput(draft));
  if (parsed === "") return value === "" || value === undefined || value === null;
  if (Number.isNaN(parsed)) return typeof value === "number" && Number.isNaN(value);
  return value === parsed;
}

/** ค่าจากฟอร์ม → ข้อความในช่อง */
export function formatFieldNumber(value: unknown): string {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "string") return value;
  return "";
}
