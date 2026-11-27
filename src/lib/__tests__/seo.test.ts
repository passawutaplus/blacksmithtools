import { describe, expect, it } from "vitest";
import catalog from "../../data/shopee-catalog.json";
import { breadcrumbLd, metaDescription, seoProductTitle } from "../seo";

type Row = { nameTh: string };
const rows: Row[] = Array.isArray(catalog) ? (catalog as Row[]) : ((catalog as { products: Row[] }).products);

describe("seoProductTitle", () => {
  it("keeps short names and drops the marketplace brand suffix", () => {
    expect(seoProductTitle("Packout Lid-Lock ตัวล็อคฝา BlackSmith-แบรนด์คนไทย")).toBe("Packout Lid-Lock ตัวล็อคฝา");
  });

  it("stays near 60 chars and never ends on a dangling connector", () => {
    for (const r of rows) {
      const t = seoProductTitle(r.nameTh);
      expect(t.length).toBeLessThanOrEqual(62);
      expect(t).not.toMatch(/\s(สำหรับ|ของ|และ|กับ)$/u);
    }
  });

  it("keeps the size when GoopOrange listings share the same opening words", () => {
    const goop = rows.filter((r) => r.nameTh.startsWith("GoopOrange")).map((r) => seoProductTitle(r.nameTh));
    expect(goop.length).toBeGreaterThan(5);
    expect(new Set(goop).size).toBeGreaterThanOrEqual(goop.length - 1);
  });
});

describe("metaDescription", () => {
  it("cuts long text with an ellipsis under the limit", () => {
    const d = metaDescription("คำ ".repeat(100));
    expect(d.length).toBeLessThanOrEqual(155);
    expect(d.endsWith("…")).toBe(true);
  });
});

describe("breadcrumbLd", () => {
  it("numbers items from 1 and maps home to the site root", () => {
    const ld = breadcrumbLd([
      ["หน้าแรก", "/"],
      ["ร้านค้า", "/shop"],
    ]);
    expect(ld.itemListElement[0]).toMatchObject({ position: 1, item: expect.not.stringMatching(/\/$/) });
    expect(ld.itemListElement[1].item).toMatch(/\/shop$/);
  });
});
