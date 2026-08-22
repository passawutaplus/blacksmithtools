import { describe, expect, it } from "vitest";
import { formatPhoneDisplay, normalizePhoneDigits, phonesMatch } from "../phone";
import { filterBillsByPhone, toTrackBillSummary } from "../track-bills";

describe("normalizePhoneDigits", () => {
  it("keeps local 0-prefixed numbers", () => {
    expect(normalizePhoneDigits("081-234-5678")).toBe("0812345678");
  });

  it("converts +66 to local 0", () => {
    expect(normalizePhoneDigits("+66 81 234 5678")).toBe("0812345678");
    expect(normalizePhoneDigits("66812345678")).toBe("0812345678");
  });
});

describe("formatPhoneDisplay", () => {
  it("groups a 10-digit mobile number", () => {
    expect(formatPhoneDisplay("0866259407")).toBe("086-625-9407");
  });
});

describe("phonesMatch", () => {
  it("matches formatted variants of the same number", () => {
    expect(phonesMatch("081-234-5678", "+66812345678")).toBe(true);
    expect(phonesMatch("0812345678", "812345678")).toBe(true);
  });

  it("rejects short or different numbers", () => {
    expect(phonesMatch("0812345678", "0812345679")).toBe(false);
    expect(phonesMatch("08123", "08123")).toBe(false);
  });
});

describe("filterBillsByPhone", () => {
  const orders = [
    {
      token: "old",
      number: "BS-1",
      status: "paid",
      createdAt: "2026-01-01T00:00:00.000Z",
      grandTotal: 100,
      items: [{ quantity: 1 }],
      address: { phone: "081-234-5678" },
    },
    {
      token: "new",
      number: "BS-2",
      status: "shipped",
      createdAt: "2026-08-01T00:00:00.000Z",
      grandTotal: 250,
      items: [{ quantity: 2 }, { quantity: 1 }],
      address: { phone: "+66 81 234 5678" },
    },
    {
      token: "other",
      number: "BS-3",
      status: "paid",
      createdAt: "2026-08-02T00:00:00.000Z",
      grandTotal: 50,
      items: [{ quantity: 1 }],
      address: { phone: "0891112222" },
    },
  ];

  it("returns newest first and omits other phones", () => {
    const found = filterBillsByPhone(orders, "0812345678");
    expect(found.map((o) => o.token)).toEqual(["new", "old"]);
    expect(toTrackBillSummary(found[0])).toMatchObject({
      token: "new",
      number: "BS-2",
      itemCount: 3,
      grandTotal: 250,
    });
  });

  it("returns empty when the query is too short", () => {
    expect(filterBillsByPhone(orders, "08123")).toEqual([]);
  });
});
