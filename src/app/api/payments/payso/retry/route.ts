import { NextResponse } from "next/server";
import { attachPaysoRef, getOrderByToken, getSettings } from "@/lib/db";
import { createPaysoPayment, newPaysoRef, paysoReady, postbackToken } from "@/lib/payments/payso";
import { verifyPaysoRef } from "@/lib/payments/payso-confirm";

/** Customer pressed "จ่ายอีกครั้ง" on the bill: new Payso reference for the same order. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { token?: string };
  const detail = body.token ? await getOrderByToken(String(body.token)) : null;
  if (!detail) return NextResponse.json({ error: "ไม่พบบิล" }, { status: 404 });
  const { order, payment } = detail;
  const settings = await getSettings();
  if (order.paymentMethod !== "payso" || !settings.paymentsLive || !paysoReady()) {
    return NextResponse.json({ error: "ช่องทางนี้ปิดอยู่" }, { status: 400 });
  }
  if (order.status !== "pending_payment") {
    return NextResponse.json({ error: "บิลนี้ไม่อยู่ในสถานะรอชำระ" }, { status: 400 });
  }
  // The previous attempt may have gone through already.
  if (payment?.paysoRef) {
    const r = await verifyPaysoRef(payment.paysoRef);
    if (r.ok) return NextResponse.json({ ok: true, paid: true });
  }
  const email = order.address.email || order.billing?.email;
  if (!email) return NextResponse.json({ error: "บิลนี้ไม่มีอีเมล ติดต่อร้านทาง LINE" }, { status: 400 });

  const site = (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, "");
  const ref = newPaysoRef();
  try {
    const pay = await createPaysoPayment({
      referenceNo: ref,
      amount: order.grandTotal,
      customerEmail: email,
      description: `BlackSmith ${order.number}`,
      returnUrl: `${site}/bill/${order.token}?payso=1`,
      postbackUrl: `${site}/api/payments/payso/webhook?ref=${ref}&k=${postbackToken(ref)}`,
    });
    await attachPaysoRef(order.id, ref, pay.transactionId);
    return NextResponse.json({ ok: true, redirectUrl: pay.redirectUrl });
  } catch (e) {
    console.error("[payso] retry failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "เชื่อมต่อ Payso ไม่ได้ ลองใหม่หรือโอนเข้าบัญชีแทน" }, { status: 502 });
  }
}
