/**
 * ล็อกตัวอย่างคำนวณของเครื่องมือใหม่สายงานตกแต่ง (รอบ 3, 2026-11-25)
 * ช่างกันซึม · ห้องน้ำทั้งห้อง · แบ่งแผ่นหาศูนย์ปู · ระบบสีตามผิว · ผนังเบา · ตู้บิ้วอินจากขนาด
 * ทุกตัวเลขคิดมือไว้ในคอมเมนต์ของแต่ละเคส ถ้าค่าคงที่ใน constants.ts เปลี่ยน เทสนี้ต้องพังและต้องคิดใหม่
 */
import { describe, expect, it } from "vitest";

import { getTrade, searchCatalog, TOOL_COVERS, TRADE_ICONS, TRADES } from "../catalog";
import * as K from "../constants";
import type { CalcResult } from "../types";
import { calcPartition, studsPerLine, wallScrewsPerBoard } from "../tools/ceiling";
import { calcCabinet, calcHingeQty, slideFor } from "../tools/handyman";
import { calcPaintSystem, solventPacks } from "../tools/paint";
import { calcBathroom, calcLayout, centreLayout } from "../tools/tile";
import { calcWpBathroom, calcWpCrack, calcWpRoof, waterproofJob } from "../tools/waterproof";

function row(r: CalcResult, label: string): string {
  return r.rows.find((x) => x.label === label)?.value ?? "";
}

function rowStarting(r: CalcResult, prefix: string): string {
  return r.rows.find((x) => x.label.startsWith(prefix))?.value ?? "";
}

function hasRow(r: CalcResult, part: string): boolean {
  return r.rows.some((x) => x.label.includes(part));
}

/* ═══════════════ ช่างกันซึม ═══════════════ */

describe("กันซึมห้องน้ำ", () => {
  it("ห้อง 2×2.5 ม. ประตู 1 ขอบ 30 ซม. โซนอาบน้ำ 1.8 ม. สูง 180 ซม.: 10.16 ตร.ม. → ซีเมนต์กันซึม 2 ชุด ตาข่าย 12.1 ม.", () => {
    // รอบห้อง 9 − ประตู 0.8 = ผนัง 8.2 ม.
    // ขอบ (8.2 − 1.8) × 0.3 = 1.92 · โซนอาบน้ำ 1.8 × 1.8 = 3.24 · พื้น 5 → รวม 10.16 ตร.ม.
    // 10.16 × 1.5 × 2 เที่ยว × 1.10 = 33.528 กก. ÷ 20 = 1.68 → 2 ชุด
    // ตาข่าย 8.2 + 4 × 0.3 + 1 × (1.8 − 0.3) + 3 × 0.4 = 12.1 ม. → 1 ม้วน (50 ม.)
    const r = calcWpBathroom({});
    expect(r.invalid).toBeFalsy();
    expect(row(r, "พื้นที่ทากันซึมรวม")).toBe("10.16 ตร.ม.");
    expect(row(r, "เนื้อกันซึม 2 เที่ยว")).toBe("33.5 กก. (รวมเผื่อ 10%)");
    expect(rowStarting(r, "ซีเมนต์กันซึม")).toBe("2 ชุด");
    expect(row(r, "เทปตาข่ายเสริมมุม")).toBe("12.1 ม. = 1 ม้วน (ม้วนละ 50 ม.)");
    expect(row(r, "ไพรเมอร์")).toContain("ไม่ใช้");
    expect(r.explain?.risk).toBe("B");
  });

  it("เปลี่ยนเป็น PU: 15.6 กก. = 1 ถัง + ไพรเมอร์ 2.0 ล. = 1 แกลลอน และเตือนโรยทรายใต้กระเบื้อง", () => {
    // 10.16 × 0.7 × 2 × 1.1 = 15.646 กก. → 1 ถัง 20 กก. · ไพรเมอร์ 10.16 × 0.2 = 2.032 ล. → 1 แกลลอน
    const r = calcWpBathroom({ product: "pu" });
    expect(rowStarting(r, "PU กันซึม")).toBe("1 ถัง");
    expect(rowStarting(r, "ไพรเมอร์")).toBe("2.0 ล. = 1 แกลลอน");
    expect(r.explain?.caveats?.some((c) => c.includes("โรยทราย"))).toBe(true);
  });

  it("ผนังโซนอาบน้ำยาวกว่าผนังห้อง ต้องตอบว่าคิดไม่ได้ ไม่หนีบค่าเงียบ", () => {
    // ห้อง 1×1 ประตู 1: ผนัง 4 − 0.8 = 3.2 ม. < โซนอาบน้ำ 3.5 ม.
    const r = calcWpBathroom({ w: 1, l: 1, showerRun: 3.5 });
    expect(r.invalid).toBe(true);
    expect(r.headline).toContain("ยาวกว่าผนัง");
  });
});

describe("กันซึมดาดฟ้า", () => {
  it("ดาดฟ้า 6×8 ขอบ 30 ซม. PU 2 เที่ยว: 56.4 ตร.ม. → 5 ถัง ไพรเมอร์ 3 แกลลอน ตาข่าย 30 ม.", () => {
    // 48 + 28 × 0.3 = 56.4 ตร.ม. · 56.4 × 0.7 × 2 × 1.1 = 86.856 กก. ÷ 20 = 4.34 → 5 ถัง
    // ไพรเมอร์ 56.4 × 0.2 = 11.28 ล. ÷ 3.785 = 2.98 → 3 แกลลอน · ตาข่าย 28 + 4 × 0.3 + 2 × 0.4 = 30 ม.
    const r = calcWpRoof({});
    expect(row(r, "พื้นที่ทารวม")).toBe("56.40 ตร.ม.");
    expect(rowStarting(r, "PU กันซึม")).toBe("5 ถัง");
    expect(rowStarting(r, "ไพรเมอร์")).toBe("11.3 ล. = 3 แกลลอน");
    expect(row(r, "เทปตาข่ายเสริมมุม")).toBe("30.0 ม. = 1 ม้วน (ม้วนละ 50 ม.)");
  });

  it("ปูผ้าใยเต็มพื้นที่: 56.4 × 1.10 = 62.04 ตร.ม. → 2 ม้วน (50 ตร.ม.)", () => {
    expect(row(calcWpRoof({ mesh: "full" }), "ผ้าใยเสริมแรงปูเต็ม")).toBe("62.0 ตร.ม. = 2 ม้วน (ม้วนละ 50 ตร.ม.)");
  });

  it("อะคริลิก 3 เที่ยว ไม่มีขอบผนัง: 48 × 0.35 × 3 × 1.1 = 55.44 กก. → 3 ถัง ไพรเมอร์ 7.2 ล. → 2 แกลลอน", () => {
    const r = calcWpRoof({ product: "acrylic", coats: 3, up: 0 });
    expect(row(r, "พื้นที่ทารวม")).toBe("48.00 ตร.ม.");
    expect(rowStarting(r, "อะคริลิกกันซึม")).toBe("3 ถัง");
    expect(rowStarting(r, "ไพรเมอร์")).toBe("7.2 ล. = 2 แกลลอน");
    // ไม่มีขอบ เหลือตาข่ายรอบท่อระบาย 2 × 0.4 = 0.8 ม.
    expect(row(r, "เทปตาข่ายเสริมมุม")).toBe("0.8 ม. = 1 ม้วน (ม้วนละ 50 ม.)");
  });
});

describe("ซ่อมรอยร้าว", () => {
  it("ร้าว 5 ม. เซาะร่อง 6×6 มม.: 207 มล. → 1 หลอด 280 มล. ตาข่าย 1 ม้วน กันซึมทาทับ 1.5 กก.", () => {
    // 5 × 6 × 6 = 180 มล. × 1.15 = 207 มล. · แนวทาทับ 5 × 0.2 = 1 ตร.ม. × 0.7 × 2 × 1.1 = 1.54 กก.
    const r = calcWpCrack({});
    expect(row(r, "หลอด 280 มล.")).toBe("1 หลอด");
    expect(row(r, "เทปตาข่ายทับแนวร้าว")).toBe("5 ม. = 1 ม้วน");
    expect(rowStarting(r, "กันซึมทาทับแนว")).toBe("1.00 ตร.ม. ≈ 1.5 กก.");
  });

  it("ร่องกว้าง 15 ลึก 10 มม. ยาว 10 ม.: 1,725 มล. → 7 หลอด และต้องใส่โฟมเส้นรองร่อง", () => {
    // 10 × 15 × 10 = 1,500 × 1.15 = 1,725 มล. ÷ 280 = 6.16 → 7 หลอด · ร่อง 15 > 12 มม.
    const r = calcWpCrack({ len: 10, gw: 15, gd: 10 });
    expect(row(r, "หลอด 280 มล.")).toBe("7 หลอด");
    expect(hasRow(r, "backer rod")).toBe(true);
  });

  it("ร้าวลายงาไม่ต้องซื้อยาอุด · ร้าวกว้างให้วิศวกรดูก่อน", () => {
    const hair = calcWpCrack({ type: "hair" });
    expect(row(hair, "ยาอุด")).toContain("ไม่ต้องเซาะร่อง");
    expect(hair.chart).toBeUndefined();
    expect(calcWpCrack({ type: "wide" }).headline).toMatch(/^ให้วิศวกรดูก่อน/);
  });

  it("หน้าคิดทั้งงาน: ร้าว 3 ม. ใส่แถวอุดร้าวไว้ก่อนกันซึม (3 × 6 × 6 × 1.15 = 124 มล. → 1 หลอด)", () => {
    const r = waterproofJob.calc({ crackLen: 3 });
    expect(r.invalid).toBeFalsy();
    expect(r.rows[0].label).toBe("อุดร้าว: หลอด 280 มล.");
    expect(r.rows[0].value).toBe("1 หลอด");
    expect(rowStarting(r, "PU กันซึม")).toBe("5 ถัง");
    expect(waterproofJob.calc({}).rows.some((x) => x.label.startsWith("อุดร้าว"))).toBe(false);
  });
});

/* ═══════════════ กระเบื้อง ═══════════════ */

describe("แบ่งแผ่น / หาศูนย์เริ่มปู", () => {
  it("ห้อง 3.2 ม. แผ่น 60 ร่อง 2 มม.: กลางแผ่นได้เศษ 9.4 ซม. (เล็กกว่า 1/3) → แนะนำกลางร่อง เศษ 39.5 ซม.", () => {
    // กลางแผ่น: s = 1.6 − 0.3 = 1.3 · n = ปัดลง(1.3 ÷ 0.602) = 2 · เศษ = 1.3 − 1.204 − 0.002 = 0.094 ม. · เต็ม 2×2+1 = 5
    // กลางร่อง: s = 1.6 + 0.001 = 1.601 · n = 2 · เศษ = 1.601 − 1.204 − 0.002 = 0.395 ม. · เต็ม 4
    // ชนผนัง: n = ปัดลง(3.202 ÷ 0.602) = 5 · เศษ = 3.202 − 3.010 − 0.002 = 0.190 ม.
    // ตรวจรวม: 4 × 0.6 + 5 ร่อง × 0.002 + 2 × 0.395 = 3.2 ม.
    const r = calcLayout({});
    expect(r.headline).toBe("เศษริมเล็กไป — เปลี่ยนเป็นร่องยาแนวทับเส้นกลางห้อง");
    expect(row(r, "เริ่มกลางแผ่นทับเส้นกลางห้อง")).toBe("เต็ม 5 แผ่น + เศษริมข้างละ 9.4 ซม.");
    expect(row(r, "ถ้าเริ่มร่องยาแนวทับเส้นกลางห้อง")).toBe("เต็ม 4 แผ่น + เศษริมข้างละ 39.5 ซม.");
    expect(row(r, "ถ้าเริ่มชนผนังด้านหนึ่ง")).toBe("เต็ม 5 แผ่น + เศษริมด้านเดียว 19.0 ซม.");
    expect(r.tip).toContain("39.5 ซม.");
  });

  it("เลือกกลางร่องอยู่แล้วเศษใหญ่พอ: ไม่เตือน", () => {
    const r = calcLayout({ mode: "joint" });
    expect(r.headline).toBe("ร่องยาแนวทับเส้นกลางห้อง: เต็ม 4 แผ่น + เศษริมข้างละ 39.5 ซม.");
    expect(r.tip).not.toContain("เล็กกว่า 1/3");
  });

  it("แกนคำนวณ: ลงพอดี ห้องแคบกว่าแผ่น และระยะเว้นชิดผนัง", () => {
    // 3 แผ่น + 2 ร่อง = 1.804 ม. → กลางแผ่นลงพอดี ไม่มีเศษ
    expect(centreLayout(1.804, 0.6, 0.002, "tile")).toEqual({ full: 3, cuts: [] });
    // 3.0 ม. กลางร่อง: s = 1.501 · n = 2 · เศษ = 1.501 − 1.204 − 0.002 = 0.295
    const j = centreLayout(3, 0.6, 0.002, "joint");
    expect(j.full).toBe(4);
    expect(j.cuts[0]).toBeCloseTo(0.295, 9);
    // ห้อง 0.5 ม. แผ่น 0.6: แผ่นกลางต้องตัดเหลือ 0.5
    expect(centreLayout(0.5, 0.6, 0.002, "tile")).toEqual({ full: 0, cuts: [0.5] });
    const narrow = calcLayout({ len: 0.5 });
    expect(narrow.invalid).toBeFalsy();
    expect(row(narrow, "เริ่มกลางแผ่นทับเส้นกลางห้อง")).toBe("ห้องแคบกว่าแผ่น ตัดแผ่นเดียวเหลือ 50.0 ซม.");
    // เว้นข้างละ 10 มม.: ระยะปู 3.18 ม.
    expect(row(calcLayout({ gap: 10 }), "ระยะปูจริง")).toBe("318.0 ซม. (หักเว้นชิดผนังข้างละ 10 มม.)");
  });
});

describe("ห้องน้ำทั้งห้อง (พื้น + ผนัง)", () => {
  it("ห้อง 2×2.5 ปูผนังสูง 2.4 พื้น 30×30 ผนัง 30×60: ได้ใบสั่งของตามลำดับงาน", () => {
    // พื้น 5 ตร.ม. · ผนัง 9 × 2.4 − 0.8 × 2.0 = 20 ตร.ม.
    // กันซึม: เหมือนเครื่องมือกันซึมห้องน้ำ = 2 ชุด
    // ปูนกาว (5 × 3 + 20 × 4) × 1.1 = 104.5 กก. → 6 ถุง 20 กก.
    // พื้น 30×30: วางแถว 6 × 8 = 48 + แถวริม 9 + 3 = 60 แผ่น (มากกว่าพื้นที่ 59) ÷ 11 = 6 กล่อง
    // ผนัง 20 ÷ 0.18 × 1.10 = 122.2 → 123 แผ่น ÷ 8 = 16 กล่อง
    // ยาแนว: พื้น (600 ÷ 90,000) × 8 × 2 × 1.6 = 0.1707 · ผนัง (900 ÷ 180,000) × 8 × 2 × 1.6 = 0.128 กก./ตร.ม.
    //        (5 × 0.1707 + 20 × 0.128) × 1.1 = 3.75 กก. → 4 ถุง 1 กก.
    // คิ้ว (9 − 0.8) = 8.2 ม. ÷ 2.5 = 4 เส้น · ลาด: กลางห้อง √(1² + 1.25²) = 1.60 ม. × 1% = 1.6 ซม.
    const r = calcBathroom({});
    expect(r.invalid).toBeFalsy();
    expect(r.headline).toBe("พื้น 6 กล่อง · ผนัง 16 กล่อง · ปูนกาว 6 ถุง");
    expect(row(r, "พื้นที่พื้น / ผนังที่ปู")).toBe("5.00 / 20.00 ตร.ม.");
    expect(rowStarting(r, "1. กันซึม: ซีเมนต์กันซึม")).toBe("2 ชุด");
    expect(row(r, "2. ปูนกาว (ถุง 20 กก.)")).toBe("6 ถุง (104.5 กก.)");
    expect(row(r, "3. กระเบื้องพื้น 30×30")).toBe("60 แผ่น = 6 กล่อง");
    expect(row(r, "4. กระเบื้องผนัง 30×60")).toBe("123 แผ่น = 16 กล่อง (เผื่อ 10%)");
    expect(row(r, "5. ยาแนว (ถุง 1 กก.)")).toBe("4 ถุง (3.75 กก.)");
    expect(row(r, "6. คิ้วจบขอบบน (เส้นละ 2.5 ม.)")).toBe("8.20 ม. = 4 เส้น");
    expect(row(r, "ความลาดพื้นเข้าท่อ")).toBe("1% · จุดไกลสุด 1.60 ม. สูงกว่าปากท่อ 1.6 ซม.");
    // ลำดับแถวต้องตรงลำดับงานจริง: กันซึม → ปูนกาว → พื้น → ผนัง → ยาแนว → คิ้ว
    const order = ["1. กันซึม", "2. ปูนกาว", "3. กระเบื้องพื้น", "4. กระเบื้องผนัง", "5. ยาแนว", "6. คิ้ว"].map((p) =>
      r.rows.findIndex((x) => x.label.startsWith(p)),
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(r.explain?.risk).toBe("B");
  });

  it("ปูแค่พื้น ไม่คิดกันซึม ท่ออยู่มุมห้อง: ปูนกาว 16.5 กก. → 1 ถุง ลาด 3.2 ซม. ชั้นความเสี่ยง A", () => {
    // ปูนกาว 5 × 3 × 1.1 = 16.5 กก. · มุมห้อง √(2² + 2.5²) = 3.20 ม. × 1% = 3.2 ซม.
    const r = calcBathroom({ tileH: 0, wp: false, drain: "corner" });
    expect(row(r, "4. กระเบื้องผนัง")).toBe("ไม่ปูผนัง");
    expect(row(r, "2. ปูนกาว (ถุง 20 กก.)")).toBe("1 ถุง (16.5 กก.)");
    expect(hasRow(r, "คิ้วจบขอบบน")).toBe(false);
    expect(row(r, "1. กันซึม")).toContain("ไม่คิด");
    expect(row(r, "ความลาดพื้นเข้าท่อ")).toContain("สูงกว่าปากท่อ 3.2 ซม.");
    expect(r.explain?.risk).toBe("A");
  });

  it("หักช่องเปิดจนไม่เหลือผนัง ต้องตอบว่าคิดไม่ได้", () => {
    // ผนัง 9 × 0.3 = 2.7 − ประตู 0.8 × 0.3 = 0.24 − 2.5 = −0.04 ตร.ม.
    expect(calcBathroom({ tileH: 0.3, deductWall: 2.5 }).invalid).toBe(true);
  });
});

/* ═══════════════ สี ═══════════════ */

describe("ระบบสีตามผิว", () => {
  it("ปูนใหม่ 30 ตร.ม.: รองพื้นกันด่าง 3.75 ล. → 1 แกลลอน · ทับหน้า 2 เที่ยว 7.06 ล. → 2 แกลลอน", () => {
    // 30 × 1 ÷ 8 = 3.75 ล. = 0.99 แกลลอน → 1 · 30 × 2 ÷ 8.5 = 7.06 ล. = 1.87 แกลลอน → 2
    const r = calcPaintSystem({});
    expect(r.headline).toBe("ปูนใหม่: รองพื้นปูนใหม่กันด่าง 1 เที่ยว + สีน้ำอะคริลิกภายใน 2 เที่ยว");
    expect(row(r, "สั่งรองพื้น")).toBe("1 แกลลอน (3.8 ล.)");
    expect(row(r, "สั่งทับหน้า")).toBe("2 แกลลอน (7.6 ล.)");
    expect(r.explain?.risk).toBe("B");
  });

  it("กำหนดทับหน้า 3 เที่ยว ภายนอก: 30 × 3 ÷ 8.5 = 10.59 ล. = 2.80 แกลลอน → 3 แกลลอน", () => {
    const r = calcPaintSystem({ topCoats: 3, loc: "out" });
    expect(r.headline).toContain("สีน้ำอะคริลิกภายนอก 3 เที่ยว");
    expect(row(r, "สั่งทับหน้า")).toBe("3 แกลลอน (11.4 ล.)");
  });

  it("เหล็กชุบกัลวาไนซ์ 40 ตร.ม.: รองพื้น 1 แกลลอน + กระป๋อง 1/4 · สีน้ำมัน 2 แกลลอน · เตือนห้ามเรดออกไซด์", () => {
    // รองพื้น 40 ÷ 10 = 4 ล. = 1.057 แกลลอน → 1 แกลลอน + เศษ 0.057 → 1 กระป๋อง 1/4
    // ทับหน้า 40 × 2 ÷ 12 = 6.67 ล. = 1.761 แกลลอน → 1 แกลลอน + เศษต้อง 4 กระป๋อง (≥ 3) → ซื้อแกลลอนแทน = 2 แกลลอน
    const r = calcPaintSystem({ surface: "galv", area: 40 });
    expect(row(r, "สั่งรองพื้น")).toBe("1 แกลลอน + 1 กระป๋อง 1/4 แกลลอน (4.7 ล.)");
    expect(row(r, "สั่งทับหน้า")).toBe("2 แกลลอน (7.6 ล.)");
    expect(r.explain?.caveats?.some((c) => c.includes("เรดออกไซด์"))).toBe(true);
  });

  it("เหล็กใช้กันสนิม 2 เที่ยว: 12 × 2 ÷ 10 = 2.4 ล. = 0.63 แกลลอน → ต้อง 3 กระป๋อง 1/4 จึงซื้อ 1 แกลลอน", () => {
    const r = calcPaintSystem({ surface: "steel", area: 12 });
    expect(rowStarting(r, "รองพื้น: รองพื้นกันสนิม")).toBe("2 เที่ยว · 2.4 ล.");
    expect(row(r, "สั่งรองพื้น")).toBe("1 แกลลอน (3.8 ล.)");
  });

  it("แพ็กสีน้ำมัน: 1.5 → 1 แกลลอน + 2 กระป๋อง 1/4 · 0.2 → 1 กระป๋อง · 0 → 0 แกลลอน", () => {
    expect(solventPacks(1.5).text).toBe("1 แกลลอน + 2 กระป๋อง 1/4 แกลลอน");
    expect(solventPacks(0.2).text).toBe("1 กระป๋อง 1/4 แกลลอน");
    expect(solventPacks(0).text).toBe("0 แกลลอน");
  });
});

/* ═══════════════ ผนังเบา ═══════════════ */

describe("ผนังเบา C-stud / U-track", () => {
  it("ผนัง 4 × 2.6 ม. ระยะ 60 สองด้าน ชั้นเดียว ประตู 1: C-stud 10 · U-track 3 · ยิปซัม 7 แผ่น", () => {
    // แนว C-stud = ปัดขึ้น(4 ÷ 0.6) + 1 + 2 = 7 + 1 + 2 = 10 แนว · สูง 2.6 ≤ เส้น 3 ม. → 10 เส้น
    // U-track 2 × 4 = 8 ม. ÷ 3 = 2.67 → 3 เส้น
    // ผิว 4 × 2.6 − 0.9 × 2.0 = 8.6 ตร.ม. × 2 ด้าน × 1.1 ÷ 2.88 = 6.57 → 7 แผ่น
    // สกรู/แผ่น = (1.2 ÷ 0.6 + 1) × (ปัดขึ้น(2.4 ÷ 0.25) + 1) = 3 × 11 = 33 → 231 ตัว
    // เทป: ด้านละ (ปัดขึ้น(4 ÷ 1.2) − 1) × 2.6 + 4 × 1 = 7.8 + 4 = 11.8 → 2 ด้าน 23.6 ม.
    // ปูนฉาบรอยต่อ 8.6 × 2 × 0.5 = 8.6 กก. → 1 ถุง · พุกยึดราง 2 × (ปัดขึ้น(4 ÷ 0.6) + 1) = 16
    const r = calcPartition({});
    expect(r.headline).toBe("C-stud 10 เส้น · U-track 3 เส้น · ยิปซัม 7 แผ่น");
    expect(row(r, "C-stud (ระยะ 60 ซม.)")).toBe("10 แนว × 1 = 10 เส้น (เส้นละ 3 ม.)");
    expect(row(r, "U-track บน + ล่าง")).toBe("8.0 ม. = 3 เส้น");
    expect(row(r, "สกรูยิงแผ่น")).toBe("231 ตัว ≈ 1 กล่อง (33 ตัว/แผ่น)");
    expect(row(r, "พุก/ตะปูยิงยึดราง")).toBe("16 ตัว (ทุก 0.6 ม.)");
    expect(row(r, "เทปปิดรอยต่อ")).toBe("23.6 ม. = 1 ม้วน");
    expect(row(r, "ปูนฉาบรอยต่อ")).toBe("8.6 กก. = 1 ถุง");
    expect(r.explain?.risk).toBe("B");
  });

  it("ระยะ 40 แผ่น 2 ชั้น สูง 3.5 ม.: C-stud ต่อเส้น 26 เส้น ยิปซัม 19 แผ่น สกรู 44 ตัว/แผ่น", () => {
    // แนว = 10 + 1 + 2 = 13 · สูง 3.5 > 3 → 1 + ปัดขึ้น(0.5 ÷ 2.7) = 2 เส้น/แนว → 26 เส้น
    // ผิว 4 × 3.5 − 1.8 = 12.2 × 2 ด้าน × 2 ชั้น × 1.1 = 53.68 ÷ 2.88 = 18.64 → 19 แผ่น
    // สกรู/แผ่น (1.2 ÷ 0.4 + 1) × 11 = 44 → 836 ตัว
    const r = calcPartition({ spacing: "40", layers: "2", h: 3.5 });
    expect(row(r, "C-stud (ระยะ 40 ซม.)")).toBe("13 แนว × 2 = 26 เส้น (เส้นละ 3 ม.)");
    expect(row(r, "แผ่นยิปซัม 2 ด้าน 2 ชั้น")).toBe("19 แผ่น");
    expect(row(r, "สกรูยิงแผ่น")).toBe("836 ตัว ≈ 1 กล่อง (44 ตัว/แผ่น)");
    expect(hasRow(r, "ผนังสูง")).toBe(false);
  });

  it("สูงเกิน 3.6 ม. เตือนเช็กตารางผู้ผลิต · ประตูกว้างเกินผนัง ต้องตอบว่าคิดไม่ได้", () => {
    expect(hasRow(calcPartition({ h: 4 }), "ผนังสูง")).toBe(true);
    // ประตู 2 × 0.9 = 1.8 ม. ≥ ผนัง 1.5 ม.
    expect(calcPartition({ l: 1.5, doors: 2 }).invalid).toBe(true);
  });

  it("ตัวช่วย: เส้นต่อแนวและสกรูต่อแผ่น", () => {
    expect(studsPerLine(2.6, 3)).toBe(1);
    expect(studsPerLine(3, 3)).toBe(1);
    // 6 ม. เส้น 3 ม. ทับต่อ 0.3: 1 + ปัดขึ้น(3 ÷ 2.7) = 3
    expect(studsPerLine(6, 3)).toBe(3);
    expect(wallScrewsPerBoard(0.6)).toBe(33);
    expect(wallScrewsPerBoard(0.4)).toBe(44);
  });
});

/* ═══════════════ ตู้บิ้วอิน ═══════════════ */

describe("ตู้บิ้วอินจากขนาด", () => {
  it("ตู้ 120×200×60 ซม. ไม้ 16 มม. 3 ชั้น 2 บาน: ไม้ 4 แผ่น แผ่นบาง 1 ลามิเนต 3 ขอบ 22.3 ม. บานพับ 8", () => {
    // กว้างใน 1.2 − 0.032 = 1.168
    // ข้าง 2 × 2 × 0.6 = 2.4 · บน-ล่าง 2 × 1.168 × 0.6 = 1.4016 · ชั้น 3 × 1.168 × 0.6 = 2.1024 · บาน 1.2 × 2 = 2.4
    // รวม 8.304 × 1.15 = 9.55 ÷ 2.9768 = 3.21 → 4 แผ่น · หลังตู้ 2.4 × 1.15 ÷ 2.9768 = 0.93 → 1 แผ่น
    // ลามิเนต 2 × 2.4 + 2.4 = 7.2 × 1.15 ÷ 2.9768 = 2.78 → 3 แผ่น
    // ขอบ (2×2 + 2×1.168 + 3×1.168) + (2×1.2 + 2×2×2) = 9.84 + 10.4 = 20.24 × 1.1 = 22.26 ม.
    // บานสูง 2,000 มม. → 4 ตัว/บาน × 2 = 8
    const r = calcCabinet({});
    expect(r.headline).toBe("ไม้ 16 มม. 4 แผ่น + แผ่นบาง 1 แผ่น · ลามิเนต 3 แผ่น");
    expect(rowStarting(r, "ไม้หนา 16 มม.")).toBe("4 แผ่น (8.30 ตร.ม. + เผื่อ 15%)");
    expect(row(r, "ขอบ PVC")).toBe("22.3 ม. (รวมเผื่อ 10%)");
    expect(row(r, "บานพับถ้วย")).toBe("8 ตัว (บานสูง 200 ซม. บานละ 4 ตัว)");
    expect(row(r, "หมุดรับชั้น")).toBe("12 ตัว");
    expect(r.explain?.risk).toBe("A");
  });

  it("เพิ่มลิ้นชัก 3 ลิ้น: บานเหลือสูง 140 ซม. บานพับ 6 ราง 550 มม. แผ่นบาง 2 ขอบ 40.2 ม.", () => {
    // ลิ้นชัก 3 × 0.2 = 0.6 ม. → บานสูง 1.4 ม. → 3 ตัว/บาน × 2 = 6 · ลึก 600 − 10 = 590 → ราง 550
    // กล่องลิ้นชัก 3 × 2 × (0.55 + 1.168) × 0.15 = 1.5462 · บาน 1.2 × 1.4 = 1.68 · หน้าลิ้นชัก 1.2 × 0.6 = 0.72
    // ไม้รวม 2.4 + 1.4016 + 2.1024 + 1.68 + 0.72 + 1.5462 = 9.8502 × 1.15 ÷ 2.9768 = 3.81 → 4 แผ่น
    // แผ่นบาง 2.4 + 3 × 1.168 × 0.55 = 4.3272 × 1.15 ÷ 2.9768 = 1.67 → 2 แผ่น
    // ขอบ 9.84 + (2.4 + 4 × 1.4) + 3 × 2 × 1.4 + 3 × 2 × 1.718 = 9.84 + 8 + 8.4 + 10.308 = 36.548 × 1.1 = 40.2 ม.
    const r = calcCabinet({ drawers: 3 });
    expect(row(r, "บานพับถ้วย")).toBe("6 ตัว (บานสูง 140 ซม. บานละ 3 ตัว)");
    expect(row(r, "รางลิ้นชัก")).toBe("3 ชุด ยาว 550 มม.");
    expect(row(r, "แผ่นบาง หลังตู้/พื้นลิ้นชัก")).toBe("2 แผ่น (4.33 ตร.ม.)");
    expect(row(r, "ขอบ PVC")).toBe("40.2 ม. (รวมเผื่อ 10%)");
    expect(row(r, "มือจับ")).toBe("5 ตัว");
  });

  it("ลิ้นชักสูงรวมเกินตู้ ต้องตอบว่าคิดไม่ได้ · ตู้สูงเกิน 2.44 ม. เตือนต่อแผ่น", () => {
    // ตู้ 30 ซม. ข้างในเหลือ 30 − 3.2 = 26.8 ซม. < ลิ้นชัก 2 × 20 = 40 ซม.
    expect(calcCabinet({ h: 30, drawers: 2 }).invalid).toBe(true);
    expect(hasRow(calcCabinet({ h: 260 }), "แผ่นยาวเกิน")).toBe(true);
  });

  it("เลือกรางลิ้นชักแบบเดียวกับตัวคิดบานพับ + ราง (ไม่เปลี่ยนพฤติกรรมเดิม)", () => {
    expect(slideFor(450)).toBe(400);
    expect(slideFor(600)).toBe(550);
    expect(slideFor(255)).toBe(250);
    expect(calcHingeQty({}).headline).toBe("บานพับ 4 ตัว · ราง 400 มม.");
  });
});

/* ═══════════════ แคตตาล็อก + ค่าคงที่ ═══════════════ */

describe("ลงทะเบียนสายงานกันซึมและเครื่องมือใหม่", () => {
  it("ช่างกันซึมอยู่ถัดจากงานสี ในหมวดงานโครงสร้าง มีไอคอน และไม่มีปกที่ชี้ไฟล์ไม่มีอยู่", () => {
    const ids = TRADES.map((t) => t.id);
    expect(ids.indexOf("waterproof")).toBe(ids.indexOf("paint") + 1);
    const wp = getTrade("waterproof")!;
    expect(wp.pillarId).toBe("shell");
    expect(wp.tools.map((t) => t.id)).toEqual(["bathroom", "roof", "crack"]);
    expect(wp.job).toBeDefined();
    expect(TRADE_ICONS.waterproof).toBeDefined();
    expect(TOOL_COVERS["waterproof/roof"]).toBeUndefined();
  });

  it.each([
    ["กันซึม", "waterproof/bathroom"],
    ["ดาดฟ้า", "waterproof/roof"],
    ["รอยร้าว", "waterproof/crack"],
    ["ห้องน้ำ", "tile/bathroom"],
    ["หาศูนย์", "tile/layout"],
    ["กันสนิม", "paint/system"],
    ["ผนังเบา", "ceiling/partition"],
    ["C-stud", "ceiling/partition"],
    ["ตู้เสื้อผ้า", "handyman/cabinet"],
  ])("ค้น “%s” ต้องเจอ %s", (q, id) => {
    expect(searchCatalog(q).tools.map((t) => `${t.tradeId}/${t.id}`)).toContain(id);
  });

  it("ค้น “กันซึม” ยังเจอซิลิโคนในสายกระจกเหมือนเดิม และเจอสายงานกันซึม", () => {
    expect(searchCatalog("กันซึม").tools.map((t) => `${t.tradeId}/${t.id}`)).toContain("glass/sealant");
    expect(searchCatalog("กันซึม").trades.map((t) => t.id)).toContain("waterproof");
  });

  it("ค่าตลาดที่ยังไม่ได้เทียบของจริงต้องติดป้าย “ยังไม่ยืนยัน” ในที่มา", () => {
    const unverified = [
      ...Object.values(K.WATERPROOF_PRODUCTS).flatMap((p) => [p.rate, p.pack, ...(p.primer ? [p.primer] : [])]),
      K.WATERPROOF.meshRoll,
      K.WATERPROOF.fabricRoll,
      K.BATHROOM.floorPerBox,
      K.BATHROOM.wallPerBox,
      K.BATHROOM.trimBar,
      ...Object.values(K.PAINT_COVER),
      K.PAINT_QUARTER,
      K.PARTITION.stock,
      K.PARTITION.screwBox,
      K.GYP_FINISH.tapeRoll,
      K.GYP_FINISH.compoundBag,
    ];
    for (const c of unverified) expect(c.source, c.label).toContain("ยังไม่ยืนยัน");
  });
});
