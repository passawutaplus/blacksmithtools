import Image from "next/image";
import Link from "next/link";
import { Printer, ShieldCheck, Truck, Wrench } from "lucide-react";
import { listProducts, getSettings } from "@/lib/db";
import { pickCollectionProducts, storefrontCategories } from "@/lib/collections";
import { CategoryShowcase } from "@/components/CategoryShowcase";
import { HeroBrandSlider } from "@/components/HeroBrandSlider";

export default async function HomePage() {
  const [{ products: all, categories }, settings] = await Promise.all([listProducts(), getSettings()]);
  const navCats = storefrontCategories(categories);
  const modules = navCats
    .map((category) => {
      const matched = all.filter((p) => p.categoryIds.includes(category.id));
      return {
        category,
        total: matched.length,
        products: pickCollectionProducts(all, category.id, 5),
      };
    })
    .filter((m) => m.products.length > 0);

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.shopName,
    slogan: settings.tagline,
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    logo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/brand/logo.png`,
    sameAs: [settings.shopeeShopUrl, settings.lazadaShopUrl, settings.lineUrl].filter(Boolean),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />

      <section className="relative isolate min-h-dvh overflow-hidden">
        <Image
          src="/hero/farm.png"
          alt=""
          fill
          priority
          className="hero-zoom hidden object-cover object-center md:block"
          sizes="100vw"
        />
        <Image
          src="/hero/farm-portrait.png"
          alt=""
          fill
          priority
          className="hero-zoom object-cover object-center md:hidden"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/75 to-navy/35 md:bg-gradient-to-r md:from-navy md:via-navy/70 md:to-navy/10" />
        <div className="container-bs relative flex min-h-dvh items-end pb-48 pt-28 md:items-center md:pb-56 md:pt-32">
          <div className="max-w-xl text-white">
            <p className="text-sm font-semibold tracking-wide text-forge">แบรนด์คนไทย</p>
            <h1 className="mt-2 text-3xl font-black leading-tight md:text-5xl">
              อุปกรณ์เสริมเครื่องมือช่าง
            </h1>
            <p className="mt-4 text-base text-white/85 md:text-lg">
              ที่เก็บแบต จิ๊ก ถาดกล่อง และท่อเป่าลมให้เข้ากับ Milwaukee, Dewalt, Makita, Bosch
              — ใช้งานง่ายขึ้นในไซต์งานจริง
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className="btn btn-primary">
                ช้อปทั้งหมด
              </Link>
              <Link
                href="/custom-print"
                className="btn border-white/35 bg-white/10 text-white hover:bg-white/20"
              >
                พิมพ์ 3D ตามสั่ง
              </Link>
            </div>
          </div>
        </div>
        <HeroBrandSlider />
      </section>

      <section className="border-y border-steel bg-white">
        <div className="container-bs grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Truck, t: "ส่งใน 2 วัน", d: "พิมพ์ตามออเดอร์ ค่าส่ง 35 บาท ส่งฟรีครบ 1,000" },
            { icon: ShieldCheck, t: "เคลมทาง LINE", d: "งานพิมพ์มีปัญหา แจ้งรูปแล้วร้านพิมพ์ใหม่" },
            { icon: Printer, t: "P2S 6 เครื่อง", d: "พิมพ์เส้นพร้อมกันได้ ไม่รอคิวเครื่องเดียว" },
            { icon: Wrench, t: "เข้ากับรุ่นจริง", d: "ระบุ M18, TStak, Packout บนหน้าสินค้า" },
          ].map((item) => (
            <div key={item.t} className="flex gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-steel">
                <item.icon className="h-5 w-5 text-forge" aria-hidden />
              </span>
              <div>
                <p className="font-semibold text-navy">{item.t}</p>
                <p className="mt-0.5 text-sm text-muted">{item.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-bs py-10 md:py-12">
        <p className="text-sm font-semibold text-forge">หมวดสินค้า</p>
        <h2 className="mt-1 text-2xl font-bold text-navy">เลือกงานที่ใช่</h2>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {modules.map(({ category, total, products }) => (
            <Link
              key={category.id}
              href={`/shop?category=${category.slug}`}
              className="card overflow-hidden px-3 py-3 text-center hover:ring-1 hover:ring-navy/20"
            >
              <p className="line-clamp-2 text-sm font-bold text-navy">{category.name}</p>
              <p className="mt-1 text-xs text-muted">{total || products.length} รายการ</p>
            </Link>
          ))}
        </div>
      </section>

      {modules.map((mod) => (
        <CategoryShowcase
          key={mod.category.id}
          category={mod.category}
          products={mod.products}
          total={mod.total}
        />
      ))}

      <section className="container-bs pb-16">
        <Link href="/custom-print" className="card relative flex min-h-40 overflow-hidden bg-navy text-white">
          <Image src="/print/p2s-farm.png" alt="" fill className="object-cover opacity-35" sizes="1200px" />
          <div className="relative flex flex-col justify-end p-6 md:p-8">
            <p className="text-xs font-semibold text-forge">งานพิมพ์</p>
            <p className="mt-1 text-2xl font-black">พิมพ์ 3D ตามสั่ง</p>
            <p className="mt-1 max-w-xl text-sm text-white/80">จิ๊ก ที่เก็บ และอะไหล่ที่ของแท้มักไม่มี — P2S 6 เครื่องพร้อมรับงาน</p>
          </div>
        </Link>
      </section>
    </>
  );
}
