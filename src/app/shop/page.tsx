import Link from "next/link";
import catalog from "@/data/shopee-catalog.json";
import { listProducts } from "@/lib/db";
import { seedProducts } from "@/lib/seed";
import { ProductCard } from "@/components/ProductCard";
import { BrandLogo } from "@/components/BrandLogo";
import { PageHeader } from "@/components/PageHeader";
import { storefrontCategories } from "@/lib/collections";

export const metadata = {
  title: "สินค้าทั้งหมด",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; brand?: string }>;
}) {
  const sp = await searchParams;
  const { products, brands, categories } = await listProducts({
    q: sp.q,
    category: sp.category,
    brand: sp.brand,
  });
  const activeCat = categories.find((c) => c.slug === sp.category);
  const activeBrand = brands.find((b) => b.slug === sp.brand);
  const navCategories = storefrontCategories(categories);

  return (
    <>
      <PageHeader
        title={activeCat?.nameTh ?? "สินค้าทั้งหมด"}
        description={`${seedProducts.length} รายการ · ${catalog.variantCount} SKU · พิมพ์ตามออเดอร์ ส่งใน 2 วัน · ค่าส่ง 35 บาท ส่งฟรีเมื่อครบ 1,000 บาท`}
        crumbs={[
          { href: "/", label: "หน้าแรก" },
          { href: "/shop", label: "สินค้า" },
          ...(activeCat ? [{ label: activeCat.nameTh }] : []),
          ...(activeBrand ? [{ label: activeBrand.name }] : []),
          ...(sp.q ? [{ label: `ค้นหา “${sp.q}”` }] : []),
        ]}
      />

      <div className="container-bs py-8 md:py-10">
        <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
          <aside className="hidden min-w-0 lg:block">
            <div className="sticky top-36 space-y-8">
              <div>
                <p className="mb-3 text-sm font-semibold text-navy">หมวดสินค้า</p>
                <ul className="space-y-1 text-sm">
                  <li>
                    <Link
                      href="/shop"
                      className={`block rounded-full px-3 py-1.5 ${!sp.category ? "bg-steel font-semibold text-navy" : "text-muted hover:bg-steel/70 hover:text-navy"}`}
                    >
                      ทั้งหมด
                    </Link>
                  </li>
                  {navCategories.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/shop?category=${c.slug}`}
                        className={`block rounded-full px-3 py-1.5 ${sp.category === c.slug ? "bg-steel font-semibold text-navy" : "text-muted hover:bg-steel/70 hover:text-navy"}`}
                      >
                        {c.nameTh}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="min-w-0">
                <p className="mb-3 text-sm font-semibold text-navy">ยี่ห้อที่เข้ากันได้</p>
                <ul className="grid grid-cols-2 gap-2">
                  {brands.map((b) => (
                    <li key={b.id} className="min-w-0">
                      <Link
                        href={`/shop/${b.slug}`}
                        className="card flex h-[4.75rem] min-w-0 flex-col items-center justify-center gap-1 overflow-hidden px-2 hover:ring-1 hover:ring-navy/20"
                      >
                        <span className="flex h-8 w-full items-center justify-center overflow-hidden">
                          <BrandLogo brand={b} decorative className="h-8 w-auto max-h-8 max-w-full" />
                        </span>
                        <span className="w-full truncate text-center text-[11px] text-muted">{b.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>

          <div>
            <form className="flex flex-col gap-3 sm:flex-row lg:max-w-xl" action="/shop">
              <input name="q" defaultValue={sp.q} placeholder="ค้นหา เช่น Milwaukee M18" className="input" />
              <select name="brand" defaultValue={sp.brand ?? ""} className="input sm:max-w-[180px] lg:hidden">
                <option value="">ทุกยี่ห้อ</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.slug}>
                    {b.name}
                  </option>
                ))}
              </select>
              <select name="category" defaultValue={sp.category ?? ""} className="input sm:max-w-[200px] lg:hidden">
                <option value="">ทุกประเภท</option>
                {navCategories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.nameTh}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn-primary shrink-0">
                กรอง
              </button>
            </form>

            <p className="mt-6 text-sm text-muted">พบ {products.length} รายการ</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {products.length === 0 ? (
              <p className="mt-8 text-center text-muted">ไม่พบสินค้า — ลองเปลี่ยนคำค้นหา</p>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
