import type { Category, Product } from "./types";

export const STOREFRONT_CATEGORY_SLUGS = [
  "battery-mount",
  "power-mount",
  "milwaukee-packout",
  "dewalt-tstak",
  "osuka-box",
  "tool-holder",
  "wall-mount",
  "box-organizer",
  "blower-nozzle",
  "blacksmith-original",
  "hand-cleaner",
  "gooporange",
  "kleanboy",
  "other",
] as const;

export const merchCategories: Category[] = [
  { id: "c-battery", slug: "battery-mount", name: "Battery Mount", nameTh: "Battery Mount" },
  { id: "c-power", slug: "power-mount", name: "Power Mount", nameTh: "Power Mount" },
  { id: "c-packout", slug: "milwaukee-packout", name: "Milwaukee Packout", nameTh: "Milwaukee Packout" },
  { id: "c-tstak", slug: "dewalt-tstak", name: "Dewalt Tstak TS2.0", nameTh: "Dewalt Tstak TS2.0" },
  { id: "c-osuka-box", slug: "osuka-box", name: "OSUKA Box", nameTh: "OSUKA Box" },
  { id: "c-holder", slug: "tool-holder", name: "Tool Holder", nameTh: "ที่เก็บเครื่องมือ / ดอกสว่าน-ไขควง" },
  { id: "c-wall", slug: "wall-mount", name: "Wall Mount", nameTh: "ที่แขวนผนัง" },
  { id: "c-storage", slug: "box-organizer", name: "Box Organizer", nameTh: "ถาด/เพลตกล่อง" },
  { id: "c-blower", slug: "blower-nozzle", name: "Blower", nameTh: "Blower" },
  { id: "c-original", slug: "blacksmith-original", name: "BlackSmith Original", nameTh: "BlackSmith Original" },
  { id: "c-chem", slug: "hand-cleaner", name: "Hand Cleaner", nameTh: "เคมีช่าง / เจลล้างมือ" },
  { id: "c-goop", slug: "gooporange", name: "GoopOrange", nameTh: "GoopOrange" },
  { id: "c-kleanboy", slug: "kleanboy", name: "KleanBoy", nameTh: "KleanBoy" },
  { id: "c-other", slug: "other", name: "Other", nameTh: "สินค้าอื่นๆ" },
];

const MERCH_IDS = new Set(merchCategories.map((c) => c.id));

export function haystack(product: { name: string; nameTh: string; slug: string; compatibilities?: string[] }) {
  return `${product.name} ${product.nameTh} ${product.slug} ${(product.compatibilities ?? []).join(" ")}`.toLowerCase();
}

export function merchIdsForProduct(raw: {
  name: string;
  nameTh: string;
  slug: string;
  brandIds: string[];
  categoryIds: string[];
  compatibilities?: string[];
}): string[] {
  const t = haystack(raw);
  const ids = new Set<string>();

  if (raw.categoryIds.includes("c-battery") || t.includes("battery")) ids.add("c-battery");
  if (t.includes("power tools") && t.includes("holder mount")) ids.add("c-power");
  if (t.includes("packout") || t.includes("pack out")) ids.add("c-packout");
  if (t.includes("tstak") || t.includes("toughsystem") || t.includes("tough system 2")) ids.add("c-tstak");
  if (t.includes("osuka") || raw.brandIds.includes("b-osuka")) ids.add("c-osuka-box");
  if (raw.categoryIds.includes("c-blower") || t.includes("blower") || t.includes("nozzle")) ids.add("c-blower");
  if (t.includes("goop")) ids.add("c-goop");
  if (t.includes("kleen") || t.includes("kleanboy") || t.includes("klean boy")) ids.add("c-kleanboy");
  if (raw.categoryIds.includes("c-chem")) ids.add("c-chem");
  if (raw.categoryIds.includes("c-holder")) ids.add("c-holder");
  if (raw.categoryIds.includes("c-wall")) ids.add("c-wall");
  if (raw.categoryIds.includes("c-storage")) ids.add("c-storage");
  if (
    raw.brandIds.includes("b-blacksmith") &&
    !ids.has("c-goop") &&
    !ids.has("c-kleanboy") &&
    !ids.has("c-chem") &&
    !ids.has("c-battery") &&
    !ids.has("c-power") &&
    !ids.has("c-packout") &&
    !ids.has("c-tstak") &&
    !ids.has("c-osuka-box") &&
    !ids.has("c-blower") &&
    !ids.has("c-holder") &&
    !ids.has("c-wall") &&
    !ids.has("c-storage")
  ) {
    ids.add("c-original");
  }
  const assigned = Array.from(ids);
  if (!assigned.some((id) => MERCH_IDS.has(id))) ids.add("c-other");
  return Array.from(ids);
}

export function storefrontCategories(all: Category[]): Category[] {
  const next: Category[] = [];
  for (const slug of STOREFRONT_CATEGORY_SLUGS) {
    const found = all.find((c) => c.slug === slug);
    if (found) next.push(found);
  }
  return next;
}

export function pickCollectionProducts(all: Product[], categoryId: string, limit = 6): Product[] {
  const matched = all.filter((p) => p.categoryIds.includes(categoryId));
  const featured = matched.filter((p) => p.featured);
  const rest = matched.filter((p) => !p.featured);
  return featured.concat(rest).slice(0, limit);
}
