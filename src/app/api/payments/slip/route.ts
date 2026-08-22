import { NextResponse } from "next/server";
import { getOrderByToken, submitSlip } from "@/lib/db";
import { saveSlipUpload } from "@/lib/save-image-upload";

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

  try {
    const filename = await saveSlipUpload(file);
    const { order } = await submitSlip(detail.order.id, filename);
    return NextResponse.json({ ok: true, status: order.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "อัปสลิปไม่สำเร็จ" },
      { status: 400 },
    );
  }
}
