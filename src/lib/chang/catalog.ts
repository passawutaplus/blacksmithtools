import type { LucideIcon } from "lucide-react";
import {
  Snowflake,
  AppWindow,
  Blinds,
  Cctv,
  Droplets,
  Hammer,
  Home,
  Layers,
  LayoutGrid,
  Paintbrush,
  PanelTop,
  ReceiptText,
  Ruler,
  Box,
  ShieldCheck,
  Truck,
  Wrench,
  Zap,
} from "lucide-react";
import type { Pillar, Trade } from "./types";
import { ceilingJob, ceilingTools } from "./tools/ceiling";
import { concreteJob, concreteTools } from "./tools/concrete";
import { curtainTools } from "./tools/curtain";
import { electricalJob, electricalTools } from "./tools/electrical";
import { estimateTools } from "./tools/estimate";
import { generalJob, generalTools } from "./tools/general";
import { glassJob, glassTools } from "./tools/glass";
import { handymanJob, handymanTools } from "./tools/handyman";
import { hvacJob, hvacTools } from "./tools/hvac";
import { lowvoltTools } from "./tools/lowvolt";
import { masonryJob, masonryTools } from "./tools/masonry";
import { paintJob, paintTools } from "./tools/paint";
import { plumbingJob, plumbingTools } from "./tools/plumbing";
import { roofJob, roofTools } from "./tools/roof";
import { steelJob, steelTools } from "./tools/steel";
import { tileJob, tileTools } from "./tools/tile";
import { vinylJob, vinylTools } from "./tools/vinyl";
import { waterproofJob, waterproofTools } from "./tools/waterproof";

export const PILLARS: Pillar[] = [
  { id: "mep", name: "งานระบบ", blurb: "แอร์ ไฟ ประปา" },
  { id: "finish", name: "งานตกแต่ง", blurb: "บิ้วอิน กระเบื้อง ฝ้า กระจก" },
  { id: "shell", name: "งานโครงสร้าง", blurb: "ก่ออิฐ คอนกรีต หลังคา เหล็ก สี กันซึม" },
  { id: "general", name: "เครื่องมือทั่วไป", blurb: "แปลงหน่วย รูปทรง" },
];

export const TRADE_ICONS: Record<string, LucideIcon> = {
  hvac: Snowflake,
  electrical: Zap,
  plumbing: Droplets,
  lowvolt: Cctv,
  handyman: Hammer,
  tile: LayoutGrid,
  vinyl: Layers,
  ceiling: PanelTop,
  glass: AppWindow,
  curtain: Blinds,
  masonry: Box,
  concrete: Truck,
  roof: Home,
  steel: Wrench,
  paint: Paintbrush,
  waterproof: ShieldCheck,
  general: Ruler,
  estimate: ReceiptText,
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
    id: "lowvolt",
    name: "ช่างกล้องวงจรปิดและเน็ต",
    short: "กล้อง/เน็ต",
    pillarId: "mep",
    blurb: "ฮาร์ดดิสก์ PoE สาย LAN มุมกล้อง",
    tools: lowvoltTools,
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
    id: "curtain",
    name: "ช่างผ้าม่าน",
    short: "ผ้าม่าน",
    pillarId: "finish",
    blurb: "ผ้ากี่หลา ความฟู ม่านม้วน มู่ลี่",
    tools: curtainTools,
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
    id: "concrete",
    name: "ช่างคอนกรีต",
    short: "คอนกรีต",
    pillarId: "shell",
    blurb: "เทพื้น รถโม่ ไวร์เมช เหล็กเส้น ปลอก",
    tools: concreteTools,
    job: concreteJob,
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
    id: "waterproof",
    name: "ช่างกันซึม",
    short: "กันซึม",
    pillarId: "shell",
    blurb: "ห้องน้ำ ดาดฟ้า รอยร้าว ตาข่าย ไพรเมอร์",
    tools: waterproofTools,
    job: waterproofJob,
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
  {
    id: "estimate",
    name: "ประมาณราคาและใบเสนอราคา",
    short: "ใบเสนอราคา",
    pillarId: "general",
    blurb: "VAT หัก ณ ที่จ่าย กำไร งวดงาน ค่าแรง",
    tools: estimateTools,
  },
];

/**
 * เครื่องมือที่ยังไม่มีไฟล์ภาพปก — การ์ดจะใช้พื้นสีกับไอคอนสายงานแทน (ไม่ชี้ไปไฟล์ที่ไม่มีจนรูปแตก)
 * ใส่ภาพใน public/assistant/tools แล้วลบออกจากรายการนี้
 */
export const TOOLS_WITHOUT_COVER: string[] = [
  "tile/bathroom",
  "tile/layout",
  "paint/system",
  "waterproof/bathroom",
  "waterproof/roof",
  "waterproof/crack",
  "ceiling/partition",
  "handyman/cabinet",
  "electrical/conduit",
  "plumbing/homepump",
  "plumbing/ptank",
  "plumbing/fittings",
  "hvac/kit",
  "roof/metal-kit",
  "general/inch",
  "general/spacing",
  "steel/railing",
  "concrete/slab",
  "concrete/rebar",
  // รอบ 4: สายงานใหม่ (ยังไม่มีภาพปก)
  "lowvolt/hdd",
  "lowvolt/poe",
  "lowvolt/lan",
  "lowvolt/fov",
  "curtain/fabric",
  "curtain/blind",
  "estimate/quote",
  "estimate/markup",
  "estimate/vat",
  "estimate/instalment",
  "estimate/labour",
];

/**
 * ภาพปกการ์ดเครื่องมือย่อย (ไฟล์อยู่ public/assistant/tools)
 * คีย์เป็น "tradeId/toolId" — สร้างจากทะเบียนสายงานอัตโนมัติ ไม่ต้องไล่ใส่ทีละอัน
 */
export const TOOL_COVERS: Record<string, string> = Object.fromEntries(
  TRADES.flatMap((t) =>
    t.tools
      .filter((tool) => !TOOLS_WITHOUT_COVER.includes(`${t.id}/${tool.id}`))
      .map((tool) => [`${t.id}/${tool.id}`, `/assistant/tools/${t.id}-${tool.id}.webp`]),
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
  concrete: ["คอนกรีต", "เทพื้น", "เทปูน", "รถโม่", "ปูนโม่", "ผสมเสร็จ", "ไวร์เมช", "wire mesh", "เหล็กเส้น", "ปลอก", "คานคอดิน"],
  steel: ["เหล็ก", "เชื่อม", "h-beam", "ลวดเชื่อม"],
  roof: ["หลังคา", "เมทัลชีท", "กระเบื้องลอน"],
  tile: ["กระเบื้อง", "ยาแนว", "ปูนกาว"],
  glass: ["กระจก", "อลูมิเนียม", "ซิลิโคน"],
  handyman: ["บิ้วอิน", "พุก", "บันได", "ลามิเนต", "ไม้อัด"],
  // คำช่างที่ชื่อสายงานไม่มี (รอบ 2): สะกดแบบที่ช่างพิมพ์จริง รวมตัวสะกดเพี้ยนที่เจอบ่อย
  ceiling: ["ฝ้า", "ยิปซัม", "ยิปซั่ม", "ทีบาร์", "ซีลาย", "c-line", "โครงคร่าว", "โครงเคร่า"],
  vinyl: ["กระเบื้องยาง", "spc", "lvt", "พื้นไม้", "ลามิเนตปูพื้น"],
  paint: ["ทาสี", "สกิมโค้ท", "โป๊ว", "วอลเปเปอร์", "รองพื้น", "กันสนิม", "สีน้ำมัน"],
  // รอบ 3: สายงานใหม่
  // รอบ 4: สายงานใหม่
  lowvolt: ["กล้องวงจรปิด", "cctv", "กล้อง", "nvr", "dvr", "สายแลน", "lan", "poe", "เน็ต", "ไวไฟ", "wifi"],
  curtain: ["ผ้าม่าน", "ม่าน", "ม่านม้วน", "มู่ลี่", "ราง", "หลา"],
  estimate: ["ใบเสนอราคา", "เสนอราคา", "ประมาณราคา", "vat", "ภาษี", "หัก ณ ที่จ่าย", "มัดจำ", "งวดงาน", "กำไร", "ค่าแรง"],
  waterproof: ["กันซึม", "กันรั่ว", "ดาดฟ้า", "ดาดฟ้ารั่ว", "ห้องน้ำรั่ว", "รอยร้าว", "ร้าว", "pu", "เมมเบรน", "membrane", "ซีเมนต์กันซึม"],
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
  // รอบ 3: เครื่องมือใหม่งานตกแต่ง
  "tile/bathroom": ["ห้องน้ำ", "ปูห้องน้ำ", "กระเบื้องผนัง", "คิ้วกระเบื้อง"],
  "tile/layout": ["หาศูนย์", "ตั้งศูนย์", "เศษริม", "แบ่งแผ่น", "เริ่มปู"],
  "paint/system": ["รองพื้น", "กันสนิม", "สีน้ำมัน", "กัลวาไนซ์", "ปูนชื้น", "ด่าง", "สีเหล็ก", "สีไม้"],
  "waterproof/bathroom": ["กันซึมห้องน้ำ", "ห้องน้ำรั่ว", "ซีเมนต์กันซึม"],
  "waterproof/roof": ["ดาดฟ้า", "ดาดฟ้ารั่ว", "หลังคาคอนกรีต", "กันซึมดาดฟ้า"],
  "waterproof/crack": ["รอยร้าว", "ร้าว", "ผนังร้าว", "อุดร้าว"],
  "ceiling/partition": ["ผนังเบา", "c-stud", "u-track", "สตัด", "ผนังยิปซัม", "กั้นห้อง"],
  "handyman/cabinet": ["ตู้", "ตู้เสื้อผ้า", "ตู้บิ้วอิน", "ปาร์ติเกิล", "ขอบ pvc"],

  // รอบ 3: เครื่องมือใหม่งานระบบ + หลังคา
  "electrical/conduit": ["ท่อร้อยสาย", "สายในท่อ", "ท่อ 4 หุน", "ท่อ 6 หุน", "emt", "imc", "ท่อเหลือง"],
  "plumbing/homepump": ["ปั๊มบ้าน", "ปั๊มอัตโนมัติ", "ปั๊มกี่วัตต์", "วัตต์ปั๊ม"],
  "plumbing/ptank": ["ถังแรงดัน", "ถังลม", "pressure tank", "สวิตช์แรงดัน", "ปั๊มติดถี่"],
  "plumbing/fittings": ["ข้อต่อ", "ข้องอ", "สามทาง", "จุดน้ำ", "บอลวาล์ว", "สต็อปวาล์ว", "ใบสั่งของประปา"],
  "hvac/kit": ["ใบสั่งของแอร์", "ชุดติดตั้ง", "ติดตั้งแอร์", "รางครอบ", "vct", "ฉนวน", "ขาแขวน", "ท่อน้ำทิ้งแอร์"],
  "roof/metal-kit": ["แป", "เมทัลชีท", "สั่งตัด", "ปั้นลม", "ครอบข้าง", "ครอบสัน"],

  // เครื่องมือใหม่ 2026-11 (โครงสร้าง + ทั่วไป)
  "general/inch": ["หุน", "นิ้ว", "เศษส่วน", "นิ้วครึ่ง", "ฟุต-นิ้ว", "inch", "มม. เป็นนิ้ว"],
  "general/spacing": ["แบ่งระยะ", "แบ่งช่อง", "ระยะเท่า", "ลูกกรง", "ชั้นวาง", "โครงคร่าว", "ระยะห่าง"],
  "steel/railing": ["รั้ว", "ราวกันตก", "ราวระเบียง", "ราวบันได", "ลูกกรง", "กันสาด", "ประตูรั้ว", "เหล็กกล่อง"],
  "steel/weight": ["ราคาเหล็ก", "กก./เส้น", "แป๊บ", "ท่อดำ"],
  "concrete/slab": ["เทพื้น", "ไวร์เมช", "wiremesh", "wire mesh", "รถโม่", "ปูนโม่", "คิว", "ลานจอดรถ"],
  // รอบ 4: สายงานใหม่
  "lowvolt/hdd": ["ฮาร์ดดิสก์", "hdd", "เก็บกี่วัน", "อัดกี่วัน", "nvr", "dvr", "tb"],
  "lowvolt/poe": ["poe", "poe+", "สวิตช์ poe", "งบไฟ", "802.3af", "802.3at", "802.3bt"],
  "lowvolt/lan": ["สายแลน", "สาย lan", "cat6", "cat5e", "rj45", "หัวแลน", "กล่อง 305", "305 เมตร"],
  "lowvolt/fov": ["มุมกล้อง", "เลนส์", "เห็นหน้า", "ระยะกล้อง", "ppm", "fov", "dori"],
  "curtain/fabric": ["ผ้าม่าน", "หลา", "ม่านจีบ", "ม่านตาไก่", "ม่านลอน", "ความฟู", "ตะขอม่าน", "รางม่าน"],
  "curtain/blind": ["ม่านม้วน", "มู่ลี่", "roller blind", "ม่านปรับแสง", "ตร.หลา"],
  "estimate/quote": ["ใบเสนอราคา", "quotation", "เสนอราคา", "vat", "หัก ณ ที่จ่าย"],
  "estimate/markup": ["markup", "margin", "บวกกำไร", "กำไรกี่เปอร์เซ็นต์"],
  "estimate/vat": ["vat", "ถอด vat", "รวม vat", "ภาษีมูลค่าเพิ่ม", "หัก ณ ที่จ่าย", "50 ทวิ", "3%", "7%"],
  "estimate/instalment": ["งวดงาน", "มัดจำ", "แบ่งงวด", "เงินประกันผลงาน", "ค้ำประกันผลงาน"],
  "estimate/labour": ["ค่าแรง", "ค่าช่าง", "ราคาต่อตารางเมตร", "รายวัน", "กี่วันเสร็จ"],
  "concrete/rebar": ["เหล็กเส้น", "ปลอก", "เหล็กปลอก", "ลวดผูก", "ข้ออ้อย", "db12", "rb6", "คานคอดิน", "ทาบเหล็ก"],
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
