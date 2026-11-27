import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobView } from "@/components/chang/ToolView";
import { getTrade } from "@/lib/chang/catalog";
import { OG_BASE, metaDescription } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tradeId: string }>;
}): Promise<Metadata> {
  const { tradeId } = await params;
  const trade = getTrade(tradeId);
  if (!trade?.job) return { title: "คิดทั้งงาน" };
  return {
    title: `${trade.job.name} — ${trade.name}`,
    description: metaDescription(
      `${trade.job.name} สำหรับ${trade.name}: ${trade.job.blurb} คิดทั้งงานในหน้าเดียว ฟรี ไม่ต้องสมัคร`,
    ),
    alternates: { canonical: `/assistant/${trade.id}/job` },
    openGraph: { ...OG_BASE, type: "website", title: `${trade.job.name} — ${trade.name}` },
  };
}

export default async function JobPage({ params }: { params: Promise<{ tradeId: string }> }) {
  const { tradeId } = await params;
  if (!getTrade(tradeId)?.job) notFound();
  return <JobView tradeId={tradeId} />;
}
