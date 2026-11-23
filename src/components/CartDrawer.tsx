"use client";

import { FreeShipMeter } from "@/components/FreeShipMeter";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { X, Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { formatTHB } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { cartLineKey, shortProductName } from "@/lib/product";
import { CartVariantSelect } from "@/components/CartVariantSelect";

type Line = {
  product: Product;
  productId: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  sku: string;
  imageUrl: string;
  lineTotal: number;
};

export function CartDrawer() {
  const open = useCartStore((s) => s.open);
  const setOpen = useCartStore((s) => s.setOpen);
  const items = useCartStore((s) => s.items);
  const cartId = useCartStore((s) => s.cartId);
  const setQty = useCartStore((s) => s.setQty);
  const changeVariant = useCartStore((s) => s.changeVariant);
  const removeItem = useCartStore((s) => s.removeItem);
  const setCartId = useCartStore((s) => s.setCartId);
  const [lines, setLines] = useState<Line[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [loading, setLoading] = useState(false);
  const [freeShippingMin, setFreeShippingMin] = useState(1000);
  const [flatShippingFee, setFlatShippingFee] = useState(35);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function sync() {
      setLoading(true);
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartId, items }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.cartId) setCartId(data.cartId);
        setLines(data.lines ?? []);
        setSubtotal(data.subtotal ?? 0);
        setShipping(data.shippingFee ?? 0);
        if (data.freeShippingMin) setFreeShippingMin(data.freeShippingMin);
        if (data.flatShippingFee) setFlatShippingFee(data.flatShippingFee);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void sync();
    return () => {
      cancelled = true;
    };
  }, [open, items, cartId, setCartId]);

  if (!open) return null;

  const total = subtotal + shipping;
  // Until the first price check returns, show placeholders instead of ฿0 / "ฟรี".
  const pending = loading && lines.length === 0;
  const money = (n: number) => (pending ? "—" : formatTHB(n));

  return (
    <div className="fixed inset-0 z-50 flex justify-end overscroll-none">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="ปิดตะกร้า"
        onClick={() => setOpen(false)}
      />
      <aside className="relative flex h-dvh max-h-dvh w-full min-w-0 max-w-md flex-col border-l border-navy/15 bg-white">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-2.5">
          <h2 className="truncate text-base font-bold text-navy sm:text-lg">ตะกร้าสินค้า</h2>
          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[2px] hover:bg-steel"
            aria-label="ปิด"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {loading && lines.length === 0 ? (
            <p className="text-sm text-muted">กำลังโหลด...</p>
          ) : lines.length === 0 ? (
            <p className="text-sm text-muted">ยังไม่มีสินค้าในตะกร้า</p>
          ) : (
            <ul className="space-y-3">
              {lines.map((line) => (
                <li
                  key={cartLineKey(line.productId, line.variantId)}
                  className="overflow-hidden rounded-[3px] border border-navy/10 bg-white p-3"
                >
                  <div className="flex gap-3">
                    <div className="relative h-16 w-16 shrink-0 self-start overflow-hidden rounded-[3px] bg-steel sm:h-20 sm:w-20 sm:rounded-[3px]">
                      <Image
                        src={line.imageUrl || line.product.imageUrl}
                        alt={line.product.nameTh}
                        fill
                        className="object-contain p-1"
                        sizes="80px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-navy">
                        {shortProductName(line.product.nameTh)}
                      </p>
                      <CartVariantSelect
                        product={line.product}
                        variantId={line.variantId}
                        fallbackName={line.variantName}
                        onChange={(id) => changeVariant(line.productId, line.variantId, id)}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-xs text-muted">SKU {line.sku}</p>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-navy">
                      {formatTHB(line.unitPrice)}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
                    <div className="inline-flex h-9 items-center border border-navy/20 bg-white">
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center hover:bg-steel"
                        onClick={() => setQty(line.productId, line.quantity - 1, line.variantId)}
                        aria-label="ลดจำนวน"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-7 text-center text-sm tabular-nums">{line.quantity}</span>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center hover:bg-steel"
                        onClick={() => setQty(line.productId, line.quantity + 1, line.variantId)}
                        aria-label="เพิ่มจำนวน"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center hover:bg-steel text-muted hover:bg-steel hover:text-navy"
                      onClick={() => removeItem(line.productId, line.variantId)}
                      aria-label="ลบ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="safe-bottom shrink-0 border-t border-gray-100 bg-white px-4 pt-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted">ยอดสินค้า</span>
              <span className="tabular-nums">{money(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted">ค่าส่ง (โดยประมาณ)</span>
              <span className="tabular-nums">{pending ? "—" : shipping === 0 ? "ฟรี" : formatTHB(shipping)}</span>
            </div>
          </div>
          {pending ? null : <FreeShipMeter subtotal={subtotal} min={freeShippingMin} />}
          <div className="mt-3 flex items-center justify-between gap-4 border-t border-gray-100 pt-3 font-bold">
            <span>รวม</span>
            <span className="text-base tabular-nums text-navy sm:text-lg">{money(total)}</span>
          </div>
          <div className="mt-4 grid gap-2">
            {pending || lines.length === 0 ? (
              <span className="btn btn-primary w-full cursor-not-allowed opacity-50" aria-disabled="true">
                สั่งซื้อ
              </span>
            ) : (
              <Link href="/checkout" className="btn btn-primary w-full" onClick={() => setOpen(false)}>
                สั่งซื้อ
              </Link>
            )}
            <Link href="/cart" className="btn btn-secondary w-full" onClick={() => setOpen(false)}>
              ดูตะกร้าเต็ม
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}