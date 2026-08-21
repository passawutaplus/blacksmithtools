import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { slipFilePath } from "@/lib/db";

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
