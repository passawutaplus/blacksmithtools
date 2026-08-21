import { NextResponse } from "next/server";
import { mockPay } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "missing orderId" }, { status: 400 });
  }
  try {
    const { order } = await mockPay(orderId);
    return NextResponse.redirect(new URL(`/bill/${order.token}?paid=1`, req.url));
  } catch (e) {
    const message = e instanceof Error ? e.message : "fail";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}