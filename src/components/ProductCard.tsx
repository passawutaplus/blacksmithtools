"use client";

import Image from "next/image";
import { shortProductName } from "@/lib/product";
import Link from "next/link";
import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import type { Brand, Product } from "@/lib/types";
import { brands } from "@/lib/seed";
import { formatTHB } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";
import { ProductAddPopup } from "@/components/ProductAddPopup";
import { getProductBlurb } from "@/lib/parse-product-details";

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

  // Shopee-imported multi-variant products store the top variant price as compareAtPrice,
  // so a strike-through would be a fake discount. Show "เริ่ม" instead.
  const multi = (product.variants?.length ?? 0) > 1;
  const onSale = !multi && Boolean(product.compareAtPrice && product.compareAtPrice > product.price);
  const fitsLabel = brand && brand.slug !== "blacksmith" ? `ใช้ได้กับ ${brand.name}` : "BlackSmith Original";

  return (
    <article className="group flex h-full flex-col border border-navy/12 bg-white transition-colors hover:border-navy/40">
      <Link href={href} className="relative block overflow-hidden">
        <div className={`relative bg-[#f1f1f1] ${compact ? "aspect-[4/3]" : "aspect-square"}`}>
          <Image
            src={product.imageUrl}
            alt={product.nameTh}
            fill
            sizes={compact ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"}
            className="object-contain p-5 transition-transform duration-300 group-hover:scale-[1.03]"
          />
          {brand && brand.slug !== "blacksmith" ? (
            <span
              className="absolute right-2 top-2 bg-white p-1 ring-1 ring-navy/10"
              title={brand.name}
            >
              <BrandLogo
                brand={brand}
                decorative
                className="block h-7 w-auto max-h-7 max-w-[4.5rem] object-contain"
              />
            </span>
          ) : null}
          <span className="absolute bottom-0 left-0 bg-navy px-2 py-1 text-[11px] font-medium leading-none text-white">
            {fitsLabel}
          </span>
          {product.featured ? (
            <span className="absolute left-0 top-0 bg-forge px-2 py-1 text-[11px] font-semibold leading-none text-white">
              แนะนำ
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col border-t border-navy/10 px-3.5 pb-3.5 pt-3">
        <Link href={href} className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-navy group-hover:text-forge">
            {shortProductName(product.nameTh)}
          </h3>
          {!compact ? (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">{getProductBlurb(product)}</p>
          ) : null}
        </Link>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <p className="flex flex-col">
            {onSale ? (
              <span className="num text-[11px] text-muted">
                <span className="line-through">{formatTHB(product.compareAtPrice!)}</span>
                <span className="ml-1.5 font-semibold text-forge">
                  -{Math.round((1 - product.price / product.compareAtPrice!) * 100)}%
                </span>
              </span>
            ) : null}
            {multi ? <span className="text-[11px] text-muted">เริ่ม</span> : null}
            <span className="num text-lg font-semibold leading-none text-navy">{formatTHB(product.price)}</span>
          </p>
          <button
            type="button"
            aria-label={`ใส่ตะกร้า ${product.nameTh}`}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 bg-forge px-3 text-xs font-semibold text-white hover:bg-forge-hover"
            onClick={() => setAddOpen(true)}
          >
            <ShoppingCart className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">ใส่ตะกร้า</span>
          </button>
        </div>
      </div>

      <ProductAddPopup product={product} open={addOpen} onClose={() => setAddOpen(false)} />
    </article>
  );
}
