import { describe, expect, it } from "vitest";
import { containsTerm, normalizeSearchText, searchTools, tokenize } from "./search";
import { TRADES } from "./catalog";

const ids = (q: string) => searchTools(q).tools.map((t) => `${t.tradeId}/${t.id}`);

describe("normalizeSearchText", () => {
  it("ไม่สนวรรณยุกต์และการันต์", () => {
    expect(normalizeSearchText("ปั้ม")).toBe(normalizeSearchText("ปั๊ม"));
    expect(normalizeSearchText("แอร")).toBe(normalizeSearchText("แอร์"));
    expect(normalizeSearchText("  BTU  แอร์ ")).toBe("btu แอร");
  });
  it("แยกคำ", () => {
    expect(tokenize("แอร์ btu")).toEqual(["แอร", "btu"]);
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("containsTerm", () => {
  it("ไม่นับคำหลอกที่มีสระนำอยู่ข้างหน้า", () => {
    expect(containsTerm(normalizeSearchText("ฉนวนกันร้อน-เสียง"), normalizeSearchText("สี"))).toBe(false);
    expect(containsTerm(normalizeSearchText("ปริมาณสี"), normalizeSearchText("สี"))).toBe(true);
    expect(containsTerm(normalizeSearchText("ค่าไฟแอร์"), normalizeSearchText("แอร์"))).toBe(true);
  });
});

describe("searchTools", () => {
  it("ไม่พิมพ์อะไร = ทุกสายงาน ไม่มีรายการเครื่องมือ", () => {
    const r = searchTools("  ");
    expect(r.trades).toHaveLength(TRADES.length);
    expect(r.tools).toHaveLength(0);
  });

  it("หลายคำต้องเจอทุกคำ: แอร์ btu", () => {
    const r = ids("แอร์ btu");
    expect(r[0]).toBe("hvac/btu");
    expect(r.every((id) => id.startsWith("hvac/") || id === "electrical/unit")).toBe(true);
  });

  it("ท่อ pvc", () => {
    const r = ids("ท่อ pvc");
    expect(r.length).toBeGreaterThan(0);
    expect(r[0]).toBe("plumbing/pipe");
  });

  it("สะกดวรรณยุกต์เพี้ยน: ปั้ม = ปั๊ม", () => {
    expect(ids("ปั้ม")[0]).toBe("plumbing/pump");
    expect(ids("ปั้ม")).toEqual(ids("ปั๊ม"));
  });

  it("คำอังกฤษ: tile, kW, pump, paint", () => {
    expect(ids("tile")[0]).toMatch(/^(tile|vinyl|handyman)\//);
    expect(ids("tile").some((id) => id === "tile/qty")).toBe(true);
    expect(ids("kW").length).toBeGreaterThan(0);
    expect(ids("KW")).toContain("electrical/unit");
    expect(ids("pump")[0]).toBe("plumbing/pump");
    expect(ids("paint")[0]).toMatch(/^paint\//);
  });

  it("เรียงชื่อ > สายงาน > คำอธิบาย: 'สี' ต้องขึ้นงานสีก่อน ไม่ใช่ฉนวน", () => {
    const r = ids("สี");
    expect(r[0]).toBe("paint/qty");
    expect(r).not.toContain("ceiling/insulation");
    expect(r.slice(0, 5).every((id) => id.startsWith("paint/"))).toBe(true);
  });

  it("ชื่อเครื่องมือมาก่อนคำอธิบาย", () => {
    const r = ids("เบรกเกอร์");
    expect(r[0]).toBe("hvac/breaker");
    expect(r).toContain("electrical/cable");
  });

  it("ไม่เจอ = รายการว่างทั้งคู่", () => {
    const r = searchTools("xyzzy");
    expect(r.tools).toHaveLength(0);
    expect(r.trades).toHaveLength(0);
  });

  it("ค้นสายงานได้", () => {
    expect(searchTools("แอร์").trades.map((t) => t.id)).toContain("hvac");
    expect(searchTools("air").trades.map((t) => t.id)).toContain("hvac");
  });
});
