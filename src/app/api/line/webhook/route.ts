import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { isNotifyIdRequest } from "@/lib/line-keyword";

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
    if (ev.type !== "message" || ev.message?.type !== "text" || !token) {
      console.info(`[line-webhook] skipped: type=${ev.type} msg=${ev.message?.type ?? "-"} token=${token ? "yes" : "no"}`);
      continue;
    }
    if (!isNotifyIdRequest(ev.message.text ?? "")) {
      console.info(`[line-webhook] text did not match keyword (${(ev.message.text ?? "").length} chars)`);
      continue;
    }
    const id = ev.source?.groupId ?? ev.source?.roomId ?? ev.source?.userId ?? "";
    if (!id) continue;
    // When the OA also uses manual chat in LINE OA Manager, LINE sends no replyToken,
    // so fall back to a push message to the same chat.
    const text = `รหัสสำหรับ LINE_NOTIFY_TO:\n${id}`;
    const [endpoint, body] = ev.replyToken
      ? ["reply", { replyToken: ev.replyToken, messages: [{ type: "text", text }] }]
      : ["push", { to: id, messages: [{ type: "text", text }] }];
    await fetch(`https://api.line.me/v2/bot/message/${endpoint}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    })
      .then(async (r) => {
        if (!r.ok) console.error(`[line-webhook] ${endpoint} failed ${r.status}: ${(await r.text()).slice(0, 200)}`);
        else console.info(`[line-webhook] sent notify id via ${endpoint}`);
      })
      .catch((e) => console.error(`[line-webhook] ${endpoint} error`, String(e)));
  }
  return NextResponse.json({ ok: true });
}
