import { NextResponse } from "next/server";
import { hasShopeeVisionKey, parseBillPaste, parseRecipientPaste, parseShopeeOrderImage } from "@/lib/parse-shopee-order-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as { text?: string; mode?: string };
      const text = String(body.text ?? "").trim();
      if (text.length < 6) {
        return NextResponse.json({ error: "วางข้อความก่อน" }, { status: 400 });
      }
      const parsed =
        body.mode === "bill" ? await parseBillPaste(text) : await parseRecipientPaste(text);
      return NextResponse.json({ ok: true, ...parsed });
    }

    if (!hasShopeeVisionKey()) {
      return NextResponse.json(
        { error: "ตั้งค่า GEMINI_API_KEY หรือ OPENAI_API_KEY ใน .env.local เพื่ออ่านแคปช้อปปี้" },
        { status: 400 },
      );
    }
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "เลือกภาพแคปหน้าออเดอร์ช้อปปี้ก่อน" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "ไฟล์ใหญ่เกินไป ลองแคปใหม่หรือย่อภาพ" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "อัปโหลดได้เฉพาะไฟล์ภาพ" }, { status: 400 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const parsed = await parseShopeeOrderImage(bytes, file.type || "image/jpeg");
    return NextResponse.json({ ok: true, ...parsed });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "อ่านไม่สำเร็จ" },
      { status: 400 },
    );
  }
}
