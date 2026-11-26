"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight, ListTree } from "lucide-react";
import { getTrade, getToolCover, TRADE_ICONS } from "@/lib/chang/catalog";
import { buildToc, pillarOfTrade, tradeAnchor, type TocPillar } from "@/lib/chang/toc";
import { CatalogList, CatalogTile } from "@/components/chang/CatalogTile";

/**
 * จอกว้าง: สารบัญของหมวดนี้ด้านซ้าย — สายงานพี่น้องในหมวดเดียวกัน
 * สายงานที่เปิดอยู่กางรายการเครื่องมือของตัวเองไว้ (ลิงก์ไปหน้าเครื่องมือ)
 */
function PillarNav({ pillar, tradeId }: { pillar: TocPillar; tradeId: string }) {
  return (
    <nav aria-label={`สายงานในหมวด${pillar.name}`} className="hidden lg:block">
      <div className="chang-thin-scroll sticky top-[calc(var(--chang-top)+1rem)] max-h-[calc(100dvh-var(--chang-top)-2rem)] overflow-y-auto overscroll-contain pb-2 pr-1">
        <p className="chang-kicker mb-1.5">ในหมวดนี้</p>
        <Link
          href={`/assistant#${pillar.anchor}`}
          className="flex min-h-11 items-center gap-2.5 rounded-[2px] px-2 text-sm font-bold text-navy hover:bg-[#f1f3f5]"
        >
          <span className="font-latin flex h-6 w-6 shrink-0 items-center justify-center rounded-[2px] bg-navy text-xs font-semibold tabular-nums text-white">
            {pillar.number}
          </span>
          <span className="min-w-0 flex-1 leading-snug">{pillar.name}</span>
          <span className="font-latin text-xs tabular-nums text-navy/70">{pillar.count}</span>
        </Link>
        <ol className="ml-[1.3125rem] border-l border-navy/15">
          {pillar.trades.map((t) => {
            const current = t.id === tradeId;
            return (
              <li key={t.id}>
                <Link
                  href={`/assistant/${t.id}`}
                  aria-current={current ? "page" : undefined}
                  className={`-ml-px flex min-h-11 items-center gap-2 border-l-2 py-1 pl-3 pr-2 text-sm leading-snug ${
                    current
                      ? "border-forge bg-[#f1f3f5] font-semibold text-navy"
                      : "border-transparent text-navy/85 hover:border-navy/40 hover:text-navy"
                  }`}
                >
                  <span className="font-latin w-7 shrink-0 text-xs tabular-nums text-navy/70">{t.number}</span>
                  <span className="min-w-0 flex-1">{t.name}</span>
                  <span className="font-latin text-xs tabular-nums text-navy/70">{t.count}</span>
                </Link>
                {current ? (
                  <ol className="mb-1 ml-[2.75rem] border-l border-navy/15">
                    {t.trade.job ? (
                      <li>
                        <Link
                          href={`/assistant/${t.id}/job`}
                          className="flex min-h-11 items-center py-1 pl-3 pr-2 text-[0.8125rem] font-semibold leading-snug text-navy hover:underline"
                        >
                          {t.trade.job.name}
                        </Link>
                      </li>
                    ) : null}
                    {t.trade.tools.map((tool) => (
                      <li key={tool.id}>
                        <Link
                          href={`/assistant/${t.id}/${tool.id}`}
                          className="flex min-h-11 items-center py-1 pl-3 pr-2 text-[0.8125rem] leading-snug text-navy/85 hover:text-navy hover:underline"
                        >
                          {tool.name}
                        </Link>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </li>
            );
          })}
        </ol>
        <div className="mt-3 border-t border-navy/15 pt-3">
          <Link
            href={`/assistant/map#${tradeAnchor(tradeId)}`}
            className="flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-navy underline decoration-forge decoration-2 underline-offset-4"
          >
            <ListTree className="h-4 w-4 shrink-0" aria-hidden />
            ดูสารบัญทั้งหมด
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function TradeView({ tradeId }: { tradeId: string }) {
  const trade = getTrade(tradeId);
  const pillar = pillarOfTrade(buildToc(), tradeId);
  if (!trade) return null;
  const Icon = TRADE_ICONS[trade.id];

  return (
    <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
      {pillar ? <PillarNav pillar={pillar} tradeId={trade.id} /> : null}
      <div className={`grid min-w-0 content-start gap-5 ${pillar ? "" : "lg:col-span-2"}`}>
        <div>
          {pillar ? (
            <nav aria-label="ตำแหน่งหน้า" className="-ml-1 flex flex-wrap items-center text-sm text-navy/75">
              <Link
                href="/assistant"
                className="inline-flex min-h-11 items-center px-1 underline-offset-4 hover:text-navy hover:underline"
              >
                ผู้ช่วยงานช่าง
              </Link>
              <ChevronRight className="h-4 w-4 shrink-0 text-navy/40" aria-hidden />
              <Link
                href={`/assistant#${pillar.anchor}`}
                className="inline-flex min-h-11 items-center gap-1 px-1 font-medium text-navy underline-offset-4 hover:underline"
              >
                <span className="text-navy/75">อยู่ในหมวด</span>
                {pillar.name}
              </Link>
            </nav>
          ) : null}
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[2px] border border-navy/20 bg-white text-forge">
              {Icon ? <Icon className="h-6 w-6" aria-hidden /> : null}
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight text-navy">{trade.name}</h1>
              <p className="mt-1 text-sm text-navy/75">{trade.blurb}</p>
            </div>
          </div>
        </div>

        {trade.job ? (
          <Link
            href={`/assistant/${trade.id}/job`}
            className="chang-on-navy group flex items-center gap-4 rounded-[3px] border-b-[3px] border-forge bg-navy px-4 py-4 text-white transition-colors hover:bg-navy-deep"
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[0.8125rem] font-medium text-white/80">
                <span className="h-0.5 w-4 shrink-0 bg-forge" aria-hidden />
                เริ่มจากตรงนี้
              </span>
              <span className="mt-1 block text-lg font-bold leading-snug text-white">{trade.job.name}</span>
              <span className="mt-1 block text-sm leading-relaxed text-white/85">{trade.job.blurb}</span>
            </span>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[2px] border border-white/40 text-white">
              <ArrowRight className="h-5 w-5" aria-hidden />
            </span>
          </Link>
        ) : null}

        <section aria-labelledby="trade-tools-title">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
            <h2 id="trade-tools-title" className="chang-kicker">
              เครื่องมือด่วน
            </h2>
            <p className="text-[0.8125rem] text-navy/75">
              {trade.tools.length} เครื่องมือ ·{" "}
              <Link
                href={`/assistant/map#${tradeAnchor(trade.id)}`}
                className="inline-flex min-h-11 items-center font-semibold text-navy underline decoration-forge decoration-2 underline-offset-4"
              >
                ดูในสารบัญ
              </Link>
            </p>
          </div>
          <CatalogList>
            {trade.tools.map((tool, i) => (
              <CatalogTile
                key={tool.id}
                href={`/assistant/${trade.id}/${tool.id}`}
                title={tool.name}
                blurb={tool.blurb}
                cover={getToolCover(trade.id, tool.id)}
                icon={Icon}
                badge={trade.short}
                // สามใบแรกอยู่ในจอแรกทั้งมือถือและเดสก์ท็อป — โหลดทันที ใบแรกสุดให้ลำดับสูง (LCP)
                eager={i < 3}
                highPriority={i === 0}
              />
            ))}
          </CatalogList>
        </section>
      </div>
    </div>
  );
}
