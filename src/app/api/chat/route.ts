import { NextResponse } from "next/server";
import { replyToChat, type ChatMessage } from "@/lib/assistant";

const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const windowMs = 60_000;
  const max = 20;
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
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
