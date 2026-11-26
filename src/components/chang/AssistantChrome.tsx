"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ArrowLeft, ListTree } from "lucide-react";

function fallbackFrom(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "assistant") return "/";
  if (parts.length <= 1) return "/";
  if (parts[1] === "tables" || parts[1] === "map") return "/assistant";
  if (parts.length === 2) return "/assistant";
  return `/assistant/${parts[1]}`;
}

function canGoBack(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const ref = document.referrer;
    if (!ref) return false;
    return new URL(ref).origin === window.location.origin;
  } catch {
    return false;
  }
}

/** หัวเว็บที่ติดด้านบนจอ (sticky/fixed) — ใช้หาว่าแถบสารบัญต้องติดต่ำลงมาเท่าไร */
function findStickyHeader(): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>("header")) {
    const pos = getComputedStyle(el).position;
    if (pos === "sticky" || pos === "fixed") return el;
  }
  return null;
}

/**
 * วัดความสูงหัวเว็บจริงแล้วเขียนเป็น --chang-top ที่ .chang-scope
 * (หัวเว็บสูงไม่เท่ากันระหว่างมือถือ/เดสก์ท็อป และยืดเมื่อเปิดช่องค้นหา) — แตะแค่ตัวแปรในขอบเขตผู้ช่วย ไม่แตะหัวเว็บ
 */
function useStickyTopVar(anchor: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const scope = anchor.current?.closest<HTMLElement>(".chang-scope");
    const header = findStickyHeader();
    if (!scope || !header) return;
    const write = () => scope.style.setProperty("--chang-top", `${Math.round(header.getBoundingClientRect().height)}px`);
    write();
    const ro = new ResizeObserver(write);
    ro.observe(header);
    return () => ro.disconnect();
  }, [anchor]);
}

/**
 * มือถือ: ปุ่มแชทลอยของร้านบังช่องกรอก/ปุ่มในการ์ดผล ระหว่างเลื่อนหน้าและตอนพิมพ์
 * เขียนสถานะลง <html> ให้ CSS ซ่อนปุ่มชั่วคราว — เลื่อนลง = ซ่อน, เลื่อนขึ้น/หยุดที่บนสุด = กลับมา,
 * โฟกัสช่องกรอกในผู้ช่วย (คีย์บอร์ดขึ้น) = ซ่อน · ออกจากหน้าผู้ช่วยแล้วล้างสถานะทิ้ง (กติกาอยู่ใน globals.css)
 */
function useHideFabWhileWorking() {
  useEffect(() => {
    const root = document.documentElement;
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (Math.abs(y - lastY) > 6) {
          root.dataset.changScroll = y > lastY && y > 120 ? "down" : "up";
          lastY = y;
        }
        ticking = false;
      });
    };
    const isField = (t: EventTarget | null) =>
      t instanceof HTMLElement && t.matches(".chang-scope input, .chang-scope select, .chang-scope textarea");
    const onFocusIn = (e: FocusEvent) => {
      if (isField(e.target)) root.dataset.changTyping = "1";
    };
    const onFocusOut = (e: FocusEvent) => {
      if (isField(e.target) && !isField(e.relatedTarget)) delete root.dataset.changTyping;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      delete root.dataset.changScroll;
      delete root.dataset.changTyping;
    };
  }, []);
}

export function AssistantChrome() {
  const navRef = useRef<HTMLElement>(null);
  useStickyTopVar(navRef);
  useHideFabWhileWorking();
  const pathname = usePathname();
  const router = useRouter();
  const fallback = fallbackFrom(pathname);
  const onMap = pathname === "/assistant/map";

  function back() {
    if (canGoBack()) {
      router.back();
      return;
    }
    router.push(fallback);
  }

  return (
    <nav ref={navRef} aria-label="นำทางผู้ช่วยงานช่าง" className="mb-5 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={back}
        className="inline-flex min-h-11 items-center gap-2 rounded-[2px] border border-steel bg-white px-3.5 text-sm font-semibold text-navy transition hover:border-navy/30 hover:bg-navy/5"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        ย้อนกลับ
      </button>
      <Link
        href="/assistant/map"
        className={`inline-flex min-h-11 items-center gap-2 rounded-[2px] px-3.5 text-sm font-semibold transition ${
          onMap
            ? "bg-navy text-white"
            : "border border-steel bg-white text-navy hover:border-navy/30 hover:bg-navy/5"
        }`}
        aria-current={onMap ? "page" : undefined}
      >
        <ListTree className="h-4 w-4 shrink-0" aria-hidden />
        สารบัญ
      </Link>
    </nav>
  );
}
