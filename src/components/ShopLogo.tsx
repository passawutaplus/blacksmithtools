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
        src={light ? "/brand/lockup-overlay.png" : "/brand/lockup-sticky.png"}
        alt="BlackSmith"
        width={635}
        height={262}
        className={className || "h-11 w-auto md:h-[3.25rem]"}
        priority
      />
    );
  }

  if (variant === "print") {
    return (
      <span className={`inline-flex items-center ${className}`}>
        <Image
          src="/brand/lockup-sticky.png"
          alt="BlackSmith"
          width={635}
          height={262}
          className="h-12 w-auto"
        />
      </span>
    );
  }

  if (variant === "footer") {
    return (
      <Image
        src="/brand/lockup-light.png"
        alt="BlackSmith"
        width={635}
        height={262}
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
