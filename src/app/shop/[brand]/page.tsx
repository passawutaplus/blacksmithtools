import { notFound } from "next/navigation";
import { listProducts, getBrandsAndCategories } from "@/lib/db";
import { ProductCard } from "@/components/ProductCard";
import { BrandLogo } from "@/components/BrandLogo";
import { PageHeader } from "@/components/PageHeader";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brand: string }>;
}): Promise<Metadata> {
  const { brand: slug } = await params;
  const { brands } = await getBrandsAndCategories();
  const brand = brands.find((b) => b.slug === slug);
  if (!brand) return { title: "ไม่พบยี่ห้อ" };
  const own = brand.slug === "blacksmith";
  return {
    title: own ? `สินค้าแบรนด์ ${brand.name}` : `อุปกรณ์สำหรับ ${brand.name}`,
    description: own
      ? `สินค้าแบรนด์ BlackSmith เช่น GoopOrange และอุปกรณ์อเนกประสงค์`
      : `อุปกรณ์เสริม BlackSmith ที่เข้ากับเครื่องมือ ${brand.name} โดยเฉพาะ`,
  };
}

export default async function BrandShopPage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand: slug } = await params;
  const { brands } = await getBrandsAndCategories();
  const brand = brands.find((b) => b.slug === slug);
  if (!brand) notFound();

  const { products } = await listProducts({ brand: slug });
  const own = brand.slug === "blacksmith";

  return (
    <>
      <PageHeader
        title={brand.name}
        description={
          own
            ? "สินค้าที่ออกแบบและผลิตภายใต้แบรนด์ BlackSmith เช่น เจลล้างมือและอุปกรณ์อเนกประสงค์"
            : `สินค้า BlackSmith ที่ออกแบบให้เข้ากับระบบ ${brand.name} โดยเฉพาะ — ไม่ใช่ร้านทางการของ ${brand.name}`
        }
        crumbs={[
          { href: "/", label: "หน้าแรก" },
          { href: "/shop", label: "สินค้า" },
          { label: brand.name },
        ]}
      />
      <div className="container-bs py-8 md:py-10">
        {brand.logoUrl ? (
          <div className="mb-8 flex items-center">
            <BrandLogo
              brand={brand}
              decorative
              className={
                brand.slug === "blacksmith"
                  ? "h-28 w-28 shadow-[0_8px_30px_rgba(35,50,61,0.12)]"
                  : "h-10 w-auto max-w-[180px] object-contain"
              }
            />
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        {products.length === 0 ? (
          <p className="mt-8 text-muted">ยังไม่มีสินค้าในหมวดนี้</p>
        ) : null}
      </div>
    </>
  );
}