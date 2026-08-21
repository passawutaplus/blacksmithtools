"use client";

import type { Product } from "@/lib/types";
import { selectableVariants } from "@/lib/product";
import { formatTHB } from "@/lib/utils";

export function CartVariantSelect({
  product,
  variantId,
  fallbackName,
  onChange,
}: {
  product: Product;
  variantId?: string;
  fallbackName?: string;
  onChange: (variantId: string) => void;
}) {
  const options = selectableVariants(product);
  if (options.length < 2) {
    if (!fallbackName) return null;
    return <p className="mt-1 truncate text-xs text-muted">{fallbackName}</p>;
  }

  return (
    <label className="mt-1.5 block min-w-0">
      <span className="sr-only">ตัวเลือกสินค้า</span>
      <select
        className="block h-9 min-h-9 w-full min-w-0 max-w-full truncate rounded-full border border-gray-200 bg-white px-3 text-[13px] leading-tight text-navy focus:outline-2 focus:outline-offset-1 focus:outline-navy"
        value={variantId || options[0]?.id}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((v) => (
          <option key={v.id} value={v.id} disabled={v.stock <= 0 && v.id !== variantId}>
            {v.name || v.sku} · {formatTHB(v.price)}
            {v.stock <= 0 ? " · หมด" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
