import { NextResponse } from "next/server";
import { replyToChat, type ChatMessage } from "@/lib/assistant";
import { clientIp, rateLimited } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (rateLimited(`chat:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "ถามถี่ไป ลองใหม่ในอีกครู่" }, { status: 429 });
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
  const clean: ChatMessage[] = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  if (!clean.some((m) => m.role === "user")) {
    return NextResponse.json({ error: "ไม่มีข้อความ" }, { status: 400 });
  }

  const reply = await replyToChat(clean);
  return NextResponse.json(reply);
}
