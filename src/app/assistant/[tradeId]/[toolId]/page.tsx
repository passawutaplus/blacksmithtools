import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolView } from "@/components/chang/ToolView";
import { getTool } from "@/lib/chang/catalog";
import { OG_BASE, metaDescription } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tradeId: string; toolId: string }>;
}): Promise<Metadata> {
  const { tradeId, toolId } = await params;
  const found = getTool(tradeId, toolId);
  if (!found) return { title: "ไม่พบเครื่องมือ" };
  const { trade, tool } = found;
  return {
    title: `${tool.name} — ${trade.name} คำนวณออนไลน์ฟรี`,
    description: metaDescription(
      `${tool.name} สำหรับ${trade.name}: ${tool.blurb} คำนวณในเว็บได้ทันที ฟรี ไม่ต้องสมัคร จากผู้ช่วยงานช่าง BlackSmith`,
    ),
    alternates: { canonical: `/assistant/${trade.id}/${tool.id}` },
    openGraph: { ...OG_BASE, type: "website", title: `${tool.name} — ${trade.name}` },
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ tradeId: string; toolId: string }>;
}) {
  const { tradeId, toolId } = await params;
  if (!getTool(tradeId, toolId)) notFound();
  return <ToolView tradeId={tradeId} toolId={toolId} />;
}
