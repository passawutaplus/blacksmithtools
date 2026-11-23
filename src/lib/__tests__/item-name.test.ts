import { describe, expect, it } from "vitest";
import { baseItemName } from "../item-name";

describe("baseItemName", () => {
  it("strips the variant suffix when it is stored in the name", () => {
    expect(baseItemName({ name: "OSUKA Holder — AB Part", variantName: "AB Part" })).toBe("OSUKA Holder");
  });
  it("leaves names without the suffix alone", () => {
    expect(baseItemName({ name: "Gel", variantName: "500ml" })).toBe("Gel");
    expect(baseItemName({ name: "Gel" })).toBe("Gel");
  });
});

import { shortProductName } from "../product";

describe("shortProductName", () => {
  it("drops the marketplace brand suffix", () => {
    expect(shortProductName("OSUKA Level Holder ที่วางระดับน้ำ BlackSmith-แบรนด์คนไทย")).toBe("OSUKA Level Holder ที่วางระดับน้ำ");
    expect(shortProductName("ที่แขวน BlackSmith")).toBe("ที่แขวน");
    expect(shortProductName("Gel แบรนด์คนไทย")).toBe("Gel");
  });
  it("keeps names without the suffix", () => {
    expect(shortProductName("BlackSmith Battery Mount M18")).toBe("BlackSmith Battery Mount M18");
  });
});
