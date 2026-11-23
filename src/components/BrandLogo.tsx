import type { Brand } from "@/lib/types";

export function BrandLogo({
  brand,
  className = "h-8 w-full max-w-[120px]",
  decorative = false,
}: {
  brand: Brand;
  className?: string;
  decorative?: boolean;
}) {
  if (brand.logoUrl) {
    if (brand.slug === "blacksmith") {
      return (
        <span
          className={`inline-flex items-center justify-center overflow-hidden rounded-[3px] bg-navy p-[12%] ${className}`}
        >
          <img
            src={brand.logoUrl}
            alt={decorative ? "" : brand.name}
            className="h-full w-full object-contain object-center"
          />
        </span>
      );
    }
    return (
      <img
        src={brand.logoUrl}
        alt={decorative ? "" : brand.name}
        className={`object-contain object-center ${className}`}
      />
    );
  }
  if (decorative) return null;
  return <span className="text-sm font-bold text-navy">{brand.name}</span>;
}
