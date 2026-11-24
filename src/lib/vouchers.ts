import type { Voucher, VoucherKind } from "./types";

export const VOUCHER_KINDS: VoucherKind[] = ["fixed", "percent", "free_shipping"];

export const VOUCHER_KIND_LABEL: Record<VoucherKind, string> = {
  fixed: "ลดเป็นบาท",
  percent: "ลดเป็นเปอร์เซ็นต์",
  free_shipping: "ส่งฟรี",
};

export function normalizeVoucherCode(raw: unknown) {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 20);
}

export function voucherHeadline(v: Pick<Voucher, "kind" | "value">) {
  if (v.kind === "free_shipping") return "ส่งฟรี";
  if (v.kind === "percent") return `ลด ${v.value}%`;
  return `ลด ฿${v.value.toLocaleString("th-TH")}`;
}

export function voucherCondition(v: Pick<Voucher, "minSubtotal" | "maxDiscount" | "kind">) {
  const parts: string[] = [];
  parts.push(v.minSubtotal > 0 ? `ขั้นต่ำ ฿${v.minSubtotal.toLocaleString("th-TH")}` : "ไม่มีขั้นต่ำ");
  if (v.kind === "percent" && v.maxDiscount > 0) parts.push(`ลดสูงสุด ฿${v.maxDiscount.toLocaleString("th-TH")}`);
  return parts.join(" · ");
}

export type VoucherCheck =
  | { ok: true; discount: number }
  | { ok: false; error: string };

/**
 * Pure rule check. `phoneAlreadyUsed` is looked up by the caller from real
 * orders so one phone number cannot reuse an `oncePerPhone` code.
 */
export function evaluateVoucher(
  v: Voucher | undefined,
  ctx: { subtotal: number; shippingFee: number; now?: number; phoneAlreadyUsed?: boolean },
): VoucherCheck {
  if (!v || !v.active) return { ok: false, error: "ไม่พบโค้ดนี้ หรือหมดอายุแล้ว" };
  const now = ctx.now ?? Date.now();
  if (v.startsAt && Date.parse(v.startsAt) > now) return { ok: false, error: "โค้ดนี้ยังไม่เริ่มใช้งาน" };
  if (v.endsAt && Date.parse(v.endsAt) < now) return { ok: false, error: "โค้ดนี้หมดอายุแล้ว" };
  if (v.usageLimit > 0 && v.usedCount >= v.usageLimit) return { ok: false, error: "สิทธิ์โค้ดนี้ถูกใช้ครบแล้ว" };
  if (ctx.subtotal < v.minSubtotal) {
    return { ok: false, error: `ยอดสินค้าต้องครบ ฿${v.minSubtotal.toLocaleString("th-TH")} ถึงใช้โค้ดนี้ได้` };
  }
  if (v.oncePerPhone && ctx.phoneAlreadyUsed) return { ok: false, error: "เบอร์นี้เคยใช้โค้ดนี้แล้ว" };

  let discount = 0;
  if (v.kind === "fixed") discount = Math.min(v.value, ctx.subtotal);
  else if (v.kind === "percent") {
    discount = Math.floor((ctx.subtotal * v.value) / 100);
    if (v.maxDiscount > 0) discount = Math.min(discount, v.maxDiscount);
  } else discount = ctx.shippingFee;
  discount = Math.max(0, Math.round(discount));
  if (discount <= 0) {
    return {
      ok: false,
      error: v.kind === "free_shipping" ? "ออเดอร์นี้ส่งฟรีอยู่แล้ว ไม่ต้องใช้โค้ด" : "โค้ดนี้ใช้กับออเดอร์นี้ไม่ได้",
    };
  }
  return { ok: true, discount };
}

/** Admin input → clean Voucher fields; throws a Thai message on bad input. */
export function normalizeVoucherInput(
  input: Partial<Voucher>,
  existing?: Voucher,
): Omit<Voucher, "id" | "createdAt" | "updatedAt" | "usedCount"> {
  const code = normalizeVoucherCode(input.code ?? existing?.code);
  if (code.length < 3) throw new Error("โค้ดต้องยาวอย่างน้อย 3 ตัว (A-Z 0-9)");
  const kind = VOUCHER_KINDS.includes(input.kind as VoucherKind)
    ? (input.kind as VoucherKind)
    : (existing?.kind ?? "fixed");
  const value = Math.round(Number(input.value ?? existing?.value ?? 0));
  if (kind === "fixed" && (value < 1 || value > 100000)) throw new Error("ส่วนลดบาทต้องอยู่ระหว่าง 1–100,000");
  if (kind === "percent" && (value < 1 || value > 100)) throw new Error("ส่วนลด % ต้องอยู่ระหว่าง 1–100");
  const date = (raw: unknown) => {
    const s = String(raw ?? "").trim();
    if (!s) return undefined;
    const t = Date.parse(s);
    if (Number.isNaN(t)) throw new Error("วันที่ไม่ถูกต้อง");
    return new Date(t).toISOString();
  };
  const startsAt = "startsAt" in input ? date(input.startsAt) : existing?.startsAt;
  const endsAt = "endsAt" in input ? date(input.endsAt) : existing?.endsAt;
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) throw new Error("วันสิ้นสุดต้องหลังวันเริ่ม");
  const nonNeg = (n: unknown, fallback: number) => Math.max(0, Math.round(Number(n ?? fallback) || 0));
  return {
    code,
    kind,
    value: kind === "free_shipping" ? 0 : value,
    minSubtotal: nonNeg(input.minSubtotal, existing?.minSubtotal ?? 0),
    maxDiscount: kind === "percent" ? nonNeg(input.maxDiscount, existing?.maxDiscount ?? 0) : 0,
    startsAt,
    endsAt,
    usageLimit: nonNeg(input.usageLimit, existing?.usageLimit ?? 0),
    oncePerPhone: input.oncePerPhone ?? existing?.oncePerPhone ?? true,
    public: input.public ?? existing?.public ?? true,
    active: input.active ?? existing?.active ?? true,
  };
}

/** Safe-to-publish shape for the storefront "เก็บโค้ด" chips. */
export function isClaimable(v: Voucher, now = Date.now()) {
  if (!v.active || !v.public) return false;
  if (v.startsAt && Date.parse(v.startsAt) > now) return false;
  if (v.endsAt && Date.parse(v.endsAt) < now) return false;
  if (v.usageLimit > 0 && v.usedCount >= v.usageLimit) return false;
  return true;
}
