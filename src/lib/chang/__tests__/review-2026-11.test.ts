/**
 * ชุดทดสอบกันถอยหลังของรอบตรวจสูตร 2026-11-25
 * ค่าที่คาดหวังทุกตัวคิดมือ/คิดแยกด้วยสคริปต์อิสระ แล้วจดวิธีคิดไว้ในคอมเมนต์ของแต่ละข้อ
 */
import { describe, expect, it } from "vitest";

import * as K from "../constants";
import type { CalcResult } from "../types";
import { parseLengthList } from "../math";
import { breakerForBtu, calcBreaker, calcBtu, calcPt, calcShsc, hvacJob, satTemp } from "../tools/hvac";
import { calcBattery, calcCable, calcSolar, electricalJob, groupingFactor } from "../tools/electrical";
import { calcLintel, calcMix, masonryJob } from "../tools/masonry";
import { calcCut, calcSteelWeight } from "../tools/steel";
import { calcDrawer, calcScrew } from "../tools/handyman";
import { calcAluCut, calcWind, glassStress } from "../tools/glass";
import { calcRoofArea, calcRoofMaterial, roofJob } from "../tools/roof";
import { calcGypsum, calcHardware, calcTbar, screwsPerBoard } from "../tools/ceiling";
import { calcPaintQty, calcWallArea } from "../tools/paint";
import { calcGrout, calcTileQty } from "../tools/tile";
import { calcSlope, calcTank } from "../tools/plumbing";
import { calcAreaVol } from "../tools/general";

function rowOf(r: CalcResult, label: string): string {
  return r.rows.find((x) => x.label === label)?.value ?? "";
}

function rowStarting(r: CalcResult, prefix: string): string {
  return r.rows.find((x) => x.label.startsWith(prefix))?.value ?? "";
}

function numberIn(text: string): number {
  const match = text.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : NaN;
}

/** ผลที่ "ตอบไม่ได้" ต้องไม่มีแถวเน้น (ตัวเลขให้เอาไปสั่งของ) */
function expectBlocked(r: CalcResult, headline: RegExp) {
  expect(r.invalid).toBe(true);
  expect(r.headline ?? "").toMatch(headline);
  expect(r.rows.filter((x) => x.emphasize)).toHaveLength(0);
}

/* ─────────── HIGH 1: SH/SC ต้องไม่บอก "ดูโอเค" เมื่อค่าอันตราย ─────────── */

describe("SH/SC วินิจฉัย", () => {
  // R32: 120 psig อิ่มตัว ≈ 4.2 °C · 380 psig ≈ 43.9 °C (จากเส้นโค้งความดันไอ)
  const base = { kind: "R32", sucP: 120, sucT: 12, liqP: 380, liqT: 38 };

  it("ค่าตั้งต้น SH ≈ 7.8 / SC ≈ 5.8 °C อยู่ในช่วง จึงบอกว่าโอเคได้", () => {
    const r = calcShsc(base);
    expect(numberIn(rowOf(r, "Superheat"))).toBeCloseTo(7.8, 1);
    expect(numberIn(rowOf(r, "Subcooling"))).toBeCloseTo(5.8, 1);
    expect(r.headline).toMatch(/ดูโอเค/);
  });

  it("SH ใกล้ศูนย์ (ท่อดูด 4 °C → SH −0.2) ต้องเตือนน้ำยาเหลวไหลกลับ ไม่ใช่ดูโอเค", () => {
    const r = calcShsc({ ...base, sucT: 4 });
    expect(r.headline).not.toMatch(/ดูโอเค/);
    expect(r.headline).toMatch(/SH ต่ำมาก/);
    expect(r.headline).toMatch(/คอมเพรสเซอร์/);
  });

  it("SH ต่ำกว่าช่วง (ท่อดูด 7 °C → SH 2.8) ก็ต้องไม่บอกว่าโอเค", () => {
    const r = calcShsc({ ...base, sucT: 7 });
    expect(r.headline).not.toMatch(/ดูโอเค/);
  });

  it("SH สูงมาก (ท่อดูด 25 °C → SH 20.8) ต้องบอกว่า SH สูง", () => {
    const r = calcShsc({ ...base, sucT: 25 });
    expect(numberIn(rowOf(r, "Superheat"))).toBeCloseTo(20.8, 1);
    expect(r.headline).toMatch(/SH สูง/);
    expect(r.headline).not.toMatch(/ดูโอเค/);
  });

  it("SC ติดลบ (ท่อของเหลว 50 °C → SC −6.2) เป็นค่าที่เป็นไปไม่ได้ ต้องไม่วินิจฉัย", () => {
    const r = calcShsc({ ...base, liqT: 50 });
    expect(r.invalid).toBe(true);
    expect(r.headline).toMatch(/เป็นไปไม่ได้/);
    expect(r.headline).not.toMatch(/ดูโอเค/);
  });

  it("SH ติดลบมาก (ท่อดูด −5 °C) ก็เป็นค่าที่เป็นไปไม่ได้", () => {
    const r = calcShsc({ ...base, sucT: -5 });
    expect(r.invalid).toBe(true);
    expect(r.headline).toMatch(/เป็นไปไม่ได้/);
  });
});

/* ─────────── HIGH 2: ตาราง P–T ถึง 65 °C และไม่หนีบค่าปลายตาราง ─────────── */

describe("ตาราง P–T ช่วงแรงดันสูง", () => {
  it("R32 ที่ 520 psig ≈ 57 °C และ 556 psig ≈ 60 °C (เดิมหนีบไว้ที่ 50 °C)", () => {
    // ค่าอ้างอิง: R32 อิ่มตัว 55 °C = 495.9 psig · 60 °C = 555.9 psig · 65 °C = 621.4 psig
    expect(satTemp("R32", 520)).toBeCloseTo(57.0, 0);
    expect(satTemp("R32", 520)).toBeGreaterThan(56);
    expect(satTemp("R32", 520)).toBeLessThan(58);
    expect(satTemp("R32", 556)).toBeCloseTo(60.0, 1);
  });

  it("R410A ที่ 385 psig ≈ 45.5 °C · R22 ที่ 250 psig ≈ 47.3 °C · R134a ที่ 30 psig ≈ 1.4 °C", () => {
    expect(Math.abs(satTemp("R410A", 385) - 45.5)).toBeLessThan(0.3);
    expect(Math.abs(satTemp("R22", 250) - 47.3)).toBeLessThan(0.3);
    expect(Math.abs(satTemp("R134a", 30) - 1.4)).toBeLessThan(0.3);
  });

  it("ทุกตารางเรียงขึ้นทั้งแรงดันและอุณหภูมิ และ R32/R410A ครอบคลุมถึง 65 °C", () => {
    for (const [gas, table] of Object.entries(K.REFRIGERANT_PT)) {
      for (let i = 1; i < table.length; i++) {
        expect(table[i][0], `${gas} แถว ${i}`).toBeGreaterThan(table[i - 1][0]);
        expect(table[i][1], `${gas} แถว ${i}`).toBeGreaterThan(table[i - 1][1]);
      }
    }
    expect(K.REFRIGERANT_PT.R32.at(-1)?.[1]).toBe(65);
    expect(K.REFRIGERANT_PT.R410A.at(-1)?.[1]).toBe(65);
  });

  it("แรงดันเกินตารางต้องตอบว่าเกินช่วง ไม่คืนอุณหภูมิปลายตาราง", () => {
    expect(Number.isNaN(satTemp("R32", 700))).toBe(true);
    const r = calcPt({ kind: "R32", psi: 700 });
    expectBlocked(r, /เกินช่วงตาราง/);
    expect(r.headline).not.toMatch(/≈ 65|≈ 50/);
  });

  it("SH/SC ที่แรงดันด้านสูงเกินตารางต้องไม่วินิจฉัย", () => {
    const r = calcShsc({ kind: "R32", sucP: 120, sucT: 12, liqP: 700, liqT: 50 });
    expect(r.invalid).toBe(true);
    expect(r.headline).not.toMatch(/ดูโอเค/);
  });
});

/* ─────────── HIGH 3: เบรกเกอร์แอร์ต้องสอดคล้องกับตารางสายของช่างไฟ ─────────── */

describe("เบรกเกอร์ + สายแอร์", () => {
  it("ทุกขนาดแอร์ × ทุกวิธีเดินสาย: พิกัดสายในตารางต้องไม่ต่ำกว่าเบรกเกอร์", () => {
    for (const row of K.AC_BREAKER_TABLE) {
      for (const method of ["surface", "embed"] as const) {
        const pick = breakerForBtu(row.upTo, method);
        expect(pick, `${row.upTo} ${method}`).not.toBeNull();
        if (!pick) continue;
        const column = `${K.CABLE_METHODS[method].group}c2` as "g1c2" | "g2c2";
        const tableRow = K.CABLE_TABLE_5_20.find((x) => x.mm2 === pick.wire);
        expect(tableRow?.[column], `${row.upTo} ${method}`).toBe(pick.ampacity);
        expect(pick.ampacity, `${row.upTo} ${method}`).toBeGreaterThanOrEqual(pick.breaker);
        expect(pick.breaker, `${row.upTo} ${method}`).toBeGreaterThan(pick.amp);
      }
    }
  });

  it("18,000 BTU ท่อเกาะผนัง/ฝังผนังอิฐ-ปูน: 20 A + 2.5 ตร.มม. (ตาราง 21 A ≥ 20 A) และบอกวิธีเดินสาย", () => {
    const r = calcBreaker({ btu: 18000 });
    expect(rowOf(r, "เบรกเกอร์")).toBe("20 A");
    expect(rowOf(r, "สายไฟ (ทองแดง)")).toBe("2.5 ตร.มม.");
    expect(rowOf(r, "สายทนได้ตามตาราง")).toMatch(/^21 A/);
    expect(rowOf(r, "วิธีเดินสายที่คิด")).toMatch(/ฝังผนังอิฐ-ปูน/);
    expect(r.explain?.risk).toBe("C");
  });

  it("18,000 BTU ท่อในฝ้า/ผนังมีฉนวน: 2.5 ตร.มม. ทนแค่ 17 A < 20 A จึงต้องขยับเป็น 4 ตร.มม. (23 A)", () => {
    const r = calcBreaker({ btu: 18000, method: "embed" });
    expect(rowOf(r, "เบรกเกอร์")).toBe("20 A");
    expect(rowOf(r, "สายไฟ (ทองแดง)")).toBe("4 ตร.มม.");
    expect(rowOf(r, "สายทนได้ตามตาราง")).toMatch(/^23 A/);
  });

  it("แอร์ใหญ่กว่าแถวบนสุดของตาราง (60,000 BTU) ต้องตอบว่าเกินตาราง ไม่ยืมแถว 36,000", () => {
    expect(breakerForBtu(60000)).toBeNull();
    expectBlocked(calcBreaker({ btu: 60000 }), /เกินตาราง/);
  });

  it("ผลเบรกเกอร์แอร์ตรงกับเครื่องมือเลือกสายของช่างไฟที่กระแสเดียวกัน", () => {
    // 24,000 BTU ≈ 13 A → ช่างไฟ: 13 × 1.25 = 16.25 → เบรกเกอร์ 20 A → ท่อเกาะผนัง 2.5 ตร.มม. (21 A)
    // ตารางแอร์ตั้งขั้นต่ำ 4 ตร.มม. ไว้เผื่อกระแสสตาร์ต จึงต้องไม่เล็กกว่าผลของช่างไฟ
    const ac = breakerForBtu(24000);
    const cable = calcCable({ mode: "amp", il: 13, method: "surface", temp: 40, circ: 1 });
    expect(ac?.breaker).toBe(20);
    expect(ac?.wire).toBeGreaterThanOrEqual(numberIn(rowOf(cable, "ขนาดสายแนะนำ")));
  });
});

/* ─────────── HIGH 4: โซลาร์คืนทุน ─────────── */

describe("โซลาร์คืนทุน", () => {
  it("ค่าตั้งต้น: 9 แผง = 4.05 kWp × 35,000 = 141,750 บาท · เซฟ 1,680 บาท/เดือน · คืนทุน ≈ 7.0 ปี", () => {
    // ต้องการ 400 ÷ (4.5 × 30 × 0.8) = 3.70 kWp → 9 แผง 450 W = 4.05 kWp
    // ผลิตได้ 4.05 × 4.5 × 30 × 0.8 = 437 หน่วย > ใช้ 400 → เซฟ 400 × 4.2 = 1,680 บาท/เดือน
    // 141,750 ÷ 1,680 = 84.4 เดือน = 7.0 ปี (เดิมตอบ 26.8 เดือน เพราะตั้งราคาชุดไว้ 45,000 บาท)
    const r = calcSolar({});
    expect(rowOf(r, "จำนวนแผง")).toMatch(/^9 แผง/);
    expect(numberIn(rowOf(r, "ราคาชุดโดยประมาณ"))).toBe(141750);
    expect(numberIn(rowOf(r, "เซฟค่าไฟ/เดือน"))).toBe(1680);
    expect(numberIn(rowOf(r, "คืนทุนคร่าว"))).toBeCloseTo(7.0, 1);
    expect(r.headline).toMatch(/7\.0 ปี/);
  });

  it("ราคาต่อ kWp ตั้งต้นอยู่ในช่วงตลาดจริงและบอกที่มา", () => {
    expect(K.SOLAR.pricePerKwp.value).toBeGreaterThanOrEqual(25000);
    expect(K.SOLAR.pricePerKwp.value).toBeLessThanOrEqual(45000);
    expect(K.SOLAR.pricePerKwp.source).toBeTruthy();
  });

  it("ค่าไฟ 0 บาทต้องไม่โชว์คืนทุน 0.0 เดือน", () => {
    const r = calcSolar({ rate: 0 });
    expect(r.invalid).toBe(true);
    expect(`${r.headline} ${r.rows.map((x) => x.value).join(" ")}`).not.toMatch(/0\.0 (เดือน|ปี)/);
  });
});

/* ─────────── HIGH 5: ส่วนผสมคอนกรีต ─────────── */

describe("ส่วนผสมคอนกรีต 1:2:4", () => {
  it("1 ลบ.ม. ใช้ปูน ≈ 6.3 ถุง (ซื้อ 7) ทราย 0.44 หิน 0.88 ลบ.ม.", () => {
    // ปริมาตรแห้ง 1 × 1.54 = 1.54 ลบ.ม. → ปูน 1.54 × 1/7 = 0.22 ลบ.ม. × 1,440 = 316.8 กก. = 6.34 ถุง
    // ทราย 1.54 × 2/7 = 0.44 · หิน 1.54 × 4/7 = 0.88 ลบ.ม.
    const r = calcMix({ m3: 1, ratio: "124" });
    expect(rowOf(r, "ปูนซีเมนต์ (ถุง 50 กก.)")).toBe("7 ถุง (คิดได้ 6.3 ถุง)");
    expect(numberIn(rowOf(r, "ทราย"))).toBeCloseTo(0.44, 2);
    expect(numberIn(rowOf(r, "หิน"))).toBeCloseTo(0.88, 2);
    expect(K.MIX.dryVolume.value).toBe(1.54);
  });

  it("3 ลบ.ม. ใช้ปูน 20 ถุง (เดิมตอบ 13 ถุง ขาดไปหนึ่งในสาม)", () => {
    // 3 × 1.54 ÷ 7 × 1,440 = 950.4 กก. = 19.0 ถุง → ปัดขึ้น 20
    expect(rowOf(calcMix({ m3: 3, ratio: "124" }), "ปูนซีเมนต์ (ถุง 50 กก.)")).toMatch(/^20 ถุง/);
  });
});

/* ─────────── HIGH 6: ตารางเหล็กรูปพรรณ ─────────── */

describe("ตารางน้ำหนักเหล็กรูปพรรณ", () => {
  const RHO = 7850;

  it("H 400×200×8×13 = 66.0 กก./ม. · ยาว 6 ม. = 396.0 กก. (เดิม 56.6 → 339.6)", () => {
    const r = calcSteelWeight({ shape: "h", hsize: "400x200", len: 6, qty: 1 });
    expect(numberIn(rowOf(r, "กก./ม."))).toBe(66);
    expect(numberIn(rowOf(r, "น้ำหนักรวม"))).toBe(396);
  });

  it("H และ W ทุกแถวตรงกับน้ำหนักที่คิดจากมิติหน้าตัดไม่เกิน ±1%", () => {
    // พื้นที่หน้าตัด = 2·B·t2 + (H − 2·t2)·t1 + (4 − π)·r²
    for (const [name, s] of [...Object.entries(K.STEEL_H_BEAM), ...Object.entries(K.STEEL_W_BEAM)]) {
      const area = 2 * s.b * s.t2 + (s.h - 2 * s.t2) * s.t1 + (4 - Math.PI) * s.r * s.r;
      const kgm = (area / 1e6) * RHO;
      expect(Math.abs(s.kgm - kgm) / kgm, `${name}: ตาราง ${s.kgm} เรขาคณิต ${kgm.toFixed(2)}`).toBeLessThan(0.01);
    }
  });

  it("รางน้ำทุกแถวตรงกับน้ำหนักที่คิดจากมิติหน้าตัดไม่เกิน ±1%", () => {
    // พื้นที่หน้าตัด = H·t1 + 2·(B − t1)·t2 + 2·(1 − π/4)·(r1² − r2²)
    for (const [name, s] of Object.entries(K.STEEL_CHANNEL)) {
      const area = s.h * s.t1 + 2 * (s.b - s.t1) * s.t2 + 2 * (1 - Math.PI / 4) * (s.r1 * s.r1 - s.r2 * s.r2);
      const kgm = (area / 1e6) * RHO;
      expect(Math.abs(s.kgm - kgm) / kgm, `C${name}: ตาราง ${s.kgm} เรขาคณิต ${kgm.toFixed(2)}`).toBeLessThan(0.01);
    }
  });

  it("รางน้ำ 100×50×5×7.5 = 9.36 กก./ม.", () => {
    const r = calcSteelWeight({ shape: "c", csize: "100", len: 6, qty: 1 });
    expect(numberIn(rowOf(r, "กก./ม."))).toBe(9.36);
  });

  it("ท่อที่หนาเกินครึ่งของ Ø นอก ต้องไม่ให้น้ำหนัก", () => {
    expectBlocked(calcSteelWeight({ shape: "pipe", od: 48.3, t: 30, len: 6, qty: 1 }), /ท่อหนา/);
  });
});

/* ─────────── HIGH 7: พุก ─────────── */

describe("พุก + สกรู มีเพดานต่อจุด", () => {
  it("คอนกรีต 100 กก. 2 จุด (50 กก./จุด) ยังตอบพุกเหล็กได้ เป็นชั้น C", () => {
    const r = calcScrew({ wall: "conc", load: 100, points: 2 });
    expect(r.invalid).toBeFalsy();
    expect(r.headline).toMatch(/พุกเหล็ก/);
    expect(r.explain?.risk).toBe("C");
  });

  it("คอนกรีต 150 กก. 2 จุด (75 กก./จุด) เกินเพดาน 50 ต้องส่งต่อวิศวกร/ตารางผู้ผลิต", () => {
    expectBlocked(calcScrew({ wall: "conc", load: 150, points: 2 }), /วิศวกร.*ผู้ผลิต|ผู้ผลิต.*วิศวกร/);
  });

  it("ไม้ 80 กก. 2 จุด (40 กก./จุด) ต้องหลายตัว + แผ่นรับ · 120 กก. 2 จุด (60) ต้องไม่ตอบ", () => {
    expect(calcScrew({ wall: "wood", load: 80, points: 2 }).headline).toMatch(/แผ่นรับ/);
    expectBlocked(calcScrew({ wall: "wood", load: 120, points: 2 }), /เกินที่ตอบได้/);
  });

  it("ยิปซัมและอิฐเกินพิกัดยังต้องบล็อกเหมือนเดิม", () => {
    expectBlocked(calcScrew({ wall: "gyp", load: 40, points: 2 }), /ยิปซัม/);
    expectBlocked(calcScrew({ wall: "brick", load: 80, points: 2 }), /อิฐ/);
  });

  it("ทุกผนังที่ตอบได้ต้องเป็นชั้น C เสมอ", () => {
    for (const wall of ["conc", "brick", "gyp", "wood"]) {
      const r = calcScrew({ wall, load: 10, points: 2 });
      expect(r.invalid, wall).toBeFalsy();
      expect(r.explain?.risk, wall).toBe("C");
    }
  });
});

/* ─────────── HIGH 8: ทับหลัง ─────────── */

describe("ทับหลังช่องเปิดกว้าง", () => {
  it("ช่องเปิด 2.5 ม. ต้องไม่ให้ตัวเลขเหล็ก และบอกให้วิศวกรออกแบบ", () => {
    const r = calcLintel({ n: 2, width: 2.5 });
    expectBlocked(r, /วิศวกร/);
    expect(r.rows.some((x) => x.label.includes("เหล็ก"))).toBe(false);
  });

  it("ช่องเปิด 2.0 ม. ยังคิดให้ได้", () => {
    const r = calcLintel({ n: 2, width: 2 });
    expect(r.invalid).toBeFalsy();
    expect(rowOf(r, "ความยาว/ชุด")).toMatch(/^2\.40 ม\./);
  });

  it("หน้าคิดทั้งงานก่อฉาบที่มีช่องเปิดกว้างเกิน ต้องตอบไม่ได้ทั้งงาน", () => {
    const r = masonryJob.calc({ w: 4, h: 3, open: 0, sides: 2, n: 1, width: 3 });
    expectBlocked(r, /วิศวกร/);
  });
});

/* ─────────── HIGH 9: ความหนากระจกรับแรงลม ─────────── */

describe("แรงลม + ความหนากระจก", () => {
  it("ค่าตั้งต้น 1.2×1.5 ม. ลม 25 ม./วินาที ได้ 6 มม. (หน่วยแรง ≈ 5.9 MPa)", () => {
    // q = 0.6 × 25² = 375 N/ตร.ม. · อัตราส่วน 1.25 → β = 0.3954 · σ = 0.3954 × 375e-6 × 1200² ÷ 6² = 5.93 MPa
    const r = calcWind({});
    expect(rowOf(r, "ความหนากระจกขั้นต่ำ")).toBe("6 มม.");
    expect(glassStress(1.2, 1.5, 375, 6)).toBeCloseTo(5.93, 2);
  });

  it("2.4×2.4 ม. ลม 44 ม./วินาที: ตารางเดิมให้ 10 มม. (19.2 MPa เกิน 15) จึงต้องเป็น 12 มม.", () => {
    // q = 0.6 × 44² = 1,161.6 · β = 0.2874 · σ(10) = 0.2874 × 1161.6e-6 × 2400² ÷ 100 = 19.2 · σ(12) = 13.4 MPa
    expect(glassStress(2.4, 2.4, 1161.6, 10)).toBeCloseTo(19.23, 1);
    expect(glassStress(2.4, 2.4, 1161.6, 12)).toBeCloseTo(13.35, 1);
    expect(rowOf(calcWind({ w: 2.4, h: 2.4, wind: 44 }), "ความหนากระจกขั้นต่ำ")).toBe("12 มม.");
  });

  it("3×3 ม. ลม 45 ม./วินาที: 12 มม. ยังเกิน (21.8 MPa) ต้องส่งต่อวิศวกร ไม่ให้ตัวเลขความหนา", () => {
    const r = calcWind({ w: 3, h: 3, wind: 45 });
    expectBlocked(r, /วิศวกร/);
    expect(r.rows.some((x) => x.label.includes("ความหนากระจกขั้นต่ำ"))).toBe(false);
  });

  it("บานยาวเกิน 3 ม. หรือลมเกิน 45 ม./วินาที อยู่นอกตาราง ต้องส่งต่อวิศวกร", () => {
    expectBlocked(calcWind({ w: 5, h: 3, wind: 25 }), /เกินตารางหน้างาน/);
    expectBlocked(calcWind({ w: 1.2, h: 1.5, wind: 60 }), /เกินตารางหน้างาน/);
  });

  it("ในช่วงตาราง ความหนาไม่มีทางบางกว่าตารางเดิม และหน่วยแรงไม่เกินค่าที่ยอมให้", () => {
    for (const w of [0.6, 1.2, 1.8, 2.4, 3]) {
      for (const h of [0.6, 1.5, 2.2, 3]) {
        for (const wind of [20, 30, 38, 45]) {
          const r = calcWind({ w, h, wind });
          if (r.invalid) continue;
          const t = numberIn(rowOf(r, "ความหนากระจกขั้นต่ำ"));
          const span = Math.max(w, h);
          let legacy = 6;
          if (wind >= 30 || span > 1.5) legacy = 8;
          if (wind >= 35 || span > 2) legacy = 10;
          if (span > 2.4) legacy = 12;
          expect(t, `${w}×${h}@${wind}`).toBeGreaterThanOrEqual(legacy);
          const stress = glassStress(Math.min(w, h), span, 0.6 * wind * wind, t);
          expect(stress, `${w}×${h}@${wind}`).toBeLessThanOrEqual(K.GLASS_WIND.allowStress.value);
        }
      }
    }
  });
});

/* ─────────── MEDIUM ─────────── */

describe("หลังคา", () => {
  it("เมทัลชีทนับเป็นแถว: 8×12 ม. ชัน 30% จั่ว แผ่นคลุม 0.7 ม. ได้ 36 แผ่น (เผื่อ 10% = 40) ไม่ใช่ 27", () => {
    // แนวลาดต่อด้าน = 4 × √(1 + 0.3²) = 4.18 ม. ≤ แผ่น 6 ม. → 1 แผ่น/แถว
    // แถว = ปัดขึ้น(12 ÷ 0.7) = 18 → 2 ด้าน × 18 × 1 = 36 แผ่น → × 1.1 = 39.6 → 40
    const r = calcRoofMaterial({ kind: "metal" });
    expect(rowOf(r, "นับตามแถว")).toBe("36 แผ่น");
    expect(rowStarting(r, "จำนวนแผ่น")).toBe("40 แผ่น");
    expect(rowStarting(calcRoofMaterial({ kind: "metal", waste: 0 }), "จำนวนแผ่น")).toBe("36 แผ่น");
  });

  it("แนวลาดยาวกว่าแผ่นต้องต่อซ้อนปลาย: เพิง 8 ม. แผ่น 4 ม. ได้ 3 แผ่น/แถว = 54 แผ่น", () => {
    // แนวลาด 8 × 1.044 = 8.35 ม. → ปัดขึ้น((8.35 − 0.2) ÷ (4 − 0.2)) = 3 · แถว 18 → 54
    const r = calcRoofMaterial({ kind: "metal", shape: "lean", w: 8, l: 12, sheetLen: 4, waste: 0 });
    expect(rowOf(r, "นับตามแถว")).toBe("54 แผ่น");
  });

  it("หน้าคิดทั้งงาน: กว้างคลุม 0 ต้องไม่ได้ Infinity แผ่น", () => {
    const r = roofJob.calc({ w: 8, l: 12, pitch: 30, pitchUnit: "pct", waste: 10, kind: "metal", coverW: 0, sheetLen: 6 });
    expect(r.invalid).toBe(true);
    expect(JSON.stringify(r)).not.toMatch(/Infinity|∞|NaN/);
  });

  it("ความชันเกิน 60° ต้องไม่คิดพื้นที่ (89° เดิมได้พื้นที่ 57 เท่าของแปลน)", () => {
    expectBlocked(calcRoofArea({ pitch: 80, pitchUnit: "deg" }), /ชันเกิน/);
    expectBlocked(calcRoofArea({ pitch: 300, pitchUnit: "pct" }), /ค่าที่กรอก|ชันเกิน/);
    expect(calcRoofArea({ pitch: 45, pitchUnit: "deg" }).invalid).toBeFalsy();
  });
});

describe("ตัวอ่านรายการความยาว + แผนตัดเหล็ก", () => {
  it('"1,200 800" คือ 1200 กับ 800 ไม่ใช่ 1, 200, 800', () => {
    expect(parseLengthList("1,200 800").values).toEqual([1200, 800]);
  });

  it('"900,800,700" บนเส้น 6,000 คือสามชิ้น ไม่ใช่ 900,800 ชิ้นเดียว', () => {
    expect(parseLengthList("900,800,700", 6000).values).toEqual([900, 800, 700]);
    expect(parseLengthList("1500, 1500, 1200, 900", 6000).values).toEqual([1500, 1500, 1200, 900]);
  });

  it("ชิ้นที่อ่านไม่ออกต้องรายงาน ไม่ทิ้งเงียบ", () => {
    expect(parseLengthList("1200, abc; -5 800")).toEqual({ values: [1200, 800], dropped: ["abc", "-5"] });
    const r = calcCut({ parts: "1200, abc, 800", stock: 6000, kerf: 3 });
    expect(r.headline).toMatch(/ข้าม 1 รายการ/);
    expect(rowStarting(r, "อ่านไม่ออก")).toBe("abc");
  });

  it("มีชิ้นยาวกว่าเส้นวัตถุดิบ ต้องขึ้นหัวผลลัพธ์และไม่ให้แผนตัด", () => {
    const r = calcCut({ parts: "7000, 800", stock: 6000, kerf: 3 });
    expect(r.invalid).toBe(true);
    expect(r.headline).toMatch(/ยาวกว่าเส้นวัตถุดิบ/);
    expect(rowOf(r, "ชิ้นที่ยาวเกินเส้น")).toBe("7,000 มม.");
    expect(r.rows.some((x) => x.label.startsWith("เส้นที่") || x.label === "เส้นวัตถุดิบ")).toBe(false);
  });
});

describe("ฝ้า", () => {
  it("สกรูยิปซัมต่อแผ่นคิดจากระยะโครงและระยะสกรู: 7 แนว × 6 ตัว = 42 (เดิม 18)", () => {
    // แผ่นยาว 2.4 ม. โครงทุก 0.4 ม. → 7 แนว · กว้าง 1.2 ม. สกรูทุก 0.25 ม. → 6 ตัว/แนว
    expect(screwsPerBoard()).toBe(42);
    // ห้อง 4×5 = 20 ตร.ม. ÷ 2.88 = 6.94 → 7 แผ่น × 42 = 294 ตัว
    expect(numberIn(rowOf(calcHardware({ w: 4, l: 5 }), "สกรูยิปซัม"))).toBe(294);
  });

  it("ทีบาร์ 60×60 ห้อง 4×5 ม. โครงรวม ≈ 67 ม. (Main 16.7 + Cross 1.2 ม. 33.3 + Cross 0.6 ม. 16.7)", () => {
    const r = calcTbar({ w: 4, l: 5, tile: "60" });
    expect(numberIn(rowOf(r, "Cross tee 0.6 ม. ประมาณ"))).toBe(17);
    expect(numberIn(rowOf(r, "โครงทีบาร์รวมประมาณ"))).toBe(67);
    // แผ่น 60×120 ไม่ต้องมี Cross tee 0.6 ม. → รวม 50 ม.
    const big = calcTbar({ w: 4, l: 5, tile: "120" });
    expect(numberIn(rowOf(big, "โครงทีบาร์รวมประมาณ"))).toBe(50);
    expect(big.rows.some((x) => x.label.includes("0.6"))).toBe(false);
  });

  it("ฝ้าฉาบเรียบต้องมีโครงหลัก (เคร่าบน) ด้วย: 20 ตร.ม. ÷ 1.2 × 1.05 = 17.5 → 18 ม.", () => {
    const r = calcGypsum({ w: 4, l: 5 });
    expect(numberIn(rowStarting(r, "โครง C-Line บน"))).toBe(18);
    expect(numberIn(rowStarting(r, "โครง C-Line ล่าง"))).toBe(53);
  });
});

describe("ไฟฟ้า: ตัวคูณกลุ่มวงจรและแบตเตอรี่", () => {
  it("เกิน 9 วงจรต้องลดพิกัดต่อ ไม่ค้างที่ 0.50", () => {
    expect(groupingFactor(9)).toBe(0.5);
    expect(groupingFactor(12)).toBe(0.45);
    expect(groupingFactor(16)).toBe(0.41);
    expect(groupingFactor(20)).toBe(0.38);
    expect(groupingFactor(21)).toBeNull();
  });

  it("15 A 20 วงจร: 20 ÷ 0.38 = 52.6 A → 16 ตร.มม. (เดิมใช้ 0.50 ได้ 10 ตร.มม.)", () => {
    const r = calcCable({ mode: "amp", il: 15, method: "surface", temp: 40, circ: 20 });
    expect(rowOf(r, "ขนาดสายแนะนำ")).toBe("16 ตร.มม.");
    expect(calcCable({ mode: "amp", il: 15, method: "surface", temp: 40, circ: 21 }).invalid).toBe(true);
  });

  it("DoD เกิน 100% ต้องไม่ผ่าน", () => {
    expect(calcBattery({ dod: 150 }).invalid).toBe(true);
    // ค่าตั้งต้น 2,000 Wh ÷ (0.8 × 0.9) = 2,778 Wh ÷ 24 V = 116 Ah
    expect(rowOf(calcBattery({}), "ความจุ")).toMatch(/^116 Ah/);
  });

  it("หน้าคิดทั้งงานไฟ: โหลดเกินตารางต้องไม่ผ่านเป็นผลสำเร็จ", () => {
    const r = electricalJob.calc({ il: 380, temp: 40, circ: 1, len: 25, volts: 220, method: "surface", phase: "1" });
    expect(r.invalid).toBe(true);
  });
});

describe("หัวผลลัพธ์ต้องไม่แนะนำของที่ไม่พอ", () => {
  it("BTU เกิน 48,000 ต้องไม่ขึ้นหัวว่าแนะนำ 48,000", () => {
    // 10 × 12 ม. = 120 ตร.ม. × 800 = 96,000 BTU
    const r = calcBtu({ w: 10, l: 12, h: 2.6 });
    expect(r.headline).toMatch(/เกินแอร์ตัวเดียว/);
    expect(r.headline).not.toMatch(/แนะนำ 48,000/);
    expect(r.rows.some((x) => x.label === "ขนาดแอร์แนะนำ")).toBe(false);
  });

  it("หน้าคิดทั้งงานแอร์ห้องใหญ่เกินตัวเดียว ต้องไม่คิดสายไฟ/ค่าไฟจากเครื่อง 48,000", () => {
    const r = hvacJob.calc({ w: 20, l: 20 });
    expect(r.headline).toMatch(/เกินแอร์ตัวเดียว/);
    expect(r.rows.some((x) => x.label === "เบรกเกอร์")).toBe(false);
  });

  it("ถังน้ำเกินใบใหญ่สุดต้องบอกในหัวผลลัพธ์", () => {
    expect(calcTank({ people: 50 }).headline).toMatch(/เกินถังใบเดียว/);
  });

  it("ท่อระบายลาด 1:100 เป็นค่าที่ใช้ได้ ต้องไม่ตกโซนแดง", () => {
    const chart = calcSlope({ len: 8, ratio: "100" }).chart;
    expect(chart?.kind).toBe("threshold");
    if (chart?.kind !== "threshold") return;
    const zone = chart.zones.find((z) => chart.value <= z.upTo);
    expect(zone?.tone).not.toBe("bad");
  });
});

describe("งานสีและกระเบื้อง", () => {
  it("จัดถังสี: 5 แกลลอน = 1 ถังใหญ่ · 10 แกลลอน = 2 ถังใหญ่ ไม่มี '+ 0 แกลลอน' หรือ '+ 5 แกลลอน'", () => {
    // 160 ตร.ม. × 1 เที่ยว ÷ 32 = 5.00 แกลลอน · × 2 เที่ยว ÷ 32 = 10.00 แกลลอน
    const r = calcPaintQty({ area: 160, covP: 32, coatsP: 1, covT: 32, coatsT: 2 });
    expect(rowOf(r, "สั่งรองพื้น")).toBe("1 ถังใหญ่");
    expect(rowOf(r, "สั่งทับหน้า")).toBe("2 ถังใหญ่");
    // 152 ตร.ม. × 2 ÷ 32 = 9.5 แกลลอน → ปัดเป็น 10 = 2 ถังใหญ่ (เดิมตอบ 1 ถังใหญ่ + 5 แกลลอน)
    expect(rowOf(calcPaintQty({ area: 152, covP: 32, coatsP: 1, covT: 32, coatsT: 2 }), "สั่งทับหน้า")).toBe("2 ถังใหญ่");
    // 6.2 แกลลอน → 1 ถังใหญ่ + 2 แกลลอน
    expect(rowOf(calcPaintQty({ area: 99.2, covP: 32, coatsP: 1, covT: 32, coatsT: 2 }), "สั่งทับหน้า")).toBe("1 ถังใหญ่ + 2 แกลลอน");
  });

  it("ประตู-หน้าต่างมากกว่าผนังต้องไม่ตอบ 0 แกลลอนเงียบ ๆ", () => {
    expectBlocked(calcWallArea({ l: 1, w: 1, h: 2, doors: 10, windows: 0 }), /มากกว่าผนัง/);
  });

  it("หักพื้นที่ไม่ปูมากกว่าห้องต้องไม่ตอบ 0 แผ่น", () => {
    expectBlocked(calcTileQty({ w: 4, l: 5, deduct: 25 }), /ไม่เหลือพื้นที่/);
  });

  it("สูตรยาแนวแสดงความยาวร่องเป็น ม./ตร.ม. (60×60 = 3.33 ม./ตร.ม.)", () => {
    const step = calcGrout({ w: 4, l: 5, size: "60" }).explain?.steps[0];
    expect(step?.subst).toMatch(/3\.33 ม\.\/ตร\.ม\./);
    expect(step?.subst).not.toMatch(/ตร\.มม\./);
  });
});

describe("เบ็ดเตล็ด", () => {
  it("แปลงพื้นที่ต้องบอกหน่วยทั้งสองฝั่ง: 1 ตร.ม. = 10.7639 ตร.ฟุต", () => {
    const r = calcAreaVol({ x: 1, kind: "area", fromArea: "m2", toArea: "ft2" });
    expect(r.headline).toBe("1.0000 ตร.ม. = 10.7639 ตร.ฟุต");
  });

  it("แบ่งลิ้นชักจนหน้าบานเตี้ยกว่า 50 มม. ต้องไม่ให้ตัวเลข", () => {
    // (300 − 3 × 11) ÷ 12 = 22.3 มม.
    expectBlocked(calcDrawer({ opening: 300, n: 12, gap: 3 }), /เตี้ยเกิน/);
  });

  it("ตัดชน 90° ที่หักเฟรมแล้วไม่เหลือความสูง ต้องไม่ให้ระยะตัด", () => {
    expectBlocked(calcAluCut({ w: 1200, h: 200, n: 1, profile: 100, miter: "90" }), /ไม่เหลือความสูง/);
  });
});
