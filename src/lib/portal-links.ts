import type { Product, SiteSettings } from "./types";

export type PortalChannelId = "shopee" | "lazada" | "thaimart" | "tiktok" | "website" | "line" | "claim" | "return";

export type PortalLink = {
  id: string;
  href: string;
  label: string;
  hint?: string;
  shortLabel?: string;
  image?: string;
  external: boolean;
};

export type ShopChannelLink = PortalLink & { channel: PortalChannelId };

function nonempty(url?: string | null): url is string {
  return Boolean(url && url.trim());
}

export function shopChannelLinks(settings: SiteSettings): ShopChannelLink[] {
  const items: Array<ShopChannelLink | null> = [
    nonempty(settings.shopeeShopUrl)
      ? {
          id: "shopee",
          channel: "shopee",
          href: settings.shopeeShopUrl,
          label: "ซื้อบน Shopee",
          shortLabel: "Shopee",
          hint: "ร้าน BlackSmith",
          external: true,
        }
      : null,
    nonempty(settings.lazadaShopUrl)
      ? {
          id: "lazada",
          channel: "lazada",
          href: settings.lazadaShopUrl,
          label: "ซื้อบน Lazada",
          shortLabel: "Lazada",
          hint: "ร้าน BlackSmith",
          external: true,
        }
      : null,
    nonempty(settings.thaiMartShopUrl)
      ? {
          id: "thaimart",
          channel: "thaimart",
          href: settings.thaiMartShopUrl,
          label: "ซื้อบนไทยมาร์ท",
          shortLabel: "ไทยมาร์ท",
          hint: "ร้าน BlackSmith",
          external: true,
        }
      : null,
    nonempty(settings.tiktokShopUrl)
      ? {
          id: "tiktok",
          channel: "tiktok",
          href: settings.tiktokShopUrl,
          label: "ซื้อบน TikTok Shop",
          shortLabel: "TikTok",
          hint: "ร้าน BlackSmith",
          external: true,
        }
      : null,
    nonempty(settings.lineUrl)
      ? {
          id: "line",
          channel: "line",
          href: settings.lineUrl,
          label: settings.lineId ? `LINE ${settings.lineId}` : "คุยร้านทาง LINE",
          shortLabel: "LINE",
          hint: settings.lineId || "คุยร้าน",
          external: true,
        }
      : null,
    {
      id: "website",
      channel: "website",
      href: "/shop",
      label: "เว็บร้านเรา",
      shortLabel: "เว็บร้าน",
      hint: "สั่งตรงจากเว็บ",
      external: false,
    },
  ];
  return items.filter((item): item is ShopChannelLink => Boolean(item));
}

const MARKET_CHANNELS = new Set<PortalChannelId>(["shopee", "lazada", "thaimart", "tiktok"]);

export function shopMarketLinks(settings: SiteSettings) {
  return shopChannelLinks(settings).filter((link) => MARKET_CHANNELS.has(link.channel));
}

export function shopHomeLinks(settings: SiteSettings) {
  return shopChannelLinks(settings).filter((link) => link.channel === "line" || link.channel === "website");
}

export function shopSupportLinks(settings: SiteSettings): ShopChannelLink[] {
  if (!nonempty(settings.lineUrl)) return [];
  const hint = settings.lineId ? `ทัก LINE ${settings.lineId}` : "ทัก LINE ร้าน";
  return [
    {
      id: "claim",
      channel: "claim",
      href: settings.lineUrl,
      label: "เคลมสินค้า",
      shortLabel: "เคลมสินค้า",
      hint,
      external: true,
    },
    {
      id: "return",
      channel: "return",
      href: settings.lineUrl,
      label: "คืนสินค้า/ยกเลิก",
      shortLabel: "คืนสินค้า/ยกเลิก",
      hint,
      external: true,
    },
  ];
}

export function shopClaimLink(settings: SiteSettings): ShopChannelLink | null {
  return shopSupportLinks(settings).find((link) => link.id === "claim") ?? null;
}

export function serviceLinks(): PortalLink[] {
  return [
    {
      id: "assistant",
      href: "/assistant",
      label: "ผู้ช่วยงานช่าง",
      hint: "คำนวณวัสดุหน้างาน",
      image: "/go/assistant.webp",
      external: false,
    },
    {
      id: "print",
      href: "/custom-print",
      label: "พิมพ์ 3D ตามสั่ง",
      hint: "งานสั่งทำ เลือกสีได้",
      image: "/go/print.webp",
      external: false,
    },
  ];
}

export function socialLinks(settings: SiteSettings): PortalLink[] {
  const items: Array<PortalLink | null> = [
    nonempty(settings.facebookUrl)
      ? { id: "facebook", href: settings.facebookUrl, label: "Facebook", external: true }
      : null,
    nonempty(settings.tiktokSocialUrl)
      ? { id: "tiktok", href: settings.tiktokSocialUrl, label: "TikTok", external: true }
      : null,
    nonempty(settings.lineUrl)
      ? { id: "line", href: settings.lineUrl, label: settings.lineId ? `LINE ${settings.lineId}` : "LINE", external: true }
      : null,
    nonempty(settings.instagramUrl)
      ? { id: "instagram", href: settings.instagramUrl, label: "Instagram", external: true }
      : null,
    nonempty(settings.youtubeUrl)
      ? { id: "youtube", href: settings.youtubeUrl, label: "YouTube", external: true }
      : null,
  ];
  return items.filter((item): item is PortalLink => Boolean(item));
}

export function productBuyLinks(product: Product): PortalLink[] {
  const items: Array<PortalLink | null> = [
    {
      id: "web",
      href: `/product/${product.slug}`,
      label: "ดูบนเว็บร้าน",
      external: false,
    },
    nonempty(product.shopeeUrl)
      ? { id: "p-shopee", href: product.shopeeUrl, label: "ซื้อบน Shopee", external: true }
      : null,
    nonempty(product.lazadaUrl)
      ? { id: "p-lazada", href: product.lazadaUrl, label: "ซื้อบน Lazada", external: true }
      : null,
    nonempty(product.tiktokUrl)
      ? { id: "p-tiktok", href: product.tiktokUrl, label: "ซื้อบน TikTok", external: true }
      : null,
  ];
  return items.filter((item): item is PortalLink => Boolean(item));
}

export function withPortalUtm(href: string): string {
  if (href.startsWith("/") || href.startsWith("tel:") || href.startsWith("mailto:")) return href;
  try {
    const url = new URL(href);
    if (!url.searchParams.has("utm_source")) {
      url.searchParams.set("utm_source", "qr");
      url.searchParams.set("utm_medium", "portal");
    }
    return url.toString();
  } catch {
    return href;
  }
}

export type PortalSlide = {
  slug: string;
  name: string;
  imageUrl: string;
};

const CHEM_CATS = new Set(["c-goop", "c-kleanboy"]);

function uniqueSlides(
  products: Product[],
  match: (product: Product) => boolean,
  limit: number,
): PortalSlide[] {
  const seen = new Set<string>();
  const out: PortalSlide[] = [];
  const ordered = products.filter((p) => p.featured).concat(products.filter((p) => !p.featured));
  for (const product of ordered) {
    if (!match(product) || !product.imageUrl || seen.has(product.imageUrl)) continue;
    seen.add(product.imageUrl);
    out.push({
      slug: product.slug,
      name: product.nameTh || product.name,
      imageUrl: product.imageUrl,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export function portalPrintSlides(products: Product[], limit = 12): PortalSlide[] {
  return uniqueSlides(
    products,
    (product) => !product.categoryIds.some((id) => CHEM_CATS.has(id) || id === "c-chem"),
    limit,
  );
}

export function portalChemSlides(products: Product[], limit = 12): PortalSlide[] {
  return uniqueSlides(
    products,
    (product) => product.categoryIds.some((id) => CHEM_CATS.has(id)),
    limit,
  );
}
