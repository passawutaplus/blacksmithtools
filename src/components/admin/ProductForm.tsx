"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { nanoid } from "nanoid";
import {
  Copy,
  FileText,
  ImageIcon,
  Layers,
  Link2,
  Package,
  Pin,
  Plus,
  Save,
  Search,
  Store,
  Tag,
  Trash2,
  Wallet,
  Wrench,
} from "lucide-react";
import { adminJson } from "@/lib/admin-client";
import type { Brand, Category, Product, ProductVariant } from "@/lib/types";
import { formatTHB } from "@/lib/utils";

type Draft = {
  id: string;
  name: string;
  sku: string;
  price: string;
  stock: string;
  imageUrl: string;
};

function toDraft(v: ProductVariant): Draft {
  return {
    id: v.id,
    name: v.name ?? "",
    sku: v.sku ?? "",
    price: String(v.price ?? ""),
    stock: String(v.stock ?? "0"),
    imageUrl: v.imageUrl ?? "",
  };
}

function blankDraft(price: string, sku: string): Draft {
  return {
    id: `v-${nanoid(8)}`,
    name: "",
    sku,
    price,
    stock: "0",
    imageUrl: "",
  };
}

function Section({
  id,
  icon: Icon,
  title,
  hint,
  children,
}: {
  id: string;
  icon: typeof Package;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-lg border border-gray-200 bg-white p-4 md:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy text-white">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-base font-bold text-navy">{title}</h2>
          {hint ? <p className="mt-0.5 text-sm text-muted">{hint}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Chip({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label
      className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-sm ${
        checked ? "border-navy bg-navy text-white" : "border-gray-200 bg-white text-navy hover:border-navy"
      }`}
    >
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      {children}
    </label>
  );
}

export function ProductForm({
  product,
  brands,
  categories,
}: {
  product?: Product;
  brands: Brand[];
  categories: Category[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [nameTh, setNameTh] = useState(product?.nameTh ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [stock, setStock] = useState(String(product?.stock ?? "0"));
  const [description, setDescription] = useState(product?.description ?? "");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [imagesText, setImagesText] = useState((product?.images ?? []).join("\n"));
  const [compat, setCompat] = useState((product?.compatibilities ?? []).join(", "));
  const [brandIds, setBrandIds] = useState<string[]>(product?.brandIds ?? []);
  const [categoryIds, setCategoryIds] = useState<string[]>(product?.categoryIds ?? []);
  const [featured, setFeatured] = useState(!!product?.featured);
  const [shopeeUrl, setShopeeUrl] = useState(product?.shopeeUrl ?? "");
  const [lazadaUrl, setLazadaUrl] = useState(product?.lazadaUrl ?? "");
  const [tiktokUrl, setTiktokUrl] = useState(product?.tiktokUrl ?? "");
  const [variants, setVariants] = useState<Draft[]>((product?.variants ?? []).map(toDraft));
  const [variantQ, setVariantQ] = useState("");

  const hasOptions = variants.length > 0;
  const totals = useMemo(() => {
    if (!hasOptions) return { min: Number(price) || 0, max: Number(price) || 0, stock: Number(stock) || 0 };
    const prices = variants.map((v) => Number(v.price)).filter((n) => Number.isFinite(n));
    const stocks = variants.map((v) => Number(v.stock)).filter((n) => Number.isFinite(n) && n > 0);
    return {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
      stock: stocks.reduce((s, n) => s + n, 0),
    };
  }, [hasOptions, variants, price, stock]);

  const galleryPreview = useMemo(() => {
    const extra = imagesText
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return [...new Set([imageUrl.trim(), ...extra].filter(Boolean))].slice(0, 8);
  }, [imageUrl, imagesText]);

  const visibleVariants = variants.filter((v) => {
    if (!variantQ.trim()) return true;
    const q = variantQ.trim().toLowerCase();
    return `${v.name} ${v.sku}`.toLowerCase().includes(q);
  });

  function toggle(list: string[], id: string, set: (v: string[]) => void) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  function patchVariant(id: string, patch: Partial<Draft>) {
    setVariants((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const gallery = imagesText
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const mainImage = imageUrl || gallery[0] || "";
      const images = [...new Set([mainImage, ...gallery].filter(Boolean))];
      const data = await adminJson<{ product: Product }>("/api/admin", {
        method: "POST",
        body: JSON.stringify({
          action: "upsert_product",
          product: {
            id: product?.id,
            nameTh,
            name: name || nameTh,
            sku,
            slug,
            price: hasOptions ? totals.min : Number(price),
            stock: hasOptions ? totals.stock : Number(stock),
            description,
            imageUrl: mainImage,
            images,
            compatibilities: compat
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            brandIds,
            categoryIds,
            featured,
            shopeeUrl: shopeeUrl || null,
            lazadaUrl: lazadaUrl || null,
            tiktokUrl: tiktokUrl || null,
            variants: variants.map((v) => ({
              id: v.id,
              name: v.name.trim(),
              sku: v.sku.trim() || sku,
              price: Number(v.price),
              stock: Number(v.stock),
              imageUrl: v.imageUrl.trim() || null,
            })),
          },
        }),
      });
      router.push(`/admin/products/${data.product.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const jumps = [
    { href: "#info", label: "ข้อมูล" },
    { href: "#media", label: "รูป" },
    { href: "#price", label: "ราคา" },
    { href: "#options", label: "ตัวเลือก" },
    { href: "#classify", label: "หมวด" },
    { href: "#channels", label: "ช่องทางขาย" },
  ];

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4 pb-24">
      <div className="flex flex-wrap gap-2">
        {jumps.map((j) => (
          <a
            key={j.href}
            href={j.href}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:border-navy"
          >
            {j.label}
          </a>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <Section id="info" icon={Package} title="ข้อมูลสินค้า" hint="ชื่อที่ลูกค้าเห็นบนหน้าร้าน และรหัสอ้างอิง">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="label" htmlFor="nameTh">
              ชื่อสินค้า (ไทย)
            </label>
            <input
              id="nameTh"
              className="input"
              value={nameTh}
              onChange={(e) => setNameTh(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="name">
              ชื่อภาษาอังกฤษ
            </label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="sku">
              SKU หลัก
            </label>
            <input id="sku" className="input" value={sku} onChange={(e) => setSku(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="label" htmlFor="slug">
              Slug URL
            </label>
            <input id="slug" className="input font-mono text-sm" value={slug} onChange={(e) => setSlug(e.target.value)} />
            <p className="mt-1 text-xs text-muted">ใช้ในลิงก์หน้าร้าน · ไม่ต้องใส่ /product/</p>
          </div>
        </div>
      </Section>

      <Section id="media" icon={ImageIcon} title="รูปสินค้า" hint="วางลิงก์รูปจาก Shopee ได้เลย ระบบจะพรีวิวให้">
        <div className="grid gap-4 lg:grid-cols-[160px_1fr]">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-steel ring-1 ring-gray-200">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="h-full w-full object-contain p-2" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted">ยังไม่มีรูปหลัก</div>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <label className="label" htmlFor="imageUrl">
                URL รูปหลัก
              </label>
              <input
                id="imageUrl"
                className="input"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://cf.shopee.co.th/file/..."
              />
            </div>
            <div>
              <label className="label" htmlFor="imagesText">
                รูปเพิ่ม (หนึ่ง URL ต่อบรรทัด)
              </label>
              <textarea
                id="imagesText"
                className="input min-h-[88px] font-mono text-xs"
                value={imagesText}
                onChange={(e) => setImagesText(e.target.value)}
              />
            </div>
          </div>
        </div>
        {galleryPreview.length > 1 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {galleryPreview.map((src) => (
              <button
                key={src}
                type="button"
                className={`h-16 w-16 overflow-hidden rounded-lg bg-steel ring-1 ${
                  src === imageUrl ? "ring-navy" : "ring-gray-200"
                }`}
                onClick={() => setImageUrl(src)}
                title="ตั้งเป็นรูปหลัก"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-contain p-1" />
              </button>
            ))}
          </div>
        ) : null}
      </Section>

      <Section id="price" icon={Wallet} title="ราคาและสต็อก" hint="ถ้ามีตัวเลือก ระบบจะรวมให้อัตโนมัติ">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="price">
              ราคาเริ่มต้น (บาท)
            </label>
            <input
              id="price"
              className="input"
              type="number"
              min={0}
              step="1"
              value={hasOptions ? String(totals.min) : price}
              onChange={(e) => setPrice(e.target.value)}
              required={!hasOptions}
              readOnly={hasOptions}
            />
            {hasOptions ? (
              <p className="mt-1 text-xs text-muted">
                ถูกสุด {formatTHB(totals.min)}
                {totals.max > totals.min ? ` · แพงสุด ${formatTHB(totals.max)}` : ""}
              </p>
            ) : null}
          </div>
          <div>
            <label className="label" htmlFor="stock">
              สต็อกรวม
            </label>
            <input
              id="stock"
              className="input"
              type="number"
              min={0}
              step="1"
              value={hasOptions ? String(totals.stock) : stock}
              onChange={(e) => setStock(e.target.value)}
              required={!hasOptions}
              readOnly={hasOptions}
            />
            {hasOptions ? <p className="mt-1 text-xs text-muted">รวมจากทุกตัวเลือก</p> : null}
          </div>
        </div>
      </Section>

      <Section id="copy" icon={FileText} title="รายละเอียด" hint="ข้อความบนหน้าร้าน และรุ่นที่ใช้ด้วย">
        <div>
          <label className="label" htmlFor="description">
            คำอธิบาย
          </label>
          <textarea
            id="description"
            className="input min-h-[140px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="mt-4">
          <label className="label" htmlFor="compat">
            ใช้กับรุ่น
          </label>
          <input
            id="compat"
            className="input"
            value={compat}
            onChange={(e) => setCompat(e.target.value)}
            placeholder="Milwaukee M18, Dewalt TStak"
          />
          <p className="mt-1 text-xs text-muted">คั่นด้วยจุลภาค</p>
        </div>
      </Section>

      <Section
        id="options"
        icon={Layers}
        title="ตัวเลือกสินค้า / SKU"
        hint="สี ขนาด ปากท่อ แพ็ก — แต่ละแถวคือสิ่งที่ลูกค้ากดเลือกได้"
      >
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[180px] flex-1">
            <label className="label" htmlFor="vq">
              ค้นหาตัวเลือก
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                id="vq"
                className="input pl-9"
                value={variantQ}
                onChange={(e) => setVariantQ(e.target.value)}
                placeholder="ชื่อ หรือ SKU"
              />
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setVariants((rows) => [...rows, blankDraft(price || "0", sku)])}
          >
            <Plus className="h-4 w-4" />
            เพิ่มตัวเลือก
          </button>
        </div>
        {variants.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-steel/50 px-4 py-8 text-center text-sm text-muted">
            ยังไม่มีตัวเลือก — สินค้าจะขายเป็น SKU เดียวตามราคาด้านบน
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="w-14">รูป</th>
                  <th>ชื่อตัวเลือก</th>
                  <th>SKU</th>
                  <th>ราคา</th>
                  <th>สต็อก</th>
                  <th>URL รูป</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleVariants.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <div className="h-11 w-11 overflow-hidden rounded bg-steel">
                        {v.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={v.imageUrl} alt="" className="h-full w-full object-contain" />
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <input
                        className="input min-h-9 py-1"
                        value={v.name}
                        onChange={(e) => patchVariant(v.id, { name: e.target.value })}
                        placeholder="เช่น ดำ / 60ml"
                      />
                    </td>
                    <td>
                      <input
                        className="input min-h-9 py-1 font-mono text-xs"
                        value={v.sku}
                        onChange={(e) => patchVariant(v.id, { sku: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="input min-h-9 w-24 py-1"
                        type="number"
                        min={0}
                        value={v.price}
                        onChange={(e) => patchVariant(v.id, { price: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="input min-h-9 w-20 py-1"
                        type="number"
                        min={0}
                        value={v.stock}
                        onChange={(e) => patchVariant(v.id, { stock: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="input min-h-9 py-1 font-mono text-xs"
                        value={v.imageUrl}
                        onChange={(e) => patchVariant(v.id, { imageUrl: e.target.value })}
                      />
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="btn btn-icon btn-sm btn-secondary"
                          aria-label="ทำซ้ำ"
                          title="ทำซ้ำ"
                          onClick={() =>
                            setVariants((rows) => [
                              ...rows,
                              { ...v, id: `v-${nanoid(8)}`, sku: v.sku ? `${v.sku}-copy` : "" },
                            ])
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-icon btn-sm btn-danger"
                          aria-label="ลบ"
                          title="ลบ"
                          onClick={() => setVariants((rows) => rows.filter((row) => row.id !== v.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">
              {visibleVariants.length !== variants.length
                ? `แสดง ${visibleVariants.length} จาก ${variants.length} ตัวเลือก`
                : `${variants.length} ตัวเลือก`}
            </p>
          </div>
        )}
      </Section>

      <Section id="classify" icon={Tag} title="หมวดและยี่ห้อ" hint="ใช้กรองบนหน้าร้าน และปักหมุดสินค้าแนะนำ">
        <div>
          <p className="label">หมวด</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Chip
                key={c.id}
                checked={categoryIds.includes(c.id)}
                onChange={() => toggle(categoryIds, c.id, setCategoryIds)}
              >
                {c.nameTh}
              </Chip>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <p className="label">ยี่ห้อที่ใช้ด้วย</p>
          <div className="flex flex-wrap gap-2">
            {brands.map((b) => (
              <Chip
                key={b.id}
                checked={brandIds.includes(b.id)}
                onChange={() => toggle(brandIds, b.id, setBrandIds)}
              >
                <Wrench className="mr-1.5 h-3.5 w-3.5" />
                {b.name}
              </Chip>
            ))}
          </div>
        </div>
        <label
          className={`mt-5 flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
            featured ? "border-forge bg-forge/5 text-navy" : "border-gray-200 bg-white"
          }`}
        >
          <Pin className={`h-4 w-4 ${featured ? "text-forge" : "text-muted"}`} />
          <input type="checkbox" className="sr-only" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
          <span>
            <span className="font-semibold">ปักหมุดสินค้าแนะนำ</span>
            <span className="mt-0.5 block text-xs text-muted">แสดงบนหน้าแรก</span>
          </span>
        </label>
      </Section>

      <Section id="channels" icon={Store} title="ช่องทางขายอื่น" hint="ปุ่มบนหน้าร้านจะโชว์เฉพาะลิงก์ที่มี">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label" htmlFor="shopee">
              <Link2 className="mr-1 inline h-3.5 w-3.5" />
              Shopee
            </label>
            <input id="shopee" className="input" value={shopeeUrl} onChange={(e) => setShopeeUrl(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="lazada">
              <Link2 className="mr-1 inline h-3.5 w-3.5" />
              Lazada
            </label>
            <input id="lazada" className="input" value={lazadaUrl} onChange={(e) => setLazadaUrl(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="tiktok">
              <Link2 className="mr-1 inline h-3.5 w-3.5" />
              TikTok
            </label>
            <input id="tiktok" className="input" value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} />
          </div>
        </div>
      </Section>

      <div className="safe-bottom sticky bottom-0 z-20 -mx-1 border-t border-gray-200 bg-steel/95 px-1 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {hasOptions ? `${variants.length} ตัวเลือก · จาก ${formatTHB(totals.min)}` : "SKU เดียว"}
          </p>
          <button type="submit" className="btn btn-primary min-w-[160px]" disabled={busy}>
            <Save className="h-4 w-4" />
            {busy ? "กำลังบันทึก…" : "บันทึกสินค้า"}
          </button>
        </div>
      </div>
    </form>
  );
}
