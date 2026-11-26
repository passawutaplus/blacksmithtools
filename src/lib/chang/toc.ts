import { PILLARS, TRADES } from "./catalog";
import { searchTools, textMatchesQuery } from "./search";
import type { Pillar, Trade } from "./types";

/**
 * สารบัญผู้ช่วยงานช่าง — หมวด → สายงาน → เครื่องมือ
 * สร้างจากทะเบียน (PILLARS/TRADES) ล้วน ๆ เพิ่มหมวด/สายงานแล้วสารบัญ เลขข้อ และ anchor ตามมาเอง
 * หมวดที่ยังไม่มีสายงานไม่แสดง · สายงานที่ชี้หมวดที่ไม่มีอยู่จริงไปรวมในหมวด "อื่น ๆ" ท้ายสุด (ไม่หายเงียบ)
 */

export const pillarAnchor = (pillarId: string) => `p-${pillarId}`;
export const tradeAnchor = (tradeId: string) => `t-${tradeId}`;
export const toolAnchor = (tradeId: string, toolId: string) => `t-${tradeId}--${toolId}`;
export const jobAnchor = (tradeId: string) => `t-${tradeId}--job`;

export type TocTrade = {
  id: string;
  anchor: string;
  /** เลขข้อ เช่น "3.2" */
  number: string;
  name: string;
  /** จำนวนเครื่องมือย่อย (ไม่นับชุดคิดทั้งงาน) */
  count: number;
  trade: Trade;
};

export type TocPillar = {
  id: string;
  anchor: string;
  /** เลขข้อ เช่น "3" */
  number: string;
  name: string;
  blurb: string;
  /** จำนวนเครื่องมือทั้งหมวด */
  count: number;
  trades: TocTrade[];
};

const OTHER_PILLAR: Pillar = { id: "other", name: "อื่น ๆ", blurb: "สายงานที่ยังไม่ได้จัดหมวด" };

export function buildToc(pillars: Pillar[] = PILLARS, trades: Trade[] = TRADES): TocPillar[] {
  const known = new Set(pillars.map((p) => p.id));
  const orphans = trades.filter((t) => !known.has(t.pillarId));
  const groups = pillars.map((p) => ({ pillar: p, trades: trades.filter((t) => t.pillarId === p.id) }));
  if (orphans.length) groups.push({ pillar: OTHER_PILLAR, trades: orphans });

  const out: TocPillar[] = [];
  for (const { pillar, trades: list } of groups) {
    if (!list.length) continue;
    const number = String(out.length + 1);
    const items = list.map((trade, i) => ({
      id: trade.id,
      anchor: tradeAnchor(trade.id),
      number: `${number}.${i + 1}`,
      name: trade.name,
      count: trade.tools.length,
      trade,
    }));
    out.push({
      id: pillar.id,
      anchor: pillarAnchor(pillar.id),
      number,
      name: pillar.name,
      blurb: pillar.blurb,
      count: items.reduce((n, t) => n + t.count, 0),
      trades: items,
    });
  }
  return out;
}

/** สายงานไหนอยู่หมวดไหน (ตามสารบัญ) */
export function pillarOfTrade(toc: TocPillar[], tradeId: string): TocPillar | undefined {
  return toc.find((p) => p.trades.some((t) => t.id === tradeId));
}

export type TocFilter = {
  /** สายงานที่ยังเหลือในรายการ */
  tradeIds: Set<string>;
  /** "tradeId/toolId" ที่ตรงคำค้น */
  toolKeys: Set<string>;
  /** สายงานที่ชุด "คิดทั้งงาน" ตรงคำค้น */
  jobTradeIds: Set<string>;
  /** จำนวนเครื่องมือที่เหลือ (รวมชุดคิดทั้งงาน) */
  total: number;
  /** ผลที่ตรงที่สุดตามลำดับของ searchTools — กด Enter เปิดอันนี้ */
  top?: { href: string; name: string };
};

/**
 * กรองสารบัญตามคำค้น ใช้ตัวค้นตัวเดียวกับช่องค้นหาหน้าแรก (คำพ้อง/ไม่สนวรรณยุกต์/ทุกคำต้องเจอ)
 * ชื่อสายงานตรง = เปิดทั้งสายงาน · ไม่งั้นเหลือเฉพาะเครื่องมือที่ตรง (ลำดับในรายการยังเป็นตามสารบัญ)
 * คืน null ถ้าไม่มีคำค้น (แสดงทั้งหมด)
 */
export function filterToc(query: string, trades: Trade[] = TRADES): TocFilter | null {
  if (!query.trim()) return null;
  const found = searchTools(query);
  // เปิดทั้งสายงานเฉพาะเมื่อ "ชื่อ" สายงานตรง (แอร์, ประปา) — คำที่ตรงแค่คำอธิบาย/คำเรียกหน้างาน
  // ให้เหลือเฉพาะเครื่องมือที่ตรง ไม่งั้นพิมพ์ "ท่อ" แล้วได้ทุกเครื่องมือของช่างแอร์เพราะคำอธิบายมี "ท่อทองแดง"
  const wholeTrades = new Set(
    found.trades.filter((t) => textMatchesQuery(`${t.name} ${t.short}`, query)).map((t) => t.id),
  );
  const toolKeys = new Set<string>();
  const jobTradeIds = new Set<string>();
  const tradeIds = new Set<string>();

  for (const trade of trades) {
    if (wholeTrades.has(trade.id)) {
      for (const tool of trade.tools) toolKeys.add(`${trade.id}/${tool.id}`);
      if (trade.job) jobTradeIds.add(trade.id);
      tradeIds.add(trade.id);
    } else if (trade.job && textMatchesQuery(`${trade.job.name} ${trade.job.blurb}`, query)) {
      jobTradeIds.add(trade.id);
      tradeIds.add(trade.id);
    }
  }
  for (const hit of found.tools) {
    toolKeys.add(`${hit.tradeId}/${hit.id}`);
    tradeIds.add(hit.tradeId);
  }

  const first = found.tools[0];
  const firstTrade = found.trades[0];
  const firstJob = trades.find((t) => jobTradeIds.has(t.id));
  const top = first
    ? { href: `/assistant/${first.tradeId}/${first.id}`, name: first.name }
    : firstTrade
      ? { href: `/assistant/${firstTrade.id}`, name: firstTrade.name }
      : firstJob?.job
        ? { href: `/assistant/${firstJob.id}/job`, name: firstJob.job.name }
        : undefined;

  return { tradeIds, toolKeys, jobTradeIds, total: toolKeys.size + jobTradeIds.size, top };
}
