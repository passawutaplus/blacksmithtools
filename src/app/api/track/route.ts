import { NextResponse } from "next/server";
import { getOrderByNumberAndPhone, listBillsByPhone } from "@/lib/db";
import { normalizePhoneDigits } from "@/lib/phone";

export async function POST(req: Request) {
  const body = await req.json();
  const number = String(body.number ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  if (!phone) {
    return NextResponse.json({ error: "กรอกเบอร์โทรที่ใช้สั่ง" }, { status: 400 });
  }
  if (normalizePhoneDigits(phone).length < 9) {
    return NextResponse.json({ error: "เบอร์โทรไม่ครบ" }, { status: 400 });
  }

  if (number) {
    const detail = await getOrderByNumberAndPhone(number, phone);
    if (!detail) {
      return NextResponse.json({ error: "ไม่พบออเดอร์ หรือข้อมูลไม่ตรง" }, { status: 404 });
    }
    return NextResponse.json({ token: detail.order.token, number: detail.order.number });
  }

  const bills = await listBillsByPhone(phone);
  if (bills.length === 0) {
    return NextResponse.json({ error: "ไม่พบบิลของเบอร์นี้" }, { status: 404 });
  }
  if (bills.length === 1) {
    return NextResponse.json({ token: bills[0].token, number: bills[0].number, bills });
  }
  return NextResponse.json({ bills });
}
