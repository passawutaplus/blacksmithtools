import catalog from "@/data/shopee-catalog.json";
import { merchIdsForProduct } from "./collections";
import type { Brand, Category, Product, SiteSettings } from "./types";

export const CATALOG_VERSION = catalog.version;
export const TIKTOK_PROFILE_URL = "https://www.tiktok.com/@blacksmith_ts";
export const FACEBOOK_PAGE_URL = "https://www.facebook.com/blacksmithtoolsandsupplies";

export const SHOP_ADDRESS =
  "143/109 บางซื่อคอนโดมิเนียม ถนนริมคลองประปา แขวงบางซื่อ บางซื่อ กรุงเทพมหานคร 10800";
export const SHOP_ADDRESS_VERSION = "2026-08-22-bangsue";

export const defaultSettings: SiteSettings = {
  shopName: "BlackSmith Tools & Supplies",
  tagline: "Tools Designed for Simpler Work",
  address: SHOP_ADDRESS,
  phone: "",
  email: "",
  taxId: "",
  lineUrl: "https://lin.ee/8iXKCd6",
  lineId: "@black_smith",
  shopeeShopUrl:
    "https://shopee.co.th/blacksmithaplus?categoryId=100001&entryPoint=ShopByPDP&itemId=21344275549",
  lazadaShopUrl: "https://www.lazada.co.th/shop/blacksmith-toolssupplies-store",
  thaiMartShopUrl: "",
  tiktokShopUrl: TIKTOK_PROFILE_URL,
  facebookUrl: FACEBOOK_PAGE_URL,
  instagramUrl: "",
  youtubeUrl: "",
  tiktokSocialUrl: TIKTOK_PROFILE_URL,
  bankName: "ธนาคารกสิกรไทย",
  bankAccountName: "BlackSmith Tools",
  bankAccountNumber: "000-0-00000-0",
  promptPayId: "0000000000",
  paymentsLive: false,
  freeShippingMin: 1000,
  flatShippingFee: 35,
};

export const brands: Brand[] = [
  { id: "b-milwaukee", slug: "milwaukee", name: "Milwaukee", nameTh: "มิลวอกี", logoUrl: "/brands/milwaukee.svg" },
  { id: "b-dewalt", slug: "dewalt", name: "Dewalt", nameTh: "ดีวอลต์", logoUrl: "/brands/dewalt.svg" },
  { id: "b-makita", slug: "makita", name: "Makita", nameTh: "มากีต้า", logoUrl: "/brands/makita.svg" },
  { id: "b-bosch", slug: "bosch", name: "Bosch", nameTh: "บอช", logoUrl: "/brands/bosch.svg" },
  { id: "b-osuka", slug: "osuka", name: "Osuka", nameTh: "โอสุกะ", logoUrl: "/brands/osuka.png" },
  { id: "b-stanley", slug: "stanley", name: "Stanley", nameTh: "สแตนเลย์", logoUrl: "/brands/stanley.svg" },
  { id: "b-blacksmith", slug: "blacksmith", name: "BlackSmith", nameTh: "แบล็กสมิธ", logoUrl: "/brands/blacksmith.png" },
  { id: "b-total", slug: "total", name: "Total", nameTh: "โททัล", logoUrl: "/brands/total.svg" },
  { id: "b-dongcheng", slug: "dongcheng", name: "DongCheng", nameTh: "ตงเฉิง", logoUrl: "/brands/dongcheng.png" },
  { id: "b-festool", slug: "festool", name: "Festool", nameTh: "เฟสทูล", logoUrl: "/brands/festool.svg" },
  { id: "b-hikoki", slug: "hikoki", name: "Hikoki", nameTh: "ฮิโคกิ", logoUrl: "/brands/hikoki.svg" },
  { id: "b-zinsano", slug: "zinsano", name: "Zinsano", nameTh: "ซินซาโน่", logoUrl: "/brands/zinsano.svg" },
  { id: "b-pumpkin", slug: "pumpkin", name: "Pumpkin", nameTh: "พัมกิน", logoUrl: "/brands/pumpkin.png" },
  { id: "b-ingco", slug: "ingco", name: "Ingco", nameTh: "อิงโก้", logoUrl: "/brands/ingco.png" },
  { id: "b-rowel", slug: "rowel", name: "Rowel", nameTh: "โรเวล", logoUrl: "/brands/rowel.svg" },
  { id: "b-imax", slug: "imax", name: "Imax", nameTh: "ไอแมกซ์", logoUrl: "/brands/imax.svg" },
  { id: "b-blackdecker", slug: "black-decker", name: "Black+Decker", nameTh: "แบล็คแอนด์เดกเกอร์", logoUrl: "/brands/black-decker.svg" },
];

export const primaryBrandSlugs = [
  "milwaukee",
  "dewalt",
  "makita",
  "bosch",
  "osuka",
  "stanley",
] as const;

export const categories: Category[] = [
  { id: "c-blower", slug: "blower-nozzle", name: "Blower", nameTh: "Blower" },
  { id: "c-battery", slug: "battery-mount", name: "Battery Mount", nameTh: "Battery Mount" },
  { id: "c-power", slug: "power-mount", name: "Power Mount", nameTh: "Power Mount" },
  { id: "c-packout", slug: "milwaukee-packout", name: "Milwaukee Packout", nameTh: "Milwaukee Packout" },
  { id: "c-tstak", slug: "dewalt-tstak", name: "Dewalt Tstak TS2.0", nameTh: "Dewalt Tstak TS2.0" },
  { id: "c-osuka-box", slug: "osuka-box", name: "OSUKA Box", nameTh: "OSUKA Box" },
  { id: "c-original", slug: "blacksmith-original", name: "BlackSmith Original", nameTh: "BlackSmith Original" },
  { id: "c-goop", slug: "gooporange", name: "GoopOrange", nameTh: "GoopOrange" },
  { id: "c-kleanboy", slug: "kleanboy", name: "KleanBoy", nameTh: "KleanBoy" },
  { id: "c-other", slug: "other", name: "Other", nameTh: "สินค้าอื่นๆ" },
  { id: "c-holder", slug: "tool-holder", name: "Tool Holder", nameTh: "ที่เก็บเครื่องมือ" },
  { id: "c-storage", slug: "box-organizer", name: "Box Organizer", nameTh: "ถาด/เพลตกล่อง" },
  { id: "c-wall", slug: "wall-mount", name: "Wall Mount", nameTh: "ที่แขวนผนัง" },
  { id: "c-chem", slug: "hand-cleaner", name: "Hand Cleaner", nameTh: "เคมีช่าง / เจลล้างมือ" },
];

const knownBrandIds = new Set(brands.map((b) => b.id));
const knownCategoryIds = new Set(categories.map((c) => c.id));

/** 161 รายการจาก Shopee mass update 21 ส.ค. 2026 */
export const seedProducts: Product[] = catalog.products.map((raw) => {
  const brandIds = raw.brandIds.filter((id) => knownBrandIds.has(id));
  const typeIds = raw.categoryIds.filter((id) => knownCategoryIds.has(id));
  const merchIds = merchIdsForProduct(raw).filter((id) => knownCategoryIds.has(id));
  const categoryIds = [...new Set([...typeIds, ...merchIds])];
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    nameTh: raw.nameTh,
    description: raw.description,
    price: raw.price,
    compareAtPrice: raw.compareAtPrice ?? undefined,
    stock: raw.stock,
    imageUrl: raw.imageUrl,
    images: raw.images,
    brandIds: brandIds.length ? brandIds : ["b-blacksmith"],
    categoryIds: categoryIds.length ? categoryIds : ["c-holder"],
    compatibilities: raw.compatibilities,
    featured: raw.featured,
    shopeeUrl: raw.shopeeUrl,
    lazadaUrl: raw.lazadaUrl,
    tiktokUrl: raw.tiktokUrl,
    sku: raw.sku,
    variants: (raw.variants ?? []).map((v) => ({
      id: v.id,
      name: v.name ?? "",
      sku: v.sku || raw.sku,
      price: v.price,
      stock: v.stock,
      imageUrl: v.imageUrl ?? null,
    })),
  };
});
