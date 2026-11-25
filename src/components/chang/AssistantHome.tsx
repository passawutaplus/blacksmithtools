"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, Gauge, History, Pin, Ruler, Search, Share2, Sigma } from "lucide-react";
import { PILLARS, TRADES, getTool, parseToolPath, toolCount, TRADE_COVERS, TRADE_ICONS } from "@/lib/chang/catalog";
import { CatalogList, CatalogTile } from "@/components/chang/CatalogTile";
import { UnitConverter } from "@/components/chang/UnitConverter";
import { useStoredRaw } from "@/components/chang/useStored";
import { FAV_KEY, RECENT_KEY, clearRecent, parseFavorites, parseRecent } from "@/lib/chang/favorites";
import { searchTools } from "@/lib/chang/search";
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

type SavedTool = { path: string; href: string; name: string };

/** path ที่จำไว้ในเครื่อง → เครื่องมือที่ยังมีอยู่จริงในทะเบียน (ของเก่า/ของแปลกปลอมถูกทิ้ง) */
function resolveSaved(paths: string[]): SavedTool[] {
  const out: SavedTool[] = [];
  for (const path of paths) {
    const parsed = parseToolPath(path);
    const found = parsed ? getTool(parsed.tradeId, parsed.toolId) : undefined;
    if (found) out.push({ path, href: `/assistant/${found.trade.id}/${found.tool.id}`, name: found.tool.name });
  }
  return out;
}

function TradeGroups({ trades }: { trades: Trade[] }) {
  const grouped = PILLARS.map((p) => ({ pillar: p, trades: trades.filter((t) => t.pillarId === p.id) })).filter(
    (g) => g.trades.length,
  );
  return (
    <>
      {grouped.map(({ pillar, trades: list }) => (
        <section key={pillar.id} aria-labelledby={`pillar-${pillar.id}`}>
          <div className="mb-2.5 flex items-baseline gap-3 border-b border-navy/15 pb-2 sm:mb-3">
            <h2 id={`pillar-${pillar.id}`} className="text-base font-bold text-navy">
              {pillar.name}
            </h2>
            <p className="text-[0.8125rem] text-navy/70">{pillar.blurb}</p>
          </div>
          <CatalogList>
            {list.map((trade) => (
              <CatalogTile
                key={trade.id}
                href={`/assistant/${trade.id}`}
                title={trade.name}
                meta={`${trade.tools.length} เครื่องมือ`}
                blurb={trade.blurb}
                cover={TRADE_COVERS[trade.id]}
                icon={TRADE_ICONS[trade.id]}
                badge={trade.short}
              />
            ))}
          </CatalogList>
        </section>
      ))}
    </>
  );
}

export function AssistantHome() {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);

  // อ่านผ่าน useSyncExternalStore: รอบ hydrate ว่างเหมือนฝั่งเซิร์ฟเวอร์ แล้วค่อยเติมจากเครื่อง — ไม่มี hydration error
  const favRaw = useStoredRaw(FAV_KEY);
  const recentRaw = useStoredRaw(RECENT_KEY);
  const favs = useMemo(() => resolveSaved(parseFavorites(favRaw)), [favRaw]);
  const recent = useMemo(() => resolveSaved(parseRecent(recentRaw)), [recentRaw]);

  const found = useMemo(() => searchTools(q), [q]);
  const suggestTools = useMemo(() => found.tools.slice(0, 6), [found.tools]);
  const suggestTrades = useMemo(
    () => (suggestTools.length < 6 ? found.trades.slice(0, 6 - suggestTools.length) : []),
    [found.trades, suggestTools.length],
  );
  const query = q.trim();
  const hasQuery = query.length > 0;
  const showDropdown = open && hasQuery;
  const suggestionCount = suggestTools.length + suggestTrades.length;
  const noResults = hasQuery && found.tools.length === 0 && found.trades.length === 0;
  const optionId = (i: number) => `${listId}-opt-${i}`;

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  function hrefAt(index: number): string | undefined {
    if (index < suggestTools.length) {
      const t = suggestTools[index];
      return t ? `/assistant/${t.tradeId}/${t.id}` : undefined;
    }
    const trade = suggestTrades[index - suggestTools.length];
    return trade ? `/assistant/${trade.id}` : undefined;
  }

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      if (open) setOpen(false);
      else setQ("");
      return;
    }
    if (!hasQuery || suggestionCount === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % suggestionCount);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i - 1 + suggestionCount) % suggestionCount);
    } else if (e.key === "Enter") {
      // Enter โดยยังไม่ได้เลือกแถวไหน = ไปผลแรก (ผลที่ตรงที่สุด)
      const href = hrefAt(activeIndex < 0 ? 0 : activeIndex);
      if (!href) return;
      e.preventDefault();
      go(href);
    }
  }

  const optionClass = (active: boolean) =>
    `flex min-h-12 w-full items-center gap-2.5 border-l-[3px] px-3 py-2 text-left ${
      active ? "border-forge bg-[#f1f3f5]" : "border-transparent"
    }`;

  return (
    <div className="grid grid-cols-1 gap-6">
      <section className="chang-on-navy rounded-[3px] border-b-[3px] border-forge bg-navy text-white">
        <div className="grid gap-6 p-4 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:items-center md:gap-10 md:p-9">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[0.8125rem] font-medium text-white/80">
              <span className="h-0.5 w-5 shrink-0 bg-forge" aria-hidden />
              ผู้ช่วยงานช่าง · ใช้ฟรี ไม่ต้องสมัคร
            </p>
            <h1 className="mt-2 text-balance text-[1.375rem] font-bold leading-snug md:mt-3 md:text-[2rem] md:leading-tight">
              บอกขนาดหน้างาน แล้วได้ของที่ต้องซื้อ
            </h1>
            <p className="mt-3 hidden text-sm leading-relaxed text-white/80 md:block">
              เครื่องคิดเลขที่รู้จักงานช่างไทย — กรอกขนาดห้อง ความยาวสาย หรือพื้นที่ผนัง แล้วได้จำนวนของพร้อมเผื่อเศษ
              เปิดดูสูตรได้ว่าคิดมาจากไหน อ้างอิง มอก. วสท. และมาตรฐานสากล
            </p>
            <div ref={searchRef} className="relative mt-3.5 md:mt-5">
              <label className="sr-only" htmlFor={`${listId}-input`}>
                ค้นหาเครื่องมือ
              </label>
              <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-navy/55" aria-hidden />
              <input
                id={`${listId}-input`}
                type="search"
                className="input chang-search"
                placeholder="ค้นหา เช่น กระเบื้อง, BTU, สายไฟ"
                value={q}
                autoComplete="off"
                enterKeyHint="search"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showDropdown && suggestionCount > 0}
                aria-controls={`${listId}-list`}
                aria-activedescendant={showDropdown && activeIndex >= 0 ? optionId(activeIndex) : undefined}
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

              {showDropdown ? (
                <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-[22rem] overflow-auto rounded-[2px] border border-navy bg-white text-navy">
                  {suggestionCount === 0 ? (
                    <div className="px-3 py-3">
                      <p className="text-sm font-semibold text-navy">ไม่เจอเครื่องมือที่ตรงกับ “{query}”</p>
                      <p className="mt-1 text-sm text-navy/75">ลองพิมพ์ให้สั้นลง เช่น สี, แอร์, อิฐ หรือเลือกจากสายงาน</p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {TRADES.map((trade) => (
                          <Link key={trade.id} href={`/assistant/${trade.id}`} className="chang-chip">
                            {trade.short}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div id={`${listId}-list`} role="listbox" aria-label="ผลการค้นหา">
                      {suggestTools.length > 0 ? (
                        <p className="border-b border-navy/10 px-3 pb-1.5 pt-2 text-xs font-semibold text-navy/70" role="presentation">
                          เครื่องมือ · กด Enter เพื่อเปิดอันแรก
                        </p>
                      ) : null}
                      {suggestTools.map((tool, i) => (
                        <button
                          key={`${tool.tradeId}/${tool.id}`}
                          id={optionId(i)}
                          type="button"
                          role="option"
                          tabIndex={-1}
                          aria-selected={activeIndex === i}
                          className={optionClass(activeIndex === i)}
                          onMouseEnter={() => setActiveIndex(i)}
                          onClick={() => go(`/assistant/${tool.tradeId}/${tool.id}`)}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-navy">{tool.name}</span>
                            <span className="block truncate text-[0.8125rem] text-navy/75">
                              {tool.tradeName} · {tool.blurb}
                            </span>
                          </span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-navy/45" aria-hidden />
                        </button>
                      ))}
                      {suggestTrades.length > 0 ? (
                        <p className="border-y border-navy/10 px-3 pb-1.5 pt-2 text-xs font-semibold text-navy/70" role="presentation">
                          สายงาน
                        </p>
                      ) : null}
                      {suggestTrades.map((trade, i) => {
                        const idx = suggestTools.length + i;
                        return (
                          <button
                            key={trade.id}
                            id={optionId(idx)}
                            type="button"
                            role="option"
                            tabIndex={-1}
                            aria-selected={activeIndex === idx}
                            className={optionClass(activeIndex === idx)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            onClick={() => go(`/assistant/${trade.id}`)}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-navy">{trade.name}</span>
                              <span className="block truncate text-[0.8125rem] text-navy/75">{trade.blurb}</span>
                            </span>
                            <ArrowRight className="h-4 w-4 shrink-0 text-navy/45" aria-hidden />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <p className="mt-2.5 text-[0.8125rem] text-white/75">
              <span className="font-latin font-semibold text-white">{toolCount()}</span> เครื่องมือ ·{" "}
              <span className="font-latin font-semibold text-white">{TRADES.length}</span> สายงาน · เปิดดูสูตรได้ทุกตัว
            </p>
          </div>
          {/* จุดขาย 4 ข้อ: เฉพาะจอกว้าง — บนมือถือเอาที่ให้ช่องค้นหา ของที่ปักหมุด และรายการสายงานขึ้นมาก่อน */}
          <ul className="hidden divide-y divide-white/15 border-y border-white/15 md:block">
            {HERO_POINTS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="flex items-start gap-3.5 py-3.5">
                <span className="font-latin mt-0.5 w-5 shrink-0 text-xs font-semibold tabular-nums text-white/60">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-white/30">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-white/75">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* สถานะผลค้นหา ให้โปรแกรมอ่านจอประกาศ */}
      <p className="sr-only" role="status" aria-live="polite">
        {hasQuery ? (noResults ? `ไม่เจอเครื่องมือที่ตรงกับ ${query}` : `เจอ ${found.tools.length} เครื่องมือ`) : ""}
      </p>

      {!hasQuery && favs.length > 0 ? (
        <section aria-labelledby="chang-pinned">
          <h2 id="chang-pinned" className="chang-kicker mb-2">
            ปักหมุดไว้
          </h2>
          <div className="flex flex-wrap gap-2">
            {favs.map((item) => (
              <Link key={item.path} href={item.href} className="chang-chip chang-chip-solid">
                <Pin className="h-4 w-4 shrink-0" aria-hidden />
                {item.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {!hasQuery && recent.length > 0 ? (
        <section aria-labelledby="chang-recent">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="chang-recent" className="chang-kicker">
              ใช้ล่าสุด
            </h2>
            <button
              type="button"
              className="-my-2 inline-flex min-h-11 items-center px-1 text-[0.8125rem] font-medium text-navy/75 underline underline-offset-4 hover:text-navy"
              onClick={clearRecent}
            >
              ล้างรายการ
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map((item) => (
              <Link key={item.path} href={item.href} className="chang-chip">
                <History className="h-4 w-4 shrink-0 text-navy/55" aria-hidden />
                {item.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {!hasQuery ? (
        <section aria-labelledby="chang-tasks">
          <h2 id="chang-tasks" className="chang-kicker mb-2">
            วันนี้จะทำอะไร
          </h2>
          {/* มือถือ: แถวเดียวเลื่อนข้าง ไม่กินความสูงจอ · จอกว้าง: ตัดบรรทัดตามปกติ */}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
            {TASKS.map((t) => (
              <Link key={t.href} href={t.href} className="chang-chip shrink-0 whitespace-nowrap">
                {t.label}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {!hasQuery ? (
        <div className="hidden md:block">
          <UnitConverter />
        </div>
      ) : null}

      {found.tools.length > 0 ? (
        <section aria-labelledby="chang-found">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 id="chang-found" className="chang-kicker">
              เครื่องมือที่เจอ
            </h2>
            <p className="text-[0.8125rem] text-navy/70">{found.tools.length} รายการ · เรียงตามความตรง</p>
          </div>
          <ul className="divide-y divide-navy/10 rounded-[3px] border border-navy/15 bg-white">
            {found.tools.map((tool) => (
              <li key={`${tool.tradeId}/${tool.id}`}>
                <Link
                  href={`/assistant/${tool.tradeId}/${tool.id}`}
                  className="flex min-h-14 items-center gap-3 px-3 py-2.5 hover:bg-[#f7f8f9]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9375rem] font-semibold leading-snug text-navy">{tool.name}</span>
                    <span className="block text-[0.8125rem] leading-snug text-navy/75">
                      {tool.tradeName} · {tool.blurb}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-navy/45" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {noResults ? (
        <section className="border border-navy/25 bg-white px-4 py-3.5">
          <p className="text-sm font-semibold text-navy">ไม่เจอเครื่องมือที่ตรงกับ “{query}”</p>
          <p className="mt-1 text-sm leading-relaxed text-navy/75">
            ลองพิมพ์ให้สั้นลง เช่น สี, แอร์, อิฐ — หรือเลือกจากสายงานด้านล่าง / เปิด{" "}
            <Link href="/assistant/map" className="inline-flex min-h-11 items-center font-semibold text-navy underline decoration-forge decoration-2 underline-offset-4">
              แผนผังเครื่องมือทั้งหมด
            </Link>
          </p>
        </section>
      ) : null}

      <TradeGroups trades={noResults ? TRADES : found.trades} />

      {!hasQuery ? (
        <div className="md:hidden">
          <UnitConverter />
        </div>
      ) : null}
    </div>
  );
}
