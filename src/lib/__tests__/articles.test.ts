import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { readFileSync, readdirSync } from "fs";
import path from "path";
import bundled from "../../data/articles.json";
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
});
