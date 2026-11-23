"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, X } from "lucide-react";
import type { Product } from "@/lib/types";
import { selectableVariants } from "@/lib/product";
import { formatTHB } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";

export function ProductAddPopup({
  product,
  open,
  onClose,
}: {
  product: Product;
  open: boolean;
  onClose: () => void;
}) {
  const options = selectableVariants(product);
  const addItem = useCartStore((s) => s.addItem);
  const setCartOpen = useCartStore((s) => s.setOpen);
  const titleId = useId();
  const firstId = options[0]?.id ?? "";
  const [variantId, setVariantId] = useState(firstId);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!open) return;
    setVariantId(firstId);
    setQty(1);
  }, [open, firstId, product.id]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const selected = options.find((v) => v.id === variantId) ?? options[0];
  const stock = selected?.stock ?? product.stock;
  const price = selected?.price ?? product.price;
  const canAdd = stock > 0;

  function confirm() {
    if (!canAdd) return;
    addItem(product.id, qty, selected?.id);
    setCartOpen(true);
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-navy/50" aria-label="ปิด" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-[3px] bg-white p-5 shadow-[0_8px_40px_rgba(35,50,61,0.28)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p id={titleId} className="font-bold text-navy">
              ใส่ตะกร้า
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{product.nameTh}</p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-steel"
            aria-label="ปิด"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {options.length > 0 ? (
          <div className="mt-4">
            <p className="text-sm font-semibold text-navy">ตัวเลือกสินค้า</p>
            <div className="mt-3 grid max-h-56 gap-2.5 overflow-y-auto">
              {options.map((v) => {
                const active = v.id === variantId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={v.stock <= 0}
                    onClick={() => setVariantId(v.id)}
                    className={`rounded-none px-4 py-3 text-left text-sm ${
                      active
                        ? "bg-navy text-white"
                        : "bg-steel text-navy hover:bg-steel/70 disabled:opacity-40"
                    }`}
                  >
                    <span className="font-semibold">{v.name || v.sku}</span>
                    <span className={`ml-2 ${active ? "text-white/80" : "text-muted"}`}>
                      {formatTHB(v.price)}
                      {v.stock <= 0 ? " · หมด" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-navy">จำนวน</p>
          <div className="inline-flex items-center border border-navy/20 bg-white">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center"
              aria-label="ลดจำนวน"
              onClick={() => setQty((n) => Math.max(1, n - 1))}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-sm font-bold">{qty}</span>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center"
              aria-label="เพิ่มจำนวน"
              onClick={() => setQty((n) => Math.min(Math.max(stock, 1), n + 1))}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="mt-3 text-sm font-bold text-forge">{formatTHB(price * qty)}</p>

        <div className="mt-5 flex gap-2">
          <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>
            ยกเลิก
          </button>
          <button type="button" className="btn btn-primary flex-1" disabled={!canAdd} onClick={confirm}>
            {canAdd ? "ใส่ตะกร้า" : "หมดสต็อก"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
