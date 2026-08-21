"use client";

import Image from "next/image";
import Link from "next/link";
import { getTrade, getToolCover, TRADE_ICONS } from "@/lib/chang/catalog";

export function TradeView({ tradeId }: { tradeId: string }) {
  const trade = getTrade(tradeId);
  if (!trade) return null;
  const Icon = TRADE_ICONS[trade.id];

  return (
    <div className="grid gap-5">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded bg-steel text-forge">
          {Icon ? <Icon className="h-6 w-6" aria-hidden /> : null}
        </span>
        <div>
          <h1 className="text-2xl font-bold text-navy">{trade.name}</h1>
          <p className="mt-1 text-sm text-muted">{trade.blurb}</p>
        </div>
      </div>

      {trade.job ? (
        <Link href={`/assistant/${trade.id}/job`} className="block rounded bg-navy px-4 py-4 text-white">
          <p className="text-xs font-medium text-white/70">เริ่มจากตรงนี้</p>
          <p className="mt-1 text-lg font-bold">{trade.job.name}</p>
          <p className="mt-1 text-sm text-white/80">{trade.job.blurb}</p>
        </Link>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-bold text-navy">เครื่องมือด่วน</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trade.tools.map((tool) => {
            const cover = getToolCover(trade.id, tool.id);
            return (
              <Link
                key={tool.id}
                href={`/assistant/${trade.id}/${tool.id}`}
                className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(35,50,61,0.16)]"
              >
                <span className="relative block aspect-[4/3] overflow-hidden bg-steel">
                  {cover ? (
                    <Image
                      src={cover}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-navy/25">
                      {Icon ? <Icon className="h-10 w-10" aria-hidden /> : null}
                    </span>
                  )}
                  <span className="badge absolute left-3 top-3 bg-navy/80 text-white backdrop-blur">{trade.short}</span>
                  <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-navy shadow-md">
                    {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
                  </span>
                </span>
                <span className="block p-4">
                  <span className="block font-bold text-navy">{tool.name}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-muted">{tool.blurb}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
