import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TradeView } from "@/components/chang/TradeView";
import { getTrade } from "@/lib/chang/catalog";
import { OG_BASE, metaDescription } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tradeId: string }>;
}): Promise<Metadata> {
  const { tradeId } = await params;
  const trade = getTrade(tradeId);
  if (!trade) return { title: "ไม่พบสายงาน" };
  return {
    title: `เครื่องมือคำนวณ${trade.name}`,
    description: metaDescription(
      `รวมเครื่องมือคำนวณสำหรับ${trade.name}: ${trade.blurb} ใช้ฟรีในเว็บ ไม่ต้องสมัคร จากผู้ช่วยงานช่าง BlackSmith`,
    ),
    alternates: { canonical: `/assistant/${trade.id}` },
    openGraph: { ...OG_BASE, type: "website", title: `เครื่องมือคำนวณ${trade.name}` },
  };
}

export default async function TradePage({ params }: { params: Promise<{ tradeId: string }> }) {
  const { tradeId } = await params;
  if (!getTrade(tradeId)) notFound();
  return <TradeView tradeId={tradeId} />;
}
