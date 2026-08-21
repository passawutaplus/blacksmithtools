import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { getOrderByToken, submitSlip } from "@/lib/db";

export async function POST(req: Request) {
  const form = await req.formData();
  const token = String(form.get("token") ?? "");
  const file = form.get("slip");
  if (!token || !(file instanceof File)) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
  }

  const allowed = ["image/jpeg", "image/png", "application/pdf"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "รองรับเฉพาะ JPG PNG PDF" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 5MB" }, { status: 400 });
  }

  const detail = await getOrderByToken(token);
  if (!detail) return NextResponse.json({ error: "ไม่พบบิล" }, { status: 404 });

  const buf = Buffer.from(await file.arrayBuffer());
  // magic bytes check (jpeg/png/pdf)
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  const isPdf = buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;
  if (!isJpeg && !isPng && !isPdf) {
    return NextResponse.json({ error: "ไฟล์ไม่ถูกต้อง" }, { status: 400 });
  }

  const ext = isPdf ? "pdf" : isPng ? "png" : "jpg";
  const dir = process.env.VERCEL
    ? path.join("/tmp", "blacksmith-runtime", "slips")
    : path.join(process.cwd(), "data", "runtime", "slips");
  await fs.mkdir(dir, { recursive: true });
  const filename = `${nanoid(16)}.${ext}`;
  await fs.writeFile(path.join(dir, filename), buf);

  const { order } = await submitSlip(detail.order.id, filename);
  return NextResponse.json({ ok: true, status: order.status });
}