import { jsonLd as toJsonLd } from "@/lib/json-ld";
import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { listProducts, getSettings, listPublishedReviews } from "@/lib/db";
import { ReviewSection } from "@/components/ReviewSection";
import { LandingProductTile } from "@/components/LandingProductTile";
import { COLLECTION_BANNER } from "@/components/CategoryShowcase";
import { listArticles } from "@/lib/articles";
import { primaryBrandSlugs } from "@/lib/seed";
import { pickCollectionProducts, storefrontCategories } from "@/lib/collections";
import { HeroBrandSlider } from "@/components/HeroBrandSlider";

export const metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const [{ products: all, categories, brands }, settings, reviews] = await Promise.all([
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

  const brandTiles = primaryBrandSlugs
    .map((slug) => brands.find((b) => b.slug === slug))
    .filter((b): b is NonNullable<typeof b> => Boolean(b))
    .map((brand) => ({ brand, count: all.filter((p) => p.brandIds.includes(brand.id)).length }));
  const seen = new Set<string>();
  const featured = modules
    .filter((m) => !["hand-cleaner", "gooporange", "kleanboy", "other"].includes(m.category.slug))
    .flatMap((m, i) => (i === 0 ? m.products.slice(0, 2) : m.products.slice(0, 1)))
    .filter((p) => p && !seen.has(p.id) && seen.add(p.id))
    .slice(0, 8);
  const latest = (await listArticles()).find((a) => !a.draft && a.cover);

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(orgLd) }} />

      <section className="relative isolate min-h-[88svh] overflow-hidden">
        <Image src="/hero/farm.png" alt="" fill priority className="hero-zoom hidden object-cover object-center md:block" sizes="100vw" />
        <Image src="/hero/farm-portrait.png" alt="" fill priority className="hero-zoom object-cover object-center md:hidden" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/75 to-navy/35 md:bg-gradient-to-r md:from-navy md:via-navy/70 md:to-navy/10" />
        <div className="container-bs relative flex min-h-[88svh] items-end pb-44 pt-24 md:items-center md:pb-56 md:pt-32">
          <div className="max-w-xl text-white">
            <p className="eyebrow !text-steel before:!bg-forge">Thai-made · 3D printed PETG</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight md:text-5xl">อุปกรณ์เสริมเครื่องมือช่าง<span className="mt-1 block text-white/90">ออกแบบให้เข้ากับของจริง</span></h1>
            <p className="mt-4 text-base text-white/85 md:text-lg">
              ที่เก็บแบต จิ๊ก ถาดกล่อง และท่อเป่าลมสำหรับ Milwaukee, Dewalt, Makita, Bosch
              ออกแบบและพิมพ์ในไทย ใช้งานง่ายขึ้นในไซต์งานจริง
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className="btn btn-primary">ดูสินค้าทั้งหมด</Link>
              <a href="#by-brand" className="btn border-white/35 bg-white/10 text-white hover:bg-white/20">เลือกตามยี่ห้อเครื่องมือ</a>
            </div>
          </div>
        </div>
        <HeroBrandSlider />
      </section>

      <section className="bg-navy text-white">
        <div className="container-bs grid grid-cols-2 divide-white/15 lg:grid-cols-4 lg:divide-x">
          {[
            { k: "2 วัน", t: "ส่งไว", d: "พิมพ์ตามออเดอร์ ส่งฟรีเมื่อซื้อครบ 1,000 บาท" },
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

      <section id="by-brand" className="container-bs scroll-mt-32 py-12 md:py-16">
        <p className="eyebrow">Step 1</p>
        <h2 className="mt-2 text-2xl font-bold text-navy md:text-3xl">คุณใช้เครื่องมือยี่ห้อไหน</h2>
        <p className="mt-2 max-w-xl text-sm text-muted">เลือกยี่ห้อ แล้วดูอุปกรณ์ที่ออกแบบให้พอดีกับรุ่นของคุณ</p>
        <div className="mt-6 grid grid-cols-2 border-l border-t border-navy/12 sm:grid-cols-3 lg:grid-cols-6">
          {brandTiles.map(({ brand, count }) => (
            <Link key={brand.id} href={`/shop/${brand.slug}`} className="group flex flex-col items-center justify-center gap-3 border-b border-r border-navy/12 bg-white px-3 py-8 hover:bg-navy">
              <BrandLogo brand={brand} decorative className="h-9 w-auto max-w-[8rem] object-contain group-hover:brightness-0 group-hover:invert" />
              <span className="num text-xs text-muted group-hover:text-white/70">{count} items</span>
            </Link>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          ยังมี Hikoki, Ingco, Total, Skil, Ryobi และอื่น ๆ — <Link href="/shop" className="font-semibold text-navy underline underline-offset-2">ดูทั้งหมด</Link>
        </p>
      </section>

      <section className="bg-white py-12 md:py-16">
        <div className="container-bs">
          <p className="eyebrow">Step 2</p>
          <h2 className="mt-2 text-2xl font-bold text-navy md:text-3xl">หรือเลือกตามงานที่อยากจัดระเบียบ</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {modules.slice(0, 8).map(({ category, total }) => (
              <Link key={category.id} href={`/shop?category=${category.slug}`} className="group relative block aspect-[4/3] overflow-hidden bg-navy text-white">
                {COLLECTION_BANNER[category.slug] ? (
                  <Image src={COLLECTION_BANNER[category.slug]} alt="" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover opacity-55 transition duration-500 group-hover:scale-[1.04] group-hover:opacity-70" />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4">
                  <div>
                    <h3 className="text-base font-semibold leading-tight text-white">{category.name}</h3>
                    <p className="num mt-0.5 text-xs text-white/70">{total} items</p>
                  </div>
                  <span aria-hidden className="num text-white">→</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6">
            <Link href="/shop" className="btn btn-secondary">ดูสินค้าและราคาทั้งหมด</Link>
          </div>
        </div>
      </section>

      <section className="container-bs py-12 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Featured</p>
            <h2 className="mt-2 text-2xl font-bold text-navy md:text-3xl">สินค้าแนะนำ</h2>
          </div>
          <Link href="/shop" className="text-sm font-semibold text-navy underline underline-offset-4">ดูทั้งหมด →</Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {featured.map((p) => (
            <LandingProductTile key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="bg-navy py-12 text-white md:py-16">
        <div className="container-bs">
          <p className="eyebrow !text-steel before:!bg-forge">How it works</p>
          <h2 className="mt-2 text-2xl font-bold md:text-3xl">สั่งง่าย 3 ขั้นตอน</h2>
          <ol className="mt-8 grid gap-px bg-white/15 md:grid-cols-3">
            {[
              { n: "01", t: "เลือกรุ่นที่ตรงกับเครื่องมือ", d: "ทุกหน้าสินค้าระบุยี่ห้อและรุ่นที่ใช้ได้ หากไม่แน่ใจทัก LINE ถามช่างของร้านได้" },
              { n: "02", t: "ร้านพิมพ์ตามออเดอร์", d: "พิมพ์ด้วยเส้น PETG ที่แข็งแรงและทนความร้อนกว่า PLA จากฟาร์มเครื่องพิมพ์ในไทย" },
              { n: "03", t: "ส่งใน 2 วัน เคลมผ่าน LINE", d: "ส่งฟรีเมื่อครบ 1,000 บาท งานมีปัญหา ถ่ายรูปส่งมา ร้านพิมพ์ใหม่ให้" },
            ].map((s) => (
              <li key={s.n} className="bg-navy p-6 md:p-8">
                <p className="num text-3xl font-semibold text-white/90">{s.n}</p>
                <h3 className="mt-4 text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <ReviewSection reviews={reviews.slice(0, 6)} settings={settings} />

      <section className="container-bs grid gap-4 pb-12 md:grid-cols-2 md:pb-16">
        <Link href="/custom-print" className="card relative flex min-h-56 overflow-hidden !bg-navy text-white">
          <Image src="/print/p2s-farm.png" alt="" fill className="object-cover opacity-35" sizes="50vw" />
          <div className="relative flex flex-col justify-end p-6 md:p-8">
            <p className="eyebrow !text-steel before:!bg-forge">Custom print</p>
            <p className="mt-2 text-2xl font-bold">พิมพ์ 3D ตามสั่ง</p>
            <p className="mt-1 max-w-sm text-sm text-white/80">จิ๊ก ที่เก็บ และอะไหล่ที่ของแท้มักไม่มี ส่งไฟล์แล้วประเมินราคาได้เลย</p>
          </div>
        </Link>
        {latest ? (
          <Link href={`/tools-lab/${latest.slug}`} className="card group relative flex min-h-56 overflow-hidden bg-white">
            {latest.cover ? <Image src={latest.cover} alt={latest.coverAlt ?? ""} fill className="object-cover opacity-90 transition duration-500 group-hover:scale-[1.03]" sizes="50vw" /> : null}
            <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-transparent" />
            <div className="relative mt-auto p-6 text-white md:p-8">
              <p className="eyebrow !text-steel before:!bg-forge">Tools ลับ ฉบับย่อ</p>
              <p className="mt-2 text-xl font-bold leading-snug">{latest.title}</p>
              <p className="mt-1 text-sm text-white/80">อ่านเรื่องเครื่องมือและเคล็ดลับงานช่าง →</p>
            </div>
          </Link>
        ) : null}
      </section>

      <section className="bg-forge text-white">
        <div className="container-bs flex flex-col items-start justify-between gap-5 py-10 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold">พร้อมสั่งหรือยัง</h2>
            <p className="mt-1 text-sm text-white/90">ดูราคาและสั่งซื้อได้ที่หน้าสินค้า หรือสอบถามช่างของร้านผ่าน LINE</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/shop" className="btn bg-white !text-navy hover:bg-steel">ดูสินค้าและราคา</Link>
            {settings.lineUrl ? (
              <a href={settings.lineUrl} target="_blank" rel="noopener noreferrer" className="btn border-white/60 text-white hover:bg-white/10">ทัก LINE {settings.lineId}</a>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
