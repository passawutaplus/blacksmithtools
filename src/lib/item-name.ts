/** Order item names are stored as "Product — Variant"; strip the variant where it is shown separately. */
export function baseItemName(item: { name: string; variantName?: string }) {
  const variant = item.variantName?.trim();
  if (!variant) return item.name;
  for (const suffix of [` — ${variant}`, ` – ${variant}`, ` - ${variant}`]) {
    if (item.name.endsWith(suffix)) return item.name.slice(0, -suffix.length).trim();
  }
  return item.name;
}
