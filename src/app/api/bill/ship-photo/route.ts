import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { getShipmentPhotoForToken } from "@/lib/db";
import { imageResponse } from "@/lib/save-image-upload";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const file = url.searchParams.get("file") ?? "";
  if (!token || !file) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
  }
  const full = await getShipmentPhotoForToken(token, file);
  if (!full) return NextResponse.json({ error: "ไม่พบภาพ" }, { status: 404 });
  try {
    const buf = await fs.readFile(full);
    return imageResponse(buf, file);
  } catch {
    return NextResponse.json({ error: "ไม่พบภาพ" }, { status: 404 });
  }
}
