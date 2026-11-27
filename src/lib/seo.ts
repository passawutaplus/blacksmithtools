import { shortProductName } from "./product";

export const SITE_NAME = "BlackSmith Tools";
export const SITE_BRAND = "BlackSmith";

/** Pages that set their own openGraph replace the root one entirely, so spread this in to keep site name + locale. */
export const OG_BASE = { siteName: SITE_NAME, locale: "th_TH" } as const;

const SPEC =
  /(\d[\d,.]*\s?(?:ml|มล\.?|ลิตร|cm\.?|ซม\.?)|ชุด\s?\d+\s?(?:ขวด|หลอด|ถุง|ชิ้น)?|ยกลัง(?:\s?\d+\s?(?:ขวด|หลอด|ถุง(?:เติม)?))?|\d+\s?(?:ขวด|หลอด|ถุง(?:เติม)?|ชิ้น)|\d+\s?Slot|\b[A-Z]{2,}\d{2,}[A-Z0-9-]*)/giu;

// Words that read as unfinished when a cut lands right after them ("… Pack Out สำหรับ").
const DANGLING = /\s+(สำหรับ|ของ|และ|กับ|ใช้กับ|ใช้ได้กับ|เพื่อ|ที่|แบบ|ขนาด|for|and|with|&)$/iu;

function cutAtSpace(s: string, max: number) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const i = cut.lastIndexOf(" ");
  let out = (i > 10 ? cut.slice(0, i) : cut).trim();
  while (DANGLING.test(out)) out = out.replace(DANGLING, "").trim();
  return out;
}

/**
 * Search-result title for a product (~60 chars). Marketplace names are long and many listings
 * share the same opening words, so when the name has to be cut, the sizes / pack counts that
 * fell off the end are appended to keep each page's title distinct.
 */
export function seoProductTitle(name: string, max = 60): string {
  const s = shortProductName(name).replace(/(\.{3}|…)\s*$/u, "").trim();
  if (s.length <= max) return s;
  const head = cutAtSpace(s, max);
  const specs: string[] = [];
  for (const m of s.matchAll(SPEC)) {
    const v = m[0].trim();
    if ((m.index ?? 0) >= head.length && !specs.includes(v) && !head.includes(v)) specs.push(v);
  }
  if (!specs.length) return head;
  const tail = ` · ${specs.slice(0, 3).join(" ")}`;
  return `${cutAtSpace(s, Math.max(20, max - tail.length))}${tail}`;
}

/** Meta description: one line, cut at a word boundary near 155 chars. */
export function metaDescription(text: string, max = 155): string {
  const s = text.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  return `${cutAtSpace(s, max - 1)}…`;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://blacksmith-tools.com").replace(/\/$/, "");
}

/** BreadcrumbList from [label, path] pairs (path "/" = home). */
export function breadcrumbLd(items: [string, string][]) {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: `${base}${path === "/" ? "" : path}`,
    })),
  };
}

/** CollectionPage whose main entity is an ordered list of links (shop brand pages, article index). */
export function collectionLd(name: string, description: string, path: string, items: { name: string; path: string }[]) {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: `${base}${path}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: it.name,
        url: `${base}${it.path}`,
      })),
    },
  };
}
