import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

/**
 * LINE OA webhook — only used for setup: send "รหัสแจ้งเตือน" to the OA
 * (in a 1:1 chat or a group with the OA) and it replies with the ID
 * to put in LINE_NOTIFY_TO. Requests are verified with LINE_CHANNEL_SECRET.
 */
function validSignature(body: string, signature: string | null) {
  const secret = process.env.LINE_CHANNEL_SECRET?.trim();
  if (!secret || !signature) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(body).digest("base64"));
  const got = Buffer.from(signature);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { type: string; userId?: string; groupId?: string; roomId?: string };
  message?: { type: string; text?: string };
};

export async function POST(req: Request) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-line-signature"))) {
    console.warn("[line-webhook] rejected: bad or missing signature");
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  const { events = [] } = JSON.parse(raw) as { events?: LineEvent[] };
  // Diagnostics only: event kinds, never message text or IDs.
  console.info(
    `[line-webhook] ${events.length} event(s): ${events.map((e) => `${e.type}/${e.source?.type ?? "?"}`).join(", ") || "none"}; token ${token ? "set" : "MISSING"}`,
  );
  for (const ev of events) {
    const text = ev.message?.text?.replace(/\s+/g, "");
    if (ev.type !== "message" || !ev.replyToken || !token || text !== "รหัสแจ้งเตือน") continue;
    const id = ev.source?.groupId ?? ev.source?.roomId ?? ev.source?.userId ?? "";
    await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        replyToken: ev.replyToken,
        messages: [{ type: "text", text: `รหัสสำหรับ LINE_NOTIFY_TO:\n${id}` }],
      }),
      signal: AbortSignal.timeout(8000),
    })
      .then(async (r) => {
        if (!r.ok) console.error(`[line-webhook] reply failed ${r.status}: ${(await r.text()).slice(0, 200)}`);
        else console.info("[line-webhook] replied with notify id");
      })
      .catch((e) => console.error("[line-webhook] reply error", String(e)));
  }
  return NextResponse.json({ ok: true });
}
