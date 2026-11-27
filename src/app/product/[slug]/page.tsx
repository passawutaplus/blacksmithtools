import { jsonLd as toJsonLd } from "@/lib/json-ld";
import { shortProductName, productVariants } from "@/lib/product";
import { OG_BASE, SITE_BRAND, metaDescription, seoProductTitle } from "@/lib/seo";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getProductBySlug, listProducts, getSettings, listPublishedReviews, getProductStats } from "@/lib/db";
import { ReviewSection } from "@/components/ReviewSection";
import { getProductBlurb } from "@/lib/parse-product-details";
import { ProductDetail } from "@/components/ProductDetail";
import { ProductCard } from "@/components/ProductCard";
import { SectionHead } from "@/components/PageHeader";
import { storefrontCategories } from "@/lib/collections";
import { toCardProduct } from "@/lib/card-product";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProductBySlug(slug);
  if (!data) return { title: "ไม่พบสินค้า" };
  const { product, brands } = data;
  const blurb = getProductBlurb(product, 180);
  const compat = product.compatibilities.filter((c) => !/อเนกประสงค์|ทั่วไป/u.test(c));
  const fits = compat.length
    ? `ใช้ได้กับ ${compat.join(", ")}`
    : brands.filter((b) => b.slug !== "blacksmith").length
      ? `ใช้ได้กับ ${brands.filter((b) => b.slug !== "blacksmith").map((b) => b.name).join(", ")}`
      : "";
  return {
    title: seoProductTitle(product.nameTh),
    description: metaDescription(fits ? `${fits} · ${blurb}` : blurb),
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      ...OG_BASE,
      type: "website",
      title: shortProductName(product.nameTh),
      description: metaDescription(blurb),
      images: [{ url: product.imageUrl }],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getProductBySlug(slug);
  if (!data) notFound();
  const { product, brands, categories } = data;
  const shopCats = storefrontCategories(categories);
  const crumbCat = shopCats[0] ?? categories[0];
  let requested = slug;
  try {
    requested = decodeURIComponent(slug);
  } catch {
    requested = slug;
  }
  if (product.slug && product.slug !== requested) {
    redirect(`/product/${encodeURI(product.slug)}`);
  }
  const [{ products: related }, settings, reviews, stats] = await Promise.all([
    listProducts({
      brand: brands[0]?.slug,
    }),
    getSettings(),
    listPublishedReviews(product.id),
    getProductStats(product.id),
  ]);
  const relatedList = related.filter((p) => p.id !== product.id).slice(0, 4);
  const optionCount = product.variants?.length ?? 0;
  const blurb = getProductBlurb(product, 180);
  const variantPrices = productVariants(product).map((v) => v.price ?? product.price);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://blacksmith-tools.com").replace(/\/$/, "");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: shortProductName(product.nameTh),
    image: product.images,
    description: blurb,
    sku: product.sku,
    url: `${siteUrl}/product/${encodeURI(product.slug)}`,
    // Every listing is made or packed by BlackSmith; Milwaukee/DeWalt/etc. are what it fits, not its maker.
    brand: { "@type": "Brand", name: SITE_BRAND },
    offers:
      optionCount > 1
        ? {
            "@type": "AggregateOffer",
            priceCurrency: "THB",
            lowPrice: Math.min(product.price, ...variantPrices),
            highPrice: Math.max(product.price, ...variantPrices),
            offerCount: optionCount,
            availability:
              product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          }
        : {
            "@type": "Offer",
            priceCurrency: "THB",
            price: product.price,
            availability:
              product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
  };

  return (
    <div className="container-bs py-10 md:py-14" data-reveal>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(jsonLd) }}
      />
      <nav aria-label="เส้นทาง" className="mb-4 text-sm text-muted md:mb-8">
        <Link href="/" className="hover:text-navy">
          หน้าแรก
        </Link>
        <span className="mx-2">/</span>
        <Link href="/shop" className="hover:text-navy">
          สินค้า
        </Link>
        {crumbCat ? (
          <>
            <span className="mx-2">/</span>
            <Link href={`/shop?category=${crumbCat.slug}`} className="hover:text-navy">
              {crumbCat.nameTh}
            </Link>
          </>
        ) : null}
        {/* The H1 right below names the product; on phones the crumb stops at the category. */}
        <span className="mx-2 hidden md:inline">/</span>
        <span className="hidden text-navy md:inline">{shortProductName(product.nameTh)}</span>
      </nav>
      <ProductDetail product={product} brands={brands} categories={shopCats.length ? shopCats : categories} stats={stats} />

      <ReviewSection reviews={reviews.slice(0, 3)} settings={settings} embedded />

      {relatedList.length > 0 ? (
        <section className="mt-16 md:mt-24">
          <SectionHead title="คุณอาจชอบ" href="/shop" />
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-8">
            {relatedList.map((p) => (
              <ProductCard key={p.id} product={toCardProduct(p)} layout="related" />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
