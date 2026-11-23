import { NextResponse } from "next/server";
import { getOrderByNumberAndPhone } from "@/lib/db";
import { normalizePhoneDigits } from "@/lib/phone";
import { clientIp, rateLimited } from "@/lib/rate-limit";

/**
 * Bill lookup needs BOTH the bill number and the phone used to order.
 * A phone alone used to list every bill for that number, which let anyone
 * who knows a customer's phone open their name, address and tax ID.
 */
export async function POST(req: Request) {
  if (rateLimited(`track:${clientIp(req)}`, 10, 10 * 60_000)) {
    return NextResponse.json({ error: "ค้นหาบ่อยเกินไป รอสักครู่แล้วลองใหม่" }, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as { number?: unknown; phone?: unknown };
  const number = String(body.number ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  if (!number) {
    return NextResponse.json({ error: "กรอกเลขบิล เช่น BS-260821-0001" }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "กรอกเบอร์โทรที่ใช้สั่ง" }, { status: 400 });
  }
  if (normalizePhoneDigits(phone).length < 9) {
    return NextResponse.json({ error: "เบอร์โทรไม่ครบ" }, { status: 400 });
  }

  const detail = await getOrderByNumberAndPhone(number, phone);
  if (!detail) {
    return NextResponse.json({ error: "ไม่พบออเดอร์ หรือข้อมูลไม่ตรง" }, { status: 404 });
  }
  return NextResponse.json({ token: detail.order.token, number: detail.order.number });
}
