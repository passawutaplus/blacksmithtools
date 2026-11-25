import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GO_QR_URL } from "../go-qr";
import {
  BRAND_STYLES,
  COPY_CREDIT_LINE,
  DEFAULT_BRAND_STYLE,
  EXPORT_ASSETS,
  GO_URL,
  GO_URL_LABEL,
  QR_MODULES,
  QR_SIZE,
  WATERMARK_ALPHA,
  blendOver,
  contrastRatio,
  isBrandStyle,
  withBrandCredit,
} from "./brand";
import { C } from "./canvas-text";

describe("เครดิตแบรนด์บนไฟล์ส่งออก", () => {
  it("QR และลิงก์ชี้หน้า go ของร้านที่เดียวกับสติกเกอร์สินค้า", () => {
    expect(GO_URL).toBe(GO_QR_URL);
    expect(GO_URL_LABEL).toBe("blacksmith-tools.com/go");
  });

  it("แบบที่ใช้จริงคือ watermark และอีกสองแบบยังเลือกได้ในโค้ด", () => {
    expect(DEFAULT_BRAND_STYLE).toBe("watermark");
    expect([...BRAND_STYLES].sort()).toEqual(["band", "stamp", "watermark"]);
    expect(isBrandStyle("stamp")).toBe(true);
    expect(isBrandStyle("neon")).toBe(false);
    expect(isBrandStyle(null)).toBe(false);
  });

  it("QR ในไฟล์ 2 เท่าไม่เล็กกว่า 180px และทุกโมดูลลงพิกเซลเต็ม", () => {
    expect(QR_SIZE * 2).toBeGreaterThanOrEqual(180);
    expect(Number.isInteger((QR_SIZE * 2) / QR_MODULES)).toBe(true);
  });
});

describe("withBrandCredit", () => {
  const text = "คำนวณ BTU แอร์\nขนาดแอร์แนะนำ: 18,000 BTU\n— Blacksmith · ผู้ช่วยงานช่าง · ค่าประมาณหน้างาน";

  it("ต่อเครดิตพร้อมลิงก์ go หนึ่งบรรทัดท้ายข้อความ โดยไม่แก้เนื้อหาเดิม", () => {
    const out = withBrandCredit(text);
    expect(out.startsWith(text)).toBe(true);
    expect(out.slice(text.length)).toBe(`\n${COPY_CREDIT_LINE}`);
    expect(out.split("\n").at(-1)).toContain(GO_QR_URL);
  });

  it("ไม่ใส่ซ้ำเมื่อมีลิงก์อยู่แล้ว และตัดบรรทัดว่างท้ายข้อความก่อนต่อ", () => {
    const once = withBrandCredit(text);
    expect(withBrandCredit(once)).toBe(once);
    expect(withBrandCredit(`${text}\n\n`)).toBe(once);
  });
});

describe("ลายน้ำไม่ทำให้ตัวหนังสืออ่านยาก", () => {
  const tinted = blendOver(C.navy, WATERMARK_ALPHA, C.white);

  it("ตัวหนังสือ navy และเทาที่ทับลายน้ำยังคมชัดเกิน 4.5:1", () => {
    expect(contrastRatio(C.navy, tinted)).toBeGreaterThan(4.5);
    expect(contrastRatio(C.muted, tinted)).toBeGreaterThan(4.5);
    expect(contrastRatio(C.muted, C.paper)).toBeGreaterThan(4.5);
  });

  it("กล่องพื้นกระดาษแบบโปร่งที่ซ้อนบนลายน้ำ ยังคมชัดเกิน 4.5:1 และบนพื้นขาวได้สีเดียวกับ paper", () => {
    const alpha = Number(/([\d.]+)\)$/.exec(C.paperTint)?.[1]);
    expect(alpha).toBeGreaterThan(0);
    expect(blendOver(C.navy, alpha, C.white).toUpperCase()).toBe(C.paper);
    const stacked = blendOver(C.navy, alpha, tinted);
    expect(contrastRatio(C.navy, stacked)).toBeGreaterThan(4.5);
    expect(contrastRatio(C.muted, stacked)).toBeGreaterThan(4.5);
  });

  it("ตัวหนังสือ rust บนลายน้ำไม่ผ่าน 4.5:1 — เหตุผลที่แผ่นส่งออกใช้ rust เป็นขีด/แถบเท่านั้น", () => {
    expect(contrastRatio(C.rust, tinted)).toBeLessThan(4.5);
  });

  it("ตัวหนังสือบนหัวกระดาษ navy คมชัดพอ", () => {
    expect(contrastRatio(C.white, C.navy)).toBeGreaterThan(4.5);
    expect(contrastRatio(C.onNavyMuted, C.navy)).toBeGreaterThan(4.5);
  });
});

describe("ไฟล์โลโก้ / QR ที่ใช้วาดลงแผ่น", () => {
  /** อ่านกว้าง×สูงจากหัวไฟล์ PNG (IHDR) */
  const pngSize = (src: string) => {
    const buf = readFileSync(join(process.cwd(), "public", src));
    expect(buf.subarray(1, 4).toString("latin1")).toBe("PNG");
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), bytes: buf.length };
  };

  it("สัดส่วนที่ประกาศตรงกับไฟล์จริง (โลโก้ไม่ถูกยืด) และไฟล์เล็กพอ", () => {
    for (const asset of Object.values(EXPORT_ASSETS)) {
      const size = pngSize(asset.src);
      expect({ w: size.w, h: size.h }).toEqual({ w: asset.w, h: asset.h });
      expect(size.bytes).toBeLessThan(40_000);
    }
  });

  it("QR เป็นสี่เหลี่ยมจัตุรัส จุดต่อโมดูลเป็นจำนวนเต็ม", () => {
    const { w, h } = EXPORT_ASSETS.qrGo;
    expect(w).toBe(h);
    expect(Number.isInteger(w / QR_MODULES)).toBe(true);
  });
});
