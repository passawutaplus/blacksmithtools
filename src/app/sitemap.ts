import type { MetadataRoute } from "next";
import { listProducts, getBrandsAndCategories } from "@/lib/db";
import { assistantPages } from "@/lib/chang/catalog";
import { listArticles } from "@/lib/articles";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { products } = await listProducts();
  const { brands } = await getBrandsAndCategories();

  const staticPages = [
    "",
    "/shop",
    "/about",
    "/contact",
    "/warranty",
    "/custom-print",
    "/assistant",
    "/privacy",
    "/terms",
    "/cookies",
    "/pdpa",
    "/track",
    "/go",
    "/tools-lab",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const assistant = assistantPages()
    .filter((p) => p.href !== "/assistant")
    .map((p) => ({
      url: `${base}${p.href}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: p.href.endsWith("/job") ? 0.6 : 0.5,
    }));

  const productPages = products.map((p) => ({
    url: `${base}/product/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const brandPages = brands.map((b) => ({
    url: `${base}/shop/${b.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const articlePages = (await listArticles())
    .filter((a) => !a.draft)
    .map((a) => ({
      url: `${base}/tools-lab/${a.slug}`,
      lastModified: new Date(a.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  return [...staticPages, ...articlePages, ...assistant, ...brandPages, ...productPages];
}