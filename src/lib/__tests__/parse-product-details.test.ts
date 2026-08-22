import { describe, expect, it } from "vitest";
import catalog from "../../data/shopee-catalog.json";
import { getProductDetailSections, getProductBlurb, parseProductDetails } from "../parse-product-details";
import { catalogKind } from "../product-copy";
import type { Product } from "../types";

const tray = `Dewalt Toughsystem 2.0 Short Nesting Cup ถาดเสริมถ้วยสั้น Toughsystem 2.0 (โดยเฉพาะ) BlackSmith แบรนด์คนไทย

📌ถาดเสริมอีกชั้นสำหรับ ถ้วยแบบสั้น ของกล่อง Toughsystem 2.0

📌ข้อมูลเฉพาะรุ่น
-สินค้าแบรนด์ BlackSmith ใช้ร่วมกับเครื่องมือช่างแบรนด์ Dewalt
-ใช้กับกล่อง Toughsystem 2.0
-ขนาดสูง 4.2 เซนติเมตร
-มีสี เหลือง และ ดำ
(**ราคาต่อ 1 ชิ้น รบกวนเช็คขนาดที่ต้องการก่อนสั่งสินค้า**)

📌ข้อมูลสำคัญทั่วไป
-สินค้าผลิตด้วยเครื่อง 3D Printng (FDM)
-เส้นพลาสติก PETG

📍ข้อควรระวัง
-ไม่ควรติดตั้งหรือใช้งานในพื้นที่ที่มีอุณหภูมิสูงเกิน 60องศาเซลเซียส
-ขนาดช่องอาจแน่นเกินไป สามารถใช้ตะไบขัดเพิ่มเติมได้เลย

🧡ขอบคุณลูกค้าที่ร่วมส่งเสริมสินค้าแบรนด์คนไทย ไทยทำ-ไทยใช้-ไทยโกอินเตอร์ 🇹🇭
🔨หากสินค้ามีปัญหาสามารถถ่ายรูปส่งมาทางร้านจะพิจรณาแก้ไขตามเหมาะสม
----------------------------------------------------------------
BlackSmith Tools
จำหน่าย ปลีก-ส่ง เครื่องมือ D.I.Y และอุปกรณ์เสริมเครื่องมือช่าง`;

describe("parseProductDetails", () => {
  it("splits a 3D-print listing into the same heading pattern", () => {
    const sections = parseProductDetails(tray, "Dewalt Toughsystem 2.0 Short Nesting Cup");
    expect(sections.map((s) => s.id)).toEqual(["overview", "model", "material", "caution", "claim"]);
    expect(sections[0].body ?? sections[0].items?.[0]).toMatch(/ถาดเสริมอีกชั้น/);
    expect(sections.find((s) => s.id === "model")?.items).toEqual(
      expect.arrayContaining(["ใช้กับกล่อง Toughsystem 2.0"]),
    );
    expect(sections.find((s) => s.id === "material")?.items?.[0]).toMatch(/3D Printing/);
    expect(sections.some((s) => /ขอบคุณลูกค้า|จำหน่าย ปลีก|Tools Designed/.test(`${s.body ?? ""} ${(s.items ?? []).join(" ")}`))).toBe(
      false,
    );
  });

  it("treats chem how-to as an ordered list and keeps caution", () => {
    const goop = (catalog.products as Product[]).find((p) => p.slug.startsWith("gooporange"))!;
    const sections = parseProductDetails(goop.description, goop.nameTh);
    const usage = sections.find((s) => s.id === "usage");
    expect(usage?.ordered).toBe(true);
    expect(usage?.items?.length).toBeGreaterThanOrEqual(3);
    expect(sections.find((s) => s.id === "caution")?.items?.join(" ")).toMatch(/ห้ามรับประทาน/);
    expect(sections.at(-1)?.id).toBe("claim");
  });

  it("covers every catalog product with at least overview or a known section", () => {
    const empty: string[] = [];
    for (const product of catalog.products as Product[]) {
      const sections = parseProductDetails(product.description, product.nameTh);
      const usable = sections.filter((s) => s.id !== "claim");
      if (usable.length === 0) empty.push(product.slug);
    }
    expect(empty).toEqual([]);
  });
});

describe("getProductDetailSections", () => {
  it("adds how-to only when the listing has none, and skips spec rows already in the listing", () => {
    const product = (catalog.products as Product[]).find((p) => /toughsystem-2-0-short-nesting-cup/i.test(p.slug))!;
    const sections = getProductDetailSections(product);
    expect(sections.filter((s) => s.id === "usage")).toHaveLength(1);
    const specLabels = sections.find((s) => s.id === "specs")?.specs?.map((r) => r.label) ?? [];
    expect(specLabels).not.toContain("วัสดุ");
    expect(specLabels).not.toContain("เข้ากับ");
    expect(specLabels).toEqual(expect.arrayContaining(["ประเภท", "ตัวเลือก"]));
  });

  it("does not duplicate chem how-to that is already in the listing", () => {
    const goop = (catalog.products as Product[]).find((p) => p.slug.startsWith("gooporange"))!;
    const sections = getProductDetailSections(goop);
    expect(sections.filter((s) => s.id === "usage")).toHaveLength(1);
  });

  it("gives every catalog product the same heading pattern", () => {
    const missing: string[] = [];
    for (const product of catalog.products as Product[]) {
      const ids = new Set(getProductDetailSections(product).map((s) => s.id));
      const need = ["overview", "specs", "usage", "caution", "claim"] as const;
      const gap = need.filter((id) => !ids.has(id));
      if (gap.length) missing.push(`${product.slug}: ${gap.join(",")}`);
    }
    expect(missing).toEqual([]);
  });

  it("fills print-only material for listings that skipped it, not for chem or reuse", () => {
    const bit = (catalog.products as Product[]).find((p) => /magnetic-bit-holder/i.test(p.slug))!;
    expect(catalogKind(bit)).toBe("print");
    const ids = new Set(getProductDetailSections(bit).map((s) => s.id));
    expect(ids.has("material")).toBe(true);
    expect(ids.has("usage")).toBe(true);
    expect(ids.has("caution")).toBe(true);

    const goop = (catalog.products as Product[]).find((p) => p.slug.startsWith("gooporange"))!;
    const goopText = getProductDetailSections(goop)
      .filter((s) => s.id === "material")
      .flatMap((s) => s.items ?? [s.body ?? ""])
      .join(" ");
    expect(goopText).not.toMatch(/FDM/i);

    const kleen = (catalog.products as Product[]).find((p) => p.slug.startsWith("kleenboy"))!;
    const kleenSections = getProductDetailSections(kleen);
    expect(kleenSections.find((s) => s.id === "usage")?.items?.[0]).toMatch(/ทดสอบ/);
    expect(kleenSections.find((s) => s.id === "caution")?.items?.join(" ")).not.toMatch(/60/);
  });

  it("uses overview as the shop-card blurb instead of the raw listing dump", () => {
    const product = (catalog.products as Product[]).find((p) => /toughsystem-2-0-short-nesting-cup/i.test(p.slug))!;
    const blurb = getProductBlurb(product);
    expect(blurb).toMatch(/ถาดเสริม/);
    expect(blurb).not.toMatch(/ข้อมูลเฉพาะรุ่น|ขอบคุณลูกค้า/);
  });
});
