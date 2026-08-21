"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Map } from "lucide-react";

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

export function AssistantChrome() {
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
    <nav aria-label="นำทางผู้ช่วยงานช่าง" className="mb-5 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={back}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-steel bg-white px-3.5 text-sm font-semibold text-navy transition hover:border-navy/30 hover:bg-navy/5"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        ย้อนกลับ
      </button>
      <Link
        href="/assistant/map"
        className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition ${
          onMap
            ? "bg-navy text-white"
            : "border border-steel bg-white text-navy hover:border-navy/30 hover:bg-navy/5"
        }`}
        aria-current={onMap ? "page" : undefined}
      >
        <Map className="h-4 w-4 shrink-0" aria-hidden />
        แผนผัง
      </Link>
    </nav>
  );
}
