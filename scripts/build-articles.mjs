// Bundles content/articles/*.md into src/data/articles.json so article pages never depend on
// reading files at runtime (Vercel functions don't ship content/ reliably).
// Run after editing articles: npm run articles  (also runs automatically before build/test)
import { promises as fs } from "fs";
import path from "path";

const dir = path.join(process.cwd(), "content", "articles");
const files = (await fs.readdir(dir)).filter((f) => /^[a-z0-9-]+\.md$/.test(f)).sort();
const out = await Promise.all(
  files.map(async (f) => ({ slug: f.replace(/\.md$/, ""), raw: await fs.readFile(path.join(dir, f), "utf8") })),
);
await fs.writeFile(path.join(process.cwd(), "src", "data", "articles.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`articles.json: ${out.length} articles`);
