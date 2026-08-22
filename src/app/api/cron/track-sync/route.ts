import { NextResponse } from "next/server";
import { syncOpenShipmentsFromTrack17 } from "@/lib/track-sync";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await syncOpenShipmentsFromTrack17();
  return NextResponse.json(result);
}
