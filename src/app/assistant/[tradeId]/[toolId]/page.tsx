import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolView } from "@/components/chang/ToolView";
import { getTool } from "@/lib/chang/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tradeId: string; toolId: string }>;
}): Promise<Metadata> {
  const { tradeId, toolId } = await params;
  const found = getTool(tradeId, toolId);
  if (!found) return { title: "ไม่พบเครื่องมือ" };
  return { title: found.tool.name, description: found.tool.blurb };
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
