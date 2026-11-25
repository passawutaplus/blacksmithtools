import { NextResponse, after } from "next/server";
import { customAlphabet } from "nanoid";
import { quoteRequestSchema, type QuoteRequest } from "@/lib/print-quote/request";
import { PRINT_CONFIG, parcelFee } from "@/lib/print-quote/pricing";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { hasBlobStore } from "@/lib/runtime-store";
import { savePrintQuote } from "@/lib/db";
import { pushLine } from "@/lib/notify";

export const dynamic = "force-dynamic";

const quoteId = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 5);

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
}

function alertText(id: string, q: QuoteRequest) {
  const proc = PRINT_CONFIG[q.process];
  const files = q.files
    .slice(0, 15)
    .map((f) => {
      const size = f.dims ? ` ${f.dims.map((n) => n.toFixed(0)).join("×")}มม.` : "";
      const flag = f.status === "ok" ? "" : f.status === "warn" ? " ⚠" : " ✕";
      const want = f.wantMm?.some(Boolean) ? `\n   ต้องการ ${f.wantMm.map((n) => n || "-").join("×")} มม.` : "";
      const note = f.note?.trim() ? `\n   📝 ${f.note.trim().slice(0, 200)}` : "";
      const link = f.blobPath && siteUrl()
        ? `\n   ${siteUrl()}/api/admin/print-file?path=${encodeURIComponent(f.blobPath)}`
        : "";
      return `• ${f.name} × ${f.qty}${size}${flag}${want}${note}${link}`;
    })
    .join("\n");
  const price = q.estimate.printTHB != null ? `฿${q.estimate.printTHB.toLocaleString("th-TH")}` : "ร้านประเมิน";
  const c = q.contact;
  return [
    `🧊 ขอใบเสนอราคาพิมพ์ 3D #${id}`,
    `${proc.label} · layer ${proc.layerMm[q.quality]} มม.`,
    files,
    `ราคาที่เว็บคำนวณ (ตรวจไฟล์ก่อนยืนยัน): ${price} + ส่ง ${q.shipping === "parcel" ? (parcelFee(q.estimate.printTHB) ? `฿${PRINT_CONFIG.shippingTHB}` : "ฟรี (ยอด 1,000+)") : "ไรเดอร์ เก็บปลายทาง"}`,
    `👤 ${c.name} · ${c.phone}${c.lineId ? ` · LINE ${c.lineId}` : ""}`,
    `📦 ${c.address} ${c.subdistrict} ${c.district} ${c.province} ${c.zip}`,
    c.wantDate ? `📅 ต้องการรับ ${c.wantDate}` : "",
    q.keepFiles ? "ไฟล์: ใช้เพื่องานนี้ ลบอัตโนมัติใน 30 วัน" : "ไฟล์: ลูกค้าไม่ให้เก็บไฟล์ ขอไฟล์ทางแชท",
    siteUrl() ? `➡️ ยืนยันราคา/เปิดออเดอร์: ${siteUrl()}/admin/print-quotes` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  if (rateLimited(`pq:${clientIp(req)}`, 6, 10 * 60_000)) {
    return NextResponse.json({ error: "ส่งคำขอถี่ไป ลองใหม่ในอีกครู่" }, { status: 429 });
  }
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const parsed = quoteRequestSchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message;
    return NextResponse.json({ error: msg && !msg.startsWith("Invalid") ? msg : "ข้อมูลไม่ครบ" }, { status: 400 });
  }
  const q = parsed.data;

  // The estimate comes from the customer's browser: never trust it. Drop values that break
  // the shop's own rules (below the minimum, not ending in 0/5); the admin confirms the real price.
  const p = q.estimate.printTHB;
  const min = PRINT_CONFIG[q.process].minOrderTHB;
  if (p != null && ((min != null && p < min) || p % 5 !== 0)) q.estimate.printTHB = null;
  // Unprintable files are not part of the request.
  q.files = q.files.filter((f) => f.status !== "error");
  if (!q.files.length) return NextResponse.json({ error: "ยังไม่มีไฟล์ที่ใช้ได้" }, { status: 400 });

  // Files are only kept when the customer agreed.
  if (!q.keepFiles) q.files.forEach((f) => delete f.blobPath);

  // Make sure every referenced file really exists in our private store.
  if (hasBlobStore() && q.files.some((f) => f.blobPath)) {
    const { head } = await import("@vercel/blob");
    for (const f of q.files) {
      if (!f.blobPath) continue;
      try {
        await head(f.blobPath);
      } catch {
        delete f.blobPath;
      }
    }
  }

  const id = `Q${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${quoteId()}`;
  const now = new Date().toISOString();
  await savePrintQuote({ id, createdAt: now, updatedAt: now, status: "new", ...q });
  after(() => pushLine(alertText(id, q)));
  return NextResponse.json({ ok: true, id });
}
