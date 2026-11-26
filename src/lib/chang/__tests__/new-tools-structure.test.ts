/**
 * เครื่องมือใหม่ 2026-11 — งานโครงสร้าง + เครื่องมือทั่วไป
 * ค่าที่คาดหวังทุกตัวคิดแยกด้วยมือ/สคริปต์อิสระ (python3 -I) แล้วจดวิธีคิดไว้ในคอมเมนต์ของแต่ละเคส
 */
import { describe, expect, it } from "vitest";

import * as K from "../constants";
import { getToolCover, searchCatalog, TRADE_ICONS, TRADES } from "../catalog";
import { fieldVisible } from "../math";
import type { CalcResult } from "../types";
import { barPieces, calcRebar, calcSlab, concreteJob, meshRolls, meshSheets } from "../tools/concrete";
import { calcInchText, calcSpacing, countForMaxGap, equalSpacing, parseTradeLength } from "../tools/general";
import { calcRailing, calcSteelWeight, paintCans, steelTools } from "../tools/steel";

function rowOf(r: CalcResult, label: string): string {
  return r.rows.find((x) => x.label === label)?.value ?? "";
}

function rowStarting(r: CalcResult, prefix: string): string {
  return r.rows.find((x) => x.label.startsWith(prefix))?.value ?? "";
}

/* ═══════════════ นิ้ว-หุน-เศษส่วน ↔ มม. ═══════════════ */

describe("นิ้ว-หุน-เศษส่วน: อ่านแบบที่ช่างพิมพ์", () => {
  it.each([
    // 1.5 × 25.4 = 38.1
    ['1 1/2"', 38.1],
    ["1-1/2 นิ้ว", 38.1],
    ["นิ้วครึ่ง", 38.1],
    // 3/4 × 25.4 = 19.05 (ตัวเลขเปล่านับเป็นนิ้ว)
    ["3/4", 19.05],
    // 6 × 25.4 ÷ 8 = 19.05
    ["6 หุน", 19.05],
    ["19 มม.", 19],
    // 7 × 304.8 + 10.5 × 25.4 = 2133.6 + 266.7 = 2400.3
    ["7' 10½\"", 2400.3],
    ["7 ฟุต 10 1/2 นิ้ว", 2400.3],
    // 25.4 + 2 × 3.175 = 31.75
    ["1 นิ้ว 2 หุน", 31.75],
    ["2.4 ม.", 2400],
  ])("%s = %s มม.", (q, mm) => {
    const r = parseTradeLength(q);
    expect("mm" in r && r.mm).toBeCloseTo(mm, 6);
  });

  it("อ่านไม่ออกต้องบอก ไม่เดา", () => {
    for (const q of ["", "abc", "2 3", "1/0", "-5 มม."]) {
      expect("error" in parseTradeLength(q), q).toBe(true);
      expect(calcInchText({ q }).invalid, q).toBe(true);
    }
  });

  it("19 มม. → 3/4 นิ้ว (6 หุน) คลาด 0.05 มม.", () => {
    // 19 ÷ 25.4 = 0.748 นิ้ว → ×16 = 11.97 → 12/16 = 3/4 · 3/4 × 25.4 = 19.05 → ต่าง 0.05
    const r = calcInchText({ q: "19 มม." });
    expect(r.headline).toBe("19 มม. ≈ 3/4 นิ้ว (6 หุน)");
    expect(rowOf(r, "นิ้วเศษส่วนใกล้สุด (1/16)")).toBe("3/4 นิ้ว (6 หุน) · ต่างจากค่าจริง 0.05 มม.");
    // 0.748 × 8 = 5.98 หุน
    expect(rowOf(r, "หุน (ไม่ปัด)")).toBe("5.98 หุน");
  });

  it('1 1/2" → 38.10 มม. = 12 หุน', () => {
    const r = calcInchText({ q: '1 1/2"' });
    expect(r.headline).toBe("1 1/2 นิ้ว = 38.1 มม. ≈ 1 1/2 นิ้ว (12 หุน)");
    expect(rowOf(r, "มิลลิเมตร")).toBe("38.10 มม.");
  });

  it("2400 มม. → 7 ฟุต 10 1/2 นิ้ว", () => {
    // 2400 ÷ 25.4 = 94.488 นิ้ว → 94 8/16 = 94 1/2 → 7 ฟุต (84) + 10 1/2
    const r = calcInchText({ q: "2400 มม." });
    expect(r.headline).toBe("2,400 มม. ≈ 7 ฟุต 10 1/2 นิ้ว");
    expect(rowOf(r, "ฟุต-นิ้ว (ใกล้สุด 1/16 นิ้ว)")).toBe("7 ฟุต 10 1/2 นิ้ว");
  });

  it("ตัวเลขเปล่าเลือกได้ว่าเป็นหุน", () => {
    // 4 หุน = 4 × 3.175 = 12.7 มม. = 1/2 นิ้ว
    expect(calcInchText({ q: "4", bare: "hun" }).headline).toBe("4 หุน = 12.7 มม. ≈ 1/2 นิ้ว (4 หุน)");
  });
});

/* ═══════════════ แบ่งระยะเท่า ๆ กัน ═══════════════ */

describe("แบ่งระยะเท่า ๆ กัน", () => {
  it("ระยะ 2,000 มม. ชิ้นกว้าง 20 มม. 9 ชิ้น (ปลายเป็นช่อง) → ช่องละ 182 มม.", () => {
    // (2000 − 9 × 20) ÷ 10 = 182 · ขอบซ้ายชิ้นที่ i = i × 182 + (i − 1) × 20
    const r = calcSpacing({});
    expect(r.headline).toBe("9 ชิ้น · ช่องละ 182 มม.");
    expect(rowOf(r, "ระยะศูนย์ถึงศูนย์ (c/c)")).toBe("202 มม.");
    expect(rowOf(r, "มาร์กขอบซ้ายชิ้น (วัดจากปลายซ้าย)")).toBe("182 · 384 · 586 · 788 · 990 · 1,192 · 1,394 · 1,596 · 1,798 มม.");
  });

  it("ลูกกรง 25 มม. ช่องไม่เกิน 100 มม. ในช่วง 1,925 มม. → 15 ซี่ ช่องจริง 96.9 มม.", () => {
    // n = ปัดขึ้น((1925 − 100) ÷ 125) = ปัดขึ้น(14.6) = 15 · ช่อง = (1925 − 375) ÷ 16 = 96.875
    expect(countForMaxGap(1925, 25, 100, "gap")).toBe(15);
    const r = calcSpacing({ mode: "maxgap", total: 1925, w: 25, maxGap: 100 });
    expect(r.headline).toBe("15 ชิ้น · ช่องละ 96.9 มม.");
  });

  it("มีชิ้นชิดปลาย: 5 ชิ้นกว้าง 18 ในระยะ 1,800 → ช่องละ 427.5 มาร์กกึ่งกลาง 9 · 455 · 900 · 1,346 · 1,791", () => {
    // (1800 − 90) ÷ 4 = 427.5 · กึ่งกลาง = (i − 1) × 445.5 + 9 → 9, 454.5→455, 900, 1345.5→1346, 1791
    const sp = equalSpacing(1800, 18, 5, "member");
    expect(sp.gap).toBeCloseTo(427.5, 9);
    expect(sp.starts[4] + 18).toBeCloseTo(1800, 9);
    const r = calcSpacing({ ends: "member", n: 5, total: 1800, w: 18, mark: "center" });
    expect(rowOf(r, "มาร์กกึ่งกลางชิ้น (วัดจากปลายซ้าย)")).toBe("9 · 455 · 900 · 1,346 · 1,791 มม.");
  });

  it("ชิ้นเต็มระยะหรือมีชิ้นชิดปลายแค่ชิ้นเดียว = ตอบไม่ได้", () => {
    expect(calcSpacing({ n: 100, w: 20 }).invalid).toBe(true);
    expect(calcSpacing({ ends: "member", n: 1 }).invalid).toBe(true);
  });
});

/* ═══════════════ น้ำหนักเหล็ก: ขนาดที่ร้านขาย + กก./เส้น ═══════════════ */

describe("น้ำหนักเหล็ก: เลือกขนาดที่ร้านขาย ได้ กก./เส้น และราคาต่อเส้น", () => {
  it("กล่อง 2\"×2\" หนา 2.3: 3.44 กก./ม. = 20.67 กก./เส้น 6 ม. · 30 บาท/กก. = 620 บาท/เส้น", () => {
    // [2 × (50 + 50) − 4 × 2.3] × 2.3 × 0.00785 = 190.8 × 0.018055 = 3.4449 · × 6 = 20.669 · × 30 = 620.08
    const r = calcSteelWeight({ shape: "box", boxsize: "50x50x2.3", price: 30 });
    expect(rowOf(r, "กก./ม.")).toBe("3.44 กก./ม.");
    expect(rowOf(r, "กก./เส้น")).toBe("20.67 กก. (เส้นละ 6 ม.)");
    expect(rowOf(r, "ราคาต่อเส้น")).toBe("620 บาท (เส้นละ 6 ม.)");
  });

  it("ขนาดที่ร้านขายให้น้ำหนักเท่ากรอกมือ (ใช้สูตรเดียวกัน) และค่าตั้งต้นยังเป็นกรอกเอง", () => {
    const shop = calcSteelWeight({ shape: "box", boxsize: "25x50x1.5" });
    const hand = calcSteelWeight({ shape: "box", ba: 25, bb: 50, bt: 1.5 });
    expect(rowOf(shop, "กก./ม.")).toBe(rowOf(hand, "กก./ม."));
    // ลิงก์เก่าที่ไม่มี boxsize ต้องยังใช้ขนาดที่กรอก
    expect(rowOf(calcSteelWeight({ shape: "box", ba: 100, bb: 100, bt: 3.2 }), "หน้าตัด")).toBe("กล่อง 100 × 100 × 3.2 มม.");
  });

  it.each([
    // เทียบตารางผู้ผลิต: JIS G3350 ตัวซี 100×50×20×2.3 = 4.06 · JIS G3192 ฉาก 50×50×6 = 4.43 · JIS G3444 ท่อ 34.0×2.3 = 1.80 กก./ม.
    [{ shape: "lipc", lipcsize: "100x50x20x2.3" }, "4.06 กก./ม.", "24.36 กก. (เส้นละ 6 ม.)"],
    [{ shape: "angle", anglesize: "50x50x6" }, "4.43 กก./ม.", "26.56 กก. (เส้นละ 6 ม.)"],
    [{ shape: "pipe", pipesize: "25", t: 2.3 }, "1.80 กก./ม.", "10.79 กก. (เส้นละ 6 ม.)"],
    // เหล็กเส้นนับเส้นละ 10 ม.: 0.006165 × 144 × 10 = 8.88
    [{ shape: "rebar", rebar: "DB12" }, "0.89 กก./ม.", "8.88 กก. (เส้นละ 10 ม.)"],
  ])("%o", (v, kgm, stick) => {
    const r = calcSteelWeight(v);
    expect(rowOf(r, "กก./ม.")).toBe(kgm);
    expect(rowOf(r, "กก./เส้น")).toBe(stick);
  });

  it("ทุกขนาดในรายการร้านคิดได้ (ไม่มีขนาดที่หนาเกินด้าน)", () => {
    for (const boxsize of Object.keys(K.STEEL_SHOP_BOX)) expect(calcSteelWeight({ shape: "box", boxsize }).invalid, boxsize).toBeFalsy();
    for (const anglesize of Object.keys(K.STEEL_SHOP_ANGLE)) expect(calcSteelWeight({ shape: "angle", anglesize }).invalid, anglesize).toBeFalsy();
    for (const lipcsize of Object.keys(K.STEEL_SHOP_LIPC)) expect(calcSteelWeight({ shape: "lipc", lipcsize }).invalid, lipcsize).toBeFalsy();
  });

  it("เลือกขนาดที่ร้านขายแล้ว ช่องกรอกมิติซ่อน (เงื่อนไข and)", () => {
    const fields = steelTools.find((t) => t.id === "weight")!.fields;
    const ba = fields.find((f) => f.key === "ba")!;
    expect(fieldVisible(ba, { shape: "box", boxsize: "custom" })).toBe(true);
    expect(fieldVisible(ba, { shape: "box", boxsize: "50x50x2.3" })).toBe(false);
    expect(fieldVisible(ba, { shape: "angle", boxsize: "custom" })).toBe(false);
  });
});

/* ═══════════════ รั้ว / ราวกันตก / กันสาด ═══════════════ */

describe("รั้ว/ราวกันตก/กันสาดเหล็กกล่อง", () => {
  it("ราวกันตก 4 ม. สูง 1 ม. เสาทุก 2 ม. → 8 เส้น 67.9 กก.", () => {
    // เสา ปัดขึ้น(4/2)+1 = 3 ต้น · ช่องใน (4000 − 3×50) ÷ 2 = 1,925
    // ลูกกรง ปัดขึ้น((1925−100) ÷ 125) = 15 ซี่/ช่วง × 2 = 30 · ยาว 1000 − 50 − 2×25 = 900
    // เส้น 6 ม. (เผื่อตัด 3): เสา 3×1000 → 1 · คาน 4×1925 → 2 (3+1) · ลูกกรง 30×900 → 5 (6 ท่อน/เส้น)
    // กก. = 1×6×3.4449 + 2×6×1.6956 + 5×6×0.89678 = 20.67 + 20.35 + 26.90 = 67.92
    const r = calcRailing({});
    expect(r.headline).toBe("ซื้อเหล็ก 8 เส้น · 67.9 กก.");
    expect(rowOf(r, "ลูกกรง")).toBe("30 ท่อน × 900 มม. (กล่อง 25×25×1.2) · ช่วงละ 15 ซี่ ช่องจริง 9.7 ซม.");
    expect(rowOf(r, "ซื้อ กล่อง 25×25×1.2")).toBe("5 เส้น (เส้นละ 6 ม.) · 26.9 กก.");
    expect(rowOf(r, "น้ำหนักเหล็กที่ซื้อ")).toBe("67.9 กก. (เนื้อที่ใช้จริง 47.6 กก.)");
    // ลวด: ขา 3 มม. · แนว 8 × 0.15 + 60 × 0.10 = 7.2 ม. → ½ × 0.003² × 7.2 × 7850 × 1.4 ÷ 0.65 = 0.548 กก.
    expect(rowOf(r, "ลวดเชื่อม 2.6 มม.")).toBe("0.55 กก. (≈ 1 ห่อ 2 กก.) · 68 จุด");
    // ผิว 3×0.2 + 4×1.925×0.15 + 30×0.9×0.1 = 4.455 ตร.ม. · กันสนิม ÷ 9.5 = 0.47 ล. · ทับหน้า ×2 ÷ 11 = 0.81 ล.
    expect(rowOf(r, "สีกันสนิม 1 เที่ยว")).toBe("0.5 ลิตร → 1 กระป๋องเล็ก (1/4 แกลลอน)");
    expect(rowOf(r, "สีทับหน้า 2 เที่ยว")).toBe("0.8 ลิตร → 1 กระป๋องเล็ก (1/4 แกลลอน)");
    expect(r.explain?.risk).toBe("B");
    expect(r.rows.some((x) => x.label === "ข้อควรระวัง")).toBe(false);
  });

  it("ราวกันตกช่องลูกกรงเกิน 10 ซม. / เตี้ยกว่า 90 ซม. / ใต้คานล่างเกิน 10 ซม. ต้องเตือน", () => {
    const r = calcRailing({ gap: 15, H: 0.8, bottom: 15 });
    const warns = r.rows.filter((x) => x.label === "ข้อควรระวัง").map((x) => x.value);
    expect(warns).toHaveLength(3);
    expect(warns[0]).toMatch(/^ช่องลูกกรงตั้งไว้ 15 ซม\. เกิน 10 ซม\./);
    // รั้ว (ไม่ใช่ราวกันตก) ช่อง 15 ซม. ไม่ต้องเตือน
    expect(calcRailing({ kind: "fence", gap: 15 }).rows.some((x) => x.label === "ข้อควรระวัง")).toBe(false);
  });

  it("กันสาด ยาว 6 ยื่น 1.5 จันทันทุก 1 ม. แป 4 แถว → จันทัน 7 ต้น แป 24 ท่อน", () => {
    // ปัดขึ้น(6/1)+1 = 7 · ช่องใน (6000 − 7×50) ÷ 6 = 941.7 · แป 4 × 6 = 24 ท่อน
    const r = calcRailing({ kind: "awning", L: 6, H: 1.5, span: 1, rails: 4 });
    expect(rowStarting(r, "จันทัน")).toMatch(/^7 ต้น × 1,500 มม\./);
    expect(rowOf(r, "แป/คานหน้า-หลัง")).toMatch(/^4 แถว × 6 ช่วง = 24 ท่อน × 942 มม\./);
    expect(r.rows.some((x) => x.label === "ลูกกรง")).toBe(false);
  });

  it("สีจัดเป็นแกลลอน + กระป๋องเล็ก ปัดขึ้น", () => {
    // 3.4 ล. = 0 แกลลอนเต็ม + 3.4 ÷ 0.946 = 3.6 → 4 กระป๋อง = 1 แกลลอน
    expect(paintCans(3.4)).toBe("1 แกลลอน");
    // 5 ล. = 1 แกลลอน + (5 − 3.785) ÷ 0.946 = 1.28 → 2 กระป๋อง
    expect(paintCans(5)).toBe("1 แกลลอน + 2 กระป๋องเล็ก (1/4 แกลลอน)");
  });
});

/* ═══════════════ ช่างคอนกรีต ═══════════════ */

describe("ช่างคอนกรีต: เทพื้น + ไวร์เมช", () => {
  it("พื้น 4×6 ม. หนา 10 ซม. เผื่อ 5% → สั่ง 3 คิว รถ 1 เที่ยว ไวร์เมช 2×6 ม. 3 แผ่น", () => {
    // 4 × 6 × 0.10 = 2.4 คิว × 1.05 = 2.52 → ปัดขั้น 0.5 = 3.0 คิว · ปัดขึ้น(3 ÷ 5) = 1 เที่ยว
    // แผ่น: ด้าน 4 ม. ใช้ ปัดขึ้น((4 − 0.2) ÷ 1.8) = 3 · ด้าน 6 ม. = 1 → 3 แผ่น (หมุนแผ่น = 1 × 4 = 4)
    const r = calcSlab({});
    expect(r.headline).toBe("สั่ง 3 คิว · รถโม่ 1 เที่ยว · ไวร์เมช 3 แผ่น");
    expect(rowOf(r, "คอนกรีตสุทธิ")).toBe("2.40 คิว");
    expect(rowOf(r, "รวมเผื่อ 5%")).toBe("2.52 คิว");
    expect(meshSheets(4, 6, 2, 6, 0.2).count).toBe(3);
    expect(r.explain?.risk).toBe("B");
    expect(r.chart?.kind).toBe("packs");
  });

  it("ผสมเอง 1:2:4 ใช้ตัวคูณปริมาตรแห้งเดิม (1.54): 2.52 คิว → ปูน 16 ถุง ทราย 1.11 หิน 2.22 คิว", () => {
    // แห้ง 2.52 × 1.54 = 3.8808 · ปูน 3.8808 ÷ 7 × 1440 ÷ 50 = 15.97 → 16 ถุง · ทราย ×2/7 = 1.11 · หิน ×4/7 = 2.22
    const r = calcSlab({ supply: "site" });
    expect(r.headline).toBe("ปูน 16 ถุง · ทราย 1.11 คิว · หิน 2.22 คิว · ไวร์เมช 3 แผ่น");
    expect(r.explain?.risk).toBe("C");
    expect(r.explain?.caveats).toContain(K.DISCLAIMER_C);
    expect(r.explain?.constants).toContain(K.MIX.dryVolume);
  });

  it("ม้วนไวร์เมช 2×50 ม. พื้น 10×60 ม. → 6 แถบ ต่อทาบ 8 ม้วน", () => {
    // แถบ ปัดขึ้น((10 − 0.2) ÷ 1.8) = 6 · ยาว 60 > 50: ท่อน ปัดขึ้น(59.8 ÷ 49.8) = 2 → 50 + 10.2 ม.
    // ท่อน 50 ม. 6 ม้วน · ท่อน 10.2 ม. ×6 ลงม้วนละ 4 → 2 ม้วน → 8 ม้วน · รวม 6 × 60.2 = 361.2 ม.
    const m = meshRolls(10, 60, 2, 50, 0.2);
    expect(m).toEqual({ strips: 6, metres: expect.closeTo(361.2, 6), rolls: 8 });
    expect(calcSlab({ w: 10, l: 60, mesh: "roll" }).headline).toMatch(/ไวร์เมช 8 ม้วน$/);
  });

  it("ผสมเองเกิน 100 คิว ไม่ตอบ ให้สั่งรถโม่", () => {
    expect(calcSlab({ supply: "site", w: 50, l: 50, t: 10 }).invalid).toBe(true);
  });

  it("สั่งน้อยกว่า 2 คิว เตือนค่ารถเที่ยวเล็ก", () => {
    // 2 × 3 × 0.1 × 1.05 = 0.63 → 1 คิว
    const r = calcSlab({ w: 2, l: 3 });
    expect(rowOf(r, "สั่งคอนกรีตผสมเสร็จ")).toBe("1 คิว (สั่งทีละ 0.5 คิว)");
    expect(rowOf(r, "ข้อควรระวัง")).toMatch(/ค่ารถเพิ่ม/);
  });
});

describe("ช่างคอนกรีต: เหล็กเส้น + ปลอก", () => {
  it("คาน 4 ตัว ยาว 4 ม. DB12 4 เส้น ปลอก RB6 @20 ซม. หน้าตัด 20×40 หุ้ม 3", () => {
    // เหล็กยืน 16 ท่อน × 4 ม.: เส้น 10 ม. ได้ 2 ท่อน → 8 เส้น × 10 × 0.88776 = 71.02 กก.
    //                          เส้น 12 ม. ได้ 3 ท่อน → 6 เส้น × 12 × 0.88776 = 63.92 กก.
    // ปลอก 2 × [(200 − 60) + (400 − 60)] + 2 × 75 = 1,110 มม. · ปัดขึ้น(4 ÷ 0.2) + 1 = 21 × 4 = 84 ตัว
    //   เส้น 10 ม. ได้ 9 ตัว → 10 เส้น (22.19 กก.) · เส้น 12 ม. ได้ 10 ตัว → 9 เส้น (23.97 กก.)
    // ลวดผูก 84 × 4 = 336 จุด × 0.3 × 0.006165 × 1.2² = 0.89 กก. → ซื้อ 1 กก.
    const r = calcRebar({});
    expect(r.headline).toBe("DB12 8 เส้น · RB6 10 เส้น (ปลอก 84 ตัว) — เส้นละ 10 ม.");
    expect(rowOf(r, "เหล็กยืน DB12 เส้น 10 ม.")).toBe("8 เส้น · 71.0 กก.");
    expect(rowOf(r, "เหล็กยืน DB12 เส้น 12 ม.")).toBe("6 เส้น · 63.9 กก.");
    expect(rowOf(r, "ปลอก RB6")).toBe("84 ตัว (ตัวละ 21 ปลอก ทุก 20 ซม.) · ยาวตัดปลอกละ 111.0 ซม.");
    expect(rowOf(r, "ปลอก RB6 เส้น 12 ม.")).toBe("9 เส้น · 24.0 กก.");
    expect(rowOf(r, "ลวดผูกเหล็ก")).toBe("0.89 กก. → ซื้อ 1 กก. (336 จุดผูก)");
    expect(r.explain?.risk).toBe("B");
  });

  it("คานยาวเกินเส้น: DB16 ยาว 12 ม. × 2 ตัว × 4 เส้น → เส้น 10 ม. 11 เส้น (ต่อทาบ 64 ซม.) · เส้น 12 ม. 8 เส้น", () => {
    // ทาบ 40 × 16 = 640 มม. · เส้น 10 ม.: ท่อน ปัดขึ้น((12 − 0.64) ÷ 9.36) = 2 → 10 + 2.64 ม.
    // ท่อน 10 ม. 8 เส้น · ท่อน 2.64 ×8 ลงเส้นละ 3 → 3 เส้น = 11 · เส้น 12 ม. ไม่ต้องต่อ = 8 เส้น
    expect(barPieces(12, 10, 0.64)).toEqual([10, expect.closeTo(2.64, 9)]);
    const r = calcRebar({ bar: "DB16", L: 12, count: 2, stir: "none" });
    expect(rowOf(r, "เหล็กยืน DB16 เส้น 10 ม.")).toBe("11 เส้น · 173.6 กก.");
    expect(rowOf(r, "เหล็กยืน DB16 เส้น 12 ม.")).toBe("8 เส้น · 151.5 กก.");
    expect(rowOf(r, "ต่อทาบ")).toBe("ยาวเกินเส้น ต่อทาบ 40Ø = 64 ซม. ต่อจุด");
  });

  it("โหมดยาวรวม: DB12 100 ม. → 10 เส้น (10 ม.) / 9 เส้น (12 ม.)", () => {
    // 100 ÷ 10 = 10 เส้น × 10 × 0.88776 = 88.8 กก. · ปัดขึ้น(100 ÷ 12) = 9 × 12 × 0.88776 = 95.9 กก.
    const r = calcRebar({ mode: "total", total: 100 });
    expect(rowOf(r, "เส้นยาว 10 ม.")).toBe("10 เส้น · 88.8 กก.");
    expect(rowOf(r, "เส้นยาว 12 ม.")).toBe("9 เส้น · 95.9 กก.");
  });

  it("หน้าตัดเล็กจนหักระยะหุ้มแล้วใส่ปลอกไม่ได้ = ตอบไม่ได้", () => {
    expect(calcRebar({ b: 10, h: 10, cover: 4 }).invalid).toBe(true);
  });
});

describe("ช่างคอนกรีต: คิดทั้งงานเทพื้น", () => {
  it("ทรายรองพื้น 5 ซม. บดอัด + ไม้แบบรอบแปลง + คอนกรีต + ไวร์เมช", () => {
    // ทราย 4 × 6 × 0.05 × 1.25 = 1.50 คิว · ไม้แบบ 2 × (4 + 6) = 20 ม.
    const r = concreteJob.calc({});
    expect(r.headline).toBe("สั่ง 3 คิว · รถโม่ 1 เที่ยว · ไวร์เมช 3 แผ่น");
    expect(rowOf(r, "ทรายรองพื้น 5 ซม. (บดอัด)")).toBe("1.50 คิว (ทรายหลวม)");
    expect(rowOf(r, "ไม้แบบข้าง")).toBe("ยาวรอบ 20.0 ม. สูงไม่น้อยกว่า 10 ซม.");
    expect(rowOf(r, "สั่งคอนกรีตผสมเสร็จ")).toBe("3 คิว (สั่งทีละ 0.5 คิว)");
  });
});

/* ═══════════════ ทะเบียน + ค้นหา ═══════════════ */

describe("ทะเบียนสายงานคอนกรีตและเครื่องมือใหม่", () => {
  it("ช่างคอนกรีตอยู่ถัดจากก่อฉาบ ในกลุ่มงานโครงสร้าง มีไอคอน และใช้ค่าคงที่ตัวคูณแห้งเดิม", () => {
    const ids = TRADES.map((t) => t.id);
    expect(ids.indexOf("concrete")).toBe(ids.indexOf("masonry") + 1);
    expect(TRADES.find((t) => t.id === "concrete")?.pillarId).toBe("shell");
    expect(TRADE_ICONS.concrete).toBeTruthy();
    expect(K.MIX.dryVolume.value).toBe(1.54);
  });

  it("เครื่องมือที่ยังไม่มีภาพปกไม่ส่งพาธภาพแตก", () => {
    for (const [trade, tool] of [
      ["general", "inch"],
      ["general", "spacing"],
      ["steel", "railing"],
      ["concrete", "slab"],
      ["concrete", "rebar"],
    ]) {
      expect(getToolCover(trade, tool), `${trade}/${tool}`).toBeUndefined();
    }
    expect(getToolCover("steel", "weight")).toBe("/assistant/tools/steel-weight.webp");
  });

  it.each([
    ["หุน", "general/inch"],
    ["เศษส่วน", "general/inch"],
    ["ลูกกรง", "general/spacing"],
    ["ราวกันตก", "steel/railing"],
    ["กันสาด", "steel/railing"],
    ["ไวร์เมช", "concrete/slab"],
    ["รถโม่", "concrete/slab"],
    ["ปลอก", "concrete/rebar"],
    ["ลวดผูก", "concrete/rebar"],
  ])('ค้น "%s" เจอ %s', (q, path) => {
    expect(searchCatalog(q).tools.map((t) => `${t.tradeId}/${t.id}`)).toContain(path);
  });

  it('ค้น "เทพื้น" เจอสายงานช่างคอนกรีต', () => {
    expect(searchCatalog("เทพื้น").trades.map((t) => t.id)).toContain("concrete");
  });

  it("ค่าคงที่ใหม่ที่ยังไม่ยืนยันต้องเขียนกำกับไว้ในที่มา", () => {
    for (const ref of [
      K.READYMIX.truckM3,
      K.READYMIX.orderStep,
      K.WIRE_MESH.sheetW,
      K.WIRE_MESH.rollL,
      K.RAILING.primerM2PerL,
      K.RAILING.topM2PerL,
      K.RAILING.rodPackKg,
      K.REBAR_WORK.tieLenM,
      K.STEEL_STICK,
    ]) {
      expect(ref.source, ref.label).toMatch(/ยังไม่ยืนยัน/);
    }
  });
});
