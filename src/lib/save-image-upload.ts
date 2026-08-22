import "server-only";
import { nanoid } from "nanoid";
import { writeRuntimeBytes } from "./runtime-store";

const MAX_BYTES = 5 * 1024 * 1024;

function inspectImage(buf: Buffer) {
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  const isPdf = buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;
  return { isJpeg, isPng, isPdf };
}

export async function saveJpegOrPng(kind: "slips" | "ship-photos", file: File) {
  if (file.size > MAX_BYTES) {
    throw new Error("ไฟล์ใหญ่เกิน 5MB");
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const { isJpeg, isPng } = inspectImage(buf);
  if (!isJpeg && !isPng) {
    throw new Error("รองรับเฉพาะ JPG และ PNG");
  }
  const filename = `${nanoid(16)}.${isPng ? "png" : "jpg"}`;
  await writeRuntimeBytes(`${kind}/${filename}`, buf);
  return filename;
}

export async function saveSlipUpload(file: File) {
  if (file.size > MAX_BYTES) {
    throw new Error("ไฟล์ใหญ่เกิน 5MB");
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const { isJpeg, isPng, isPdf } = inspectImage(buf);
  if (!isJpeg && !isPng && !isPdf) {
    throw new Error("รองรับเฉพาะ JPG PNG PDF");
  }
  const ext = isPdf ? "pdf" : isPng ? "png" : "jpg";
  const filename = `${nanoid(16)}.${ext}`;
  await writeRuntimeBytes(`slips/${filename}`, buf);
  return filename;
}

export function imageResponse(buf: Buffer, filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  const type = ext === "png" ? "image/png" : ext === "pdf" ? "application/pdf" : "image/jpeg";
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
