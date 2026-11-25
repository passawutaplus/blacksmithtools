/**
 * ทดสอบแบบกวาด: ทุกเครื่องมือและทุกหน้า "คิดทั้งงาน" × ค่าตั้งต้น × แต่ละช่องที่ค่าต่ำสุด/สูงสุด × ทุกตัวเลือก
 * กติกา: ผลที่ไม่ได้ติดธง invalid ต้องไม่มี NaN / Infinity / ∞ / undefined / จำนวนติดลบ หลุดไปถึงหน้าจอ
 * และสูตรต้องกันค่าขยะได้เองแม้ถูกเรียกตรงโดยไม่ผ่าน validateFields ของฟอร์ม
 */
import { describe, expect, it } from "vitest";

import { TRADES } from "../catalog";
import type { CalcResult, Field, JobDef, ToolDef, Values } from "../types";

type Target = { name: string; def: ToolDef | JobDef };

const targets: Target[] = TRADES.flatMap((trade) => [
  ...trade.tools.map((tool) => ({ name: `${trade.id}/${tool.id}`, def: tool as ToolDef | JobDef })),
  ...(trade.job ? [{ name: `${trade.id}/job`, def: trade.job as ToolDef | JobDef }] : []),
]);

function defaults(fields: Field[]): Values {
  const v: Values = {};
  for (const f of fields) v[f.key] = f.default;
  return v;
}

const BAD_TEXT = /NaN|Infinity|∞|undefined|null/;
/** เลขติดลบที่ไม่ใช่อุณหภูมิ (°C ติดลบได้จริง เช่น อุณหภูมิอิ่มตัวของน้ำยา) */
const NEGATIVE_QTY = /(^|[\s(=:×])-\d[\d,.]*(?!\s*°C)(?![\d,.])/;

function textsOf(r: CalcResult): string[] {
  return [r.headline ?? "", ...r.rows.map((row) => `${row.label}: ${row.value}`), r.tip ?? "", r.copyText ?? ""];
}

function numbersIn(node: unknown, out: number[] = []): number[] {
  if (typeof node === "number") out.push(node);
  else if (node && typeof node === "object") for (const child of Object.values(node)) numbersIn(child, out);
  return out;
}

/** ตรวจผลหนึ่งครั้ง คืนรายการปัญหา (ว่าง = ผ่าน) */
function problems(r: CalcResult): string[] {
  const found: string[] = [];
  for (const text of textsOf(r)) {
    if (BAD_TEXT.test(text)) found.push(`ข้อความเพี้ยน: ${text}`);
    if (!r.invalid && NEGATIVE_QTY.test(text)) found.push(`จำนวนติดลบ: ${text}`);
  }
  if (!r.invalid) {
    if (r.rows.length === 0) found.push("ผลสำเร็จแต่ไม่มีแถว");
    if (numbersIn(r.chart).some((n) => !Number.isFinite(n))) found.push("กราฟมีค่าที่ไม่ใช่จำนวนจริง");
    if (r.chart?.kind === "threshold" && (r.chart.value < 0 || r.chart.max <= 0)) found.push("กราฟเกณฑ์ติดลบ");
    if (r.chart?.kind === "packs") {
      const lastUsed = r.chart.lastUsed ?? 1;
      if (r.chart.count < 0 || lastUsed < 0 || lastUsed > 1 + 1e-9) {
        found.push(`กราฟแพ็กเพี้ยน count=${r.chart.count} lastUsed=${lastUsed}`);
      }
    }
  } else {
    if (!r.headline) found.push("ผล invalid ต้องมีหัวข้อบอกเหตุผล");
  }
  return found;
}

type Case = { label: string; values: Values };

function edgeCases(fields: Field[]): Case[] {
  const base = defaults(fields);
  const cases: Case[] = [];
  for (const f of fields) {
    if (f.type !== "number") continue;
    cases.push({ label: `${f.key}@min`, values: { ...base, [f.key]: f.min as number } });
    cases.push({ label: `${f.key}@max`, values: { ...base, [f.key]: f.max as number } });
  }
  return cases;
}

function selectCases(fields: Field[]): Case[] {
  const base = defaults(fields);
  const cases: Case[] = [];
  for (const f of fields) {
    if (f.type !== "select") continue;
    for (const option of f.options) {
      const picked = { ...base, [f.key]: option.value };
      cases.push({ label: `${f.key}=${option.value}`, values: picked });
      for (const g of fields) {
        if (g.type !== "number") continue;
        cases.push({ label: `${f.key}=${option.value},${g.key}@min`, values: { ...picked, [g.key]: g.min as number } });
        cases.push({ label: `${f.key}=${option.value},${g.key}@max`, values: { ...picked, [g.key]: g.max as number } });
      }
    }
  }
  const allMin = { ...base };
  const allMax = { ...base };
  for (const f of fields) {
    if (f.type !== "number") continue;
    allMin[f.key] = f.min as number;
    allMax[f.key] = f.max as number;
  }
  cases.push({ label: "all@min", values: allMin }, { label: "all@max", values: allMax });
  return cases;
}

/**
 * ค่าปลายช่วงของช่องเดียว (ช่องอื่นเป็นค่าตั้งต้น) ที่สูตร "ตั้งใจ" ตอบว่าคิดไม่ได้
 * รายการนี้ต้องตรงเป๊ะ — ถ้ามีเคสใหม่โผล่มาแปลว่าช่วง min/max ของช่องกว้างเกินสูตร หรือสูตรเริ่มปฏิเสธค่าที่เคยคิดได้
 */
const EXPECTED_BLOCKED = [
  // แรงดัน/อุณหภูมินอกตาราง P–T หรือคู่ค่าที่เป็นไปไม่ได้ทางฟิสิกส์
  "hvac/pt:psi@max",
  "hvac/shsc:sucP@max",
  "hvac/shsc:sucT@min",
  "hvac/shsc:liqP@min",
  "hvac/shsc:liqP@max",
  "hvac/shsc:liqT@max",
  // แอร์ใหญ่กว่าตารางเบรกเกอร์คร่าว
  "hvac/breaker:btu@max",
  // กระแสเกินตารางสาย / แรงดันตกเกินที่สูตรใช้ได้
  "electrical/cable:il@max",
  "electrical/vdrop:il@max",
  "electrical/vdrop:len@max",
  "electrical/vdrop:volts@min",
  "electrical/job:il@max",
  "electrical/job:len@max",
  // อัตราไหลเกินท่อใหญ่สุดในตาราง
  "plumbing/pipe:q@max",
  // หน้าบานลิ้นชักเตี้ยเกิน / น้ำหนักต่อจุดเกินเพดานพุก
  "handyman/drawer:opening@min",
  "handyman/screw:load@max",
  // หักพื้นที่มากกว่าห้อง
  "tile/qty:deduct@max",
  "tile/grout:deduct@max",
  "tile/adhesive:deduct@max",
  "tile/leveling:deduct@max",
  "tile/job:deduct@max",
  "vinyl/qty:deduct@max",
  "vinyl/level:deduct@max",
  "vinyl/adhesive:deduct@max",
  "vinyl/job:deduct@max",
  // กระจกใหญ่/ลมแรงเกินตารางหน้างาน
  "glass/wind:w@max",
  "glass/wind:h@max",
  "glass/wind:wind@max",
  // ช่องเปิดมากกว่าผนัง / ทับหลังกว้างเกิน 2 ม.
  "masonry/brick:open@max",
  "masonry/mortar:open@max",
  "masonry/plaster:open@max",
  "masonry/lintel:width@max",
  "masonry/job:open@max",
  "masonry/job:width@max",
  // ชิ้นงานตั้งต้นยาวกว่าเส้นวัตถุดิบสั้นสุด
  "steel/cut:stock@min",
  "steel/job:stock@min",
].sort();

describe("กวาดทุกเครื่องมือ: ค่าตั้งต้นและค่าปลายช่วง", () => {
  it("ทุกช่องตัวเลขต้องมีทั้ง min และ max ที่สมเหตุสมผล และค่าตั้งต้นอยู่ในช่วง", () => {
    for (const { name, def } of targets) {
      for (const f of def.fields) {
        if (f.type !== "number") continue;
        const where = `${name}.${f.key}`;
        expect(typeof f.min, where).toBe("number");
        expect(typeof f.max, where).toBe("number");
        expect(f.max as number, where).toBeGreaterThan(f.min as number);
        expect(f.max as number, where).toBeLessThanOrEqual(1e9);
        expect(f.default, where).toBeGreaterThanOrEqual(f.min as number);
        expect(f.default, where).toBeLessThanOrEqual(f.max as number);
      }
    }
  });

  it("ค่าตั้งต้นต้องคิดได้จริงทุกเครื่องมือ (ไม่ invalid) และผลสะอาด", () => {
    for (const { name, def } of targets) {
      const r = def.calc(defaults(def.fields));
      expect(r.invalid, name).toBeFalsy();
      expect(problems(r), name).toEqual([]);
    }
  });

  it("เรียกสูตรตรง ๆ โดยไม่ส่งค่าอะไรเลย ต้องได้ผลจากค่าตั้งต้นในตัวสูตร ไม่พัง", () => {
    for (const { name, def } of targets) {
      const r = def.calc({});
      expect(r.invalid, name).toBeFalsy();
      expect(problems(r), name).toEqual([]);
    }
  });

  it("แต่ละช่องที่ค่าต่ำสุด/สูงสุด: ได้ผลสะอาด หรือไม่ก็ตอบว่าคิดไม่ได้ตามรายการที่ตั้งใจ", () => {
    const blocked: string[] = [];
    for (const { name, def } of targets) {
      for (const c of edgeCases(def.fields)) {
        const where = `${name}:${c.label}`;
        const r = def.calc(c.values);
        expect(problems(r), where).toEqual([]);
        if (r.invalid) blocked.push(where);
      }
    }
    expect(blocked.sort()).toEqual(EXPECTED_BLOCKED);
  });

  it("ทุกตัวเลือก × ทุกช่องที่ปลายช่วง และทุกช่องปลายช่วงพร้อมกัน ต้องไม่มีเลขเพี้ยนหรือติดลบ", () => {
    let ran = 0;
    for (const { name, def } of targets) {
      for (const c of selectCases(def.fields)) {
        const r = def.calc(c.values);
        expect(problems(r), `${name}:${c.label}`).toEqual([]);
        ran += 1;
      }
    }
    expect(ran).toBeGreaterThan(500);
  });
});

describe("กวาดทุกเครื่องมือ: ค่าขยะที่ไม่ผ่านฟอร์ม", () => {
  const GARBAGE: Array<[string, unknown]> = [
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
    ["ติดลบมาก", -1e9],
    ["ใหญ่เกินจริง", 1e15],
    ["ข้อความ", "abc"],
    ["ช่องว่าง", ""],
  ];

  it("ช่องตัวเลขที่ได้ค่าขยะต้องตอบ invalid พร้อมชี้ช่องที่ผิด ไม่คิดต่อ", () => {
    for (const { name, def } of targets) {
      const base = defaults(def.fields);
      // ใช้เฉพาะช่องที่มองเห็นตามค่าตั้งต้น — ช่องที่ซ่อนอยู่ (when) ไม่ถูกนำไปคิด จึงไม่ต้องปฏิเสธ
      const visible = def.fields.filter((f) => {
        if (f.type !== "number") return false;
        if (!f.when) return true;
        const allowed = Array.isArray(f.when.is) ? f.when.is : [f.when.is];
        return allowed.includes(String(base[f.when.key] ?? ""));
      });
      for (const f of visible) {
        for (const [label, junk] of GARBAGE) {
          const where = `${name}:${f.key}=${label}`;
          const r = def.calc({ ...base, [f.key]: junk as Values[string] });
          expect(r.invalid, where).toBe(true);
          expect(r.fieldErrors?.[f.key], where).toBeTruthy();
          expect(r.rows, where).toHaveLength(0);
          expect(problems(r), where).toEqual([]);
        }
      }
    }
  });

  it("ตัวเลือกที่ไม่มีในรายการต้องตอบ invalid ไม่ตกไปใช้ค่าเริ่มต้นเงียบ ๆ", () => {
    for (const { name, def } of targets) {
      const base = defaults(def.fields);
      for (const f of def.fields) {
        if (f.type !== "select") continue;
        if (f.when) {
          const allowed = Array.isArray(f.when.is) ? f.when.is : [f.when.is];
          if (!allowed.includes(String(base[f.when.key] ?? ""))) continue;
        }
        const r = def.calc({ ...base, [f.key]: "__ไม่มีตัวเลือกนี้__" });
        expect(r.invalid, `${name}:${f.key}`).toBe(true);
      }
    }
  });

  it("เลขต่ำกว่า min หรือสูงกว่า max นิดเดียวก็ต้องไม่ผ่าน", () => {
    for (const { name, def } of targets) {
      const base = defaults(def.fields);
      for (const f of def.fields) {
        if (f.type !== "number" || f.when) continue;
        const min = f.min as number;
        const max = f.max as number;
        const below = def.calc({ ...base, [f.key]: min - Math.max(Math.abs(min) * 0.01, 0.001) });
        const above = def.calc({ ...base, [f.key]: max + Math.max(Math.abs(max) * 0.01, 0.001) });
        expect(below.invalid, `${name}:${f.key}<min`).toBe(true);
        expect(above.invalid, `${name}:${f.key}>max`).toBe(true);
      }
    }
  });
});
