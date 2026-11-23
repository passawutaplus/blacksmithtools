import { describe, expect, it } from "vitest";
import { cleanCartItems } from "../cart-items";

describe("cleanCartItems", () => {
  it("drops empty or bad lines and floors quantities", () => {
    expect(
      cleanCartItems([
        { productId: "a", quantity: 2.7 },
        { productId: "b", quantity: 0 },
        { productId: "", quantity: 1 },
      ]),
    ).toEqual([{ productId: "a", variantId: undefined, quantity: 2 }]);
  });

  it("merges duplicates and caps at 99", () => {
    expect(
      cleanCartItems([
        { productId: "a", variantId: "v", quantity: 60 },
        { productId: "a", variantId: "v", quantity: 60 },
      ]),
    ).toEqual([{ productId: "a", variantId: "v", quantity: 99 }]);
  });

  it("keeps at most 50 lines", () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ productId: `p${i}`, quantity: 1 }));
    expect(cleanCartItems(many)).toHaveLength(50);
  });
});
