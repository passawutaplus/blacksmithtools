import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobView } from "@/components/chang/ToolView";
import { getTrade } from "@/lib/chang/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tradeId: string }>;
}): Promise<Metadata> {
  const { tradeId } = await params;
  const trade = getTrade(tradeId);
  if (!trade?.job) return { title: "คิดทั้งงาน" };
  return { title: trade.job.name, description: trade.job.blurb };
}

export default async function JobPage({ params }: { params: Promise<{ tradeId: string }> }) {
  const { tradeId } = await params;
  if (!getTrade(tradeId)?.job) notFound();
  return <JobView tradeId={tradeId} />;
}
