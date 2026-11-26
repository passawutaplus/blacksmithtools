import { TRADES, TOOL_ALIASES as CATALOG_TOOL_ALIASES, TRADE_ALIASES as CATALOG_TRADE_ALIASES } from "./catalog";
import type { ToolDef, Trade } from "./types";

/**
 * ค้นหาเครื่องมือของผู้ช่วยงานช่าง
 *
 * - พิมพ์หลายคำได้ ทุกคำต้องเจอ (AND): "แอร์ btu", "ท่อ pvc"
 * - ไม่สนวรรณยุกต์/การันต์: "ปั้ม" = "ปั๊ม", "แอร" = "แอร์"
 * - คำอังกฤษ/คำเรียกหน้างานที่ใช้แทนกัน: tile = กระเบื้อง, kW = กิโลวัตต์
 * - เรียงตามตำแหน่งที่เจอ: ชื่อเครื่องมือ > คำพ้อง/คีย์เวิร์ด > สายงาน > คำอธิบาย > ชื่อช่องกรอก
 */

export type ToolHit = { tradeId: string; tradeName: string; id: string; name: string; blurb: string };
export type SearchResult = { trades: Trade[]; tools: ToolHit[] };

const TONE_MARKS = /[็-๎]/g;
const LEADING_VOWELS = "เแโใไ";

/** ตัวพิมพ์เล็ก + ตัดวรรณยุกต์ ไม้ไต่คู้ การันต์ ออก เพื่อเทียบคำที่สะกดเพี้ยนเสียง */
export function normalizeSearchText(text: string): string {
  return text.normalize("NFC").toLowerCase().replace(TONE_MARKS, "").replace(/\s+/g, " ").trim();
}

export function tokenize(query: string): string[] {
  return normalizeSearchText(query)
    .split(/[\s,+/]+/)
    .filter(Boolean)
    .slice(0, 6);
}

/** คำที่ใช้แทนกันได้ — พิมพ์คำใดคำหนึ่งให้ค้นทุกคำในกลุ่ม */
const SYNONYM_GROUPS: string[][] = [
  ["แอร์", "air", "aircon", "ac", "เครื่องปรับอากาศ"],
  ["บีทียู", "btu"],
  ["น้ำยา", "refrigerant", "r32", "r410a", "r22"],
  ["สายไฟ", "cable", "wire", "สาย thw"],
  ["เบรกเกอร์", "breaker", "เบรคเกอร์", "mcb"],
  ["แรงดันตก", "voltage drop", "vdrop", "ไฟตก"],
  ["โซลาร์", "solar", "โซล่า", "โซลา", "แผงโซลาร์"],
  ["แบตเตอรี่", "battery", "แบต"],
  ["กิโลวัตต์", "kw", "วัตต์", "watt"],
  ["แรงม้า", "hp"],
  ["แอมป์", "amp", "ampere"],
  ["ปั๊ม", "pump", "ปั๊มน้ำ"],
  ["ท่อ", "pipe"],
  ["พีวีซี", "pvc"],
  ["ถังน้ำ", "tank", "ถังเก็บน้ำ", "แท็งก์"],
  ["กระเบื้อง", "tile"],
  ["ยาแนว", "grout"],
  ["ปูนกาว", "adhesive", "กาวซีเมนต์"],
  ["กระเบื้องยาง", "vinyl", "spc", "lvt", "ไวนิล"],
  ["ฝ้า", "ceiling", "ฝ้าเพดาน"],
  ["ยิปซัม", "gypsum", "ยิปซั่ม"],
  ["ฉนวน", "insulation"],
  ["กระจก", "glass"],
  ["อลูมิเนียม", "aluminium", "aluminum", "อะลูมิเนียม"],
  ["ซิลิโคน", "silicone", "sealant"],
  ["อิฐ", "brick", "อิฐมวลเบา", "อิฐบล็อก"],
  ["ปูน", "cement", "mortar", "ซีเมนต์"],
  ["ฉาบ", "plaster"],
  ["คอนกรีต", "concrete"],
  ["หลังคา", "roof"],
  ["เมทัลชีท", "metal sheet", "metalsheet"],
  ["รางน้ำ", "gutter"],
  ["เหล็ก", "steel"],
  ["เชื่อม", "weld", "welding"],
  ["สี", "paint", "ทาสี"],
  ["วอลเปเปอร์", "wallpaper"],
  ["บานพับ", "hinge"],
  ["ลิ้นชัก", "drawer"],
  ["สกรู", "screw", "น็อต"],
  ["พุก", "anchor"],
  ["บันได", "stair", "stairs"],
  ["แปลงหน่วย", "convert", "unit", "หน่วย"],
  ["บิ้วอิน", "บิวท์อิน", "บิลท์อิน", "built-in", "builtin"],
  ["พื้นที่", "area"],
  ["ปริมาตร", "volume"],
  ["น้ำหนัก", "weight"],
  ["ค่าไฟ", "electric bill", "ค่าไฟฟ้า"],
].map((group) => group.map(normalizeSearchText));

/** คำเรียกหน้างานของสายงาน (ชุดเดียวกับ catalog + คำอังกฤษ) */
const TRADE_ALIASES: Record<string, string[]> = {
  hvac: ["แอร์", "เครื่องปรับอากาศ", "น้ำยา", "btu", "hvac"],
  electrical: ["สายไฟ", "เบรกเกอร์", "แรงดันตก", "โซลาร์", "ไฟ", "ไฟฟ้า", "electric"],
  plumbing: ["ประปา", "ท่อ", "ปั๊ม", "ถังน้ำ", "plumbing", "น้ำ"],
  masonry: ["ก่อ", "อิฐ", "ฉาบ", "ทับหลัง", "เสาเอ็น", "ปูน"],
  steel: ["เหล็ก", "เชื่อม", "h-beam", "ลวดเชื่อม"],
  roof: ["หลังคา", "เมทัลชีท", "กระเบื้องลอน", "รางน้ำ"],
  tile: ["กระเบื้อง", "ยาแนว", "ปูนกาว"],
  vinyl: ["กระเบื้องยาง", "spc", "lvt", "ลามิเนต"],
  ceiling: ["ฝ้า", "ยิปซัม", "ทีบาร์", "กันเสียง"],
  glass: ["กระจก", "อลูมิเนียม", "ซิลิโคน"],
  handyman: ["บิ้วอิน", "พุก", "บันได", "ลามิเนต", "ตู้"],
  paint: ["สี", "ทาสี", "วอลเปเปอร์", "ผนัง"],
  general: ["แปลงหน่วย", "หน่วย", "คณิต"],
};

const TOOL_ALIASES: Record<string, string[]> = {
  "hvac/btu": ["ขนาดแอร์", "ตันความเย็น", "กี่ btu"],
  "hvac/shsc": ["superheat", "subcooling", "sh", "sc", "ความร้อนเกิน", "ความเย็นเกิน"],
  "hvac/pt": ["pt chart", "เกจ", "psi"],
  "hvac/energy": ["kw", "หน่วยไฟ", "ค่าไฟ"],
  "electrical/cable": ["thw", "เลือกสาย", "วสท", "สายไฟ"],
  "electrical/vdrop": ["voltage drop", "แรงดันตก"],
  "electrical/solar": ["kw", "kwp", "แผงโซลาร์"],
  "electrical/unit": ["kw", "hp", "วัตต์", "แรงม้า"],
  "masonry/lintel": ["ทับหลัง", "เสาเอ็น", "rb6"],
  "plumbing/pipe": ["pvc", "ขนาดท่อ"],
  "plumbing/bom": ["pvc", "กาวท่อ"],
  "plumbing/pump": ["ปั๊ม", "ปั๊มน้ำ"],
  "steel/weld": ["ลวดเชื่อม", "fillet"],
  "handyman/screw": ["พุก", "สกรู", "ทีวี"],
  "handyman/stair": ["บันได", "ลูกตั้ง", "ลูกนอน"],
};

const SCORE = { nameStart: 120, name: 100, keyword: 70, trade: 45, blurb: 30, field: 10 } as const;

type ToolEntry = {
  trade: Trade;
  tool: ToolDef;
  order: number;
  name: string;
  keywords: string[];
  tradeTerms: string[];
  blurb: string;
  fieldText: string;
};

/**
 * ภาษาไทยไม่เว้นวรรคระหว่างคำ การหาแบบ "มีอยู่ในข้อความ" จึงเจอคำหลอก เช่น "สี" ใน "เสียง"
 * ถ้าตัวหน้าคำที่เจอเป็นสระนำ (เ แ โ ใ ไ) แปลว่าพยัญชนะตัวแรกเป็นของพยางค์อื่น ไม่นับ
 */
export function containsTerm(text: string, term: string): boolean {
  if (!term) return false;
  let from = 0;
  for (;;) {
    const at = text.indexOf(term, from);
    if (at < 0) return false;
    const before = at > 0 ? text[at - 1] : "";
    if (!before || !LEADING_VOWELS.includes(before) || LEADING_VOWELS.includes(term[0])) return true;
    from = at + 1;
  }
}

function startsWithTerm(text: string, term: string): boolean {
  return text.startsWith(term) || text.split(/[\s+/·→-]+/).some((word) => word.startsWith(term));
}

function expand(token: string): string[] {
  const out = new Set<string>([token]);
  for (const group of SYNONYM_GROUPS) {
    if (group.includes(token)) for (const term of group) out.add(term);
  }
  return [...out];
}

let toolIndex: ToolEntry[] | null = null;
let tradeIndex: Array<{ trade: Trade; name: string; terms: string[]; blurb: string }> | null = null;

function buildIndex() {
  if (toolIndex && tradeIndex) return { tools: toolIndex, trades: tradeIndex };
  let order = 0;
  const tools: ToolEntry[] = [];
  const trades: NonNullable<typeof tradeIndex> = [];
  for (const trade of TRADES) {
    const tradeTerms = [
      trade.name,
      trade.short,
      ...(TRADE_ALIASES[trade.id] ?? []),
      ...(CATALOG_TRADE_ALIASES[trade.id] ?? []),
    ].map(normalizeSearchText);
    trades.push({ trade, name: normalizeSearchText(trade.name), terms: tradeTerms, blurb: normalizeSearchText(trade.blurb) });
    for (const tool of trade.tools) {
      const fieldBits: string[] = [];
      for (const field of tool.fields) {
        fieldBits.push(field.label);
        if (field.type === "number" && field.unit) fieldBits.push(field.unit);
        if (field.type === "select") for (const o of field.options) fieldBits.push(o.label);
      }
      tools.push({
        trade,
        tool,
        order: order++,
        name: normalizeSearchText(tool.name),
        keywords: [
          ...(tool.keywords ?? []),
          ...(TOOL_ALIASES[`${trade.id}/${tool.id}`] ?? []),
          ...(CATALOG_TOOL_ALIASES[`${trade.id}/${tool.id}`] ?? []),
        ].map(normalizeSearchText),
        tradeTerms,
        blurb: normalizeSearchText(tool.blurb),
        fieldText: normalizeSearchText(fieldBits.join(" ")),
      });
    }
  }
  toolIndex = tools;
  tradeIndex = trades;
  return { tools, trades };
}

function scoreTool(entry: ToolEntry, terms: string[]): number {
  let best = 0;
  for (const term of terms) {
    let s = 0;
    if (containsTerm(entry.name, term)) s += startsWithTerm(entry.name, term) ? SCORE.nameStart : SCORE.name;
    if (entry.keywords.some((k) => containsTerm(k, term))) s += SCORE.keyword;
    if (entry.tradeTerms.some((t) => (t === term ? true : term.length >= 2 && containsTerm(t, term)))) s += SCORE.trade;
    if (containsTerm(entry.blurb, term)) s += SCORE.blurb;
    if (s === 0 && term.length >= 2 && containsTerm(entry.fieldText, term)) s += SCORE.field;
    if (s > best) best = s;
  }
  return best;
}

export function searchTools(query: string): SearchResult {
  const tokens = tokenize(query);
  if (tokens.length === 0) return { trades: TRADES, tools: [] };
  const index = buildIndex();
  const expanded = tokens.map(expand);

  const scored: Array<{ entry: ToolEntry; score: number }> = [];
  for (const entry of index.tools) {
    let total = 0;
    let all = true;
    for (const terms of expanded) {
      const s = scoreTool(entry, terms);
      if (s === 0) {
        all = false;
        break;
      }
      total += s;
    }
    if (all) scored.push({ entry, score: total });
  }
  scored.sort((a, b) => b.score - a.score || a.entry.order - b.entry.order);

  const trades = index.trades
    .filter((t) =>
      expanded.every((terms) =>
        terms.some((term) => t.terms.some((x) => containsTerm(x, term)) || containsTerm(t.blurb, term)),
      ),
    )
    .map((t) => t.trade);

  return {
    trades,
    tools: scored.map(({ entry }) => ({
      tradeId: entry.trade.id,
      tradeName: entry.trade.name,
      id: entry.tool.id,
      name: entry.tool.name,
      blurb: entry.tool.blurb,
    })),
  };
}

/**
 * ข้อความนี้ตรงกับคำค้นไหม — กติกาเดียวกับ searchTools (ทุกคำต้องเจอ, คำพ้อง, ไม่สนวรรณยุกต์)
 * ใช้กับของที่ไม่อยู่ในดัชนีเครื่องมือ เช่น ชื่อ "คิดทั้งงาน" ของแต่ละสายงาน
 */
export function textMatchesQuery(text: string, query: string): boolean {
  const tokens = tokenize(query);
  if (tokens.length === 0) return false;
  const hay = normalizeSearchText(text);
  return tokens.every((token) => expand(token).some((term) => containsTerm(hay, term)));
}
