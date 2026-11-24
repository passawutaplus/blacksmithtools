import Link from "next/link";
import { PILLARS, TRADE_ICONS, TRADES, toolCount } from "@/lib/chang/catalog";

export const metadata = {
  alternates: { canonical: "/assistant/map" },
  title: "แผนผังเครื่องมือ",
  description: "แผนผังผู้ช่วยงานช่าง — ดูครบทุกสายงานและเครื่องมือแล้วกระโดดไปหน้าที่ต้องการ",
};

export default function AssistantMapPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">แผนผังเครื่องมือ</h1>
        <p className="mt-1 text-sm text-muted">
          {TRADES.length} สายงาน · {toolCount()} เครื่องมือ — กดชื่อเพื่อเปิดหน้าคิดเลข
        </p>
      </div>

      <p className="flex flex-wrap gap-2 text-sm">
        <Link href="/assistant" className="rounded-[2px] border border-steel px-3 py-1.5 font-medium text-navy hover:border-navy/30">
          หน้าแรกผู้ช่วย
        </Link>
        <Link href="/assistant/tables" className="rounded-[2px] border border-steel px-3 py-1.5 font-medium text-navy hover:border-navy/30">
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
              <p className="text-sm text-muted">{pillar.blurb}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {trades.map((trade) => {
                const Icon = TRADE_ICONS[trade.id];
                return (
                  <article key={trade.id} className="card p-4">
                    <Link href={`/assistant/${trade.id}`} className="flex items-center gap-2 font-bold text-navy hover:text-forge">
                      {Icon ? <Icon className="h-5 w-5 shrink-0 text-forge" aria-hidden /> : null}
                      {trade.name}
                    </Link>
                    <p className="mt-1 text-xs text-muted">{trade.blurb}</p>
                    <ul className="mt-3 space-y-1.5">
                      {trade.job ? (
                        <li>
                          <Link
                            href={`/assistant/${trade.id}/job`}
                            className="text-sm font-semibold text-forge hover:underline"
                          >
                            {trade.job.name}
                          </Link>
                        </li>
                      ) : null}
                      {trade.tools.map((tool) => (
                        <li key={tool.id}>
                          <Link
                            href={`/assistant/${trade.id}/${tool.id}`}
                            className="text-sm text-navy hover:underline"
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
