import { NextResponse } from "next/server";
import { applyTrackSnapshots } from "@/lib/track-sync";
import { isTrack17Configured, parseTrack17Webhook, track17ApiKey, verifyTrack17Signature } from "@/lib/track17";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isTrack17Configured()) {
    return NextResponse.json({ error: "tracking not configured" }, { status: 503 });
  }
  const raw = await req.text();
  const sign = req.headers.get("sign");
  if (!verifyTrack17Signature(raw, sign, track17ApiKey())) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const snapshots = parseTrack17Webhook(payload);
  const results = await applyTrackSnapshots(snapshots);
  return NextResponse.json({ ok: true, updated: results.filter((r) => r.ok).length });
}
