/**
 * รอบ 4 (2026-11-26) — เครื่องมือใหม่ในสายงานเดิม
 * ค่าที่คาดหวังทุกตัวคิดแยกด้วยสคริปต์อิสระ (python3 -I) แล้วจดวิธีคิดไว้ในคอมเมนต์ของแต่ละเคส
 */
import { describe, expect, it } from "vitest";

import * as K from "../constants";
import { getToolCover, searchCatalog, TOOLS_WITHOUT_COVER, TRADES } from "../catalog";
import type { CalcResult } from "../types";
import { calcFormwork, calcMembers } from "../tools/concrete";
import { calcAppliance, calcEv, calcHeater, calcLux, fixtureGrid, fixturesNeeded, heaterKw, hoursText } from "../tools/electrical";
import { calcRai, calcSlopeConvert, calcTankVolume, calcUnitPrice, degText, raiNganWa, raiText, segmentArea } from "../tools/general";
import { calcFilm, filmRun } from "../tools/glass";
import { calcVentFan } from "../tools/hvac";
import { calcTankLoad } from "../tools/plumbing";
import { calcWpSheet, rollCoverage } from "../tools/waterproof";

function rowOf(r: CalcResult, label: string): string {
  return r.rows.find((x) => x.label === label)?.value ?? "";
}

function rowStarting(r: CalcResult, prefix: string): string {
  return r.rows.find((x) => x.label.startsWith(prefix))?.value ?? "";
}

const NEW_TOOLS = [
  "electrical/appliance",
  "electrical/lux",
  "electrical/heater",
  "electrical/ev",
  "hvac/fan",
  "plumbing/tankload",
  "concrete/members",
  "concrete/formwork",
  "waterproof/sheet",
  "glass/film",
  "general/slope",
  "general/rai",
  "general/tank",
  "general/unitprice",
];

/* ═══════════════ ไฟฟ้า ═══════════════ */

describe("ค่าไฟเครื่องใช้ไฟฟ้า", () => {
  it("ค่าตั้งต้น 3 รายการ: 56.76 หน่วย × 4.2 = 238.39 บาท/เดือน", () => {
    // LED 9 × 6 × 8 × 30 ÷ 1000 = 12.96 · ทีวี 100 × 5 × 1 × 30 ÷ 1000 = 15 · พัดลม 60 × 8 × 2 × 30 ÷ 1000 = 28.8
    // รวม 56.76 × 4.2 = 238.392 · ต่อปี × 12 = 2,860.7
    const r = calcAppliance({});
    expect(r.invalid).toBeFalsy();
    expect(r.headline).toBe("ค่าไฟราว 238 บาท/เดือน (56.8 หน่วย)");
    expect(rowOf(r, "หลอด LED (9 W × 6 ชม. × 8)")).toBe("13.0 หน่วย · 54 บาท");
    expect(rowOf(r, "ทีวี (100 W × 5 ชม. × 1)")).toBe("15.0 หน่วย · 63 บาท");
    expect(rowOf(r, "พัดลม (60 W × 8 ชม. × 2)")).toBe("28.8 หน่วย · 121 บาท");
    expect(rowOf(r, "ค่าไฟต่อเดือน (4.2 บาท/หน่วย)")).toBe("238 บาท");
    expect(rowOf(r, "ค่าไฟต่อปี")).toBe("2,861 บาท");
    // 28.8 ÷ 56.76 = 50.7%
    expect(rowOf(r, "กินไฟมากสุด")).toBe("พัดลม 51% ของทั้งหมด");
    expect(r.chart?.kind).toBe("stack");
    expect(r.explain?.risk).toBe("A");
  });

  it("รายการเดียว + Ft บวกเพิ่ม: ตู้เย็น 120 W 10 ชม. 31 วัน (4.5 + 0.3) = 37.2 หน่วย = 178.56 บาท", () => {
    // 120 × 10 × 1 × 31 ÷ 1000 = 37.2 · × 4.8 = 178.56
    const r = calcAppliance({ n: "1", name1: "ตู้เย็น", w1: 120, h1: 10, q1: 1, days: 31, rate: 4.5, ft: 0.3, w2: Number.NaN });
    expect(r.invalid).toBeFalsy();
    expect(r.headline).toBe("ค่าไฟราว 179 บาท/เดือน (37.2 หน่วย)");
    expect(rowOf(r, "ค่าไฟต่อเดือน (4.8 บาท/หน่วย)")).toBe("179 บาท");
    // รายการเดียวไม่มีกราฟแยกส่วน และไม่บอกว่าตัวไหนกินไฟสุด
    expect(r.chart).toBeUndefined();
    expect(rowOf(r, "กินไฟมากสุด")).toBe("");
  });

  it("ช่องของรายการที่ซ่อนอยู่ไม่ถูกนำมาคิด แต่รายการที่เห็นต้องตรวจ", () => {
    expect(calcAppliance({ n: "2", w3: -5 }).invalid).toBeFalsy();
    expect(calcAppliance({ n: "3", w3: -5 }).invalid).toBe(true);
  });
});

describe("จำนวนโคมตามความสว่าง (วิธีลูเมน)", () => {
  it("ค่าตั้งต้น ห้อง 4×5 ม. นั่งเล่น 150 lux โคม 1,800 lm UF 0.6 MF 0.8 → 3.47 → 4 ดวง จัด 2 × 2", () => {
    // 150 × 20 ÷ (1800 × 0.6 × 0.8) = 3000 ÷ 864 = 3.472 → 4 · ได้จริง 4 × 864 ÷ 20 = 172.8 lux
    const r = calcLux({});
    expect(r.headline).toBe("โคม 4 ดวง · จัด 2 แถว × 2 ดวง");
    expect(rowOf(r, "คิดได้")).toBe("3.47 ดวง → ปัดขึ้น 4 ดวง");
    expect(rowOf(r, "ระยะห่างโคม")).toBe("2.00 ม. × 2.50 ม. · ห่างผนัง 1.00 / 1.25 ม.");
    expect(rowOf(r, "ความสว่างเฉลี่ยที่ได้")).toBe("ราว 173 lux");
    expect(r.explain?.risk).toBe("B");
  });

  it("กำหนดเอง 500 lux ห้อง 6×8 ม. โคม 3,000 lm → 16.67 → 17 ดวง ลงตาราง 3 × 6 = 18", () => {
    // 500 × 48 ÷ (3000 × 0.48) = 16.667 → 17 · แถว 3 × 6 ดวง: ระยะ 2.00 × 1.33 ม. ต่างกัน 1.5 เท่า (ผ่าน) ใช้โคมน้อยสุด
    expect(fixturesNeeded(500, 48, 3000, 0.6, 0.8)).toBeCloseTo(16.6667, 4);
    const r = calcLux({ w: 6, l: 8, room: "custom", lux: 500, lm: 3000 });
    expect(r.headline).toBe("โคม 18 ดวง · จัด 3 แถว × 6 ดวง");
    expect(rowOf(r, "จัดผัง")).toBe("ตามด้านกว้าง 3 แถว × ตามด้านยาว 6 ดวง = 18 ดวง (เพิ่ม 1 ดวงให้ลงตาราง)");
  });

  it("จัดผัง: เลือกระยะสองทิศใกล้กัน ถ้าไม่มีผังผ่านเกณฑ์ใช้ผังที่ใกล้สุด", () => {
    // 12 ดวงใน 4×5: 3 × 4 ระยะ 1.33 × 1.25 · 7 ดวงใน 3×10: ไม่มีผังไหนต่างไม่เกิน 1.5 เท่า → 2 × 4 (1.5 × 2.5)
    expect(fixtureGrid(12, 4, 5)).toMatchObject({ rows: 3, cols: 4, total: 12 });
    expect(fixtureGrid(7, 3, 10)).toMatchObject({ rows: 2, cols: 4, total: 8 });
    expect(fixtureGrid(1, 2, 8)).toMatchObject({ rows: 1, cols: 1, total: 1 });
  });
});

describe("เครื่องทำน้ำอุ่นกี่ kW", () => {
  it("ค่าตั้งต้น 4 ลิตร/นาที 28 → 40 °C: 3.349 kW → เครื่อง 3.5 kW ไหลได้ 4.18 ลิตร/นาที", () => {
    // 4 ÷ 60 × 1 × 4.186 × 12 = 3.3488 kW · 3.5 ÷ (4.186 × 12) × 60 = 4.1806 · 3500 ÷ 230 = 15.22 A
    expect(heaterKw(4, 12)).toBeCloseTo(3.3488, 6);
    const r = calcHeater({});
    expect(r.headline).toBe("ต้องการ 3.35 kW → เครื่อง 3.5 kW");
    expect(rowOf(r, "เครื่อง 3.5 kW ปล่อยน้ำได้")).toBe("ราว 4.2 ลิตร/นาที ที่ 40 °C");
    expect(rowOf(r, "กระแสโดยประมาณ (230 V)")).toBe("15.2 A");
    expect(r.chart?.kind).toBe("steps");
  });

  it("ไม่บอกเบอร์เบรกเกอร์ และเป็นชั้น C มีข้อความสงวนสิทธิ์", () => {
    const r = calcHeater({});
    expect(r.explain?.risk).toBe("C");
    expect(r.explain?.caveats).toContain(K.DISCLAIMER_C);
    expect(rowOf(r, "เบรกเกอร์ / สายไฟ / สายดิน")).toContain("ให้ช่างไฟเลือก");
    expect(r.rows.some((x) => /\d+\s*A\b/.test(x.value) && x.label.includes("เบรกเกอร์"))).toBe(false);
  });

  it("6 ลิตร/นาที 25 → 42 °C = 7.116 kW → 8 kW · 10 ลิตร/นาที 25 → 45 °C = 13.95 kW เกินตัวเดียว", () => {
    // 6/60 × 4.186 × 17 = 7.1162 → 8 kW · 10/60 × 4.186 × 20 = 13.953 > 8
    expect(calcHeater({ lpm: 6, tin: 25, tout: 42 }).headline).toBe("ต้องการ 7.12 kW → เครื่อง 8 kW");
    const over = calcHeater({ lpm: 10, tin: 25, tout: 45 });
    expect(over.invalid).toBeFalsy();
    expect(over.headline).toBe("ต้องการ 13.95 kW เกินเครื่องทำน้ำอุ่นตัวเดียวที่ขายทั่วไป (8 kW)");
    expect(over.chart).toBeUndefined();
  });
});

describe("ชาร์จรถ EV", () => {
  it("ค่าตั้งต้น 60 kWh 20 → 80% หัว 7.4 kW: 36 kWh เข้าแบต 40 หน่วยจากมิเตอร์ 5 ชม. 24 นาที 168 บาท", () => {
    // 60 × 0.6 = 36 · ÷ 0.9 = 40 · ÷ 7.4 = 5.4054 ชม. = 324.3 นาที → 5:24 · 40 × 4.2 = 168
    const r = calcEv({});
    expect(r.headline).toBe("ชาร์จ 20→80% ราว 5 ชม. 24 นาที · 168 บาท");
    expect(rowOf(r, "ไฟจากมิเตอร์ (ประสิทธิภาพ 90%)")).toBe("40.00 หน่วย (kWh)");
    expect(rowOf(r, "ไฟที่บ้าน")).toBe("");
  });

  it("หัว 22 kW แต่รถรับ 11 kW: 77 kWh 10 → 90% ประสิทธิภาพ 92% ค่าไฟ 2.6 = 6 ชม. 5 นาที 174 บาท และต้องใช้ไฟ 3 เฟส", () => {
    // 77 × 0.8 = 61.6 · ÷ 0.92 = 66.957 · ÷ 11 = 6.087 ชม. (5.2 นาที) · × 2.6 = 174.09
    const r = calcEv({ cap: 77, from: 10, to: 90, charger: "22", car: 11, eff: 92, rate: 2.6 });
    expect(r.headline).toBe("ชาร์จ 10→90% ราว 6 ชม. 5 นาที · 174 บาท");
    expect(rowOf(r, "กำลังชาร์จจริง")).toBe("11 kW (รถรับได้แค่นี้ แม้หัวชาร์จ 22 kW)");
    expect(rowOf(r, "ไฟที่บ้าน")).toBe("หัวชาร์จเกิน 7.4 kW ต้องใช้ไฟ 3 เฟส");
    expect(r.tip).toContain("80%");
  });

  it("ชาร์จถึงไม่มากกว่าแบตที่เหลือ ต้องตอบไม่ได้", () => {
    expect(calcEv({ from: 80, to: 80 }).invalid).toBe(true);
    expect(calcEv({ from: 90, to: 50 }).invalid).toBe(true);
  });

  it("แปลงชั่วโมงเป็น ชม.-นาที", () => {
    expect(hoursText(0.5)).toBe("30 นาที");
    expect(hoursText(2)).toBe("2 ชม.");
    expect(hoursText(5.4054)).toBe("5 ชม. 24 นาที");
  });

  it("กำลังหัวชาร์จตามป้าย (ปัดเลข) ตรงกับ แอมป์ × 230 V × เฟส ไม่เกิน 1%", () => {
    // 16 × 230 = 3,680 · 32 × 230 = 7,360 · 3 × 16 × 230 = 11,040 · 3 × 32 × 230 = 22,080 W
    for (const [key, amps, phases] of [["3.7", 16, 1], ["7.4", 32, 1], ["11", 16, 3], ["22", 32, 3]] as const) {
      const kw = (amps * K.NOMINAL_V.phase.value * phases) / 1000;
      expect(Math.abs(K.EV_CHARGERS[key].kw / kw - 1), key).toBeLessThan(0.01);
      expect(K.EV_CHARGERS[key].phases, key).toBe(phases);
    }
  });
});

/* ═══════════════ แอร์: พัดลมระบายอากาศ ═══════════════ */

describe("พัดลมระบายอากาศ", () => {
  it("1 CFM = 0.3048³ × 60 = 1.699011 ลบ.ม./ชม. ตามนิยามฟุต", () => {
    expect(K.VENT.cfm.value).toBeCloseTo(0.3048 ** 3 * 60, 12);
    expect(K.VENT.cfm.value).toBeCloseTo(1.6990108, 7);
  });

  it("ค่าตั้งต้น ห้องน้ำ 1.5×2×2.4 ม. 10 ครั้ง/ชม. = 72 ลบ.ม./ชม. = 42.4 CFM → พัดลมเล็ก", () => {
    // 7.2 × 10 = 72 · ÷ 1.699011 = 42.378 · × 1.2 = 86.4 ≤ 100
    const r = calcVentFan({});
    expect(rowOf(r, "ลมที่ต้องดูดออก")).toBe("72.0 ลบ.ม./ชม. = 42.4 CFM");
    expect(rowOf(r, "รวมเผื่อท่อ/หน้ากาก 20%")).toBe("86.4 ลบ.ม./ชม.");
    expect(rowOf(r, "ขนาดพัดลม")).toBe("ติดเพดาน/ผนัง ขนาดเล็ก (ราว 100 ลบ.ม./ชม.)");
  });

  it("ครัว 3×4×2.6 ม. 12 ครั้ง/ชม. = 374.4 ลบ.ม./ชม. (220.4 CFM) รวมเผื่อ 449.3 → ใบพัด 8 นิ้ว", () => {
    // 31.2 × 12 = 374.4 · ÷ 1.699011 = 220.36 · × 1.2 = 449.28 ≤ 500
    const r = calcVentFan({ w: 3, l: 4, h: 2.6, room: "kitchen" });
    expect(r.headline).toBe("ต้องการลม 374 ลบ.ม./ชม. (220 CFM) → ใบพัด 8 นิ้ว");
  });

  it("ห้องใหญ่เกินขั้นใหญ่สุด: 10×10×3 ม. 30 ครั้ง/ชม. = 10,800 รวมเผื่อ → 12 นิ้ว 9 ตัว", () => {
    // 300 × 30 = 9,000 × 1.2 = 10,800 ÷ 1,200 = 9
    const r = calcVentFan({ w: 10, l: 10, h: 3, room: "custom", ach: 30 });
    expect(rowOf(r, "ขนาดพัดลม")).toContain("ใบพัด 12 นิ้ว 9 ตัว");
    expect(r.chart).toBeUndefined();
  });
});

/* ═══════════════ ประปา: ถังน้ำบนแท่น ═══════════════ */

describe("น้ำหนักถังน้ำบนแท่น", () => {
  it("ค่าตั้งต้น 1,000 ลิตร + ถัง 40 กก. = 1,040 กก. = 10.20 kN · 4 ขา ขาละ 260 กก. = 2.55 kN", () => {
    // 1040 × 9.80665 ÷ 1000 = 10.1989 · ÷ 4 = 2.5497
    const r = calcTankLoad({});
    expect(r.headline).toBe("เต็มถัง 1,040 กก. (10.20 kN) · ขาละ 260 กก.");
    expect(rowOf(r, "แบ่ง 4 ขาเท่ากัน")).toBe("ขาละ 260.0 กก. = 2.55 kN");
    expect(r.explain?.risk).toBe("C");
    expect(r.explain?.caveats).toContain(K.DISCLAIMER_C);
    expect(r.explain?.caveats?.some((c) => c.includes("แท่น/โครงต้องให้วิศวกร"))).toBe(true);
  });

  it("2,000 ลิตร + ถัง 55 + แท่น 120 กก. = 2,175 กก. = 21.33 kN ขาละ 543.8 กก.", () => {
    // 2175 × 9.80665 ÷ 1000 = 21.3295 · 2175 ÷ 4 = 543.75
    const r = calcTankLoad({ liters: 2000, empty: 55, stand: 120 });
    expect(rowOf(r, "น้ำหนักรวมเต็มถัง")).toBe("2,175.0 กก. = 21.33 kN");
    expect(rowOf(r, "แบ่ง 4 ขาเท่ากัน")).toBe("ขาละ 543.8 กก. = 5.33 kN");
  });
});

/* ═══════════════ คอนกรีต ═══════════════ */

describe("ปริมาตรเสา-คาน-ฐานราก", () => {
  it("ค่าตั้งต้น: เสา 0.96 + คาน 3.2 + ฐานแผ่ 2.4 + ตอม่อ 0.384 = 6.944 คิว → เผื่อ 5% 7.29 → สั่ง 7.5 คิว 2 เที่ยว", () => {
    // 0.2×0.2×3×8 = 0.96 · 0.2×0.4×4×10 = 3.2 · 1×1×0.3×8 = 2.4 · 0.2×0.2×1.2×8 = 0.384
    // 6.944 × 1.05 = 7.2912 → ปัดขั้น 0.5 = 7.5 · รถ 5 คิว 2 เที่ยว (เที่ยวหลัง 2.5)
    const r = calcMembers({});
    expect(r.headline).toBe("คอนกรีต 7.29 คิว (รวมเผื่อ) · สั่ง 7.5 คิว รถโม่ 2 เที่ยว");
    expect(rowOf(r, "เสา 8 ต้น (20×20 ซม. สูง 3 ม.)")).toBe("0.960 คิว (ชิ้นละ 0.120)");
    expect(rowOf(r, "คาน 10 ตัว (20×40 ซม. ยาว 4 ม.)")).toBe("3.200 คิว (ชิ้นละ 0.320)");
    expect(rowOf(r, "ฐานแผ่ 8 ฐาน (1×1 ม. หนา 30 ซม.)")).toBe("2.400 คิว (ชิ้นละ 0.300)");
    expect(rowOf(r, "ตอม่อ 8 ต้น (20×20 ซม. สูง 1.2 ม.)")).toBe("0.384 คิว (ชิ้นละ 0.048)");
    expect(rowOf(r, "คอนกรีตสุทธิ")).toBe("6.944 คิว");
    expect(rowOf(r, "รถโม่ 5 คิว")).toBe("2 เที่ยว (เที่ยวสุดท้าย 2.5 คิว)");
    expect(r.explain?.caveats?.some((c) => c.includes("ไม่ได้ออกแบบโครงสร้าง"))).toBe(true);
  });

  it("เสาอย่างเดียว 4 ต้น = 0.48 คิว × 1.05 = 0.504 → สั่ง 1 คิว · ทุกชิ้นเป็น 0 ต้องตอบไม่ได้", () => {
    const r = calcMembers({ colN: 4, beamN: 0, ftgN: 0, pedN: 0 });
    expect(rowOf(r, "สั่งคอนกรีตผสมเสร็จ")).toBe("1 คิว (สั่งทีละ 0.5 คิว)");
    expect(r.chart).toBeUndefined();
    expect(calcMembers({ colN: 0, beamN: 0, ftgN: 0, pedN: 0 }).invalid).toBe(true);
  });
});

describe("ไม้แบบ / ไม้อัด", () => {
  it("ค่าตั้งต้น: 76.48 ตร.ม. เผื่อ 10% ใช้ซ้ำ 3 ครั้ง = 28.04 ตร.ม. → ไม้อัด 10 แผ่น ไม้เคร่า 84.1 ม. = 22 ท่อน", () => {
    // เสา 2×(0.2+0.2)×3×8 = 19.2 · คาน (2×0.4+0.2)×4×10 = 40 · ฐาน 2×(1+1)×0.3×8 = 9.6 · ตอม่อ 2×0.4×1.2×8 = 7.68
    // 76.48 × 1.1 = 84.128 ÷ 3 = 28.0427 ÷ (1.22 × 2.44 = 2.9768) = 9.42 → 10 · เคร่า 28.0427 × 3 = 84.128 ม. ÷ 4 = 21.03 → 22
    const r = calcFormwork({});
    expect(r.headline).toBe("ไม้แบบ 76.5 ตร.ม. · ไม้อัด 4×8 ฟุต 10 แผ่น · ไม้เคร่า 22 ท่อน");
    expect(rowOf(r, "พื้นที่ไม้แบบสัมผัสคอนกรีต")).toBe("76.48 ตร.ม.");
    expect(rowOf(r, "ใช้ซ้ำ 3 ครั้ง ต้องมีไม้แบบจริง")).toBe("28.04 ตร.ม.");
    expect(rowOf(r, "ไม้เคร่า (3 ม./ตร.ม.)")).toBe("84.1 ม. = 22 ท่อน (ท่อนละ 4 ม.)");
  });

  it("คานวางบนดินไม่มีท้องคาน: 76.48 − 0.2×4×10 = 68.48 ตร.ม. · ใช้ครั้งเดียว 84.128 ÷ 2.9768 = 28.3 → 29 แผ่น", () => {
    const flat = calcFormwork({ beamBottom: false });
    expect(rowOf(flat, "พื้นที่ไม้แบบสัมผัสคอนกรีต")).toBe("68.48 ตร.ม.");
    expect(rowStarting(calcFormwork({ reuse: 1 }), "ไม้อัด 4×8 ฟุต")).toBe("29 แผ่น");
  });

  it("ขนาดไม้อัดมาจาก 4 × 8 ฟุต", () => {
    // 4 × 0.3048 = 1.2192 · 8 × 0.3048 = 2.4384 — ร้านเรียก 1.22 × 2.44
    expect(K.FORMWORK.plyW.value).toBeCloseTo(4 * K.UNIT.foot.value, 2);
    expect(K.FORMWORK.plyL.value).toBeCloseTo(8 * K.UNIT.foot.value, 2);
  });
});

/* ═══════════════ กันซึม: แผ่นชนิดม้วน ═══════════════ */

describe("แผ่นกันซึมชนิดม้วน", () => {
  it("ค่าตั้งต้น 6×8 ม. ขึ้นขอบ 30 ซม. = 56.4 ตร.ม. ม้วน 1×10 ทับ 10/15 ซม. ปูได้ 8.865 → 7 ม้วน ไพรเมอร์ 14.1 ล.", () => {
    // 48 + 28 × 0.3 = 56.4 · (1 − 0.1) × (10 − 0.15) = 8.865 · 56.4 × 1.05 ÷ 8.865 = 6.68 → 7
    // ไพรเมอร์ 56.4 × 0.25 = 14.1 ล. ÷ 3.785 = 3.73 → 4 แกลลอน
    expect(rollCoverage(1, 10, 0.1, 0.15)).toBeCloseTo(8.865, 9);
    const r = calcWpSheet({});
    expect(r.headline).toBe("แผ่นกันซึม 7 ม้วน (1×10 ม.) · ไพรเมอร์ 14.1 ลิตร");
    expect(rowOf(r, "พื้นที่ปูรวม")).toBe("56.40 ตร.ม.");
    expect(rowStarting(r, "ไพรเมอร์ (")).toBe("14.1 ลิตร ≈ 4 แกลลอน (3.785 ล.)");
  });

  it("ไม่มีขอบผนัง ปู 2 ชั้น: 48 × 2 × 1.05 ÷ 8.865 = 11.37 → 12 ม้วน · ไพรเมอร์ 0 = ไม่คิด", () => {
    const r = calcWpSheet({ up: 0, layers: 2, primer: 0 });
    expect(rowStarting(r, "แผ่นกันซึม (")).toBe("12 ม้วน");
    expect(rowOf(r, "ไพรเมอร์")).toBe("ไม่คิด");
  });
});

/* ═══════════════ กระจก: ฟิล์มกรองแสง ═══════════════ */

describe("ฟิล์มกรองแสง", () => {
  it("ค่าตั้งต้น 120×150 × 4 + 60×120 × 2 เผื่อขอบ 2 ซม. → 7.40 ม. เผื่อ 5% = 7.77 ม. 1 ม้วน", () => {
    // 124×154: ขวางม้วนด้าน 124 (154 กว้างกว่า 152 ต้องต่อ) → 4 × 1.54 = 6.16
    // 64×124: ขวาง 64 ได้ 2 ชิ้นต่อแถว → 1 แถว × 1.24 = 1.24 (อีกทิศ 2 × 0.64 = 1.28)
    // (6.16 + 1.24) × 1.05 = 7.77 · ฟิล์มที่ตัด 7.77 × 1.52 = 11.81 · กระจก 7.2 + 1.44 = 8.64
    const r = calcFilm({});
    expect(r.headline).toBe("ฟิล์มยาว 7.77 ม. (หน้ากว้าง 1.52 ม.) · 1 ม้วน");
    expect(rowOf(r, "ขนาด 1: 120×150 ซม. × 4 บาน")).toBe("ใช้ม้วน 6.16 ม. (วางด้าน 124 ซม. ขวางม้วน)");
    expect(rowOf(r, "ขนาด 2: 60×120 ซม. × 2 บาน")).toBe("ใช้ม้วน 1.24 ม. (วางด้าน 64 ซม. ขวางม้วน เรียง 2 ชิ้นต่อแถว)");
    expect(rowOf(r, "พื้นที่กระจกสุทธิ")).toBe("8.64 ตร.ม.");
    expect(rowOf(r, "พื้นที่ฟิล์มที่ตัดจากม้วน")).toBe("11.81 ตร.ม. (เศษ 3.17 ตร.ม.)");
  });

  it("บานกว้างกว่าหน้าม้วนทั้งสองด้าน (184×204 ซม.) ต้องต่อ 2 แผ่น เลือกทิศที่ใช้ม้วนน้อยกว่า 3.68 ม.", () => {
    // ขวาง 1.84 → 2 แถบ × 2.04 = 4.08 · ขวาง 2.04 → 2 แถบ × 1.84 = 3.68
    const c = filmRun(1.84, 2.04, 1, 1.52);
    expect(c.strips).toBe(2);
    expect(c.len).toBeCloseTo(3.68, 9);
  });

  it("คิดราคาต่อ ตร.ม. กระจก: 8.64 × 450 = 3,888 บาท · ต่อม้วน 1 × 9,000", () => {
    expect(calcFilm({ priceMode: "sqm", price: 450 }).headline).toBe("ฟิล์มยาว 7.77 ม. (หน้ากว้าง 1.52 ม.) · 1 ม้วน · 3,888 บาท");
    expect(rowStarting(calcFilm({ priceMode: "roll", price: 9000 }), "ราคา")).toBe("9,000 บาท");
  });

  it("เลือก 1 ขนาด: ขนาดที่ซ่อนไม่ถูกนับ", () => {
    const r = calcFilm({ sizes: "1", w2: Number.NaN });
    expect(r.invalid).toBeFalsy();
    // 6.16 × 1.05 = 6.468
    expect(rowStarting(r, "ความยาวฟิล์ม")).toBe("6.47 ม.");
  });
});

/* ═══════════════ ทั่วไป ═══════════════ */

describe("ความชัน % ↔ องศา ↔ 1:n", () => {
  it("1:12 = 8.3333% = 4.7636° (4° 45′ 49″) · ราบ 3 ม. ยก 25 ซม. แนวเอียง 3.0104 ม.", () => {
    // tan = 1/12 · atan = 4.763642° · 3 × √(1 + 1/144) = 3.010399
    const r = calcSlopeConvert({});
    expect(r.headline).toBe("1:12 = 8.333% = 4.764°");
    expect(rowOf(r, "องศา")).toBe("4.7636° (4° 45′ 49″)");
    expect(rowOf(r, "ระยะราบ 3 ม. ต้องยก")).toBe("25 ซม.");
    expect(rowOf(r, "ความยาวตามแนวเอียง (ราบ 3 ม.)")).toBe("3.0104 ม.");
  });

  it("2% = 1.146° = 1:50 · 30° = 57.735% = 1:1.732 · ยก 25 ซม. ใน 3 ม. = 1:12", () => {
    expect(calcSlopeConvert({ mode: "pct", pct: 2 }).headline).toBe("2% = 1.146° = 1:50");
    expect(calcSlopeConvert({ mode: "deg", deg: 30 }).headline).toBe("30° = 57.735% = 1:1.732");
    expect(rowOf(calcSlopeConvert({ mode: "rise", rise: 25, run: 3 }), "อัตราส่วน ยก : ราบ")).toBe("1:12");
  });

  it("ชันเกิน 45° บอกเป็น ยก:ราบ · 100% = 45°", () => {
    expect(rowOf(calcSlopeConvert({ mode: "deg", deg: 60 }), "อัตราส่วน ยก : ราบ")).toBe("1.732:1 (ยกมากกว่าราบ)");
    expect(rowOf(calcSlopeConvert({ mode: "pct", pct: 100 }), "องศา")).toBe("45° (45° 0′ 0″)");
    expect(degText(4.7636416907)).toBe("4° 45′ 49″");
  });
});

describe("ไร่-งาน-ตารางวา", () => {
  it("3,742 ตร.ม. = 935.5 ตร.วา = 2 ไร่ 1 งาน 35.5 ตร.วา", () => {
    // 3742 ÷ 4 = 935.5 = 2 × 400 + 1 × 100 + 35.5
    const r = calcRai({});
    expect(r.headline).toBe("3,742 ตร.ม. = 2 ไร่ 1 งาน 35.5 ตร.วา");
    expect(rowOf(r, "ไร่ (ทศนิยม)")).toBe("2.3388 ไร่");
  });

  it("2 ไร่ 3 งาน 50 ตร.วา = 3,200 + 1,200 + 200 = 4,600 ตร.ม. · กว้าง 40 × ยาว 93.55 = 3,742 ตร.ม.", () => {
    expect(rowOf(calcRai({ mode: "thai", rai: 2, ngan: 3, wa: 50 }), "ตารางเมตร")).toBe("4,600 ตร.ม.");
    expect(rowOf(calcRai({ mode: "wl", w: 40, l: 93.55 }), "ไร่ งาน ตารางวา")).toBe("2 ไร่ 1 งาน 35.5 ตร.วา");
  });

  it("งาน/วาเกินหลักทดขึ้นให้ · 99.999 ตร.วา ปัดแล้วทดเป็น 1 งาน ไม่ขึ้น 100 ตร.วา", () => {
    // 0 ไร่ 5 งาน 150 วา = 2,000 + 600 = 2,600 ตร.ม. = 650 วา = 1 ไร่ 2 งาน 50 วา
    expect(rowOf(calcRai({ mode: "thai", rai: 0, ngan: 5, wa: 150 }), "ไร่ งาน ตารางวา")).toBe("1 ไร่ 2 งาน 50 ตร.วา");
    expect(raiText(399.996)).toBe("1 งาน");
    expect(raiText(1600)).toBe("1 ไร่");
    expect(raiText(2)).toBe("0.5 ตร.วา");
    expect(raiNganWa(3742)).toMatchObject({ rai: 2, ngan: 1, restWa: 35.5 });
  });

  it("ใส่ราคาต่อ ตร.วา: 935.5 × 50,000 = 46,775,000 บาท · พื้นที่ 0 ตอบไม่ได้", () => {
    expect(rowOf(calcRai({ price: 50000 }), "ราคา 50,000 บาท/ตร.วา")).toBe("46,775,000 บาท");
    expect(calcRai({ mode: "thai", rai: 0, ngan: 0, wa: 0 }).invalid).toBe(true);
  });
});

describe("ปริมาตรถังเป็นลิตร", () => {
  it("ถังกลมนอน Ø 100 × ยาว 200 ซม. เต็ม 1,570.8 ล. น้ำสูง 30 ซม. = 396.3 ล. (25.2%) น้ำขึ้น 1 ซม. = 18.33 ล.", () => {
    // เต็ม π × 50² × 200 ÷ 1000 = 1,570.796
    // ส่วนวงกลม 50² × acos(0.4) − 20 × √(3000 − 900) = 2,898.198 − 916.515 = 1,981.68 ตร.ซม. × 200 ÷ 1000 = 396.337
    // ผิวน้ำกว้าง 2√2100 = 91.65 ซม. × 200 ÷ 1000 = 18.330
    const r = calcTankVolume({});
    expect(r.headline).toBe("ถังกลมนอน เต็ม 1,570.8 ลิตร · น้ำสูง 30 ซม. = 396.3 ลิตร (25.2%)");
    expect(rowOf(r, "ที่ระดับนี้ น้ำขึ้น 1 ซม.")).toBe("18.33 ลิตร");
    expect(rowOf(r, "เติมอีกจนเต็ม")).toBe("1,174.5 ลิตร");
  });

  it("ส่วนวงกลม: ครึ่งถังได้ครึ่งพอดี · ก้นถัง 0 · เต็มถังเท่าวงกลม", () => {
    expect(segmentArea(50, 50)).toBeCloseTo((Math.PI * 2500) / 2, 9);
    expect(segmentArea(50, 0)).toBe(0);
    expect(segmentArea(50, 100)).toBeCloseTo(Math.PI * 2500, 9);
    // สมมาตร: ระดับ h กับ D − h รวมกันเท่าวงกลมเต็ม
    expect(segmentArea(50, 30) + segmentArea(50, 70)).toBeCloseTo(Math.PI * 2500, 9);
  });

  it("ถังกลมตั้ง Ø 100 × สูง 130 = 1,021.0 ล. น้ำ 60 ซม. = 471.2 ล. · ถังเหลี่ยม 100×100×130 น้ำ 60 = 600 ล.", () => {
    // π × 50² × 130 ÷ 1000 = 1,021.018 · × 60 = 471.239 · ต่อ ซม. π × 2500 ÷ 1000 = 7.854
    const v = calcTankVolume({ shape: "vcyl", level: 60 });
    expect(rowOf(v, "ความจุเต็มถัง")).toBe("1,021.0 ลิตร (1.021 ลบ.ม.)");
    expect(rowOf(v, "น้ำที่ระดับ 60 ซม.")).toBe("471.2 ลิตร");
    expect(rowOf(v, "ที่ระดับนี้ น้ำขึ้น 1 ซม.")).toBe("7.85 ลิตร");
    expect(rowOf(calcTankVolume({ shape: "box", level: 60 }), "น้ำที่ระดับ 60 ซม.")).toBe("600.0 ลิตร");
  });

  it("ระดับน้ำสูงกว่าถังต้องตอบไม่ได้", () => {
    expect(calcTankVolume({ level: 101 }).invalid).toBe(true);
    expect(calcTankVolume({ shape: "vcyl", level: 130 }).invalid).toBeFalsy();
  });
});

describe("เทียบราคาต่อหน่วย", () => {
  it("ถังเล็ก 450 บาท/3.785 ล. = 118.89 · ถังใหญ่ 1,890/18.925 ล. = 99.87 บาท/ล. ถังเล็กแพงกว่า 19.0%", () => {
    // 450 ÷ 3.785 = 118.8904 · 1890 ÷ 18.925 = 99.8679 · 118.8904 ÷ 99.8679 = 1.190476 (= 2,250 ÷ 1,890)
    const r = calcUnitPrice({});
    expect(rowOf(r, "ถังเล็ก 1 แกลลอน (450 บาท / 3.785 ลิตร)")).toBe("118.89 บาท/ลิตร · แพงกว่า 19.0%");
    expect(rowOf(r, "ถังใหญ่ 5 แกลลอน (1,890 บาท / 18.925 ลิตร)")).toBe("99.87 บาท/ลิตร · ถูกสุด");
  });

  it("ต้องใช้ 20 ลิตร: ถังเล็ก 6 ถัง 2,700 บาท จ่ายน้อยกว่าถังใหญ่ 2 ถัง 3,780 บาท", () => {
    // ปัดขึ้น(20 ÷ 3.785) = 6 → 2,700 เหลือ 2.71 · ปัดขึ้น(20 ÷ 18.925) = 2 → 3,780 เหลือ 17.85
    const r = calcUnitPrice({});
    expect(r.headline).toBe("ถูกสุดต่อลิตร: ถังใหญ่ 5 แกลลอน 99.87 บาท/ลิตร · ซื้อ 20 ลิตร จ่ายน้อยสุด: ถังเล็ก 1 แกลลอน");
    expect(rowOf(r, "ต้องใช้ 20 ลิตร: ถังเล็ก 1 แกลลอน")).toBe("ซื้อ 6 แพ็ก = 2,700 บาท (เหลือ 2.71 ลิตร) · จ่ายน้อยสุด");
    expect(rowOf(r, "ต้องใช้ 20 ลิตร: ถังใหญ่ 5 แกลลอน")).toBe("ซื้อ 2 แพ็ก = 3,780 บาท (เหลือ 17.85 ลิตร)");
  });

  it("3 ตัวเลือก กระเบื้อง ตร.ม.: กล่อง 4 แผ่น × 0.36 = 1.44 ตร.ม. 450 บาท = 312.5 บาท/ตร.ม.", () => {
    // 450 ÷ 1.44 = 312.5 · แผ่นละ 85 ÷ 0.36 = 236.11 · 3: 2,000 ÷ (10 × 0.72 = 7.2) = 277.78
    // แพงกว่า: 312.5 ÷ 236.11 = 1.3235 → 32.4% · 277.78 ÷ 236.11 = 1.1765 → 17.6%
    const r = calcUnitPrice({
      n: "3", unit: "m2", need: 0,
      name1: "กล่อง", p1: 450, c1: 4, s1: 0.36,
      name2: "แผ่นเดี่ยว", p2: 85, c2: 1, s2: 0.36,
      name3: "พาเลท", p3: 2000, c3: 10, s3: 0.72,
    });
    expect(r.headline).toBe("ถูกสุดต่อตร.ม.: แผ่นเดี่ยว 236.11 บาท/ตร.ม.");
    expect(rowOf(r, "กล่อง (450 บาท / 1.44 ตร.ม.)")).toBe("312.50 บาท/ตร.ม. · แพงกว่า 32.4%");
    expect(rowOf(r, "พาเลท (2,000 บาท / 7.2 ตร.ม.)")).toBe("277.78 บาท/ตร.ม. · แพงกว่า 17.6%");
    expect(r.rows.some((x) => x.label.startsWith("ต้องใช้"))).toBe(false);
  });

  it("ราคาต่อหน่วยเท่ากันต้องบอกว่าเท่ากัน ไม่เลือกตัวใดตัวหนึ่งเป็นถูกสุด", () => {
    const r = calcUnitPrice({ p1: 100, c1: 1, s1: 1, p2: 500, c2: 1, s2: 5, need: 0 });
    expect(r.headline).toBe("ราคาต่อลิตรเท่ากันทุกตัว (100.00 บาท/ลิตร)");
    expect(r.rows.some((x) => x.value.includes("ถูกสุด"))).toBe(false);
  });
});

/* ═══════════════ ลงทะเบียน ═══════════════ */

describe("ลงทะเบียนเครื่องมือรอบ 4", () => {
  it("ทุกตัวอยู่ในสายงานเดิม ไม่มีภาพปกที่ชี้ไฟล์ไม่มีอยู่ และค่าตั้งต้นคิดได้", () => {
    for (const key of NEW_TOOLS) {
      const [tradeId, toolId] = key.split("/");
      const trade = TRADES.find((t) => t.id === tradeId);
      const tool = trade?.tools.find((t) => t.id === toolId);
      expect(tool, key).toBeDefined();
      expect(TOOLS_WITHOUT_COVER, key).toContain(key);
      expect(getToolCover(tradeId, toolId), key).toBeUndefined();
      const r = tool!.calc({});
      expect(r.invalid, key).toBeFalsy();
      expect(r.explain?.updatedAt, key).toBe("2026-11-26");
    }
  });

  it("ค้นด้วยคำช่างแล้วเจอ", () => {
    const find = (q: string) => searchCatalog(q).tools.map((t) => `${t.tradeId}/${t.id}`);
    expect(find("ไร่")).toContain("general/rai");
    expect(find("ฟิล์ม")).toContain("glass/film");
    expect(find("ค่าไฟ")).toContain("electrical/appliance");
    expect(find("ไม้แบบ")).toContain("concrete/formwork");
    expect(find("ลักซ์")).toContain("electrical/lux");
    expect(find("รถไฟฟ้า")).toContain("electrical/ev");
    expect(find("พัดลมดูดอากาศ")).toContain("hvac/fan");
    expect(find("ถังนอน")).toContain("general/tank");
    expect(find("เทียบราคา")).toContain("general/unitprice");
    expect(find("เมมเบรน")).toContain("waterproof/sheet");
  });

  it("ค่าคงที่ใหม่ที่เป็นค่าตลาดติดป้ายว่ายังไม่ยืนยัน", () => {
    for (const ref of [K.POWER_BILL.rate, K.LIGHTING.lumens, K.EV.efficiency, K.TANK_STAND.emptyKg, K.FORMWORK.battenPerM2, K.MEMBRANE_ROLL.primerLPerM2, K.WINDOW_FILM.rollL]) {
      expect(ref.source, ref.label).toContain("ยังไม่ยืนยัน");
    }
  });
});
