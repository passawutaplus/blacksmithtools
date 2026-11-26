import { describe, expect, it } from "vitest";

import { TRADES, TOOL_COVERS, TOOLS_WITHOUT_COVER, toolCount } from "../catalog";
import * as K from "../constants";
import type { ChartSpec, ConstRef, Field, JobDef, ToolDef, Values } from "../types";
import { calcBtu, calcShsc, satTemp } from "../tools/hvac";
import { calcCable, calcVdrop } from "../tools/electrical";
import { calcGrout, calcTileQty } from "../tools/tile";
import { calcBrick, calcLintel, calcMortar, calcPlaster } from "../tools/masonry";
import { calcPaintQty } from "../tools/paint";
import { calcSteelWeight, calcWeld } from "../tools/steel";
import { calcSealant } from "../tools/glass";
import { calcPlumbPipe } from "../tools/plumbing";
import { calcScrew, calcStair } from "../tools/handyman";
import { calcTriangle } from "../tools/general";
import { fmt, invalidResult, validateFields } from "../math";

function defaults(fields: Field[]): Values {
  const v: Values = {};
  for (const f of fields) v[f.key] = f.default;
  return v;
}

function rowOf(rows: { label: string; value: string }[], label: string) {
  return rows.find((r) => r.label === label)?.value ?? "";
}

/** ดึงตัวเลขตัวแรกออกจากข้อความผลลัพธ์ (หน่วยไทยมีจุด เช่น "ตร.มม." จึงตัดแบบหยาบไม่ได้) */
function numberIn(text: string): number {
  const match = text.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : NaN;
}

/* ─────────── ค่าคงที่ต้องมีแหล่งอ้างอิงทุกตัว ─────────── */

function collectConstRefs(node: unknown, seen = new Set<unknown>()): ConstRef[] {
  if (!node || typeof node !== "object" || seen.has(node)) return [];
  seen.add(node);
  const self = node as Record<string, unknown>;
  if (typeof self.value === "number" && typeof self.unit === "string" && "source" in self) {
    return [node as ConstRef];
  }
  return Object.values(self).flatMap((child) => collectConstRefs(child, seen));
}

describe("ทะเบียนค่าคงที่", () => {
  const refs = collectConstRefs(K);

  it("เก็บค่าคงที่ไว้จริง ไม่ใช่ไฟล์เปล่า", () => {
    expect(refs.length).toBeGreaterThan(30);
  });

  it("ทุกค่าต้องมีชื่อ หน่วย และแหล่งอ้างอิงที่ไม่ว่าง", () => {
    for (const r of refs) {
      expect(r.label, JSON.stringify(r)).toBeTruthy();
      expect(r.unit, r.label).toBeTruthy();
      expect(r.source?.trim(), r.label).toBeTruthy();
      expect(Number.isFinite(r.value), r.label).toBe(true);
    }
  });

  it("ตัวคูณหน่วยตามนิยาม ห้ามปัด", () => {
    expect(K.UNIT.inch.value).toBe(25.4);
    expect(K.UNIT.foot.value).toBe(0.3048);
    expect(K.UNIT.gravity.value).toBe(9.80665);
    expect(K.UNIT.rai.value).toBe(1600);
  });
});

/* ─────────── ไฟฟ้า (ความเสี่ยงชั้น C) ─────────── */

describe("เลือกขนาดสายไฟ", () => {
  const base: Values = {
    mode: "amp",
    il: 15,
    volts: 220,
    phase: "1",
    pf: 1,
    method: "surface",
    temp: 40,
    circ: 1,
  };

  it("ฐานอุณหภูมิคือ 40 °C (Kt = 1.00) ไม่ใช่ 30 °C", () => {
    const r = calcCable(base);
    expect(rowOf(r.rows, "ตัวคูณอุณหภูมิ Kt")).toContain("1.00");
  });

  it("โหลด 15 A ท่อเดินลอย ได้สาย 2.5 ตร.มม. เบรกเกอร์ 20 A สายดิน 2.5", () => {
    const r = calcCable(base);
    expect(rowOf(r.rows, "ขนาดสายแนะนำ")).toBe("2.5 ตร.มม.");
    expect(rowOf(r.rows, "เบรกเกอร์")).toBe("20 A");
    expect(rowOf(r.rows, "สายดินบริภัณฑ์")).toBe("2.5 ตร.มม.");
  });

  it("ท่อฝังผนังพิกัดต่ำกว่าท่อเดินลอย จึงต้องใช้สายใหญ่ขึ้น", () => {
    const surface = numberIn(rowOf(calcCable({ ...base, il: 18 }).rows, "ขนาดสายแนะนำ"));
    const embed = numberIn(rowOf(calcCable({ ...base, il: 18, method: "embed" }).rows, "ขนาดสายแนะนำ"));
    expect(embed).toBeGreaterThan(surface);
  });

  it("ร้อนขึ้นหรือมีหลายวงจรในท่อ ต้องขยับสายขึ้น", () => {
    expect(numberIn(rowOf(calcCable({ ...base, temp: 45 }).rows, "ขนาดสายแนะนำ"))).toBe(4);
    expect(numberIn(rowOf(calcCable({ ...base, circ: 3 }).rows, "ขนาดสายแนะนำ"))).toBe(6);
  });

  it("คิดจากวัตต์แบบสามเฟสต้องหารด้วย √3 × V × PF", () => {
    const r = calcCable({ ...base, mode: "watt", watts: 11000, volts: 380, phase: "3", pf: 0.85 });
    // 11000 ÷ (1.732 × 380 × 0.85) ≈ 19.7 A
    expect(numberIn(rowOf(r.rows, "กระแสโหลด IL"))).toBeCloseTo(19.7, 1);
  });

  it("อุณหภูมิหลุดช่วงตารางต้องไม่ให้ขนาดสาย ไม่หนีบค่าเงียบ ๆ", () => {
    const r = calcCable({ ...base, temp: 70 });
    expect(r.invalid).toBe(true);
    expect(r.headline).toMatch(/อุณหภูมิ/);
    expect(r.rows).toHaveLength(0);
  });

  it("เป็นความเสี่ยงชั้น C และต้องมีข้อความสงวนสิทธิ์", () => {
    const r = calcCable(base);
    expect(r.explain?.risk).toBe("C");
    expect(r.explain?.caveats).toContain(K.DISCLAIMER_C);
  });
});

describe("แรงดันตก", () => {
  it("คิดที่อุณหภูมิตัวนำ 70 °C ตามมาตรฐาน (15 A / 30 ม. / 2.5 ตร.มม.)", () => {
    const r = calcVdrop({ il: 15, len: 30, mm2: 2.5, volts: 220, phase: "1" });
    // 2 × 30 × 15 × 0.0225 ÷ 2.5 = 8.1 V → 3.68%
    expect(numberIn(rowOf(r.rows, "แรงดันตก"))).toBeCloseTo(8.1, 1);
    expect(numberIn(rowOf(r.rows, "คิดเป็น"))).toBeCloseTo(3.68, 1);
  });

  it("บอกทั้งเกณฑ์วงจรย่อย 3% และเกณฑ์รวม 5%", () => {
    const r = calcVdrop({ il: 15, len: 30, mm2: 2.5, volts: 220, phase: "1" });
    expect(rowOf(r.rows, "เกณฑ์วงจรย่อย")).toContain("3%");
    expect(rowOf(r.rows, "เกณฑ์รวมทั้งระบบ")).toContain("5%");
  });
});

/* ─────────── แอร์ ─────────── */

describe("คำนวณ BTU แอร์", () => {
  const base: Values = { w: 4, l: 5, h: 2.6, room: "bed", sunload: "none", top: false, people: 2, heat: "none" };

  it("ห้องนอน 20 ตร.ม. ได้ 14,500 BTU → แนะนำ 15,000", () => {
    const r = calcBtu(base);
    expect(numberIn(rowOf(r.rows, "BTU ที่ต้องการ"))).toBe(14500);
    expect(numberIn(rowOf(r.rows, "ขนาดแอร์แนะนำ"))).toBe(15000);
  });

  it("เพดานสูงเกิน 3 ม. คิดจากปริมาตรหารด้วย 3 ไม่ใช่คูณ 1.2", () => {
    const r = calcBtu({ ...base, h: 4 });
    // 20 × 4 × 725 ÷ 3 = 19,333
    expect(numberIn(rowOf(r.rows, "BTU ที่ต้องการ"))).toBe(19334);
  });

  it("แดดบ่ายเป็นตัวคูณเดียว ไม่นับซ้ำกับทิศห้อง", () => {
    const r = calcBtu({ ...base, sunload: "afternoon" });
    expect(numberIn(rowOf(r.rows, "BTU ที่ต้องการ"))).toBe(16675); // 14,500 × 1.15
  });

  it("มีตัวแปรห้องทำงานแยกจากห้องนั่งเล่น", () => {
    expect(numberIn(rowOf(calcBtu({ ...base, room: "live" }).rows, "ตัวแปรความร้อน"))).toBe(800);
    expect(numberIn(rowOf(calcBtu({ ...base, room: "work" }).rows, "ตัวแปรความร้อน"))).toBe(900);
  });
});

/* ─────────── กระเบื้อง ─────────── */

describe("กระเบื้อง", () => {
  const room: Values = { w: 4, l: 5, deduct: 0 };

  it("ห้อง 4×5 ม. กระเบื้อง 60×60 ลายตรง: วิธีพื้นที่ 59 แผ่น แต่นับตามแถวได้ 60 แผ่น 15 กล่อง", () => {
    // วิธีพื้นที่: 20 ÷ 0.36 × 1.05 = 58.3 → 59
    // วางแถว: เต็ม 6 × 8 = 48 · ริมด้านกว้างเศษ 40 ซม. (เกินครึ่งแผ่น) 9 ชิ้น = 9 แผ่น · ริมด้านยาวเศษ 20 ซม. 6 ชิ้น ÷ 2 = 3 แผ่น → 60
    const r = calcTileQty({ ...room, size: "60", perBox: 4, pattern: "straight" });
    expect(numberIn(rowOf(r.rows, "นับแบบพื้นที่ + เผื่อ"))).toBe(59);
    expect(numberIn(rowOf(r.rows, "จำนวนแผ่น"))).toBe(60);
    expect(numberIn(rowOf(r.rows, "จำนวนกล่อง"))).toBe(15);
  });

  it("ยาแนวซีเมนต์ 60×60 ร่อง 2 มม. ได้ 0.096 กก./ตร.ม. ตามสูตร ISO 13007", () => {
    const r = calcGrout({ ...room, size: "60", joint: 2, thick: 9, grout: "cement" });
    expect(numberIn(rowOf(r.rows, "อัตราใช้"))).toBeCloseTo(0.1, 1);
    expect(numberIn(rowOf(r.rows, "ยาแนว"))).toBeCloseTo(2.1, 1);
  });

  it("เปลี่ยนชนิดยาแนวแล้วปริมาณเปลี่ยนตามความหนาแน่น", () => {
    const cement = numberIn(rowOf(calcGrout({ ...room, size: "60", joint: 2, thick: 9, grout: "cement" }).rows, "ยาแนว"));
    const ultra = numberIn(rowOf(calcGrout({ ...room, size: "60", joint: 2, thick: 9, grout: "ultra" }).rows, "ยาแนว"));
    expect(ultra).toBeCloseTo(cement * (K.GROUT_DENSITY.ultra.value / K.GROUT_DENSITY.cement.value), 1);
  });

  it("แผ่นเล็กกินยาแนวมากกว่าแผ่นใหญ่", () => {
    const small = numberIn(rowOf(calcGrout({ ...room, size: "20", joint: 2, thick: 9 }).rows, "อัตราใช้"));
    const big = numberIn(rowOf(calcGrout({ ...room, size: "80", joint: 2, thick: 9 }).rows, "อัตราใช้"));
    expect(small).toBeGreaterThan(big * 3);
  });
});

/* ─────────── ก่อฉาบ ─────────── */

describe("ก่อฉาบ", () => {
  const wall: Values = { w: 4, h: 3, open: 0 };

  it("อิฐบล็อก 19×39 ได้ 12.5 ก้อน/ตร.ม. ตรงตามตำรา", () => {
    const r = calcBrick({ ...wall, kind: "block", joint: "auto" });
    expect(numberIn(rowOf(r.rows, "ก้อนต่อ ตร.ม."))).toBeCloseTo(12.5, 1);
  });

  it("มวลเบา 20×60 ได้ประมาณ 8.2 ก้อน/ตร.ม.", () => {
    const r = calcBrick({ ...wall, kind: "aac75", joint: "auto" });
    expect(numberIn(rowOf(r.rows, "ก้อนต่อ ตร.ม."))).toBeCloseTo(8.2, 1);
  });

  it("อิฐมอญ มอก. 77 แนวปูน 10 มม. ได้ประมาณ 133 ก้อน/ตร.ม.", () => {
    const r = calcBrick({ ...wall, kind: "clayTis77", joint: "auto" });
    expect(numberIn(rowOf(r.rows, "ก้อนต่อ ตร.ม."))).toBeCloseTo(133.3, 1);
  });

  it("แนวปูนหนาขึ้น ใช้อิฐน้อยลง", () => {
    const thin = numberIn(rowOf(calcBrick({ ...wall, kind: "clayTis77", joint: "10" }).rows, "ก้อนต่อ ตร.ม."));
    const thick = numberIn(rowOf(calcBrick({ ...wall, kind: "clayTis77", joint: "20" }).rows, "ก้อนต่อ ตร.ม."));
    expect(thick).toBeLessThan(thin);
  });

  it("มวลเบาใช้ปูนกาวบาง ไม่ใช่ปูนซีเมนต์ผสมทราย", () => {
    const r = calcMortar({ ...wall, kind: "aac75", joint: "auto" });
    expect(r.headline).toContain("ปูนกาว");
    // 12 ตร.ม. × 1.7 กก. = 20.4 กก. → 1 ถุง
    expect(numberIn(rowOf(r.rows, "ปูนกาวก่อ (ถุง 50 กก.)"))).toBe(1);
  });

  it("อิฐมอญคิดปูนก่อจากสัดส่วนแนวปูนจริง", () => {
    const r = calcMortar({ ...wall, kind: "clayTis77", joint: "auto" });
    // f = 1 − (140×40)/(150×50) = 0.2533 → V = 12 × 0.065 × 0.2533 ≈ 0.198 ลบ.ม.
    expect(numberIn(rowOf(r.rows, "ปริมาตรมอร์ตาร์"))).toBeCloseTo(0.198, 2);
  });

  it("ฉาบ 15 มม. สองด้าน ได้ 720 กก. → 15 ถุง", () => {
    const r = calcPlaster({ ...wall, pkind: "normal", sides: 2 });
    expect(numberIn(rowOf(r.rows, "ปูนฉาบ รวม"))).toBeCloseTo(720, 0);
    expect(numberIn(rowOf(r.rows, "ปูนฉาบ (ถุง 50 กก.)"))).toBe(15);
  });

  it("ถุงปูนฉาบ 50 กก. ที่ 10 มม. ต้องได้ 2.2–2.8 ตร.ม. ตาม TDS", () => {
    const coverage = K.MASONRY.bag.value / (10 * K.MASONRY.plasterPerM2PerMm.value);
    expect(coverage).toBeGreaterThanOrEqual(2.2);
    expect(coverage).toBeLessThanOrEqual(2.8);
  });
});

/* ─────────── สี / เหล็ก ─────────── */

describe("สีและเหล็ก", () => {
  it("ปริมาณสีคิดเป็นแกลลอนตรง ๆ ไม่แปลงหน่วยไปกลับ", () => {
    const r = calcPaintQty({ area: 64, covP: 30, coatsP: 1, covT: 32, coatsT: 2 });
    expect(numberIn(rowOf(r.rows, "รองพื้น"))).toBeCloseTo(2.13, 1);
    expect(rowOf(r.rows, "สั่งทับหน้า")).toContain("4 แกลลอน");
  });

  it("เหล็กเส้นกลม Ø12 ได้ 0.888 กก./ม. ตามตาราง มอก.", () => {
    const r = calcSteelWeight({ shape: "round", d: 12, len: 10, qty: 1 });
    expect(numberIn(rowOf(r.rows, "กก./ม."))).toBeCloseTo(0.89, 2);
  });

  it("เหล็กแผ่น 1200×6 มม. ยาว 6 ม. ได้ 339 กก.", () => {
    const r = calcSteelWeight({ shape: "plate", w: 1200, t: 6, len: 6, qty: 1 });
    expect(numberIn(rowOf(r.rows, "น้ำหนักรวม"))).toBeCloseTo(339.1, 0);
  });
});

/* ─────────── ซิลิโคน ─────────── */

describe("ซิลิโคนยาแนวรอยต่อ", () => {
  it("รอบ 8 ม. ร่อง 6×6 มม. ได้ 331 มล. → 2 หลอด (ไม่ใช่พันกว่าหลอด)", () => {
    const r = calcSealant({ peri: 8, gap: 6, depth: 6 });
    expect(numberIn(rowOf(r.rows, "เนื้อซิลิโคน"))).toBe(288);
    expect(numberIn(rowOf(r.rows, "รวมเผื่อ 15%"))).toBe(331);
    expect(numberIn(rowOf(r.rows, "หลอด 280 มล."))).toBe(2);
  });

  it("ยาว 1 ม. ร่อง 5×5 มม. ต้องได้ 25 มล. ตามนิยามหน่วย (1 ม. × 1 ตร.มม. = 1 มล.)", () => {
    const r = calcSealant({ peri: 1, gap: 5, depth: 5 });
    expect(numberIn(rowOf(r.rows, "เนื้อซิลิโคน"))).toBe(25);
  });

  it("ร่องกว้างขึ้นสองเท่า ใช้ซิลิโคนเพิ่มสองเท่า", () => {
    const a = numberIn(rowOf(calcSealant({ peri: 8, gap: 6, depth: 6 }).rows, "เนื้อซิลิโคน"));
    const b = numberIn(rowOf(calcSealant({ peri: 8, gap: 12, depth: 6 }).rows, "เนื้อซิลิโคน"));
    expect(b).toBeCloseTo(a * 2, 0);
  });
});

/* ─────────── โครงสร้างแคตตาล็อก ─────────── */

const allTools: Array<{ trade: string; tool: ToolDef | JobDef; id: string }> = [];
for (const trade of TRADES) {
  for (const tool of trade.tools) allTools.push({ trade: trade.id, tool, id: tool.id });
  if (trade.job) allTools.push({ trade: trade.id, tool: trade.job, id: "job" });
}

describe("แคตตาล็อกเครื่องมือ", () => {
  it("มีเครื่องมือครบตามที่นับไว้", () => {
    expect(toolCount()).toBeGreaterThan(60);
    expect(allTools.length).toBe(toolCount() + TRADES.filter((t) => t.job).length);
  });

  it("ทุกเครื่องมือย่อยมีภาพปกใน TOOL_COVERS ยกเว้นที่ลงทะเบียนว่ายังไม่มีภาพ", () => {
    expect(Object.keys(TOOL_COVERS)).toHaveLength(toolCount() - TOOLS_WITHOUT_COVER.length);
    for (const trade of TRADES) {
      for (const tool of trade.tools) {
        const key = `${trade.id}/${tool.id}`;
        if (TOOLS_WITHOUT_COVER.includes(key)) {
          expect(TOOL_COVERS[key], key).toBeUndefined();
          continue;
        }
        expect(TOOL_COVERS[key], key).toBe(`/assistant/tools/${trade.id}-${tool.id}.webp`);
      }
    }
  });

  it("รายการที่ยังไม่มีภาพปกต้องชี้เครื่องมือที่มีอยู่จริง", () => {
    const all = TRADES.flatMap((t) => t.tools.map((tool) => `${t.id}/${tool.id}`));
    for (const key of TOOLS_WITHOUT_COVER) expect(all, key).toContain(key);
  });

  it("ทุกเครื่องมือคำนวณด้วยค่าตั้งต้นได้โดยไม่พัง", () => {
    for (const { trade, id, tool } of allTools) {
      const out = tool.calc(defaults(tool.fields));
      expect(out.copyText, `${trade}/${id}`).toBeTruthy();
      if (!out.invalid) {
        expect(out.rows.length, `${trade}/${id}`).toBeGreaterThan(0);
      }
      for (const row of out.rows) {
        expect(row.value, `${trade}/${id} → ${row.label}`).not.toContain("NaN");
        expect(row.value, `${trade}/${id} → ${row.label}`).not.toContain("∞");
        expect(row.value, `${trade}/${id} → ${row.label}`).not.toMatch(/Infinity/i);
      }
      if (out.headline) {
        expect(out.headline, `${trade}/${id}`).not.toContain("NaN");
        expect(out.headline, `${trade}/${id}`).not.toContain("∞");
      }
    }
  });

  it("เครื่องมือที่มีคำอธิบายสูตรแล้ว ต้องครบองค์ประกอบ", () => {
    const withExplain = allTools
      .map(({ trade, id, tool }) => ({ trade, id, out: tool.calc(defaults(tool.fields)) }))
      .filter((x) => x.out.explain);

    expect(withExplain.length).toBeGreaterThanOrEqual(15);

    for (const { trade, id, out } of withExplain) {
      const e = out.explain!;
      expect(e.summary, `${trade}/${id}`).toBeTruthy();
      expect(e.steps.length, `${trade}/${id}`).toBeGreaterThan(0);
      expect(e.updatedAt, `${trade}/${id}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(["A", "B", "C"], `${trade}/${id}`).toContain(e.risk);
      for (const step of e.steps) {
        expect(step.expr, `${trade}/${id} → ${step.label}`).toBeTruthy();
        expect(step.subst ?? "", `${trade}/${id} → ${step.label}`).not.toContain("NaN");
      }
      if (e.risk === "C") {
        expect(e.caveats, `${trade}/${id} ต้องมีข้อความสงวนสิทธิ์ชั้น C`).toContain(K.DISCLAIMER_C);
      }
    }
  });
});

/* ─────────── กราฟประกอบผลลัพธ์ ─────────── */

describe("กราฟประกอบผลลัพธ์", () => {
  const charted = allTools
    .map(({ trade, id, tool }) => ({ trade, id, chart: tool.calc(defaults(tool.fields)).chart }))
    .filter((x): x is { trade: string; id: string; chart: ChartSpec } => Boolean(x.chart));

  it("มีกราฟในเครื่องมือหลักแล้ว", () => {
    expect(charted.length).toBeGreaterThanOrEqual(15);
  });

  it("ทุกสเปกกราฟต้องวาดได้จริง ไม่มีค่าเพี้ยนหลุดเข้าไป", () => {
    for (const { trade, id, chart } of charted) {
      const at = `${trade}/${id} (${chart.kind})`;

      if (chart.kind === "steps") {
        expect(chart.items.length, at).toBeGreaterThan(1);
        expect(chart.items.filter((i) => i.state === "chosen").length, `${at} ต้องมีตัวที่เลือกหนึ่งตัว`).toBe(1);
        for (const item of chart.items) {
          expect(Number.isFinite(item.value), `${at} → ${item.label}`).toBe(true);
          expect(item.value, `${at} → ${item.label}`).toBeGreaterThan(0);
          expect(item.label, at).toBeTruthy();
        }
        if (chart.need !== undefined) {
          expect(Number.isFinite(chart.need), at).toBe(true);
          expect(chart.need, at).toBeGreaterThan(0);
        }
      }

      if (chart.kind === "threshold") {
        expect(Number.isFinite(chart.value), at).toBe(true);
        expect(chart.max, at).toBeGreaterThan(0);
        expect(chart.value, `${at} ค่าต้องไม่ล้นออกนอกกราฟ`).toBeLessThanOrEqual(chart.max);
        const ups = chart.zones.map((z) => z.upTo);
        expect(ups, `${at} โซนต้องเรียงจากน้อยไปมาก`).toEqual([...ups].sort((a, b) => a - b));
        expect(ups[ups.length - 1], `${at} โซนสุดท้ายต้องปิดที่ขอบกราฟ`).toBe(chart.max);
      }

      if (chart.kind === "stack") {
        expect(chart.parts.length, at).toBeGreaterThan(1);
        const sum = chart.parts.reduce((s, p) => s + p.value, 0);
        expect(sum, `${at} ผลรวมต้องมากกว่าศูนย์`).toBeGreaterThan(0);
        for (const part of chart.parts) {
          expect(Number.isFinite(part.value), `${at} → ${part.label}`).toBe(true);
          expect(part.value, `${at} → ${part.label}`).toBeGreaterThanOrEqual(0);
          expect(part.display, `${at} → ${part.label}`).toBeTruthy();
          expect(part.display, `${at} → ${part.label}`).not.toContain("NaN");
        }
      }

      if (chart.kind === "packs") {
        expect(Number.isInteger(chart.count), at).toBe(true);
        expect(chart.count, at).toBeGreaterThan(0);
        if (chart.lastUsed !== undefined) {
          expect(chart.lastUsed, `${at} เศษของใบสุดท้ายต้องอยู่ระหว่าง 0–1`).toBeGreaterThan(0);
          expect(chart.lastUsed, `${at} เศษของใบสุดท้ายต้องอยู่ระหว่าง 0–1`).toBeLessThanOrEqual(1);
        }
        expect(chart.note ?? "", at).not.toContain("NaN");
      }
    }
  });

  it("กราฟไต่ขั้นต้องเรียงจากเล็กไปใหญ่ และตัวที่เลือกต้องพอกับที่ต้องการ", () => {
    for (const { trade, id, chart } of charted) {
      if (chart.kind !== "steps" || chart.need === undefined) continue;
      const values = chart.items.map((i) => i.value);
      expect(values, `${trade}/${id}`).toEqual([...values].sort((a, b) => a - b));
      const chosen = chart.items.find((i) => i.state === "chosen")!;
      expect(chosen.value, `${trade}/${id} ตัวที่เลือกต้องไม่น้อยกว่าที่ต้องการ`).toBeGreaterThanOrEqual(chart.need);
    }
  });
});

describe("ตรวจอินพุต", () => {
  it("ช่องว่างและค่าติดลบต้องไม่ผ่าน", () => {
    const fields: Field[] = [
      { type: "number", key: "w", label: "กว้าง", default: 4, min: 1 },
      { type: "number", key: "bags", label: "ถุง", default: 2, min: 0 },
    ];
    expect(validateFields(fields, { w: "", bags: 2 }).w).toBeTruthy();
    expect(validateFields(fields, { w: -1, bags: 2 }).w).toBeTruthy();
    expect(Object.keys(validateFields(fields, { w: 4, bags: 2 }))).toHaveLength(0);
  });

  it("fmt ไม่พิมพ์ ∞", () => {
    expect(fmt(Number.POSITIVE_INFINITY)).toBe("—");
    expect(fmt(Number.NaN)).toBe("—");
  });

  it("ผล invalid ไม่มีแถวตัวเลขให้สั่งของ", () => {
    const r = invalidResult("กรอกก่อน");
    expect(r.invalid).toBe(true);
    expect(r.rows).toHaveLength(0);
  });
});

describe("ตาราง P–T น้ำยาแอร์", () => {
  it("R32 จุดทองที่ 100 / 150 / 200 psig ตรงกับตารางอิ่มตัว", () => {
    expect(satTemp("R32", 100)).toBeGreaterThan(-2);
    expect(satTemp("R32", 100)).toBeLessThan(2);
    expect(satTemp("R32", 150)).toBeCloseTo(11, 0);
    expect(satTemp("R32", 200)).toBeCloseTo(20, 0);
  });

  it("หน้า SH/SC ค่าตั้งต้นต้องไม่วินิจฉัยว่าน้ำยาเกิน", () => {
    const r = calcShsc({ kind: "R32", sucP: 120, sucT: 12, liqP: 380, liqT: 38 });
    const sh = numberIn(rowOf(r.rows, "Superheat"));
    const sc = numberIn(rowOf(r.rows, "Subcooling"));
    expect(sh).toBeGreaterThan(4);
    expect(sh).toBeLessThan(15);
    expect(sc).toBeGreaterThan(2);
    expect(sc).toBeLessThan(12);
    expect(r.headline ?? "").not.toMatch(/น้ำยาเกิน/);
  });
});

describe("สายไฟเกินตาราง", () => {
  it("โหลดใหญ่เกินตารางต้องไม่แนะนำสายแถวสุดท้ายแบบสำเร็จ", () => {
    const r = calcCable({
      mode: "amp",
      il: 400,
      volts: 220,
      phase: "1",
      pf: 1,
      method: "surface",
      temp: 40,
      circ: 1,
    });
    expect(r.invalid).toBe(true);
    expect(r.headline).toMatch(/เกินช่วงตาราง/);
    expect(rowOf(r.rows, "ขนาดสายแนะนำ")).toBe("เกินตาราง");
  });
});

describe("ท่อ PVC จาก ID ใน", () => {
  it("30 ล./นาที ที่ 1.8 ม./วินาที ชั้น 13.5 ต้องได้ท่อ 25 มม. ไม่ใช่ 20", () => {
    const r = calcPlumbPipe({ q: 30, vel: 1.8, pvcClass: "13.5" });
    expect(rowOf(r.rows, "ท่อ PVC แนะนำ")).toContain("25 มม.");
    expect(rowOf(r.rows, "ท่อ PVC แนะนำ")).not.toContain("20 มม.");
  });
});

describe("ทับหลัง", () => {
  it("ช่อง 1 ม. สองชุด ได้เหล็กประมาณ 20 ม. ไม่ใช่ 60 ม.", () => {
    const r = calcLintel({ width: 1, n: 2 });
    const m = numberIn(rowOf(r.rows, "เหล็ก RB6 ประมาณ"));
    expect(m).toBeGreaterThan(12);
    expect(m).toBeLessThan(28);
  });
});

describe("ลวดเชื่อม", () => {
  it("Fillet / V / Square ที่ขา 10 มม. ได้น้ำหนักคนละค่า", () => {
    const base = { z: 10, len: 4, process: "smaw" };
    const fillet = numberIn(rowOf(calcWeld({ ...base, kind: "fillet" }).rows, "โลหะแนว"));
    const v = numberIn(rowOf(calcWeld({ ...base, kind: "v" }).rows, "โลหะแนว"));
    const sq = numberIn(rowOf(calcWeld({ ...base, kind: "sq" }).rows, "โลหะแนว"));
    expect(v).toBeGreaterThan(fillet);
    expect(fillet).toBeGreaterThan(sq);
    expect(sq).toBeGreaterThan(0);
  });
});

describe("BTU ไม่นับแดดซ้ำกับห้องร้อน", () => {
  it("ครัว/ชั้นบนสุดไม่คูณแดดบ่ายซ้ำ", () => {
    const hot = numberIn(rowOf(calcBtu({ w: 4, l: 5, h: 2.6, room: "hot", sunload: "none", top: false, people: 2, heat: "none" }).rows, "BTU ที่ต้องการ"));
    const hotSun = numberIn(rowOf(calcBtu({ w: 4, l: 5, h: 2.6, room: "hot", sunload: "afternoon", top: true, people: 2, heat: "none" }).rows, "BTU ที่ต้องการ"));
    expect(hotSun).toBe(hot);
  });
});

describe("พุกยิปซัม", () => {
  it("น้ำหนักเกินพิกัดยิปซัมต้องบอกว่ารับไม่ไหว", () => {
    const r = calcScrew({ wall: "gyp", load: 25, points: 1 });
    expect(r.invalid).toBe(true);
    expect(r.headline ?? "").toMatch(/รับไม่ไหว|โครง/);
  });
});

describe("บันได", () => {
  it("แยกเกณฑ์ Blondel กับเกณฑ์กฎหมาย", () => {
    const r = calcStair({ H: 3, r: 17 });
    expect(rowOf(r.rows, "เกณฑ์กฎหมายเบื้องต้น")).toContain("ผ่าน");
    expect(rowOf(r.rows, "2R + T (Blondel)")).toBeTruthy();
  });
});

describe("พีทาโกรัส", () => {
  it("ทแยงสั้นกว่าด้านฉากต้องไม่คืน 0 เงียบ ๆ", () => {
    const r = calcTriangle({ mode: "leg", a: 3, b: 4 });
    expect(r.invalid).toBe(true);
  });
});

describe("งานคิดทั้งงานชั้น C", () => {
  it("หน้าคิดทั้งงานแอร์และก่อฉาบต้องดึงคำเตือนชั้น C มาด้วย", () => {
    const hvac = TRADES.find((t) => t.id === "hvac")!.job!;
    const masonry = TRADES.find((t) => t.id === "masonry")!.job!;
    const hvacOut = hvac.calc(defaults(hvac.fields));
    const masOut = masonry.calc(defaults(masonry.fields));
    expect(hvacOut.explain?.risk).toBe("C");
    expect(hvacOut.copyText).toContain(K.DISCLAIMER_C);
    expect(masOut.explain?.risk).toBe("C");
    expect(masOut.copyText).toContain(K.DISCLAIMER_C);
  });
});
