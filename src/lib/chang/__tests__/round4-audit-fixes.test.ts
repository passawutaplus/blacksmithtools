/**
 * แก้ตามผลตรวจสอบอิสระของเครื่องมือรอบ 4 (2 ชุด) — ทุกข้อทำซ้ำปัญหาก่อนแก้ แล้วยึดผลที่ถูกด้วยเทสนี้
 * ค่าที่คาดหวังคิดแยกด้วย python3 (เงินใช้ Decimal ROUND_HALF_UP) แล้วจดวิธีคิดไว้ในคอมเมนต์
 */
import { describe, expect, it } from "vitest";

import * as K from "../constants";
import { TRADES } from "../catalog";
import { guardInputs, validateFields } from "../math";
import type { CalcResult, Field, ToolDef } from "../types";
import { calcAppliance, calcEv, calcLux, evenGrid, fixtureGrid } from "../tools/electrical";
import { calcFilm } from "../tools/glass";
import { calcRai, calcUnitPrice, raiText, waText } from "../tools/general";
import { calcSprinkler } from "../tools/landscape";
import { calcFov, calcHdd, calcLan, calcPoe, hfovDeg, poeClassFor } from "../tools/lowvolt";
import { calcQuote, calcVatWht } from "../tools/estimate";
import { calcCladding, calcDeck, calcTimber } from "../tools/wood";

function rowOf(r: CalcResult, label: string): string {
  return r.rows.find((x) => x.label === label)?.value ?? "";
}

function rowStarting(r: CalcResult, prefix: string): string {
  return r.rows.find((x) => x.label.startsWith(prefix))?.value ?? "";
}

function tool(tradeId: string, toolId: string): ToolDef {
  const t = TRADES.find((x) => x.id === tradeId)?.tools.find((x) => x.id === toolId);
  if (!t) throw new Error(`${tradeId}/${toolId}`);
  return t;
}

/* ═══════════════ ช่องนับจำนวนต้องเป็นจำนวนเต็ม (ด่านกลาง) ═══════════════ */

/** หน่วยที่เป็น "การนับของ" — ช่องที่ใช้หน่วยนี้ต้องติดธง integer ทุกช่อง ยกเว้นที่เป็นอัตราต่อพื้นที่ */
const COUNT_UNITS = new Set([
  "ตัว", "ชิ้น", "บาน", "จุด", "แผ่น", "เส้น", "เที่ยว", "เครื่อง", "ช่อง", "คน", "ลิ้น", "ต้น", "ชั้น", "วงจร",
  "ด้าน", "ฐาน", "แผง", "แถว", "ห้อง", "หลุม/ร่อง", "มุม", "พอร์ต", "ผืน", "ท่อน", "ทีม", "ชุด", "งวด", "ครั้ง", "ขา", "ก้อน",
]);
/** ใช้หน่วยนับแต่เป็นอัตราต่อ ตร.ม. (มีเศษได้จริง) — ไม่ใช่จำนวนนับ */
const RATE_NOT_COUNT = new Set(["roof/material.perM2", "roof/material.perM2Roman", "roof/job.perM2", "roof/job.perM2Roman", "landscape/paver.ppm"]);

function allNumberFields(): Array<{ where: string; field: Extract<Field, { type: "number" }> }> {
  const out: Array<{ where: string; field: Extract<Field, { type: "number" }> }> = [];
  for (const t of TRADES) {
    const defs = [...t.tools.map((x) => ({ id: x.id, fields: x.fields })), ...(t.job ? [{ id: "job", fields: t.job.fields }] : [])];
    for (const d of defs) for (const f of d.fields) if (f.type === "number") out.push({ where: `${t.id}/${d.id}.${f.key}`, field: f });
  }
  return out;
}

describe("ช่องนับจำนวน: ด่านตรวจกลางปฏิเสธเลขมีเศษ", () => {
  it("ทุกช่องที่ใช้หน่วยนับ (ขา ชั้น บาน กล้อง ทีม งวด …) ติดธง integer — ยกเว้นอัตราต่อ ตร.ม.", () => {
    const missing = allNumberFields()
      .filter(({ where, field }) => COUNT_UNITS.has(field.unit ?? "") && !RATE_NOT_COUNT.has(where) && !field.integer)
      .map((x) => x.where);
    expect(missing).toEqual([]);
    // ปริมาณต่อเนื่องห้ามติดธง: ความยาว พื้นที่ ชั่วโมง เปอร์เซ็นต์ เงิน
    const wrong = allNumberFields()
      .filter(({ field }) => field.integer && ["ม.", "ซม.", "มม.", "ตร.ม.", "ชม.", "%", "บาท", "kW", "W"].includes(field.unit ?? ""))
      .map((x) => x.where);
    expect(wrong).toEqual([]);
  });

  it("ช่องที่ผู้ตรวจยกตัวอย่างทั้งหมดติดธงแล้ว", () => {
    const flagged = new Set(allNumberFields().filter((x) => x.field.integer).map((x) => x.where));
    for (const key of [
      "plumbing/tankload.legs", "concrete/members.colN", "concrete/formwork.beamN", "waterproof/sheet.layers",
      "glass/film.n1", "lowvolt/hdd.bays", "lowvolt/hdd.cams", "lowvolt/poe.n1", "lowvolt/poe.ports", "lowvolt/lan.runs",
      "curtain/blind.qty", "estimate/labour.teams", "estimate/instalment.n", "wood/timber.pcs", "earth/dig.count",
      "plumbing/homepump.floors", "plumbing/homepump.baths", "general/unitprice.c1", "electrical/appliance.q1", "paint/job.coatsT",
    ]) {
      expect(flagged.has(key), key).toBe(true);
    }
    // ไม่ใช่จำนวนนับ: จำนวนในใบเสนอราคาเป็นปริมาณ (ตร.ม./กก.) มีเศษได้ · n ใน 1:n เป็นอัตราส่วน
    expect(flagged.has("estimate/quote.q1")).toBe(false);
    expect(flagged.has("general/slope.n")).toBe(false);
  });

  it("เรียกสูตรตรง: ขา 2.5 ต้องไม่คิด (เดิมคิดเป็น 1,040 ÷ 2.5 = 416 กก./ขา แต่ป้ายเขียน 3 ขา)", () => {
    const r = tool("plumbing", "tankload").calc({ legs: 2.5 });
    expect(r.invalid).toBe(true);
    expect(r.rows).toHaveLength(0);
    expect(r.fieldErrors?.legs).toBe("ใส่เป็นจำนวนเต็ม (นับเป็นขา ไม่มีเศษ)");
    expect(r.headline).toBe("ค่าที่กรอกยังคิดไม่ได้ — จำนวนขา: ใส่เป็นจำนวนเต็ม (นับเป็นขา ไม่มีเศษ)");
    expect(tool("plumbing", "tankload").calc({ legs: 3 }).invalid).toBeFalsy();
  });

  it("ลิงก์แชร์ส่งค่ามาเป็นข้อความ: '1.5' ไม่ผ่าน · '2' ผ่าน", () => {
    expect(calcHdd({ cams: "1.5" }).invalid).toBe(true);
    expect(calcHdd({ cams: "2" }).invalid).toBeFalsy();
    expect(calcLan({ runs: 7.2 }).fieldErrors?.runs).toContain("จำนวนเต็ม");
  });

  it("หน้า 'คิดทั้งงาน' ก็ปฏิเสธ: คน 2.5 / จำนวนเที่ยว 1.5", () => {
    const plumbingJob = TRADES.find((t) => t.id === "plumbing")?.job;
    const waterproofJob = TRADES.find((t) => t.id === "waterproof")?.job;
    expect(plumbingJob?.calc({ people: 2.5 }).invalid).toBe(true);
    expect(plumbingJob?.calc({ people: 2.5 }).fieldErrors?.people).toContain("จำนวนเต็ม");
    expect(waterproofJob?.calc({ coats: 1.5 }).invalid).toBe(true);
    expect(plumbingJob?.calc({ people: 3 }).invalid).toBeFalsy();
  });

  it("ฟอร์ม (validateFields) ใช้กติกาเดียวกัน · ช่องต่อเนื่องที่ไม่ติดธงยังรับเศษได้", () => {
    const fields: Field[] = [
      { type: "number", key: "n", label: "จำนวน", unit: "ชิ้น", integer: true, default: 2, min: 1, max: 10 },
      { type: "number", key: "len", label: "ยาว", unit: "ม.", default: 2, min: 0.1, max: 10, step: 0.1 },
      { type: "number", key: "coats", label: "เที่ยว", integer: true, default: 2, min: 1, max: 5 },
    ];
    expect(validateFields(fields, { n: 2.5, len: 2.5, coats: 2 })).toEqual({ n: "ใส่เป็นจำนวนเต็ม (นับเป็นชิ้น ไม่มีเศษ)" });
    expect(validateFields(fields, { n: 2, len: 2.5, coats: 1.5 })).toEqual({ coats: "ใส่เป็นจำนวนเต็ม ไม่มีเศษ" });
    // หลุดช่วงต้องบอกช่วงก่อน ไม่ใช่บอกว่ามีเศษ
    expect(validateFields(fields, { n: 10.5, len: 1, coats: 1 }).n).toBe("ต้องไม่เกิน 10 ชิ้น");
    expect(guardInputs(fields, { n: 3 })).toBeNull();
    expect(guardInputs(fields, { n: 3.0000001 })?.invalid).toBe(true);
  });
});

/* ═══════════════ ชาร์จรถ EV: เฟสของเครื่องชาร์จในรถ ═══════════════ */

describe("ชาร์จรถ EV: รถ 1 เฟส / 3 เฟส", () => {
  it("หัว 11 kW 3 เฟส + รถ 1 เฟส 7.4 kW → ใช้ได้เฟสเดียว 11 ÷ 3 = 3.67 kW (เดิมตอบ 7.4 kW เร็วไปเท่าตัว)", () => {
    // 40 หน่วย ÷ 3.6667 = 10.909 ชม. = 10 ชม. 54.5 นาที → 10 ชม. 55 นาที · ค่าไฟไม่เปลี่ยน 40 × 4.2 = 168
    const r = calcEv({ charger: "11", car: 7.4, carPh: "1" });
    expect(r.invalid).toBeFalsy();
    expect(rowOf(r, "กำลังชาร์จจริง")).toBe("3.67 kW (รถชาร์จ 1 เฟส ใช้ได้เฟสเดียวจากหัว 3 เฟส 11 kW)");
    expect(r.headline).toBe("ชาร์จ 20→80% ราว 10 ชม. 55 นาที · 168 บาท");
    expect(r.explain?.steps.find((s) => s.label === "ไฟที่หัวชาร์จจ่ายให้รถได้")?.subst).toBe("11 ÷ 3 × 1 = 3.667 kW");
  });

  it("หัว 22 kW + รถ 1 เฟส: 22 ÷ 3 = 7.33 kW (ต่ำกว่าที่รถรับได้ 7.4) · รถ 1 เฟส 6.6 kW: รถเป็นตัวจำกัด", () => {
    // 40 ÷ 7.3333 = 5.4545 ชม. = 5 ชม. 27.3 นาที
    const r = calcEv({ charger: "22", car: 7.4, carPh: "1" });
    expect(rowOf(r, "กำลังชาร์จจริง")).toContain("7.33 kW");
    expect(rowOf(r, "เวลาชาร์จ")).toBe("5 ชม. 27 นาที");
    expect(rowOf(calcEv({ charger: "22", car: 6.6, carPh: "1" }), "กำลังชาร์จจริง")).toBe("6.6 kW (รถชาร์จ 1 เฟส ใช้ได้เฟสเดียวจากหัว 3 เฟส 22 kW)");
  });

  it("ค่าตั้งต้น (หัว 7.4 kW 1 เฟส + รถ 3 เฟส 11 kW) ยังได้ 7.4 kW เหมือนเดิม แต่เตือนว่ารถบางรุ่นได้แค่ 16 A", () => {
    const r = calcEv({});
    expect(rowOf(r, "กำลังชาร์จจริง")).toBe("7.4 kW");
    expect(rowOf(r, "รถ 3 เฟสบนหัว 1 เฟส")).toContain("16 A");
    // หัว 3.7 kW อยู่แล้ว ไม่ต้องเตือนเรื่อง 16 A
    expect(rowOf(calcEv({ charger: "3.7" }), "รถ 3 เฟสบนหัว 1 เฟส")).toBe("");
    // 3 เฟส + 3 เฟส: min(22, 11) = 11 kW เหมือนเดิม
    expect(rowOf(calcEv({ charger: "22", car: 11 }), "กำลังชาร์จจริง")).toBe("11 kW (รถรับได้แค่นี้ แม้หัวชาร์จ 22 kW)");
  });

  it("ค่าที่เป็นไปไม่ได้ต้องปฏิเสธ: รถ 1 เฟสรับ 11 kW · หัวกำหนดเอง 1 เฟส 11 kW", () => {
    expect(calcEv({ carPh: "1", car: 11 }).invalid).toBe(true);
    expect(calcEv({ charger: "custom", kw: 11, cph: "1" }).invalid).toBe(true);
    // หัวกำหนดเอง 3 เฟส 11 kW + รถ 1 เฟส 7.4 = 3.67 kW
    expect(rowOf(calcEv({ charger: "custom", kw: 11, cph: "3", car: 7.4, carPh: "1" }), "กำลังชาร์จจริง")).toContain("3.67 kW");
  });
});

/* ═══════════════ โคมไฟ: ผังที่แสงไม่สม่ำเสมอ ═══════════════ */

describe("จำนวนโคม: ทางเดินแคบยาว", () => {
  it("ทางเดิน 1 × 20 ม. 100 lux: 3 ดวงห่าง 6.67 ม. → เตือน และแนะนำ 14 ดวง (ห่าง 20 ÷ 14 = 1.43 ม. ≤ 1.5 × 1 ม.)", () => {
    // N = 100 × 20 ÷ (1800 × 0.6 × 0.8) = 2.31 → 3 · ผัง 1 × 3 ระยะ 1 × 6.67 อัตรา 6.67 > 1.5
    // แถวเดียว: ดวง ≥ 20 ÷ 1.5 = 13.33 → 14 · สองแถว: ≥ 20 ÷ 0.75 = 26.7 → 27 × 2 = 54 → เลือก 14
    const r = calcLux({ w: 1, l: 20, room: "corridor" });
    expect(fixtureGrid(3, 1, 20).even).toBe(false);
    expect(evenGrid(3, 1, 20)).toEqual({ rows: 1, cols: 14, total: 14 });
    expect(rowOf(r, "แสงไม่สม่ำเสมอ")).toBe(
      "ระยะสองทิศต่างกัน 6.7 เท่า (เกิน 1.5) แสงจะเป็นดวง ๆ — ให้ใช้ 14 ดวง (1 × 14 ห่าง 1.00 × 1.43 ม.) หรือโคมเส้นยาวตามทาง",
    );
    expect(r.tip).toContain("14 ดวง");
  });

  it("ห้องปกติ (ค่าตั้งต้น 4 × 5 ม.) ไม่มีคำเตือน", () => {
    expect(rowOf(calcLux({}), "แสงไม่สม่ำเสมอ")).toBe("");
    expect(fixtureGrid(6, 4, 5).even).toBe(true);
  });
});

/* ═══════════════ กล้อง: ขนาดเซนเซอร์ใช้ข้อตกลงเดียว (16:9) ═══════════════ */

describe("ขนาดเซนเซอร์กล้อง: กว้างภาพ 16:9 ทุกขนาด", () => {
  it("กว้าง = ทแยง × 16 ÷ √337 และเรียงตามขนาดเรียก (1/2.8\" ต้องแคบกว่า 1/2.7\")", () => {
    const k = 16 / Math.sqrt(337);
    // 1/3" 6.0 → 5.2295 · 1/2.9" 6.2 → 5.4038 · 1/2.8" 6.46 → 5.6304 · 1/2.7" 6.72 → 5.8570 · 1/2.5" 7.18 → 6.2579 · 1/1.8" 8.93 → 7.7832
    const expected: Record<string, number> = { "1/3": 6.0, "1/2.9": 6.2, "1/2.8": 6.46, "1/2.7": 6.72, "1/2.5": 7.18, "1/1.8": 8.93 };
    for (const [key, diag] of Object.entries(expected)) {
      expect(K.CCTV_SENSORS[key].width.value, key).toBeCloseTo(diag * k, 12);
      expect(K.CCTV_SENSORS[key].width.source, key).toContain("16:9");
    }
    const widths = ["1/3", "1/2.9", "1/2.8", "1/2.7", "1/2.5", "1/1.8"].map((x) => K.CCTV_SENSORS[x].width.value);
    expect([...widths].sort((a, b) => a - b)).toEqual(widths);
    expect(K.CCTV_SENSORS["1/2.8"].width.value).toBeLessThan(K.CCTV_SENSORS["1/2.7"].width.value);
  });

  it("1/2.8\" 4MP เลนส์ 2.8 ที่ 5 ม.: 5.6304 มม. → 90.3° ฉาก 10.05 ม. 254.6 px/ม.", () => {
    // 2·atan(5.6304 ÷ 5.6) = 90.31° · 5 × 5.6304 ÷ 2.8 = 10.054 · 2560 ÷ 10.054 = 254.62
    const r = calcFov({ sensor: "1/2.8" });
    expect(hfovDeg(6.46 * (16 / Math.sqrt(337)), 2.8)).toBeCloseTo(90.31, 2);
    expect(rowOf(r, "มุมรับภาพแนวนอน")).toBe("90.3°");
    expect(rowOf(r, "ความละเอียดที่ระยะนี้")).toBe("254.6 px/ม.");
  });

  it("กรอกความกว้างเอง: ค่าตั้งต้นช่องคือกว้าง 16:9 ของ 1/2.7\" ปัด 2 ตำแหน่ง = 5.86 มม.", () => {
    const sw = tool("lowvolt", "fov").fields.find((f) => f.key === "sw");
    expect(sw?.type === "number" ? sw.default : undefined).toBe(5.86);
  });
});

/* ═══════════════ ฮาร์ดดิสก์: ซื้อลูกน้อยสุดที่จุพอ ═══════════════ */

describe("ฮาร์ดดิสก์: จำนวนช่องไม่ใช่จำนวนลูกที่ต้องซื้อ", () => {
  it("กล้อง 1 ตัว เก็บ 1 วัน NVR 16 ช่อง → 1 TB × 1 ลูก (เดิมตอบ 1 TB × 16 ลูก)", () => {
    // 43.2 GB × 1 × 1.1 = 0.0475 TB → 1 ลูก 1 TB · เก็บได้ 1 ÷ 0.0432 = 23.1 วัน
    const r = calcHdd({ cams: 1, days: 1, bays: 16 });
    expect(rowOf(r, "ฮาร์ดดิสก์ที่ต้องซื้อ")).toBe("1 TB × 1 ลูก (รวม 1 TB)");
    expect(rowOf(r, "ช่องใส่ดิสก์")).toBe("ใช้ 1 จาก 16 ช่อง — ช่องที่เหลือไว้เพิ่มดิสก์ทีหลัง");
    expect(rowOf(r, "เก็บได้จริงกับดิสก์ที่ซื้อ")).toBe("ราว 23.1 วัน");
  });

  it("24 กล้อง 30 วัน NVR 4 ช่อง: 34.21 TB เกินใบใหญ่สุด → ⌈34.21 ÷ 24⌉ = 2 ลูก × 18 TB", () => {
    // 24 × 43.2 = 1,036.8 GB/วัน × 30 = 31.104 TB × 1.1 = 34.2144 · ÷ 2 = 17.107 → 18 TB · 36 ÷ 1.0368 = 34.7 วัน
    const r = calcHdd({ cams: 24, bays: 4 });
    expect(rowOf(r, "ฮาร์ดดิสก์ที่ต้องซื้อ")).toBe("18 TB × 2 ลูก (รวม 36 TB)");
    expect(rowOf(r, "เก็บได้จริงกับดิสก์ที่ซื้อ")).toBe("ราว 34.7 วัน");
  });
});

/* ═══════════════ PoE คลาส 0 ═══════════════ */

describe("PoE: คลาส 0 (ไม่บอกคลาส)", () => {
  it("เลือกคลาส 0 ได้ และสวิตช์จองเท่าคลาส 3: 8 × 15.4 = 123.2 W · อุปกรณ์ 8 × 12.95 = 103.6 W", () => {
    const s1 = tool("lowvolt", "poe").fields.find((f) => f.key === "s1");
    expect(s1?.type === "select" ? s1.options.map((o) => o.value) : []).toContain("c0");
    const r = calcPoe({ s1: "c0" });
    expect(rowOf(r, "สวิตช์ต้องจองตามคลาส")).toBe("123.2 W");
    expect(rowOf(r, "อุปกรณ์ใช้ไฟรวม (ตามสเปก)")).toBe("103.60 W");
    expect([K.POE_CLASS0.pse, K.POE_CLASS0.pd]).toEqual([15.4, 12.95]);
  });

  it("คิดคลาสจากวัตต์อัตโนมัติไม่เลือกคลาส 0 (3 W ยังเป็นคลาส 1)", () => {
    expect(poeClassFor(3)?.cls).toBe(1);
  });
});

/* ═══════════════ สาย LAN: เศษท้ายกล่อง ═══════════════ */

describe("สาย LAN: เศษท้ายกล่องน้อยกว่า 1 ม. ต้องเตือน", () => {
  it("10 เส้น × 30.4 ม. = 304.0 ม. จากกล่อง 304.8 ม. เหลือ 0.8 ม. → เตือน", () => {
    // 27.1 + 0.3 + 3 = 30.4 · ⌊304.8 ÷ 30.4⌋ = 10 เส้น · เหลือ 304.8 − 304 = 0.8 < 1
    const r = calcLan({ runs: 10, avg: 27.1, longest: 30 });
    expect(rowOf(r, "เศษท้ายกล่องน้อยเกินไป")).toContain("0.80 ม.");
    expect(r.headline).toContain("เศษท้ายกล่องเหลือน้อย");
  });

  it("กล่องเต็มก็นับ: 15 เส้น → 2 กล่อง กล่องแรกตัด 10 เส้นเหลือ 0.8 ม. → เตือน · ค่าตั้งต้นเหลือ 38.4 ม. ไม่เตือน", () => {
    // กล่องสุดท้าย 5 เส้น เหลือ 304.8 − 152 = 152.8 แต่กล่องแรกเหลือ 0.8
    expect(rowOf(calcLan({ runs: 15, avg: 27.1, longest: 30 }), "เศษท้ายกล่องน้อยเกินไป")).toContain("0.80 ม.");
    // 8 × 33.3 = 266.4 · 304.8 − 266.4 = 38.4
    expect(rowOf(calcLan({}), "เศษท้ายกล่องน้อยเกินไป")).toBe("");
  });
});

/* ═══════════════ ระแนง / ไม้ฝา / เดค ═══════════════ */

describe("ระแนง: คลิปซ่อนกับร่องแคบ · ไม้ฝามีหน้ากว้างตั้งต้นของตัวเอง", () => {
  it("ระแนงคลิปซ่อน ร่อง 0 / 0.2 ซม. เตือน · 0.3 ซม. พอดีเกณฑ์ไม่เตือน (ใช้เกณฑ์เดียวกับเดค)", () => {
    expect(rowOf(calcCladding({ fixing: "clip", gap: 0 }), "ข้อควรระวัง")).toContain("คลิปซ่อนไม่ได้");
    expect(rowOf(calcCladding({ fixing: "clip", gap: 0.2 }), "ข้อควรระวัง")).toContain("คลิปซ่อนไม่ได้");
    expect(rowOf(calcCladding({ fixing: "clip", gap: 0.3 }), "ข้อควรระวัง")).toBe("");
    expect(rowOf(calcCladding({ fixing: "screw", gap: 0 }), "ข้อควรระวัง")).toBe("");
    expect(rowOf(calcDeck({ gap: 0.2 }), "ข้อควรระวัง")).toContain("คลิปซ่อนไม่ได้");
    expect(K.DECK.clipMinGapCm.value).toBe(0.3);
  });

  it("ไม้ฝาค่าตั้งต้นหน้า 15 ซม. ทับ 3 ซม. ผนัง 4 × 2 ม.", () => {
    // แถว ⌈(2 − 0.03) ÷ (0.15 − 0.03)⌉ = ⌈16.42⌉ = 17 · คลุม 17 × 0.15 − 16 × 0.03 = 2.07 ม.
    // แถวยาว 4 จากแผ่น 3: 17 + ⌈17 ÷ 3⌉ = 23 × 1.05 = 24.15 → 25 · ตะปู 17 × 8 × 1 = 136
    const r = calcCladding({ mode: "lap" });
    expect(K.CLADDING.lapBoardW.value).toBe(15);
    expect(r.headline).toBe("ไม้ฝา 25 แผ่น (ยาว 3 ม.) · โครง 3 เส้น · สกรู 136 ตัว");
    expect(rowStarting(r, "จำนวนแถว")).toBe("17 แถว คลุมได้ 2.070 ม. (ต้องการ 2 ม.)");
    // ระแนงยังใช้หน้า 10 ซม. เหมือนเดิม
    expect(calcCladding({}).headline).toBe("ระแนง 28 แผ่น (ยาว 3 ม.) · โครง 3 เส้น · สกรู 304 ตัว");
  });
});

/* ═══════════════ สปริงเกอร์: พื้นที่แคบกว่ารัศมี ═══════════════ */

describe("สปริงเกอร์: ด้านสั้นกว่ารัศมีพ่น", () => {
  it("สนาม 1 × 10 ม. หัวรัศมี 4 ม. → เตือนว่าน้ำตกนอกสนาม · 4 × 10 (เท่ารัศมีพอดี) และค่าตั้งต้นไม่เตือน", () => {
    const r = calcSprinkler({ W: 1, L: 10 });
    expect(rowOf(r, "ข้อควรระวัง")).toContain("แคบกว่ารัศมีพ่น 4 ม.");
    expect(r.tip).toContain("รัศมีสั้นลง");
    expect(rowOf(calcSprinkler({ W: 4, L: 10 }), "ข้อควรระวัง")).toBe("");
    expect(rowOf(calcSprinkler({}), "ข้อควรระวัง")).toBe("");
  });
});

/* ═══════════════ VAT แก้อัตราได้ · หัก ณ ที่จ่ายต่ำกว่า 1,000 ═══════════════ */

describe("VAT / ใบเสนอราคา: อัตรา VAT เป็นช่องกรอก ค่าเริ่มต้น 7", () => {
  it("ทั้งสองเครื่องมือมีช่องอัตรา VAT ค่าเริ่มต้น 7 พร้อมคำเตือนให้ตรวจพระราชกฤษฎีกา", () => {
    for (const id of ["vat", "quote"]) {
      const f = tool("estimate", id).fields.find((x) => x.key === "vatRate");
      expect(f?.type, id).toBe("number");
      expect(f?.type === "number" ? [f.default, f.min, f.max] : [], id).toEqual([7, 1, 10]);
      expect(f?.label, id).toContain("ตรวจพระราชกฤษฎีกาลดอัตรา VAT ฉบับที่ใช้อยู่");
    }
    expect(K.TAX.vat.source).toContain("ตรวจพระราชกฤษฎีกาลดอัตรา VAT ฉบับที่ใช้อยู่");
  });

  it("อัตรา 10%: 10,000 + 1,000 = 11,000 หัก 3% 300 รับ 10,700 · แยก VAT 11,000 × 100 ÷ 110 = 10,000", () => {
    const r = calcVatWht({ vatRate: 10 });
    expect(rowOf(r, "VAT 10%")).toBe("1,000.00 บาท");
    expect(rowOf(r, "รับเงินจริง")).toBe("10,700.00 บาท");
    expect(rowOf(calcVatWht({ amt: 11000, mode: "incl", vatRate: 10 }), "ราคาก่อน VAT (ฐานภาษี)")).toBe("10,000.00 บาท");
  });

  it("ใบเสนอราคา VAT 10%: รวม 18,959.62 × 10% = 1,895.962 → 1,895.96 · ทั้งสิ้น 20,855.58", () => {
    const r = calcQuote({ vatRate: 10 });
    expect(rowOf(r, "ภาษีมูลค่าเพิ่ม 10%")).toBe("1,895.96 บาท");
    expect(rowOf(r, "ยอดรวมทั้งสิ้น")).toBe("20,855.58 บาท");
    // ค่าตั้งต้นยังเป็น 7% เหมือนเดิม
    expect(rowOf(calcQuote({}), "ภาษีมูลค่าเพิ่ม 7%")).toBe("1,327.17 บาท");
  });

  it("ฐานต่ำกว่า 1,000 บาท: หัวเรื่องบอกว่าปกติไม่ต้องหัก ตรงกับหมายเหตุ · 1,000 พอดีหักตามปกติ", () => {
    // 500 × 7% = 35 · รวม 535 · ถ้าหัก 3% = 15 → 520
    const r = calcVatWht({ amt: 500 });
    expect(r.headline).toBe("ยอดรวม 535.00 บาท · ต่ำกว่า 1,000 บาท ปกติไม่ต้องหัก ณ ที่จ่าย (ถ้าหัก 3% รับจริง 520.00 บาท)");
    expect(rowOf(r, "หมายเหตุหัก ณ ที่จ่าย")).toContain("ปกติไม่ต้องหัก");
    expect(calcVatWht({ amt: 1000 }).headline).toBe("ยอดรวม 1,070.00 บาท · หัก 3% 30.00 บาท · รับจริง 1,040.00 บาท");
    // ใบเสนอราคาหักเฉพาะค่าแรง 800 บาท (ทุน 800 ไม่บวกกำไร): ฐาน 800 < 1,000
    const q = calcQuote({ lines: "1", p1: 0, labour: 800, pct: 0, wht: "labour" });
    expect(q.headline).toContain("ปกติไม่ต้องหัก ณ ที่จ่าย");
  });
});

/* ═══════════════ ไม้: เงินเป็นสตางค์ · เทียบเท่ากันแบบสัดส่วน ═══════════════ */

describe("ไม้กี่ลูกบาศก์ฟุต: เงินละเอียดถึงสตางค์", () => {
  it("ราคา 0.5 บาท/ลบ.ฟ.: 7.290755 × 0.5 = 3.6454 → 3.65 บาท · ทางลัด 7.288889 × 0.5 = 3.6444 → 3.64 ถูกกว่า 0.01", () => {
    // เดิมพิมพ์ "1 บาท/ลบ.ฟ." "4 บาท" และ "ถูกกว่า 0 บาท"
    const r = calcTimber({ price: 0.5 });
    expect(rowOf(r, "ค่าไม้ (0.5 บาท/ลบ.ฟ.)")).toBe("3.65 บาท");
    expect(rowOf(r, "ถ้าร้านคิดแบบทางลัด")).toBe("3.64 บาท · ถูกกว่า 0.01 บาท");
    expect(r.headline).toContain("· 3.65 บาท");
  });

  it("ปริมาตรต่างกันแต่เงินปัดสตางค์แล้วเท่ากัน → บอกว่าเท่ากัน (0.0729 กับ 0.0729 บาท)", () => {
    // 7.290755 × 0.01 = 0.0729 → 0.07 · 7.288889 × 0.01 = 0.0729 → 0.07
    expect(rowOf(calcTimber({ price: 0.01 }), "ถ้าร้านคิดแบบทางลัด")).toBe("0.07 บาท (เท่ากัน)");
  });

  it("ร้านคิด 1 ม. = 1 ÷ 0.3048 ฟุตพอดี: เท่ากับคิดเป๊ะ (เทียบสัดส่วน ไม่ใช่ค่าตายตัว 0.0005 ลบ.ฟ.)", () => {
    const exact = 1 / K.UNIT.foot.value;
    const big = calcTimber({ pcs: 10000, shopFt: exact, price: 800 });
    expect(rowStarting(big, "ร้านคิด 1 ม.")).toContain("เท่ากับคิดเป๊ะ");
    expect(rowOf(big, "ถ้าร้านคิดแบบทางลัด")).toContain("(เท่ากัน)");
    // ไม้ท่อนเดียว 0.25 × 0.5 นิ้ว ยาว 0.3 ม.: 0.25 × 0.5 ÷ 144 × 0.98425 = 0.000854 ลบ.ฟ. ทางลัดต่างจริง 0.026% (3.28 × 0.3048 − 1) ต้องไม่ถูกปัดว่าเท่ากัน
    const tiny = calcTimber({ t: 0.25, w: 0.5, len: 0.3, pcs: 1 });
    expect(rowStarting(tiny, "ร้านคิด 1 ม.")).toContain("น้อยกว่าคิดเป๊ะ ไม่ถึง 0.001 ลบ.ฟ.");
  });
});

/* ═══════════════ เทียบราคาต่อหน่วย: เท่ากัน + หมายเหตุลิตรบนฉลาก ═══════════════ */

describe("เทียบราคาต่อหน่วย: ยอดเท่ากันต้องบอกว่าเท่ากัน", () => {
  it("ยอดจ่ายจริงเท่ากัน 200 = 200 บาท → 'จ่ายเท่ากันทุกตัว' ไม่ติดป้ายตัวแรกว่าจ่ายน้อยสุด", () => {
    // ตัว 1: 100 ÷ 5 = 20 บาท/ล. ซื้อ ⌈10 ÷ 5⌉ = 2 แพ็ก = 200 · ตัว 2: 200 ÷ 12 = 16.67 ซื้อ 1 แพ็ก = 200
    const r = calcUnitPrice({ p1: 100, s1: 5, p2: 200, s2: 12, need: 10 });
    expect(r.headline).toBe("ถูกสุดต่อลิตร: ถังใหญ่ 5 แกลลอน 16.67 บาท/ลิตร · ซื้อ 10 ลิตร จ่ายเท่ากันทุกตัว");
    expect(r.rows.some((x) => x.value.includes("จ่ายน้อยสุด"))).toBe(false);
    expect(rowOf(r, "ต้องใช้ 10 ลิตร: ถังเล็ก 1 แกลลอน")).toBe("ซื้อ 2 แพ็ก = 200 บาท (เหลือ 0 ลิตร) · จ่ายเท่ากัน");
  });

  it("3 ตัว ราคาต่อลิตรเท่ากันสองตัว: ติดป้ายถูกสุดทั้งสองตัว · ยอดจ่ายเท่ากันสองตัว", () => {
    // 100 ÷ 5 = 20 · 200 ÷ 10 = 20 · 500 ÷ 10 = 50 (แพงกว่า 150%) · ใช้ 10 ล.: 200 / 200 / 500
    const r = calcUnitPrice({ n: "3", p1: 100, s1: 5, p2: 200, s2: 10, p3: 500, c3: 1, s3: 10, need: 10 });
    expect(r.headline).toBe("ถูกสุดต่อลิตร (เท่ากัน): ถังเล็ก 1 แกลลอน, ถังใหญ่ 5 แกลลอน 20.00 บาท/ลิตร · ซื้อ 10 ลิตร จ่ายน้อยสุดเท่ากัน: ถังเล็ก 1 แกลลอน, ถังใหญ่ 5 แกลลอน");
    expect(rowOf(r, "ถังเล็ก 1 แกลลอน (100 บาท / 5 ลิตร)")).toBe("20.00 บาท/ลิตร · ถูกสุด (เท่ากัน)");
    expect(rowOf(r, "แพ็ก 4 แกลลอน (500 บาท / 10 ลิตร)")).toBe("50.00 บาท/ลิตร · แพงกว่า 150.0%");
    expect(rowOf(r, "ต้องใช้ 10 ลิตร: ถังใหญ่ 5 แกลลอน")).toContain("จ่ายน้อยสุด (เท่ากัน)");
  });

  it("ค่าตั้งต้นใช้ลิตรตามฉลาก (3.785 / 18.925) และบอกไว้ในหมายเหตุค่าคงที่ว่าต่างจากค่านิยาม", () => {
    // 1890 ÷ 18.925 = 99.868 → 99.87 (ค่านิยาม 18.92705892 → 99.857 → 99.86)
    expect(rowOf(calcUnitPrice({}), "ถังใหญ่ 5 แกลลอน (1,890 บาท / 18.925 ลิตร)")).toBe("99.87 บาท/ลิตร · ถูกสุด");
    expect(K.UNIT.gallon.note).toContain("3.785411784");
    expect(K.UNIT.gallon.note).toContain("ฉลาก");
    expect(calcUnitPrice({}).explain?.constants).toContain(K.UNIT.gallon);
  });
});

/* ═══════════════ ไร่-งาน-วา ═══════════════ */

describe("ไร่-งาน-ตารางวา: หัวเรื่องโหมดไทยไม่ทวนตัวเอง · พื้นที่เล็กไม่ขึ้น 0", () => {
  it("กรอก 2 ไร่ 1 งาน 35.5 ตร.วา → หัวเรื่องบอกตารางเมตร 3,742 (เดิม '… = 2 ไร่ 1 งาน 35.5 ตร.วา' ซ้ำ)", () => {
    expect(calcRai({ mode: "thai" }).headline).toBe("2 ไร่ 1 งาน 35.5 ตร.วา = 3,742 ตร.ม.");
    // กรอกเกินหลัก: ต่อด้วยค่าที่ทดแล้ว 2,600 ÷ 4 = 650 วา = 1 ไร่ 2 งาน 50 วา
    expect(calcRai({ mode: "thai", rai: 0, ngan: 5, wa: 150 }).headline).toBe("0 ไร่ 5 งาน 150 ตร.วา = 2,600 ตร.ม. (1 ไร่ 2 งาน 50 ตร.วา)");
    // โหมดตารางเมตรเหมือนเดิม
    expect(calcRai({}).headline).toBe("3,742 ตร.ม. = 2 ไร่ 1 งาน 35.5 ตร.วา");
  });

  it("0.01 ตร.ม. = 0.0025 ตร.วา (เดิมพิมพ์ 0 ตร.วา)", () => {
    const r = calcRai({ m2: 0.01 });
    expect(r.headline).toBe("0.01 ตร.ม. = 0.0025 ตร.วา");
    expect(rowOf(r, "ตารางวารวม")).toBe("0.0025 ตร.วา");
    expect(rowOf(r, "ไร่ (ทศนิยม)")).toBe("0.00000625 ไร่");
    expect(waText(935.5)).toBe("935.5 ตร.วา");
    expect(raiText(2)).toBe("0.5 ตร.วา");
  });
});

/* ═══════════════ ความละเอียดของป้าย ═══════════════ */

describe("ป้ายตัวเลขตรงกับค่าที่ใช้คิด", () => {
  it("ค่าไฟ 4.5969 บาท/หน่วย ป้ายต้องเป็น 4.5969 (เดิม 4.6 แต่คิดเงินด้วย 4.5969)", () => {
    const r = calcAppliance({ rate: 4.5969 });
    expect(rowStarting(r, "ค่าไฟต่อเดือน")).toBeTruthy();
    expect(r.rows.some((x) => x.label === "ค่าไฟต่อเดือน (4.5969 บาท/หน่วย)")).toBe(true);
    expect(calcAppliance({ rate: 4.5, ft: 0.0969 }).rows.some((x) => x.label === "ค่าไฟต่อเดือน (4.5969 บาท/หน่วย)")).toBe(true);
  });

  it("ฟิล์ม: กระจก 120.4 ซม. ป้ายต้องเป็น 120.4 (เดิม 120)", () => {
    const r = calcFilm({ w1: 120.4 });
    expect(r.rows.some((x) => x.label === "ขนาด 1: 120.4×150 ซม. × 4 บาน")).toBe(true);
    expect(rowStarting(r, "ขนาด 1:")).toContain("วางด้าน 124.4 ซม.");
  });
});

/* ═══════════════ แหล่งอ้างอิง ═══════════════ */

describe("แหล่งอ้างอิงที่ยังไม่ยืนยัน", () => {
  it("อัตราเปลี่ยนอากาศอ้าง CIBSE/ASHRAE และติดป้ายยังไม่ยืนยันกับกฎกระทรวง (ไม่อ้างฉบับที่ 39 แล้ว)", () => {
    for (const [key, p] of Object.entries(K.ACH_PRESETS)) {
      expect(p.ach.source, key).toContain("CIBSE");
      expect(p.ach.source, key).toContain("⚠️ ยังไม่ยืนยันกับกฎกระทรวง");
      expect(p.ach.source, key).not.toContain("ฉบับที่ 39");
    }
    const fan = tool("hvac", "fan").calc({});
    expect(JSON.stringify(fan.explain)).not.toContain("ฉบับที่ 39");
  });

  it("ดินถม: 'ยุบ 20–30%' ของปริมาตรหลวม = ตัวคูณ 1 ÷ 0.8 ถึง 1 ÷ 0.7 = 1.25–1.43 ข้อความกับช่วงตรงกัน", () => {
    const soil = K.EARTH_FILL.soil.factor;
    expect(1 / (1 - 0.2)).toBeCloseTo(1.25, 12);
    expect(1 / (1 - 0.3)).toBeCloseTo(1.4286, 4);
    expect(soil.range).toBe("1.25–1.43");
    expect(soil.source).toContain("1.25–1.43");
    expect(soil.value).toBeGreaterThanOrEqual(1.25);
    expect(soil.value).toBeLessThanOrEqual(1.43);
    // ทราย 1.2–1.3 = ยุบ 1 − 1/1.2 = 16.7% ถึง 1 − 1/1.3 = 23.1%
    expect(K.EARTH_FILL.sand.factor.source).toContain("17–23%");
    expect(K.SLAB.sandBedFactor.source).toContain("17–23%");
  });
});
