import Image from "next/image";
import Link from "next/link";
import { brands } from "@/lib/seed";
import { shortProductName } from "@/lib/product";
import type { Product } from "@/lib/types";

/** Landing-page product tile: no price, no cart. Price lives on /shop and the product page. */
export function LandingProductTile({ product }: { product: Product }) {
  const brand = product.brandIds
    .map((id) => brands.find((b) => b.id === id))
    .find((b) => b && b.slug !== "blacksmith");
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col border border-navy/12 bg-white transition-colors hover:border-navy/40"
    >
      <div className="relative aspect-square bg-[#f1f1f1]">
        <Image
          src={product.imageUrl}
          alt={product.nameTh}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-contain p-5 transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <span className="absolute bottom-0 left-0 bg-navy px-2 py-1 text-[11px] font-medium leading-none text-white">
          {brand ? `ใช้ได้กับ ${brand.name}` : "BlackSmith Original"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-navy/10 px-3.5 py-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-navy group-hover:text-forge">
          {shortProductName(product.nameTh)}
        </h3>
        <span aria-hidden className="num shrink-0 text-forge">→</span>
      </div>
    </Link>
  );
}
