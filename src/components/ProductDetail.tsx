"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ListChecks, Minus, Plus, TriangleAlert } from "lucide-react";
import type { Brand, Category, Product } from "@/lib/types";
import { formatTHB } from "@/lib/utils";
import {
  findVariantByAxes,
  resolveVariant,
  selectableVariants,
  uniqueGallery,
  variantAxes,
} from "@/lib/product";
import { getProductCopy } from "@/lib/product-copy";
import { useCartStore } from "@/lib/cart-store";
import { MarketplaceButtons } from "@/components/MarketplaceButtons";

export function ProductDetail({
  product,
  brands,
  categories,
}: {
  product: Product;
  brands: Brand[];
  categories: Category[];
}) {
  const router = useRouter();
  const copy = useMemo(() => getProductCopy(product), [product]);
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

  const tags = [
    ...brands.map((b) => b.name),
    ...categories.map((c) => c.nameTh),
    ...product.compatibilities.slice(0, 2),
  ].filter((tag, i, all) => tag && all.findIndex((t) => t.toLowerCase() === tag.toLowerCase()) === i);

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-14">
      <div>
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-steel">
          {main ? (
            <Image
              src={main}
              alt={selected?.name ? `${product.nameTh} ${selected.name}` : product.nameTh}
              fill
              priority
              className="object-contain p-10"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          ) : null}
        </div>
        {gallery.length > 1 ? (
          <div
            className={`mt-4 grid grid-cols-4 gap-3 ${
              thumbCols === 6 ? "sm:grid-cols-6" : thumbCols === 5 ? "sm:grid-cols-5" : "sm:grid-cols-4"
            }`}
          >
            {gallery.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={() => setMain(src)}
                className={`relative aspect-square overflow-hidden rounded-xl bg-steel ${
                  src === main ? "ring-2 ring-navy" : "ring-1 ring-transparent"
                }`}
                aria-label="ดูรูปนี้"
              >
                <Image src={src} alt="" fill className="object-contain p-1.5" sizes="120px" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <nav className="text-xs text-muted">
          <Link href="/shop" className="hover:text-navy hover:underline">
            สินค้า
          </Link>
          {categories[0] ? (
            <>
              <span className="px-1.5">/</span>
              <Link href={`/shop?category=${categories[0].slug}`} className="hover:text-navy hover:underline">
                {categories[0].nameTh}
              </Link>
            </>
          ) : null}
          {brands[0] ? (
            <>
              <span className="px-1.5">/</span>
              <Link href={`/shop/${brands[0].slug}`} className="hover:text-navy hover:underline">
                {brands[0].name}
              </Link>
            </>
          ) : null}
        </nav>

        <h1 className="mt-5 text-2xl font-black leading-snug text-navy md:text-3xl">{product.nameTh}</h1>

        {tags.length > 0 ? (
          <ul className="mt-5 flex flex-wrap gap-2.5">
            {tags.slice(0, 6).map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-steel px-3.5 py-1.5 text-xs font-semibold text-navy"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}

        {copy.hook ? (
          <p className="mt-5 text-sm leading-7 text-navy/80">{copy.hook}</p>
        ) : null}

        {copy.highlights.length > 0 ? (
          <ul className="mt-6 space-y-3.5">
            {copy.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-navy">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forge/10 text-forge">
                  <h.icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="leading-6">{h.text}</span>
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
            <div className="mt-2 inline-flex items-center rounded-none bg-steel">
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
            <p className="mt-1 text-3xl font-black text-navy">{formatTHB(price)}</p>
            {product.compareAtPrice && product.compareAtPrice > price ? (
              <p className="mt-1 text-sm text-muted line-through">{formatTHB(product.compareAtPrice)}</p>
            ) : null}
          </div>
        </div>

        <p className="mt-4 text-sm text-muted">
          {stock > 0 ? `พร้อมสั่ง ${stock} ชิ้น` : "รอคิวพิมพ์"} · SKU {sku}
        </p>

        <div className="mt-6 rounded-2xl bg-steel px-5 py-4 text-sm text-navy">
          <p className="font-bold">ส่งฟรี เมื่อยอดครบ 1,000 บาท</p>
          <p className="mt-1.5 text-muted">ค่าส่ง 35 บาท · พิมพ์ตามออเดอร์ เตรียมส่งใน 2 วัน</p>
        </div>

        <div className="safe-bottom sticky bottom-0 z-20 mt-6 grid grid-cols-2 gap-4 bg-background py-4 md:static md:bg-transparent md:py-0">
          <button
            type="button"
            className="btn btn-navy"
            disabled={!canBuy}
            onClick={buyNow}
          >
            {canBuy ? "ซื้อเลย" : "รอคิวพิมพ์"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!canBuy}
            onClick={() => addToCart(true)}
          >
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

        {copy.howTo.length > 0 ? (
          <div className="mt-8 rounded-2xl bg-steel/60 p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-navy">
              <ListChecks className="h-4 w-4 text-forge" aria-hidden />
              วิธีใช้งาน
            </p>
            <ol className="mt-4 space-y-3.5">
              {copy.howTo.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-navy/85">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="leading-6">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {copy.specs.length > 0 ? (
          <div className="mt-6 rounded-2xl border border-steel p-5">
            <p className="text-sm font-bold text-navy">สเปกสินค้า</p>
            <dl className="mt-4 space-y-3">
              {copy.specs.map((spec) => (
                <div key={spec.label} className="flex gap-4 text-sm">
                  <dt className="w-28 shrink-0 text-muted">{spec.label}</dt>
                  <dd className="text-navy">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {copy.caution ? (
          <p className="mt-6 flex items-start gap-2.5 text-xs leading-6 text-muted">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forge" aria-hidden />
            {copy.caution}
          </p>
        ) : null}

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
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-navy/80">
              {product.description}
            </p>
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
