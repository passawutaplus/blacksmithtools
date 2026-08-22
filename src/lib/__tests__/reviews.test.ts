import { describe, expect, it } from "vitest";
import { allowedReviewUrl, normalizeShopReview } from "../reviews";

describe("allowedReviewUrl", () => {
  it("keeps Shopee and LINE https links", () => {
    expect(allowedReviewUrl("https://shopee.co.th/blacksmithaplus")).toContain("shopee.co.th");
    expect(allowedReviewUrl("https://lin.ee/8iXKCd6")).toContain("lin.ee");
  });

  it("rejects other hosts", () => {
    expect(allowedReviewUrl("https://example.com/review")).toBe("");
    expect(allowedReviewUrl("http://shopee.co.th/x")).toBe("");
  });
});

describe("normalizeShopReview", () => {
  it("requires a real quote and clamps stars", () => {
    expect(() => normalizeShopReview({ quote: "ดี" })).toThrow(/8/);
    const row = normalizeShopReview({ quote: "ใส่แบตแล้วล็อกแน่น ใช้ในรถได้เลย", stars: 9, author: "คุณเอ" });
    expect(row.stars).toBe(5);
    expect(row.source).toBe("shopee");
    expect(row.author).toBe("คุณเอ");
  });
});
