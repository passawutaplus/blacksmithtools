import { notFound } from "next/navigation";
import { listProducts, getBrandsAndCategories } from "@/lib/db";
import { ProductCard } from "@/components/ProductCard";
import { BrandLogo } from "@/components/BrandLogo";
import { PageHeader } from "@/components/PageHeader";
import type { Metadata } from "next";
import { jsonLd } from "@/lib/json-ld";
import { shortProductName } from "@/lib/product";
import { OG_BASE, breadcrumbLd, collectionLd } from "@/lib/seo";
import { toCardProduct } from "@/lib/card-product";

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
  const title = own ? `สินค้าแบรนด์ ${brand.name}` : `อุปกรณ์เสริมใช้ได้กับ ${brand.name}`;
  const description = own
    ? "สินค้าแบรนด์ BlackSmith เจลล้างมือช่าง GoopOrange และอุปกรณ์อเนกประสงค์ ออกแบบและผลิตโดยแบรนด์คนไทย สั่งซื้อในเว็บได้เลย"
    : `อุปกรณ์เสริมพิมพ์ 3D จาก BlackSmith ใช้ได้กับเครื่องมือและกล่อง ${brand.name} ทั้งที่แขวน ที่เก็บแบต ถาดเสริม และท่อเป่าลม ออกแบบโดยแบรนด์คนไทย`;
  return {
    title,
    description,
    alternates: { canonical: `/shop/${brand.slug}` },
    openGraph: { ...OG_BASE, type: "website", title, description },
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
  const listName = own ? `สินค้าแบรนด์ ${brand.name}` : `อุปกรณ์เสริมใช้ได้กับ ${brand.name}`;
  const ld = [
    collectionLd(
      listName,
      own ? "สินค้าแบรนด์ BlackSmith" : `อุปกรณ์เสริม BlackSmith ใช้ได้กับ ${brand.name}`,
      `/shop/${brand.slug}`,
      products.map((p) => ({ name: shortProductName(p.nameTh), path: `/product/${encodeURI(p.slug)}` })),
    ),
    breadcrumbLd([
      ["หน้าแรก", "/"],
      ["ร้านค้า", "/shop"],
      [brand.name, `/shop/${brand.slug}`],
    ]),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
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
                  ? "h-28 w-28"
                  : "h-10 w-auto max-w-[180px] object-contain"
              }
            />
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={toCardProduct(p)} />
          ))}
        </div>
        {products.length === 0 ? (
          <p className="mt-8 text-muted">ยังไม่มีสินค้าในหมวดนี้</p>
        ) : null}
      </div>
    </>
  );
}