import { NextResponse } from "next/server";
import { applyPaysoWebhook } from "@/lib/db";

/**
 * Payso / Pay Solutions postback webhook.
 * Verify hash/signature with PAYSO_SECRET when going live.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const refno = String(body.refno ?? body.orderNo ?? "");
    const amount = Number(body.amount ?? body.total);
    const status = String(body.status ?? body.payment_status ?? "");
    const providerRef = String(body.transactionid ?? body.txn_id ?? body.id ?? "");

    if (!refno || !providerRef || Number.isNaN(amount)) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }

    // TODO: verify signature when merchant credentials available
    const secret = process.env.PAYSO_SECRET;
    if (process.env.PAYMENTS_LIVE === "true" && !secret) {
      return NextResponse.json({ error: "misconfigured" }, { status: 500 });
    }

    const result = await applyPaysoWebhook({
      refno,
      amount,
      status: status.toLowerCase(),
      providerRef,
    });

    return NextResponse.json({ ok: true, duplicate: result.duplicate });
  } catch (e) {
    const message = e instanceof Error ? e.message : "webhook error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}