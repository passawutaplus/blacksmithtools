import Image from "next/image";
import Link from "next/link";
import type { Category, Product } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";

export const COLLECTION_BANNER: Record<string, string> = {
  "battery-mount": "/print/works/fdm-2.png",
  "power-mount": "/print/jig.png",
  "milwaukee-packout": "/print/works/fdm-4.png",
  "dewalt-tstak": "/print/works/fdm-1.png",
  "osuka-box": "/print/part.png",
  "tool-holder": "/print/collections/banner-tool-holder.jpg",
  "wall-mount": "/print/collections/banner-wall-mount.jpg",
  "box-organizer": "/print/collections/banner-box-organizer.jpg",
  "blower-nozzle": "/print/works/fdm-3.png",
  "blacksmith-original": "/print/proto.png",
  "hand-cleaner": "/print/collections/banner-hand-cleaner.jpg",
  gooporange: "/print/collections/banner-hand-cleaner.jpg",
  kleanboy: "/print/collections/banner-hand-cleaner.jpg",
  other: "/print/p2s-farm.png",
};

export function CategoryShowcase({
  category,
  products,
  total,
}: {
  category: Category;
  products: Product[];
  total: number;
}) {
  if (products.length === 0) return null;
  const href = `/shop?category=${category.slug}`;
  const banner = COLLECTION_BANNER[category.slug] ?? products[0]?.imageUrl;

  return (
    <section className="container-bs pb-12 md:pb-16">
      <Link
        href={href}
        className="group relative block overflow-hidden rounded-[3px] bg-navy text-white"
      >
        <div className="relative h-40 md:h-56">
          {banner ? (
            <Image
              src={banner}
              alt=""
              fill
              className="object-cover opacity-50 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-60"
              sizes="100vw"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/75 to-navy/20" />
          <div className="relative flex h-full items-end justify-between gap-4 p-5 md:p-7">
            <div>
              <p className="eyebrow !text-steel before:!bg-forge">Category</p>
              <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">{category.name}</h2>
              <p className="num mt-1 text-sm text-white/75">{total} items</p>
            </div>
            <span className="btn btn-primary shrink-0">ดูทั้งหมด</span>
          </div>
        </div>
      </Link>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} layout="related" />
        ))}
      </div>
    </section>
  );
}

