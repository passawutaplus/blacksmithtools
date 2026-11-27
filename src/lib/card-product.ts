import type { Product } from "@/lib/types";
import { getProductBlurb } from "@/lib/parse-product-details";

export type CardProduct = Product & { cardBlurb?: string };

/**
 * ProductCard is a client component, so every prop is serialized into the page HTML.
 * Full listings carry long descriptions and image galleries the card never shows —
 * on the home and brand pages that added up to ~400 KB. Send only what the card needs.
 */
export function toCardProduct(p: Product): CardProduct {
  return { ...p, description: "", images: [], cardBlurb: getProductBlurb(p) };
}
