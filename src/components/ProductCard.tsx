"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, ShoppingCart } from "lucide-react";
import type { Brand, Product } from "@/lib/types";
import { brands } from "@/lib/seed";
import { formatTHB } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";
import { ProductAddPopup } from "@/components/ProductAddPopup";

function productBrand(product: Product): Brand | undefined {
  const matched = product.brandIds
    .map((id) => brands.find((b) => b.id === id))
    .filter((b): b is Brand => Boolean(b));
  return matched.find((b) => b.slug !== "blacksmith") ?? matched[0];
}

export function ProductCard({
  product,
  layout = "shop",
}: {
  product: Product;
  layout?: "shop" | "related";
}) {
  const [addOpen, setAddOpen] = useState(false);
  const href = `/product/${product.slug}`;
  const brand = productBrand(product);
  const compact = layout === "related";

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgba(35,50,61,0.08)] ring-1 ring-black/5">
      <Link href={href} className="relative block overflow-hidden">
        <div className={`relative bg-steel/50 ${compact ? "aspect-[4/3]" : "aspect-square"}`}>
          <Image
            src={product.imageUrl}
            alt={product.nameTh}
            fill
            sizes={compact ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"}
            className="object-contain p-5 transition group-hover:scale-[1.03]"
          />
          {product.featured ? (
            <span className="absolute left-3 top-3 rounded-full bg-navy/80 px-2.5 py-1 text-[11px] font-semibold text-white">
              แนะนำ
            </span>
          ) : null}
          {brand ? (
            <span
              className={
                brand.slug === "blacksmith"
                  ? "absolute right-3 top-3"
                  : "absolute right-2.5 top-2.5 overflow-hidden rounded-md bg-white p-1 shadow-md ring-1 ring-black/10"
              }
              title={brand.name}
            >
              <BrandLogo
                brand={brand}
                decorative
                className={
                  brand.slug === "blacksmith"
                    ? "h-[4.5rem] w-[4.5rem] shadow-md"
                    : "block h-8 w-auto max-h-8 max-w-[5rem] object-contain"
                }
              />
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <Link href={href} className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-navy">{product.nameTh}</h3>
          {!compact && product.description ? (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{product.description}</p>
          ) : null}
        </Link>

        <div className="mt-auto pt-3">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-base font-bold tabular-nums leading-none text-navy">{formatTHB(product.price)}</span>
            {product.compareAtPrice && product.compareAtPrice > product.price ? (
              <span className="text-xs font-medium text-muted line-through tabular-nums">
                {formatTHB(product.compareAtPrice)}
              </span>
            ) : null}
          </p>
          <div className="mt-2.5 flex items-center justify-between gap-1.5">
            <button
              type="button"
              aria-label="ใส่ตะกร้า"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-steel text-navy hover:bg-forge hover:text-white"
              onClick={() => setAddOpen(true)}
            >
              <ShoppingCart className="h-4 w-4" aria-hidden />
            </button>
            <Link
              href={href}
              className="group/view inline-flex min-h-9 w-1/2 shrink-0 items-center justify-center gap-1 rounded-full bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-deep hover:text-white"
            >
              <span className="text-white">ดูสินค้า</span>
              <span className="relative inline-flex h-5 w-5 shrink-0 overflow-hidden rounded-full bg-white text-navy">
                <ArrowUpRight
                  className="absolute inset-0 m-auto h-3 w-3 transition-transform duration-300 ease-out group-hover/view:translate-x-3.5 group-hover/view:-translate-y-3.5"
                  aria-hidden
                />
                <ArrowUpRight
                  className="absolute inset-0 m-auto h-3 w-3 translate-x-[-14px] translate-y-[14px] transition-transform duration-300 ease-out group-hover/view:translate-x-0 group-hover/view:translate-y-0"
                  aria-hidden
                />
              </span>
            </Link>
          </div>
        </div>
      </div>

      <ProductAddPopup product={product} open={addOpen} onClose={() => setAddOpen(false)} />
    </article>
  );
}
