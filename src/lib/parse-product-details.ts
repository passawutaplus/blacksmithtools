import type { Product } from "./types";
import { catalogKind, getProductCopy } from "./product-copy";
import {
  BadgeCheck,
  Box,
  Factory,
  FileText,
  Hammer,
  Info,
  ListChecks,
  Package,
  Ruler,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type DetailSectionId =
  | "overview"
  | "specs"
  | "highlights"
  | "model"
  | "material"
  | "brand"
  | "suitable"
  | "contents"
  | "usage"
  | "maker"
  | "caution"
  | "other"
  | "claim";

export type DetailSection = {
  id: DetailSectionId;
  title: string;
  icon: LucideIcon;
  body?: string;
  items?: string[];
  specs?: { label: string; value: string }[];
  ordered?: boolean;
};

const SKIP_LINE_RE =
  /^(BlackSmith|BLACKSMITH|Blacksmith Tools|จัดจำหน่ายโดย|จำหน่าย|-{5,}|\.{1,}|https?:\/\/|http:\/\/|ขอบคุณลูกค้า|หากสินค้ามีปัญหา|Tools Designed|สินค้าและอุปกรณ์ทั้งหมด)/i;

const TITLE_NOISE_RE = /BlackSmith-?แบรนด์คนไทย|แบรนด์คนไทย|By Blacksmith|3D Print Design/gi;

const SECTION_ORDER: DetailSectionId[] = [
  "overview",
  "specs",
  "highlights",
  "model",
  "material",
  "brand",
  "suitable",
  "contents",
  "usage",
  "maker",
  "caution",
  "other",
  "claim",
];

const ICONS: Record<DetailSectionId, LucideIcon> = {
  overview: Info,
  specs: Ruler,
  highlights: BadgeCheck,
  model: Tag,
  material: Package,
  brand: Wrench,
  suitable: Hammer,
  contents: Box,
  usage: ListChecks,
  maker: Factory,
  caution: ShieldAlert,
  other: FileText,
  claim: ShieldCheck,
};

const TITLES: Record<DetailSectionId, string> = {
  overview: "ใช้ทำอะไร",
  specs: "สเปก",
  highlights: "จุดเด่น",
  model: "ข้อมูลเฉพาะรุ่น",
  material: "วัสดุและการผลิต",
  brand: "ใช้กับแบรนด์",
  suitable: "เหมาะกับงาน",
  contents: "ในกล่อง",
  usage: "วิธีใช้",
  maker: "ผลิตโดย",
  caution: "ข้อควรระวัง",
  other: "รายละเอียดเพิ่ม",
  claim: "หากสินค้ามีปัญหา",
};

type HeadingHit = { id: DetailSectionId; title: string };

function stripDecor(raw: string) {
  return raw
    .replace(/^[📌📍🧡🔨⚠️🌟🔧💪✅🧲*\s\-–—]+/u, "")
    .replace(/[📌📍🧡🔨⚠️🌟🔧💪🇹🇭✅🧲*\s\-–—]+$/u, "")
    .replace(/[:：]\s*$/u, "")
    .trim();
}

function cleanDetailText(raw: string) {
  let text = raw
    .replace(/^[📌📍🧡🔨⚠️🌟🔧💪✅🧲•*\-–—]+\s*/u, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  text = text
    .replace(/3D Printng/gi, "3D Printing")
    .replace(/รบกวนเช็ดขนาด/g, "รบกวนเช็กขนาด")
    .replace(/พิจรณา/g, "พิจารณา")
    .replace(/ขจัดคคราบ/g, "ขจัดคราบ")
    .replace(/\bnช่วย/g, "ช่วย")
    .replace(/ยงาน/g, "งาน")
    .replace(/เกียว/g, "เกลียว")
    .replace(/Maktia/gi, "Makita")
    .replace(/Magentic/gi, "Magnetic")
    .replace(/\s*โดย\s*[:：]?\s*$/u, "");
  if (/^\.+$/.test(text)) return "";
  return text.replace(/^(\d+)[).]\s*/, "").trim();
}

function looksLikeOrdered(line: string) {
  return /^\d+[).]\s+\S/.test(stripDecor(line));
}

function classifyHeading(raw: string): HeadingHit | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const core = stripDecor(trimmed);
  if (!core || core.length > 48) return null;

  const rules: Array<[RegExp, DetailSectionId]> = [
    [/ข้อมูลเฉพาะรุ่น|รายละเอียดสินค้า/, "model"],
    [/ข้อมูลสำคัญทั่วไป/, "material"],
    [/ข้อควรระวัง/, "caution"],
    [/วิธีใช้|วิธีการใช้งาน/, "usage"],
    [/ผลิตโดย/, "maker"],
    [/ข้อมูลบรรจุภัณฑ์|อุปกรณ์ในชุด|แบ่งบรรจุ/, "contents"],
    [/เหมาะสำหรับ|เหมาะกับงาน/, "suitable"],
    [/จุดเด่น|คุณสมบัติเด่น|ความทนทานและการใช้งาน/, "highlights"],
    [/tools brand mount|ใช้กับแบรนด์/, "brand"],
  ];
  for (const [re, id] of rules) {
    if (re.test(core)) return { id, title: TITLES[id] };
  }

  const wrapped = /^[📌📍⚠️🌟🔧💪].+[📌📍⚠️🌟🔧💪]$/u.test(trimmed);
  const hasMark = /^[📌📍⚠️🌟🔧💪]/.test(trimmed) || wrapped;
  const shortTitle = core.length <= 28 && !/[.!?。]$/.test(core);
  if (hasMark && shortTitle && (/[:：]\s*$/.test(trimmed) || wrapped || core.length <= 18) && !/สำหรับ|เพื่อ/.test(core)) {
    return { id: "other", title: core };
  }
  return null;
}

function isSkipLine(line: string) {
  const t = stripDecor(line.trim());
  if (!t) return true;
  if (SKIP_LINE_RE.test(t) || SKIP_LINE_RE.test(line.trim())) return true;
  if (/^htt/i.test(t)) return true;
  return false;
}

function isTitleDump(line: string, productName?: string) {
  const a = stripDecor(line).replace(TITLE_NOISE_RE, "").replace(/\s+/g, " ").trim().toLowerCase();
  if (!a) return true;
  if (productName) {
    const b = productName.replace(TITLE_NOISE_RE, "").replace(/\s+/g, " ").trim().toLowerCase();
    if (a === b) return true;
    if (b.includes(a) && a.length > 24) return true;
    if (a.includes(b) && b.length > 24) return true;
  }
  if (/blacksmith-แบรนด์คนไทย/i.test(line) && a.length > 40) return true;
  return false;
}

type Draft = {
  id: DetailSectionId;
  title: string;
  parts: string[];
  ordered: boolean;
};

function flush(draft: Draft | null, out: DetailSection[]) {
  if (!draft) return;
  const parts = draft.parts.map(cleanDetailText).filter(Boolean);
  if (parts.length === 0) return;
  const asItems = draft.ordered || parts.length > 1;
  out.push({
    id: draft.id,
    title: draft.title,
    icon: ICONS[draft.id],
    ordered: draft.ordered || undefined,
    ...(asItems ? { items: parts } : { body: parts[0] }),
  });
}

export function parseProductDetails(description: string, productName = ""): DetailSection[] {
  const lines = (description || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim());

  const out: DetailSection[] = [];
  let draft: Draft | null = null;
  let skippedTitle = false;

  const startDraft = (id: DetailSectionId, title = TITLES[id]): Draft => {
    flush(draft, out);
    draft = { id, title, parts: [], ordered: id === "usage" };
    return draft;
  };

  for (const line of lines) {
    if (isSkipLine(line)) {
      if (draft && /^-{5,}/.test(line)) {
        flush(draft, out);
        draft = null;
      }
      continue;
    }
    const heading = classifyHeading(line);
    if (heading) {
      skippedTitle = true;
      startDraft(heading.id, heading.title);
      continue;
    }
    if (!skippedTitle && isTitleDump(line, productName)) continue;
    skippedTitle = true;

    const current = draft ?? startDraft("overview");
    if (looksLikeOrdered(line)) current.ordered = true;
    current.parts.push(line);
  }
  flush(draft, out);

  const seen = new Map<string, DetailSection>();
  for (const section of out) {
    const key = `${section.id}:${section.title}`;
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, { ...section });
      continue;
    }
    prev.items = [...(prev.items ?? (prev.body ? [prev.body] : [])), ...(section.items ?? (section.body ? [section.body] : []))];
    prev.body = undefined;
    if (section.ordered) prev.ordered = true;
  }

  const merged = [...seen.values()].sort(
    (a, b) => SECTION_ORDER.indexOf(a.id) - SECTION_ORDER.indexOf(b.id),
  );

  merged.push({
    id: "claim",
    title: TITLES.claim,
    icon: ICONS.claim,
    items: ["ถ่ายรูปส่งทางร้านหรือทัก LINE @black_smith — ร้านจะพิจารณาแก้ไขตามเหมาะสม"],
  });

  return merged;
}

function blobOf(sections: DetailSection[]) {
  return sections
    .flatMap((s) => [s.body ?? "", ...(s.items ?? []), ...(s.specs ?? []).map((r) => r.value)])
    .join(" ")
    .toLowerCase();
}

function makeSection(
  id: DetailSectionId,
  extra: Omit<DetailSection, "id" | "title" | "icon">,
): DetailSection {
  return { id, title: TITLES[id], icon: ICONS[id], ...extra };
}

function inferredModelItems(product: Product): string[] {
  const items: string[] = [];
  const compat = product.compatibilities.filter((c) => c && c !== "อเนกประสงค์");
  if (compat.length > 0) items.push(`ใช้ร่วมกับ ${compat.join(", ")}`);
  const names = [...new Set((product.variants ?? []).map((v) => v.name.trim()).filter(Boolean))];
  if (names.length === 1) items.push(`ตัวเลือก: ${names[0]}`);
  else if (names.length > 1 && names.length <= 8) items.push(`ตัวเลือก: ${names.join(", ")}`);
  else if (names.length > 8) items.push(`มี ${names.length} ตัวเลือก ตามแบรนด์/จำนวนที่เลือก`);
  return items;
}

/** Short shop-card / SEO line from the overview heading, not the raw Shopee dump. */
export function getProductBlurb(product: Product, max = 150): string {
  const overview = parseProductDetails(product.description, product.nameTh).find((s) => s.id === "overview");
  let text = (overview?.body ?? (overview?.items ?? []).join(" ") ?? "").replace(/\s+/g, " ").trim();
  if (!text || text === product.nameTh) text = getProductCopy(product).hook;
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

/** Parse listing copy, then fill the same heading pattern when a listing left a section out. */
export function getProductDetailSections(product: Product): DetailSection[] {
  const sections = parseProductDetails(product.description, product.nameTh);
  const copy = getProductCopy(product);
  const kind = catalogKind(product);
  const has = (id: DetailSectionId) => sections.some((s) => s.id === id);
  const blob = () => blobOf(sections);

  if (!has("overview") && copy.hook) {
    sections.push(makeSection("overview", { body: copy.hook }));
  }

  if (!has("model") && !has("brand")) {
    const items = inferredModelItems(product);
    if (items.length > 0) sections.push(makeSection("model", { items }));
  }

  if (!has("material") && kind === "print") {
    const material = copy.specs.find((row) => row.label === "วัสดุ")?.value;
    if (material && !/petg|pla|เรซิ่น|resin|fdm/i.test(blob())) {
      sections.push(
        makeSection("material", {
          items: ["สินค้าผลิตด้วยเครื่อง 3D Printing (FDM)", `เส้นพลาสติก ${material}`],
        }),
      );
    }
  }

  if (!has("usage") && copy.howTo.length > 0) {
    sections.push(makeSection("usage", { items: copy.howTo, ordered: true }));
  }

  if (!has("caution") && copy.caution) {
    sections.push(makeSection("caution", { items: [copy.caution] }));
  }

  const specRows = copy.specs.filter((row) => {
    if (row.label === "วัสดุ") return !has("material") && !/petg|pla|เรซิ่น|resin|fdm/i.test(blob());
    if (row.label === "เข้ากับ") return !has("model") && !has("brand");
    return true;
  });
  if (specRows.length > 0) {
    sections.push(makeSection("specs", { specs: specRows }));
  }

  return sections.sort((a, b) => SECTION_ORDER.indexOf(a.id) - SECTION_ORDER.indexOf(b.id));
}
