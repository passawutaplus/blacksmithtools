/**
 * รอบ 4 — ช่างไม้และพื้นไม้ · ช่างดินและถมที่ · ช่างสวนและพื้นภายนอก
 * ค่าที่คาดหวังทุกตัวคิดแยกด้วยมือ/สคริปต์อิสระ (python3 -I) แล้วจดวิธีคิดไว้ในคอมเมนต์ของแต่ละเคส
 */
import { describe, expect, it } from "vitest";

import * as K from "../constants";
import { getToolCover, PILLARS, searchCatalog, TOOLS_WITHOUT_COVER, TRADE_ICONS, TRADES } from "../catalog";
import type { CalcResult } from "../types";
import { areaFromThai, calcDig, calcFill } from "../tools/earth";
import { calcPaver, calcRain, calcSod, calcSprinkler, pickTank } from "../tools/landscape";
import { boardRows, calcCladding, calcDeck, calcTimber, cutStock } from "../tools/wood";

function rowOf(r: CalcResult, label: string): string {
  return r.rows.find((x) => x.label === label)?.value ?? "";
}

function rowStarting(r: CalcResult, prefix: string): string {
  return r.rows.find((x) => x.label.startsWith(prefix))?.value ?? "";
}

/* ═══════════════ ไม้กี่ลูกบาศก์ฟุต ═══════════════ */

describe("ไม้กี่ลูกบาศก์ฟุต", () => {
  it("2 × 4 นิ้ว ยาว 4 ม. 10 ท่อน ราคา 800 บาท/ลบ.ฟ.", () => {
    // 4 ÷ 0.3048 = 13.1234 ฟุต · 2 × 4 ÷ 144 × 13.1234 = 0.72908 ต่อท่อน × 10 = 7.29076 ลบ.ฟ.
    // ลบ.ม. = 0.0508 × 0.1016 × 4 × 10 = 0.2064512 · ค่าไม้ 7.29076 × 800 = 5,832.60
    const r = calcTimber({ price: 800 });
    expect(r.invalid).toBeFalsy();
    expect(r.headline).toBe('ไม้ 2" × 4" ยาว 4 ม. × 10 ท่อน = 7.29 ลบ.ฟ. · 5,833 บาท');
    expect(rowOf(r, "รวม (คิดเป๊ะ)")).toBe("7.291 ลบ.ฟ. = 0.2065 ลบ.ม.");
    // ทางลัด 2 × 4 × 4 × 3.28 ÷ 144 × 10 = 7.28889 → น้อยกว่า 0.00187 ลบ.ฟ. = (3.28 × 0.3048 − 1) = −0.0256%
    expect(rowOf(r, "ร้านคิด 1 ม. = 3.28 ฟุต")).toBe("7.289 ลบ.ฟ. · น้อยกว่าคิดเป๊ะ 0.002 ลบ.ฟ. (0.03%)");
    expect(rowOf(r, "ค่าไม้ (800 บาท/ลบ.ฟ.)")).toBe("5,833 บาท");
    // 7.28889 × 800 = 5,831.11 → ถูกกว่า 1.49 บาท
    expect(rowOf(r, "ถ้าร้านคิดแบบทางลัด")).toBe("5,831 บาท · ถูกกว่า 1 บาท");
    expect(r.explain?.risk).toBe("A");
  });

  it("หน้าตัด 1 × 12 นิ้ว ยาว 12 ฟุต (3.6576 ม.) = 1 ลบ.ฟ. พอดีตามนิยาม", () => {
    const r = calcTimber({ t: 1, w: 12, len: 3.6576, pcs: 1 });
    expect(rowOf(r, "รวม (คิดเป๊ะ)")).toBe("1.000 ลบ.ฟ. = 0.0283 ลบ.ม.");
    expect(K.WOOD.cuFtM3.value).toBeCloseTo(0.028316846592, 12);
  });

  it("ไม่ใส่ราคาไม่มีแถวเงิน", () => {
    const r = calcTimber({});
    expect(r.headline).toBe('ไม้ 2" × 4" ยาว 4 ม. × 10 ท่อน = 7.29 ลบ.ฟ.');
    expect(r.rows.some((x) => x.label.startsWith("ค่าไม้"))).toBe(false);
  });
});

/* ═══════════════ ระแนง / ไม้ฝา ═══════════════ */

describe("ตัวนับแถวและตัดแผ่น", () => {
  it("แถว = ปัดขึ้น((S + g) ÷ (bw + g)) — n แถวคลุมได้ไม่น้อยกว่า S และ n − 1 แถวไม่พอ", () => {
    // (2 + 0.01) ÷ 0.11 = 18.27 → 19 · 19 × 0.10 + 18 × 0.01 = 2.08 ≥ 2 · 18 แถว = 1.97 < 2
    expect(boardRows(2, 0.1, 0.01)).toBe(19);
    // ทับซ้อน: (3 − 0.03) ÷ (0.20 − 0.03) = 17.47 → 18
    expect(boardRows(3, 0.2, -0.03)).toBe(18);
    // พอดีเป๊ะ: 10 แผ่น 10 ซม. ไม่มีร่อง = 1 ม.
    expect(boardRows(1, 0.1, 0)).toBe(10);
  });

  it("แถวยาว 4 ม. จากแผ่น 3 ม.: เต็ม 1 + เศษ 1 ม. (แผ่นใหม่ตัดได้ 3 ท่อน)", () => {
    // 19 × 1 + ปัดขึ้น(19 ÷ 3) = 19 + 7 = 26
    expect(cutStock(19, 4, 3)).toMatchObject({ k: 1, perStock: 3, count: 26 });
    // แถวยาวเท่าแผ่นพอดี ไม่มีเศษ
    expect(cutStock(28, 3, 3)).toMatchObject({ k: 1, r: 0, count: 28 });
    // แถวสั้น 2 ม. จากเส้น 6 ม. ได้ 3 ท่อน/เส้น: ปัดขึ้น(8 ÷ 3) = 3
    expect(cutStock(8, 2, 6)).toMatchObject({ k: 0, perStock: 3, count: 3 });
  });
});

describe("ระแนง / ไม้ฝา / WPC", () => {
  it("ค่าตั้งต้น: ระแนงนอน 4 × 2 ม. หน้า 10 ซม. ร่อง 1 ซม. แผ่น 3 ม. โครงทุก 60 ซม.", () => {
    // แถว 19 · แผ่น 26 × 1.05 = 27.3 → 28 · โครง ปัดขึ้น(4 ÷ 0.6) + 1 = 8 แนว × 2 ม. → เส้น 6 ม. 3 เส้น
    // สกรู 19 × 8 × 2 = 304
    const r = calcCladding({});
    expect(r.headline).toBe("ระแนง 28 แผ่น (ยาว 3 ม.) · โครง 3 เส้น · สกรู 304 ตัว");
    expect(rowStarting(r, "จำนวนแถว")).toBe("19 แถว คลุมได้ 2.080 ม. (ต้องการ 2 ม.)");
    expect(rowOf(r, "แผ่นตามแบบ")).toBe("26 แผ่น (แถวยาว 4 ม.)");
    expect(rowOf(r, "โครงเคร่าทุก 60 ซม.")).toBe("8 แนว × 2 ม. = 16.0 ม.");
  });

  it("คลิปซ่อน = (แถว + 1) × แนวโครง", () => {
    // (19 + 1) × 8 = 160
    const r = calcCladding({ fixing: "clip" });
    expect(rowOf(r, "คลิปซ่อน (แถว + 1) × แนวโครง")).toBe("160 ตัว");
  });

  it("ไม้ฝาซ้อนเกล็ดแนวตั้ง 3 × 2.6 ม. หน้า 20 ซม. ทับ 3 ซม.", () => {
    // แถว (3 − 0.03) ÷ 0.17 = 17.47 → 18 · คลุม 18 × 0.2 − 17 × 0.03 = 3.09 ม.
    // แถวยาว 2.6 จากแผ่น 3 → 1 ท่อน/แผ่น = 18 × 1.05 = 18.9 → 19
    // โครงนอน ปัดขึ้น(2.6 ÷ 0.6) + 1 = 6 แนว × 3 ม. → เส้น 6 ม. ได้ 2 ท่อน → 3 เส้น · ตะปู 18 × 6 × 1 = 108
    const r = calcCladding({ mode: "lap", dir: "vertical", W: 3, H: 2.6, bw: 20 });
    expect(r.headline).toBe("ไม้ฝา 19 แผ่น (ยาว 3 ม.) · โครง 3 เส้น · สกรู 108 ตัว");
    expect(rowStarting(r, "จำนวนแถว")).toBe("18 แถว คลุมได้ 3.090 ม. (ต้องการ 3 ม.)");
  });

  it("ทับซ้อนกว้างกว่าหน้าไม้ฝา ต้องตอบว่าคิดไม่ได้", () => {
    expect(calcCladding({ mode: "lap", bw: 3, lap: 4 }).invalid).toBe(true);
  });
});

/* ═══════════════ พื้นเดค ═══════════════ */

describe("พื้นเดคระเบียง", () => {
  it("ค่าตั้งต้น: 3 × 4 ม. ไม้ 14 ซม. ร่อง 5 มม. แผ่น 3 ม. ตงทุก 30 ซม. รองทุก 1 ม. คลิป", () => {
    // แถว (3 + 0.005) ÷ 0.145 = 20.72 → 21 · แผ่น 21 + ปัดขึ้น(21 ÷ 3) = 28 × 1.05 = 29.4 → 30
    // ตง ปัดขึ้น(4 ÷ 0.3) + 1 = 15 ตัว × 3 ม. → เส้น 6 ม. ได้ 2 → 8 เส้น · จุดรอง 15 × (3 + 1) = 60
    // คลิป (21 + 1) × 15 = 330
    const r = calcDeck({});
    expect(r.headline).toBe("ไม้พื้น 30 แผ่น · ตง 8 เส้น · จุดรอง 60 จุด");
    expect(rowOf(r, "คลิปซ่อน (แถว + 1) × ตง")).toBe("330 ตัว");
    expect(r.explain?.risk).toBe("B");
  });

  it("ไม้พื้นวิ่งตามด้านกว้าง: แถว 28 แผ่นยาวพอดี 3 ม. ตง 11 ตัวยาว 4 ม.", () => {
    // แถว (4 + 0.005) ÷ 0.145 = 27.62 → 28 · แผ่น 28 × 1.05 = 29.4 → 30
    // ตง ปัดขึ้น(3 ÷ 0.3) + 1 = 11 → เส้น 6 ม. ได้ 1 ท่อน (4 ม.) = 11 เส้น · จุดรอง 11 × (4 + 1) = 55 · คลิป 29 × 11 = 319
    const r = calcDeck({ dir: "alongW" });
    expect(r.headline).toBe("ไม้พื้น 30 แผ่น · ตง 11 เส้น · จุดรอง 55 จุด");
    expect(rowOf(r, "คลิปซ่อน (แถว + 1) × ตง")).toBe("319 ตัว");
  });

  it("เดคยกสูง: ขึ้นว่าต้องให้วิศวกร ชั้นความเสี่ยง C พร้อมข้อความสงวนสิทธิ์ · สกรู 21 × 15 × 2", () => {
    const r = calcDeck({ height: "raised", fixing: "screw" });
    expect(r.headline?.startsWith("โครงสร้างต้องให้วิศวกร")).toBe(true);
    expect(r.explain?.risk).toBe("C");
    expect(r.explain?.caveats).toContain(K.DISCLAIMER_C);
    expect(rowOf(r, "สกรู 2 ตัว/จุด × 315 จุด")).toBe("630 ตัว");
  });

  it("คลิปซ่อนกับร่องศูนย์ ต้องเตือน", () => {
    expect(rowOf(calcDeck({ gap: 0 }), "ข้อควรระวัง")).toContain("คลิปซ่อนไม่ได้");
  });
});

/* ═══════════════ ถมดิน ═══════════════ */

describe("ถมดินกี่คิว / กี่เที่ยวรถ", () => {
  it("ไร่-งาน-ตร.วา ตามนิยาม", () => {
    expect(areaFromThai(1, 0, 0)).toBe(1600);
    expect(areaFromThai(0, 1, 50)).toBe(600);
    expect(areaFromThai(2, 3, 25)).toBe(3200 + 1200 + 100);
  });

  it("ค่าตั้งต้น: 200 ตร.ม. ถมสูง 50 ซม. ดินถม × 1.3 รถ 10 ล้อ 12 คิว", () => {
    // บดอัด 200 × 0.5 = 100 คิว · หลวม 130 คิว · ปัดขึ้น(130 ÷ 12 = 10.83) = 11 เที่ยว สุดท้าย 130 − 120 = 10
    const r = calcFill({});
    expect(r.headline).toBe("สั่งดินถมทั่วไป 130.0 คิว (ดินหลวม) · รถ 10 ล้อ 11 เที่ยว");
    expect(rowOf(r, "ดินหลวมที่ต้องสั่ง (คิวรถ)")).toBe("130.00 คิว");
    expect(rowOf(r, "รถ 10 ล้อ (เที่ยวละ 12 คิว)")).toBe("11 เที่ยว (เต็ม 10 เที่ยว + เที่ยวสุดท้าย 10 คิว)");
    expect(r.chart).toMatchObject({ kind: "packs", count: 11 });
    // สมมติฐานตัวคูณต้องเขียนให้เห็น
    expect(r.explain?.assumptions?.[0]).toContain("ตัวคูณ 1.3");
  });

  it("1 งาน 50 ตร.วา ถมสูง 1 ม. = 600 คิวบดอัด → 780 คิวหลวม = 65 เที่ยวพอดี", () => {
    const r = calcFill({ areaMode: "rai", rai: 0, ngan: 1, wa: 50, depth: 1 });
    expect(rowOf(r, "พื้นที่")).toBe("0 ไร่ 1 งาน 50 ตร.วา = 600.00 ตร.ม.");
    expect(rowOf(r, "รถ 10 ล้อ (เที่ยวละ 12 คิว)")).toBe("65 เที่ยว (เต็ม 64 เที่ยว + เที่ยวสุดท้าย 12 คิว)");
  });

  it("แก้ตัวคูณและคิวรถได้ · ราคาต่อเที่ยว", () => {
    // ลูกรัง 100 × 0.3 = 30 × 1.2 = 36 คิว ÷ 6 ล้อ 4 คิว = 9 เที่ยว × 1,500 = 13,500 บาท
    const r = calcFill({ area: 100, depth: 0.3, soil: "laterite", fLaterite: 1.2, truck: "six", cap6: 4, price: 1500 });
    expect(rowOf(r, "ดินหลวมที่ต้องสั่ง (คิวรถ)")).toBe("36.00 คิว");
    expect(rowOf(r, "รถ 6 ล้อ (เที่ยวละ 4 คิว)")).toBe("9 เที่ยว (เต็ม 8 เที่ยว + เที่ยวสุดท้าย 4 คิว)");
    expect(rowOf(r, "ค่าดิน+ขน (1,500 บาท/เที่ยว)")).toBe("13,500 บาท");
  });

  it("ไร่-งาน-วา เป็นศูนย์ทั้งหมด ต้องตอบว่าคิดไม่ได้", () => {
    expect(calcFill({ areaMode: "rai", rai: 0, ngan: 0, wa: 0 }).invalid).toBe(true);
  });
});

/* ═══════════════ ขุดดิน ═══════════════ */

describe("ขุดดิน / ขนทิ้ง", () => {
  it("ค่าตั้งต้น: ร่อง 20 ม. × 40 × 60 ซม. ดินทั่วไป × 1.25 รถ 6 ล้อ 5 คิว", () => {
    // 20 × 0.4 × 0.6 = 4.8 คิว × 1.25 = 6.0 คิว ÷ 5 = 2 เที่ยว
    const r = calcDig({});
    expect(r.headline).toBe("ดินขุด 4.80 คิว → ขนทิ้ง 6.0 คิว (ดินหลวม) · รถ 6 ล้อ 2 เที่ยว");
  });

  it("หลุมสี่เหลี่ยม 1 × 1 × 1.5 ม. 10 หลุม ดินเหนียว × 1.3", () => {
    // 15 คิว × 1.3 = 19.5 ÷ 5 = 3.9 → 4 เที่ยว · ลึก 1.5 ม. ไม่เกินเกณฑ์ (ต้องเกิน 1.5)
    const r = calcDig({ shape: "pit", count: 10, soil: "clay" });
    expect(rowOf(r, "ดินเดิมที่ขุดออก")).toBe("15.000 คิว");
    expect(rowOf(r, "ดินหลวมที่ต้องขนทิ้ง")).toBe("19.50 คิว");
    expect(rowOf(r, "รถ 6 ล้อ (เที่ยวละ 5 คิว)")).toBe("4 เที่ยว (เต็ม 3 เที่ยว + เที่ยวสุดท้าย 4.5 คิว)");
    expect(r.explain?.risk).toBe("A");
  });

  it("หลุมกลม Ø 80 ซม. ลึก 1.2 ม. 6 หลุม เก็บถมกลับครึ่งหนึ่ง", () => {
    // π × 0.8² ÷ 4 × 1.2 × 6 = 3.6191 · ขนทิ้ง 3.6191 × 0.5 × 1.25 = 2.2619
    const r = calcDig({ shape: "round", count: 6, keep: 50 });
    expect(rowOf(r, "ดินเดิมที่ขุดออก")).toBe("3.619 คิว");
    expect(rowOf(r, "ดินหลวมที่ต้องขนทิ้ง")).toBe("2.26 คิว");
    expect(rowOf(r, "รถ 6 ล้อ (เที่ยวละ 5 คิว)")).toBe("1 เที่ยว (2.26 คิว)");
  });

  it("เก็บถมกลับทั้งหมด ไม่มีเที่ยวรถ · ลึกเกิน 1.5 ม. ขึ้นเตือนดินพัง", () => {
    const keep = calcDig({ keep: 100 });
    expect(keep.headline).toContain("ไม่ต้องขนทิ้ง");
    expect(keep.chart).toBeUndefined();
    const deep = calcDig({ shape: "pit", pd: 2 });
    expect(deep.tip).toContain("ดินพัง");
    expect(deep.explain?.risk).toBe("B");
  });
});

/* ═══════════════ ปูหญ้า ═══════════════ */

describe("ปูหญ้า", () => {
  it("ค่าตั้งต้น: 50 ตร.ม. แผ่น 20 × 40 ซม. ปูชิด เผื่อ 5% ทราย 3 ซม.", () => {
    // 50 ÷ 0.08 = 625 × 1.05 = 656.25 → 657 · ทราย 50 × 0.03 = 1.5 × 1.25 = 1.875
    const r = calcSod({});
    expect(r.headline).toBe("หญ้าแผ่น 657 แผ่น · ทราย 1.88 คิว");
    expect(rowStarting(r, "แผ่น 20 × 40 ซม.")).toBe("12.50 แผ่น/ตร.ม.");
    // 657 × 0.08 = 52.56
    expect(rowOf(r, "ถ้าร้านขายเป็นตร.ม.")).toBe("52.56 ตร.ม. ของหญ้า");
  });

  it("ปูเว้นร่อง 5 ซม.", () => {
    // 50 ÷ (0.25 × 0.45) = 444.44 × 1.05 = 466.67 → 467
    expect(rowStarting(calcSod({ gap: 5 }), "หญ้าที่ซื้อ")).toBe("467 แผ่น");
  });
});

/* ═══════════════ บล็อกปูพื้น ═══════════════ */

describe("บล็อกปูพื้น / อิฐตัวหนอน", () => {
  it("ค่าตั้งต้น: ตัวหนอน 40 ก้อน/ตร.ม. 20 ตร.ม. ทราย 5 ซม. ขอบ 18 ม. ชิ้นละ 0.5 ม.", () => {
    // 800 × 1.05 = 840 · ทราย 1.0 × 1.25 = 1.25 · ขอบ 18 ÷ 0.5 = 36
    const r = calcPaver({});
    expect(r.headline).toBe("อิฐตัวหนอน 840 ก้อน · ทราย 1.25 คิว · ขอบ 36 ชิ้น");
  });

  it("บล็อก 10 × 20 ซม. ร่อง 3 มม.", () => {
    // 20 ÷ (0.103 × 0.203) = 956.53 × 1.05 = 1,004.35 → 1,005
    const r = calcPaver({ block: "rect", joint: 3 });
    expect(rowStarting(r, "บล็อก 10 × 20 ซม. รวมเผื่อ")).toBe("1,005 ก้อน");
    // ปูชิด 50 ก้อน/ตร.ม. พอดี
    expect(rowStarting(calcPaver({ block: "rect" }), "ก้อนต่อ ตร.ม.")).toBe("50 ก้อน");
  });
});

/* ═══════════════ สปริงเกอร์ ═══════════════ */

describe("สปริงเกอร์", () => {
  it("ค่าตั้งต้น: สนาม 8 × 10 ม. รัศมี 4 ม. หัวถึงหัว 10 ล./นาที", () => {
    // แถว (ปัดขึ้น(8/4) + 1) × (ปัดขึ้น(10/4) + 1) = 3 × 4 = 12 · มุม 4 ขอบ 2(1) + 2(2) = 6 กลาง 1 × 2 = 2
    // น้ำ 10 × (4/4 + 6/2 + 2) = 60 ล./นาที · 60 × 60 ÷ 80 = 45 มม./ชม. · 5 มม. ÷ 45 × 60 = 6.67 นาที
    const r = calcSprinkler({});
    expect(r.headline).toBe("หัวสปริงเกอร์ 12 หัว · น้ำรวม 60.0 ล./นาที");
    expect(rowOf(r, "แยกตามมุมพ่น")).toBe("มุม 90° 4 · ขอบ 180° 6 · กลาง 360° 2");
    expect(rowOf(r, "อัตราน้ำลงสนาม")).toBe("45.0 มม./ชม.");
    expect(rowOf(r, "รดให้ได้ 5 มม.")).toBe("เปิดราว 6.7 นาที");
  });

  it("สนาม 5 × 5 ม. รัศมี 5 ม.: 4 หัวมุม น้ำรวมเท่าหัวเต็มวง 1 หัว", () => {
    const r = calcSprinkler({ W: 5, L: 5, R: 5 });
    expect(rowOf(r, "หัวทั้งหมด")).toBe("4 หัว");
    expect(r.headline).toBe("หัวสปริงเกอร์ 4 หัว · น้ำรวม 10.0 ล./นาที");
  });
});

/* ═══════════════ เก็บน้ำฝน ═══════════════ */

describe("เก็บน้ำฝนจากหลังคา", () => {
  it("ค่าตั้งต้น: หลังคา 100 ตร.ม. ฝน 30 มม. เมทัลชีท 0.9 ใช้วันละ 200 สำรอง 7 วัน", () => {
    // 100 × 30 × 0.9 = 2,700 ลิตร · 13.5 วัน · ต้องเก็บ min(2,700, 1,400) = 1,400 → ถัง 1,500
    const r = calcRain({});
    expect(r.headline).toBe("น้ำฝน 2,700 ลิตรต่อครั้ง · ถังแนะนำ 1,500 ลิตร");
    expect(rowOf(r, "ใช้วันละ 200 ลิตร")).toBe("น้ำก้อนนี้พอใช้ 13.5 วัน");
    expect(r.chart).toMatchObject({ kind: "steps", need: 1400 });
  });

  it("น้ำที่เก็บได้น้อยกว่าที่อยากสำรอง: ถังตามน้ำที่เก็บได้", () => {
    // 20 × 10 × 0.8 = 160 ลิตร → ถัง 500
    const r = calcRain({ area: 20, rainEvent: 10, roof: "tile" });
    expect(rowOf(r, "ขนาดถังที่ควรเก็บ")).toBe("160 ลิตร (เท่าน้ำที่เก็บได้)");
    expect(rowOf(r, "ถังแนะนำ")).toBe("500 ลิตร");
  });

  it("เกินถังใหญ่สุด: หลายใบ", () => {
    // 200 × 300 × 0.9 = 54,000 ลิตร/เดือน · สำรอง 1,000 × 10 = 10,000 → 2 × 5,000
    const r = calcRain({ area: 200, period: "month", rainMonth: 300, daily: 1000, days: 10 });
    expect(rowOf(r, "น้ำที่เก็บได้ต่อเดือน")).toBe("54,000 ลิตร (54.00 ลบ.ม.)");
    expect(rowOf(r, "ถังแนะนำ")).toBe("2 ใบ × 5,000 ลิตร");
    expect(r.chart).toBeUndefined();
    expect(pickTank(5000)).toEqual({ size: 5000, count: 1 });
    expect(pickTank(5001)).toEqual({ size: 5000, count: 2 });
  });
});

/* ═══════════════ ทะเบียน + ค้นหา ═══════════════ */

describe("ลงทะเบียนหมวดงานภายนอกและสายงานใหม่", () => {
  it("หมวดงานภายนอกอยู่ก่อนเครื่องมือทั่วไป", () => {
    const ids = PILLARS.map((p) => p.id);
    expect(ids.indexOf("outdoor")).toBe(ids.indexOf("general") - 1);
    expect(PILLARS.find((p) => p.id === "outdoor")).toEqual({ id: "outdoor", name: "งานภายนอกและที่ดิน", blurb: "ถมดิน สวน พื้นภายนอก" });
  });

  it("ช่างไม้อยู่ถัดจากกระจกในงานตกแต่ง · ดินและสวนอยู่หมวดงานภายนอก · มีไอคอนทุกสาย", () => {
    const ids = TRADES.map((t) => t.id);
    expect(ids.indexOf("wood")).toBe(ids.indexOf("curtain") + 1);
    const byId = (id: string) => TRADES.find((t) => t.id === id)!;
    expect(byId("wood").pillarId).toBe("finish");
    expect(byId("earth").pillarId).toBe("outdoor");
    expect(byId("landscape").pillarId).toBe("outdoor");
    expect(byId("wood").tools.map((t) => t.id)).toEqual(["timber", "cladding", "deck"]);
    expect(byId("earth").tools.map((t) => t.id)).toEqual(["fill", "dig"]);
    expect(byId("landscape").tools.map((t) => t.id)).toEqual(["sod", "paver", "sprinkler", "rain"]);
    for (const id of ["wood", "earth", "landscape"]) expect(TRADE_ICONS[id], id).toBeDefined();
  });

  it("เครื่องมือใหม่ไม่มีปกที่ชี้ไฟล์ไม่มีอยู่", () => {
    for (const trade of ["wood", "earth", "landscape"]) {
      for (const tool of TRADES.find((t) => t.id === trade)!.tools) {
        expect(TOOLS_WITHOUT_COVER, `${trade}/${tool.id}`).toContain(`${trade}/${tool.id}`);
        expect(getToolCover(trade, tool.id), `${trade}/${tool.id}`).toBeUndefined();
      }
    }
  });

  it.each([
    ["ลูกบาศก์ฟุต", "wood/timber"],
    ["ระแนง", "wood/cladding"],
    ["wpc", "wood/cladding"],
    ["เดค", "wood/deck"],
    ["ถมดิน", "earth/fill"],
    ["รถ 10 ล้อ", "earth/fill"],
    ["ขุดหลุม", "earth/dig"],
    ["หญ้าแผ่น", "landscape/sod"],
    ["ตัวหนอน", "landscape/paver"],
    ["สปริงเกอร์", "landscape/sprinkler"],
    ["น้ำฝน", "landscape/rain"],
  ])("ค้น “%s” ต้องเจอ %s", (q, id) => {
    expect(searchCatalog(q).tools.map((t) => `${t.tradeId}/${t.id}`)).toContain(id);
  });

  it("ค่าตลาดที่ยังไม่ได้เทียบของจริงต้องติดป้าย “ยังไม่ยืนยัน” ในที่มา", () => {
    const unverified = [
      K.WOOD.shopFtPerM,
      K.CLADDING.boardW,
      K.CLADDING.gap,
      K.CLADDING.lap,
      K.CLADDING.boardLen,
      K.CLADDING.battenSpacing,
      K.CLADDING.screwsSlat,
      K.CLADDING.screwsLap,
      ...Object.values(K.DECK).filter((c) => c !== K.DECK.screws),
      ...Object.values(K.EARTH_FILL).map((s) => s.factor),
      ...Object.values(K.EARTH_SWELL).map((s) => s.factor),
      ...Object.values(K.DIRT_TRUCK).map((t) => t.cap),
      K.SOD.pieceW,
      K.SOD.pieceL,
      K.SOD.sandCm,
      K.PAVER.wormPerM2,
      K.PAVER.rectW,
      K.PAVER.rectL,
      K.PAVER.sandCm,
      K.PAVER.kerbLen,
      K.SPRINKLER.radius,
      K.SPRINKLER.flow,
      K.SPRINKLER.depthMm,
      ...Object.values(K.RAIN_ROOF).map((r) => r.coef),
    ];
    for (const c of unverified) expect(c.source, c.label).toContain("ยังไม่ยืนยัน");
  });
});
