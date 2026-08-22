import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { attachPaymentSlip, slipDir, slipFilePath } from "@/lib/db";
import { saveSlipUpload } from "@/lib/save-image-upload";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const file = url.searchParams.get("file") ?? "";
  const full = slipFilePath(file);
  if (!full) return NextResponse.json({ error: "ไฟล์ไม่ถูกต้อง" }, { status: 400 });

  try {
    const buf = await fs.readFile(full);
    const ext = file.split(".").pop()?.toLowerCase();
    const type =
      ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : "image/jpeg";
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="${file}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "ไม่พบสลิป" }, { status: 404 });
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const orderId = String(form.get("orderId") ?? "");
    const file = form.get("slip");
    if (!orderId) return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 400 });
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "เลือกไฟล์สลิปก่อน" }, { status: 400 });
    }
    const filename = await saveSlipUpload(slipDir(), file);
    const result = await attachPaymentSlip(orderId, filename, "admin");
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "แนบสลิปไม่สำเร็จ" },
      { status: 400 },
    );
  }
}
