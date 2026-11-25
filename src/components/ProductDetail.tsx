"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Minus, Plus, ShoppingCart, Zap } from "lucide-react";
import type { Brand, Category, Product } from "@/lib/types";
import { formatTHB } from "@/lib/utils";
import {
  findVariantByAxes,
  resolveVariant,
  selectableVariants,
  uniqueGallery,
  variantAxes, shortProductName } from "@/lib/product";
import { getProductDetailSections } from "@/lib/parse-product-details";
import { useCartStore } from "@/lib/cart-store";
import { MarketplaceButtons } from "@/components/MarketplaceButtons";
import { ProductDetailSections } from "@/components/ProductDetailSections";

export function ProductDetail({
  product,
  brands,
  categories,
  stats,
}: {
  product: Product;
  brands: Brand[];
  categories: Category[];
  stats?: { sold: number; rating: number; ratingCount: number };
}) {
  const router = useRouter();
  const detailSections = useMemo(() => getProductDetailSections(product), [product]);
  const addItem = useCartStore((s) => s.addItem);
  const setOpen = useCartStore((s) => s.setOpen);
  const options = selectableVariants(product);
  const axes = useMemo(() => variantAxes(options), [options]);
  const axisValues = useMemo(() => {
    if (!axes) return [] as string[][];
    const dims = axes[0]?.length ?? 0;
    return Array.from({ length: dims }, (_, i) => [...new Set(axes.map((row) => row[i]))]);
  }, [axes]);

  const [variantId, setVariantId] = useState(options[0]?.id ?? product.variants?.[0]?.id);
  const [picked, setPicked] = useState<string[]>(axes?.[0] ?? []);
  const [qty, setQty] = useState(1);
  const [openDesc, setOpenDesc] = useState(true);
  const [openShip, setOpenShip] = useState(false);

  const selected = useMemo(() => {
    if (axes) return findVariantByAxes(options, axes, picked) ?? resolveVariant(product, variantId);
    return resolveVariant(product, variantId) ?? product.variants?.[0] ?? null;
  }, [axes, options, picked, product, variantId]);

  const price = selected?.price ?? product.price;
  const stock = selected?.stock ?? product.stock;
  const sku = selected?.sku || product.sku;
  const imageUrl = selected?.imageUrl || product.imageUrl;
  const gallery = uniqueGallery(product, imageUrl);
  const thumbCols = Math.min(6, Math.max(4, Math.ceil(gallery.length / 2)));
  const [main, setMain] = useState(imageUrl);
  const canBuy = stock > 0 && !(options.length > 0 && !selected);

  useEffect(() => {
    setMain(imageUrl);
  }, [imageUrl]);

  function chooseAxis(dim: number, value: string) {
    if (!axes) return;
    const next = [...picked];
    next[dim] = value;
    let match = findVariantByAxes(options, axes, next);
    if (match) {
      setPicked(next);
    } else {
      const idx = axes.findIndex((row) => row[dim] === value);
      if (idx < 0) return;
      setPicked(axes[idx]);
      match = options[idx];
    }
    if (match) setVariantId(match.id);
  }

  function addToCart(openDrawer = true) {
    if (!canBuy) return;
    addItem(product.id, qty, selected?.id);
    if (openDrawer) setOpen(true);
  }

  function buyNow() {
    addToCart(false);
    router.push("/checkout");
  }

  const fitBrands = brands.filter((b) => b.slug !== "blacksmith");
  const tags = [
    ...brands.map((b) => b.name),
    ...categories.map((c) => c.nameTh),
    ...product.compatibilities.slice(0, 2),
  ].filter((tag, i, all) => tag && all.findIndex((t) => t.toLowerCase() === tag.toLowerCase()) === i);

  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-2 lg:items-start lg:gap-14">
      <div className="min-w-0">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[3px] bg-steel md:aspect-square md:rounded-[3px]">
          {main ? (
            <Image
              src={main}
              alt={selected?.name ? `${product.nameTh} ${selected.name}` : product.nameTh}
              fill
              priority
              className="object-contain p-3 md:p-10"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          ) : null}
        </div>
        {gallery.length > 1 ? (
          <div
            className={`mt-3 flex w-full min-w-0 gap-2.5 overflow-x-auto overscroll-x-contain pb-1 snap-x snap-mandatory [scrollbar-width:thin] md:mt-4 md:grid md:gap-3 md:overflow-visible md:pb-0 md:snap-none ${
              thumbCols === 6 ? "md:grid-cols-6" : thumbCols === 5 ? "md:grid-cols-5" : "md:grid-cols-4"
            }`}
            aria-label="รูปสินค้า"
          >
            {gallery.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={() => setMain(src)}
                className={`relative aspect-square w-[4.75rem] shrink-0 snap-start overflow-hidden rounded-[3px] bg-steel md:w-auto md:min-w-0 ${
                  src === main ? "ring-2 ring-navy" : "ring-1 ring-transparent"
                }`}
                aria-label="ดูรูปนี้"
                aria-current={src === main ? "true" : undefined}
              >
                <Image src={src} alt="" fill className="object-contain p-1.5" sizes="120px" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <h1 className="text-2xl font-bold leading-snug text-navy md:text-3xl">{shortProductName(product.nameTh)}</h1>
        {stats && (stats.sold > 0 || stats.ratingCount > 0) ? (
          <dl className="num mt-4 inline-flex border border-navy/12 bg-white text-navy">
            {stats.ratingCount > 0 ? (
              <div className="border-r border-navy/12 px-3 py-2">
                <dt className="text-[11px] font-medium text-muted">คะแนนรีวิว ({stats.ratingCount})</dt>
                <dd className="text-sm font-semibold">
                  <span className="text-forge">{stats.rating.toFixed(1)}</span> / 5
                </dd>
              </div>
            ) : null}
            {stats.sold > 0 ? (
              <div className="px-3 py-2">
                <dt className="text-[11px] font-medium text-muted">ขายแล้ว</dt>
                <dd className="text-sm font-semibold">{stats.sold.toLocaleString("th-TH")} ชิ้น</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
        <p className="num mt-3 text-2xl font-semibold leading-none text-navy md:hidden">{formatTHB(price)}</p>

        {fitBrands.length > 0 ? (
          <p className="mt-4 inline-flex items-center bg-navy px-3 py-1.5 text-sm font-medium text-white">
            ใช้ได้กับ {fitBrands.map((b) => b.name).join(" · ")}
          </p>
        ) : null}

        {tags.length > 0 ? (
          <ul className="mt-5 flex flex-wrap gap-2.5">
            {tags.slice(0, 6).map((tag) => (
              <li
                key={tag}
                className="border border-navy/20 bg-white px-3 py-1 text-xs font-medium text-navy"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}

        {options.length > 0 && axes ? (
          <div className="mt-8 space-y-5">
            {axisValues.map((values, dim) => (
              <div key={dim}>
                <p className="text-sm font-bold text-navy">{dim === 0 ? "ขนาด / รุ่น" : "สี / แบบ"}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {values.map((value) => {
                    const active = picked[dim] === value;
                    const trial = [...picked];
                    trial[dim] = value;
                    const exact = !!findVariantByAxes(options, axes, trial);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => chooseAxis(dim, value)}
                        className={`min-h-12 rounded-none px-4 py-2.5 text-sm font-semibold ${
                          active
                            ? "bg-navy text-white"
                            : exact
                              ? "bg-white text-navy ring-1 ring-gray-200 hover:ring-navy"
                              : "bg-white text-muted ring-1 ring-dashed ring-gray-200"
                        }`}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : options.length > 0 ? (
          <div className="mt-8">
            <p className="text-sm font-bold text-navy">ตัวเลือก / SKU</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {options.map((v) => {
                const active = v.id === selected?.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariantId(v.id)}
                    className={`min-h-12 rounded-none px-4 py-3 text-left text-sm ${
                      active ? "bg-navy text-white" : "bg-white text-navy ring-1 ring-gray-200 hover:ring-navy"
                    }`}
                  >
                    <span className="block font-semibold leading-snug">{v.name || v.sku}</span>
                    <span className={`mt-1 block text-xs leading-none ${active ? "text-white/75" : "text-muted"}`}>
                      {formatTHB(v.price)}
                      {v.stock <= 0 ? " · หมด" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-end gap-8">
          <div>
            <p className="text-xs font-semibold text-muted">จำนวน</p>
            <div className="mt-2 inline-flex items-center border border-navy/25 bg-white">
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center"
                aria-label="ลดจำนวน"
                onClick={() => setQty((n) => Math.max(1, n - 1))}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-bold">{qty}</span>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center"
                aria-label="เพิ่มจำนวน"
                onClick={() => setQty((n) => Math.min(Math.max(stock, 1), n + 1))}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted">ราคา</p>
            <p className="num mt-1 text-4xl font-semibold leading-none text-navy">{formatTHB(price)}</p>
            {(product.variants?.length ?? 0) <= 1 && product.compareAtPrice && product.compareAtPrice > price ? (
              <p className="num mt-1.5 text-sm text-muted">
                <span className="line-through">{formatTHB(product.compareAtPrice)}</span>
                <span className="ml-2 font-semibold text-forge">
                  -{Math.round((1 - price / product.compareAtPrice) * 100)}%
                </span>
              </p>
            ) : null}
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-3 border border-navy/12 bg-white text-navy">
          {[
            ["สถานะ", stock > 0 ? (stock <= 5 ? `เหลือ ${stock} ชิ้น` : `พร้อมสั่ง ${stock}`) : "รอคิวพิมพ์"],
            ["จัดส่ง", "ภายใน 2 วัน"],
            ["ค่าส่ง", "฿35 · ฟรี ฿1,000+"],
          ].map(([k, v]) => (
            <div key={k} className="border-r border-navy/12 px-3 py-3 last:border-r-0">
              <dt className="text-[11px] font-medium text-muted">{k}</dt>
              <dd className="mt-1 text-sm font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="num mt-2 text-xs text-muted">SKU {sku}</p>

        <div className="safe-bottom sticky bottom-0 z-20 mt-6 grid grid-cols-2 gap-4 bg-background py-4 md:static md:bg-transparent md:py-0">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canBuy}
            onClick={buyNow}
          >
            <Zap className="h-4 w-4" aria-hidden />
            {canBuy ? "ซื้อเลย" : "รอคิวพิมพ์"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!canBuy}
            onClick={() => addToCart(true)}
          >
            <ShoppingCart className="h-4 w-4" aria-hidden />
            ใส่ตะกร้า
          </button>
        </div>

        <div className="mt-6">
          <MarketplaceButtons
            shopeeUrl={product.shopeeUrl}
            lazadaUrl={product.lazadaUrl}
            tiktokUrl={product.tiktokUrl}
          />
        </div>

        <div className="mt-8 divide-y border-y">
          <details
            className="group py-4"
            open={openDesc}
            onToggle={(e) => setOpenDesc((e.target as HTMLDetailsElement).open)}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-navy">
              รายละเอียดทั้งหมด
              <ChevronDown className={`h-4 w-4 transition ${openDesc ? "rotate-180" : ""}`} />
            </summary>
            <ProductDetailSections sections={detailSections} />
          </details>
          <details
            className="group py-4"
            open={openShip}
            onToggle={(e) => setOpenShip((e.target as HTMLDetailsElement).open)}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-navy">
              การจัดส่ง
              <ChevronDown className={`h-4 w-4 transition ${openShip ? "rotate-180" : ""}`} />
            </summary>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-navy/80">
              <li>ค่าส่ง 35 บาท ทุกออเดอร์</li>
              <li>ส่งฟรีเมื่อยอดสินค้าครบ 1,000 บาท</li>
              <li>พิมพ์ตามออเดอร์ ระยะเตรียมส่ง 2 วัน</li>
              <li>เจล GoopOrange เป็นสินค้าพร้อมส่ง</li>
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}
