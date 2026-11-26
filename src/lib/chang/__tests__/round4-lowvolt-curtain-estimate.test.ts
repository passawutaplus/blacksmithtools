/**
 * รอบ 4 — สายงานใหม่: กล้องวงจรปิดและเน็ต · ผ้าม่าน · ประมาณราคาและใบเสนอราคา
 * ค่าที่คาดหวังทุกตัวคิดแยกด้วยสคริปต์อิสระ (python3 -I, เงินใช้ Decimal ROUND_HALF_UP) แล้วจดวิธีคิดไว้ในคอมเมนต์
 */
import { describe, expect, it } from "vitest";

import * as K from "../constants";
import { getTrade, searchCatalog, TOOLS_WITHOUT_COVER, TRADE_ICONS, TRADES } from "../catalog";
import type { CalcResult } from "../types";
import { calcFov, calcHdd, calcLan, calcPoe, gbPerCamDay, hfovDeg, pickHdd, poeClassFor } from "../tools/lowvolt";
import { calcBlind, calcCurtainFabric } from "../tools/curtain";
import {
  allocate,
  calcInstalments,
  calcLabour,
  calcMarkup,
  calcQuote,
  calcVatWht,
  parsePctList,
  roundHalfUp,
  splitVatIncluded,
  toSatang,
} from "../tools/estimate";

function rowOf(r: CalcResult, label: string): string {
  return r.rows.find((x) => x.label === label)?.value ?? "";
}

function rowStarting(r: CalcResult, prefix: string): string {
  return r.rows.find((x) => x.label.startsWith(prefix))?.value ?? "";
}

/* ═══════════════ ค่าตามนิยาม ═══════════════ */

describe("ค่าตามนิยาม/มาตรฐาน ห้ามปัด", () => {
  it("หลา ตารางหลา กล่องสาย LAN VAT หัก ณ ที่จ่าย", () => {
    expect(K.CURTAIN.yard.value).toBe(0.9144);
    expect(K.CURTAIN.sqYard.value).toBeCloseTo(0.9144 * 0.9144, 12);
    // 1,000 ฟุต × 0.3048 = 304.8 ม.
    expect(K.LAN.boxM.value).toBeCloseTo(K.LAN.boxFt.value * K.UNIT.foot.value, 9);
    expect(K.LAN.permanentLink.value).toBe(90);
    expect(K.LAN.channel.value).toBe(100);
    expect(K.TAX.vat.value).toBe(7);
    expect(K.TAX.whtService.value).toBe(3);
    // 2^40 ÷ 10^12
    expect(K.DATA_UNIT.tbPerTiB.value).toBeCloseTo(2 ** 40 / 1e12, 12);
  });

  it("ตารางคลาส PoE ตรง IEEE 802.3 เป๊ะ", () => {
    expect(K.POE_CLASSES.map((c) => [c.cls, c.pse, c.pd])).toEqual([
      [1, 4, 3.84],
      [2, 7, 6.49],
      [3, 15.4, 12.95],
      [4, 30, 25.5],
      [5, 45, 40],
      [6, 60, 51],
      [7, 75, 62],
      [8, 90, 71.3],
    ]);
    expect([K.POE_TYPES.af.pse.value, K.POE_TYPES.af.pd.value]).toEqual([15.4, 12.95]);
    expect([K.POE_TYPES.at.pse.value, K.POE_TYPES.at.pd.value]).toEqual([30, 25.5]);
    expect([K.POE_TYPES.bt3.pse.value, K.POE_TYPES.bt3.pd.value]).toEqual([60, 51]);
    expect([K.POE_TYPES.bt4.pse.value, K.POE_TYPES.bt4.pd.value]).toEqual([90, 71.3]);
  });

  it("ระดับ px/ม. ตาม IEC 62676-4", () => {
    expect(K.CCTV_PPM.map((l) => l.ppm.value)).toEqual([12.5, 25, 62.5, 125, 250, 1000]);
  });
});

/* ═══════════════ ฮาร์ดดิสก์กล้อง ═══════════════ */

describe("ฮาร์ดดิสก์กล้องวงจรปิด", () => {
  it("1 Mbps 1 ชั่วโมง = 0.45 GB ตามนิยาม", () => {
    // 10^6 ÷ 8 × 3600 ÷ 10^9 = 0.45
    expect(gbPerCamDay(1, 1, 100)).toBeCloseTo(0.45, 12);
  });

  it("ค่าตั้งต้น: 8 ตัว × 4 Mbps 24 ชม. 30 วัน เผื่อ 10% → 12 TB × 1", () => {
    // ต่อตัว 4 × 24 × 0.45 = 43.2 GB/วัน · ×8 = 345.6 · ×30 ÷ 1000 = 10.368 TB · ×1.1 = 11.4048 → 12 TB
    // เก็บได้จริง 12 ÷ 0.3456 = 34.72 วัน
    const r = calcHdd({});
    expect(r.invalid).toBeFalsy();
    expect(rowOf(r, "ต่อกล้อง 1 ตัว")).toBe("43.2 GB/วัน");
    expect(rowOf(r, "กล้อง 8 ตัว")).toBe("345.6 GB/วัน");
    expect(rowOf(r, "เก็บย้อนหลัง 30 วัน")).toBe("10.37 TB");
    expect(rowOf(r, "รวมเผื่อ 10%")).toBe("11.40 TB");
    expect(rowOf(r, "ฮาร์ดดิสก์ที่ต้องซื้อ")).toBe("12 TB × 1 ลูก (รวม 12 TB)");
    expect(rowOf(r, "เก็บได้จริงกับดิสก์ที่ซื้อ")).toBe("ราว 34.7 วัน");
    // 12 ÷ 1.099511627776 = 10.91 TiB
    expect(rowOf(r, "NVR จะแสดงความจุต่อลูก")).toBe("ราว 10.91 TB (หน่วย TiB)");
    expect(r.chart?.kind).toBe("steps");
  });

  it("อัดเฉพาะเคลื่อนไหว 30%: 4 ตัว 2MP H.265 14 วัน ไม่เผื่อ → 1 TB เก็บได้ 38.6 วัน", () => {
    // 2 × 24 × 0.45 × 0.3 = 6.48 GB/วัน/ตัว · ×4 = 25.92 · ×14 = 362.88 GB = 0.36 TB → 1 TB · 1 ÷ 0.02592 = 38.58 วัน
    const r = calcHdd({ cams: 4, preset: "2mp-h265", record: 30, days: 14, headroom: 0 });
    expect(rowOf(r, "ต่อกล้อง 1 ตัว")).toBe("6.5 GB/วัน");
    expect(rowOf(r, "ฮาร์ดดิสก์ที่ต้องซื้อ")).toBe("1 TB × 1 ลูก (รวม 1 TB)");
    expect(rowOf(r, "เก็บได้จริงกับดิสก์ที่ซื้อ")).toBe("ราว 38.6 วัน");
  });

  it("เกินช่อง NVR: ไม่หนีบเงียบ บอกจำนวนลูกและช่องที่ต้องมี", () => {
    // 12 × 24 × 0.45 × 128 × 30 ÷ 1000 × 1.1 = 547.43 TB · ÷4 ช่อง = 136.9 > 24 → ⌈547.43 ÷ 24⌉ = 23 ลูก
    const r = calcHdd({ cams: 128, preset: "8mp-h264", bays: 4 });
    expect(r.invalid).toBeFalsy();
    expect(rowOf(r, "ฮาร์ดดิสก์ที่ต้องซื้อ")).toBe("24 TB × 23 ลูก (รวม 552 TB)");
    expect(rowOf(r, "ช่องใส่ดิสก์")).toContain("อย่างน้อย 23 ช่อง");
    expect(r.chart).toBeUndefined();
  });

  it("NVR 2 ช่อง: ซื้อลูกน้อยสุดที่จุพอ ⌈11.4 ÷ 24⌉ = 1 → 12 TB × 1 (ไม่แตกเป็น 6 TB × 2)", () => {
    expect(rowOf(calcHdd({ bays: 2 }), "ฮาร์ดดิสก์ที่ต้องซื้อ")).toBe("12 TB × 1 ลูก (รวม 12 TB)");
    expect(pickHdd(4)).toBe(4);
    expect(pickHdd(4.01)).toBe(6);
    expect(pickHdd(25)).toBeUndefined();
  });

  it("บิตเรตกรอกเองใช้ค่าที่กรอก", () => {
    // 10 Mbps × 24 × 0.45 = 108 GB/วัน
    expect(rowOf(calcHdd({ preset: "custom", mbps: 10 }), "ต่อกล้อง 1 ตัว")).toBe("108.0 GB/วัน");
  });
});

/* ═══════════════ งบไฟ PoE ═══════════════ */

describe("งบไฟ PoE", () => {
  it("หาคลาสจากวัตต์: คลาสเล็กสุดที่ถึงตัวอุปกรณ์ได้ไม่น้อยกว่า", () => {
    expect(poeClassFor(3.84)?.cls).toBe(1);
    expect(poeClassFor(6)?.cls).toBe(2);
    expect(poeClassFor(12.95)?.cls).toBe(3);
    expect(poeClassFor(13)?.cls).toBe(4);
    expect(poeClassFor(25.6)?.cls).toBe(5);
    expect(poeClassFor(71.3)?.cls).toBe(8);
    expect(poeClassFor(72)).toBeUndefined();
  });

  it("ค่าตั้งต้น: 8 × 6 W (คลาส 2) จองตามคลาส 56 W จากงบ 65 W → เหลือ 13.8% เฉียด", () => {
    // 8 × 7.0 = 56 W · (65 − 56) ÷ 65 = 13.85% < 20%
    const r = calcPoe({});
    expect(rowOf(r, "อุปกรณ์ใช้ไฟรวม (ตามสเปก)")).toBe("48.00 W");
    expect(rowOf(r, "สวิตช์ต้องจองตามคลาส")).toBe("56.0 W");
    expect(rowOf(r, "งบเหลือ")).toBe("9.0 W (13.8%) ต่ำกว่า 20% ที่ควรเผื่อ");
    expect(r.headline).toContain("เฉียด");
    expect(rowStarting(r, "ต่อพอร์ต")).toContain("ผ่าน");
  });

  it("คิดตามวัตต์จริง: 48 W จาก 65 W → เหลือ 26.2% ผ่าน", () => {
    // (65 − 48) ÷ 65 = 26.15%
    const r = calcPoe({ basis: "actual" });
    expect(rowOf(r, "งบเหลือ")).toBe("17.0 W (26.2%)");
    expect(r.headline).toContain("ผ่าน");
  });

  it("อุปกรณ์ 30 W บนพอร์ต PoE+ (25.5 W): เกินพอร์ต และเกินงบ", () => {
    // กลุ่ม 2: 2 × 30 W → คลาส 5 (40 W ที่อุปกรณ์ / 45 W ที่พอร์ต) · จอง 56 + 90 = 146 W > 65 → เกิน 81 W
    const r = calcPoe({ n2: 2, w2: 30 });
    expect(rowOf(r, "สวิตช์ต้องจองตามคลาส")).toBe("146.0 W");
    expect(rowOf(r, "งบเหลือ")).toContain("เกิน 81.0 W");
    expect(rowStarting(r, "ต่อพอร์ต")).toContain("ไม่พอ: อุปกรณ์คลาส 5");
    expect(r.invalid).toBeFalsy();
  });

  it("เลือกคลาสแทนวัตต์ + พอร์ตไม่พอ", () => {
    // 10 ตัว คลาส 3 → จอง 10 × 15.4 = 154 W · 10 ตัว > 8 พอร์ต
    const r = calcPoe({ n1: 10, s1: "c3", budget: 200 });
    expect(rowOf(r, "สวิตช์ต้องจองตามคลาส")).toBe("154.0 W");
    expect(rowOf(r, "จำนวนพอร์ต PoE")).toBe("ไม่พอ: อุปกรณ์ 10 ตัว มี 8 พอร์ต");
  });

  it("ใช้เต็มงบพอดี = เหลือ 0% (เฉียด ไม่ใช่เกิน)", () => {
    // 4 × คลาส 4 = 4 × 30 = 120 W จากงบ 120 W
    const r = calcPoe({ n1: 4, s1: "c4", budget: 120 });
    expect(rowOf(r, "งบเหลือ")).toContain("0.0 W (0.0%)");
  });
});

/* ═══════════════ สาย LAN ═══════════════ */

describe("สาย LAN กี่กล่อง", () => {
  it("ค่าตั้งต้น: 8 เส้น × 33.3 ม. = 266.4 ม. → 1 กล่อง หัว 18 ตัว", () => {
    // 30 + 0.3 + 3 = 33.3 · ×8 = 266.4 · ⌊304.8 ÷ 33.3⌋ = 9 เส้น/กล่อง · หัว ⌈8 × 2 × 1.1⌉ = ⌈17.6⌉ = 18
    const r = calcLan({});
    expect(rowOf(r, "รวม 8 เส้น")).toBe("266.4 ม.");
    expect(rowOf(r, "กล่องหนึ่งตัดได้")).toBe("9 เส้น (กล่องละ 304.8 ม.)");
    expect(rowOf(r, "สาย LAN ที่ต้องซื้อ")).toBe("1 กล่อง");
    expect(rowOf(r, "หัว RJ45 (เผื่อ 10%)")).toBe("18 ตัว ≈ 1 ถุง (ถุงละ 100)");
    expect(rowOf(r, "เหลือสายโดยรวม")).toBe("38.4 ม. (เป็นเศษท้ายกล่อง)");
    expect(rowOf(r, "เส้นยาวสุด (รวมเผื่อ)")).toBe("48.3 ม. ผ่าน (ไม่เกิน 90 ม.)");
  });

  it("ต่อกลางเส้นไม่ได้: 15 เส้น × 38.3 ม. ตามเมตรได้ 2 กล่อง แต่จริงต้อง 3", () => {
    // 35 + 3.3 = 38.3 · ×15 = 574.5 ÷ 304.8 = 1.88 → 2 · ⌊304.8 ÷ 38.3⌋ = 7 → ⌈15 ÷ 7⌉ = 3
    const r = calcLan({ runs: 15, avg: 35 });
    expect(rowOf(r, "สาย LAN ที่ต้องซื้อ")).toBe("3 กล่อง");
    expect(rowOf(r, "ทำไมไม่ใช่ตามเมตรรวม")).toContain("เมตรรวมใช้ 2 กล่อง");
  });

  it("เตือนเกิน 90 ม. และ 100 ม.", () => {
    // 88 + 3.3 = 91.3 > 90 → สายแพตช์เหลือ 100 − 91.3 = 8.7 ม.
    expect(rowOf(calcLan({ longest: 88 }), "เส้นยาวสุด (รวมเผื่อ)")).toContain("แพตช์รวมสองปลายต้องไม่เกิน 8.7 ม.");
    // 98 + 3.3 = 101.3 > 100
    const r = calcLan({ longest: 98 });
    expect(rowOf(r, "เส้นยาวสุด (รวมเผื่อ)")).toContain("เกิน 100 ม.");
    expect(r.headline).toContain("เกิน 100 ม.");
  });

  it("ฝั่งตู้เข้าแพตช์พาเนล: หัว 1 ต่อเส้น + keystone", () => {
    // ⌈8 × 1 × 1.1⌉ = ⌈8.8⌉ = 9
    const r = calcLan({ ends: "panel" });
    expect(rowOf(r, "หัว RJ45 (เผื่อ 10%)")).toBe("9 ตัว ≈ 1 ถุง (ถุงละ 100)");
    expect(rowOf(r, "keystone/ช่องแพตช์พาเนล")).toBe("8 ช่อง");
  });

  it("เส้นยาวสุดสั้นกว่าค่าเฉลี่ย ต้องตอบว่าคิดไม่ได้", () => {
    expect(calcLan({ longest: 20 }).invalid).toBe(true);
  });
});

/* ═══════════════ มุมกล้อง ═══════════════ */

describe("มุมกล้อง / ระยะเห็นหน้า", () => {
  it("2.8 มม. บน 1/2.7\" (กว้างภาพ 16:9 5.857 มม.) 4MP ที่ 5 ม. → 92.6° ฉาก 10.46 ม. 245 px/ม. จำคนรู้จักได้", () => {
    // กว้าง 16:9 = ทแยง 6.72 × 16 ÷ √337 = 5.85699 มม.
    // 2·atan(5.85699 ÷ 5.6) = 92.570° · 5 × 5.85699 ÷ 2.8 = 10.4589 ม. · 2560 ÷ 10.4589 = 244.77
    // ระบุตัวไกลสุด 2560 × 2.8 ÷ (5.85699 × 250) = 4.895 ม. · จำได้ 9.79 · สังเกต 19.58 · ตรวจจับ 48.95
    const r = calcFov({});
    expect(hfovDeg(5.37, 2.8)).toBeCloseTo(87.5978, 3);
    expect(rowOf(r, "มุมรับภาพแนวนอน")).toBe("92.6°");
    expect(rowOf(r, "ความกว้างฉากที่ 5 ม.")).toBe("10.46 ม.");
    expect(rowOf(r, "ความละเอียดที่ระยะนี้")).toBe("244.8 px/ม.");
    expect(rowOf(r, "ได้ระดับ")).toBe("จำได้ว่าเป็นคนที่รู้จัก (Recognise) (≥ 125 px/ม.)");
    expect(rowOf(r, "ระบุตัวคนแปลกหน้าได้ (Identify) ไกลสุด")).toBe("4.9 ม. (250 px/ม.)");
    expect(rowOf(r, "จำได้ว่าเป็นคนที่รู้จัก (Recognise) ไกลสุด")).toBe("9.8 ม. (125 px/ม.)");
    expect(rowOf(r, "เห็นท่าทาง เสื้อผ้า (Observe) ไกลสุด")).toBe("19.6 ม. (62.5 px/ม.)");
    expect(rowOf(r, "รู้ว่ามีคน (Detect) ไกลสุด")).toBe("49.0 ม. (25 px/ม.)");
  });

  it("มุมจากสเปก 100° 1080p ที่ 5 ม. → ฉาก 11.92 ม. 161 px/ม. ระดับจำได้", () => {
    // 2 × 5 × tan 50° = 11.9175 · 1920 ÷ 11.9175 = 161.1 · ระบุตัวไกลสุด 1920 ÷ (250 × 2.3835) = 3.22 ม.
    const r = calcFov({ mode: "spec", hfov: 100, hres: 1920 });
    expect(rowOf(r, "ความกว้างฉากที่ 5 ม.")).toBe("11.92 ม.");
    expect(rowOf(r, "ความละเอียดที่ระยะนี้")).toBe("161.1 px/ม.");
    expect(rowOf(r, "ได้ระดับ")).toContain("Recognise");
    expect(rowOf(r, "ระบุตัวคนแปลกหน้าได้ (Identify) ไกลสุด")).toBe("3.2 ม. (250 px/ม.)");
  });

  it("ไกลมากจนต่ำกว่าทุกระดับ ยังตอบได้และบอกว่าต่ำกว่า", () => {
    // 2560 ÷ (300 × 1.9179) = 4.45 px/ม. < 12.5
    const r = calcFov({ d: 300 });
    expect(r.invalid).toBeFalsy();
    expect(rowOf(r, "ได้ระดับ")).toBe("ต่ำกว่า 12.5 px/ม.");
  });
});

/* ═══════════════ ผ้าม่าน ═══════════════ */

describe("ผ้าม่านกี่เมตร / กี่หลา", () => {
  it("ค่าตั้งต้น: ม่านจีบ 2.5 เท่า หน้าต่าง 2 ม. → ราง 2.30 ม. ผ้า 4 หน้า 11 ม. = 12.03 หลา สั่ง 13", () => {
    // ราง 2 + 2 × 0.15 = 2.3 · ผ้าแผ่ 2.3 × 2.5 + 2 × 2 × 0.05 = 5.95 · ⌈5.95 ÷ 1.5⌉ = 4
    // ตัด 2.4 + 0.15 + 0.2 = 2.75 · 4 × 2.75 = 11.0 ม. ÷ 0.9144 = 12.0297 หลา → 13
    // ความฟูจริง (4 × 1.5 − 0.2) ÷ 2.3 = 2.52 · ตะขอ ⌈1.15 ÷ 0.1⌉ + 1 = 13 × 2 = 26 · ขา ⌈2.3 ÷ 1.2⌉ + 1 = 3
    const r = calcCurtainFabric({});
    expect(r.headline).toBe("ผ้า 11.00 ม. = 12.03 หลา (สั่ง 13 หลา) · 4 หน้าผ้า");
    expect(rowOf(r, "ความยาวราง")).toBe("2 + 2 × 0.15 = 2.30 ม.");
    expect(rowOf(r, "ความฟูที่ได้จริง (หักพับริม)")).toBe("2.52 เท่า");
    expect(rowOf(r, "ตะขอ + รันเนอร์")).toBe("26 ตัว (ผืนละ 13)");
    expect(rowOf(r, "ขาจับราง")).toBe("3 ตัว (ห่างไม่เกิน 1.2 ม.)");
    expect(r.chart).toMatchObject({ kind: "packs", count: 4 });
  });

  it("ม่านตาไก่ 2 เท่า: ห่วงต้องเป็นเลขคู่ต่อผืน", () => {
    // ผ้าแผ่ 2.3 × 2 + 0.2 = 4.8 → ⌈4.8 ÷ 1.5⌉ = 4 หน้า × 2.75 = 11 ม.
    // ห่วงต่อผืน ⌈1.15 × 2 ÷ 0.18⌉ = ⌈12.78⌉ = 13 → เลขคู่ 14 × 2 = 28
    const r = calcCurtainFabric({ style: "eyelet", full: "2" });
    expect(rowOf(r, "ห่วงตาไก่")).toBe("28 ตัว (ผืนละ 14)");
    expect(rowOf(r, "ผ้าที่ต้องซื้อ")).toBe("11.00 ม. = 12.03 หลา → สั่ง 13 หลา");
  });

  it("ผ้ามีลาย 64 ซม.: ความยาวตัดปัดตามลาย", () => {
    // ⌈2.75 ÷ 0.64⌉ = 5 × 0.64 = 3.20 ม. · 4 × 3.2 = 12.8 ม. ÷ 0.9144 = 13.998 หลา → 14
    const r = calcCurtainFabric({ repeat: 64 });
    expect(rowOf(r, "ผ้าที่ต้องซื้อ")).toBe("12.80 ม. = 14.00 หลา → สั่ง 14 หลา");
  });

  it("ผ้าหน้ากว้าง 2.8 ม.: ยาวเท่าผ้าแผ่ · สูงเกินหน้าผ้าต้องปฏิเสธ", () => {
    // 5.95 ม. ÷ 0.9144 = 6.507 หลา → 7
    const r = calcCurtainFabric({ cut: "wide" });
    expect(rowOf(r, "ผ้าที่ต้องซื้อ")).toBe("5.95 ม. = 6.51 หลา → สั่ง 7 หลา");
    // 2.5 + 0.35 = 2.85 > 2.8
    expect(calcCurtainFabric({ cut: "wide", h: 2.5 }).invalid).toBe(true);
  });
});

describe("ม่านม้วน / มู่ลี่ ขนาดสั่ง", () => {
  it("ในวงกบ 120 × 150 → สั่ง 119 × 149 ซม. 1.7731 ตร.ม. × 1,200 = 2,127.72 บาท", () => {
    const r = calcBlind({});
    expect(rowOf(r, "ขนาดสั่ง กว้าง × สูง")).toBe("119 × 149 ซม.");
    expect(rowOf(r, "พื้นที่ต่อผืน")).toBe("1.773 ตร.ม.");
    expect(rowOf(r, "ราคา 1,200.00 บาท/ตร.ม.")).toBe("2,127.72 บาท");
  });

  it("นอกวงกบ คิดต่อตารางหลา: 130 × 165 = 2.145 ตร.ม. = 2.5654 ตร.หลา × 1,000 = 2,565.40 บาท", () => {
    // 120 + 2 × 5 = 130 · 150 + 10 + 5 = 165 · 2.145 ÷ 0.83612736 = 2.56540
    const r = calcBlind({ mount: "outside", unit: "yd2", price: 1000 });
    expect(rowOf(r, "ขนาดสั่ง กว้าง × สูง")).toBe("130 × 165 ซม.");
    expect(rowOf(r, "ราคา 1,000.00 บาท/ตร.หลา")).toBe("2,565.40 บาท");
  });

  it("ผืนเล็กกว่าขั้นต่ำ คิดเงินตามขั้นต่ำ", () => {
    // 39 × 49 = 0.1911 ตร.ม. < 1 → คิด 1 ตร.ม. × 2 ผืน × 1,200 = 2,400
    const r = calcBlind({ w: 40, h: 50, qty: 2 });
    expect(rowOf(r, "คิดเงินต่อผืน")).toBe("1.000 ตร.ม. (ขั้นต่ำของร้าน)");
    expect(rowOf(r, "ราคา 1,200.00 บาท/ตร.ม.")).toBe("2,400.00 บาท");
  });
});

/* ═══════════════ เงิน: ปัดสตางค์ครึ่งขึ้น ═══════════════ */

describe("ปัดสตางค์แบบครึ่งขึ้น", () => {
  it("กันเศษทศนิยมฐานสอง", () => {
    // 1.005 × 100 ในเครื่อง = 100.49999… ต้องปัดเป็น 101 สตางค์
    expect(toSatang(1.005)).toBe(101);
    expect(toSatang(104.775)).toBe(10478);
    expect(toSatang(2.344999)).toBe(234);
    expect(roundHalfUp(10477.5)).toBe(10478);
  });

  it("แยก VAT: ฐาน + VAT = ยอดเดิมพอดี", () => {
    // 50,000 × 100 ÷ 107 = 46,728.9719 → 46,728.97 · VAT 3,271.03
    expect(splitVatIncluded(5_000_000)).toEqual({ base: 4_672_897, vat: 327_103 });
  });

  it("แบ่งยอดให้รวมเท่าเดิมเสมอ เศษไปงวดสุดท้าย", () => {
    expect(allocate(17_500_000, [1, 1, 1])).toEqual([5_833_333, 5_833_333, 5_833_334]);
    expect(allocate(100, [1, 1, 1, 1, 1, 1, 1])).toEqual([14, 14, 14, 14, 14, 14, 16]);
  });

  it("อ่านรายการ %", () => {
    expect(parsePctList("40, 30")).toEqual({ values: [40, 30], bad: [] });
    expect(parsePctList("40% 30%;10")).toEqual({ values: [40, 30, 10], bad: [] });
    expect(parsePctList("40, abc").bad).toEqual(["abc"]);
  });
});

/* ═══════════════ ใบเสนอราคา ═══════════════ */

describe("ใบเสนอราคาเร็ว", () => {
  it("ค่าตั้งต้น: 3 รายการ + ค่าแรง บวก 10% บวก VAT 7%", () => {
    // ราคาต่อหน่วย: 350 × 1.1 = 385.00 · 185.50 × 1.1 = 204.05 · 95.25 × 1.1 = 104.775 → 104.78
    // บรรทัด: 7,700.00 · 2,040.50 · 4 × 104.78 = 419.12 · ค่าแรง 8,000 × 1.1 = 8,800.00
    // รวม 18,959.62 · VAT 1,327.1734 → 1,327.17 · ทั้งสิ้น 20,286.79
    const r = calcQuote({});
    expect(rowOf(r, "1. กระเบื้อง 60×60 (ตร.ม.)")).toBe("20 × 385.00 บาท = 7,700.00 บาท");
    expect(rowOf(r, "2. ปูนกาว (ถุง)")).toBe("10 × 204.05 บาท = 2,040.50 บาท");
    expect(rowOf(r, "3. ยาแนว (ถุง)")).toBe("4 × 104.78 บาท = 419.12 บาท");
    expect(rowOf(r, "4. ค่าแรง")).toBe("8,800.00 บาท");
    expect(rowOf(r, "รวมเป็นเงิน")).toBe("18,959.62 บาท");
    expect(rowOf(r, "ภาษีมูลค่าเพิ่ม 7%")).toBe("1,327.17 บาท");
    expect(rowOf(r, "ยอดรวมทั้งสิ้น")).toBe("20,286.79 บาท");
    // ต้นทุน 7,000 + 1,855 + 381 + 8,000 = 17,236 · กำไร 1,723.62
    // กำไรอยู่ในบล็อกสูตรเท่านั้น ไม่หลุดไปในข้อความที่คัดลอกส่งลูกค้า
    expect(r.explain?.steps.find((s) => s.label.startsWith("กำไรที่บวก"))?.subst).toBe("18,959.62 − 17,236.00 = 1,723.62 บาท");
    expect(r.copyText).not.toContain("ต้นทุน");
    expect(r.copyText).not.toContain("กำไร");
  });

  it("หัก ณ ที่จ่าย 3% ทั้งใบ / เฉพาะค่าแรง", () => {
    // ทั้งใบ: 18,959.62 × 3% = 568.7886 → 568.79 · รับจริง 20,286.79 − 568.79 = 19,718.00
    const all = calcQuote({ wht: "all" });
    expect(rowOf(all, "รับเงินจริง")).toBe("19,718.00 บาท");
    expect(rowStarting(all, "หัก ณ ที่จ่าย 3%")).toBe("568.79 บาท จากฐาน 18,959.62 บาท");
    // เฉพาะค่าแรง: 8,800 × 3% = 264.00 · 20,286.79 − 264 = 20,022.79
    expect(rowOf(calcQuote({ wht: "labour" }), "รับเงินจริง")).toBe("20,022.79 บาท");
  });

  it("ราคารวม VAT แล้ว: แยกฐานออก แล้วหัก 3% จากฐาน", () => {
    // 18,959.62 × 100 ÷ 107 = 17,719.27 · VAT 1,240.35 · หัก 531.58 · รับ 18,428.04
    const r = calcQuote({ vat: "incl", wht: "all" });
    expect(rowOf(r, "ราคาก่อน VAT")).toBe("17,719.27 บาท");
    expect(rowOf(r, "ภาษีมูลค่าเพิ่ม 7% (อยู่ในราคา)")).toBe("1,240.35 บาท");
    expect(rowOf(r, "ยอดรวมทั้งสิ้น")).toBe("18,959.62 บาท");
    expect(rowOf(r, "รับเงินจริง")).toBe("18,428.04 บาท");
  });

  it("กำไรต่อราคาขาย 20% (margin) = ทุน ÷ 0.8", () => {
    // 437.50 · 231.875 → 231.88 · 119.0625 → 119.06 · ค่าแรง 10,000
    // 8,750 + 2,318.80 + 476.24 + 10,000 = 21,545.04 · VAT 1,508.1528 → 1,508.15 · 23,053.19
    const r = calcQuote({ kind: "margin", pct: 20 });
    expect(rowOf(r, "2. ปูนกาว (ถุง)")).toBe("10 × 231.88 บาท = 2,318.80 บาท");
    expect(rowOf(r, "รวมเป็นเงิน")).toBe("21,545.04 บาท");
    expect(rowOf(r, "ยอดรวมทั้งสิ้น")).toBe("23,053.19 บาท");
  });

  it("ไม่มีราคาเลยต้องปฏิเสธ · รายการที่ซ่อนอยู่ไม่ถูกนับ", () => {
    expect(calcQuote({ p1: 0, p2: 0, p3: 0, labour: 0 }).invalid).toBe(true);
    // ตั้ง 1 รายการ: 7,700 + 8,800 = 16,500 แม้รายการ 2–3 ยังมีค่าค้าง
    expect(rowOf(calcQuote({ lines: "1" }), "รวมเป็นเงิน")).toBe("16,500.00 บาท");
  });
});

describe("บวกกำไร markup ↔ margin", () => {
  it("บวก 25% จากทุน 1,000 → 1,250 กำไร 250 = 20% ของราคาขาย", () => {
    const r = calcMarkup({});
    expect(r.headline).toBe("ขาย 1,250.00 บาท · กำไร 250.00 บาท · กำไรต่อราคาขาย 20.00%");
    // ถ้าเอา 25% ไปเป็น margin: 1,000 ÷ 0.75 = 1,333.33
    expect(rowStarting(r, "ถ้าเอา 25%")).toBe("ราคาขาย 1,333.33 บาท");
  });

  it("กำไร 25% ของราคาขาย → 1,333.33 = บวกจากทุน 33.33%", () => {
    const r = calcMarkup({ kind: "margin", mg: 25 });
    expect(r.headline).toBe("ขาย 1,333.33 บาท · กำไร 333.33 บาท · เท่ากับบวกจากทุน 33.33%");
  });

  it("บวก 30% ได้ margin 23.08% · บวก 100% ไปคิดเป็น margin ไม่ได้", () => {
    // 30 ÷ 130 = 23.077%
    expect(rowOf(calcMarkup({ mu: 30 }), "กำไรต่อราคาขาย (margin)")).toBe("23.08%");
    expect(rowStarting(calcMarkup({ mu: 100 }), "ถ้าเอา 100%")).toContain("คิดไม่ได้");
  });
});

describe("VAT / หัก ณ ที่จ่าย", () => {
  it("10,000 ก่อน VAT หัก 3% → รวม 10,700 หัก 300 รับ 10,400", () => {
    const r = calcVatWht({});
    expect(rowOf(r, "ยอดรวมในใบ")).toBe("10,700.00 บาท");
    expect(rowOf(r, "หัก ณ ที่จ่าย (3% ค่าจ้างทำของ/ค่าบริการ)")).toBe("300.00 บาท จากฐานก่อน VAT");
    expect(rowOf(r, "รับเงินจริง")).toBe("10,400.00 บาท");
  });

  it("50,000 รวม VAT หัก 3% → ฐาน 46,728.97 VAT 3,271.03 หัก 1,401.87 รับ 48,598.13", () => {
    // 50,000 × 100 ÷ 107 = 46,728.9719 · × 3% = 1,401.8691 → 1,401.87
    const r = calcVatWht({ amt: 50000, mode: "incl" });
    expect(rowOf(r, "ราคาก่อน VAT (ฐานภาษี)")).toBe("46,728.97 บาท");
    expect(rowOf(r, "VAT 7%")).toBe("3,271.03 บาท");
    expect(rowOf(r, "รับเงินจริง")).toBe("48,598.13 บาท");
  });

  it("ยอดต่ำกว่า 1,000 บาทมีหมายเหตุ · ไม่หักก็ไม่มีหมายเหตุ", () => {
    // 500 × 1% = 5.00
    const r = calcVatWht({ amt: 500, mode: "none", wht: "1" });
    expect(rowOf(r, "รับเงินจริง")).toBe("495.00 บาท");
    expect(rowOf(r, "หมายเหตุหัก ณ ที่จ่าย")).toContain("ต่ำกว่า 1,000 บาท");
    expect(rowOf(calcVatWht({ amt: 500, wht: "0" }), "หมายเหตุหัก ณ ที่จ่าย")).toBe("");
  });
});

describe("งวดงาน / มัดจำ", () => {
  it("250,000 มัดจำ 30% 3 งวดเท่ากัน ประกัน 5%: เศษไปงวดสุดท้าย รวมเท่าสัญญาพอดี", () => {
    // มัดจำ 75,000 · ที่เหลือ 175,000 ÷ 3 = 58,333.33 / 58,333.33 / 58,333.34
    // ประกัน 175,000 × 5% = 8,750 → 2,916.67 / 2,916.67 / 2,916.66 · จ่ายจริง 55,416.66 / 55,416.66 / 55,416.68
    const r = calcInstalments({});
    expect(rowOf(r, "มัดจำ 30%")).toBe("75,000.00 บาท");
    expect(rowOf(r, "งวดที่ 1")).toBe("58,333.33 บาท · หักประกัน 2,916.67 บาท · จ่ายจริง 55,416.66 บาท");
    expect(rowOf(r, "งวดที่ 3")).toBe("58,333.34 บาท · หักประกัน 2,916.66 บาท · จ่ายจริง 55,416.68 บาท");
    expect(rowStarting(r, "เงินประกันผลงาน")).toBe("8,750.00 บาท");
    expect(rowOf(r, "ตรวจยอด")).toBe("มัดจำ + ทุกงวด = 250,000.00 บาท เท่าสัญญาพอดี");
  });

  it("กำหนด % เอง: มัดจำ 30 + 40 + 30 = 100", () => {
    // 250,000 × 40% = 100,000 · งวดสุดท้าย 175,000 − 100,000 = 75,000 · ประกัน 5,000 / 3,750
    const r = calcInstalments({ mode: "custom", list: "40, 30" });
    expect(rowOf(r, "งวดที่ 1 (40%)")).toBe("100,000.00 บาท · หักประกัน 5,000.00 บาท · จ่ายจริง 95,000.00 บาท");
    expect(rowOf(r, "งวดที่ 2 (30%)")).toBe("75,000.00 บาท · หักประกัน 3,750.00 บาท · จ่ายจริง 71,250.00 บาท");
  });

  it("% รวมไม่ถึง 100 หรือพิมพ์ผิด ต้องปฏิเสธ", () => {
    const short = calcInstalments({ mode: "custom", list: "40, 20" });
    expect(short.invalid).toBe(true);
    expect(short.headline).toContain("90%");
    expect(calcInstalments({ mode: "custom", list: "40, x" }).invalid).toBe(true);
    expect(calcInstalments({ n: 2.5 }).invalid).toBe(true);
  });

  it("ยอดคี่หลายงวด: ผลรวมยังเท่าสัญญาเป๊ะ", () => {
    // 100,000.01 มัดจำ 0% 7 งวด: 10,000,001 ÷ 7 = 1,428,571.57 → 1,428,572 สตางค์ × 6 · งวดท้าย 10,000,001 − 8,571,432 = 1,428,569
    const r = calcInstalments({ total: 100000.01, dep: 0, n: 7, ret: 0 });
    expect(rowOf(r, "งวดที่ 1")).toBe("14,285.72 บาท");
    expect(rowOf(r, "งวดที่ 7")).toBe("14,285.69 บาท");
    expect(rowOf(r, "ตรวจยอด")).toContain("100,000.01 บาท");
  });
});

describe("ค่าแรงตามพื้นที่ / ตามวัน", () => {
  it("ปูพื้น 60 ตร.ม. 15 ตร.ม./วัน ทีม 2 คน 500 บาท → 4 วัน 4,000 บาท 66.67 บาท/ตร.ม.", () => {
    // 60 ÷ 15 = 4 วัน · 4 × 2 × 500 = 4,000 · ÷ 60 = 66.67
    const r = calcLabour({});
    expect(r.headline).toBe("4 วัน · ค่าแรง 4,000.00 บาท · ตก 66.67 บาท/ตร.ม.");
  });

  it("50 ตร.ม. = 3.33 วัน: ปัดเต็มวัน 4 · ครึ่งวัน 3.5 · ไม่ปัด 3,333.33 บาท", () => {
    // 50 ÷ 15 = 3.333 · เต็มวัน 4 × 1,000 = 4,000 (80.00/ตร.ม.) · ครึ่งวัน 3.5 × 1,000 = 3,500 (70.00/ตร.ม.) · ไม่ปัด 3,333.33 (66.67)
    expect(calcLabour({ area: 50 }).headline).toBe("4 วัน · ค่าแรง 4,000.00 บาท · ตก 80.00 บาท/ตร.ม.");
    expect(calcLabour({ area: 50, round: "half" }).headline).toBe("3.5 วัน · ค่าแรง 3,500.00 บาท · ตก 70.00 บาท/ตร.ม.");
    expect(calcLabour({ area: 50, round: "none" }).headline).toBe("3.33 วัน · ค่าแรง 3,333.33 บาท · ตก 66.67 บาท/ตร.ม.");
  });

  it("2 ทีม อัตรากรอกเอง", () => {
    // 100 ÷ (20 × 2) = 2.5 → 3 วัน · 3 × 3 คน × 2 ทีม × 600 = 10,800 · ÷ 100 = 108.00
    expect(calcLabour({ area: 100, job: "custom", rate: 20, crew: 3, teams: 2, wage: 600 }).headline).toBe(
      "3 วัน · ค่าแรง 10,800.00 บาท · ตก 108.00 บาท/ตร.ม.",
    );
  });
});

/* ═══════════════ แคตตาล็อก ═══════════════ */

describe("ลงทะเบียนสายงานรอบ 4", () => {
  it("อยู่ในหมวดและลำดับที่ถูก มีไอคอน ไม่มีปก", () => {
    const ids = TRADES.map((t) => t.id);
    expect(ids.indexOf("lowvolt")).toBe(ids.indexOf("plumbing") + 1);
    expect(ids.indexOf("curtain")).toBe(ids.indexOf("glass") + 1);
    expect(ids.indexOf("estimate")).toBe(ids.indexOf("general") + 1);
    expect(getTrade("lowvolt")?.pillarId).toBe("mep");
    expect(getTrade("curtain")?.pillarId).toBe("finish");
    expect(getTrade("estimate")?.pillarId).toBe("general");
    for (const id of ["lowvolt", "curtain", "estimate"]) {
      expect(TRADE_ICONS[id], id).toBeDefined();
      for (const tool of getTrade(id)!.tools) expect(TOOLS_WITHOUT_COVER, `${id}/${tool.id}`).toContain(`${id}/${tool.id}`);
    }
    expect(getTrade("lowvolt")!.tools).toHaveLength(4);
    expect(getTrade("curtain")!.tools).toHaveLength(2);
    expect(getTrade("estimate")!.tools).toHaveLength(5);
  });

  it("ค้นด้วยคำช่างแล้วเจอ", () => {
    const has = (q: string, path: string) => searchCatalog(q).tools.some((t) => `${t.tradeId}/${t.id}` === path);
    expect(has("ฮาร์ดดิสก์", "lowvolt/hdd")).toBe(true);
    expect(has("rj45", "lowvolt/lan")).toBe(true);
    expect(has("เห็นหน้า", "lowvolt/fov")).toBe(true);
    expect(has("หลา", "curtain/fabric")).toBe(true);
    expect(has("มู่ลี่", "curtain/blind")).toBe(true);
    expect(has("ใบเสนอราคา", "estimate/quote")).toBe(true);
    expect(has("ถอด vat", "estimate/vat")).toBe(true);
    expect(has("มัดจำ", "estimate/instalment")).toBe(true);
    expect(searchCatalog("cctv").trades.some((t) => t.id === "lowvolt")).toBe(true);
  });
});
