import { NextResponse } from "next/server";
import { checkVoucher, listClaimableVouchers } from "@/lib/db";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import type { CartItemInput } from "@/lib/db";

/** Public voucher chips for "เก็บโค้ด". Secret codes are never listed. */
export async function GET() {
  return NextResponse.json({ vouchers: await listClaimableVouchers() });
}

/** Preview a code against the cart. Rate-limited so codes cannot be guessed in bulk. */
export async function POST(req: Request) {
  if (rateLimited(`voucher:${clientIp(req)}`, 12, 10 * 60_000)) {
    return NextResponse.json({ ok: false, error: "ลองโค้ดบ่อยเกินไป รอสักครู่แล้วลองใหม่" }, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    code?: string;
    items?: CartItemInput[];
    phone?: string;
  };
  const code = String(body.code ?? "").trim();
  if (!code) return NextResponse.json({ ok: false, error: "ใส่โค้ดก่อน" }, { status: 400 });
  const result = await checkVoucher(code, Array.isArray(body.items) ? body.items : [], body.phone);
  return NextResponse.json(result);
}
