"use client";

import Link from "next/link";
import { getTool, getTrade, toolPath } from "@/lib/chang/catalog";
import { CalcScreen } from "@/components/chang/CalcScreen";

export function ToolView({ tradeId, toolId }: { tradeId: string; toolId: string }) {
  const found = getTool(tradeId, toolId);
  if (!found) {
    return (
      <div>
        <p className="font-bold text-navy">ไม่เจอเครื่องมือนี้</p>
        <Link href="/assistant" className="mt-3 inline-block text-sm text-forge underline">
          กลับผู้ช่วยงานช่าง
        </Link>
      </div>
    );
  }

  return (
    <CalcScreen
      key={`${tradeId}/${toolId}`}
      crumbName={found.trade.name}
      crumbTo={`/assistant/${found.trade.id}`}
      title={found.tool.name}
      blurb={found.tool.blurb}
      fields={found.tool.fields}
      calc={found.tool.calc}
      favPath={toolPath(found.trade.id, found.tool.id)}
    />
  );
}

export function JobView({ tradeId }: { tradeId: string }) {
  const trade = getTrade(tradeId);
  if (!trade?.job) {
    return (
      <div>
        <p className="font-bold text-navy">สายงานนี้ยังไม่มีชุดคิดทั้งงาน</p>
        <Link href="/assistant" className="mt-3 inline-block text-sm text-forge underline">
          กลับผู้ช่วยงานช่าง
        </Link>
      </div>
    );
  }
  return (
    <CalcScreen
      key={`${trade.id}/job`}
      crumbName={trade.name}
      crumbTo={`/assistant/${trade.id}`}
      title={trade.job.name}
      blurb={trade.job.blurb}
      fields={trade.job.fields}
      calc={trade.job.calc}
    />
  );
}
