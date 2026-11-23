import { NextResponse } from "next/server";
import { postbackTokenValid } from "@/lib/payments/payso";
import { verifyPaysoRef } from "@/lib/payments/payso-confirm";

export const dynamic = "force-dynamic";

/**
 * Payso postback.
 * - Dynamic mode (what we send): GET ?ref=<12 digits>&k=<our HMAC>
 * - Default mode (Control Panel URL): POST form with `refno`
 * Postbacks are unsigned, so the body is never trusted: we always re-check
 * the ref with Payso's inquiry API before marking anything paid.
 */
async function handle(ref: string) {
  try {
    const r = await verifyPaysoRef(ref);
    if (!r.ok && r.reason === "invalid") return new NextResponse("bad request", { status: 400 });
    // 200 either way so Payso does not hammer retries; state only changes when verified.
    return new NextResponse(r.ok ? "OK" : "PENDING", { status: 200 });
  } catch (e) {
    console.error("[payso] postback error", e instanceof Error ? e.message : e);
    return new NextResponse("error", { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ref = url.searchParams.get("ref") ?? "";
  if (!postbackTokenValid(ref, url.searchParams.get("k"))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return handle(ref);
}

export async function POST(req: Request) {
  const type = req.headers.get("content-type") ?? "";
  let ref = "";
  if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    ref = String(form?.get("refno") ?? "");
  } else {
    const body = (await req.json().catch(() => ({}))) as { refno?: string };
    ref = String(body.refno ?? "");
  }
  return handle(ref.trim());
}
