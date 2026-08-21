import type { Metadata } from "next";
import Link from "next/link";
import { PILLARS, TRADES, toolCount } from "@/lib/chang/catalog";

export const metadata: Metadata = {
  title: "แผนผังเว็บ",
  description: "แผนผังหน้าเว็บ BlackSmith Tools — ร้านค้า ผู้ช่วยงานช่าง และหน้าข้อมูล",
};

const SHOP = [
  { href: "/", label: "หน้าแรก" },
  { href: "/shop", label: "ดูสินค้าทั้งหมด" },
  { href: "/custom-print", label: "พิมพ์ 3D" },
  { href: "/track", label: "ตามพัสดุ" },
  { href: "/warranty", label: "รับประกัน / เคลม" },
];

const COMPANY = [
  { href: "/about", label: "เกี่ยวกับเรา" },
  { href: "/contact", label: "ติดต่อเรา" },
  { href: "/about#wholesale", label: "ขายส่ง" },
];

const LEGAL = [
  { href: "/privacy", label: "ความเป็นส่วนตัว" },
  { href: "/terms", label: "ข้อกำหนด" },
  { href: "/cookies", label: "คุกกี้" },
  { href: "/pdpa", label: "PDPA" },
];

export default function HtmlSitemapPage() {
  return (
    <div className="container-bs py-10">
      <div className="mx-auto max-w-6xl grid gap-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">แผนผังเว็บ</h1>
          <p className="mt-1 text-sm text-muted">
            หน้าหลักของร้านและผู้ช่วยงานช่าง รวม {toolCount()} เครื่องมือใน {TRADES.length} สายงาน
          </p>
        </div>

        <section>
          <h2 className="text-lg font-bold text-navy">ร้าน</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {SHOP.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-navy hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-navy">ผู้ช่วยงานช่าง</h2>
          <p className="mt-1 text-sm text-muted">
            <Link href="/assistant" className="font-semibold text-forge hover:underline">
              หน้าแรกผู้ช่วย
            </Link>
            {" · "}
            <Link href="/assistant/map" className="hover:underline">
              แผนผังเครื่องมือ
            </Link>
            {" · "}
            <Link href="/assistant/tables" className="hover:underline">
              ตารางอ้างอิง
            </Link>
          </p>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {PILLARS.map((pillar) => {
              const trades = TRADES.filter((t) => t.pillarId === pillar.id);
              return (
                <div key={pillar.id}>
                  <h3 className="text-sm font-bold text-navy">{pillar.name}</h3>
                  <ul className="mt-2 space-y-1">
                    {trades.map((trade) => (
                      <li key={trade.id}>
                        <Link href={`/assistant/${trade.id}`} className="text-sm text-navy hover:underline">
                          {trade.name}
                        </Link>
                        <span className="text-xs text-muted"> · {trade.tools.length} เครื่องมือ</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="text-lg font-bold text-navy">ร้าน / บริษัท</h2>
            <ul className="mt-3 space-y-1.5">
              {COMPANY.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-navy hover:underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy">กฎหมาย</h2>
            <ul className="mt-3 space-y-1.5">
              {LEGAL.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-navy hover:underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
