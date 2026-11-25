import { visibleFields } from "./math";
import { parseJson } from "./storage";
import type { Field, Values } from "./types";

export function defaultValues(fields: Field[]): Values {
  const v: Values = {};
  for (const f of fields) v[f.key] = f.default;
  return v;
}

export function valuesStorageKey(path: string): string {
  return `chang:vals:${path}`;
}

/**
 * รวมค่าที่จำไว้ในเครื่องเข้ากับค่าเริ่มต้นของฟอร์ม
 * รับเฉพาะคีย์ที่ฟอร์มนี้มีจริงและชนิดตรง — ข้อมูลเก่า/เสีย/ถูกแก้มือจะถูกทิ้งเป็นรายช่อง ไม่ทำให้ฟอร์มพัง
 */
export function mergeSavedValues(fields: Field[], raw: string | null): Values {
  const values = defaultValues(fields);
  const saved = parseJson(raw);
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return values;
  const record = saved as Record<string, unknown>;

  for (const field of fields) {
    const v = record[field.key];
    if (v === undefined) continue;
    if (field.type === "number") {
      if (typeof v === "number" && Number.isFinite(v)) values[field.key] = v;
      else if (v === "") values[field.key] = "";
      // NaN (พิมพ์มาแล้วแต่ไม่ใช่ตัวเลข) ถูก JSON เก็บเป็น null — คืนเป็น NaN ให้ช่องยังขึ้นเตือน ไม่เด้งกลับค่าเริ่มต้นเอง
      else if (v === null) values[field.key] = Number.NaN;
    } else if (field.type === "select") {
      if (typeof v === "string" && field.options.some((o) => o.value === v)) values[field.key] = v;
    } else if (field.type === "bool") {
      if (typeof v === "boolean") values[field.key] = v;
    } else if (typeof v === "string") {
      values[field.key] = v.slice(0, 2000);
    }
  }
  return values;
}

export type InputSummary = { key: string; label: string; value: string };

/** ค่าที่กรอก (เฉพาะช่องที่มองเห็น) เป็นข้อความ — ใช้แนบไปกับรูปที่บันทึก ให้คนรับรู้ว่าคิดจากอะไร */
export function describeInputs(fields: Field[], values: Values): InputSummary[] {
  const out: InputSummary[] = [];
  for (const field of visibleFields(fields, values)) {
    const v = values[field.key];
    let text = "";
    if (field.type === "number") {
      if (typeof v !== "number" || !Number.isFinite(v)) continue;
      text = `${v.toLocaleString("th-TH", { maximumFractionDigits: 6 })}${field.unit ? ` ${field.unit}` : ""}`;
    } else if (field.type === "select") {
      text = field.options.find((o) => o.value === v)?.label ?? "";
    } else if (field.type === "bool") {
      text = v ? "ใช่" : "ไม่";
    } else {
      text = typeof v === "string" ? v.trim() : "";
    }
    if (!text) continue;
    out.push({ key: field.key, label: field.label, value: text });
  }
  return out;
}
