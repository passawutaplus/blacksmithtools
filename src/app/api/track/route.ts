import { NextResponse } from "next/server";
import { getOrderByNumberAndPhone } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  const number = String(body.number ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  if (!number || !phone) {
    return NextResponse.json({ error: "กรอกเลขบิลและเบอร์โทร" }, { status: 400 });
  }
  const detail = await getOrderByNumberAndPhone(number, phone);
  if (!detail) {
    return NextResponse.json({ error: "ไม่พบออเดอร์ หรือข้อมูลไม่ตรง" }, { status: 404 });
  }
  return NextResponse.json({ token: detail.order.token });
}