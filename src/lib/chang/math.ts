import { DISCLAIMER_AB, DISCLAIMER_C } from "./constants";
import type {
  CalcResult,
  ChartSpec,
  Field,
  FormulaExplain,
  ResultRow,
  RiskTier,
  ToolDef,
  Values,
} from "./types";

export function num(v: Values, key: string, fallback = 0): number {
  const raw = v[key];
  const x = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(x) ? x : fallback;
}

export function str(v: Values, key: string, fallback = ""): string {
  const raw = v[key];
  if (typeof raw === "string") return raw;
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  return fallback;
}

export function bool(v: Values, key: string, fallback = false): boolean {
  const raw = v[key];
  if (typeof raw === "boolean") return raw;
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return fallback;
}

export function round(x: number, digits = 0): number {
  const m = 10 ** digits;
  return Math.round((x + Number.EPSILON) * m) / m;
}

export function ceil(x: number): number {
  return Math.ceil(x - 1e-9);
}

/**
 * ธงจำว่ามีตัวเลขที่ไม่ใช่จำนวนจริง (NaN/∞) ถูกสั่งพิมพ์ระหว่างคิดสูตรรอบนี้หรือไม่
 * ตัวสร้างผลลัพธ์ (`result` / `resultX`) จะอ่านธงนี้แล้วเปลี่ยนผลเป็น invalid — กัน "— แผ่น" หลุดไปถึงหน้าจอ
 */
let nonFiniteSeen = false;

export function fmt(x: number, digits = 0): string {
  if (!Number.isFinite(x)) {
    nonFiniteSeen = true;
    return "—";
  }
  return round(x, digits).toLocaleString("th-TH", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function fieldVisible(field: Field, values: Values): boolean {
  if (!field.when) return true;
  const current = String(values[field.when.key] ?? "");
  const allowed = Array.isArray(field.when.is) ? field.when.is : [field.when.is];
  return allowed.includes(current);
}

export function visibleFields(fields: Field[], values: Values): Field[] {
  return fields.filter((f) => fieldVisible(f, values));
}

/** ตรวจค่าตัวเลขที่ผู้ใช้กรอก — ช่องว่าง / หลุด min-max ต้องหยุดคิด */
export function validateFields(fields: Field[], values: Values): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of visibleFields(fields, values)) {
    if (field.type !== "number") continue;
    const raw = values[field.key];
    if (raw === "" || raw === undefined || raw === null) {
      errors[field.key] = "กรอกช่องนี้ก่อน";
      continue;
    }
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n)) {
      errors[field.key] = "ใส่เป็นตัวเลข";
      continue;
    }
    if (field.min !== undefined && n < field.min) {
      errors[field.key] = `ต้องไม่ต่ำกว่า ${field.min}${field.unit ? ` ${field.unit}` : ""}`;
    } else if (field.max !== undefined && n > field.max) {
      errors[field.key] = `ต้องไม่เกิน ${field.max}${field.unit ? ` ${field.unit}` : ""}`;
    }
  }
  return errors;
}

export function invalidResult(
  message: string,
  fieldErrors?: Record<string, string>,
  tip = "แก้ค่าที่กรอก แล้วผลจะขึ้นเอง",
): CalcResult {
  nonFiniteSeen = false;
  return {
    headline: message,
    rows: [],
    tip,
    copyText: message,
    invalid: true,
    fieldErrors,
  };
}

/**
 * ผล "ตอบไม่ได้" เมื่ออินพุตหลุดช่วงที่สูตรใช้ได้ (หลักการข้อ 4.7 ห้าม clamp เงียบ)
 * ต่างจาก invalidResult ตรงที่ยังแนบแถวอธิบายได้ (เช่น ค่าที่อ่านได้ ขอบเขตที่รองรับ) แต่ห้ามมีตัวเลขให้เอาไปสั่งของ
 */
export function blockedResult(input: { headline: string; tip: string; rows?: ResultRow[] }): CalcResult {
  nonFiniteSeen = false;
  return {
    headline: input.headline,
    rows: input.rows ?? [],
    tip: input.tip,
    copyText: input.headline,
    invalid: true,
  };
}

/**
 * ด่านตรวจอินพุตในตัวสูตร — เรียกบรรทัดแรกของทุก calc
 * ใช้กติกาเดียวกับ validateFields ของหน้าจอ แต่ยอมให้ "ไม่ส่งคีย์มา" (สูตรใช้ค่าตั้งต้นเอง)
 * จึงปลอดภัยแม้ถูกเรียกตรงจากหน้า "คิดทั้งงาน" ลิงก์แชร์ หรือโค้ดอื่นที่ไม่ผ่านฟอร์ม
 */
export function guardInputs(fields: Field[] | undefined, v: Values): CalcResult | null {
  nonFiniteSeen = false;
  if (!fields) return null;
  const merged: Values = {};
  for (const f of fields) merged[f.key] = v[f.key] ?? f.default;
  const errors: Record<string, string> = {};
  let first = "";
  const fail = (field: Field, message: string) => {
    if (errors[field.key]) return;
    errors[field.key] = message;
    if (!first) first = `${field.label}: ${message}`;
  };
  for (const field of visibleFields(fields, merged)) {
    const raw = v[field.key];
    if (raw === undefined) continue;
    if (field.type === "select") {
      if (!field.options.some((o) => o.value === String(raw))) fail(field, "เลือกจากรายการที่มี");
      continue;
    }
    if (field.type !== "number") continue;
    if (raw === "" || raw === null) {
      fail(field, "กรอกช่องนี้ก่อน");
      continue;
    }
    const n = typeof raw === "number" ? raw : Number(raw);
    const unit = field.unit ? ` ${field.unit}` : "";
    if (!Number.isFinite(n)) fail(field, "ใส่เป็นตัวเลข");
    else if (field.min !== undefined && n < field.min) fail(field, `ต้องไม่ต่ำกว่า ${field.min}${unit}`);
    else if (field.max !== undefined && n > field.max) fail(field, `ต้องไม่เกิน ${field.max}${unit}`);
  }
  if (!first) return null;
  return invalidResult(`ค่าที่กรอกอยู่นอกช่วงที่คิดได้ — ${first}`, errors);
}

/**
 * เติมค่าตั้งต้นของฟอร์มให้คีย์ที่ไม่ได้ส่งมา — ใช้ในหน้า "คิดทั้งงาน" ก่อนส่งค่าต่อให้เครื่องมือย่อย
 * เพราะค่าตั้งต้นของฟอร์มงานอาจต่างจากของเครื่องมือย่อย (เช่น จำนวนตะเข้สัน งาน = 0 แต่เครื่องมือ = 4)
 */
export function withDefaults(fields: Field[], v: Values): Values {
  const out: Values = { ...v };
  for (const f of fields) if (out[f.key] === undefined) out[f.key] = f.default;
  return out;
}

/** ด่านตรวจของเครื่องมือย่อย: หาช่องจากรายการเครื่องมือของสายงานตาม id */
export function guardTool(tools: ToolDef[], id: string, v: Values): CalcResult | null {
  return guardInputs(tools.find((t) => t.id === id)?.fields, v);
}

const BAD_NUMBER_TEXT = /NaN|Infinity|∞/;

/** ตาข่ายชั้นสุดท้าย: ถ้ายังมี NaN/∞ หลุดมาถึงข้อความผลลัพธ์ ให้ตอบว่าคิดไม่ได้แทนการพิมพ์เลขเพี้ยน */
function sanitize(res: CalcResult): CalcResult {
  const seen = nonFiniteSeen;
  nonFiniteSeen = false;
  if (res.invalid) return res;
  const texts = [res.headline ?? "", ...res.rows.map((r) => r.value)];
  if (!seen && !texts.some((t) => BAD_NUMBER_TEXT.test(t))) return res;
  return invalidResult("ตัวเลขที่กรอกทำให้คิดไม่ได้ — ตรวจค่าที่กรอกอีกครั้ง");
}

export function makeCopy(title: string, rows: ResultRow[], extra?: string): string {
  const body = rows.map((r) => `${r.label}: ${r.value}`).join("\n");
  return [title, body, extra, "— Blacksmith · ผู้ช่วยงานช่าง · ค่าประมาณหน้างาน"]
    .filter(Boolean)
    .join("\n");
}

export function result(
  headline: string | undefined,
  rows: ResultRow[],
  tip: string,
  title: string,
): CalcResult {
  return sanitize({
    headline,
    rows,
    tip,
    copyText: makeCopy(title, rows, headline),
  });
}

/**
 * ตัวสร้างผลลัพธ์ที่มีคำอธิบายสูตรติดมาด้วย
 * ใช้ตัวนี้กับสูตรใหม่ทุกตัว — `result()` ด้านบนเก็บไว้เพื่อความเข้ากันได้ของสูตรเดิม
 */
export function resultX(input: {
  title: string;
  headline?: string;
  rows: ResultRow[];
  tip: string;
  explain: FormulaExplain;
  chart?: ChartSpec;
}): CalcResult {
  const disclaimer = input.explain.risk === "C" ? DISCLAIMER_C : DISCLAIMER_AB;
  const extra = [input.headline, disclaimer].filter(Boolean).join("\n");
  return sanitize({
    headline: input.headline,
    rows: input.rows,
    tip: input.tip,
    copyText: makeCopy(input.title, input.rows, extra),
    explain: input.explain,
    chart: input.chart,
  });
}

/** รวมผลหลายเครื่องมือเป็นหน้า “คิดทั้งงาน” โดยดึงสูตรและชั้นความเสี่ยงสูงสุดมาด้วย */
export function jobFromParts(input: {
  title: string;
  headline: string;
  rows: ResultRow[];
  tip: string;
  parts: CalcResult[];
  chart?: ChartSpec;
}): CalcResult {
  // ส่วนไหนตอบไม่ได้ ทั้งงานต้องตอบไม่ได้ — ห้ามโชว์ตัวเลขส่วนที่เหลือเหมือนงานครบ
  const bad = input.parts.find((p) => p.invalid);
  if (bad) {
    return blockedResult({
      headline: bad.headline ?? "ยังคิดทั้งงานไม่ได้ — ตรวจค่าที่กรอก",
      tip: bad.tip,
      rows: bad.rows,
    });
  }
  const explains = input.parts
    .map((p) => p.explain)
    .filter((e): e is FormulaExplain => Boolean(e));
  const rank: Record<RiskTier, number> = { A: 1, B: 2, C: 3 };
  const risk = explains.reduce<RiskTier>((worst, e) => (rank[e.risk] > rank[worst] ? e.risk : worst), "A");
  const steps = explains.flatMap((e) => e.steps);
  const caveats = [...new Set(explains.flatMap((e) => e.caveats ?? []))];
  const refs = explains.flatMap((e) => e.refs ?? []);
  const assumptions = [...new Set(explains.flatMap((e) => e.assumptions ?? []))];
  const constants = explains.flatMap((e) => e.constants ?? []);
  const summary = explains.map((e) => e.summary).filter(Boolean).join(" · ");
  if (!explains.length) {
    return result(input.headline, input.rows, input.tip, input.title);
  }
  return resultX({
    title: input.title,
    headline: input.headline,
    rows: input.rows,
    tip: input.tip,
    chart: input.chart ?? input.parts.find((p) => p.chart)?.chart,
    explain: {
      risk,
      // วันที่ของงานรวม = วันที่ล่าสุดของสูตรย่อยที่ใช้
      updatedAt: explains.map((e) => e.updatedAt).sort().at(-1) ?? "2026-11-25",
      summary: summary || input.headline,
      steps: steps.length ? steps : [{ label: "รวมผล", expr: input.headline }],
      constants: constants.length ? constants : undefined,
      assumptions: assumptions.length ? assumptions : undefined,
      caveats,
      refs: refs.length ? refs : undefined,
    },
  });
}

/** เปิดตารางแบบขั้นบันได: คืนค่าของช่วงแรกที่ x ไม่เกินขอบบน */
export function stepTable(x: number, table: Array<[number, number]>, fallback: number): number {
  for (const [ceiling, value] of table) {
    if (x <= ceiling) return value;
  }
  return fallback;
}

export function parseList(raw: string): number[] {
  return parseLengthList(raw).values;
}

/**
 * อ่านรายการความยาวที่ช่างพิมพ์เอง เช่น "1200, 800 2500" หรือ "1,200 800"
 * - คั่นด้วยจุลภาค เว้นวรรค ขึ้นบรรทัด หรือ ;
 * - "1,200" (จุลภาคติดกับเลข 3 หลักไม่เว้นวรรค) อ่านเป็นหลักพัน = 1200 เมื่อค่ารวมไม่เกิน `maxValue`
 *   (ปกติคือความยาวเส้นวัตถุดิบ) ถ้าเกินให้ถือว่าเป็นตัวคั่นธรรมดา เช่น "900,800" = 900 กับ 800
 * - ชิ้นที่อ่านเป็นตัวเลขบวกไม่ได้ จะคืนใน `dropped` ให้เอาไปบอกผู้ใช้ ห้ามทิ้งเงียบ
 */
export function parseLengthList(raw: string, maxValue = Infinity): { values: number[]; dropped: string[] } {
  const values: number[] = [];
  const dropped: string[] = [];
  const push = (token: string) => {
    const n = Number(token);
    if (token !== "" && Number.isFinite(n) && n > 0) values.push(n);
    else if (token !== "") dropped.push(token);
  };
  for (const chunk of raw.split(/[\s;]+/)) {
    const groups = chunk.split(",").filter((g) => g !== "");
    let i = 0;
    while (i < groups.length) {
      const head = groups[i];
      const next = groups[i + 1];
      if (next !== undefined && /^\d{1,3}$/.test(head) && /^\d{3}(\.\d+)?$/.test(next)) {
        const merged = Number(head) * 1000 + Number(next);
        // "12,000" แยกแล้วได้ "000" ซึ่งไม่ใช่ความยาวแน่ ๆ จึงถือเป็นหลักพันแม้จะเกิน maxValue (แล้วให้สูตรเตือนว่ายาวเกิน)
        if (Number(head) > 0 && (merged <= maxValue || next.startsWith("0"))) {
          values.push(merged);
          i += 2;
          continue;
        }
      }
      push(head);
      i += 1;
    }
  }
  return { values, dropped };
}

/** ช่วงของคอลัมน์แรก (x) ที่ตารางครอบคลุม — ใช้เช็กก่อน lerpTable เพื่อไม่ให้หนีบค่าปลายตารางเงียบ ๆ */
export function tableRange(table: Array<[number, number]>): { min: number; max: number } {
  return { min: table[0]?.[0] ?? 0, max: table[table.length - 1]?.[0] ?? 0 };
}

export function lerpTable(x: number, table: Array<[number, number]>): number {
  if (table.length === 0) return 0;
  if (x <= table[0][0]) return table[0][1];
  const last = table[table.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i - 1];
    const [x2, y2] = table[i];
    if (x <= x2) {
      const t = (x - x1) / (x2 - x1);
      return y1 + t * (y2 - y1);
    }
  }
  return last[1];
}
