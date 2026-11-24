import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { readFileSync, readdirSync } from "fs";
import path from "path";
import bundledJson from "../../data/articles.json";
const bundled = bundledJson as { slug: string; raw: string }[];
import { extractFaq, parseArticle, renderMarkdown, shortProductName } from "../articles";
import catalog from "../../data/shopee-catalog.json";
import { extractFaq, parseArticle, renderMarkdown } from "../articles";

describe("articles", () => {
  it("parses front matter", () => {
    const a = parseArticle("x", "---\ntitle: ค้อน\ndate: 2026-11-01\npillar: tips\ndraft: true\n---\nเนื้อหา");
    expect(a).toMatchObject({ title: "ค้อน", pillar: "tips", draft: true, body: "เนื้อหา" });
  });
  it("renders a safe subset", () => {
    const html = renderMarkdown("## หัวข้อ\n\nข้อความ **หนา** <script>x</script>\n\n- a\n- b\n\n[ลิงก์](javascript:alert(1)) [ok](/shop)");
    expect(html).toContain("<h2>หัวข้อ</h2>");
    expect(html).toContain("<strong>หนา</strong>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<ul>\n<li>a</li>");
    expect(html).not.toContain('href="javascript');
    expect(html).toContain('<a href="/shop">ok</a>');
  });
  it("parses SEO fields", () => {
    const a = parseArticle("x", "---\ntitle: t\ncoverAlt: ภาพค้อน\nkeywords: ค้อน, ประวัติค้อน ,\n---\nb");
    expect(a.coverAlt).toBe("ภาพค้อน");
    expect(a.keywords).toEqual(["ค้อน", "ประวัติค้อน"]);
  });
  it("renders local images as figures only", () => {
    const html = renderMarkdown('![ภาพ "ค้อน"](/articles/hammer.webp)\n\n![x](https://evil.example/a.png)');
    expect(html).toContain('<figure><img src="/articles/hammer.webp" alt="ภาพ &quot;ค้อน&quot;"');
    expect(html).toContain('loading="lazy"');
    expect(html).not.toContain('<img src="https');
  });
  it("extracts FAQ for structured data", () => {
    const faq = extractFaq("## เรื่อง\n\nก\n\n## คำถามที่พบบ่อย\n\n### ถามหนึ่ง\n\nตอบ **หนึ่ง**\n\n### ถามสอง\n\nตอบสอง [ลิงก์](/shop)\n\nอ่านต่อ");
    expect(faq).toEqual([
      { q: "ถามหนึ่ง", a: "ตอบ หนึ่ง" },
      { q: "ถามสอง", a: "ตอบสอง ลิงก์ อ่านต่อ" },
    ]);
  });
  it("bundled articles.json matches content/articles (run `npm run articles`)", () => {
    const dir = path.join(process.cwd(), "content", "articles");
    const files = readdirSync(dir).filter((f) => /^[a-z0-9-]+\.md$/.test(f)).sort();
    expect(bundled.map((b) => b.slug)).toEqual(files.map((f) => f.replace(/\.md$/, "")));
    for (const b of bundled) expect(b.raw).toBe(readFileSync(path.join(dir, `${b.slug}.md`), "utf8"));
  });
  it("renders [[products: ...]] as product cards without prices and skips unknown ids", () => {
    const id = (catalog.products as { id: string }[])[0].id;
    const html = renderMarkdown(`[[products: ${id}, p-does-not-exist]]`);
    expect(html).toContain('class="article-products"');
    expect(html.match(/class="article-product"/g)).toHaveLength(1);
    expect(html).toContain(`href="/product/${id}"`);
    expect(html).not.toMatch(/฿/);
    expect(renderMarkdown("[[products: p-nope]]")).toBe("");
  });
  it("shortens marketplace titles", () => {
    expect(shortProductName("Milwaukee Battery M18 Mount (โดยเฉพาะ) BlackSmith-แบรนด์คนไทย")).toBe("Milwaukee Battery M18 Mount");
    expect(shortProductName("ก".repeat(100)).length).toBeLessThanOrEqual(70);
  });
  it("every product id used in an article exists in the catalog", () => {
    const ids = new Set((catalog.products as { id: string }[]).map((p) => p.id));
    for (const b of bundled)
      for (const m of b.raw.matchAll(/^\[\[products:\s*([^\]]+)\]\]$/gm))
        for (const id of m[1].split(",").map((x) => x.trim())) expect(ids.has(id), `${b.slug}: ${id}`).toBe(true);
  });
});
