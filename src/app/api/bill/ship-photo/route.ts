import { NextResponse } from "next/server";
import { getShipmentPhotoForToken, readShipPhotoBytes } from "@/lib/db";
import { imageResponse } from "@/lib/save-image-upload";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const file = url.searchParams.get("file") ?? "";
  if (!token || !file) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
  }
  const allowed = await getShipmentPhotoForToken(token, file);
  if (!allowed) return NextResponse.json({ error: "ไม่พบภาพ" }, { status: 404 });
  const buf = await readShipPhotoBytes(file);
  if (!buf) return NextResponse.json({ error: "ไม่พบภาพ" }, { status: 404 });
  return imageResponse(buf, file);
}
