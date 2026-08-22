import type { ReviewSource, ShopReview } from "./types";

export const REVIEW_SOURCES: ReviewSource[] = ["shopee", "lazada", "line", "web"];

export const REVIEW_SOURCE_LABEL: Record<ReviewSource, string> = {
  shopee: "Shopee",
  lazada: "Lazada",
  line: "LINE",
  web: "เว็บร้าน",
};

export function isReviewSource(value: string): value is ReviewSource {
  return REVIEW_SOURCES.includes(value as ReviewSource);
}

export function allowedReviewUrl(raw: string) {
  const url = raw.trim();
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return "";
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const ok =
      host === "shopee.co.th" ||
      host.endsWith(".shopee.co.th") ||
      host === "lazada.co.th" ||
      host.endsWith(".lazada.co.th") ||
      host === "lin.ee" ||
      host === "line.me";
    return ok ? parsed.toString() : "";
  } catch {
    return "";
  }
}

export function normalizeShopReview(
  input: Partial<ShopReview> & { quote?: string },
  existing?: ShopReview,
): Omit<ShopReview, "id" | "createdAt"> & { id?: string } {
  const quote = String(input.quote ?? "").trim().slice(0, 400);
  if (quote.length < 8) throw new Error("ใส่ข้อความรีวิวอย่างน้อย 8 ตัวอักษร");
  const stars = Math.min(5, Math.max(1, Math.round(Number(input.stars) || 5)));
  const rawSource = String(input.source ?? existing?.source ?? "shopee");
  const source = isReviewSource(rawSource) ? rawSource : "shopee";
  const sourceUrl = allowedReviewUrl(String(input.sourceUrl ?? ""));
  if (String(input.sourceUrl ?? "").trim() && !sourceUrl) {
    throw new Error("ลิงก์รีวิวต้องเป็น Shopee Lazada หรือ LINE");
  }
  return {
    id: existing?.id,
    quote,
    author: String(input.author ?? existing?.author ?? "").trim().slice(0, 40) || "ลูกค้า",
    stars,
    productName: String(input.productName ?? existing?.productName ?? "").trim().slice(0, 80),
    productId: String(input.productId ?? existing?.productId ?? "").trim(),
    source,
    sourceUrl,
    published: input.published ?? existing?.published ?? true,
    sortOrder: Number.isFinite(Number(input.sortOrder))
      ? Number(input.sortOrder)
      : (existing?.sortOrder ?? 0),
    updatedAt: new Date().toISOString(),
  };
}

export function sortShopReviews(rows: ShopReview[]) {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder || b.createdAt.localeCompare(a.createdAt));
}
