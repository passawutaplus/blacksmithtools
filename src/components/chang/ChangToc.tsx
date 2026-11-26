"use client";

import { useEffect, useRef, useState } from "react";
import type { TocPillar } from "@/lib/chang/toc";

/**
 * สารบัญแบบติดจอ ใช้ร่วมกันหน้าแรกผู้ช่วยกับหน้าสารบัญทั้งหมด
 * - มือถือ/แท็บเล็ต (< lg): แถบแท็บหมวด เลื่อนข้างได้ ติดอยู่ใต้หัวเว็บ
 * - จอกว้าง (≥ lg): สารบัญด้านซ้าย หมวด → สายงาน พร้อมจำนวนเครื่องมือ
 * ทั้งสองแบบไฮไลต์ส่วนที่กำลังอ่านอยู่ (IntersectionObserver) และใช้ลิงก์ #anchor ธรรมดา
 * — เลื่อนนุ่มตาม scroll-behavior ของหน้า (ปิดเองเมื่อผู้ใช้ตั้งลดการเคลื่อนไหว) และ scroll-margin ของ .chang-anchor
 */

/** เส้นอ่าน: ใต้หัวเว็บ (+ แถบแท็บบนมือถือ) — อ่านจาก scroll-margin-top ของ section จริง จะได้ตรงกับจุดที่ลิงก์พาไป */
function readLine(el: Element): number {
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop);
  return (Number.isFinite(margin) ? margin : 96) + 8;
}

/**
 * id ของส่วนที่กำลังอ่าน = ส่วนที่ขอบบนเลยเส้นอ่านขึ้นไปแล้ว และอยู่ล่างสุดในบรรดานั้น
 * (การ์ดแถวเดียวกันขอบบนเท่ากัน → เลือกใบแรกของแถว) · ยังไม่ถึงส่วนแรก = null
 * IntersectionObserver ใช้แถบบาง 1px ที่เส้นอ่านเป็นตัวปลุก ไม่ต้องฟัง scroll ทุกเฟรม
 */
export function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join("|");

  useEffect(() => {
    const els = key
      .split("|")
      .map((id) => (id ? document.getElementById(id) : null))
      .filter((el): el is HTMLElement => el !== null);
    // ไม่มีส่วนให้ติดตาม: ค่าเก่าที่ค้างอยู่จับคู่อะไรไม่ได้อยู่แล้ว (useTocActive คืน null เอง)
    if (!els.length) return;

    function compute() {
      const line = readLine(els[0]);
      let cur: string | null = null;
      let curTop = -Infinity;
      for (const el of els) {
        const top = el.getBoundingClientRect().top;
        if (top <= line && top > curTop + 1) {
          cur = el.id;
          curTop = top;
        }
      }
      // ชนก้นหน้าแล้ว ส่วนท้าย ๆ ขึ้นไม่ถึงเส้น — ให้ส่วนสุดท้ายที่เห็นอยู่เป็นตัวปัจจุบัน
      const doc = document.documentElement;
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) {
        const last = els[els.length - 1];
        if (last.getBoundingClientRect().top < window.innerHeight) cur = last.id;
      }
      setActive(cur);
    }

    let lineIo: IntersectionObserver | null = null;
    let endIo: IntersectionObserver | null = null;
    function setup() {
      lineIo?.disconnect();
      endIo?.disconnect();
      const line = Math.round(readLine(els[0]));
      const below = Math.max(0, window.innerHeight - line - 1);
      lineIo = new IntersectionObserver(compute, { rootMargin: `-${line}px 0px -${below}px 0px`, threshold: 0 });
      for (const el of els) lineIo.observe(el);
      endIo = new IntersectionObserver(compute, { threshold: [0, 0.5, 1] });
      endIo.observe(els[els.length - 1]);
      compute();
    }

    setup();
    window.addEventListener("resize", setup);
    return () => {
      window.removeEventListener("resize", setup);
      lineIo?.disconnect();
      endIo?.disconnect();
    };
  }, [key]);

  return active;
}

/** หมวด/สายงานที่กำลังอ่าน จาก id ของ section */
export function useTocActive(toc: TocPillar[]) {
  const activeId = useActiveSection(toc.flatMap((p) => [p.anchor, ...p.trades.map((t) => t.anchor)]));
  for (const p of toc) {
    if (p.anchor === activeId || p.trades.some((t) => t.anchor === activeId)) return { activeId, pillarId: p.id };
  }
  return { activeId: null, pillarId: null };
}

/** เลื่อนกล่องที่เลื่อนได้ (ไม่ใช่ทั้งหน้า) ให้เห็นรายการที่กำลังไฮไลต์ */
function keepInView(container: HTMLElement | null, item: HTMLElement | null, axis: "x" | "y") {
  if (!container || !item) return;
  const c = container.getBoundingClientRect();
  const r = item.getBoundingClientRect();
  if (axis === "x") {
    if (r.left < c.left + 8 || r.right > c.right - 8) {
      container.scrollLeft += r.left - c.left - (c.width - r.width) / 2;
    }
  } else if (r.top < c.top + 8 || r.bottom > c.bottom - 8) {
    container.scrollTop += r.top - c.top - (c.height - r.height) / 2;
  }
}

function Count({ n, className = "" }: { n: number | string; className?: string }) {
  return <span className={`font-latin text-xs tabular-nums text-navy/70 ${className}`}>{n}</span>;
}

/** แถบแท็บหมวด (จอเล็กกว่า lg) — วางเป็นลูกคนแรกของกล่องที่ห่อทุกหมวด แถบจะติดอยู่จนจบกล่อง */
export function TocTabs({
  toc,
  activePillarId,
  label = "ไปที่หมวด",
  lead,
}: {
  toc: TocPillar[];
  activePillarId: string | null;
  label?: string;
  /** ปุ่มนำหน้าแถบ เช่น ลิงก์ไปสารบัญทั้งหมด */
  lead?: React.ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activePillarId) return;
    const item = scroller.current?.querySelector<HTMLElement>(`[data-toc="${activePillarId}"]`) ?? null;
    keepInView(scroller.current, item, "x");
  }, [activePillarId]);

  return (
    <nav
      aria-label={label}
      className="sticky top-[var(--chang-top)] z-20 -mx-4 mb-4 border-b border-navy/15 bg-white md:-mx-6 lg:hidden"
    >
      <div ref={scroller} className="chang-noscrollbar flex overflow-x-auto px-4 md:px-6">
        {lead}
        <ul className="flex">
          {toc.map((p) => {
            const active = p.id === activePillarId;
            return (
              <li key={p.id} className="shrink-0">
                <a
                  href={`#${p.anchor}`}
                  data-toc={p.id}
                  aria-current={active ? "location" : undefined}
                  className={`relative flex min-h-11 items-center gap-1.5 whitespace-nowrap px-3 text-sm ${
                    active ? "font-bold text-navy" : "font-medium text-navy/80 hover:text-navy"
                  }`}
                >
                  <span className="font-latin text-xs font-semibold tabular-nums text-navy/70">{p.number}</span>
                  {p.name}
                  <Count n={p.count} />
                  <span
                    className={`absolute inset-x-2 bottom-0 h-[3px] ${active ? "bg-forge" : "bg-transparent"}`}
                    aria-hidden
                  />
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

/** สารบัญด้านซ้าย (≥ lg) — หมวด → สายงาน พร้อมเลขข้อและจำนวนเครื่องมือ */
export function TocSidebar({
  toc,
  activeId,
  activePillarId,
  label = "สารบัญ",
  title = "สารบัญ",
  counts,
  footer,
}: {
  toc: TocPillar[];
  activeId: string | null;
  activePillarId: string | null;
  label?: string;
  title?: string;
  /** แทนจำนวนเครื่องมือของสายงาน (ใช้ตอนกรอง: จำนวนที่ยังเหลือ) */
  counts?: Record<string, number>;
  footer?: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeId) return;
    const item = box.current?.querySelector<HTMLElement>(`[data-toc="${activeId}"]`) ?? null;
    keepInView(box.current, item, "y");
  }, [activeId]);

  return (
    <nav aria-label={label} className="hidden lg:block">
      <div
        ref={box}
        className="chang-thin-scroll sticky top-[calc(var(--chang-top)+1rem)] max-h-[calc(100dvh-var(--chang-top)-2rem)] overflow-y-auto overscroll-contain pb-2 pr-1"
      >
        <p className="chang-kicker mb-1.5">{title}</p>
        <ol className="grid gap-1">
          {toc.map((p) => {
            const inPillar = p.id === activePillarId;
            const pillarCurrent = p.anchor === activeId;
            const pillarCount = counts
              ? p.trades.reduce((n, t) => n + (counts[t.id] ?? 0), 0)
              : p.count;
            return (
              <li key={p.id}>
                <a
                  href={`#${p.anchor}`}
                  data-toc={p.anchor}
                  aria-current={pillarCurrent ? "location" : undefined}
                  className={`flex min-h-11 items-center gap-2.5 rounded-[2px] px-2 text-sm font-bold text-navy hover:bg-[#f1f3f5] ${
                    pillarCurrent ? "bg-[#f1f3f5]" : ""
                  }`}
                >
                  <span
                    className={`font-latin flex h-6 w-6 shrink-0 items-center justify-center rounded-[2px] text-xs font-semibold tabular-nums ${
                      inPillar ? "bg-navy text-white" : "border border-navy/30 text-navy"
                    }`}
                  >
                    {p.number}
                  </span>
                  <span className="min-w-0 flex-1 leading-snug">{p.name}</span>
                  <Count n={pillarCount} />
                </a>
                <ol className="mb-1 ml-[1.3125rem] border-l border-navy/15">
                  {p.trades.map((t) => {
                    const current = t.anchor === activeId;
                    return (
                      <li key={t.id}>
                        <a
                          href={`#${t.anchor}`}
                          data-toc={t.anchor}
                          aria-current={current ? "location" : undefined}
                          className={`-ml-px flex min-h-11 items-center gap-2 border-l-2 py-1 pl-3 pr-2 text-sm leading-snug ${
                            current
                              ? "border-forge bg-[#f1f3f5] font-semibold text-navy"
                              : "border-transparent text-navy/85 hover:border-navy/40 hover:text-navy"
                          }`}
                        >
                          <span className="font-latin w-7 shrink-0 text-xs tabular-nums text-navy/70">{t.number}</span>
                          <span className="min-w-0 flex-1">{t.name}</span>
                          <Count n={counts ? (counts[t.id] ?? 0) : t.count} />
                        </a>
                      </li>
                    );
                  })}
                </ol>
              </li>
            );
          })}
        </ol>
        {footer ? <div className="mt-3 border-t border-navy/15 pt-3">{footer}</div> : null}
      </div>
    </nav>
  );
}

/** หัวหมวด: เลขข้อในกล่อง navy + ชื่อหมวด + คำอธิบาย + จำนวน */
export function PillarHeading({
  pillar,
  headingId,
  as: Tag = "h2",
  tradeCount,
  toolCount,
}: {
  pillar: TocPillar;
  headingId: string;
  as?: "h2" | "h3";
  tradeCount?: number;
  toolCount?: number;
}) {
  return (
    <div className="mb-3 flex items-start gap-3 border-b-2 border-navy pb-2.5">
      <span className="font-latin flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] bg-navy text-sm font-semibold tabular-nums text-white">
        {pillar.number}
      </span>
      <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <Tag id={headingId} className="text-lg font-bold leading-snug text-navy">
            {pillar.name}
          </Tag>
          <p className="text-[0.8125rem] leading-snug text-navy/75">{pillar.blurb}</p>
        </div>
        <p className="mt-0.5 shrink-0 text-[0.8125rem] text-navy/75 sm:mt-0">
          <span className="font-latin font-semibold text-navy">{tradeCount ?? pillar.trades.length}</span> สายงาน ·{" "}
          <span className="font-latin font-semibold text-navy">{toolCount ?? pillar.count}</span> เครื่องมือ
        </p>
      </div>
    </div>
  );
}
