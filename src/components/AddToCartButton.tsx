"use client";

import { useCartStore } from "@/lib/cart-store";

export function AddToCartButton({
  productId,
  variantId,
  quantity = 1,
  className = "btn btn-primary w-full",
  label = "ใส่ตะกร้า",
  disabled = false,
}: {
  productId: string;
  variantId?: string;
  quantity?: number;
  className?: string;
  label?: string;
  disabled?: boolean;
}) {
  const addItem = useCartStore((s) => s.addItem);
  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onClick={() => addItem(productId, quantity, variantId)}
    >
      {label}
    </button>
  );
}
