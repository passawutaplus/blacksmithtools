"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useId, useMemo, useState, type KeyboardEvent } from "react";
import { ArrowRight, ChevronDown, ChevronRight, Filter, TableProperties, X } from "lucide-react";
import { TRADE_ICONS, TRADES, toolCount } from "@/lib/chang/catalog";
import { buildToc, filterToc, jobAnchor, toolAnchor, type TocPillar, type TocTrade } from "@/lib/chang/toc";
import { PillarHeading, TocSidebar, TocTabs, useTocActive } from "@/components/chang/ChangToc";

/**
 * สารบัญเครื่องมือทั้งหมด (/assistant/map)
 * หมวด → สายงาน → ทุกเครื่องมือ พร้อมเลขข้อ (3.2 = หมวด 3 สายงานที่ 2) จำนวน และ anchor ทุกบรรทัด
 * ช่องกรองใช้ตัวค้นเดียวกับหน้าแรก: กรองในที่ เลขข้อไม่เปลี่ยน · Enter เปิดผลที่ตรงที่สุด
 */
export function ToolIndex() {
  const router = useRouter();
  const inputId = useId();
  const toc = useMemo(() => buildToc(), []);
  const [q, setQ] = useState("");
  const deferred = useDeferredValue(q);
  const filter = useMemo(() => filterToc(deferred), [deferred]);
  const query = q.trim();

  /** สารบัญที่เหลือหลังกรอง + จำนวนที่เหลือต่อสายงาน */
  const { view, counts } = useMemo(() => {
    if (!filter) return { view: toc, counts: undefined };
    const counts: Record<string, number> = {};
    const view: TocPillar[] = [];
    for (const p of toc) {
      const trades = p.trades.filter((t) => filter.tradeIds.has(t.id));
      for (const t of trades) {
        counts[t.id] =
          t.trade.tools.filter((tool) => filter.toolKeys.has(`${t.id}/${tool.id}`)).length +
          (filter.jobTradeIds.has(t.id) ? 1 : 0);
      }
      if (trades.length) view.push({ ...p, trades });
    }
    return { view, counts };
  }, [toc, filter]);

  const { activeId, pillarId } = useTocActive(view);
  const total = toolCount() + TRADES.filter((t) => t.job).length;

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape" && q) {
      e.preventDefault();
      setQ("");
    } else if (e.key === "Enter" && filter?.top) {
      e.preventDefault();
      router.push(filter.top.href);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5">
      <header className="grid gap-1">
        <p className="chang-kicker">ผู้ช่วยงานช่าง</p>
        <h1 className="text-2xl font-bold leading-tight text-navy md:text-[1.75rem]">สารบัญเครื่องมือทั้งหมด</h1>
        <p className="text-sm text-navy/75">
          <span className="font-latin font-semibold text-navy">{toc.length}</span> หมวด ·{" "}
          <span className="font-latin font-semibold text-navy">{TRADES.length}</span> สายงาน ·{" "}
          <span className="font-latin font-semibold text-navy">{toolCount()}</span> เครื่องมือ — กดชื่อเพื่อเปิดหน้าคิดเลข
        </p>
      </header>

      <div className="grid gap-2 md:grid-cols-[minmax(0,28rem)_auto] md:items-center md:justify-between">
        <div role="search" className="relative">
          <label htmlFor={inputId} className="sr-only">
            กรองรายการเครื่องมือ
          </label>
          <Filter className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-navy/55" aria-hidden />
          <input
            id={inputId}
            type="search"
            className="input chang-search pr-12"
            placeholder="กรองรายการ เช่น ท่อ, สี, BTU"
            value={q}
            autoComplete="off"
            enterKeyHint="go"
            aria-describedby={`${inputId}-hint`}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-0.5 top-0.5 flex h-11 w-11 items-center justify-center text-navy/70 hover:text-navy"
              aria-label="ล้างคำกรอง"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          ) : null}
        </div>
        <Link href="/assistant/tables" className="chang-chip hidden md:inline-flex">
          <TableProperties className="h-4 w-4 shrink-0" aria-hidden />
          ตารางอ้างอิง
        </Link>
        <p id={`${inputId}-hint`} className="min-h-5 text-[0.8125rem] text-navy/75 md:col-span-2" role="status" aria-live="polite">
          {query && filter ? (
            filter.total ? (
              <>
                เหลือ <span className="font-latin font-semibold text-navy">{filter.total}</span> จาก {total} รายการ ใน{" "}
                <span className="font-latin font-semibold text-navy">{filter.tradeIds.size}</span> สายงาน
                {filter.top ? (
                  <>
                    {" "}
                    · กด Enter เปิด <span className="font-semibold text-navy">{filter.top.name}</span>
                  </>
                ) : null}
              </>
            ) : (
              <>ไม่เจอเครื่องมือที่ตรงกับ “{query}”</>
            )
          ) : (
            "พิมพ์เพื่อกรองรายการด้านล่าง — ชื่อเครื่องมือ ของที่จะซื้อ หรือคำเรียกหน้างานก็ได้"
          )}
        </p>
      </div>

      {view.length === 0 ? (
        <div className="border border-navy/25 bg-white px-4 py-3.5">
          <p className="text-sm font-semibold text-navy">ไม่เจอเครื่องมือที่ตรงกับ “{query}”</p>
          <p className="mt-1 text-sm text-navy/75">ลองพิมพ์ให้สั้นลง เช่น สี, แอร์, อิฐ</p>
          <button type="button" className="chang-chip mt-2.5" onClick={() => setQ("")}>
            ล้างคำกรอง ดูทั้งหมด
          </button>
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
          <a
            href="#chang-index-list"
            className="sr-only focus:not-sr-only focus:mb-2 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-[2px] focus:bg-navy focus:px-3 focus:text-sm focus:font-semibold focus:text-white lg:col-span-2"
          >
            ข้ามสารบัญ ไปที่รายการเครื่องมือ
          </a>
          <TocSidebar
            toc={view}
            activeId={activeId}
            activePillarId={pillarId}
            counts={counts}
            footer={
              <Link
                href="/assistant"
                className="flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-navy underline decoration-forge decoration-2 underline-offset-4"
              >
                กลับหน้าแรกผู้ช่วย
              </Link>
            }
          />
          <div id="chang-index-list" className="min-w-0">
            <TocTabs toc={view} activePillarId={pillarId} />
            {/* จอเล็ก: แถบแท็บพาไปได้แค่ระดับหมวด — กางรายชื่อสายงานไว้กระโดดตรงได้ */}
            <details className="group mb-6 rounded-[3px] border border-navy/15 bg-white lg:hidden">
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 text-sm font-semibold text-navy [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1">
                  ไปที่สายงาน{" "}
                  <span className="font-latin font-normal text-navy/70">
                    ({view.reduce((n, p) => n + p.trades.length, 0)})
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <ol className="grid border-t border-navy/15 py-1 sm:grid-cols-2">
                {view.flatMap((p) =>
                  p.trades.map((t) => (
                    <li key={t.id}>
                      <a
                        href={`#${t.anchor}`}
                        className="flex min-h-11 items-center gap-2 px-3 text-sm text-navy hover:bg-[#f7f8f9]"
                      >
                        <span className="font-latin w-8 shrink-0 text-xs tabular-nums text-navy/70">{t.number}</span>
                        <span className="min-w-0 flex-1 leading-snug">{t.name}</span>
                        <span className="font-latin text-xs tabular-nums text-navy/70">
                          {counts ? (counts[t.id] ?? 0) : t.count}
                        </span>
                      </a>
                    </li>
                  )),
                )}
              </ol>
            </details>
            <div className="grid grid-cols-1 gap-9">
              {view.map((pillar) => (
                <section
                  key={pillar.id}
                  id={pillar.anchor}
                  aria-labelledby={`${pillar.anchor}-h`}
                  className="chang-anchor"
                >
                  <PillarHeading
                    pillar={pillar}
                    headingId={`${pillar.anchor}-h`}
                    tradeCount={pillar.trades.length}
                    toolCount={counts ? pillar.trades.reduce((n, t) => n + (counts[t.id] ?? 0), 0) : pillar.count}
                  />
                  <div className="grid grid-cols-1 gap-3">
                    {pillar.trades.map((t) => (
                      <TradeBlock
                        key={t.id}
                        item={t}
                        toolKeys={filter?.toolKeys}
                        showJob={!filter || filter.jobTradeIds.has(t.id)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="flex flex-wrap gap-2 border-t border-navy/15 pt-4">
        <Link href="/assistant" className="chang-chip">
          หน้าแรกผู้ช่วย
        </Link>
        <Link href="/assistant/tables" className="chang-chip">
          <TableProperties className="h-4 w-4 shrink-0" aria-hidden />
          ตารางอ้างอิง
        </Link>
      </p>
    </div>
  );
}

function TradeBlock({ item, toolKeys, showJob }: { item: TocTrade; toolKeys?: Set<string>; showJob: boolean }) {
  const { trade } = item;
  const Icon = TRADE_ICONS[trade.id];
  const tools = trade.tools
    .map((tool, i) => ({ tool, number: `${item.number}.${i + 1}` }))
    .filter(({ tool }) => !toolKeys || toolKeys.has(`${trade.id}/${tool.id}`));
  const headingId = `${item.anchor}-h`;

  return (
    <article
      id={item.anchor}
      aria-labelledby={headingId}
      className="chang-anchor overflow-hidden rounded-[3px] border border-navy/15 bg-white"
    >
      <div className="flex items-center gap-3 border-b border-navy/15 bg-[#f7f8f9] py-1.5 pl-3 pr-1.5 sm:pl-4">
        <span className="font-latin w-8 shrink-0 text-sm font-semibold tabular-nums text-navy">{item.number}</span>
        {Icon ? <Icon className="hidden h-5 w-5 shrink-0 text-forge sm:block" aria-hidden /> : null}
        <div className="min-w-0 flex-1 py-1">
          <h3 id={headingId} className="font-bold leading-snug text-navy">
            {trade.name}
          </h3>
          <p className="text-[0.8125rem] leading-snug text-navy/75">
            <span className="font-latin font-semibold text-navy">{trade.tools.length}</span> เครื่องมือ
            <span className="hidden sm:inline"> · {trade.blurb}</span>
          </p>
        </div>
        <Link
          href={`/assistant/${trade.id}`}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-[2px] px-2.5 text-sm font-semibold text-navy hover:bg-white"
          aria-label={`เปิดหน้า${trade.name}`}
        >
          <span className="hidden sm:inline">หน้าสายงาน</span>
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
      </div>
      <ol className="-mb-px sm:grid sm:grid-cols-2">
        {trade.job && showJob ? (
          <li id={jobAnchor(trade.id)} className="chang-anchor border-b border-navy/10 sm:col-span-2">
            <Link
              href={`/assistant/${trade.id}/job`}
              className="group flex min-h-12 items-center gap-3 px-3 py-2 hover:bg-[#f7f8f9] sm:px-4"
            >
              <span className="w-8 shrink-0">
                <span className="block h-0.5 w-4 bg-forge" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                {/* ชื่อชุดคิดทั้งงานส่วนใหญ่บอกอยู่แล้วว่า "ทั้งงาน/ทั้งห้อง" — ขีดสนิมหน้าบรรทัดคือเครื่องหมายบนจอ */}
                <span className="block text-sm font-bold leading-snug text-navy group-hover:underline">
                  <span className="sr-only">ชุดคิดทั้งงาน: </span>
                  {trade.job.name}
                </span>
                <span className="mt-0.5 hidden text-[0.8125rem] leading-snug text-navy/75 sm:line-clamp-1">
                  {trade.job.blurb}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-navy/45" aria-hidden />
            </Link>
          </li>
        ) : null}
        {tools.map(({ tool, number }) => (
          <li
            key={tool.id}
            id={toolAnchor(trade.id, tool.id)}
            className="chang-anchor border-b border-navy/10"
          >
            <Link
              href={`/assistant/${trade.id}/${tool.id}`}
              className="group flex min-h-11 items-start gap-3 px-3 py-2 hover:bg-[#f7f8f9] sm:px-4"
            >
              <span className="font-latin w-8 shrink-0 pt-px text-xs tabular-nums leading-5 text-navy/70">{number}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-5 text-navy group-hover:underline">{tool.name}</span>
                <span className="hidden text-[0.8125rem] leading-snug text-navy/75 sm:line-clamp-1">{tool.blurb}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </article>
  );
}
