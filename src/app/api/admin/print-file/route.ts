import { NextResponse } from "next/server";
import { QUOTE_STORED_PATH } from "@/lib/print-quote/request";
import { hasBlobStore } from "@/lib/runtime-store";

export const dynamic = "force-dynamic";

/** Admin-only (guarded by src/proxy.ts): download a customer's quote file from private Blob. */
export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get("path") ?? "";
  if (!QUOTE_STORED_PATH.test(path)) return NextResponse.json({ error: "ไฟล์ไม่ถูกต้อง" }, { status: 400 });
  if (!hasBlobStore()) return NextResponse.json({ error: "ไม่ได้ตั้งค่าที่เก็บไฟล์" }, { status: 404 });
  const { get } = await import("@vercel/blob");
  const result = await get(path, { access: "private" }).catch(() => null);
  if (!result || result.statusCode !== 200 || !result.stream) {
    return NextResponse.json({ error: "ไม่พบไฟล์ (อาจถูกลบอัตโนมัติแล้ว)" }, { status: 404 });
  }
  const filename = path.split("/").pop() ?? "model.stl";
  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
