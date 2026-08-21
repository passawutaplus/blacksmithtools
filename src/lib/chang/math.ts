import { DISCLAIMER_AB, DISCLAIMER_C } from "./constants";
import type {
  CalcResult,
  ChartSpec,
  Field,
  FormulaExplain,
  ResultRow,
  RiskTier,
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

export function fmt(x: number, digits = 0): string {
  if (!Number.isFinite(x)) return "—";
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

export function invalidResult(message: string, fieldErrors?: Record<string, string>): CalcResult {
  return {
    headline: message,
    rows: [],
    tip: "แก้ค่าที่กรอก แล้วผลจะขึ้นเอง",
    copyText: message,
    invalid: true,
    fieldErrors,
  };
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
  return {
    headline,
    rows,
    tip,
    copyText: makeCopy(title, rows, headline),
  };
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
  return {
    headline: input.headline,
    rows: input.rows,
    tip: input.tip,
    copyText: makeCopy(input.title, input.rows, extra),
    explain: input.explain,
    chart: input.chart,
  };
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
      updatedAt: "2026-08-21",
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
  return raw
    .split(/[, \n]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
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
