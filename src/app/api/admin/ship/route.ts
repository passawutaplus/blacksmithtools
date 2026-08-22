import { NextResponse } from "next/server";
import {
  addShipmentPhotos,
  readShipPhotoBytes,
  shipOrder,
  updateShipment,
} from "@/lib/db";
import { saveJpegOrPng, imageResponse } from "@/lib/save-image-upload";
import { registerShipmentTracking } from "@/lib/track-sync";
import { CARRIERS } from "@/lib/shipping";
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
    names.push(await saveJpegOrPng("ship-photos", file));
  }
  return names;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const orderId = String(form.get("orderId") ?? "");
    const shipmentId = String(form.get("shipmentId") ?? "");
    const action = String(form.get("action") ?? "");
    if (!orderId) {
      return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 400 });
    }

    if (action === "update") {
      if (!shipmentId) {
        return NextResponse.json({ error: "ไม่พบพัสดุ" }, { status: 400 });
      }
      const carrier = String(form.get("carrier") ?? "") as Carrier;
      if (!CARRIERS.includes(carrier)) {
        return NextResponse.json({ error: "ขนส่งไม่ถูกต้อง" }, { status: 400 });
      }
      const result = await updateShipment(orderId, shipmentId, {
        carrier,
        trackingNo: String(form.get("trackingNo") ?? ""),
      });
      if (result.changed) {
        await registerShipmentTracking(result.order, result.shipment);
      }
      return NextResponse.json({ ok: true, ...result });
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
  const buf = await readShipPhotoBytes(file);
  if (!buf) return NextResponse.json({ error: "ไม่พบภาพ" }, { status: 404 });
  return imageResponse(buf, file);
}
