import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { hasBlobStore } from "@/lib/runtime-store";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { QUOTE_FILE_PATH, QUOTE_FILE_TTL_DAYS } from "@/lib/print-quote/request";
import { MAX_FILE_BYTES } from "@/lib/print-quote/mesh";

export const dynamic = "force-dynamic";

/** Tells the browser whether files can be uploaded (private Vercel Blob is configured). */
export async function GET() {
  return NextResponse.json({ uploads: hasBlobStore() });
}

/**
 * Issues short-lived client tokens so the browser uploads STL/OBJ straight to
 * PRIVATE Vercel Blob storage (files are too big for a normal API request).
 * Only paths under print-quotes/ with .stl/.obj are allowed, ≤ 50 MB,
 * and every file auto-deletes after 30 days (PDPA).
 */
export async function POST(req: Request) {
  if (!hasBlobStore()) {
    return NextResponse.json({ error: "ยังไม่เปิดรับอัปโหลดไฟล์" }, { status: 503 });
  }
  if (rateLimited(`pq-upload:${clientIp(req)}`, 40, 10 * 60_000)) {
    return NextResponse.json({ error: "อัปโหลดถี่ไป ลองใหม่ในอีกครู่" }, { status: 429 });
  }
  let body: HandleUploadBody;
  try {
    body = (await req.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!QUOTE_FILE_PATH.test(pathname)) throw new Error("ชื่อไฟล์ไม่ถูกต้อง");
        return {
          allowedContentTypes: ["application/octet-stream"],
          maximumSizeInBytes: MAX_FILE_BYTES,
          addRandomSuffix: true,
          allowOverwrite: false,
          ttlDays: QUOTE_FILE_TTL_DAYS,
        };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ" },
      { status: 400 },
    );
  }
}
