import type { LucideIcon } from "lucide-react";
import {
  Snowflake,
  AppWindow,
  Droplets,
  Hammer,
  Home,
  Layers,
  LayoutGrid,
  Paintbrush,
  PanelTop,
  Ruler,
  Box,
  Wrench,
  Zap,
} from "lucide-react";
import type { Pillar, Trade } from "./types";
import { ceilingJob, ceilingTools } from "./tools/ceiling";
import { electricalJob, electricalTools } from "./tools/electrical";
import { generalJob, generalTools } from "./tools/general";
import { glassJob, glassTools } from "./tools/glass";
import { handymanJob, handymanTools } from "./tools/handyman";
import { hvacJob, hvacTools } from "./tools/hvac";
import { masonryJob, masonryTools } from "./tools/masonry";
import { paintJob, paintTools } from "./tools/paint";
import { plumbingJob, plumbingTools } from "./tools/plumbing";
import { roofJob, roofTools } from "./tools/roof";
import { steelJob, steelTools } from "./tools/steel";
import { tileJob, tileTools } from "./tools/tile";
import { vinylJob, vinylTools } from "./tools/vinyl";

export const PILLARS: Pillar[] = [
  { id: "mep", name: "งานระบบ", blurb: "แอร์ ไฟ ประปา" },
  { id: "finish", name: "งานตกแต่ง", blurb: "บิ้วอิน กระเบื้อง ฝ้า กระจก" },
  { id: "shell", name: "งานโครงสร้าง", blurb: "ก่ออิฐ หลังคา เหล็ก สี" },
  { id: "general", name: "เครื่องมือทั่วไป", blurb: "แปลงหน่วย รูปทรง" },
];

export const TRADE_ICONS: Record<string, LucideIcon> = {
  hvac: Snowflake,
  electrical: Zap,
  plumbing: Droplets,
  handyman: Hammer,
  tile: LayoutGrid,
  vinyl: Layers,
  ceiling: PanelTop,
  glass: AppWindow,
  masonry: Box,
  roof: Home,
  steel: Wrench,
  paint: Paintbrush,
  general: Ruler,
};

/**
 * ภาพปกการ์ดสายงาน (ไฟล์อยู่ public/assistant/covers)
 * สายงานที่ยังไม่มีปกจะไม่พัง — การ์ดจะใช้พื้นสีกับไอคอนแทน
 */
export const TRADE_COVERS: Record<string, string> = {
  hvac: "/assistant/covers/hvac.webp",
  electrical: "/assistant/covers/electrical.webp",
  plumbing: "/assistant/covers/plumbing.webp",
  handyman: "/assistant/covers/handyman.webp",
  tile: "/assistant/covers/tile.webp",
  vinyl: "/assistant/covers/vinyl.webp",
  ceiling: "/assistant/covers/ceiling.webp",
  glass: "/assistant/covers/glass.webp",
  masonry: "/assistant/covers/masonry.webp",
  roof: "/assistant/covers/roof.webp",
  steel: "/assistant/covers/steel.webp",
  paint: "/assistant/covers/paint.webp",
  general: "/assistant/covers/general.webp",
};

export const TRADES: Trade[] = [
  {
    id: "hvac",
    name: "ช่างแอร์",
    short: "แอร์",
    pillarId: "mep",
    blurb: "BTU ท่อทองแดง น้ำยา เบรกเกอร์ ค่าไฟ",
    tools: hvacTools,
    job: hvacJob,
  },
  {
    id: "electrical",
    name: "ช่างไฟและโซลาร์",
    short: "ไฟ",
    pillarId: "mep",
    blurb: "สายไฟ แรงดันตก โซลาร์ แบต",
    tools: electricalTools,
    job: electricalJob,
  },
  {
    id: "plumbing",
    name: "ช่างประปา",
    short: "ประปา",
    pillarId: "mep",
    blurb: "ถัง ปั๊ม ท่อ ความลาด ของสิ้นเปลือง",
    tools: plumbingTools,
    job: plumbingJob,
  },
  {
    id: "handyman",
    name: "ช่างติดตั้งและบิ้วอิน",
    short: "บิ้วอิน",
    pillarId: "finish",
    blurb: "บานพับ ราง ลามิเนต ไฟเส้น บันได",
    tools: handymanTools,
    job: handymanJob,
  },
  {
    id: "tile",
    name: "ช่างปูกระเบื้อง",
    short: "กระเบื้อง",
    pillarId: "finish",
    blurb: "แผ่น ยาแนว ปูนกาว บัวเชิงผนัง",
    tools: tileTools,
    job: tileJob,
  },
  {
    id: "vinyl",
    name: "ช่างพื้นกระเบื้องยาง",
    short: "กระเบื้องยาง",
    pillarId: "finish",
    blurb: "กล่อง ปรับระดับ บัว ระยะขยาย",
    tools: vinylTools,
    job: vinylJob,
  },
  {
    id: "ceiling",
    name: "ช่างฝ้าและกันเสียง",
    short: "ฝ้า",
    pillarId: "finish",
    blurb: "ยิปซัม ทีบาร์ ฉนวน RT60",
    tools: ceilingTools,
    job: ceilingJob,
  },
  {
    id: "glass",
    name: "ช่างกระจกและอลูมิเนียม",
    short: "กระจก",
    pillarId: "finish",
    blurb: "ตัดเฟรม น้ำหนัก ซิลิโคน เจาะ",
    tools: glassTools,
    job: glassJob,
  },
  {
    id: "masonry",
    name: "ช่างก่ออิฐฉาบปูน",
    short: "ก่อฉาบ",
    pillarId: "shell",
    blurb: "อิฐ ปูนก่อ ปูนฉาบ ทับหลัง",
    tools: masonryTools,
    job: masonryJob,
  },
  {
    id: "roof",
    name: "ช่างหลังคาและรางน้ำ",
    short: "หลังคา",
    pillarId: "shell",
    blurb: "พื้นที่จริง แผ่น ราง สัน สกรู",
    tools: roofTools,
    job: roofJob,
  },
  {
    id: "steel",
    name: "ช่างเหล็กและงานเชื่อม",
    short: "เหล็ก",
    pillarId: "shell",
    blurb: "น้ำหนัก ลวดเชื่อม แผนตัด โก่ง",
    tools: steelTools,
    job: steelJob,
  },
  {
    id: "paint",
    name: "ช่างผนังและงานสี",
    short: "สี",
    pillarId: "shell",
    blurb: "พื้นที่สุทธิ สี สกิมโค้ท วอลเปเปอร์",
    tools: paintTools,
    job: paintJob,
  },
  {
    id: "general",
    name: "เครื่องมือทั่วไป",
    short: "ทั่วไป",
    pillarId: "general",
    blurb: "แปลงหน่วย รูปทรง พีทาโกรัส",
    tools: generalTools,
    job: generalJob,
  },
];

/**
 * ภาพปกการ์ดเครื่องมือย่อย (ไฟล์อยู่ public/assistant/tools)
 * คีย์เป็น "tradeId/toolId" — สร้างจากทะเบียนสายงานอัตโนมัติ ไม่ต้องไล่ใส่ทีละอัน
 */
export const TOOL_COVERS: Record<string, string> = Object.fromEntries(
  TRADES.flatMap((t) =>
    t.tools.map((tool) => [`${t.id}/${tool.id}`, `/assistant/tools/${t.id}-${tool.id}.webp`]),
  ),
);

export function getToolCover(tradeId: string, toolId: string): string | undefined {
  return TOOL_COVERS[`${tradeId}/${toolId}`];
}

export function getTrade(id: string): Trade | undefined {
  return TRADES.find((t) => t.id === id);
}

export function getTool(tradeId: string, toolId: string) {
  const trade = getTrade(tradeId);
  const tool = trade?.tools.find((t) => t.id === toolId);
  return trade && tool ? { trade, tool } : undefined;
}

export function toolPath(tradeId: string, toolId: string): string {
  return `${tradeId}/${toolId}`;
}

export function parseToolPath(path: string): { tradeId: string; toolId: string } | undefined {
  const [tradeId, toolId] = path.split("/");
  if (!tradeId || !toolId) return undefined;
  return { tradeId, toolId };
}

export function searchCatalog(q: string) {
  const s = q.trim().toLowerCase();
  if (!s)
    return {
      trades: TRADES,
      tools: [] as Array<{ tradeId: string; tradeName: string; id: string; name: string; blurb: string }>,
    };
  const trades = TRADES.filter(
    (t) =>
      t.name.toLowerCase().includes(s) ||
      t.short.toLowerCase().includes(s) ||
      t.blurb.toLowerCase().includes(s) ||
      (TRADE_ALIASES[t.id] ?? []).some((a) => a.includes(s)),
  );
  const tools = TRADES.flatMap((t) =>
    t.tools
      .filter(
        (tool) =>
          tool.name.toLowerCase().includes(s) ||
          tool.blurb.toLowerCase().includes(s) ||
          (tool.keywords ?? []).some((k) => k.toLowerCase().includes(s)) ||
          (TOOL_ALIASES[`${t.id}/${tool.id}`] ?? []).some((a) => a.includes(s)),
      )
      .map((tool) => ({ tradeId: t.id, tradeName: t.name, id: tool.id, name: tool.name, blurb: tool.blurb })),
  );
  return { trades, tools };
}

const TRADE_ALIASES: Record<string, string[]> = {
  hvac: ["แอร์", "เครื่องปรับอากาศ", "น้ำยา", "btu"],
  electrical: ["สายไฟ", "เบรกเกอร์", "แรงดันตก", "โซลาร์", "ไฟ"],
  plumbing: ["ประปา", "ท่อ", "ปั๊ม", "ถังน้ำ"],
  masonry: ["ก่อ", "อิฐ", "ฉาบ", "ทับหลัง", "เสาเอ็น", "ปูน"],
  steel: ["เหล็ก", "เชื่อม", "h-beam", "ลวดเชื่อม"],
  roof: ["หลังคา", "เมทัลชีท", "กระเบื้องลอน"],
  tile: ["กระเบื้อง", "ยาแนว", "ปูนกาว"],
  glass: ["กระจก", "อลูมิเนียม", "ซิลิโคน"],
  handyman: ["บิ้วอิน", "พุก", "บันได", "ลามิเนต", "ไม้อัด"],
  // คำช่างที่ชื่อสายงานไม่มี (รอบ 2): สะกดแบบที่ช่างพิมพ์จริง รวมตัวสะกดเพี้ยนที่เจอบ่อย
  ceiling: ["ฝ้า", "ยิปซัม", "ยิปซั่ม", "ทีบาร์", "ซีลาย", "c-line", "โครงคร่าว", "โครงเคร่า"],
  vinyl: ["กระเบื้องยาง", "spc", "lvt", "พื้นไม้", "ลามิเนตปูพื้น"],
  paint: ["ทาสี", "สกิมโค้ท", "โป๊ว", "วอลเปเปอร์"],
};

const TOOL_ALIASES: Record<string, string[]> = {
  "hvac/btu": ["ขนาดแอร์", "ตันความเย็น"],
  "hvac/shsc": ["superheat", "subcooling", "sh", "sc", "ความร้อนเกิน", "ความเย็นเกิน"],
  "electrical/cable": ["thw", "เลือกสาย", "วสท"],
  "electrical/vdrop": ["voltage drop", "แรงดันตก"],
  "masonry/lintel": ["ทับหลัง", "เสาเอ็น", "rb6"],
  "plumbing/pipe": ["pvc", "ขนาดท่อ"],
  "steel/weld": ["ลวดเชื่อม", "fillet"],
  "handyman/screw": ["พุก", "สกรู", "ทีวี"],
  "handyman/stair": ["บันได", "ลูกตั้ง", "ลูกนอน"],
  // รอบ 2: คำช่างที่ค้นแล้วไม่เจอ ชี้ไปเครื่องมือที่ใกล้ที่สุด
  "paint/skim": ["สกิมโค้ท", "สกิม", "โป๊ว", "โป้ว", "ฉาบบาง"],
  "masonry/plaster": ["สกิมโค้ท", "ฉาบบาง"],
  "ceiling/gypsum": ["ยิปซั่ม", "ซีลาย", "c-line", "cline", "โครงคร่าว", "โครงเคร่า"],
  "ceiling/tbar": ["โครงคร่าว", "โครงเคร่า", "t-bar", "tbar"],
  "ceiling/hardware": ["ยิปซั่ม", "โป๊วรอยต่อ"],
  "vinyl/qty": ["พื้นไม้", "ไม้ลามิเนต", "spc", "lvt"],
  "tile/grout": ["อีพ็อกซี่", "อีพอกซี", "epoxy"],
  "handyman/laminate": ["ไม้อัด", "แผ่น 4x8"],
  "glass/sealant": ["กันซึม", "กันรั่ว", "ซีลแลนท์"],
  "general/unit-length": ["หุน", "ฟุต-นิ้ว"],
  "hvac/pipe": ["หุน", "ท่อแอร์"],
  "general/unit-area-vol": ["คิว", "ลบ.ม."],
  "masonry/mix": ["คิว", "ทราย", "หิน"],
  // รอบ 3: เครื่องมือใหม่งานระบบ + หลังคา
  "electrical/conduit": ["ท่อร้อยสาย", "สายในท่อ", "ท่อ 4 หุน", "ท่อ 6 หุน", "emt", "imc", "ท่อเหลือง"],
  "plumbing/homepump": ["ปั๊มบ้าน", "ปั๊มอัตโนมัติ", "ปั๊มกี่วัตต์", "วัตต์ปั๊ม"],
  "plumbing/ptank": ["ถังแรงดัน", "ถังลม", "pressure tank", "สวิตช์แรงดัน", "ปั๊มติดถี่"],
  "plumbing/fittings": ["ข้อต่อ", "ข้องอ", "สามทาง", "จุดน้ำ", "บอลวาล์ว", "สต็อปวาล์ว", "ใบสั่งของประปา"],
  "hvac/kit": ["ใบสั่งของแอร์", "ชุดติดตั้ง", "ติดตั้งแอร์", "รางครอบ", "vct", "ฉนวน", "ขาแขวน", "ท่อน้ำทิ้งแอร์"],
  "roof/metal-kit": ["แป", "เมทัลชีท", "สั่งตัด", "ปั้นลม", "ครอบข้าง", "ครอบสัน"],
};

export function toolCount(): number {
  return TRADES.reduce((n, t) => n + t.tools.length, 0);
}

export type AssistantHref = { href: string; title: string; blurb?: string };

/** รายการหน้าผู้ช่วยงานช่างทั้งหมด ใช้ใน sitemap.xml */
export function assistantPages(): AssistantHref[] {
  const pages: AssistantHref[] = [
    { href: "/assistant", title: "ผู้ช่วยงานช่าง", blurb: "เลือกสายงานและเครื่องมือ" },
    { href: "/assistant/map", title: "แผนผังเครื่องมือ", blurb: "ดูครบทุกสายงาน" },
    { href: "/assistant/tables", title: "ตารางอ้างอิง", blurb: "สายไฟ ท่อ PVC ตาราง P–T" },
  ];
  for (const trade of TRADES) {
    pages.push({ href: `/assistant/${trade.id}`, title: trade.name, blurb: trade.blurb });
    if (trade.job) {
      pages.push({
        href: `/assistant/${trade.id}/job`,
        title: trade.job.name,
        blurb: trade.job.blurb,
      });
    }
    for (const tool of trade.tools) {
      pages.push({
        href: `/assistant/${trade.id}/${tool.id}`,
        title: tool.name,
        blurb: tool.blurb,
      });
    }
  }
  return pages;
}
