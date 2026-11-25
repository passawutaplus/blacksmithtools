"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTrade, getToolCover, TRADE_ICONS } from "@/lib/chang/catalog";
import { CatalogList, CatalogTile } from "@/components/chang/CatalogTile";

export function TradeView({ tradeId }: { tradeId: string }) {
  const trade = getTrade(tradeId);
  if (!trade) return null;
  const Icon = TRADE_ICONS[trade.id];

  return (
    <div className="grid gap-5">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[2px] border border-navy/20 bg-white text-forge">
          {Icon ? <Icon className="h-6 w-6" aria-hidden /> : null}
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight text-navy">{trade.name}</h1>
          <p className="mt-1 text-sm text-navy/75">{trade.blurb}</p>
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
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="trade-tools-title" className="chang-kicker">
            เครื่องมือด่วน
          </h2>
          <p className="text-[0.8125rem] text-navy/70">{trade.tools.length} เครื่องมือ</p>
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
  );
}
