import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";

const MAX_BYTES = 5 * 1024 * 1024;

export async function saveJpegOrPng(dir: string, file: File) {
  if (file.size > MAX_BYTES) {
    throw new Error("ไฟล์ใหญ่เกิน 5MB");
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  if (!isJpeg && !isPng) {
    throw new Error("รองรับเฉพาะ JPG และ PNG");
  }
  await fs.mkdir(dir, { recursive: true });
  const filename = `${nanoid(16)}.${isPng ? "png" : "jpg"}`;
  await fs.writeFile(path.join(dir, filename), buf);
  return filename;
}

export function imageResponse(buf: Buffer, filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  const type = ext === "png" ? "image/png" : "image/jpeg";
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
