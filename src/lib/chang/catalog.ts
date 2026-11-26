import type { LucideIcon } from "lucide-react";
import {
  Snowflake,
  AppWindow,
  Axe,
  Droplets,
  Hammer,
  Home,
  Layers,
  LayoutGrid,
  Paintbrush,
  PanelTop,
  Ruler,
  Box,
  ShieldCheck,
  Shovel,
  Trees,
  Truck,
  Wrench,
  Zap,
} from "lucide-react";
import type { Pillar, Trade } from "./types";
import { ceilingJob, ceilingTools } from "./tools/ceiling";
import { concreteJob, concreteTools } from "./tools/concrete";
import { earthTools } from "./tools/earth";
import { electricalJob, electricalTools } from "./tools/electrical";
import { generalJob, generalTools } from "./tools/general";
import { glassJob, glassTools } from "./tools/glass";
import { handymanJob, handymanTools } from "./tools/handyman";
import { hvacJob, hvacTools } from "./tools/hvac";
import { landscapeTools } from "./tools/landscape";
import { masonryJob, masonryTools } from "./tools/masonry";
import { paintJob, paintTools } from "./tools/paint";
import { plumbingJob, plumbingTools } from "./tools/plumbing";
import { roofJob, roofTools } from "./tools/roof";
import { steelJob, steelTools } from "./tools/steel";
import { tileJob, tileTools } from "./tools/tile";
import { vinylJob, vinylTools } from "./tools/vinyl";
import { waterproofJob, waterproofTools } from "./tools/waterproof";
import { woodTools } from "./tools/wood";

export const PILLARS: Pillar[] = [
  { id: "mep", name: "งานระบบ", blurb: "แอร์ ไฟ ประปา" },
  { id: "finish", name: "งานตกแต่ง", blurb: "บิ้วอิน กระเบื้อง ฝ้า กระจก" },
  { id: "shell", name: "งานโครงสร้าง", blurb: "ก่ออิฐ คอนกรีต หลังคา เหล็ก สี กันซึม" },
  { id: "outdoor", name: "งานภายนอกและที่ดิน", blurb: "ถมดิน สวน พื้นภายนอก" },
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
  wood: Axe,
  masonry: Box,
  concrete: Truck,
  roof: Home,
  steel: Wrench,
  paint: Paintbrush,
  waterproof: ShieldCheck,
  earth: Shovel,
  landscape: Trees,
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
    id: "wood",
    name: "ช่างไม้และพื้นไม้",
    short: "ไม้",
    pillarId: "finish",
    blurb: "ลูกบาศก์ฟุต ระแนง ไม้ฝา เดค",
    tools: woodTools,
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
    id: "earth",
    name: "ช่างดินและถมที่",
    short: "ดิน",
    pillarId: "outdoor",
    blurb: "ถมดิน ขุดดิน เที่ยวรถ",
    tools: earthTools,
  },
  {
    id: "landscape",
    name: "ช่างสวนและพื้นภายนอก",
    short: "สวน",
    pillarId: "outdoor",
    blurb: "หญ้า บล็อกปูพื้น สปริงเกอร์ น้ำฝน",
    tools: landscapeTools,
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
  // รอบ 4: สายงานใหม่ ยังไม่มีภาพปก
  "wood/timber",
  "wood/cladding",
  "wood/deck",
  "earth/fill",
  "earth/dig",
  "landscape/sod",
  "landscape/paver",
  "landscape/sprinkler",
  "landscape/rain",
  // รอบ 4: เครื่องมือใหม่ในสายงานเดิม
  "electrical/appliance",
  "electrical/lux",
  "electrical/heater",
  "electrical/ev",
  "hvac/fan",
  "plumbing/tankload",
  "concrete/members",
  "concrete/formwork",
  "waterproof/sheet",
  "glass/film",
  "general/slope",
  "general/rai",
  "general/tank",
  "general/unitprice",
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
  wood: ["ไม้", "ช่างไม้", "ไม้แปรรูป", "ระแนง", "ไม้ฝา", "wpc", "ไม้เทียม", "เดค", "deck"],
  earth: ["ดิน", "ถมดิน", "ถมที่", "ขุดดิน", "ดินถม", "ลูกรัง", "รถดิน", "รถ 10 ล้อ"],
  landscape: ["สวน", "จัดสวน", "หญ้า", "ตัวหนอน", "บล็อกปูพื้น", "สปริงเกอร์", "น้ำฝน", "พื้นภายนอก"],
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
  // รอบ 4: ไม้ ดิน สวน
  "wood/timber": ["ลูกบาศก์ฟุต", "ลบ.ฟ.", "คิวไม้", "ราคาไม้", "ไม้แปรรูป", "ไม้ 2x4", "ไม้หน้าสาม", "board foot"],
  "wood/cladding": ["ระแนง", "ไม้ฝา", "wpc", "ไม้เทียม", "ไม้ฝาซ้อนเกล็ด", "รั้วระแนง", "ไม้ฝาเฌอร่า", "โครงเคร่า"],
  "wood/deck": ["เดค", "deck", "พื้นระเบียง", "พื้นไม้ภายนอก", "ตง", "คลิปซ่อน", "ไม้พื้น wpc"],
  "earth/fill": ["ถมดิน", "ถมที่", "ดินถม", "ลูกรัง", "ทรายถม", "กี่คิว", "กี่เที่ยว", "รถ 6 ล้อ", "รถ 10 ล้อ", "ดินยุบ", "ไร่"],
  "earth/dig": ["ขุดดิน", "ขนดินทิ้ง", "ขุดร่อง", "ขุดหลุม", "ดินพองตัว", "ขุดบ่อ"],
  "landscape/sod": ["หญ้า", "หญ้าแผ่น", "ปูหญ้า", "หญ้านวลน้อย", "หญ้ามาเลเซีย", "สนามหญ้า"],
  "landscape/paver": ["ตัวหนอน", "อิฐตัวหนอน", "บล็อกปูพื้น", "คันหิน", "บล็อกขอบ", "แผ่นทางเท้า", "ลานจอดรถ"],
  "landscape/sprinkler": ["สปริงเกอร์", "sprinkler", "รดน้ำ", "หัวพ่นน้ำ", "ระบบรดน้ำ"],
  "landscape/rain": ["น้ำฝน", "เก็บน้ำฝน", "ถังเก็บน้ำฝน", "rainwater"],
  "concrete/rebar": ["เหล็กเส้น", "ปลอก", "เหล็กปลอก", "ลวดผูก", "ข้ออ้อย", "db12", "rb6", "คานคอดิน", "ทาบเหล็ก"],

  // รอบ 4: เครื่องมือใหม่ในสายงานเดิม
  "electrical/appliance": ["ค่าไฟ", "ค่าไฟบ้าน", "หน่วยไฟ", "กินไฟ", "kwh", "บิลไฟ", "ค่าไฟตู้เย็น", "ค่าไฟพัดลม"],
  "electrical/lux": ["lux", "ลักซ์", "ความสว่าง", "ลูเมน", "lumen", "ดาวน์ไลท์", "กี่ดวง", "ผังโคม", "ไฟเพดาน"],
  "electrical/heater": ["เครื่องทำน้ำอุ่น", "น้ำอุ่น", "ฮีตเตอร์", "heater", "กี่วัตต์", "3500 วัตต์", "4500 วัตต์"],
  "electrical/ev": ["ev", "รถไฟฟ้า", "ชาร์จรถ", "ค่าชาร์จ", "wallbox", "วอลล์ชาร์จ", "ชาร์จกี่ชั่วโมง"],
  "hvac/fan": ["พัดลมระบายอากาศ", "พัดลมดูดอากาศ", "ดูดอากาศ", "ระบายอากาศ", "cfm", "ach", "ห้องน้ำอับ", "ครัวควัน"],
  "plumbing/tankload": ["แท่นถังน้ำ", "ขาตั้งถัง", "หอถังน้ำ", "ถังบนดาดฟ้า", "น้ำหนักถังน้ำ", "ถังหนักกี่กิโล"],
  "concrete/members": ["เสา", "คาน", "ฐานราก", "ฐานแผ่", "ตอม่อ", "เทเสา", "เทคาน", "คิว", "ปริมาตรคอนกรีต"],
  "concrete/formwork": ["ไม้แบบ", "ไม้อัด", "แบบหล่อ", "ไม้เคร่า", "ตั้งแบบ", "ไม้อัดยาง", "แผ่น 4x8"],
  "waterproof/sheet": ["แผ่นกันซึม", "เมมเบรน", "membrane", "บิทูเมน", "ลนไฟ", "torch on", "ม้วนกันซึม", "ไพรเมอร์"],
  "glass/film": ["ฟิล์ม", "ฟิล์มกรองแสง", "ฟิล์มอาคาร", "ติดฟิล์ม", "ฟิล์มกันร้อน", "ฟิล์มบ้าน"],
  "general/slope": ["ความชัน", "ความลาด", "องศา", "เปอร์เซ็นต์", "1:12", "ทางลาด", "slope", "ลาดเอียง"],
  "general/rai": ["ไร่", "งาน", "ตารางวา", "ตร.วา", "ที่ดิน", "โฉนด", "ราคาที่ดิน", "ไร่งานวา"],
  "general/tank": ["ลิตร", "ถังนอน", "ถังน้ำมัน", "ระดับน้ำ", "ทรงกระบอก", "ความจุถัง", "ถังกี่ลิตร"],
  "general/unitprice": ["เทียบราคา", "ราคาต่อหน่วย", "คุ้มกว่า", "ถูกกว่า", "ถังเล็กถังใหญ่", "บาทต่อลิตร"],
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
