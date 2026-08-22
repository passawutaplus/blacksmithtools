import { describe, expect, it } from "vitest";
import { productBuyLinks, portalChemSlides, portalPrintSlides, serviceLinks, shopChannelLinks, shopHomeLinks, shopMarketLinks, shopSupportLinks, socialLinks, withPortalUtm } from "../portal-links";
import type { Product, SiteSettings } from "../types";

const settings: SiteSettings = {
  shopName: "BlackSmith Tools & Supplies",
  tagline: "Tools Designed for Simpler Work",
  address: "",
  phone: "",
  email: "",
  taxId: "",
  lineUrl: "https://lin.ee/8iXKCd6",
  lineId: "@black_smith",
  shopeeShopUrl: "https://shopee.co.th/blacksmithaplus",
  lazadaShopUrl: "https://www.lazada.co.th/shop/blacksmith",
  thaiMartShopUrl: "",
  tiktokShopUrl: "",
  facebookUrl: "",
  instagramUrl: "",
  youtubeUrl: "",
  tiktokSocialUrl: "",
  bankName: "",
  bankAccountName: "",
  bankAccountNumber: "",
  promptPayId: "",
  paymentsLive: false,
  freeShippingMin: 1000,
  flatShippingFee: 35,
};

describe("shopChannelLinks", () => {
  it("hides empty marketplace urls and always includes the website", () => {
    const links = shopChannelLinks({
      ...settings,
      tiktokShopUrl: "",
      thaiMartShopUrl: "  ",
    });
    expect(links.map((l) => l.id)).toEqual(["shopee", "lazada", "line", "website"]);
  });

  it("includes ThaiMart and TikTok Shop when urls are set", () => {
    const links = shopChannelLinks({
      ...settings,
      thaiMartShopUrl: "https://thaimart.example/shop",
      tiktokShopUrl: "https://www.tiktok.com/@blacksmith",
    });
    expect(links.map((l) => l.id)).toEqual(["shopee", "lazada", "thaimart", "tiktok", "line", "website"]);
  });

  it("puts LINE then website on the home row, and claim goes to LINE", () => {
    expect(shopHomeLinks(settings).map((l) => l.id)).toEqual(["line", "website"]);
    expect(shopMarketLinks(settings).map((l) => l.id)).toEqual(["shopee", "lazada"]);
    expect(shopSupportLinks(settings).map((l) => l.id)).toEqual(["claim", "return"]);
    expect(shopSupportLinks(settings)[1]).toMatchObject({
      id: "return",
      href: settings.lineUrl,
      label: "คืนสินค้า/ยกเลิก",
      external: true,
    });
  });
});

describe("serviceLinks", () => {
  it("includes image cards for assistant and print", () => {
    const links = serviceLinks();
    expect(links.map((l) => l.id)).toEqual(["assistant", "print"]);
    expect(links.every((l) => l.image?.startsWith("/go/"))).toBe(true);
  });
});

describe("socialLinks", () => {
  it("omits empty social urls except LINE when set", () => {
    expect(socialLinks(settings).map((l) => l.id)).toEqual(["line"]);
  });

  it("returns only filled socials", () => {
    const links = socialLinks({
      ...settings,
      facebookUrl: "https://facebook.com/blacksmith",
      youtubeUrl: "https://youtube.com/@blacksmith",
    });
    expect(links.map((l) => l.id)).toEqual(["facebook", "line", "youtube"]);
  });
});

describe("productBuyLinks", () => {
  it("always includes the website product page", () => {
    const product = {
      slug: "battery-mount",
      shopeeUrl: "https://shopee.co.th/item",
      lazadaUrl: null,
      tiktokUrl: "",
    } as Product;
    const links = productBuyLinks(product);
    expect(links[0]).toMatchObject({ href: "/product/battery-mount", external: false });
    expect(links.map((l) => l.id)).toEqual(["web", "p-shopee"]);
  });
});

describe("portal slides", () => {
  const products = [
    {
      slug: "battery-mount",
      nameTh: "ที่เก็บแบต",
      name: "Battery mount",
      imageUrl: "https://img.example/a.jpg",
      featured: true,
      categoryIds: ["c-battery"],
    },
    {
      slug: "battery-mount-2",
      nameTh: "ที่เก็บแบต 2",
      name: "Battery mount 2",
      imageUrl: "https://img.example/a.jpg",
      categoryIds: ["c-battery"],
    },
    {
      slug: "goop-gel",
      nameTh: "GoopOrange 300ml",
      name: "GoopOrange",
      imageUrl: "https://img.example/goop.jpg",
      categoryIds: ["c-goop"],
    },
    {
      slug: "kleanboy-wipe",
      nameTh: "KleanBoy",
      name: "KleanBoy",
      imageUrl: "https://img.example/klean.jpg",
      categoryIds: ["c-kleanboy"],
    },
  ] as Product[];

  it("puts 3D accessories in the print row and skips duplicate images", () => {
    expect(portalPrintSlides(products).map((s) => s.slug)).toEqual(["battery-mount"]);
  });

  it("puts GoopOrange and KleanBoy in the chem row", () => {
    expect(portalChemSlides(products).map((s) => s.slug)).toEqual(["goop-gel", "kleanboy-wipe"]);
  });
});

describe("withPortalUtm", () => {
  it("adds utm to external http links once", () => {
    const once = withPortalUtm("https://shopee.co.th/shop");
    expect(once).toContain("utm_source=qr");
    expect(once).toContain("utm_medium=portal");
    expect(withPortalUtm(once)).toBe(once);
  });

  it("leaves internal and tel links alone", () => {
    expect(withPortalUtm("/shop")).toBe("/shop");
    expect(withPortalUtm("tel:021234567")).toBe("tel:021234567");
  });
});
