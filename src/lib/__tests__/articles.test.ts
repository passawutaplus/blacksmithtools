import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { parseArticle, renderMarkdown } from "../articles";

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
});
