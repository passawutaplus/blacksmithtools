"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, Send, X } from "lucide-react";
import { CHAT_MENU, type AssistantReply, type ChatLink, type ChatMessage } from "@/lib/chat-types";

type Bubble = ChatMessage & {
  links?: ChatLink[];
  showQr?: boolean;
  showMenu?: boolean;
};

const COOKIE_KEY = "bs-cookie-consent";

const WELCOME: Bubble = {
  role: "assistant",
  content: "สวัสดี ยินดีต้อนรับ",
  showMenu: true,
};

export function ChatFab({ lineUrl, lineId }: { lineUrl: string; lineId: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [cookieUp, setCookieUp] = useState(false);
  const [messages, setMessages] = useState<Bubble[]>([WELCOME]);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setCookieUp(!localStorage.getItem(COOKIE_KEY));
    } catch {
      setCookieUp(true);
    }
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  function openPanel() {
    setOpen(true);
    setMessages([WELCOME]);
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;

    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content: c }) => ({ role, content: c })),
        }),
      });
      const data = (await res.json()) as AssistantReply & { error?: string };
      if (!res.ok) throw new Error(data.error || "ส่งไม่สำเร็จ");
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.text,
          links: data.links,
          showQr: data.showQr,
          showMenu: false,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "ส่งไม่สำเร็จ กด LINE มุมบนได้",
          showMenu: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const fabBottom = cookieUp ? "bottom-36" : "bottom-5";

  function MenuButtons() {
    return (
      <div className="mt-2 grid gap-2">
        {CHAT_MENU.map((item) => (
          <button
            key={item}
            type="button"
            className="min-h-11 rounded-[2px] border border-navy/10 bg-steel px-3 py-2 text-left text-sm font-semibold text-navy hover:bg-white"
            onClick={() => send(item)}
          >
            {item}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`no-print fixed right-4 z-[45] ${fabBottom} sm:bottom-6`}>
      {open ? (
        <div className="mb-3 flex h-[min(32rem,calc(100dvh-8rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[3px] bg-white shadow-[0_8px_40px_rgba(35,50,61,0.18)]">
          <div className="flex items-center gap-2 bg-navy px-3 py-2.5 text-white">
            <img src="/brand/mark.png" alt="" className="h-9 w-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">ผู้ช่วยร้าน</p>
              <p className="text-[11px] text-white/70">ตอบออเดอร์ · พิมพ์ 3D · เคลม</p>
            </div>
            <a
              href={lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center rounded-[2px] bg-[#06C755] px-3 text-xs font-bold text-white hover:brightness-110"
            >
              LINE
            </a>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10"
              aria-label="ปิดแชท"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto bg-steel/60 p-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[90%] rounded-[3px] px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user" ? "bg-navy text-white" : "bg-white text-navy shadow-sm"
                  }`}
                >
                  {m.content}
                  {m.showQr ? (
                    <a
                      href={lineUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block rounded border border-steel bg-white p-2"
                    >
                      <img
                        src="/line-oa-qr.png"
                        alt={`QR LINE ${lineId}`}
                        className="mx-auto h-28 w-28 object-contain"
                      />
                      <span className="mt-1 block text-center text-[11px] font-semibold text-forge">
                        เปิดแชท LINE {lineId}
                      </span>
                    </a>
                  ) : null}
                  {m.links?.length ? (
                    <div className="mt-2 flex flex-col gap-1">
                      {m.links.map((l) =>
                        l.external ? (
                          <a
                            key={l.href}
                            href={l.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-forge underline"
                          >
                            {l.label}
                          </a>
                        ) : (
                          <Link key={l.href} href={l.href} className="text-xs font-semibold text-forge underline">
                            {l.label}
                          </Link>
                        ),
                      )}
                    </div>
                  ) : null}
                  {m.showMenu ? <MenuButtons /> : null}
                  {m.role === "assistant" && !m.showMenu ? (
                    <button
                      type="button"
                      className="mt-2 text-xs font-semibold text-forge underline"
                      onClick={() => setMessages((prev) => [...prev, WELCOME])}
                    >
                      เมนูหลัก
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            {loading ? <p className="text-xs text-muted">กำลังหาคำตอบ...</p> : null}
          </div>

          <form
            className="flex gap-2 border-t bg-white p-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <label className="sr-only" htmlFor="bs-chat-input">
              พิมพ์ข้อความ
            </label>
            <input
              id="bs-chat-input"
              className="input h-11 flex-1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="พิมพ์คำถาม หรือเลือกเมนู..."
              autoComplete="off"
            />
            <button
              type="submit"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forge text-white hover:bg-forge-hover disabled:opacity-50"
              aria-label="ส่งข้อความ"
              title="ส่งข้อความ"
              disabled={loading}
            >
              <Send className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-forge text-white shadow-lg hover:bg-forge-hover"
        aria-label={open ? "ปิดแชทร้าน" : "เปิดแชทร้าน"}
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPanel())}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
