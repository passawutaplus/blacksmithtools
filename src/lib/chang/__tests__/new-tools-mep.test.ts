/**
 * เครื่องมือใหม่รอบ 3 (งานระบบ + หลังคา) 2026-11-25 — ยึดค่าตัวอย่างที่คิดด้วยมือ
 * ทุกเลขคิดแยกด้วยสคริปต์อิสระ (python3 -I) แล้วจดวิธีคิดไว้ในคอมเมนต์ของแต่ละเคส
 */
import { describe, expect, it } from "vitest";

import * as K from "../constants";
import { searchCatalog } from "../catalog";
import type { CalcResult } from "../types";
import { calcConduit, conduitFillLimit, maxWiresIn, thwArea } from "../tools/electrical";
import { calcAcKit, calcPipe, copperSizeFor } from "../tools/hvac";
import { calcFittings, calcHomePump, calcPressureTank, calcPump, homeHead, plumbingJob, pumpPower } from "../tools/plumbing";
import { calcMetalKit, calcRoofMaterial } from "../tools/roof";

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

/* ═══════════════ ไฟฟ้า: จำนวนสายในท่อ ═══════════════ */

describe("จำนวนสายในท่อ", () => {
  it("ท่อ EMT 4 หุน (1/2\") ใส่สาย THW 2.5 ตร.มม. ได้ 6 เส้น", () => {
    // ท่อ: π/4 × 15.80² = 196.07 ตร.มม. · สาย: π/4 × 4.0² = 12.566 ตร.มม.
    // 196.07 × 40% = 78.43 ÷ 12.566 = 6.24 → 6 เส้น · เต็ม 6 × 12.566 ÷ 196.07 = 38.5%
    const r = calcConduit({ mode: "max", kind: "emt", size: "0.5", wire: "2.5" });
    expect(r.invalid).toBeFalsy();
    expect(r.headline).toBe('ท่อ 4 หุน (1/2") ใส่สาย 2.5 ตร.มม. ได้ 6 เส้น');
    expect(numberIn(rowOf(r, "ใส่ได้สูงสุด"))).toBe(6);
    expect(numberIn(rowOf(r, "สายเต็มท่อ"))).toBe(38.5);
    // 6 เส้น = 3 วงจร 1 เฟส → ตัวคูณกลุ่ม 0.70 จากตารางเดียวกับเครื่องมือเลือกสาย
    expect(rowStarting(r, "ลดพิกัดสาย")).toContain("0.7");
    expect(r.explain?.risk).toBe("B");
    expect(r.explain?.caveats?.join(" ")).toContain("ตรวจกับ วสท. ฉบับจริง");
  });

  it("สายใหญ่ในท่อเล็ก ถอยไปใช้เกณฑ์ 1 เส้น 53%: สาย 16 ในท่อ 4 หุน ได้ 1 เส้น", () => {
    // สาย 16: π/4 × 7.8² = 47.78 · 40%: 78.43 ÷ 47.78 = 1.64 (ไม่ถึง 3)
    // 2 เส้น: 95.57 > 31% × 196.07 = 60.78 ไม่ผ่าน · 1 เส้น: 47.78 ≤ 53% × 196.07 = 103.9 ผ่าน
    expect(maxWiresIn(Math.PI / 4 * 15.8 ** 2, thwArea(16).area)).toBe(1);
    expect(numberIn(rowOf(calcConduit({ wire: "16" }), "ใส่ได้สูงสุด"))).toBe(1);
  });

  it("เกณฑ์ตามจำนวนเส้น 53 / 31 / 40%", () => {
    expect(conduitFillLimit(1).value).toBe(53);
    expect(conduitFillLimit(2).value).toBe(31);
    expect(conduitFillLimit(3).value).toBe(40);
    expect(conduitFillLimit(20).value).toBe(40);
  });

  it("ย้อนกลับ: สาย 2.5 × 9 เส้น ต้องใช้ท่อ 6 หุน (3/4\")", () => {
    // 9 × 12.566 = 113.10 ตร.มม. · ท่อ 4 หุน รับได้ 78.43 (ไม่พอ) · 6 หุน π/4 × 20.93² × 40% = 137.62 (พอ)
    // เต็ม 113.10 ÷ 344.06 = 32.9%
    const r = calcConduit({ mode: "min", kind: "emt", wire: "2.5", n: 6, wire2: "2.5", n2: 3 });
    expect(r.headline).toBe('ใช้ท่อ 6 หุน (3/4") ขึ้นไป');
    expect(numberIn(rowOf(r, "สายเต็มท่อ"))).toBe(32.9);
    expect(r.chart?.kind).toBe("steps");
  });

  it("ย้อนกลับแบบสองขนาด: 4 × 2.5 + 2 × 1.5 ใส่ท่อ 4 หุนได้", () => {
    // 4 × 12.566 + 2 × π/4 × 3.3² (8.553) = 67.37 ≤ 78.43 → 4 หุน · เต็ม 34.4%
    const r = calcConduit({ mode: "min", wire: "2.5", n: 4, wire2: "1.5", n2: 2 });
    expect(r.headline).toBe('ใช้ท่อ 4 หุน (1/2") ขึ้นไป');
    expect(numberIn(rowOf(r, "สายเต็มท่อ"))).toBe(34.4);
  });

  it("สายเกินท่อใหญ่สุด หรือท่อวัดเองเล็กเกิน ต้องตอบว่าไม่ได้ ไม่หนีบค่า", () => {
    expect(calcConduit({ mode: "min", wire: "16", n: 60 }).invalid).toBe(true);
    const tiny = calcConduit({ kind: "custom", idMm: 8, wire: "16" });
    expect(tiny.invalid).toBe(true);
    expect(tiny.headline).toContain("ใส่ไม่ได้สักเส้น");
  });

  it("ท่อ IMC ขนาดในใหญ่กว่า EMT จึงใส่ได้ไม่น้อยกว่า", () => {
    const emt = numberIn(rowOf(calcConduit({ kind: "emt", size: "1", wire: "4" }), "ใส่ได้สูงสุด"));
    const imc = numberIn(rowOf(calcConduit({ kind: "imc", size: "1", wire: "4" }), "ใส่ได้สูงสุด"));
    expect(imc).toBeGreaterThanOrEqual(emt);
  });
});

/* ═══════════════ ประปา: ถังแรงดัน + ปั๊มบ้าน + นับท่อข้อต่อ ═══════════════ */

describe("ถังแรงดัน", () => {
  it("ปั๊ม 250 W 30 ล./นาที ติด 1.4 ตัด 2.8 bar → ถัง 100 ลิตร", () => {
    // เติมลม 1.4 − 0.14 = 1.26 bar · สัมบูรณ์ 2.27325 / 2.41325 / 3.81325
    // สัดส่วน = 2.27325 × (1/2.41325 − 1/3.81325) = 0.3458 · น้ำต่อรอบ 30 × 1 นาที = 30 ล.
    // 30 ÷ 0.3458 = 86.7 ล. → ถัง 100 ล.
    const r = calcPressureTank({ watts: 250, q: 30, cutIn: 1.4, cutOut: 2.8 });
    expect(r.headline).toBe("ถังแรงดัน 100 ลิตร");
    expect(numberIn(rowOf(r, "ความจุที่ต้องการ"))).toBe(87);
    expect(numberIn(rowOf(r, "ถังจ่ายน้ำได้"))).toBe(34.6);
    expect(r.explain?.risk).toBe("B");
  });

  it("ปั๊มใหญ่เกิน 750 W ใช้เวลาเดินขั้นต่ำ 2 นาที: 900 W 60 ล./นาที 2.0/3.5 bar → 500 ลิตร", () => {
    // น้ำต่อรอบ 60 × 2 = 120 ล. · สัดส่วน (1.86 + 1.01325) × (1/3.01325 − 1/4.51325) = 0.3169
    // 120 ÷ 0.3169 = 378.7 ล. → 500 ล.
    const r = calcPressureTank({ watts: 900, q: 60, cutIn: 2.0, cutOut: 3.5 });
    expect(numberIn(rowOf(r, "น้ำที่ถังต้องจ่ายต่อรอบ"))).toBe(120);
    expect(numberIn(rowOf(r, "ความจุที่ต้องการ"))).toBe(379);
    expect(r.headline).toBe("ถังแรงดัน 500 ลิตร");
  });

  it("ปั๊มตัดต่ำกว่าหรือห่างจากปั๊มติดไม่ถึง 0.5 bar ต้องไม่คิดให้", () => {
    expect(calcPressureTank({ cutIn: 2.8, cutOut: 1.4 }).invalid).toBe(true);
    expect(calcPressureTank({ cutIn: 2.0, cutOut: 2.3 }).invalid).toBe(true);
  });

  it("เกินถังใบใหญ่สุดให้ต่อหลายใบ", () => {
    // 300 ล./นาที × 2 นาที = 600 ล. ÷ 0.3458 = 1,735 ล. → 500 ล. × 4 ใบ
    const r = calcPressureTank({ watts: 2000, q: 300, cutIn: 1.4, cutOut: 2.8 });
    expect(r.headline).toBe("ถัง 500 ลิตร × 4 ใบ (ต่อขนาน)");
  });
});

describe("ปั๊มบ้านกี่วัตต์", () => {
  it("2 ชั้น 2 ห้องน้ำ ท่อ 15 ม. → ปั๊ม 150 วัตต์", () => {
    // Q = max(20, 2 × 10) = 20 ล./นาที · H = 2 × 3.2 + 8 + 15 × 0.05 = 15.15 ม.
    // P = (20/60) × 9.80665 × 15.15 × 1.2 ÷ 0.55 = 108.05 W → 109 W → ขั้น 150 W
    const r = calcHomePump({ floors: 2, baths: 2, len: 15 });
    expect(r.headline).toBe("ปั๊มบ้าน 150 วัตต์ (ต้องการ 109 วัตต์)");
    expect(homeHead(2, 15)).toBeCloseTo(15.15, 10);
  });

  it("3 ชั้น 4 ห้องน้ำ ท่อ 20 ม. → 300 วัตต์", () => {
    // Q = 40 · H = 9.6 + 8 + 1 = 18.6 · P = (40/60) × 9.80665 × 18.6 × 1.2 ÷ 0.55 = 265.3 W → 300 W
    expect(calcHomePump({ floors: 3, baths: 4, len: 20 }).headline).toBe("ปั๊มบ้าน 300 วัตต์ (ต้องการ 266 วัตต์)");
  });

  it("เกิน 400 W ไม่ยัดเป็นปั๊มบ้าน แต่บอกแรงม้าแทน", () => {
    // Q = 60 · H = 12.8 + 8 + 1.5 = 22.3 · P = 477.1 W = 0.64 HP → 0.75 HP
    const r = calcHomePump({ floors: 4, baths: 6, len: 30 });
    expect(r.headline).toBe("เกินปั๊มบ้าน 400 วัตต์ — ใช้ปั๊ม 0.75 HP");
    expect(r.invalid).toBeFalsy();
  });

  it("แยกตัวช่วยออกมาแล้ว เลขของเครื่องมือเดิมต้องไม่ขยับ", () => {
    // ปั๊มเดิม Q 40 เฮด 18: (40/60) × 9.80665 × 18 × 1.2 ÷ 0.55 = 256.75 W
    expect(pumpPower(40, 18).watts).toBeCloseTo(256.7559, 3);
    expect(calcPump({ q: 40, h: 18 }).headline).toContain("257 วัตต์");
    // หน้าคิดทั้งงานประปา: 2 ชั้น ท่อ 12 ม. → H = 6.4 + 8 + 0.6 = 15.0 ม. (สูตรเดิม)
    const job = plumbingJob.calc({ floors: 2, len: 12 });
    expect(job.invalid).toBeFalsy();
    expect(homeHead(2, 12)).toBeCloseTo(15.0, 10);
  });
});

describe("นับท่อ + ข้อต่อจากจุดน้ำ", () => {
  // ก๊อก 3 · ชักโครก 2 · ฝักบัว 2 · อ่าง 2 · เครื่องซักผ้า 1 · เครื่องทำน้ำอุ่น 1 = 11 จุด · ท่อเมน 15 ม. · เผื่อ 10%
  const r = calcFittings({ faucet: 3, toilet: 2, shower: 2, basin: 2, washer: 1, heater: 1, run: 15, waste: 10 });

  it("ท่อเป็นเส้น 4 ม.", () => {
    // ท่อเมน 15 × 1.1 = 16.5 ÷ 4 = 4.13 → 5 เส้น · ท่อแยก 11 × 1.5 = 16.5 × 1.1 = 18.15 ÷ 4 = 4.54 → 5 เส้น
    expect(r.headline).toBe("ท่อ 6 หุน 5 เส้น · 4 หุน 5 เส้น · ข้อต่อ 39 ตัว (ประมาณ)");
    expect(numberIn(rowStarting(r, "ท่อเมน PVC 6 หุน"))).toBe(5);
    expect(numberIn(rowStarting(r, "ท่อแยก PVC 4 หุน"))).toBe(5);
  });

  it("ข้อต่อ วาล์ว กาว เทป", () => {
    // สามทางลด 11 − 1 = 10 · ข้องอเมน ปัดขึ้น(15 ÷ 5) = 3 · ข้อต่อตรง ปัดขึ้น(15 ÷ 4) − 1 = 3
    // ข้องอ 4 หุน 11 · ข้องอเกลียวใน 11 · ข้องอลด 1 → รวม 10 + 1 + 3 + 3 + 11 + 11 = 39 ตัว
    expect(numberIn(rowOf(r, "สามทางลด 6 × 4 หุน"))).toBe(10);
    expect(numberIn(rowOf(r, "ข้องอ 6 หุน (เลี้ยวท่อเมน)"))).toBe(3);
    expect(numberIn(rowOf(r, "ข้อต่อตรง 6 หุน"))).toBe(3);
    expect(numberIn(rowOf(r, "ข้องอเกลียวใน 4 หุน (หัวจุดน้ำ)"))).toBe(11);
    // สต็อปวาล์ว: ชักโครก 2 + อ่าง 2 + ซักผ้า 1 + น้ำอุ่น 1 = 6
    expect(numberIn(rowStarting(r, "สต็อปวาล์ว"))).toBe(6);
    // ปากทากาว: สามทาง 10 × 3 = 30 · ข้องอ (1 + 3 + 11) × 2 = 30 · ข้อต่อตรง 3 × 2 = 6 · เกลียวใน 11 × 1 · บอลวาล์ว 2
    // = 79 ปาก × 2 ก. = 158 ก. → 2 กระป๋อง 100 ก.
    expect(rowOf(r, "กาว PVC")).toBe("ราว 158 ก. → 2 กระป๋อง (100 ก.)");
    // จุดเกลียว 11 + 6 = 17 ÷ 8 → 3 ม้วน
    expect(rowOf(r, "เทปพันเกลียว")).toBe("3 ม้วน (17 จุดเกลียว)");
    expect(r.explain?.risk).toBe("A");
  });

  it("ไม่มีจุดน้ำเลยต้องไม่คิด · จุดเยอะเตือนเช็กท่อเมน", () => {
    const none = calcFittings({ faucet: 0, toilet: 0, shower: 0, basin: 0, washer: 0, heater: 0 });
    expect(none.invalid).toBe(true);
    const big = calcFittings({ faucet: 10, toilet: 4 });
    expect(big.rows.some((x) => x.label === "จุดน้ำเยอะ")).toBe(true);
  });

  it("จุดเดียว: ไม่มีสามทาง มีแต่ข้องอลดปลายท่อ", () => {
    const one = calcFittings({ faucet: 1, toilet: 0, shower: 0, basin: 0, washer: 0, heater: 0, run: 3 });
    expect(numberIn(rowOf(one, "สามทางลด 6 × 4 หุน"))).toBe(0);
    expect(numberIn(rowOf(one, "ข้อต่อตรง 6 หุน"))).toBe(0);
  });
});

/* ═══════════════ แอร์: ชุดติดตั้ง / ใบสั่งของ ═══════════════ */

describe("ชุดติดตั้งแอร์ / ใบสั่งของ", () => {
  // 12,000 BTU · ท่อ 6 ม. · สูงต่าง 1 ม. · ผนังอิฐ · R32 ระยะฟรี 5 ม. · สายจากตู้ 10 ม. · ท่อน้ำทิ้ง 4 ม. · เผื่อ 0.5 ม.
  const r = calcAcKit({ btu: 12000, run: 6, height: 1, wall: "brick", kind: "R32", std: 5, feed: 10, drain: 4, spare: 0.5, trunkFull: true });

  it("ท่อทองแดงใช้ขนาดเดียวกับเครื่องมือท่อทองแดง (หุน) ยาวปัดขึ้นเป็นเมตร", () => {
    // 12,000 BTU → 1/4" + 3/8" = 2 หุน + 3 หุน · ยาว ปัดขึ้น(6 + 0.5) = 7 ม.
    expect(copperSizeFor(12000, 6)).toMatchObject({ liq: '1/4"', suc: '3/8"', longRun: false });
    expect(calcPipe({ btu: 12000, run: 6 }).headline).toContain("2 หุน + 3 หุน");
    expect(rowOf(r, 'ท่อทองแดงเส้นเล็ก 2 หุน (1/4")')).toBe("7 ม.");
    expect(rowOf(r, 'ท่อทองแดงเส้นใหญ่ 3 หุน (3/8")')).toBe("7 ม.");
    expect(r.headline).toBe("ท่อ 2 หุน + 3 หุน ยาว 7 ม. · สาย VCT 3×2.5 · เบรกเกอร์ 16 A");
  });

  it("ฉนวน สาย VCT เบรกเกอร์ ท่อน้ำทิ้ง ราง ขาแขวน น้ำยา ค่าระยะเกิน", () => {
    // ฉนวน 7 ÷ 1.8 = 3.9 → 4 ท่อน ต่อเส้น
    expect(rowOf(r, "ฉนวนหุ้มท่อ 2 หุน")).toBe("7 ม. → 4 ท่อน (ท่อนละ 1.8 ม.)");
    // สายไฟเข้า: 12,000 BTU → เบรกเกอร์ 16 A สาย 2.5 (ตารางเดียวกับเครื่องมือเบรกเกอร์แอร์) ยาว ปัดขึ้น(10 + 0.5) = 11 ม.
    expect(rowOf(r, "สายไฟเข้าเครื่อง VCT 3×2.5 ตร.มม.")).toBe("11 ม.");
    expect(rowStarting(r, "สายเชื่อมคอยล์ร้อน-เย็น VCT 4×2.5")).toMatch(/^7 ม\./);
    expect(rowOf(r, "เบรกเกอร์")).toBe("16 A (สาย 2.5 ตร.มม. ทน 21 A)");
    // ท่อน้ำทิ้ง 4 ม. → 1 เส้น · ลาด 1:100 ตก 4 ซม.
    expect(rowOf(r, "ท่อน้ำทิ้ง PVC 4 หุน")).toBe("1 เส้น (เส้นละ 4 ม.) · ลาด 1:100 ตก 4.0 ซม.");
    // รางครอบตลอดแนว 6 ม. ÷ 2 = 3 ท่อน · แอร์ ≤ 18,000 BTU ใช้ราง 75 มม.
    expect(rowStarting(r, "รางครอบท่อ 75 มม.")).toContain("3 ท่อน");
    expect(rowOf(r, "ขาแขวน/ขาตั้งคอยล์ร้อน")).toContain("พุก 4 ตัว");
    // น้ำยา (6 − 5) × 20 ก./ม. = 20 ก.
    expect(numberIn(rowOf(r, "น้ำยา R32 เติมเพิ่ม"))).toBe(20);
    // ค่าระยะเกิน 6 − 4 = 2 ม.
    expect(rowOf(r, "ค่าแรงระยะเกิน")).toContain("ไป 2 ม.");
  });

  it("มีขนาดสาย/เบรกเกอร์ จึงเป็นชั้น C พร้อมข้อความสงวนสิทธิ์", () => {
    expect(r.explain?.risk).toBe("C");
    expect(r.explain?.caveats).toContain(K.DISCLAIMER_C);
  });

  it("ผนังเบาห้ามแขวน · แอร์ใหญ่เกินตารางสายให้ดูป้ายเครื่อง · สูงต่างเกินระยะท่อไม่คิด", () => {
    expect(rowOf(calcAcKit({ wall: "light" }), "ขาแขวน/ขาตั้งคอยล์ร้อน")).toContain("ขาตั้งพื้น");
    const big = calcAcKit({ btu: 48000, run: 8 });
    expect(big.invalid).toBeFalsy();
    expect(rowOf(big, "เบรกเกอร์")).toContain("ป้ายเครื่อง");
    expect(rowStarting(big, "รางครอบท่อ 100 มม.")).toBeTruthy();
    expect(calcAcKit({ run: 3, height: 5 }).invalid).toBe(true);
    expect(calcAcKit({ run: 6, trunkFull: false, trunkLen: 8 }).invalid).toBe(true);
  });

  it("ท่อไม่เกินระยะฟรี: ไม่ต้องเติมน้ำยา ไม่มีค่าระยะเกิน", () => {
    const short = calcAcKit({ run: 4, std: 5 });
    expect(rowOf(short, "น้ำยา R32 เติมเพิ่ม")).toContain("ไม่ต้องเติม");
    expect(rowOf(short, "ค่าแรงระยะเกิน")).toContain("ไม่เกินแพ็กติดตั้ง");
  });
});

/* ═══════════════ หลังคา: เมทัลชีทสั่งตัด + แป ═══════════════ */

describe("เมทัลชีทสั่งตัด + แป", () => {
  // จั่ว 8 × 12 ม. ชายคา 0.5 ม. ชัน 30% กว้างคลุม 0.76 ม. แป 1.0 ม.
  const r = calcMetalKit({ shape: "gable", w: 8, l: 12, eave: 0.5, pitchUnit: "pct", pitch: 30, coverW: 0.76, spacing: 1 });

  it("สั่งตัดยาว 4.70 ม. × 32 แผ่น", () => {
    // แนวลาด (4 + 0.5) × √1.09 = 4.698 → 4.70 ม. · แถว ปัดขึ้น(12 ÷ 0.76 = 15.79) = 16 × 2 ด้าน = 32
    expect(r.headline).toBe("สั่งตัดยาว 4.70 ม. × 32 แผ่น");
    expect(rowOf(r, "เมทัลชีทสั่งตัด")).toBe("ยาว 4.70 ม. × 32 แผ่น (ด้านละ 16 แผ่น)");
  });

  it("แป สกรู ครอบสัน ปั้นลม", () => {
    // แนวแป ปัดขึ้น(4.698 ÷ 1) + 1 = 6 ต่อด้าน × 2 = 12 แนว · แนวละ ปัดขึ้น(12 ÷ 6) = 2 เส้น → 24 เส้น
    expect(rowOf(r, "เหล็กแป")).toBe("24 เส้น (เส้นละ 6 ม. · แนวละ 2 เส้น)");
    // สกรู 32 แผ่น × 6 แนว × 4 ตัว = 768 → ปัดขึ้น(768 ÷ 250) = 4 กล่อง
    expect(rowOf(r, "สกรูยึดแผ่น")).toBe("768 ตัว → 4 กล่อง (250 ตัว)");
    // ครอบสัน 12 ม. ÷ 2 = 6 เส้น (ใช้เครื่องมือสันครอบเดิม)
    expect(rowOf(r, "ครอบสัน")).toBe("12 ม. → 6 เส้น");
    // ปั้นลม 2 ขอบ × 2 ด้าน × 4.698 = 18.79 ม. ÷ 2 = 9.4 → 10 ท่อน
    expect(rowStarting(r, "ครอบข้าง/ปั้นลม")).toBe("18.8 ม. → 10 ท่อน (ท่อนละ 2 ม.)");
    expect(r.explain?.risk).toBe("B");
  });

  it("ใช้เรขาคณิตเดียวกับเครื่องมือจำนวนแผ่นหลังคา", () => {
    const mat = calcRoofMaterial({ kind: "cut", shape: "gable", w: 8, l: 12, eave: 0.5, pitch: 30, coverW: 0.76 });
    expect(mat.headline).toBe("สั่งตัดยาว 4.70 ม. × 32 แผ่น");
  });

  it("เพิงหมาแหงนชันต่ำ: เตือนความชัน ไม่มีครอบสัน มีแผ่นปิดชนผนัง", () => {
    // แนวลาด (4 + 0.3) × √(1 + 0.05²) = 4.305 → 4.31 ม. · แถว ปัดขึ้น(6 ÷ 0.76) = 8 · ชัน 5% ≈ 2.9° < 5°
    const lean = calcMetalKit({ shape: "lean", w: 4, l: 6, eave: 0.3, pitch: 5 });
    expect(lean.headline).toBe("สั่งตัดยาว 4.31 ม. × 8 แผ่น — ชันต่ำ เช็กคู่มือก่อน");
    expect(lean.rows.some((x) => x.label === "เตือนความชัน")).toBe(true);
    expect(lean.rows.some((x) => x.label === "ครอบสัน")).toBe(false);
    expect(rowStarting(lean, "แผ่นปิดชนผนัง")).toBe("6 ม. → 3 ท่อน (ท่อนละ 2 ม.)");
  });

  it("แปห่างเกิน 1.2 ม. เตือน", () => {
    expect(calcMetalKit({ spacing: 1.5 }).rows.some((x) => x.label === "แปห่าง")).toBe(true);
  });
});

/* ═══════════════ ค้นหาด้วยคำช่าง ═══════════════ */

describe("ค้นหาเครื่องมือใหม่ด้วยคำช่าง", () => {
  it.each([
    ["ท่อร้อยสาย", "conduit"],
    ["ถังแรงดัน", "ptank"],
    ["ปั๊มบ้าน", "homepump"],
    ["สามทาง", "fittings"],
    ["รางครอบ", "kit"],
    ["แป", "metal-kit"],
  ])("ค้น \"%s\" เจอ %s", (q, id) => {
    expect(searchCatalog(q).tools.some((t) => t.id === id)).toBe(true);
  });
});
