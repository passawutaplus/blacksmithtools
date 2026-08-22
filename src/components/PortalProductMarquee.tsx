import Image from "next/image";
import Link from "next/link";
import type { PortalSlide } from "@/lib/portal-links";

function looped(items: PortalSlide[], min = 8): PortalSlide[] {
  if (items.length === 0) return [];
  const padded = [...items];
  while (padded.length < min) padded.push(...items);
  return [...padded, ...padded];
}

function ProductSlideCard({ item, duplicate }: { item: PortalSlide; duplicate: boolean }) {
  return (
    <Link
      href={`/product/${item.slug}`}
      aria-hidden={duplicate || undefined}
      tabIndex={duplicate ? -1 : undefined}
      className="relative h-[9.5rem] w-[9.5rem] shrink-0 overflow-hidden rounded-[1.35rem] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.22)]"
    >
      <Image src={item.imageUrl} alt={duplicate ? "" : item.name} fill sizes="152px" className="object-cover" />
      <span className="absolute inset-x-2 bottom-2 truncate rounded-full bg-white/95 px-2.5 py-1 text-center text-[11px] font-semibold text-navy">
        {item.name}
      </span>
    </Link>
  );
}

function ProductSlideRow({ items, reverse }: { items: PortalSlide[]; reverse?: boolean }) {
  const sequence = looped(items);
  if (sequence.length === 0) return null;
  return (
    <div className="overflow-hidden">
      <div className={`marquee-track gap-2.5 ${reverse ? "portal-marquee-right" : "portal-marquee-left"}`}>
        {sequence.map((item, i) => (
          <ProductSlideCard key={`${item.slug}-${i}`} item={item} duplicate={i >= items.length} />
        ))}
      </div>
    </div>
  );
}

export function PortalProductMarquee({
  printItems,
  chemItems,
}: {
  printItems: PortalSlide[];
  chemItems: PortalSlide[];
}) {
  if (printItems.length === 0 && chemItems.length === 0) return null;

  return (
    <section className="mt-7 -mx-4">
      <h2 className="sr-only">สินค้า</h2>
      <div className="mx-4 h-px bg-white/25" aria-hidden />
      <div className="marquee-band mt-2.5 space-y-2.5 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
        {printItems.length > 0 ? <ProductSlideRow items={printItems} /> : null}
        {chemItems.length > 0 ? <ProductSlideRow items={chemItems} reverse /> : null}
      </div>
    </section>
  );
}
