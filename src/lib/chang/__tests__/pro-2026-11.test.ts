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
import { calcGypsum, calcTbar, ceilingJob } from "../tools/ceiling";
import { calcBattery, calcSolar, electricalJob, vdropVolts } from "../tools/electrical";
import { calcAluCut, calcGlassWeight, glassJob } from "../tools/glass";
import { calcLaminate, handymanTools } from "../tools/handyman";
import { calcPipe, copperHun, hvacJob } from "../tools/hvac";
import { calcLintel, calcMix, calcMortar, calcPlaster, masonryJob } from "../tools/masonry";
import { calcPaintQty, calcWallpaper, paintJob, paintPacks, paintTools } from "../tools/paint";
import { calcPump, plumbingJob, plumbingTools } from "../tools/plumbing";
import { calcRoofMaterial, pitchWarning, roofJob } from "../tools/roof";
import { calcCut, calcSteelWeight, packBfd, steelJob, steelTools } from "../tools/steel";
import { calcGrout, calcLeveling, calcTileQty, clipsPerTile, tileJob, tileLayout, tileTools } from "../tools/tile";
import { calcGap, calcVinylAdhesive, vinylJob } from "../tools/vinyl";

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

/* ═══════════════ งานตกแต่ง ═══════════════ */

describe("กระเบื้อง: นับตามแถว คลิปตามขนาด ถุงยาแนว", () => {
  it("วางแถว 60×60 ในห้อง 4×5 ม. = 60 แผ่น (เต็ม 48 + ริม 9 + ริม 3)", () => {
    // ด้านกว้าง 4 ÷ 0.6 = 6 แผ่นเต็ม เศษ 0.4 (เกินครึ่งแผ่น → แผ่นละ 1 ชิ้น)
    // ด้านยาว 5 ÷ 0.6 = 8 แผ่นเต็ม เศษ 0.2 (ไม่เกินครึ่ง → แผ่นละ 2 ชิ้น)
    // เต็ม 6×8 = 48 · แถวริมด้านกว้าง (8+1) ชิ้น = 9 แผ่น · แถวริมด้านยาว 6 ชิ้น ÷ 2 = 3 แผ่น → 60
    expect(tileLayout(4, 5, 0.6, 0.6).count).toBe(60);
  });

  it("30×60 ในห้อง 3.3×4.1 ม.: วางแถวได้ 77 แต่พื้นที่+เผื่อ 5% ได้ 79 → ใช้ค่ามากกว่า 79 แผ่น 10 กล่อง", () => {
    // วางแถว: 0.3 ตามกว้าง 11 แผ่นพอดี · 0.6 ตามยาว 6 แผ่น เศษ 0.5 (เกินครึ่ง) → 66 + 11 = 77
    // พื้นที่: 13.53 ÷ 0.18 × 1.05 = 78.9 → 79 · กล่องละ 8 → 79 ÷ 8 = 9.9 → 10
    expect(tileLayout(3.3, 4.1, 0.3, 0.6).count).toBe(77);
    const r = calcTileQty({ w: 3.3, l: 4.1, size: "3060", perBox: 8, pattern: "straight" });
    expect(numberIn(rowOf(r, "นับแบบวางแถว"))).toBe(77);
    expect(numberIn(rowOf(r, "จำนวนแผ่น"))).toBe(79);
    expect(numberIn(rowOf(r, "จำนวนกล่อง"))).toBe(10);
  });

  it("คลิปต่อแผ่นตามขนาด: 60×60 = 4 · 30×60 = 3 · 60×120 = 6 และแผ่นเล็กกว่า 60 ซม. ไม่ใช้คลิป", () => {
    // คลิปทุก 30 ซม. ตามขอบ นับครึ่งรอบแผ่น: 0.6/0.3 + 0.6/0.3 = 4 · 0.3/0.3 + 0.6/0.3 = 3 · 2 + 4 = 6
    expect(clipsPerTile(0.6, 0.6)).toBe(4);
    expect(clipsPerTile(0.3, 0.6)).toBe(3);
    expect(clipsPerTile(0.6, 1.2)).toBe(6);
    // 30×60 ห้อง 20 ตร.ม.: 20 ÷ 0.18 = 111.1 → 112 แผ่น × 3 = 336 ตัว = 4 ถุง (ถุง 100)
    const r = calcLeveling({ w: 4, l: 5, size: "3060" });
    expect(rowStarting(r, "คลิปปรับระดับ")).toBe("336 ตัว = 4 ถุง (ถุง 100)");
    expect(rowStarting(r, "ลิ่ม")).toContain("วนใช้");
    const small = calcLeveling({ w: 4, l: 5, size: "30" });
    expect(small.headline).toContain("ไม่ต้องใช้คลิป");
    expect(hasRow(tileJob.calc({ size: "30" }), "คลิปปรับระดับ")).toBe(false);
    expect(hasRow(tileJob.calc({ size: "60" }), "คลิปปรับระดับ")).toBe(true);
  });

  it("ยาแนว 2.1 กก.: ถุง 5 กก. (ค่าเดิม) = 1 ถุง · เลือกถุง 1 กก. = 3 ถุง", () => {
    expect(rowOf(calcGrout({}), "ยาแนว (ถุง 5 กก.)")).toBe("1 ถุง");
    expect(rowOf(calcGrout({ groutBag: "1" }), "ยาแนว (ถุง 1 กก.)")).toBe("3 ถุง");
  });

  it("เครื่องมือเดิมชื่อ “คิ้ว” เปลี่ยนเป็นบัวเชิงผนัง และออกเป็นเส้น", () => {
    const trim = tileTools.find((t) => t.id === "trim");
    expect(trim?.name).toContain("บัวเชิงผนัง");
    // รอบห้อง 4×5 = 18 ม. หักประตู 0.9 = 17.1 ม. ÷ 2.5 = 6.84 → 7 เส้น
    expect(rowOf(trim!.calc({}), "บัวเชิงผนัง (เส้นละ 2.5 ม.)")).toBe("7 เส้น");
  });
});

describe("กระเบื้องยาง: ปรับระดับเป็นตัวเลือก โฟมติดหลัง ห้องยาว", () => {
  it("ค่าตั้งต้นของ job ไม่มีปูนปรับระดับ ใส่ความหนาแล้วจึงมี", () => {
    expect(hasRow(vinylJob.calc({}), "ปูนปรับระดับ")).toBe(false);
    expect(hasRow(vinylJob.calc({ thick: 3 }), "ปูนปรับระดับ")).toBe(true);
  });

  it("แผ่นมีโฟมติดหลัง ไม่ต้องซื้อโฟมรองพื้น", () => {
    expect(rowOf(vinylJob.calc({ kind: "clickPad" }), "โฟมรองพื้น")).toBe("ไม่ต้องซื้อ");
    expect(hasRow(vinylJob.calc({ kind: "click" }), "โฟมรอง (ม้วน")).toBe(true);
  });

  it("ห้องยาว 16 ม. ต้องขึ้นแถวเตือนตัวแบ่ง ห้อง 5 ม. ไม่ขึ้น", () => {
    expect(hasRow(calcGap({ l: 16 }), "ต้องมีตัวแบ่ง")).toBe(true);
    expect(calcGap({ l: 16 }).headline).toContain("ตัวแบ่ง");
    expect(hasRow(calcGap({ l: 5 }), "ต้องมีตัวแบ่ง")).toBe(false);
  });

  it("กาว 6 กก.: แกลลอน 4 กก. (ค่าเดิม) = 2 · แกลลอน 3 กก. = 2 · กระป๋อง 1 กก. = 6", () => {
    // 20 ตร.ม. × 0.3 กก./ตร.ม. = 6 กก. → ÷4 = 1.5 → 2 · ÷3 = 2 · ÷1 = 6
    expect(numberIn(rowStarting(calcVinylAdhesive({ kind: "glue" }), "กาว (แกลลอน 4 กก.)"))).toBe(2);
    expect(numberIn(rowStarting(calcVinylAdhesive({ kind: "glue", gluePack: "3" }), "กาว (แกลลอน 3 กก.)"))).toBe(2);
    const one = calcVinylAdhesive({ kind: "glue", gluePack: "1" });
    expect(one.rows.some((x) => x.emphasize && numberIn(x.value) === 6)).toBe(true);
  });
});

describe("ฝ้า: โครงเป็นเส้น และใบสั่งของตามระบบ", () => {
  it("ยิปซัม 4×5 ม.: โครงล่าง 53 ม. = 14 เส้น · โครงบน 18 ม. = 5 เส้น · ฉากริม 18 ม. = 5 เส้น (เส้น 4 ม.)", () => {
    // 20 ÷ 0.4 × 1.05 = 52.5 → 53 ม. ÷ 4 = 13.25 → 14 · 20 ÷ 1.2 × 1.05 = 17.5 → 18 ÷ 4 = 4.5 → 5 · 2×(4+5) = 18 → 5
    const r = calcGypsum({ w: 4, l: 5 });
    expect(rowOf(r, "โครง C-Line ล่าง (ซอย) ประมาณ")).toBe("53 ม. ≈ 14 เส้น (เส้นละ 4 ม.)");
    expect(rowOf(r, "โครง C-Line บน (โครงหลัก) ประมาณ")).toBe("18 ม. ≈ 5 เส้น (เส้นละ 4 ม.)");
    expect(rowOf(r, "ฉากริมผนัง")).toBe("18 ม. ≈ 5 เส้น (เส้นละ 4 ม.)");
    // ร้านขายเส้น 3 ม.: 53 ÷ 3 = 17.7 → 18 เส้น
    expect(rowOf(calcGypsum({ w: 4, l: 5, stock: 3 }), "โครง C-Line ล่าง (ซอย) ประมาณ")).toBe("53 ม. ≈ 18 เส้น (เส้นละ 3 ม.)");
  });

  it("ทีบาร์ 60×60 ห้อง 4×5 ม.: Main tee 5 เส้น · Cross tee 1.2 ม. 28 ท่อน · 0.6 ม. 28 ท่อน · ลวดแขวน 14 จุด", () => {
    // Main tee 4 ÷ 1.2 × 5 = 16.67 ม. → 17 ม. ÷ 4 = 4.25 → 5 เส้น
    // Cross 1.2 ม.: 5 ÷ 0.6 × 4 = 33.33 ม. ÷ 1.2 = 27.8 → 28 ท่อน · Cross 0.6 ม.: 16.67 ÷ 0.6 = 27.8 → 28 ท่อน
    // ลวดแขวน: 16.67 ÷ 1.2 = 13.9 → 14 จุด
    const r = calcTbar({ w: 4, l: 5, tile: "60" });
    expect(rowOf(r, "Main tee ประมาณ")).toBe("17 ม. ≈ 5 เส้น (เส้นละ 4 ม.)");
    expect(rowOf(r, "Cross tee 1.2 ม. ประมาณ")).toBe("34 ม. ≈ 28 ท่อน");
    expect(rowOf(r, "Cross tee 0.6 ม. ประมาณ")).toBe("17 ม. ≈ 28 ท่อน");
    expect(numberIn(rowOf(r, "ลวดแขวน + พุก"))).toBe(14);
  });

  it("job ทีบาร์ต้องได้โครงทีบาร์ + ลวดแขวน และไม่มีสกรูยิปซัม", () => {
    const r = ceilingJob.calc({ sys: "tbar" });
    expect(hasRow(r, "Main tee")).toBe(true);
    expect(hasRow(r, "Cross tee 1.2")).toBe(true);
    expect(hasRow(r, "ฉากริมผนัง")).toBe(true);
    expect(hasRow(r, "ลวดแขวน")).toBe(true);
    expect(hasRow(r, "สกรูยิปซัม")).toBe(false);
    expect(hasRow(r, "ปูนฉาบรอยต่อ")).toBe(false);
    // แผ่น 60×120 ไม่มี Cross tee 0.6 ม.
    expect(hasRow(ceilingJob.calc({ sys: "tbar120" }), "Cross tee 0.6")).toBe(false);
  });

  it("job ยิปซัมต้องมีสกรู เทปผ้า และปูนฉาบรอยต่อครบ", () => {
    const r = ceilingJob.calc({ sys: "gyp" });
    expect(hasRow(r, "สกรูยิปซัม")).toBe(true);
    expect(hasRow(r, "เทปผ้า")).toBe(true);
    // 20 ตร.ม. × 0.5 กก./ตร.ม. = 10 กก.
    expect(numberIn(rowOf(r, "ปูนฉาบรอยต่อ"))).toBe(10);
    expect(hasRow(r, "ลวดแขวน")).toBe(false);
  });
});

describe("สี: ถัง 2.5 แกลลอน สภาพผนัง ฝ้า พื้นที่ที่รู้แล้ว", () => {
  it("จัดถัง: 2.09 แกลลอน → 3 แกลลอน (ค่าเดิม) หรือ 1 ถัง 2.5 แกลลอน เมื่อร้านมี", () => {
    expect(paintPacks(2.09, K.PAINT_PACKS.std).text).toBe("3 แกลลอน");
    expect(paintPacks(2.09, K.PAINT_PACKS.mid).text).toBe("1 ถัง 2.5 แกลลอน");
    // 4.18 → 2.5 + 2×1 = 4.5 (น้อยกว่าถัง 5) · 4.6 → ถัง 5 ใบเดียว · 7.3 → 5 + 2.5 = 7.5
    expect(paintPacks(4.18, K.PAINT_PACKS.mid).text).toBe("1 ถัง 2.5 แกลลอน + 2 แกลลอน");
    expect(paintPacks(4.6, K.PAINT_PACKS.mid).text).toBe("1 ถังใหญ่");
    expect(paintPacks(7.3, K.PAINT_PACKS.mid)).toMatchObject({ totalGal: 7.5, text: "1 ถังใหญ่ + 1 ถัง 2.5 แกลลอน" });
    // ค่าเดิมยังเหมือนรอบก่อน: 6.2 → 7 แกลลอน = 1 ถังใหญ่ + 2 แกลลอน · 0 → 0 แกลลอน
    expect(paintPacks(6.2, K.PAINT_PACKS.std).text).toBe("1 ถังใหญ่ + 2 แกลลอน");
    expect(paintPacks(0, K.PAINT_PACKS.std).text).toBe("0 แกลลอน");
  });

  it("ห้อง 3×4 สูง 2.6 ม.: ทับหน้า 2.09 แกลลอน สั่งเป็นถัง 2.5 แกลลอนได้ และบอกลิตร", () => {
    // ผนัง 2×(4+3)×2.6 = 36.4 − (1.8 + 1.2) = 33.4 ตร.ม. · ทับหน้า 33.4 × 2 ÷ 32 = 2.0875 แกลลอน
    const r = calcPaintQty({ l: 4, w: 3, h: 2.6, doors: 1, windows: 1, packs: "mid" });
    expect(rowOf(r, "สั่งทับหน้า")).toBe("1 ถัง 2.5 แกลลอน");
    // 2.5 × 3.785 = 9.46 ล. · รองพื้น 33.4 ÷ 30 = 1.11 → 2 แกลลอน = 7.57 ล.
    expect(rowOf(r, "ของที่สั่งคิดเป็นลิตร")).toBe("รองพื้น 2 แกลลอน (7.6 ล.) · ทับหน้า 1 ถัง 2.5 แกลลอน (9.5 ล.)");
  });

  it("job ค่าตั้งต้น (ทาทับสีเดิม) ไม่มีถุงสกิมโค้ท · ผนังปูนใหม่ห้อง 3×4 ได้ 7 ถุง", () => {
    const room = { l: 4, w: 3, h: 2.6, doors: 1, windows: 1 };
    const repaint = paintJob.calc(room);
    expect(rowOf(repaint, "สกิมโค้ท")).toContain("ไม่ต้องซื้อ");
    expect(hasRow(repaint, "ถุง 20 กก.")).toBe(false);
    // 33.4 × 1.8 × 2 = 120.24 กก. ÷ 20 = 6.01 → 7 ถุง
    expect(rowOf(paintJob.calc({ ...room, cond: "new" }), "สกิมโค้ท (ถุง 20 กก.)")).toBe("7 ถุง");
    expect(rowOf(paintJob.calc({ ...room, cond: "gyp" }), "สกิมโค้ท (ถุง 20 กก.)")).toBe("7 ถุง");
  });

  it("ทาฝ้าด้วย: พื้นที่รวม 33.4 + 12 = 45.4 ตร.ม. · กรอกพื้นที่เอง 64 ตร.ม. ใช้เลขนั้นตรง ๆ", () => {
    const room = { l: 4, w: 3, h: 2.6, doors: 1, windows: 1 };
    const withCeil = paintJob.calc({ ...room, ceil: true, cond: "new" });
    expect(rowOf(withCeil, "พื้นที่ฝ้า")).toBe("12.00 ตร.ม.");
    expect(rowOf(withCeil, "พื้นที่ทารวม")).toBe("45.40 ตร.ม.");
    // สกิม 45.4 × 3.6 = 163.44 กก. → 9 ถุง · ทับหน้า 45.4 × 2 ÷ 32 = 2.84 → 3 แกลลอน
    expect(rowOf(withCeil, "สกิมโค้ท (ถุง 20 กก.)")).toBe("9 ถุง");
    expect(rowOf(withCeil, "สั่งทับหน้า")).toBe("3 แกลลอน");
    // พื้นที่ที่รู้แล้ว 64 ตร.ม.: ทับหน้า 64 × 2 ÷ 32 = 4 แกลลอน · ไม่บวกฝ้าซ้ำแม้ติ๊กไว้
    const known = paintJob.calc({ ...room, area: 64, ceil: true });
    expect(rowOf(known, "พื้นที่ทา (กรอกเอง)")).toBe("64.00 ตร.ม.");
    expect(rowOf(known, "สั่งทับหน้า")).toBe("4 แกลลอน");
    expect(hasRow(known, "พื้นที่ฝ้า")).toBe(false);
  });

  it("วอลเปเปอร์นับเป็นแถบ: ห้อง 3×4 สูง 2.6 ม. = 9 ม้วน · สูง 3.4 ม. = 13 ม้วน", () => {
    // แนวผนัง 14 − 0.9 = 13.1 ม. ÷ 0.53 = 24.7 → 25 แถบ
    // สูง 2.6 + 0.1 = 2.7 ม. → ม้วน 10 ม. ได้ 3 แถบ → 25 ÷ 3 = 8.3 → 9 ม้วน (วิธีพื้นที่เดิมได้ 8)
    // สูง 3.4 + 0.1 = 3.5 ม. → ม้วนละ 2 แถบ → 25 ÷ 2 = 12.5 → 13 ม้วน (วิธีพื้นที่เดิมได้ 10)
    const a = calcWallpaper({ l: 4, w: 3, h: 2.6, doors: 1 });
    expect(numberIn(rowOf(a, "จำนวนแถบ"))).toBe(25);
    expect(rowOf(a, "ม้วนหนึ่งตัดได้")).toBe("3 แถบ");
    expect(rowOf(a, "จำนวนม้วน")).toBe("9 ม้วน");
    expect(rowOf(calcWallpaper({ l: 4, w: 3, h: 3.4, doors: 1 }), "จำนวนม้วน")).toBe("13 ม้วน");
  });

  it("ลายซ้ำทำให้แถบยาวขึ้น: สูง 2.4 ม. ลายเรียบ 7 ม้วน · ลายซ้ำ 53 ซม. 9 ม้วน", () => {
    // ลายเรียบ: 2.5 ม./แถบ → 4 แถบ/ม้วน → 25 ÷ 4 = 6.25 → 7
    // ลายซ้ำ 0.53: ปัดขึ้น(2.5 ÷ 0.53) = 5 ช่วง → 2.65 ม./แถบ → 3 แถบ/ม้วน → 9
    expect(rowOf(calcWallpaper({ l: 4, w: 3, h: 2.4, doors: 1 }), "จำนวนม้วน")).toBe("7 ม้วน");
    const rep = calcWallpaper({ l: 4, w: 3, h: 2.4, doors: 1, repeat: 53 });
    expect(rowOf(rep, "แถบละ")).toContain("2.65 ม.");
    expect(rowOf(rep, "จำนวนม้วน")).toBe("9 ม้วน");
  });

  it("ม้วนสั้นกว่าความสูงผนังต้องบอกตรง ๆ ไม่ใช่ตอบ Infinity", () => {
    const r = calcWallpaper({ l: 4, w: 3, h: 6, rollL: 5 });
    expect(r.invalid).toBe(true);
    expect(r.headline).toContain("สั้นกว่าแถบ");
  });

  it("เครื่องมือฉาบบางหาเจอด้วยคำว่าสกิมโค้ท/โป๊ว", () => {
    const skim = paintTools.find((t) => t.id === "skim");
    expect(skim?.name).toContain("สกิมโค้ท");
    expect(skim?.keywords).toContain("โป๊ว");
  });
});

describe("บิ้วอิน: ลามิเนตออกเป็นแผ่น 4×8 ฟุต", () => {
  it("ชิ้น 1.2×2.4 ม. 4 ชิ้น = 4 แผ่น (แผ่นละ 1 ชิ้น) ไม่ใช่ 12.67 ตร.ม. ลอย ๆ", () => {
    const r = calcLaminate({ w: 1.2, h: 2.4, qty: 4, waste: 10 });
    expect(rowStarting(r, "สั่งลามิเนต")).toBe("4 แผ่น");
    expect(r.headline).toBe("ลามิเนต 4 แผ่น (12.67 ตร.ม.)");
  });

  it("ชิ้น 0.6×0.8 ม. 10 ชิ้น: แผ่นหนึ่งตัดได้ 2×3 = 6 ชิ้น → 2 แผ่น", () => {
    // 1.22 ÷ 0.6 = 2 · 2.44 ÷ 0.8 = 3 → 6 ชิ้น/แผ่น (อีกทิศ 1 × 4 = 4) · 10 ÷ 6 = 1.67 → 2 แผ่น
    const r = calcLaminate({ w: 0.6, h: 0.8, qty: 10, waste: 10 });
    expect(rowStarting(r, "สั่งลามิเนต")).toBe("2 แผ่น");
    expect(rowOf(r, "วิธีนับ")).toContain("ตัดได้ 6 ชิ้น");
  });

  it("ชิ้นใหญ่กว่าแผ่น (1.5×3 ม.) นับตามพื้นที่และเตือนว่าต้องต่อแผ่น", () => {
    // 1.5 × 3 × 2 × 1.1 = 9.9 ตร.ม. ÷ 2.9768 = 3.33 → 4 แผ่น
    const r = calcLaminate({ w: 1.5, h: 3, qty: 2, waste: 10 });
    expect(rowStarting(r, "สั่งลามิเนต")).toBe("4 แผ่น");
    expect(hasRow(r, "ชิ้นงานใหญ่กว่าแผ่น")).toBe(true);
    expect(handymanTools.find((t) => t.id === "laminate")?.keywords).toContain("ไม้อัด");
  });
});

/* ═══════════════ งานระบบ ═══════════════ */

describe("แอร์: ท่อทองแดงเป็นหุน และ job ที่ยึดเครื่องที่ซื้อแล้ว", () => {
  it("1 หุน = 1/8 นิ้ว: 1/4\" = 2 หุน · 3/8\" = 3 หุน · 1/2\" = 4 หุน · 5/8\" = 5 หุน · 3/4\" = 6 หุน", () => {
    expect(copperHun('1/4"')).toBe('2 หุน (1/4")');
    expect(copperHun('3/8"')).toBe('3 หุน (3/8")');
    expect(copperHun('1/2"')).toBe('4 หุน (1/2")');
    expect(copperHun('5/8"')).toBe('5 หุน (5/8")');
    expect(copperHun('3/4"')).toBe('6 หุน (3/4")');
  });

  it("แอร์ 18,000 BTU ระยะ 8 ม.: ท่อ 2 หุน + 4 หุน และบอกความยาวที่ต้องซื้อ", () => {
    const r = calcPipe({ btu: 18000, run: 8 });
    expect(r.headline).toBe('ท่อทองแดง 2 หุน + 4 หุน (1/4" + 1/2") ยาว 8 ม.');
    expect(rowOf(r, "ท่อน้ำยาเหลว (ท่อเล็ก)")).toBe('2 หุน (1/4")');
    expect(rowOf(r, "ท่อดูด (ท่อใหญ่)")).toBe('4 หุน (1/2")');
    expect(rowOf(r, "ความยาวที่ต้องซื้อ")).toContain("ท่อคู่ 8 ม.");
  });

  it("job: ลูกค้าซื้อ 12,000 BTU มาแล้ว ระยะท่อ 9 ม. → คิดท่อ/น้ำยา/เบรกเกอร์ตามเครื่องนั้น และเตือนว่าเล็กกว่าห้อง", () => {
    // ห้อง 4×5 ห้องนั่งเล่น 800 BTU/ตร.ม. = 16,000 → ต้องการ 18,000 BTU
    // เครื่อง 12,000: ท่อ 2 หุน + 3 หุน · น้ำยา (9 − 5) × 20 ก./ม. = 80 ก. · เบรกเกอร์ 16 A
    const r = hvacJob.calc({ bought: "12000", run: 9 });
    expect(r.headline).toContain("12,000 BTU (ซื้อแล้ว)");
    expect(rowOf(r, "ขนาดที่ห้องต้องการ")).toBe("18,000 BTU");
    expect(rowOf(r, "ขนาดแอร์ที่ใช้คิด (ซื้อแล้ว)")).toContain("เล็กกว่าที่ห้องต้องการ");
    expect(rowOf(r, "ท่อทองแดง")).toBe('2 หุน + 3 หุน (1/4" + 3/8") ยาว 9 ม.');
    expect(numberIn(rowOf(r, "น้ำยา R32 เติมเพิ่ม"))).toBe(80);
    expect(rowOf(r, "เบรกเกอร์")).toBe("16 A");
  });

  it("job ค่าตั้งต้น: มีแถวท่อทองแดง และท่อ 4 ม. ไม่ต้องเติมน้ำยา", () => {
    const r = hvacJob.calc({});
    expect(rowOf(r, "ท่อทองแดง")).toBe('2 หุน + 4 หุน (1/4" + 1/2") ยาว 4 ม.');
    expect(rowOf(r, "น้ำยา R32 เติมเพิ่ม")).toContain("ไม่ต้องเติม");
  });

  it("ห้องใหญ่เกินแอร์ตัวเดียว แต่เลือกเครื่องที่ซื้อแล้ว → คิดต่อเครื่องได้ ไม่ติดบล็อก", () => {
    const r = hvacJob.calc({ w: 20, l: 20, bought: "36000", run: 20 });
    expect(r.invalid).toBeFalsy();
    expect(rowOf(r, "ขนาดแอร์ที่ใช้คิด (ซื้อแล้ว)")).toContain("หลายเครื่อง");
    // (20 − 5) × 20 = 300 ก.
    expect(numberIn(rowOf(r, "น้ำยา R32 เติมเพิ่ม"))).toBe(300);
  });
});

describe("ไฟฟ้า: job ขยับสายเมื่อแรงดันตก · โซลาร์ · แบตเป็นโมดูล", () => {
  it("ค่าตั้งต้น 15 A ระยะ 25 ม.: สาย 2.5 ตก 3.07% → ขยับเป็น 4 ตร.มม. (1.92%) หัวกับแถวตรงกัน", () => {
    // 2 × 25 × 15 × 0.0225 ÷ 2.5 = 6.75 V = 3.07% (เกิน 3%) · ÷ 4 = 4.22 V = 1.92%
    expect((vdropVolts(15, 25, 2.5, "1") / 220) * 100).toBeCloseTo(3.07, 2);
    const r = electricalJob.calc({});
    expect(r.headline).toBe("สาย 4 ตร.มม. · เบรกเกอร์ 20 A (ขยับสายกันแรงดันตก)");
    expect(rowOf(r, "ขนาดสายตามกระแส")).toBe("2.5 ตร.มม.");
    expect(rowOf(r, "ขนาดสายแนะนำ")).toMatch(/^4 ตร\.มม\./);
    expect(rowOf(r, "แรงดันตก (สาย 4 ตร.มม.)")).toBe("1.92 %");
    expect(rowOf(r, "สรุป")).toBe("ใช้สายนี้ได้");
  });

  it("ระยะสั้น 10 ม. ไม่ต้องขยับ: สาย 2.5 ตก 1.23%", () => {
    const r = electricalJob.calc({ len: 10 });
    expect(r.headline).toBe("สาย 2.5 ตร.มม. · เบรกเกอร์ 20 A");
    expect(rowOf(r, "แรงดันตก (สาย 2.5 ตร.มม.)")).toBe("1.23 %");
  });

  it("30 A ระยะ 150 ม.: สายตามกระแส 10 → ขยับถึง 35 ตร.มม. (25 ยังตก 3.68%)", () => {
    // 2 × 150 × 30 × 0.0225 = 202.5 → ÷25 = 8.1 V = 3.68% · ÷35 = 5.79 V = 2.63%
    const r = electricalJob.calc({ il: 30, len: 150 });
    expect(rowOf(r, "ขนาดสายตามกระแส")).toBe("10 ตร.มม.");
    expect(rowOf(r, "ขนาดสายแนะนำ")).toMatch(/^35 ตร\.มม\. \(ขยับจาก 10 /);
    expect(rowOf(r, "แรงดันตก (สาย 35 ตร.มม.)")).toBe("2.63 %");
  });

  it("ระยะ 1,000 ม.: สายใหญ่สุดในตารางยังตก 3.2% ต้องบอกว่าคิดไม่ได้ ไม่ใช่แนะนำสาย", () => {
    const r = electricalJob.calc({ len: 1000 });
    expect(r.invalid).toBe(true);
    expect(r.headline).toContain("ไกลเกิน");
  });

  it("โซลาร์: พื้นที่แผงตามกำลังแผง — 9 แผง 450 W = 20.7 ตร.ม. · 7 แผง 585 W = 20.9 ตร.ม.", () => {
    // 450 ÷ 196 = 2.296 ตร.ม./แผง × 9 = 20.66 · 585 ÷ 196 = 2.985 × 7 = 20.89 (ของเดิม 7 × 2.3 = 16.1)
    expect(rowOf(calcSolar({}), "พื้นที่หลังคา")).toMatch(/^20\.7 ตร\.ม\./);
    const big = calcSolar({ panel: 585 });
    expect(rowOf(big, "จำนวนแผง")).toMatch(/^7 แผง/);
    expect(rowOf(big, "พื้นที่หลังคา")).toMatch(/^20\.9 ตร\.ม\./);
  });

  it("โซลาร์ 1,500 หน่วย/เดือน = 31 แผง 13.95 kWp ต้องเตือนให้ตรวจเงื่อนไขการไฟฟ้า โดยไม่อ้างตัวเลขกฎหมาย", () => {
    // 1500 ÷ (4.5 × 30 × 0.8) = 13.89 kWp ÷ 0.45 = 30.9 → 31 แผง = 13.95 kWp
    const r = calcSolar({ kwh: 1500 });
    expect(rowOf(r, "จำนวนแผง")).toMatch(/^31 แผง/);
    const warn = rowOf(r, "ตรวจเงื่อนไขการไฟฟ้า");
    expect(warn).toContain("1 เฟส");
    expect(warn).not.toMatch(/ไม่เกิน|กฎหมาย|ระเบียบกำหนด/);
    expect(hasRow(calcSolar({}), "ตรวจเงื่อนไขการไฟฟ้า")).toBe(false);
    expect(K.SOLAR.singlePhaseCheckKw.source).toContain("ไม่ใช่ตัวเลขตามระเบียบ");
  });

  it("แบต: 116 Ah ที่ 24 V → 2 โมดูล × 100 Ah · 5,000 Wh ที่ 51.2 V = 136 Ah → 2 โมดูล · โมดูล 280 Ah → 1", () => {
    // 2000 ÷ 0.72 = 2,778 Wh ÷ 24 = 115.7 Ah → 2 × 100 Ah = 200 Ah = 4.80 kWh
    expect(rowOf(calcBattery({}), "ซื้อเป็นโมดูล")).toBe("2 โมดูล × 100 Ah = 200 Ah (4.80 kWh)");
    // 5000 ÷ 0.72 = 6,944 Wh ÷ 51.2 = 135.6 Ah → 2 โมดูล = 10.24 kWh
    const li = calcBattery({ wh: 5000, volt: "51.2" });
    expect(rowOf(li, "ความจุ")).toBe("136 Ah @ 51.2 V");
    expect(rowOf(li, "ซื้อเป็นโมดูล")).toBe("2 โมดูล × 100 Ah = 200 Ah (10.24 kWh)");
    expect(rowOf(calcBattery({ wh: 5000, volt: "51.2", modAh: 280 }), "ซื้อเป็นโมดูล")).toMatch(/^1 โมดูล/);
    // แรงดันนอกรายการต้องไม่ผ่าน
    expect(calcBattery({ volt: "36" }).invalid).toBe(true);
  });
});

describe("ประปา: ปั๊มเป็นวัตต์ ขั้นแรงม้าที่มีขาย ความลาดจากท่อน้ำทิ้ง", () => {
  it("ปั๊มบ้าน 40 ล./นาที เฮด 18 ม. ต้องการ 257 วัตต์ (0.34 HP) ตอบวัตต์นำ", () => {
    // (40/60) × 9.80665 × 18 × 1.2 ÷ 0.55 = 256.8 W = 0.344 HP → ขั้น 0.5 HP
    const r = calcPump({ q: 40, h: 18 });
    expect(r.headline).toBe("ปั๊มกำลังไม่ต่ำกว่า 257 วัตต์ (เทียบขั้น 0.5 HP)");
    expect(rowOf(r, "กำลังที่ต้องการ")).toBe("257 วัตต์ (0.34 HP)");
  });

  it("200 ล./นาที เฮด 40 ม. = 3.82 HP → 5 HP ไม่ใช่ “4.00 HP” ที่ไม่มีขาย", () => {
    // (200/60) × 9.80665 × 40 × 1.2 ÷ 0.55 = 2,853 W ÷ 746 = 3.82 HP → ขั้นถัดไป 5 HP = 3,730 W
    const r = calcPump({ q: 200, h: 40 });
    expect(r.headline).toBe("ปั๊มประมาณ 5 HP (ต้องการ 2,853 วัตต์)");
    expect(rowOf(r, "ปั๊มแนะนำ")).toBe("5 HP (3,730 วัตต์)");
    expect(K.PUMP_HP_SIZES).not.toContain(4);
    // ปลายช่วงฟอร์ม 500 ล./นาที × 100 ม. = 23.9 HP → 25 HP ยังอยู่ในขั้นที่มี
    expect(calcPump({ q: 500, h: 100 }).headline).toContain("25 HP");
  });

  it("ป้ายช่องเฮดรวมไม่เขียน Flow + Head แล้ว", () => {
    const pump = plumbingTools.find((t) => t.id === "pump");
    const head = pump?.fields.find((f) => f.key === "h");
    expect(head?.label).not.toContain("Flow");
    expect(head?.label).toContain("เฮดรวม");
  });

  it("job: ท่อน้ำดี 40 ม. ไม่ทำให้ท่อน้ำทิ้ง “ตก 80 ซม.” — ความลาดคิดจากช่องยาวท่อน้ำทิ้ง", () => {
    // ท่อน้ำทิ้ง 8 ม. (ค่าตั้งต้น) ÷ 50 = 16 ซม. · 12 ม. ÷ 50 = 24 ซม.
    const a = plumbingJob.calc({ len: 40 });
    expect(rowStarting(a, "ท่อน้ำทิ้ง 8 ม.")).toBe("16.0 ซม.");
    expect(rowStarting(plumbingJob.calc({ len: 40, drainLen: 12 }), "ท่อน้ำทิ้ง 12 ม.")).toBe("24.0 ซม.");
  });
});
