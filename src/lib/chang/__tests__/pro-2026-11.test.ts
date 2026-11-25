/**
 * ชุดทดสอบกันถอยหลังของรอบ 2 (มุมช่างมืออาชีพ) 2026-11-25
 * ค่าที่คาดหวังทุกตัวคิดแยกด้วยมือ/สคริปต์อิสระ (python3 -I) แล้วจดวิธีคิดไว้ในคอมเมนต์ของแต่ละเคส
 */
import { describe, expect, it } from "vitest";

import * as K from "../constants";
import { searchCatalog } from "../catalog";
import { fmtInchFraction, fmtTrim, inchFraction, parseLengthList, stockPieces } from "../math";
import type { CalcResult } from "../types";
import { calcLen, feetInchText, generalJob, generalTools, inchHunText, calcGeometry, calcWeightForce } from "../tools/general";
import { calcAluCut, calcGlassWeight, glassJob } from "../tools/glass";
import { calcLintel, calcMix, calcMortar, calcPlaster, masonryJob } from "../tools/masonry";
import { calcRoofMaterial, pitchWarning, roofJob } from "../tools/roof";
import { calcCut, calcSteelWeight, packBfd, steelJob, steelTools } from "../tools/steel";

function rowOf(r: CalcResult, label: string): string {
  return r.rows.find((x) => x.label === label)?.value ?? "";
}

function rowStarting(r: CalcResult, prefix: string): string {
  return r.rows.find((x) => x.label.startsWith(prefix))?.value ?? "";
}

function hasRow(r: CalcResult, part: string): boolean {
  return r.rows.some((x) => x.label.includes(part));
}

function numberIn(text: string): number {
  const match = text.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : NaN;
}

/* ═══════════════ ตัวช่วยกลาง ═══════════════ */

describe("ตัวช่วยแสดงผลแบบช่าง", () => {
  it("fmtTrim เก็บทศนิยมที่มีจริง ไม่ปัดทิ้งและไม่เติมศูนย์", () => {
    expect(fmtTrim(48.3)).toBe("48.3");
    expect(fmtTrim(2.3)).toBe("2.3");
    expect(fmtTrim(50)).toBe("50");
    expect(fmtTrim(1200)).toBe("1,200");
  });

  it("เศษส่วนนิ้ว: 10.488 นิ้ว → 10 1/2 · 0.748 → 3/4 · 0.99 → 1", () => {
    // 10.488 × 16 = 167.8 → 168/16 = 10 8/16 = 10 1/2
    expect(fmtInchFraction(10.488)).toBe("10 1/2");
    // 0.748 × 16 = 11.97 → 12/16 = 3/4
    expect(fmtInchFraction(0.748)).toBe("3/4");
    expect(inchFraction(0.99)).toMatchObject({ whole: 1, num: 0 });
    expect(fmtInchFraction(0.99)).toBe("1");
    expect(fmtInchFraction(0.0625)).toBe("1/16");
  });

  it("stockPieces ปัดขึ้นเป็นเส้นเต็ม: 53 ม. ÷ เส้น 4 ม. = 14 เส้น", () => {
    expect(stockPieces(53, 4).count).toBe(14);
    expect(stockPieces(53, 4).text).toBe("14 เส้น (เส้นละ 4 ม.)");
    expect(stockPieces(0, 4).count).toBe(0);
    expect(stockPieces(8, 4).count).toBe(2);
  });
});

/* ═══════════════ ช่างเหล็ก ═══════════════ */

describe("น้ำหนักเหล็ก: กล่อง ฉาก ตัวซี เหล็กเส้น", () => {
  it("ค่าเริ่มต้นเป็นเหล็กกล่อง 50×50×2.3 = 3.44 กก./ม. · 6 ม. = 20.7 กก.", () => {
    // [2(50+50) − 4×2.3] × 2.3 × 0.00785 = 190.8 × 2.3 × 0.00785 = 3.4449 กก./ม. × 6 = 20.67
    const r = calcSteelWeight({});
    expect(rowOf(r, "หน้าตัด")).toBe("กล่อง 50 × 50 × 2.3 มม.");
    expect(numberIn(rowOf(r, "กก./ม."))).toBe(3.44);
    expect(numberIn(rowOf(r, "น้ำหนักรวม"))).toBe(20.7);
    expect(steelTools[0].fields.find((f) => f.key === "shape")?.default).toBe("box");
  });

  it("กล่องแบน 100×50×3.2 ยาว 6 ม. 10 เส้น = 432.9 กก.", () => {
    // [2(150) − 12.8] × 3.2 × 0.00785 = 7.2145 กก./ม. × 60 ม. = 432.87
    const r = calcSteelWeight({ shape: "box", ba: 100, bb: 50, bt: 3.2, len: 6, qty: 10 });
    expect(numberIn(rowOf(r, "น้ำหนักรวม"))).toBe(432.9);
  });

  it("ฉาก 50×50×4 = 3.01 กก./ม.", () => {
    // (50 + 50 − 4) × 4 × 0.00785 = 3.0144
    const r = calcSteelWeight({ shape: "angle", la: 50, lb: 50, lt: 4, len: 1, qty: 1 });
    expect(numberIn(rowOf(r, "กก./ม."))).toBe(3.01);
  });

  it("ตัวซี 100×50×20 หนา 2.3 = 4.06 และหนา 3.2 = 5.50 กก./ม. (คิดจากแนวกึ่งกลางแผ่น รัศมีพับในเท่าความหนา)", () => {
    // แนวกึ่งกลาง = 100 + 100 + 40 − 4t − 4(2 − π/2)(1.5t): t 2.3 → 224.877 มม. × 2.3 × 0.00785 = 4.060
    //                                                      t 3.2 → 218.959 มม. × 3.2 × 0.00785 = 5.500
    expect(numberIn(rowOf(calcSteelWeight({ shape: "lipc", ch: 100, cb: 50, cl: 20, ct: 2.3, len: 1 }), "กก./ม."))).toBe(4.06);
    expect(numberIn(rowOf(calcSteelWeight({ shape: "lipc", ch: 100, cb: 50, cl: 20, ct: 3.2, len: 1 }), "กก./ม."))).toBe(5.5);
  });

  it("รางน้ำรีดร้อนต้องไม่ถูกเรียกว่าตัวซี และตัวซีมีให้เลือกแยก", () => {
    const shape = steelTools[0].fields.find((f) => f.key === "shape");
    const labels = shape?.type === "select" ? shape.options.map((o) => `${o.value}:${o.label}`) : [];
    expect(labels.find((l) => l.startsWith("c:"))).toMatch(/รางน้ำรีดร้อน.*ไม่ใช่ตัวซี/);
    expect(labels.find((l) => l.startsWith("lipc:"))).toMatch(/ตัวซี/);
    expect(rowOf(calcSteelWeight({ shape: "c", csize: "100" }), "หน้าตัด")).toMatch(/^รางน้ำรีดร้อน/);
  });

  it("เหล็กเส้น DB12 ยาว 8.3 ม. = 7.4 กก. และบอกเป็น 1 เส้น (เส้นละ 10 ม.)", () => {
    // 0.006165 × 12² = 0.88776 กก./ม. × 8.3 = 7.37 กก. · 8.3 ÷ 10 → 1 เส้น
    const r = calcSteelWeight({ shape: "rebar", rebar: "DB12", len: 8.3, qty: 1 });
    expect(numberIn(rowOf(r, "น้ำหนักรวม"))).toBe(7.4);
    expect(rowOf(r, "เทียบเป็นเส้นที่ขาย")).toBe("ยาวรวม 8.3 ม. = 1 เส้น (เส้นละ 10 ม.)");
    // RB6: 0.006165 × 36 = 0.222 กก./ม.
    expect(numberIn(rowOf(calcSteelWeight({ shape: "rebar", rebar: "RB6", len: 1 }), "กก./ม."))).toBe(0.22);
  });

  it("ข้อความหน้าตัดท่อคงทศนิยม: Ø 48.3 × 2.3 ไม่ใช่ 48 × 2", () => {
    const r = calcSteelWeight({ shape: "pipe", od: 48.3, t: 2.3, len: 6, qty: 1 });
    expect(rowOf(r, "หน้าตัด")).toBe("ท่อ Ø 48.3 × 2.3 มม.");
    // (48.3 − 2.3) × 2.3 × π × 7.85 ÷ 1000 = 2.609 กก./ม.
    expect(numberIn(rowOf(r, "กก./ม."))).toBe(2.61);
  });

  it("ใส่ราคา 30 บาท/กก. ได้ยอดเงิน · ไม่ใส่ไม่มีแถวราคา", () => {
    // กล่อง 50×50×2.3 ยาว 6 ม. = 20.669 กก. × 30 = 620 บาท
    const r = calcSteelWeight({ price: 30 });
    expect(rowOf(r, "ราคาประมาณ")).toBe("620 บาท (30 บาท/กก.)");
    expect(r.headline).toBe("20.7 กก. · ประมาณ 620 บาท");
    expect(hasRow(calcSteelWeight({}), "ราคา")).toBe(false);
  });

  it("กล่องหนาเกินครึ่งด้านแคบต้องไม่ให้น้ำหนัก", () => {
    const r = calcSteelWeight({ shape: "box", ba: 20, bb: 20, bt: 12 });
    expect(r.invalid).toBe(true);
    expect(r.headline).toMatch(/กล่องหนา/);
  });
});

describe("แผนตัดเหล็ก: รอยตัด n−1 และรายการแบบ ยาว×จำนวน", () => {
  it("ชิ้น 6000 ตัดจากเส้น 6000 ได้พอดี (เดิมขึ้นว่ายาวเกินเส้น)", () => {
    const r = calcCut({ parts: "6000", stock: 6000, kerf: 3 });
    expect(r.invalid).toBeFalsy();
    expect(r.headline).toBe("ใช้ 1 เส้น · เศษ 0.0%");
  });

  it("สองชิ้น 2998.5 + รอยตัด 3 มม. ลงเส้น 6000 พอดี (2 ชิ้น = 1 รอยตัด)", () => {
    // 2998.5 × 2 + 3 × (2 − 1) = 6000
    expect(packBfd(6000, 3, [2998.5, 2998.5]).bars).toHaveLength(1);
    // 3 ชิ้น 2000 ต้องมี 2 รอยตัด = 6006 > 6000 → 2 เส้น
    expect(packBfd(6000, 3, [2000, 2000, 2000]).bars).toHaveLength(2);
    // เศษที่รายงานหักรอยตัดแยกชิ้นสุดท้ายแล้ว: 6000 − 5100 − 4 × 3 = 888
    expect(packBfd(6000, 3, [1500, 1500, 1200, 900]).remain).toEqual([888]);
  });

  it('"1500x20" "1500*20" "1500×20" คือ 1500 จำนวน 20 ชิ้น และ "1,500x2" ก็อ่านได้', () => {
    for (const text of ["1500x20", "1500*20", "1500×20", "1500X20"]) {
      const { values, dropped } = parseLengthList(text, 6000);
      expect(values, text).toHaveLength(20);
      expect(new Set(values), text).toEqual(new Set([1500]));
      expect(dropped, text).toEqual([]);
    }
    expect(parseLengthList("1,500x2 800", 6000).values).toEqual([1500, 1500, 800]);
    expect(parseLengthList("1200, 800x3; 2500").values).toEqual([1200, 800, 800, 800, 2500]);
    // ตัวคูณเพี้ยนต้องรายงาน ไม่ทิ้งเงียบ
    expect(parseLengthList("1500x0 1500x2.5 1500xabc 20x1500").dropped).toEqual(["1500x0", "1500x2.5", "1500xabc", "20x1500"]);
  });

  it("ลูกกรง 1500×20 บนเส้น 6000: 7 เส้น และบอกว่าลดชิ้นละ 3 มม. จะเหลือ 5 เส้น", () => {
    // 4 ชิ้น/เส้น ต้องใช้ 4 × 1500 + 3 × 3 = 6009 > 6000 → ได้ 3 ชิ้น/เส้น → 20 ÷ 3 = 7 เส้น
    // ลด k มม.: 4 × (1500 − k) + 9 ≤ 6000 → k ≥ 2.25 → k = 3 → 5 เส้น
    const r = calcCut({ parts: "1500x20", stock: 6000, kerf: 3 });
    expect(rowOf(r, "เส้นวัตถุดิบ")).toBe("7 เส้น × 6,000 มม.");
    expect(rowOf(r, "ทางประหยัด")).toBe("ลดชิ้นละ 3 มม. จะเหลือ 5 เส้น (จาก 7)");
    expect(rowOf(r, "อ่านรายการได้")).toBe("1,500 ×20 มม.");
    expect(rowOf(r, "เส้นที่ 1–6 (6 เส้น)")).toBe("1,500 ×3 · เหลือ 1,491 มม.");
    // ไม่มีทางประหยัดก็ไม่ต้องมีแถวนี้
    expect(hasRow(calcCut({ parts: "1200, 1200, 800, 2500, 900" }), "ทางประหยัด")).toBe(false);
  });

  it("พิมพ์เป็นเมตร (1.5) ต้องเตือนให้ใส่เป็น มม. ไม่รับเป็น 1.5 มม.", () => {
    const r = calcCut({ parts: "1.5, 2", stock: 6000, kerf: 3 });
    expect(r.invalid).toBe(true);
    expect(r.headline).toMatch(/ใส่เป็น มม\./);
  });

  it("คิดทั้งงาน: จำนวนเส้นมาจากแผนตัด น้ำหนักและราคาตามเส้นที่ต้องซื้อ", () => {
    // 1500×20 → 7 เส้น × 6 ม. × 3.4449 กก./ม. = 144.7 กก. × 30 = 4,341 บาท
    const r = steelJob.calc({ parts: "1500x20", price: 30 });
    expect(r.headline).toBe("ซื้อ 7 เส้น · 144.7 กก. · 4,341 บาท");
    expect(rowOf(r, "น้ำหนักที่ต้องซื้อ")).toBe("144.7 กก. (7 เส้นเต็ม)");
    expect(rowOf(r, "เส้นวัตถุดิบ")).toBe("7 เส้น × 6,000 มม.");
    // ค่าเริ่มต้น 4 ชิ้นลงเส้นเดียว = 1 เส้น 20.7 กก. (เดิมโชว์น้ำหนัก 4 เส้นที่กรอกแยก ไม่ผูกกับแผนตัด)
    expect(steelJob.calc({}).headline).toBe("ซื้อ 1 เส้น · 20.7 กก.");
    expect(steelJob.fields.some((f) => f.key === "qty" || f.key === "len")).toBe(false);
  });
});

/* ═══════════════ เครื่องมือทั่วไป ═══════════════ */

describe("แปลงหน่วยแบบช่าง", () => {
  it("2.4 ม. = 7 ฟุต 10 1/2 นิ้ว", () => {
    // 2400 ÷ 25.4 = 94.488 นิ้ว = 7 ฟุต 10.488 นิ้ว → ใกล้สุด 1/16 = 10 1/2
    expect(feetInchText(2400)).toBe("7 ฟุต 10 1/2 นิ้ว");
    expect(feetInchText(304.8)).toBe("1 ฟุต");
    expect(rowStarting(calcLen({ x: 2.4, from: "m", to: "ft" }), "ฟุต-นิ้ว")).toBe("7 ฟุต 10 1/2 นิ้ว");
    // ของเดิมโชว์ "755.91 หุน" ซึ่งไม่มีใครใช้
    expect(hasRow(calcLen({ x: 2.4, from: "m", to: "ft" }), "หุน")).toBe(false);
  });

  it("19 มม. = 3/4 นิ้ว (6 หุน) · 12.7 มม. = 1/2 นิ้ว (4 หุน)", () => {
    // 19 ÷ 25.4 × 16 = 11.97 → 12/16 = 3/4 นิ้ว = 6 หุน · ต่างจริง |19.05 − 19| = 0.05 มม.
    expect(inchHunText(19)).toBe("3/4 นิ้ว (6 หุน) · ต่างจากค่าจริง 0.05 มม.");
    expect(inchHunText(12.7)).toBe("1/2 นิ้ว (4 หุน) · ต่างจากค่าจริง 0.00 มม.");
    expect(rowOf(calcLen({ x: 19, from: "mm", to: "in" }), "นิ้วเศษส่วนใกล้สุด")).toMatch(/^3\/4 นิ้ว \(6 หุน\)/);
  });

  it("รูปทรงและแปลงน้ำหนักมี headline ให้แถบคำตอบล่างจอ", () => {
    expect(calcGeometry({}).headline).toBe("พื้นที่ 20.00 ตร.ม. · ปริมาตร 50.00 ลบ.ม. (คิว)");
    // 5 ปอนด์ × 0.453592 = 2.268 กก.
    expect(calcWeightForce({ x: 5, from: "lb" }).headline).toBe("5.000 ปอนด์ = 2.268 กก.");
    expect(calcWeightForce({}).headline).toBeTruthy();
  });

  it("แปลงหน่วยด่วนไม่ซ้ำกับเครื่องมือแปลงความยาว: ใส่ค่าเดียวได้ทุกหน่วย", () => {
    expect(generalJob.calc).not.toBe(generalTools[0].calc);
    expect(generalJob.fields.map((f) => f.key)).toEqual(["x", "from"]);
    const r = generalJob.calc({ x: 2.4, from: "m" });
    expect(r.headline).toBe("2.4 ม. = 7 ฟุต 10 1/2 นิ้ว");
    expect(rowOf(r, "เซนติเมตร")).toBe("240.00 ซม.");
    expect(rowOf(r, "ศอก")).toBe("4.80 ศอก");
    expect(rowOf(r, "วา")).toBe("1.20 วา");
  });
});

/* ═══════════════ ช่างก่อฉาบ ═══════════════ */

describe("ก่อฉาบ: ชื่อแถว ขนาดถุง และหน่วยที่ซื้อจริง", () => {
  it("หน้าคิดทั้งงานแยกชื่อปูนกาวก่อ/ปูนซีเมนต์งานก่อ กับปูนฉาบ ไม่มีแถวชื่อซ้ำ", () => {
    const aac = masonryJob.calc({ kind: "aac75" });
    expect(rowOf(aac, "ปูนกาวก่อ (ถุง 50 กก.)")).toBe("1 ถุง");
    expect(rowOf(aac, "ปูนฉาบบาง (ถุง 50 กก.)")).toBe("5 ถุง");
    const clay = masonryJob.calc({});
    expect(rowOf(clay, "ปูนซีเมนต์งานก่อ (ถุง 50 กก.)")).toBe("2 ถุง");
    expect(rowOf(clay, "ปูนฉาบ (ถุง 50 กก.)")).toBe("15 ถุง");
    for (const r of [aac, clay]) {
      const labels = r.rows.map((x) => x.label);
      expect(new Set(labels).size).toBe(labels.length);
    }
  });

  it("เลือกขนาดถุงได้: ฉาบ 720 กก. = 15 ถุง (50 กก.) หรือ 18 ถุง (40 กก.)", () => {
    const wall = { w: 4, h: 3, open: 0, pkind: "normal", sides: 2 };
    expect(rowOf(calcPlaster(wall), "ปูนฉาบ (ถุง 50 กก.)")).toBe("15 ถุง");
    expect(rowOf(calcPlaster({ ...wall, bag: "40" }), "ปูนฉาบ (ถุง 40 กก.)")).toBe("18 ถุง");
  });

  it("สกิมโค้ท 12 ตร.ม. หนา 2 มม. = 48 กก. → ถุง 20 กก. 3 ถุง (ถุง 50 กก. 1 ถุง)", () => {
    const wall = { w: 4, h: 3, open: 0, pkind: "skim", sides: 1 };
    expect(rowOf(calcPlaster({ ...wall, bag: "20" }), "สกิมโค้ท (ถุง 20 กก.)")).toBe("3 ถุง");
    expect(rowOf(calcPlaster(wall), "สกิมโค้ท (ถุง 50 กก.)")).toBe("1 ถุง");
  });

  it("ฉาบบางมวลเบาตั้งต้น 5 มม. แต่กรอกหนาจริง 10 มม. ได้: 12 ตร.ม. = 240 กก. → 5 ถุง", () => {
    const wall = { w: 4, h: 3, open: 0, pkind: "thin", sides: 1 };
    // 12 × 5 × 2.0 = 120 กก. → 3 ถุง · 12 × 10 × 2.0 = 240 กก. → 5 ถุง
    expect(rowOf(calcPlaster(wall), "ปูนฉาบบาง (ถุง 50 กก.)")).toBe("3 ถุง");
    const thick = calcPlaster({ ...wall, thick: 10 });
    expect(rowOf(thick, "ปูนฉาบบาง (ถุง 50 กก.)")).toBe("5 ถุง");
    expect(rowOf(thick, "ความหนาฉาบ")).toBe("10 มม. (กำหนดเอง)");
  });

  it("ปูนก่อผสมเอง: ผนัง 60 ตร.ม. ได้ 9 ถุง ทราย 1.04 คิว · เผื่อปูนตกหล่น 15% ได้ 11 ถุง", () => {
    // f = 1 − (140 × 40) ÷ (150 × 50) = 0.25333 · V = 60 × 0.065 × f = 0.988 ลบ.ม.
    // ปูน 0.988 × 450 = 444.6 กก. → 9 ถุง · ทราย 0.988 × 1.05 = 1.04 · เผื่อ 15%: 511.3 กก. → 11 ถุง
    const wall = { w: 20, h: 3, open: 0, kind: "clayTis77", joint: "auto" };
    const r = calcMortar(wall);
    expect(rowOf(r, "ปูนซีเมนต์งานก่อ (ถุง 50 กก.)")).toBe("9 ถุง");
    expect(rowOf(r, "ทรายงานก่อ")).toBe("1.04 ลบ.ม. (คิว)");
    expect(r.headline).toBe("ปูนซีเมนต์ 9 ถุง + ทราย 1.04 คิว");
    expect(rowOf(calcMortar({ ...wall, mwaste: 15 }), "ปูนซีเมนต์งานก่อ (ถุง 50 กก.)")).toBe("11 ถุง");
    // ถุง 40 กก.: 444.6 ÷ 40 = 11.1 → 12 ถุง
    expect(rowOf(calcMortar({ ...wall, bag: "40" }), "ปูนซีเมนต์งานก่อ (ถุง 40 กก.)")).toBe("12 ถุง");
  });

  it("เหล็กทับหลังบอกเป็นเส้น 10 ม.: 18.9 ม. = 2 เส้น", () => {
    // ยาว/ชุด 1.4 ม. · เหล็กยืน 4 × 1.4 = 5.6 · ปลอก (ปัดขึ้น(1.4 ÷ 0.15) + 1) = 11 × 0.35 = 3.85 → 9.45 ม./ชุด × 2 = 18.9 ม.
    expect(rowOf(calcLintel({ n: 2, width: 1 }), "เหล็ก RB6 ประมาณ")).toBe("18.9 ม. = 2 เส้น (เส้นละ 10 ม.)");
  });

  it("สัดส่วนผสมบอกทราย/หินเป็นคิว และเลือกถุงปูน 40 กก. ได้", () => {
    // 1 ลบ.ม. 1:2:4 → ปูน 316.8 กก. = 6.3 ถุง (50) หรือ 7.9 ถุง (40) → 8 ถุง
    const r = calcMix({ m3: 1, ratio: "124" });
    expect(r.headline).toBe("ปูน 7 ถุง · ทราย 0.44 คิว · หิน 0.88 คิว");
    expect(rowOf(r, "ทราย")).toBe("0.44 ลบ.ม. (คิว)");
    expect(rowOf(calcMix({ m3: 1, ratio: "124", bag: "40" }), "ปูนซีเมนต์ (ถุง 40 กก.)")).toBe("8 ถุง (คิดได้ 7.9 ถุง)");
  });
});

/* ═══════════════ ช่างหลังคา ═══════════════ */

describe("หลังคา: สั่งตัดเมทัลชีทและคำเตือนความชัน", () => {
  it("จั่ว 8×12 ชัน 30%: สั่งตัดยาว 4.18 ม. × 36 แผ่น ไม่คูณเผื่อเสีย", () => {
    // แนวลาด = 4 × √1.09 = 4.1761 → ปัดขึ้นเป็นซม. 4.18 · แถว = ปัดขึ้น(12 ÷ 0.7) = 18 × 2 ด้าน = 36
    const r = calcRoofMaterial({});
    expect(r.headline).toBe("สั่งตัดยาว 4.18 ม. × 36 แผ่น");
    expect(rowOf(r, "จำนวนแผ่น (สั่งตัด ไม่เผื่อเสีย)")).toBe("36 แผ่น");
    // เผื่อเสีย 25% ก็ยัง 36 แผ่น เพราะแผ่นสั่งตัดไม่มีเศษ
    expect(rowOf(calcRoofMaterial({ waste: 25 }), "จำนวนแผ่น (สั่งตัด ไม่เผื่อเสีย)")).toBe("36 แผ่น");
  });

  it("ใส่ชายคายื่น 0.6 ม. ได้ยาวตัด 4.81 ม. · เพิงหมาแหงนกว้าง 8 ม. ได้ 8.36 ม. × 18 แผ่น", () => {
    // (4 + 0.6) × √1.09 = 4.8025 → 4.81 · เพิง: 8 × √1.09 = 8.3522 → 8.36 · ด้านเดียว 18 แถว
    expect(calcRoofMaterial({ eave: 0.6 }).headline).toBe("สั่งตัดยาว 4.81 ม. × 36 แผ่น");
    expect(calcRoofMaterial({ shape: "lean" }).headline).toBe("สั่งตัดยาว 8.36 ม. × 18 แผ่น");
  });

  it("กระเบื้องลอนคู่กรอกอัตราต่ำ ๆ ได้ (เดิมช่องบังคับไม่ต่ำกว่า 6): 2.2 แผ่น/ตร.ม. = 243 แผ่น", () => {
    // 8 × 12 × √1.09 × 1.10 = 110.25 ตร.ม. × 2.2 = 242.5 → 243
    const r = calcRoofMaterial({ kind: "roman" });
    expect(rowOf(r, "แผ่นกระเบื้องลอนคู่")).toBe("243 แผ่น");
    expect(calcRoofMaterial({ kind: "tile", perM2: 3.5 }).invalid).toBeFalsy();
  });

  it("ความชันต่ำกว่าแนวทางทั่วไปของวัสดุต้องเตือน (เป็นคำแนะนำ ไม่ใช่ข้อบังคับ)", () => {
    // 5% = 2.86° ต่ำกว่าทั้งกระเบื้อง (15°) และเมทัลชีท (5°) · 30% = 16.7° ผ่านทั้งคู่
    expect(pitchWarning("tile", 5)).toMatch(/ค่อนข้างต่ำสำหรับกระเบื้องคอนกรีต/);
    expect(pitchWarning("cut", 5)).toMatch(/เมทัลชีท/);
    expect(pitchWarning("tile", 30)).toBeNull();
    expect(pitchWarning("cut", 10)).toBeNull();
    const r = calcRoofMaterial({ kind: "tile", pitch: 5, pitchUnit: "pct" });
    expect(rowOf(r, "เตือนความชัน")).toMatch(/เช็กคู่มือรุ่นที่ใช้/);
    expect(r.explain?.risk).toBe("B");
    expect(hasRow(calcRoofMaterial({ kind: "tile" }), "เตือนความชัน")).toBe(false);
  });

  it("คิดทั้งงาน: เลือกกระเบื้องแล้วไม่มีแถวสกรูเมทัลชีท · เมทัลชีทยังมี", () => {
    expect(hasRow(roofJob.calc({ kind: "tile" }), "สกรู")).toBe(false);
    expect(hasRow(roofJob.calc({ kind: "roman" }), "สกรู")).toBe(false);
    expect(hasRow(roofJob.calc({ kind: "cut" }), "จำนวนสกรู")).toBe(true);
    // ป้ายเผื่อเสียตามเลขที่กรอก ไม่ใช่ "10%" ตายตัว
    expect(hasRow(roofJob.calc({ kind: "tile", waste: 7 }), "รวมเผื่อ 7%")).toBe(true);
  });

  it("รางน้ำ/ท่อลงบอกขนาดเป็นนิ้วคู่กับ มม.", () => {
    const r = roofJob.calc({});
    expect(rowOf(r, "รางน้ำ")).toBe("125 มม. (5 นิ้ว)");
    expect(rowOf(r, "ท่อลง")).toMatch(/Ø 80 มม\. \(3 นิ้ว\)/);
  });
});

/* ═══════════════ ช่างกระจก ═══════════════ */

describe("กระจก: น้ำหนักต่อบาน ตร.ฟุต และความหนาที่มีขาย", () => {
  it("บานเลื่อน 2 บาน ช่อง 1.8×1.5 ม. หนา 8 มม.: รวม 54 กก. แต่บานละ 27 กก. ฮาร์ดแวร์คิดจากต่อบาน", () => {
    // 2.5 × 8 × 1.8 × 1.5 = 54 กก. ÷ 2 = 27 กก./บาน → ช่วง 25–45 กก.
    const r = calcGlassWeight({ w: 1800, h: 1500, t: "8", n: 1, sash: "2" });
    expect(rowOf(r, "น้ำหนัก")).toBe("54.0 กก.");
    expect(rowOf(r, "น้ำหนักต่อบาน")).toBe("27.0 กก. (ช่องละ 2 บาน)");
    expect(rowOf(r, "ฮาร์ดแวร์")).toMatch(/^บานพับ 3 ตัว หรือลูกล้อ 2/);
    // คิดเป็นแผ่นเดียว 54 กก. จะได้ลูกล้อเฮฟวี่ (ของเดิม)
    expect(rowOf(calcGlassWeight({ w: 1800, h: 1500, t: "8", n: 1, sash: "1" }), "ฮาร์ดแวร์")).toMatch(/^ลูกล้อเฮฟวี่/);
  });

  it("พื้นที่บอกเป็นตารางฟุตด้วย: 2.70 ตร.ม. = 29.1 ตร.ฟุต", () => {
    // 2.7 ÷ 0.3048² = 29.06
    expect(rowOf(calcGlassWeight({ w: 1800, h: 1500, t: "8" }), "พื้นที่กระจก")).toBe("2.70 ตร.ม. = 29.1 ตร.ฟุต");
  });

  it("ความหนาเลือกได้เฉพาะ 5/6/8/10/12 มม. — 7 มม. ไม่รับ", () => {
    expect(calcGlassWeight({ t: 7 }).invalid).toBe(true);
    expect(glassJob.calc({ t: 7 }).invalid).toBe(true);
    for (const t of ["5", "6", "8", "10", "12"]) expect(calcGlassWeight({ t }).invalid, t).toBeFalsy();
  });

  it('เลือกตัดชน 90° แล้ว tip ต้องไม่พูดถึง "แนว 45°"', () => {
    expect(calcAluCut({ miter: "90" }).tip).not.toMatch(/45°/);
    expect(calcAluCut({ miter: "90" }).tip).toMatch(/90°/);
    expect(calcAluCut({ miter: "45" }).tip).toMatch(/45°/);
  });
});

/* ═══════════════ ค่าคงที่ใหม่ของรอบนี้ ═══════════════ */

describe("ทะเบียนค่าคงที่รอบ 2", () => {
  it("เหล็ก 1 ตร.มม. ยาว 1 ม. หนัก 0.00785 กก. (7,850 กก./ลบ.ม.)", () => {
    expect(K.STEEL_FORMULA.kgPerMm2.value).toBe(K.MATERIAL.steelDensity.value / 1e6);
  });
});

/* ═══════════════ ค้นหาด้วยคำช่าง ═══════════════ */

describe("ค้นหา: คำช่างของสายโครงสร้าง", () => {
  it.each(["กล่อง", "ฉาก", "ตัวซี"])('ค้น "%s" ต้องเจอน้ำหนักเหล็ก', (word) => {
    expect(searchCatalog(word).tools.map((t) => `${t.tradeId}/${t.id}`)).toContain("steel/weight");
  });
});
