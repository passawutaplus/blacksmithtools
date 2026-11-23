import type { Product, ProductVariant } from "./types";

export function cartLineKey(productId: string, variantId?: string | null) {
  return variantId ? `${productId}::${variantId}` : productId;
}

export function productVariants(product: Product): ProductVariant[] {
  return product.variants?.length ? product.variants : [];
}

export function selectableVariants(product: Product): ProductVariant[] {
  const list = productVariants(product);
  if (list.length === 0) return [];
  if (list.length === 1 && !list[0].name?.trim()) return [];
  return list;
}

/** ถ้าทุกตัวเลือกเป็น "ขนาด,สี" จะแยกปุ่มเป็นแกน ไม่ใช่รายการยาว */
export function variantAxes(variants: ProductVariant[]): string[][] | null {
  if (variants.length < 4) return null;
  const parts = variants.map((v) =>
    (v.name || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  if (parts.some((p) => p.length < 2)) return null;
  const n = Math.min(...parts.map((p) => p.length));
  if (n < 2) return null;
  return parts.map((p) => p.slice(0, n));
}

export function findVariantByAxes(
  variants: ProductVariant[],
  axes: string[][] | null,
  selected: string[],
): ProductVariant | null {
  if (!axes) return null;
  const idx = axes.findIndex((row) => row.every((part, i) => part === selected[i]));
  return idx >= 0 ? variants[idx] ?? null : null;
}

export function uniqueGallery(product: Product, selectedUrl?: string | null) {
  const urls = [
    selectedUrl,
    product.imageUrl,
    ...(product.images ?? []),
    ...(product.variants ?? []).map((v) => v.imageUrl),
  ]
    .map((u) => (u || "").trim())
    .filter(Boolean);
  return [...new Set(urls)];
}

export function normalizeVariants(
  raw: unknown,
  fallback: ProductVariant[] | undefined,
): ProductVariant[] | undefined {
  if (raw === undefined) return fallback;
  if (!Array.isArray(raw)) return fallback ?? [];
  const out: ProductVariant[] = [];
  const seen = new Set<string>();
  raw.forEach((item, i) => {
    if (!item || typeof item !== "object") return;
    const row = item as Record<string, unknown>;
    const price = Number(row.price);
    const stock = Number(row.stock);
    if (!Number.isFinite(price) || price < 0) return;
    if (!Number.isFinite(stock) || stock < 0) return;
    let id = String(row.id ?? "").trim() || `v-${i + 1}`;
    if (seen.has(id)) id = `${id}-${i + 1}`;
    seen.add(id);
    const imageUrl = String(row.imageUrl ?? "").trim() || null;
    out.push({
      id,
      name: String(row.name ?? "").trim(),
      sku: String(row.sku ?? "").trim(),
      price: Math.round(price),
      stock: Math.floor(stock),
      imageUrl,
    });
  });
  return out;
}

export function syncFromVariants(product: Pick<Product, "price" | "stock" | "sku" | "compareAtPrice"> & { variants?: ProductVariant[] }) {
  const list = product.variants ?? [];
  if (!list.length) return product;
  const prices = list.map((v) => v.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return {
    ...product,
    price: min,
    compareAtPrice: max > min ? max : undefined,
    stock: list.reduce((s, v) => s + v.stock, 0),
    sku: product.sku || list[0]?.sku || product.sku,
  };
}

export function resolveVariant(product: Product, variantId?: string | null): ProductVariant | null {
  const list = productVariants(product);
  if (!list.length) return null;
  if (variantId) {
    const found = list.find((v) => v.id === variantId);
    if (found) return found;
  }
  return list[0];
}

export function linePricing(product: Product, variantId?: string | null) {
  const variant = resolveVariant(product, variantId);
  const price = variant?.price ?? product.price;
  const sku = variant?.sku || product.sku;
  const stock = variant?.stock ?? product.stock;
  const imageUrl = variant?.imageUrl || product.imageUrl;
  const variantName = variant?.name?.trim() || "";
  const name = variantName ? `${product.nameTh} — ${variantName}` : product.nameTh;
  return { variant, price, sku, stock, imageUrl, variantName, name };
}

/** Marketplace titles end with "BlackSmith-แบรนด์คนไทย"; the site already says that, so drop it on screen. */
export function shortProductName(name: string) {
  return name.replace(/\s*(BlackSmith(?:\s*[-–—]\s*แบรนด์คน(?:ไทย)?)?|แบรนด์คนไทย)\s*$/u, "").trim() || name;
}
