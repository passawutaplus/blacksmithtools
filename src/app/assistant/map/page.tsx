import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PILLARS, TRADE_ICONS, TRADES, toolCount } from "@/lib/chang/catalog";

export const metadata = {
  title: "แผนผังเครื่องมือ",
  description: "แผนผังผู้ช่วยงานช่าง — ดูครบทุกสายงานและเครื่องมือแล้วกระโดดไปหน้าที่ต้องการ",
};

export default function AssistantMapPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">แผนผังเครื่องมือ</h1>
        <p className="mt-1 text-sm text-navy/75">
          {TRADES.length} สายงาน · {toolCount()} เครื่องมือ — กดชื่อเพื่อเปิดหน้าคิดเลข
        </p>
      </div>

      <p className="flex flex-wrap gap-2">
        <Link href="/assistant" className="chang-chip">
          หน้าแรกผู้ช่วย
        </Link>
        <Link href="/assistant/tables" className="chang-chip">
          ตารางอ้างอิง
        </Link>
      </p>

      {PILLARS.map((pillar) => {
        const trades = TRADES.filter((t) => t.pillarId === pillar.id);
        if (!trades.length) return null;
        return (
          <section key={pillar.id} className="grid gap-4">
            <div>
              <h2 className="text-lg font-bold text-navy">{pillar.name}</h2>
              <p className="text-sm text-navy/75">{pillar.blurb}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {trades.map((trade) => {
                const Icon = TRADE_ICONS[trade.id];
                return (
                  <article key={trade.id} className="card">
                    {/* ทุกลิงก์สูงอย่างน้อย 44px — กดด้วยนิ้ว/ถุงมือได้ ไม่ต้องเล็งตัวหนังสือ */}
                    <Link
                      href={`/assistant/${trade.id}`}
                      className="flex min-h-14 items-center gap-2.5 border-b border-navy/15 px-4 py-2 hover:bg-[#f7f8f9]"
                    >
                      {Icon ? <Icon className="h-5 w-5 shrink-0 text-forge" aria-hidden /> : null}
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold leading-snug text-navy">{trade.name}</span>
                        <span className="block text-[0.8125rem] leading-snug text-navy/75">{trade.blurb}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-navy/45" aria-hidden />
                    </Link>
                    <ul className="grid divide-y divide-navy/10 sm:grid-cols-2 sm:gap-x-4 sm:divide-y-0 sm:px-2 sm:py-1.5">
                      {trade.job ? (
                        <li>
                          <Link
                            href={`/assistant/${trade.id}/job`}
                            className="flex min-h-11 items-center gap-2 px-4 py-1.5 text-sm font-semibold leading-snug text-navy hover:bg-[#f7f8f9] sm:px-2"
                          >
                            <span className="h-0.5 w-3 shrink-0 bg-forge" aria-hidden />
                            {trade.job.name}
                          </Link>
                        </li>
                      ) : null}
                      {trade.tools.map((tool) => (
                        <li key={tool.id}>
                          <Link
                            href={`/assistant/${trade.id}/${tool.id}`}
                            className="flex min-h-11 items-center px-4 py-1.5 text-sm leading-snug text-navy hover:bg-[#f7f8f9] hover:underline sm:px-2"
                          >
                            {tool.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
