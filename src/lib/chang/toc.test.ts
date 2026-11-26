import { describe, expect, it } from "vitest";
import { PILLARS, TRADES, toolCount } from "./catalog";
import { textMatchesQuery } from "./search";
import { buildToc, filterToc, pillarOfTrade, tradeAnchor } from "./toc";
import type { Pillar, Trade } from "./types";

const fakeTrade = (id: string, pillarId: string, tools = 2): Trade => ({
  id,
  name: `ช่าง ${id}`,
  short: id,
  pillarId,
  blurb: "",
  tools: Array.from({ length: tools }, (_, i) => ({ ...TRADES[0].tools[0], id: `x${i}` })),
});

describe("buildToc", () => {
  it("ครบทุกสายงานและทุกเครื่องมือในทะเบียน", () => {
    const toc = buildToc();
    expect(toc.flatMap((p) => p.trades).length).toBe(TRADES.length);
    expect(toc.reduce((n, p) => n + p.count, 0)).toBe(toolCount());
  });

  it("เลขข้อ หมวด.สายงาน เรียงตามทะเบียน และ anchor ไม่ซ้ำ", () => {
    const toc = buildToc();
    toc.forEach((p, i) => {
      expect(p.number).toBe(String(i + 1));
      p.trades.forEach((t, j) => expect(t.number).toBe(`${i + 1}.${j + 1}`));
    });
    const anchors = toc.flatMap((p) => [p.anchor, ...p.trades.map((t) => t.anchor)]);
    expect(new Set(anchors).size).toBe(anchors.length);
  });

  it("ซ่อนหมวดที่ไม่มีสายงาน เลขข้อไม่เว้นช่อง", () => {
    const pillars: Pillar[] = [
      { id: "a", name: "A", blurb: "" },
      { id: "empty", name: "ว่าง", blurb: "" },
      { id: "b", name: "B", blurb: "" },
    ];
    const toc = buildToc(pillars, [fakeTrade("t1", "a"), fakeTrade("t2", "b", 3)]);
    expect(toc.map((p) => [p.id, p.number, p.count])).toEqual([
      ["a", "1", 2],
      ["b", "2", 3],
    ]);
  });

  it("สายงานที่ชี้หมวดที่ไม่มี ไปอยู่หมวด อื่น ๆ ท้ายสุด (ไม่หายเงียบ)", () => {
    const toc = buildToc([{ id: "a", name: "A", blurb: "" }], [fakeTrade("t1", "a"), fakeTrade("lost", "nope")]);
    expect(toc.at(-1)?.id).toBe("other");
    expect(toc.at(-1)?.trades[0].id).toBe("lost");
  });

  it("รองรับหกหมวดหลายสิบสายงาน", () => {
    const pillars = Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, blurb: "" }));
    const trades = Array.from({ length: 25 }, (_, i) => fakeTrade(`t${i}`, `p${i % 6}`, 5));
    const toc = buildToc(pillars, trades);
    expect(toc).toHaveLength(6);
    expect(toc[0].trades.map((t) => t.number)).toEqual(["1.1", "1.2", "1.3", "1.4", "1.5"]);
    expect(toc.reduce((n, p) => n + p.count, 0)).toBe(125);
  });

  it("หาหมวดของสายงาน", () => {
    const toc = buildToc();
    const trade = TRADES[0];
    expect(pillarOfTrade(toc, trade.id)?.id).toBe(trade.pillarId);
    expect(pillarOfTrade(toc, "ไม่มี")).toBeUndefined();
    expect(tradeAnchor(trade.id)).toBe(`t-${trade.id}`);
  });

  it("หมวดในทะเบียนจริงมีอยู่ทุกอัน", () => {
    const ids = new Set(PILLARS.map((p) => p.id));
    for (const t of TRADES) expect(ids.has(t.pillarId)).toBe(true);
  });
});

describe("filterToc", () => {
  it("ไม่มีคำค้น = ไม่กรอง", () => {
    expect(filterToc("")).toBeNull();
    expect(filterToc("   ")).toBeNull();
  });

  it("ชื่อสายงานตรง = เปิดทั้งสายงานพร้อมคิดทั้งงาน", () => {
    const f = filterToc("แอร์");
    const hvac = TRADES.find((t) => t.id === "hvac")!;
    expect(f?.tradeIds.has("hvac")).toBe(true);
    for (const tool of hvac.tools) expect(f?.toolKeys.has(`hvac/${tool.id}`)).toBe(true);
    if (hvac.job) expect(f?.jobTradeIds.has("hvac")).toBe(true);
  });

  it("คำที่ตรงแค่คำอธิบายสายงาน ไม่ลากทั้งสายงานมา", () => {
    const f = filterToc("ท่อ")!;
    expect(f.toolKeys.has("hvac/btu")).toBe(false);
    expect(f.toolKeys.has("plumbing/pipe")).toBe(true);
  });

  it("ผลที่ตรงที่สุดมาจากลำดับของตัวค้น", () => {
    const f = filterToc("btu");
    expect(f?.top?.href).toBe("/assistant/hvac/btu");
    expect(f?.toolKeys.has("hvac/btu")).toBe(true);
  });

  it("ไม่เจอ = ว่าง ไม่มีผลแนะนำ", () => {
    const f = filterToc("zzzzqqq");
    expect(f?.total).toBe(0);
    expect(f?.tradeIds.size).toBe(0);
    expect(f?.top).toBeUndefined();
  });

  it("นับจำนวนที่เหลือ = เครื่องมือ + ชุดคิดทั้งงาน", () => {
    const f = filterToc("สี")!;
    expect(f.total).toBe(f.toolKeys.size + f.jobTradeIds.size);
    expect(f.total).toBeGreaterThan(0);
  });
});

describe("textMatchesQuery", () => {
  it("ทุกคำต้องเจอ ใช้คำพ้องและไม่สนวรรณยุกต์", () => {
    expect(textMatchesQuery("คิดขนาดแอร์ทั้งห้อง", "แอร")).toBe(true);
    expect(textMatchesQuery("คิดขนาดแอร์ทั้งห้อง", "air")).toBe(true);
    expect(textMatchesQuery("คิดขนาดแอร์ทั้งห้อง", "แอร์ ท่อ")).toBe(false);
    expect(textMatchesQuery("อะไรก็ได้", "")).toBe(false);
  });
});
