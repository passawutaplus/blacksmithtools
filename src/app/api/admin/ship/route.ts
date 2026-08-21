import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import {
  addShipmentPhotos,
  shipOrder,
  shipPhotoDir,
  shipPhotoFilePath,
} from "@/lib/db";
import { saveJpegOrPng, imageResponse } from "@/lib/save-image-upload";
import type { Carrier } from "@/lib/types";

export const dynamic = "force-dynamic";

async function collectPhotos(form: FormData) {
  const files = form
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > 8) {
    throw new Error("อัปได้ไม่เกิน 8 รูป");
  }
  const names: string[] = [];
  for (const file of files) {
    names.push(await saveJpegOrPng(shipPhotoDir(), file));
  }
  return names;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const orderId = String(form.get("orderId") ?? "");
    const shipmentId = String(form.get("shipmentId") ?? "");
    if (!orderId) {
      return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 400 });
    }

    const photoPaths = await collectPhotos(form);

    if (shipmentId) {
      if (photoPaths.length === 0) {
        return NextResponse.json({ error: "เลือกภาพก่อนอัป" }, { status: 400 });
      }
      const shipment = await addShipmentPhotos(orderId, shipmentId, photoPaths);
      return NextResponse.json({ ok: true, shipment });
    }

    const carrier = String(form.get("carrier") ?? "") as Carrier;
    const trackingNo = String(form.get("trackingNo") ?? "");
    const note = String(form.get("note") ?? "") || undefined;
    const result = await shipOrder(orderId, {
      carrier,
      trackingNo,
      note,
      photoPaths,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ" },
      { status: 400 },
    );
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const file = url.searchParams.get("file") ?? "";
  const full = shipPhotoFilePath(file);
  if (!full) return NextResponse.json({ error: "ไฟล์ไม่ถูกต้อง" }, { status: 400 });
  try {
    const buf = await fs.readFile(full);
    return imageResponse(buf, file);
  } catch {
    return NextResponse.json({ error: "ไม่พบภาพ" }, { status: 404 });
  }
}
