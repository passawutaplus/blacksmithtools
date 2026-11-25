import Image from "next/image";

type Variant = "header" | "footer" | "hero" | "print";

export function ShopLogo({
  variant = "header",
  className = "",
  light = false,
}: {
  variant?: Variant;
  className?: string;
  tagline?: string;
  light?: boolean;
}) {
  if (variant === "header") {
    return (
      <Image
        src={light ? "/brand/logo-on-dark.svg" : "/brand/logo-on-light.svg"}
        alt="BlackSmith"
        width={800}
        height={359}
        unoptimized
        className={className || "h-14 w-auto md:h-[4.25rem]"}
        priority
      />
    );
  }

  if (variant === "print") {
    return (
      <span className={`inline-flex items-center ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-on-light.svg" alt="BlackSmith" className="a4-invoice-logo h-12 w-auto" />
      </span>
    );
  }

  if (variant === "footer") {
    return (
      <Image
        src="/brand/logo-on-light.svg"
        alt="BlackSmith"
        width={800}
        height={359}
        unoptimized
        className={className || "h-20 w-auto"}
      />
    );
  }

  return (
    <Image
      src="/brand/logo.png"
      alt="BlackSmith Tools & Supplies"
      width={800}
      height={800}
      className={className || "h-24 w-24"}
      priority={variant === "hero"}
    />
  );
}
