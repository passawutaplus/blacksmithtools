import { describe, expect, it } from "vitest";
import { normalizeParsedShopee, usableShopeePhone } from "../parse-shopee-order";

describe("usableShopeePhone", () => {
  it("keeps a real mobile number", () => {
    expect(usableShopeePhone("081-234-5678")).toBe("081-234-5678");
  });

  it("drops masked Shopee numbers", () => {
    expect(usableShopeePhone("08x-xxx-5678")).toBe("");
    expect(usableShopeePhone("081-***-5678")).toBe("");
  });
});

describe("normalizeParsedShopee", () => {
  it("maps product lines and money strings", () => {
    const parsed = normalizeParsedShopee({
      buyerName: "สมชาย",
      phone: "0812345678",
      items: [
        {
          name: "ที่แขวนดอกเตอร์",
          variantName: "สีดำ",
          price: "฿199",
          quantity: "2",
          discount: "20",
        },
      ],
    });
    expect(parsed.items).toEqual([
      { name: "ที่แขวนดอกเตอร์", variantName: "สีดำ", price: 199, quantity: 2, discount: 20 },
    ]);
  });

  it("applies order-level discount to the first line", () => {
    const parsed = normalizeParsedShopee({
      orderDiscount: 30,
      items: [
        { name: "A", price: 100, quantity: 1 },
        { name: "B", price: 50, quantity: 1 },
      ],
    });
    expect(parsed.items[0].discount).toBe(30);
    expect(parsed.items[1].discount).toBe(0);
  });

  it("expands Bangkok aliases", () => {
    const parsed = normalizeParsedShopee({ province: "กทม" });
    expect(parsed.province).toBe("กรุงเทพมหานคร");
  });
});
