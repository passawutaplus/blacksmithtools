import Image from "next/image";
import Link from "next/link";
import { listProducts, getSettings, listPublishedReviews } from "@/lib/db";
import { ReviewSection } from "@/components/ReviewSection";
import { pickCollectionProducts, storefrontCategories } from "@/lib/collections";
import { CategoryShowcase } from "@/components/CategoryShowcase";
import { HeroBrandSlider } from "@/components/HeroBrandSlider";

export default async function HomePage() {
  const [{ products: all, categories }, settings, reviews] = await Promise.all([
    listProducts(),
    getSettings(),
    listPublishedReviews(),
  ]);
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
    sameAs: [
      settings.shopeeShopUrl,
      settings.lazadaShopUrl,
      settings.tiktokShopUrl,
      settings.tiktokSocialUrl,
      settings.facebookUrl,
      settings.lineUrl,
    ].filter((url, i, all) => Boolean(url) && all.indexOf(url) === i),
    ...(settings.shopeeRating > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: settings.shopeeRating,
            bestRating: 5,
            ...(settings.shopeeReviewCount > 0 ? { ratingCount: settings.shopeeReviewCount } : {}),
          },
        }
      : {}),
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
            <p className="eyebrow !text-steel before:!bg-forge">Thai-made · 3D printed PETG</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight md:text-5xl">
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

      <section className="bg-navy text-white">
        <div className="container-bs grid grid-cols-2 divide-white/15 lg:grid-cols-4 lg:divide-x">
          {[
            { k: "2 วัน", t: "ส่งไว", d: "พิมพ์ตามออเดอร์ ค่าส่ง 35 บาท ส่งฟรีครบ 1,000" },
            { k: "LINE", t: "เคลมง่าย", d: "งานพิมพ์มีปัญหา แจ้งรูปแล้วร้านพิมพ์ใหม่" },
            { k: "× 6", t: "เครื่องพิมพ์ P2S", d: "พิมพ์พร้อมกันได้ ไม่รอคิวเครื่องเดียว" },
            { k: "M18", t: "เข้ากับรุ่นจริง", d: "ระบุรุ่น TStak, Packout บนหน้าสินค้า" },
          ].map((item) => (
            <div key={item.t} className="border-b border-white/10 px-1 py-6 lg:border-b-0 lg:px-6 lg:first:pl-0">
              <p className="num text-3xl font-semibold leading-none text-white">{item.k}</p>
              <p className="mt-3 text-sm font-semibold text-steel">{item.t}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/65">{item.d}</p>
            </div>
          ))}
        </div>
        <div className="h-1 bg-forge" aria-hidden />
      </section>

      <ReviewSection reviews={reviews.slice(0, 6)} settings={settings} />

      <section className="container-bs py-10 md:py-12">
        <p className="eyebrow">Categories</p>
        <h2 className="mt-2 text-2xl font-bold text-navy">เลือกตามงาน</h2>
        <div className="mt-5 grid grid-cols-2 border-l border-t border-navy/12 sm:grid-cols-3 lg:grid-cols-5">
          {modules.map(({ category, total, products }) => (
            <Link
              key={category.id}
              href={`/shop?category=${category.slug}`}
              className="group flex items-center justify-between gap-2 border-b border-r border-navy/12 bg-white px-4 py-4 hover:bg-navy"
            >
              <span>
                <span className="line-clamp-2 text-sm font-semibold text-navy group-hover:text-white">{category.name}</span>
                <span className="num mt-0.5 block text-xs text-muted group-hover:text-white/70">{total || products.length} items</span>
              </span>
              <span aria-hidden className="num text-forge group-hover:text-white">→</span>
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
            <p className="eyebrow !text-steel before:!bg-forge">Custom print</p>
            <p className="mt-2 text-2xl font-bold">พิมพ์ 3D ตามสั่ง</p>
            <p className="mt-1 max-w-xl text-sm text-white/80">จิ๊ก ที่เก็บ และอะไหล่ที่ของแท้มักไม่มี — P2S 6 เครื่องพร้อมรับงาน</p>
          </div>
        </Link>
      </section>
    </>
  );
}
