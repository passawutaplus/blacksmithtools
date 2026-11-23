import "server-only";
import { confirmPaysoPaid, findOrderByPaysoRef } from "@/lib/db";
import { notifyShop, orderAlertText } from "@/lib/notify";
import { inquirePayso, paysoReady, sameAmount } from "./payso";

/** Look up the ref at Payso and mark the order paid only if Payso says it is complete and the amount matches. */
export async function verifyPaysoRef(ref: string) {
  if (!/^\d{12}$/.test(ref) || !paysoReady()) return { ok: false as const, reason: "invalid" };
  const found = await findOrderByPaysoRef(ref);
  if (!found) return { ok: false as const, reason: "not_found" };
  if (found.order.status !== "pending_payment" && found.order.status !== "payment_submitted") {
    return { ok: true as const, duplicate: true, order: found.order };
  }
  const result = await inquirePayso(ref);
  if (!result?.paid) return { ok: false as const, reason: "not_paid" };
  if (!sameAmount(result.total, found.order.grandTotal)) {
    return { ok: false as const, reason: "amount_mismatch" };
  }
  const done = await confirmPaysoPaid(ref, result.total, result.orderNo);
  if (!done.duplicate) notifyShop(orderAlertText("paid", done.order));
  return { ok: true as const, duplicate: done.duplicate, order: done.order };
}
