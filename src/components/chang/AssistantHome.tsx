"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Gauge, Ruler, Search, Share2, Sigma } from "lucide-react";
import {
  PILLARS,
  TRADES,
  getTool,
  parseToolPath,
  searchCatalog,
  toolCount,
  TRADE_COVERS,
  TRADE_ICONS,
} from "@/lib/chang/catalog";
import { UnitConverter } from "@/components/chang/UnitConverter";
import { loadFavorites, loadRecent } from "@/lib/chang/favorites";
import type { Trade } from "@/lib/chang/types";

const TASKS = [
  { href: "/assistant/hvac/job", label: "คิดขนาดแอร์ทั้งห้อง" },
  { href: "/assistant/electrical/cable", label: "เลือกสายไฟ / เบรกเกอร์" },
  { href: "/assistant/tile/job", label: "สั่งกระเบื้องทั้งห้อง" },
  { href: "/assistant/masonry/job", label: "ก่อฉาบผนัง" },
  { href: "/assistant/paint/job", label: "ปริมาณสีทั้งห้อง" },
  { href: "/assistant/map", label: "แผนผังเครื่องมือ" },
  { href: "/assistant/tables", label: "เปิดตารางอ้างอิง" },
];

const HERO_POINTS = [
  {
    icon: Gauge,
    title: "คิดจบในหน้าเดียว",
    text: "กรอกเลขแล้วคำตอบขยับตามทันที ไม่ต้องกดปุ่มคำนวณ",
  },
  {
    icon: Sigma,
    title: "กางสูตรดูได้ทุกบรรทัด",
    text: "เปิดดูได้ว่าตัวเลขมาจากไหน ใช้ค่าคงที่อะไร อ้างอิงจากไหน",
  },
  {
    icon: Ruler,
    title: "เผื่อเศษแบบหน้างานจริง",
    text: "บวกเผื่อตัดเผื่อเสีย แล้วปัดขึ้นเป็นหน่วยที่ร้านขายจริง",
  },
  {
    icon: Share2,
    title: "ส่งต่อให้ทีมได้",
    text: "คัดลอก แชร์ หรือบันทึกเป็นรูปส่งเข้าไลน์กลุ่มงาน",
  },
];

function TradeCard({ trade }: { trade: Trade }) {
  const Icon = TRADE_ICONS[trade.id];
  const cover = TRADE_COVERS[trade.id];
  return (
    <Link
      href={`/assistant/${trade.id}`}
      className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(35,50,61,0.16)]"
    >
      <span className="relative block aspect-[4/3] overflow-hidden bg-steel">
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            sizes="(min-width: 1024px) 22rem, 50vw"
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-navy/25">
            {Icon ? <Icon className="h-10 w-10 sm:h-12 sm:w-12" aria-hidden /> : null}
          </span>
        )}
        <span className="badge absolute left-2 top-2 bg-navy/80 px-2 py-0.5 text-[11px] text-white backdrop-blur sm:left-3 sm:top-3 sm:text-xs">
          {trade.short}
        </span>
        <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-navy shadow-md sm:right-3 sm:top-3 sm:h-10 sm:w-10">
          {Icon ? <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden /> : null}
        </span>
      </span>
      <span className="block p-2.5 sm:p-4">
        <span className="block text-sm font-bold leading-snug text-navy sm:text-base">{trade.name}</span>
        <span className="mt-0.5 block text-[11px] text-muted sm:text-xs">{trade.tools.length} เครื่องมือ</span>
        <span className="mt-1 block line-clamp-2 text-[11px] leading-relaxed text-muted sm:text-sm">{trade.blurb}</span>
      </span>
    </Link>
  );
}

export function AssistantHome() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const [favs] = useState(() => loadFavorites().map(parseToolPath).filter(Boolean));
  const [recent] = useState(() => loadRecent().map(parseToolPath).filter(Boolean));
  const found = useMemo(() => searchCatalog(q), [q]);
  const grouped = PILLARS.map((p) => ({
    pillar: p,
    trades: found.trades.filter((t) => t.pillarId === p.id),
  })).filter((g) => g.trades.length);

  const suggestTools = useMemo(() => found.tools.slice(0, 6), [found.tools]);
  const suggestTrades = useMemo(
    () => (suggestTools.length < 6 ? found.trades.slice(0, 6 - suggestTools.length) : []),
    [found.trades, suggestTools.length],
  );
  const hasQuery = q.trim().length > 0;
  const showDropdown = open && hasQuery;
  const suggestionCount = suggestTools.length + suggestTrades.length;

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function goToTool(tradeId: string, toolId: string) {
    setOpen(false);
    setQ("");
    router.push(`/assistant/${tradeId}/${toolId}`);
  }

  function goToTrade(tradeId: string) {
    setOpen(false);
    setQ("");
    router.push(`/assistant/${tradeId}`);
  }

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || suggestionCount === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestionCount);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestionCount) % suggestionCount);
    } else if (e.key === "Enter") {
      if (activeIndex < 0) return;
      e.preventDefault();
      if (activeIndex < suggestTools.length) {
        const t = suggestTools[activeIndex];
        goToTool(t.tradeId, t.id);
      } else {
        const trade = suggestTrades[activeIndex - suggestTools.length];
        goToTrade(trade.id);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[1.5rem] bg-navy text-white">
        <div className="grid gap-7 p-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:items-center md:gap-9 md:p-9">
          <div className="min-w-0">
            <p className="badge bg-white/10 text-white">ผู้ช่วยงานช่าง · ใช้ฟรี ไม่ต้องสมัคร</p>
            <h1 className="mt-3 text-2xl font-bold leading-tight md:text-[2rem]">
              บอกขนาดหน้างาน แล้วได้ของที่ต้องซื้อ
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              เครื่องคิดเลขที่รู้จักงานช่างไทย — กรอกขนาดห้อง ความยาวสาย หรือพื้นที่ผนัง แล้วได้จำนวนของพร้อมเผื่อเศษ
              เปิดดูสูตรได้ว่าคิดมาจากไหน อ้างอิง มอก. วสท. และมาตรฐานสากล
            </p>
            <div ref={searchRef} className="relative mt-5">
              <label className="block">
                <span className="sr-only">ค้นหาเครื่องมือ</span>
                <input
                  type="search"
                  className="input"
                  placeholder="ค้นหา เช่น กระเบื้อง, BTU, สายไฟ"
                  value={q}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={showDropdown}
                  aria-controls="assistant-search-suggestions"
                  onChange={(e) => {
                    setQ(e.target.value);
                    setOpen(true);
                    setActiveIndex(-1);
                  }}
                  onFocus={() => {
                    if (hasQuery) setOpen(true);
                  }}
                  onKeyDown={onSearchKeyDown}
                />
              </label>

              {showDropdown ? (
                <div
                  id="assistant-search-suggestions"
                  role="listbox"
                  className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-auto rounded-[3px] bg-white p-2 text-navy shadow-[0_18px_45px_rgba(15,23,32,0.35)]"
                >
                  {suggestionCount === 0 ? (
                    <p className="px-3 py-2.5 text-sm text-muted">
                      ไม่เจอคำนี้ ลองพิมพ์ชื่อสายงานหรือของที่อยากคิด เช่น สี, แอร์, อิฐ
                    </p>
                  ) : (
                    <>
                      {suggestTools.length > 0 ? (
                        <p className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                          เครื่องมือ
                        </p>
                      ) : null}
                      {suggestTools.map((tool, i) => (
                        <button
                          key={`${tool.tradeId}/${tool.id}`}
                          type="button"
                          role="option"
                          aria-selected={activeIndex === i}
                          className={`flex w-full items-center gap-2 rounded-[3px] px-3 py-2 text-left transition ${
                            activeIndex === i ? "bg-navy/10" : "hover:bg-navy/5"
                          }`}
                          onMouseEnter={() => setActiveIndex(i)}
                          onClick={() => goToTool(tool.tradeId, tool.id)}
                        >
                          <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-navy">{tool.name}</span>
                            <span className="block truncate text-xs text-muted">
                              {tool.tradeName} · {tool.blurb}
                            </span>
                          </span>
                        </button>
                      ))}
                      {suggestTrades.length > 0 ? (
                        <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                          สายงาน
                        </p>
                      ) : null}
                      {suggestTrades.map((trade, i) => {
                        const idx = suggestTools.length + i;
                        return (
                          <button
                            key={trade.id}
                            type="button"
                            role="option"
                            aria-selected={activeIndex === idx}
                            className={`flex w-full items-center gap-2 rounded-[3px] px-3 py-2 text-left transition ${
                              activeIndex === idx ? "bg-navy/10" : "hover:bg-navy/5"
                            }`}
                            onMouseEnter={() => setActiveIndex(idx)}
                            onClick={() => goToTrade(trade.id)}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-navy">{trade.name}</span>
                              <span className="block truncate text-xs text-muted">{trade.blurb}</span>
                            </span>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              ) : null}
            </div>
            <p className="mt-2.5 text-xs text-white/60">
              รวม {toolCount()} เครื่องมือ จาก {TRADES.length} สายงาน
            </p>
          </div>
          <ul className="grid gap-2.5">
            {HERO_POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3 rounded-[3px] bg-white/[0.07] px-4 py-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forge/90">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-white/65">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <UnitConverter />

      <section>
        <h2 className="mb-2 text-sm font-bold text-navy">วันนี้จะทำอะไร</h2>
        <div className="flex flex-wrap gap-2">
          {TASKS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="rounded-[2px] border border-steel bg-white px-3 py-1.5 text-sm font-medium text-navy hover:border-navy/30"
            >
              {t.label}
            </Link>
          ))}
        </div>
      </section>

      {recent.length > 0 && !q ? (
        <section>
          <h2 className="mb-2 text-sm font-bold text-navy">ใช้ล่าสุด</h2>
          <div className="flex flex-wrap gap-2">
            {recent.map((item) => {
              if (!item) return null;
              const foundTool = getTool(item.tradeId, item.toolId);
              if (!foundTool) return null;
              return (
                <Link
                  key={`${item.tradeId}/${item.toolId}`}
                  href={`/assistant/${item.tradeId}/${item.toolId}`}
                  className="rounded-[2px] border border-steel bg-white px-3 py-1.5 text-sm"
                >
                  {foundTool.tool.name}
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {favs.length > 0 && !q ? (
        <section>
          <h2 className="mb-2 text-sm font-bold text-navy">ปักหมุดไว้</h2>
          <div className="flex flex-wrap gap-2">
            {favs.map((item) => {
              if (!item) return null;
              const foundTool = getTool(item.tradeId, item.toolId);
              if (!foundTool) return null;
              return (
                <Link
                  key={`${item.tradeId}/${item.toolId}`}
                  href={`/assistant/${item.tradeId}/${item.toolId}`}
                  className="rounded-[2px] bg-navy px-3 py-1.5 text-sm text-white"
                >
                  {foundTool.tool.name}
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {found.tools.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-bold text-navy">เครื่องมือที่เจอ</h2>
          <div className="grid gap-2">
            {found.tools.map((tool) => (
              <Link
                key={`${tool.tradeId}/${tool.id}`}
                href={`/assistant/${tool.tradeId}/${tool.id}`}
                className="card px-4 py-3 hover:border-navy"
              >
                <p className="font-bold text-navy">{tool.name}</p>
                <p className="text-sm text-muted">
                  {tool.tradeName} · {tool.blurb}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {grouped.map(({ pillar, trades }) => (
        <section key={pillar.id}>
          <h2 className="text-base font-bold text-navy">{pillar.name}</h2>
          <p className="mb-3 text-sm text-muted">{pillar.blurb}</p>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
            {trades.map((trade) => (
              <TradeCard key={trade.id} trade={trade} />
            ))}
          </div>
        </section>
      ))}

      {grouped.length === 0 && found.tools.length === 0 ? (
        <p className="text-sm text-muted">ไม่เจอคำนี้ ลองพิมพ์ชื่อสายงานหรือของที่อยากคิด เช่น สี, แอร์, อิฐ</p>
      ) : null}
    </div>
  );
}
