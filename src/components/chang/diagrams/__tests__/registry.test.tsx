import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TRADES } from "../../../../lib/chang/catalog";
import type { Field, Values } from "../../../../lib/chang/types";
import { C, FONT } from "../primitives";
import { DIAGRAMS, getDiagram } from "../registry";

function fieldsOf(path: string): Field[] | undefined {
  const [tradeId, toolId, extra] = path.split("/");
  if (extra !== undefined) return undefined;
  const trade = TRADES.find((t) => t.id === tradeId);
  if (!trade) return undefined;
  if (toolId === "job") return trade.job?.fields;
  return trade.tools.find((t) => t.id === toolId)?.fields;
}

function defaultsOf(fields: Field[]): Values {
  const values: Values = {};
  for (const f of fields) values[f.key] = f.default;
  return values;
}

/** ค่าเริ่มต้น + ทุกตัวเลือกของทุกช่อง select ทีละช่อง (ภาพเปลี่ยนตามตัวเลือกได้ ต้องไม่พังสักแบบ) */
function variantsOf(fields: Field[]): Values[] {
  const base = defaultsOf(fields);
  const out: Values[] = [base];
  for (const f of fields) {
    if (f.type === "select") for (const o of f.options) out.push({ ...base, [f.key]: o.value });
    if (f.type === "number") out.push({ ...base, [f.key]: f.min ?? 0 }, { ...base, [f.key]: f.max ?? 9999 });
  }
  return out;
}

const entries = Object.entries(DIAGRAMS);
const PALETTE = new Set(Object.values(C).map((c) => c.toLowerCase()));

describe("ทะเบียนภาพประกอบ", () => {
  it("มีภาพอย่างน้อย 20 เครื่องมือ", () => {
    expect(entries.length).toBeGreaterThanOrEqual(20);
  });

  it.each(entries)("%s ชี้ไปเครื่องมือที่มีจริงใน catalog", (path) => {
    expect(fieldsOf(path), `ไม่พบ ${path} ใน catalog`).toBeDefined();
  });

  it.each(entries)("%s มีคำบรรยายสั้น ๆ ภาษาไทย", (_path, entry) => {
    expect(entry.caption).toMatch(/[฀-๿]/);
    expect(entry.caption.length).toBeLessThanOrEqual(60);
    expect(entry.notes.length).toBeGreaterThanOrEqual(1);
    expect(entry.notes.length).toBeLessThanOrEqual(2);
    for (const note of entry.notes) {
      expect(note).toMatch(/[฀-๿]/);
      expect(note.length).toBeLessThanOrEqual(80);
    }
  });

  it("getDiagram ไม่คืนของจาก prototype", () => {
    expect(getDiagram("hvac/btu")).toBeDefined();
    expect(getDiagram("toString")).toBeUndefined();
    expect(getDiagram("nope/nope")).toBeUndefined();
  });
});

describe("ภาพประกอบทุกภาพ", () => {
  it.each(entries)("%s เรนเดอร์เป็น SVG ที่มี title ภาษาไทย", (path, entry) => {
    const html = renderToStaticMarkup(<entry.Diagram values={defaultsOf(fieldsOf(path) ?? [])} />);
    expect(html.startsWith("<svg")).toBe(true);
    expect(html).toMatch(/viewBox="0 0 \d+ \d+"/);
    expect(html).toContain('role="img"');
    const title = /<title id="([^"]+)">([^<]+)<\/title>/.exec(html);
    expect(title, "ไม่มี <title>").not.toBeNull();
    expect(title![2]).toMatch(/[฀-๿]{4,}/);
    expect(html).toContain(`aria-labelledby="${title![1]}"`);
  });

  it.each(entries)("%s เรนเดอร์ได้ทุกตัวเลือกและค่าขอบของฟอร์ม", (path, entry) => {
    for (const values of variantsOf(fieldsOf(path) ?? [])) {
      const html = renderToStaticMarkup(<entry.Diagram values={values} />);
      expect(html).toContain("<title");
      expect(html).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it.each(entries)("%s ไม่พังเมื่อค่าที่จำไว้เสีย", (_path, entry) => {
    const junk: Values = new Proxy({}, { get: (_t, key) => (key === "then" ? undefined : "???") }) as Values;
    for (const values of [{}, junk]) {
      const html = renderToStaticMarkup(<entry.Diagram values={values} />);
      expect(html).toContain("<title");
      expect(html).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it.each(entries)("%s ตัวหนังสือไม่เล็กกว่า 12.5 หน่วย (≥ 12 px บนจอ 360 px)", (path, entry) => {
    const html = renderToStaticMarkup(<entry.Diagram values={defaultsOf(fieldsOf(path) ?? [])} />);
    const sizes = [...html.matchAll(/font-size="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(0);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(12.5);
    expect(FONT).toBeGreaterThanOrEqual(12.5);
    expect(html).toMatch(/viewBox="0 0 340 /);
  });

  it.each(entries)("%s ใช้เฉพาะสีชุดแบรนด์ ไม่มีไล่สีหรือเงา", (path, entry) => {
    for (const values of variantsOf(fieldsOf(path) ?? [])) {
      const html = renderToStaticMarkup(<entry.Diagram values={values} />);
      const colors = new Set([...html.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase()));
      for (const color of colors) expect(PALETTE.has(color), `สีนอกชุด ${color}`).toBe(true);
      expect(html).not.toMatch(/Gradient|<filter|drop-shadow|<rect[^>]*\brx="|stroke-linecap="round"/);
    }
  });
});
