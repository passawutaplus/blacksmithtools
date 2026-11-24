import { describe, expect, it } from "vitest";
import { evaluateVoucher, isClaimable, normalizeVoucherCode, normalizeVoucherInput } from "../vouchers";
import type { Voucher } from "../types";

const base: Voucher = {
  id: "v1", code: "SAVE30", kind: "fixed", value: 30, minSubtotal: 500, maxDiscount: 0,
  usageLimit: 0, usedCount: 0, oncePerPhone: true, public: true, active: true,
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
};
const ctx = { subtotal: 600, shippingFee: 35 };

describe("evaluateVoucher", () => {
  it("applies fixed discount", () => expect(evaluateVoucher(base, ctx)).toEqual({ ok: true, discount: 30 }));
  it("rejects below minimum", () => expect(evaluateVoucher(base, { ...ctx, subtotal: 400 }).ok).toBe(false));
  it("caps fixed discount at subtotal", () =>
    expect(evaluateVoucher({ ...base, value: 900, minSubtotal: 0 }, { subtotal: 100, shippingFee: 35 })).toEqual({ ok: true, discount: 100 }));
  it("percent with cap", () =>
    expect(evaluateVoucher({ ...base, kind: "percent", value: 10, maxDiscount: 40 }, { subtotal: 1000, shippingFee: 0 })).toEqual({ ok: true, discount: 40 }));
  it("free shipping covers the fee", () =>
    expect(evaluateVoucher({ ...base, kind: "free_shipping", value: 0 }, ctx)).toEqual({ ok: true, discount: 35 }));
  it("free shipping useless when already free", () =>
    expect(evaluateVoucher({ ...base, kind: "free_shipping", value: 0 }, { ...ctx, shippingFee: 0 }).ok).toBe(false));
  it("rejects expired / not started / exhausted / inactive", () => {
    const now = Date.parse("2026-06-01T00:00:00Z");
    expect(evaluateVoucher({ ...base, endsAt: "2026-05-01T00:00:00Z" }, { ...ctx, now }).ok).toBe(false);
    expect(evaluateVoucher({ ...base, startsAt: "2026-07-01T00:00:00Z" }, { ...ctx, now }).ok).toBe(false);
    expect(evaluateVoucher({ ...base, usageLimit: 5, usedCount: 5 }, ctx).ok).toBe(false);
    expect(evaluateVoucher({ ...base, active: false }, ctx).ok).toBe(false);
    expect(evaluateVoucher(undefined, ctx).ok).toBe(false);
  });
  it("blocks a phone that already used it", () =>
    expect(evaluateVoucher(base, { ...ctx, phoneAlreadyUsed: true }).ok).toBe(false));
});

describe("helpers", () => {
  it("normalizes codes", () => expect(normalizeVoucherCode(" save-30! ")).toBe("SAVE-30"));
  it("validates admin input", () => {
    expect(() => normalizeVoucherInput({ code: "ab", kind: "fixed", value: 10 })).toThrow();
    expect(() => normalizeVoucherInput({ code: "ABC", kind: "percent", value: 150 })).toThrow();
    expect(normalizeVoucherInput({ code: "abc", kind: "free_shipping" }).value).toBe(0);
  });
  it("only public active vouchers are claimable", () => {
    expect(isClaimable(base)).toBe(true);
    expect(isClaimable({ ...base, public: false })).toBe(false);
  });
});
