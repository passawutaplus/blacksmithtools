export type CartItemInput = { productId: string; variantId?: string; quantity: number };

/** Clamp what the browser sends: whole quantities 1–99, at most 50 lines, merged duplicates. */
export function cleanCartItems(items: CartItemInput[]): CartItemInput[] {
  const merged = new Map<string, CartItemInput>();
  for (const raw of items.slice(0, 50)) {
    const quantity = Math.min(99, Math.floor(Number(raw.quantity) || 0));
    if (!raw.productId || quantity < 1) continue;
    const variantId = raw.variantId || undefined;
    const key = `${raw.productId}::${variantId ?? ""}`;
    const prev = merged.get(key);
    merged.set(key, { productId: String(raw.productId), variantId, quantity: Math.min(99, (prev?.quantity ?? 0) + quantity) });
  }
  return [...merged.values()];
}
