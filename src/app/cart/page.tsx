"use client";

import { FreeShipMeter } from "@/components/FreeShipMeter";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import { formatTHB } from "@/lib/utils";
import { cartLineKey } from "@/lib/product";
import type { Product } from "@/lib/types";
import { Minus, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
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

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const cartId = useCartStore((s) => s.cartId);
  const setCartId = useCartStore((s) => s.setCartId);
  const setQty = useCartStore((s) => s.setQty);
  const changeVariant = useCartStore((s) => s.changeVariant);
  const [lines, setLines] = useState<Line[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [freeShippingMin, setFreeShippingMin] = useState(1000);

  useEffect(() => {
    let cancelled = false;
    async function sync() {
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
    }
    void sync();
    return () => {
      cancelled = true;
    };
  }, [items, cartId, setCartId]);

  return (
    <>
      <PageHeader title="ตะกร้าสินค้า" crumbs={[{ href: "/", label: "หน้าแรก" }, { label: "ตะกร้า" }]} />
      <div className="container-bs py-6 md:py-10">
      {lines.length === 0 ? (
        <div className="mt-8 card p-8 text-center">
          <p className="text-muted">ตะกร้าว่าง</p>
          <Link href="/shop" className="btn btn-primary mt-4 inline-flex">
            ไปเลือกสินค้า
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
          <ul className="space-y-3">
            {lines.map((line) => (
              <li
                key={cartLineKey(line.productId, line.variantId)}
                className="card overflow-hidden p-3 sm:p-4"
              >
                <div className="flex gap-3">
                  <div className="relative h-16 w-16 shrink-0 self-start overflow-hidden rounded-[3px] bg-steel sm:h-24 sm:w-24 sm:rounded-[3px]">
                    <Image
                      src={line.imageUrl || line.product.imageUrl}
                      alt={line.product.nameTh}
                      fill
                      className="object-contain p-1"
                      sizes="96px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${line.product.slug}`}
                      className="line-clamp-2 text-sm font-semibold leading-snug text-navy hover:underline sm:text-base"
                    >
                      {line.product.nameTh}
                    </Link>
                    <CartVariantSelect
                      product={line.product}
                      variantId={line.variantId}
                      fallbackName={line.variantName}
                      onChange={(id) => changeVariant(line.productId, line.variantId, id)}
                    />
                    <p className="mt-1 truncate text-xs text-muted">SKU {line.sku}</p>
                  </div>
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
                  <div className="min-w-0 text-right">
                    <p className="text-xs text-muted">{formatTHB(line.unitPrice)} / ชิ้น</p>
                    <p className="font-semibold tabular-nums text-navy">{formatTHB(line.lineTotal)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <aside className="card h-fit p-4 sm:p-5 lg:sticky lg:top-24">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted">ยอดสินค้า</span>
              <span className="tabular-nums">{formatTHB(subtotal)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4 text-sm">
              <span className="text-muted">ค่าส่ง</span>
              <span className="tabular-nums">{shipping === 0 ? "ฟรี" : formatTHB(shipping)}</span>
            </div>
            <FreeShipMeter subtotal={subtotal} min={freeShippingMin} />
            <div className="mt-4 flex items-center justify-between gap-4 border-t border-gray-100 pt-3 text-lg font-bold">
              <span>รวม</span>
              <span className="tabular-nums text-navy">{formatTHB(subtotal + shipping)}</span>
            </div>
            <Link href="/checkout" className="btn btn-primary mt-4 w-full">
              ไปชำระเงิน
            </Link>
          </aside>
        </div>
      )}
    </div>
    </>
  );
}
