import "server-only";
import bundled from "@/data/articles.json";

/**
 * Articles live as Markdown files in content/articles/<slug>.md (bundled into src/data/articles.json by
 * `npm run articles`, which also runs before every build) with a small header:
 * ---
 * title: ...
 * description: ...        (1–2 lines, used for Google + share cards)
 * date: 2026-11-23
 * pillar: history | tips | product
 * cover: /articles/hammer.webp  (optional, file in public/ — square 1:1 post image)
 * coverAlt: ...                  (optional, describes the cover for Google Images + screen readers)
 * keywords: ค้อน, ประวัติค้อน    (optional, comma separated, used in <meta keywords> + JSON-LD)
 * updated: 2026-11-24            (optional, dateModified)
 * draft: true                   (optional — hidden on the live site)
 * ---
 */
export type Article = {
  slug: string;
  title: string;
  description: string;
  date: string;
  pillar: "history" | "tips" | "product";
  cover?: string;
  coverAlt?: string;
  keywords: string[];
  updated?: string;
  draft: boolean;
  body: string;
};

export const PILLAR_LABEL: Record<Article["pillar"], string> = {
  history: "Tools ลับ ฉบับย่อ",
  tips: "เคล็ดลับงานช่าง",
  product: "รู้จักสินค้า",
};

export function parseArticle(slug: string, raw: string): Article {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const meta: Record<string, string> = {};
  if (m) {
    for (const line of m[1].split(/\r?\n/)) {
      const i = line.indexOf(":");
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  const pillar = (["history", "tips", "product"] as const).find((p) => p === meta.pillar) ?? "history";
  return {
    slug,
    title: meta.title || slug,
    description: meta.description || "",
    date: meta.date || "1970-01-01",
    pillar,
    cover: meta.cover || undefined,
    coverAlt: meta.coverAlt || undefined,
    keywords: (meta.keywords ?? "").split(",").map((k) => k.trim()).filter(Boolean),
    updated: meta.updated || undefined,
    draft: meta.draft === "true",
    body: (m ? m[2] : raw).trim(),
  };
}

/** Drafts show in local dev and Vercel previews, never on the live site. */
export function showDrafts() {
  return process.env.VERCEL_ENV ? process.env.VERCEL_ENV !== "production" : process.env.NODE_ENV !== "production";
}

export async function listArticles(): Promise<Article[]> {
  const all = (bundled as { slug: string; raw: string }[]).map((f) => parseArticle(f.slug, f.raw));
  return all.filter((a) => showDrafts() || !a.draft).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getArticle(slug: string) {
  return (await listArticles()).find((a) => a.slug === slug) ?? null;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inline(s: string) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g, (_, t: string, href: string) => {
      const ext = href.startsWith("http");
      return `<a href="${href}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ""}>${t}</a>`;
    });
}

/**
 * FAQ for Google rich results: the "## คำถามที่พบบ่อย" section, each "### question" followed by its answer paragraph(s).
 */
export function extractFaq(body: string): { q: string; a: string }[] {
  const m = body.match(/^##\s+คำถามที่พบบ่อย[^\n]*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/m);
  if (!m) return [];
  const strip = (t: string) => t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  return m[1]
    .split(/^###\s+/m)
    .slice(1)
    .map((blk) => {
      const [q, ...rest] = blk.split(/\r?\n/);
      return { q: strip(q.trim()), a: strip(rest.join(" ").replace(/\s+/g, " ").trim()) };
    })
    .filter((f) => f.q && f.a);
}

/** Small, safe Markdown subset: ![alt](/img.webp) images, ## / ### headings, paragraphs, - lists, 1. lists, > quotes, **bold**, *italic*, [links](url). */
export function renderMarkdown(md: string) {
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    para = [];
  };
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const rawLine of md.split(/\r?\n/)) {
    const line = rawLine.trim();
    let m: RegExpMatchArray | null;
    if (!line) {
      flushPara();
      closeList();
    } else if ((m = line.match(/^!\[([^\]]*)\]\((\/[^\s)]+)\)$/))) {
      flushPara();
      closeList();
      // local images only; alt text doubles as the visible caption (good for SEO + accessibility)
      out.push(
        `<figure><img src="${escapeHtml(m[2])}" alt="${escapeHtml(m[1])}" width="1080" height="1080" loading="lazy" decoding="async" /><figcaption>${inline(m[1])}</figcaption></figure>`,
      );
    } else if ((m = line.match(/^(#{2,3})\s+(.*)$/))) {
      flushPara();
      closeList();
      const tag = m[1].length === 2 ? "h2" : "h3";
      out.push(`<${tag}>${inline(m[2])}</${tag}>`);
    } else if ((m = line.match(/^[-*]\s+(.*)$/)) || (m = line.match(/^\d+\.\s+(.*)$/))) {
      flushPara();
      const want = /^\d/.test(line) ? "ol" : "ul";
      if (list !== want) {
        closeList();
        out.push(`<${want}>`);
        list = want;
      }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      flushPara();
      closeList();
      out.push(`<blockquote>${inline(m[1])}</blockquote>`);
    } else {
      closeList();
      para.push(line);
    }
  }
  flushPara();
  closeList();
  return out.join("\n");
}
