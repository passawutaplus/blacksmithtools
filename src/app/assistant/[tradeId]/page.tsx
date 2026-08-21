import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TradeView } from "@/components/chang/TradeView";
import { getTrade } from "@/lib/chang/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tradeId: string }>;
}): Promise<Metadata> {
  const { tradeId } = await params;
  const trade = getTrade(tradeId);
  if (!trade) return { title: "ไม่พบสายงาน" };
  return { title: trade.name, description: trade.blurb };
}

export default async function TradePage({ params }: { params: Promise<{ tradeId: string }> }) {
  const { tradeId } = await params;
  if (!getTrade(tradeId)) notFound();
  return <TradeView tradeId={tradeId} />;
}
