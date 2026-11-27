import "server-only";
import path from "path";
import { nanoid } from "nanoid";
import { brands, categories, CATALOG_VERSION, COPY_VERSION, defaultSettings, seedProducts, SHOP_ADDRESS, SHOP_ADDRESS_VERSION, SHOP_PHONE } from "./seed";
import { linePricing, normalizeVariants, syncFromVariants } from "./product";
import { slugify } from "./utils";
import type { AdminOrderRow } from "./admin-types";
import { phonesMatch } from "./phone";
import { completeThaiAddress } from "./thai-address";
import { normalizeShopReview, sortShopReviews } from "./reviews";
import { readRuntimeBytes, runtimeRoot, safeUploadName } from "./runtime-store";
import { StateConflictError, readState, withStateRetry, writeState } from "./state-store";

/** Version each loaded state object was read at, for compare-and-swap saves. */
const loadedVersion = new WeakMap<object, number | null>();

export { safeUploadName };
import type { TrackBillSummary } from "./track-types";
import { cleanCartItems, type CartItemInput } from "./cart-items";
export type { CartItemInput } from "./cart-items";
import { mapTrack17ToShop, normalizeTrackingNo, type Track17Snapshot } from "./track17";
import { ORDER_STATUS_LABEL, CARRIERS, carrierLabel } from "./shipping";
import type {
  BillingInfo,
  Brand,
  Carrier,
  Cart,
  DbShape,
  DocumentRecord,
  Order,
  OrderEvent,
  OrderItem,
  OrderStatus,
  Payment,
  PaymentProvider,
  Product,
  Shipment,
  ShippingAddress,
  SiteSettings,
  ShopReview,
  PrintQuote,
  PrintQuoteStatus,
  WholesaleLead,
  WholesaleLeadStatus,
} from "./types";

const DATA_DIR = runtimeRoot();

export function slipDir() {
  return path.join(DATA_DIR, "slips");
}

export function slipFilePath(filename: string) {
  const base = safeUploadName(filename);
  if (!base) return null;
  return path.join(slipDir(), base);
}

export function shipPhotoDir() {
  return path.join(DATA_DIR, "ship-photos");
}

export function shipPhotoFilePath(filename: string) {
  const base = safeUploadName(filename);
  if (!base) return null;
  return path.join(shipPhotoDir(), base);
}

function withBrandLogos(list: Brand[]): Brand[] {
  return list.map((b) => {
    const seed = brands.find((s) => s.id === b.id || s.slug === b.slug);
    return { ...b, logoUrl: seed?.logoUrl || b.logoUrl };
  });
}

const SHIPPING_POLICY_VERSION = "2026-08-21-35-1000";

function emptyDb(): DbShape {
  return {
    catalogVersion: CATALOG_VERSION,
    copyVersion: COPY_VERSION,
    shippingPolicyVersion: SHIPPING_POLICY_VERSION,
    shopAddressVersion: SHOP_ADDRESS_VERSION,
    products: structuredClone(seedProducts),
    brands: structuredClone(brands),
    categories: structuredClone(categories),
    carts: [],
    orders: [],
    payments: [],
    documents: [],
    shipments: [],
    inquiries: [],
    testimonials: [],
    settings: structuredClone(defaultSettings),
    receiptSeq: 0,
    orderSeq: 0,
    inquirySeq: 0,
  };
}

function applyCatalog(db: DbShape): boolean {
  if (db.catalogVersion === CATALOG_VERSION) return false;
  db.catalogVersion = CATALOG_VERSION;
  db.products = structuredClone(seedProducts);
  db.brands = structuredClone(brands);
  db.categories = structuredClone(categories);
  return true;
}

/** Text-only refresh: only name / nameTh / description are replaced, matched by product id. */
function applyCopy(db: DbShape): boolean {
  if (!COPY_VERSION || db.copyVersion === COPY_VERSION) return false;
  const seedById = new Map(seedProducts.map((p) => [p.id, p]));
  for (const p of db.products) {
    const seed = seedById.get(p.id);
    if (!seed) continue;
    p.name = seed.name;
    p.nameTh = seed.nameTh;
    p.description = seed.description;
  }
  db.copyVersion = COPY_VERSION;
  return true;
}

function applyShippingPolicy(db: DbShape): boolean {
  if (!db.settings) db.settings = structuredClone(defaultSettings);
  if (db.shippingPolicyVersion === SHIPPING_POLICY_VERSION) return false;
  db.settings.flatShippingFee = defaultSettings.flatShippingFee;
  db.settings.freeShippingMin = defaultSettings.freeShippingMin;
  db.shippingPolicyVersion = SHIPPING_POLICY_VERSION;
  return true;
}

function applyShopAddress(db: DbShape): boolean {
  if (!db.settings) db.settings = structuredClone(defaultSettings);
  if (db.shopAddressVersion === SHOP_ADDRESS_VERSION) return false;
  db.settings.address = SHOP_ADDRESS;
  db.settings.phone = SHOP_PHONE;
  db.shopAddressVersion = SHOP_ADDRESS_VERSION;
  return true;
}

async function ensureDb(): Promise<DbShape> {
  const { raw, version } = await readState();
  if (!raw) {
    const db = emptyDb();
    loadedVersion.set(db, version);
    try {
      await saveDb(db);
    } catch (e) {
      if (e instanceof StateConflictError) return ensureDb(); // another request seeded it first
      throw e;
    }
    return db;
  }
  const db = JSON.parse(raw) as DbShape;
  loadedVersion.set(db, version);
  if (!Array.isArray(db.inquiries)) db.inquiries = [];
  if (!Array.isArray(db.printQuotes)) db.printQuotes = [];
  if (!Array.isArray(db.testimonials)) db.testimonials = [];
  if (typeof db.inquirySeq !== "number") db.inquirySeq = db.inquiries.length;
  db.settings = { ...defaultSettings, ...db.settings };
  const catalogChanged = applyCatalog(db);
  const copyChanged = applyCopy(db);
  const shippingChanged = applyShippingPolicy(db);
  const addressChanged = applyShopAddress(db);
  if (catalogChanged || copyChanged || shippingChanged || addressChanged) {
    try {
      await saveDb(db);
    } catch (e) {
      if (e instanceof StateConflictError) return ensureDb(); // same migration already saved elsewhere
      throw e;
    }
  }
  return db;
}

async function saveDb(db: DbShape) {
  const next = await writeState(JSON.stringify(db), loadedVersion.get(db) ?? null);
  loadedVersion.set(db, next);
}

export async function readSlipBytes(filename: string) {
  const name = safeUploadName(filename);
  if (!name) return null;
  return readRuntimeBytes(`slips/${name}`);
}

export async function readShipPhotoBytes(filename: string) {
  const name = safeUploadName(filename);
  if (!name) return null;
  return readRuntimeBytes(`ship-photos/${name}`);
}

function todayCode() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

function pushEvent(order: Order, type: string, message: string, by = "system") {
  const ev: OrderEvent = {
    id: nanoid(10),
    at: new Date().toISOString(),
    type,
    message,
    by,
  };
  order.events.push(ev);
  order.updatedAt = ev.at;
}

const LEGACY_LINE_URL = "https://lin.ee/lgpCBi1";

async function getSettings__impl() {
  const db = await ensureDb();
  let dirty = false;
  if (!db.settings.lineUrl || db.settings.lineUrl === LEGACY_LINE_URL) {
    db.settings.lineUrl = defaultSettings.lineUrl;
    dirty = true;
  }
  if (!db.settings.tiktokShopUrl) {
    db.settings.tiktokShopUrl = defaultSettings.tiktokShopUrl;
    dirty = true;
  }
  if (!db.settings.tiktokSocialUrl) {
    db.settings.tiktokSocialUrl = defaultSettings.tiktokSocialUrl;
    dirty = true;
  }
  if (!db.settings.facebookUrl) {
    db.settings.facebookUrl = defaultSettings.facebookUrl;
    dirty = true;
  }
  const merged: SiteSettings = { ...defaultSettings, ...db.settings };
  if (db.settings.thaiMartShopUrl === undefined) {
    db.settings = merged;
    dirty = true;
  }
  if (dirty) await saveDb(db);
  return { ...defaultSettings, ...db.settings };
}

async function updateSettings__impl(patch: Partial<SiteSettings>) {
  const db = await ensureDb();
  if (patch.shopeeRating !== undefined) {
    patch.shopeeRating = Math.min(5, Math.max(0, Number(patch.shopeeRating) || 0));
  }
  if (patch.shopeeReviewCount !== undefined) {
    patch.shopeeReviewCount = Math.max(0, Math.round(Number(patch.shopeeReviewCount) || 0));
  }
  db.settings = { ...db.settings, ...patch };
  await saveDb(db);
  return db.settings;
}

export async function listShopReviews() {
  const db = await ensureDb();
  return sortShopReviews(db.testimonials);
}

export async function listPublishedReviews(productId?: string) {
  const rows = (await listShopReviews()).filter((row) => row.published);
  if (!productId) return rows;
  const matched = rows.filter((row) => row.productId === productId);
  return matched.length ? matched : rows.filter((row) => !row.productId);
}

async function saveShopReview__impl(input: Partial<ShopReview> & { quote?: string }) {
  const db = await ensureDb();
  const id = String(input.id ?? "").trim();
  const existing = id ? db.testimonials.find((row) => row.id === id) : undefined;
  const next = normalizeShopReview(input, existing);
  const now = new Date().toISOString();
  if (existing) {
    Object.assign(existing, next, { id: existing.id, createdAt: existing.createdAt, updatedAt: now });
    await saveDb(db);
    return existing;
  }
  const row: ShopReview = {
    ...next,
    id: nanoid(12),
    createdAt: now,
    updatedAt: now,
  };
  db.testimonials.push(row);
  await saveDb(db);
  return row;
}

async function deleteShopReview__impl(id: string) {
  const db = await ensureDb();
  const before = db.testimonials.length;
  db.testimonials = db.testimonials.filter((row) => row.id !== id);
  if (db.testimonials.length === before) throw new Error("ไม่พบรีวิว");
  await saveDb(db);
  return { ok: true as const };
}

const SOLD_STATUSES: OrderStatus[] = ["paid", "packing", "shipped", "delivered", "completed"];

/** Real numbers only: units on paid orders, stars from published reviews tied to this product. */
export async function getProductStats(productId: string) {
  const db = await ensureDb();
  let sold = 0;
  for (const o of db.orders) {
    if (!SOLD_STATUSES.includes(o.status)) continue;
    for (const i of o.items) if (i.productId === productId) sold += i.quantity;
  }
  const rated = db.testimonials.filter((r) => r.published && r.productId === productId);
  const ratingCount = rated.length;
  const rating = ratingCount ? Math.round((rated.reduce((s, r) => s + r.stars, 0) / ratingCount) * 10) / 10 : 0;
  return { sold, rating, ratingCount };
}

export async function listProducts(filters?: {
  brand?: string;
  category?: string;
  q?: string;
  featured?: boolean;
}) {
  const db = await ensureDb();
  let items = db.products;
  if (filters?.brand) {
    const brand = db.brands.find((b) => b.slug === filters.brand);
    if (brand) items = items.filter((p) => p.brandIds.includes(brand.id));
  }
  if (filters?.category) {
    const cat = db.categories.find((c) => c.slug === filters.category);
    if (cat) items = items.filter((p) => p.categoryIds.includes(cat.id));
  }
  if (filters?.featured) items = items.filter((p) => p.featured);
  if (filters?.q) {
    const q = filters.q.toLowerCase();
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.nameTh.toLowerCase().includes(q) ||
        p.compatibilities.some((c) => c.toLowerCase().includes(q)) ||
        p.sku.toLowerCase().includes(q) ||
        (p.variants ?? []).some(
          (v) =>
            v.sku.toLowerCase().includes(q) ||
            v.name.toLowerCase().includes(q),
        ),
    );
  }
  return { products: items, brands: withBrandLogos(db.brands), categories: db.categories };
}

export async function getProductBySlug(slug: string) {
  const db = await ensureDb();
  const product = resolveProductRecord(db.products, slug);
  if (!product) return null;
  return {
    product,
    brands: withBrandLogos(db.brands.filter((b) => product.brandIds.includes(b.id))),
    categories: db.categories.filter((c) => product.categoryIds.includes(c.id)),
  };
}

function resolveProductRecord(products: Product[], raw: string) {
  let slug = raw.trim();
  try {
    slug = decodeURIComponent(slug);
  } catch {
    /* keep */
  }
  const lower = slug.toLowerCase();
  const exact = products.find((p) => p.slug === slug);
  if (exact) return exact;
  const bySku = products.find(
    (p) =>
      p.sku.toLowerCase() === lower ||
      (p.variants ?? []).some((v) => v.sku.toLowerCase() === lower),
  );
  if (bySku) return bySku;
  const byId = products.find(
    (p) => p.id === slug || p.id === `p-${slug}` || p.id.replace(/^p-/, "") === slug,
  );
  if (byId) return byId;

  const tokens = slug.split("-").filter(Boolean);
  const prefix = tokens[0]?.toLowerCase();
  if (!prefix) return null;
  const candidates = products.filter((p) => {
    const s = p.slug.toLowerCase();
    return s === prefix || s.startsWith(`${prefix}-`);
  });
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    const scored = candidates
      .map((p) => {
        const parts = new Set(p.slug.toLowerCase().split("-").filter(Boolean));
        const overlap = tokens.filter(
          (t) => parts.has(t.toLowerCase()) || p.nameTh.toLowerCase().includes(t.toLowerCase()),
        ).length;
        return {
          p,
          score: overlap * 10 + (p.featured ? 5 : 0) + (p.sku === "J-1000" ? 8 : 0),
        };
      })
      .sort((a, b) => b.score - a.score);
    return scored[0]?.p ?? null;
  }
  return null;
}

export async function getProductById(id: string) {
  const db = await ensureDb();
  return db.products.find((p) => p.id === id) ?? null;
}

async function upsertProduct__impl(product: Product) {
  const db = await ensureDb();
  const idx = db.products.findIndex((p) => p.id === product.id);
  if (idx >= 0) db.products[idx] = product;
  else db.products.push(product);
  await saveDb(db);
  return product;
}

async function deleteProducts__impl(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) throw new Error("ยังไม่ได้เลือกสินค้า");
  const db = await ensureDb();
  const remove = new Set(unique);
  const before = db.products.length;
  db.products = db.products.filter((p) => !remove.has(p.id));
  if (db.products.length === before) throw new Error("ไม่พบสินค้า");
  await saveDb(db);
  return { deleted: before - db.products.length };
}

async function setProductsFeatured__impl(ids: string[], featured: boolean) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) throw new Error("ยังไม่ได้เลือกสินค้า");
  const db = await ensureDb();
  const set = new Set(unique);
  let n = 0;
  for (const p of db.products) {
    if (set.has(p.id)) {
      p.featured = featured;
      n += 1;
    }
  }
  if (!n) throw new Error("ไม่พบสินค้า");
  await saveDb(db);
  return { updated: n };
}

async function setProductStock__impl(id: string, stock: number) {
  if (!Number.isFinite(stock) || stock < 0) throw new Error("สต็อกไม่ถูกต้อง");
  const db = await ensureDb();
  const product = db.products.find((p) => p.id === id);
  if (!product) throw new Error("ไม่พบสินค้า");
  const qty = Math.floor(stock);
  if ((product.variants?.length ?? 0) > 1) {
    throw new Error("สินค้านี้มีหลายตัวเลือก — แก้สต็อกในหน้าแก้ไขสินค้า");
  }
  if (product.variants?.length === 1) {
    product.variants[0].stock = qty;
  }
  product.stock = qty;
  await saveDb(db);
  return product;
}

/**
 * Price a cart from the browser's item list. Read-only: carts live in the
 * customer's browser, so opening the cart never writes the shop state.
 */
export async function priceCart(items: CartItemInput[]) {
  const db = await ensureDb();
  const lines = cleanCartItems(items)
    .map((item) => {
      const product = db.products.find((p) => p.id === item.productId);
      if (!product) return null;
      const priced = linePricing(product, item.variantId);
      return {
        productId: item.productId,
        variantId: item.variantId,
        variantName: priced.variantName,
        quantity: item.quantity,
        product,
        unitPrice: priced.price,
        sku: priced.sku,
        imageUrl: priced.imageUrl,
        lineTotal: priced.price * item.quantity,
      };
    })
    .filter(Boolean) as {
    productId: string;
    variantId?: string;
    variantName: string;
    quantity: number;
    product: Product;
    unitPrice: number;
    sku: string;
    imageUrl: string;
    lineTotal: number;
  }[];
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  return { lines, subtotal, settings: db.settings };
}

/** Bank-transfer / PromptPay orders with no slip after their 24 h hold go back to stock. */
const EXPIRABLE: PaymentProvider[] = ["bank_transfer", "promptpay_qr"];

function expireUnpaidOrders(db: DbShape, now = Date.now()) {
  let changed = 0;
  for (const order of db.orders) {
    if (order.status !== "pending_payment" || !EXPIRABLE.includes(order.paymentMethod)) continue;
    if (!order.stockReservedUntil || Date.parse(order.stockReservedUntil) > now) continue;
    restoreStock(db, order);
    order.status = "cancelled";
    order.updatedAt = new Date(now).toISOString();
    const payment = db.payments.find((p) => p.id === order.paymentId);
    if (payment && payment.status !== "paid") {
      payment.status = "cancelled";
      payment.updatedAt = order.updatedAt;
    }
    pushEvent(order, "cancelled", "ยกเลิกอัตโนมัติ: ไม่ได้ชำระภายใน 24 ชั่วโมง คืนสต็อกแล้ว");
    changed += 1;
  }
  return changed;
}

function calcShipping(subtotal: number, settings: SiteSettings) {
  if (subtotal >= settings.freeShippingMin) return 0;
  return settings.flatShippingFee;
}

async function createOrder__impl(input: {
  items: CartItemInput[];
  address: ShippingAddress;
  paymentMethod: PaymentProvider;
  shippingMethod?: string;
  customerNote?: string;
  wantReceipt?: boolean;
  billing?: BillingInfo;
}) {
  const db = await ensureDb();
  const cartItems = cleanCartItems(input.items);
  if (cartItems.length === 0) throw new Error("ตะกร้าว่าง");
  // Free stock held by abandoned transfer orders before checking what is left.
  expireUnpaidOrders(db);

  const items = cartItems.map((ci) => {
    const p = db.products.find((x) => x.id === ci.productId);
    if (!p) throw new Error("ไม่พบสินค้า");
    const priced = linePricing(p, ci.variantId);
    if (priced.stock < ci.quantity) throw new Error(`สต็อกไม่พอ: ${priced.name}`);
    return {
      productId: p.id,
      variantId: priced.variant?.id,
      variantName: priced.variantName || undefined,
      name: priced.name,
      sku: priced.sku,
      price: priced.price,
      quantity: ci.quantity,
      imageUrl: priced.imageUrl,
      product: p,
      variant: priced.variant,
    };
  });

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingFee = calcShipping(subtotal, db.settings);
  const discount = 0;
  const grandTotal = subtotal + shippingFee - discount;

  db.orderSeq += 1;
  const number = `BS-${todayCode()}-${String(db.orderSeq).padStart(4, "0")}`;
  const now = new Date().toISOString();
  const reserveUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  for (const item of items) {
    if (item.variant) item.variant.stock = Math.max(0, item.variant.stock - item.quantity);
    const vs = item.product.variants ?? [];
    item.product.stock = vs.length ? vs.reduce((s, v) => s + v.stock, 0) : Math.max(0, item.product.stock - item.quantity);
  }

  const order: Order = {
    id: nanoid(12),
    number,
    token: nanoid(32),
    status: "pending_payment",
    items: items.map(({ product: _p, variant: _v, ...rest }) => rest),
    subtotal,
    shippingFee,
    discount,
    grandTotal,
    shippingMethod: input.shippingMethod ?? "standard",
    address: input.address,
    paymentMethod: input.paymentMethod,
    customerNote: input.customerNote || undefined,
    wantReceipt: input.wantReceipt || undefined,
    billing: input.billing,
    shipmentIds: [],
    events: [],
    stockReservedUntil: reserveUntil,
    createdAt: now,
    updatedAt: now,
  };
  pushEvent(order, "created", "สร้างคำสั่งซื้อแล้ว");

  const payment: Payment = {
    id: nanoid(12),
    orderId: order.id,
    provider: input.paymentMethod,
    amount: grandTotal,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  order.paymentId = payment.id;

  // Carts used to be stored server-side; they now live in the browser.
  db.carts = [];
  db.orders.push(order);
  db.payments.push(payment);
  await saveDb(db);
  return { order, payment, settings: db.settings };
}

const MANUAL_PAY: Record<"receipt" | "label", PaymentProvider> = {
  receipt: "cash",
  label: "cash",
};

async function createManualOrder__impl(input: {
  kind: "receipt" | "label";
  address: ShippingAddress;
  items: Array<{
    productId?: string;
    variantId?: string;
    name: string;
    variantName?: string;
    sku?: string;
    price: number;
    quantity: number;
    discount?: number;
    imageUrl?: string;
  }>;
  customerNote?: string;
  billing?: BillingInfo;
}) {
  const db = await ensureDb();
  const kind = input.kind === "label" ? "label" : "receipt";
  if (kind === "receipt" && !input.items.length) throw new Error("ต้องมีอย่างน้อย 1 รายการ");
  const name = input.address?.fullName?.trim() ?? "";
  const phone = String(input.address?.phone ?? "").replace(/\D/g, "");
  if (name.length < 2) throw new Error("ใส่ชื่อลูกค้า");
  if (phone.length < 9) throw new Error("ใส่เบอร์โทร");
  if (!input.address?.line1?.trim()) throw new Error("ใส่ที่อยู่");
  const loc = completeThaiAddress(input.address);
  if (!loc.subdistrict || !loc.postalCode) {
    throw new Error("เลือกจังหวัด เขต/อำเภอ และแขวง/ตำบล");
  }
  const address: ShippingAddress = {
    ...input.address,
    fullName: name,
    phone: input.address.phone.trim(),
    email: input.address.email?.trim() || undefined,
    line1: input.address.line1.trim(),
    subdistrict: loc.subdistrict,
    district: loc.district,
    province: loc.province,
    postalCode: loc.postalCode,
  };

  const items: OrderItem[] =
    kind === "label"
      ? []
      : input.items.map((raw) => {
          const quantity = Math.max(1, Math.floor(Number(raw.quantity) || 0));
          const price = Math.max(0, Number(raw.price) || 0);
          const discount = Math.max(0, Number(raw.discount) || 0);
          if (!quantity) throw new Error("จำนวนสินค้าไม่ถูกต้อง");
          const catalog = raw.productId ? db.products.find((p) => p.id === raw.productId) : undefined;
          if (catalog) {
            const priced = linePricing(catalog, raw.variantId);
            return {
              productId: catalog.id,
              variantId: priced.variant?.id,
              variantName: priced.variantName || undefined,
              name: priced.name,
              sku: priced.sku,
              price: Number.isFinite(raw.price) ? price : priced.price,
              quantity,
              discount: discount || undefined,
              imageUrl: priced.imageUrl,
            };
          }
          const itemName = String(raw.name ?? "").trim();
          if (!itemName) throw new Error("ใส่ชื่อสินค้า");
          return {
            productId: "custom",
            variantName: raw.variantName?.trim() || undefined,
            name: itemName,
            sku: raw.sku?.trim() || "CUSTOM",
            price,
            quantity,
            discount: discount || undefined,
            imageUrl: raw.imageUrl?.trim() || "",
          };
        });

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = items.reduce((s, i) => s + (i.discount ?? 0), 0);
  const shippingFee = 0;
  const grandTotal = Math.max(0, subtotal - discount);
  db.orderSeq += 1;
  const now = new Date().toISOString();
  const number = `BS-${todayCode()}-${String(db.orderSeq).padStart(4, "0")}`;
  const paymentMethod = MANUAL_PAY[kind];

  const order: Order = {
    id: nanoid(12),
    number,
    token: nanoid(32),
    status: "completed",
    origin: "manual",
    channel: kind,
    items,
    subtotal,
    shippingFee,
    discount,
    grandTotal,
    shippingMethod: "standard",
    address,
    paymentMethod,
    customerNote: input.customerNote?.trim() || undefined,
    wantReceipt: kind === "receipt" || undefined,
    billing: input.billing,
    shipmentIds: [],
    events: [],
    createdAt: now,
    updatedAt: now,
    paidAt: now,
  };
  pushEvent(order, "created", kind === "receipt" ? "ออกบิลพิมพ์เอง" : "ออกใบปะหน้าพิมพ์เอง", "admin");

  const payment: Payment = {
    id: nanoid(12),
    orderId: order.id,
    provider: paymentMethod,
    amount: grandTotal,
    status: "paid",
    createdAt: now,
    updatedAt: now,
  };
  order.paymentId = payment.id;

  if (kind === "receipt") {
    await issueCashReceipt(db, order);
  }

  db.orders.push(order);
  db.payments.push(payment);
  await saveDb(db);
  return { order, payment, document: db.documents.find((d) => d.id === order.documentId) };
}

async function deleteManualOrder__impl(orderId: string) {
  const db = await ensureDb();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("ไม่พบเอกสาร");
  if (order.origin !== "manual") throw new Error("ลบได้เฉพาะเอกสารพิมพ์เอง");
  db.orders = db.orders.filter((o) => o.id !== orderId);
  db.payments = db.payments.filter((p) => p.orderId !== orderId);
  db.documents = db.documents.filter((d) => d.orderId !== orderId);
  db.shipments = db.shipments.filter((s) => s.orderId !== orderId);
  await saveDb(db);
  return { ok: true };
}

export async function getOrderByToken(token: string) {
  const db = await ensureDb();
  const order = db.orders.find((o) => o.token === token);
  if (!order) return null;
  const payment = db.payments.find((p) => p.id === order.paymentId);
  const document = db.documents.find((d) => d.id === order.documentId);
  const shipments = db.shipments.filter((s) => order.shipmentIds.includes(s.id));
  return { order, payment, document, shipments, settings: db.settings };
}

export async function getOrderByNumberAndPhone(number: string, phone: string) {
  const db = await ensureDb();
  const order = db.orders.find(
    (o) =>
      o.number.toLowerCase() === number.toLowerCase() &&
      phonesMatch(o.address.phone, phone),
  );
  if (!order) return null;
  return getOrderByToken(order.token);
}

export type { AdminOrderRow, TrackBillSummary };

function toOrderRow(db: DbShape, order: Order): AdminOrderRow {
  return {
    order,
    payment: db.payments.find((p) => p.id === order.paymentId),
    document: db.documents.find((d) => d.id === order.documentId),
    shipments: db.shipments.filter((s) => order.shipmentIds.includes(s.id)),
  };
}

export async function listOrders(filters?: {
  status?: string;
  q?: string;
  from?: string;
  to?: string;
  paymentMethod?: string;
  carrier?: string;
  hasReceipt?: string;
  origin?: string;
}) {
  const db = await ensureDb();
  let orders = db.orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (filters?.status) {
    orders = orders.filter((o) => o.status === filters.status);
  }
  if (filters?.origin === "manual") {
    orders = orders.filter((o) => o.origin === "manual");
  }
  if (filters?.origin === "shop") {
    orders = orders.filter((o) => o.origin !== "manual");
  }
  if (filters?.from) {
    orders = orders.filter((o) => bangkokDay(o.createdAt) >= filters.from!);
  }
  if (filters?.to) {
    orders = orders.filter((o) => bangkokDay(o.createdAt) <= filters.to!);
  }
  if (filters?.paymentMethod) {
    orders = orders.filter((o) => o.paymentMethod === filters.paymentMethod);
  }
  if (filters?.carrier) {
    orders = orders.filter((o) =>
      db.shipments.some((s) => o.shipmentIds.includes(s.id) && s.carrier === filters.carrier),
    );
  }
  if (filters?.hasReceipt === "yes") {
    orders = orders.filter((o) => Boolean(o.documentId));
  }
  if (filters?.hasReceipt === "no") {
    orders = orders.filter((o) => !o.documentId);
  }
  if (filters?.q) {
    const q = filters.q.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    orders = orders.filter((o) => {
      const phone = o.address.phone.replace(/\D/g, "");
      return (
        o.number.toLowerCase().includes(q) ||
        o.address.fullName.toLowerCase().includes(q) ||
        o.address.phone.includes(q) ||
        (digits.length >= 3 && phone.includes(digits)) ||
        (o.address.email ?? "").toLowerCase().includes(q) ||
        (o.externalRef ?? "").toLowerCase().includes(q)
      );
    });
  }
  return orders.map((order) => toOrderRow(db, order));
}

export async function getOrdersAdminByIds(ids: string[]) {
  const db = await ensureDb();
  const found = [];
  for (const id of ids) {
    const order = db.orders.find((o) => o.id === id || o.token === id || o.number === id);
    if (order) found.push(toOrderRow(db, order));
  }
  return found;
}

export async function getOrderAdmin(id: string) {
  const db = await ensureDb();
  const order = db.orders.find((o) => o.id === id || o.number === id);
  if (!order) return null;
  return toOrderRow(db, order);
}

const COUNTED_REVENUE: OrderStatus[] = ["paid", "packing", "shipped", "delivered", "completed"];

function bangkokDay(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function bangkokToday() {
  return bangkokDay(new Date().toISOString());
}

export async function getDashboard() {
  const db = await ensureDb();
  const today = bangkokToday();
  const monthPrefix = today.slice(0, 7);
  const shopOrders = db.orders.filter((o) => o.origin !== "manual");
  const byStatus = (status: OrderStatus) => shopOrders.filter((o) => o.status === status);

  const countsAsShopRevenue = (o: Order) =>
    COUNTED_REVENUE.includes(o.status) && o.paidAt && o.origin !== "manual";

  const revenueInRange = (prefixLen: number, key: string) =>
    db.orders
      .filter(countsAsShopRevenue)
      .filter((o) => bangkokDay(o.paidAt!).slice(0, prefixLen) === key)
      .reduce((s, o) => s + o.grandTotal, 0);

  const lowStock = db.products.filter((p) => p.stock <= 5).sort((a, b) => a.stock - b.stock);

  return {
    shopName: db.settings.shopName,
    paymentsLive: db.settings.paymentsLive,
    counts: {
      pendingPayment: byStatus("pending_payment").length,
      awaitingSlip: byStatus("payment_submitted").length,
      paid: byStatus("paid").length,
      packing: byStatus("packing").length,
      shipped: byStatus("shipped").length,
      open:
        byStatus("pending_payment").length +
        byStatus("payment_submitted").length +
        byStatus("paid").length +
        byStatus("packing").length +
        byStatus("shipped").length,
      wholesaleNew: db.inquiries.filter((i) => i.status === "new").length,
    },
    todayRevenue: revenueInRange(10, today),
    monthRevenue: revenueInRange(7, monthPrefix),
    orderCount: shopOrders.length,
    wholesaleCount: db.inquiries.length,
    recentWholesale: db.inquiries
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5),
    lowStock,
    recent: shopOrders
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8)
      .map((order) => toOrderRow(db, order)),
  };
}

export async function listPendingSlips() {
  const rows = await listOrders({ status: "payment_submitted" });
  return rows.filter((r) => r.payment?.slipPath);
}

async function issueCashReceipt(db: DbShape, order: Order) {
  if (order.documentId) {
    return db.documents.find((d) => d.id === order.documentId)!;
  }
  db.receiptSeq += 1;
  const number = `RC-${todayCode()}-${String(db.receiptSeq).padStart(4, "0")}`;
  const doc: DocumentRecord = {
    id: nanoid(12),
    orderId: order.id,
    type: "cash_receipt",
    number,
    issuedAt: new Date().toISOString(),
    emailedAt: null,
    printCount: 0,
  };
  const receiptEmail = order.billing?.email || order.address.email;
  if (order.wantReceipt && receiptEmail) {
    doc.emailedAt = new Date().toISOString();
    pushEvent(order, "receipt_issued", `ออกบิลเงินสด ${number} ส่งไป ${receiptEmail}`);
  } else {
    pushEvent(order, "receipt_issued", `ออกบิลเงินสด ${number}`);
  }
  db.documents.push(doc);
  order.documentId = doc.id;
  return doc;
}

async function markOrderPaid__impl(orderId: string, by = "system") {
  const db = await ensureDb();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("ไม่พบออเดอร์");
  if (order.status === "cancelled") throw new Error("ออเดอร์ถูกยกเลิกแล้ว");

  const payment = db.payments.find((p) => p.id === order.paymentId);
  if (payment) {
    payment.status = "paid";
    payment.updatedAt = new Date().toISOString();
  }
  order.status = "paid";
  order.paidAt = new Date().toISOString();
  pushEvent(order, "paid", "ยืนยันชำระเงินแล้ว", by);
  const document = await issueCashReceipt(db, order);
  await saveDb(db);
  return { order, payment, document };
}

async function submitSlip__impl(orderId: string, slipPath: string, transferredAt?: string) {
  const db = await ensureDb();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("ไม่พบออเดอร์");
  const payment = db.payments.find((p) => p.id === order.paymentId);
  if (!payment) throw new Error("ไม่พบการชำระเงิน");
  payment.slipPath = slipPath;
  payment.transferredAt = transferredAt ?? new Date().toISOString();
  payment.status = "submitted";
  payment.updatedAt = new Date().toISOString();
  order.status = "payment_submitted";
  pushEvent(order, "slip_submitted", "ลูกค้าอัปโหลดสลิปแล้ว");
  await saveDb(db);
  return { order, payment };
}

async function attachPaymentSlip__impl(orderId: string, slipPath: string, by = "admin") {
  const db = await ensureDb();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("ไม่พบออเดอร์");
  if (order.status === "cancelled" || order.status === "refunded") {
    throw new Error("ออเดอร์นี้ปิดไปแล้ว");
  }
  const payment = db.payments.find((p) => p.id === order.paymentId);
  if (!payment) throw new Error("ไม่พบการชำระเงิน");
  payment.slipPath = slipPath;
  payment.transferredAt = payment.transferredAt ?? new Date().toISOString();
  payment.updatedAt = new Date().toISOString();
  if (order.status === "pending_payment") {
    payment.status = "submitted";
    order.status = "payment_submitted";
  }
  pushEvent(order, "slip_attached", "แนบสลิปโอนเงิน", by);
  await saveDb(db);
  return { order, payment };
}

export async function mockPay(orderId: string) {
  return markOrderPaid(orderId, "mock");
}

async function setOrderStatus__impl(orderId: string, status: OrderStatus, by = "admin") {
  const db = await ensureDb();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("ไม่พบออเดอร์");
  if (order.status === "cancelled" || order.status === "refunded") {
    throw new Error("ออเดอร์นี้ปิดไปแล้ว ย้ายสถานะไม่ได้");
  }
  if (status === "cancelled" || status === "refunded") {
    throw new Error("ใช้ปุ่มยกเลิกหรือคืนเงินด้านล่าง");
  }
  if (order.status === status) return order;

  const from = order.status;
  const now = new Date().toISOString();
  const paidLike: OrderStatus[] = ["paid", "packing", "shipped", "delivered", "completed"];
  if (paidLike.includes(status) && !order.paidAt) {
    const payment = db.payments.find((p) => p.id === order.paymentId);
    if (payment) {
      payment.status = "paid";
      payment.updatedAt = now;
    }
    order.paidAt = now;
    await issueCashReceipt(db, order);
  }

  order.status = status;
  order.updatedAt = now;
  const fromLabel = ORDER_STATUS_LABEL[from] ?? from;
  const toLabel = ORDER_STATUS_LABEL[status] ?? status;
  pushEvent(order, "status", `ย้ายสถานะจาก ${fromLabel} เป็น ${toLabel}`, by);
  await saveDb(db);
  return order;
}

export async function startPacking(orderId: string) {
  return setOrderStatus(orderId, "packing");
}

async function shipOrder__impl(
  orderId: string,
  input: { carrier: Carrier; trackingNo: string; note?: string; photoPaths?: string[] },
) {
  const db = await ensureDb();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("ไม่พบออเดอร์");
  if (!input.trackingNo.trim() && input.carrier !== "pickup") {
    throw new Error("ต้องใส่เลขแทรก");
  }
  const shipment: Shipment = {
    id: nanoid(12),
    orderId,
    carrier: input.carrier,
    trackingNo: input.trackingNo.trim(),
    note: input.note,
    photoPaths: input.photoPaths?.length ? input.photoPaths : undefined,
    shippedAt: new Date().toISOString(),
  };
  db.shipments.push(shipment);
  order.shipmentIds.push(shipment.id);
  order.status = "shipped";
  pushEvent(
    order,
    "shipped",
    `ส่งแล้ว (${input.carrier}) ${input.trackingNo || "นัดรับ"}`,
    "admin",
  );
  await saveDb(db);
  return { order, shipment };
}

async function updateShipment__impl(
  orderId: string,
  shipmentId: string,
  input: { carrier: Carrier; trackingNo: string },
) {
  const db = await ensureDb();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("ไม่พบออเดอร์");
  const shipment = db.shipments.find((s) => s.id === shipmentId && s.orderId === orderId);
  if (!shipment) throw new Error("ไม่พบพัสดุ");
  if (!CARRIERS.includes(input.carrier)) throw new Error("ขนส่งไม่ถูกต้อง");

  const trackingNo = input.carrier === "pickup" ? "" : input.trackingNo.trim();
  if (!trackingNo && input.carrier !== "pickup") {
    throw new Error("ต้องใส่เลขแทรก");
  }

  const prevCarrier = shipment.carrier;
  const prevNo = shipment.trackingNo;
  const changed =
    prevCarrier !== input.carrier ||
    normalizeTrackingNo(prevNo) !== normalizeTrackingNo(trackingNo);
  if (!changed) return { order, shipment, changed: false as const };

  shipment.carrier = input.carrier;
  shipment.trackingNo = trackingNo;
  shipment.carrierStatus = null;
  shipment.carrierSubStatus = null;
  shipment.carrierStatusText = null;
  shipment.carrierStatusAt = null;
  shipment.trackRegisteredAt = null;
  shipment.trackRegisterError = null;
  shipment.deliveredAt = null;
  if (order.status === "delivered") order.status = "shipped";
  order.updatedAt = new Date().toISOString();
  pushEvent(
    order,
    "ship_edit",
    `แก้พัสดุ ${carrierLabel(prevCarrier)} ${prevNo || "—"} → ${carrierLabel(input.carrier)} ${trackingNo || "นัดรับ"}`,
    "admin",
  );
  await saveDb(db);
  return { order, shipment, changed: true as const };
}

async function addShipmentPhotos__impl(orderId: string, shipmentId: string, photoPaths: string[]) {
  const db = await ensureDb();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("ไม่พบออเดอร์");
  const shipment = db.shipments.find((s) => s.id === shipmentId && s.orderId === orderId);
  if (!shipment) throw new Error("ไม่พบพัสดุ");
  const next = [...(shipment.photoPaths ?? []), ...photoPaths];
  if (next.length > 8) throw new Error("อัปภาพได้ไม่เกิน 8 รูปต่อพัสดุ");
  shipment.photoPaths = next;
  pushEvent(order, "ship_photo", `อัปภาพพัสดุเพิ่ม ${photoPaths.length} รูป`, "admin");
  await saveDb(db);
  return shipment;
}

export async function getShipmentPhotoForToken(token: string, filename: string) {
  const detail = await getOrderByToken(token);
  if (!detail) return null;
  const allowed = detail.shipments.some((s) => (s.photoPaths ?? []).includes(filename));
  if (!allowed) return null;
  return safeUploadName(filename);
}

async function markDelivered__impl(orderId: string) {
  const db = await ensureDb();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("ไม่พบออเดอร์");
  order.status = "delivered";
  for (const sid of order.shipmentIds) {
    const s = db.shipments.find((x) => x.id === sid);
    if (s && !s.deliveredAt) s.deliveredAt = new Date().toISOString();
  }
  pushEvent(order, "delivered", "ถึงมือลูกค้าแล้ว");
  await saveDb(db);
  return order;
}

export function isTrackableShipment(shipment: Shipment) {
  return Boolean(shipment.trackingNo.trim()) && shipment.carrier !== "pickup";
}

export async function listTrackableShipmentRows() {
  const db = await ensureDb();
  const rows: { shipment: Shipment; order: Order }[] = [];
  for (const shipment of db.shipments) {
    if (!isTrackableShipment(shipment) || shipment.deliveredAt) continue;
    const order = db.orders.find((o) => o.id === shipment.orderId);
    if (order?.status === "shipped") rows.push({ shipment, order });
  }
  return rows;
}

export async function listTrackableShipments() {
  return (await listTrackableShipmentRows()).map((row) => row.shipment);
}

async function markShipmentTrackMeta__impl(
  shipmentId: string,
  meta: { registered?: boolean; error?: string | null },
) {
  const db = await ensureDb();
  const shipment = db.shipments.find((s) => s.id === shipmentId);
  if (!shipment) return null;
  if (meta.registered) {
    shipment.trackRegisteredAt = new Date().toISOString();
    shipment.trackRegisterError = null;
  }
  if (meta.error !== undefined) shipment.trackRegisterError = meta.error;
  await saveDb(db);
  return shipment;
}

async function applyCarrierTrackingUpdate__impl(snapshot: Track17Snapshot) {
  const db = await ensureDb();
  const normalized = normalizeTrackingNo(snapshot.trackingNo);
  const shipment = db.shipments.find((s) => {
    if (snapshot.tag && s.id === snapshot.tag) return true;
    return normalizeTrackingNo(s.trackingNo) === normalized;
  });
  if (!shipment) return { ok: false as const, reason: "not_found" };
  const order = db.orders.find((o) => o.id === shipment.orderId);
  if (!order) return { ok: false as const, reason: "no_order" };
  if (order.status === "cancelled" || order.status === "refunded" || order.status === "completed") {
    return { ok: false as const, reason: "closed" };
  }

  const prevStatus = shipment.carrierStatus ?? "";
  shipment.carrierStatus = snapshot.status;
  shipment.carrierSubStatus = snapshot.subStatus ?? null;
  shipment.carrierStatusText = snapshot.description ?? null;
  shipment.carrierStatusAt = snapshot.at ?? new Date().toISOString();

  const mapped = mapTrack17ToShop(snapshot.status, snapshot.subStatus);
  const changed = prevStatus !== snapshot.status;

  if (mapped === "delivered" && (order.status === "shipped" || order.status === "packing")) {
    order.status = "delivered";
    shipment.deliveredAt = shipment.carrierStatusAt;
    pushEvent(
      order,
      "delivered",
      `ขนส่งยืนยันถึงมือแล้ว${snapshot.description ? ` — ${snapshot.description}` : ""}`,
      "17track",
    );
  } else if (mapped === "exception" && changed) {
    pushEvent(
      order,
      "ship_exception",
      `ขนส่งแจ้งปัญหา${snapshot.description ? ` — ${snapshot.description}` : ` (${snapshot.status})`}`,
      "17track",
    );
  } else if (changed && order.status === "shipped") {
    const label =
      snapshot.status === "OutForDelivery"
        ? "กำลังนำจ่าย"
        : snapshot.status === "InTransit"
          ? "กำลังขนส่ง"
          : snapshot.status === "AvailableForPickup"
            ? "ถึงจุดรับแล้ว"
            : snapshot.status === "InfoReceived"
              ? "ขนส่งรับข้อมูลแล้ว"
              : snapshot.status;
    pushEvent(order, "ship_update", `อัปเดตจากขนส่ง: ${label}`, "17track");
  }

  await saveDb(db);
  return { ok: true as const, orderId: order.id, status: order.status };
}

async function incrementPrintCount__impl(documentId: string) {
  const db = await ensureDb();
  const doc = db.documents.find((d) => d.id === documentId);
  if (!doc) throw new Error("ไม่พบเอกสาร");
  doc.printCount += 1;
  await saveDb(db);
  return doc;
}

export async function getBrandsAndCategories() {
  const db = await ensureDb();
  return { brands: withBrandLogos(db.brands), categories: db.categories };
}

function restoreStock(db: DbShape, order: Order) {
  for (const item of order.items) {
    const product = db.products.find((p) => p.id === item.productId);
    if (!product) continue;
    if (item.variantId && product.variants?.length) {
      const variant = product.variants.find((v) => v.id === item.variantId);
      if (variant) variant.stock += item.quantity;
      product.stock = product.variants.reduce((s, v) => s + v.stock, 0);
    } else {
      product.stock += item.quantity;
    }
  }
}

async function rejectSlip__impl(orderId: string, reason: string, by = "admin") {
  const db = await ensureDb();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("ไม่พบออเดอร์");
  if (order.status !== "payment_submitted") throw new Error("ออเดอร์นี้ไม่อยู่ในคิวตรวจสลิป");
  const payment = db.payments.find((p) => p.id === order.paymentId);
  if (payment) {
    payment.status = "pending";
    payment.updatedAt = new Date().toISOString();
  }
  order.status = "pending_payment";
  const note = reason.trim() || "สลิปไม่ถูกต้อง";
  pushEvent(order, "slip_rejected", `สลิปไม่ผ่าน: ${note}`, by);
  await saveDb(db);
  return toOrderRow(db, order);
}

async function cancelOrder__impl(orderId: string, reason: string, by = "admin") {
  const db = await ensureDb();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("ไม่พบออเดอร์");
  if (order.status === "cancelled" || order.status === "refunded") {
    throw new Error("ออเดอร์นี้ปิดไปแล้ว");
  }
  if (order.status === "shipped" || order.status === "delivered" || order.status === "completed") {
    throw new Error("ส่งของแล้ว — ใช้คืนเงินแทน");
  }
  restoreStock(db, order);
  order.status = "cancelled";
  const payment = db.payments.find((p) => p.id === order.paymentId);
  if (payment && payment.status !== "paid") {
    payment.status = "cancelled";
    payment.updatedAt = new Date().toISOString();
  }
  pushEvent(order, "cancelled", `ยกเลิก: ${reason.trim() || "ไม่มีเหตุผล"}`, by);
  await saveDb(db);
  return toOrderRow(db, order);
}

async function refundOrder__impl(orderId: string, reason: string, by = "admin") {
  const db = await ensureDb();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("ไม่พบออเดอร์");
  if (order.status === "cancelled" || order.status === "refunded") {
    throw new Error("ออเดอร์นี้ปิดไปแล้ว");
  }
  if (order.status === "pending_payment" || order.status === "payment_submitted") {
    throw new Error("ยังไม่ได้รับเงิน — ใช้ยกเลิกแทน");
  }
  if (order.status === "paid" || order.status === "packing") {
    restoreStock(db, order);
  }
  order.status = "refunded";
  const payment = db.payments.find((p) => p.id === order.paymentId);
  if (payment) {
    payment.status = "cancelled";
    payment.updatedAt = new Date().toISOString();
  }
  pushEvent(order, "refunded", `คืนเงิน: ${reason.trim() || "ไม่มีเหตุผล"}`, by);
  await saveDb(db);
  return toOrderRow(db, order);
}

async function completeOrder__impl(orderId: string, by = "admin") {
  const db = await ensureDb();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("ไม่พบออเดอร์");
  if (order.status !== "delivered") throw new Error("ต้องถึงมือลูกค้าก่อนจึงจะปิดงาน");
  order.status = "completed";
  pushEvent(order, "completed", "ปิดงานแล้ว", by);
  await saveDb(db);
  return toOrderRow(db, order);
}

async function saveAdminNote__impl(orderId: string, note: string, by = "admin") {
  const db = await ensureDb();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("ไม่พบออเดอร์");
  order.adminNote = note;
  order.updatedAt = new Date().toISOString();
  pushEvent(order, "note", note.trim() ? "บันทึกโน้ตภายใน" : "ลบโน้ตภายใน", by);
  await saveDb(db);
  return toOrderRow(db, order);
}

export async function saveProductInput(input: Partial<Product> & { id?: string }) {
  const db = await ensureDb();
  const nowId = input.id || `p-${nanoid(10)}`;
  const existing = db.products.find((p) => p.id === nowId);
  const nameTh = (input.nameTh ?? existing?.nameTh ?? "").trim();
  const name = (input.name ?? existing?.name ?? nameTh).trim();
  if (!nameTh) throw new Error("ต้องใส่ชื่อสินค้า");
  const price = Number(input.price ?? existing?.price ?? 0);
  const stock = Number(input.stock ?? existing?.stock ?? 0);
  if (!Number.isFinite(price) || price < 0) throw new Error("ราคาไม่ถูกต้อง");
  if (!Number.isFinite(stock) || stock < 0) throw new Error("สต็อกไม่ถูกต้อง");

  const slugBase = (input.slug ?? existing?.slug ?? nameTh).trim();
  const slug = slugify(slugBase) || nowId;

  const variants = normalizeVariants(input.variants, existing?.variants);
  const parentSku = (input.sku ?? existing?.sku ?? nowId).trim();
  variants?.forEach((v) => {
    if (!v.sku) v.sku = parentSku;
  });
  const synced = syncFromVariants({
    price,
    stock,
    sku: parentSku,
    compareAtPrice: input.compareAtPrice ?? existing?.compareAtPrice,
    variants,
  });

  const product: Product = {
    id: nowId,
    slug,
    name,
    nameTh,
    description: input.description ?? existing?.description ?? "",
    price: variants?.length ? synced.price : price,
    compareAtPrice: variants?.length ? synced.compareAtPrice : input.compareAtPrice ?? existing?.compareAtPrice,
    stock: variants?.length ? synced.stock : stock,
    imageUrl: input.imageUrl ?? existing?.imageUrl ?? "",
    images: input.images ?? existing?.images ?? (input.imageUrl ? [String(input.imageUrl)] : []),
    brandIds: input.brandIds ?? existing?.brandIds ?? [],
    categoryIds: input.categoryIds ?? existing?.categoryIds ?? [],
    compatibilities: input.compatibilities ?? existing?.compatibilities ?? [],
    featured: input.featured ?? existing?.featured ?? false,
    shopeeUrl: input.shopeeUrl === undefined ? existing?.shopeeUrl : input.shopeeUrl,
    lazadaUrl: input.lazadaUrl === undefined ? existing?.lazadaUrl : input.lazadaUrl,
    tiktokUrl: input.tiktokUrl === undefined ? existing?.tiktokUrl : input.tiktokUrl,
    sku: synced.sku,
    variants,
  };
  return upsertProduct(product);
}

async function createWholesaleLead__impl(input: {
  shopName: string;
  province: string;
  channel: string;
  contact: string;
  note?: string;
}) {
  const shopName = input.shopName.trim();
  const province = input.province.trim();
  const contact = input.contact.trim();
  const channel = input.channel.trim();
  const note = (input.note ?? "").trim();
  if (shopName.length < 2 || shopName.length > 80) throw new Error("กรอกชื่อร้านให้ถูกต้อง");
  if (province.length < 2 || province.length > 40) throw new Error("กรอกจังหวัดให้ถูกต้อง");
  if (contact.length < 5 || contact.length > 80) throw new Error("กรอกเบอร์หรือ LINE ให้ถูกต้อง");
  if (note.length > 1000) throw new Error("รายละเอียดยาวเกินไป");
  const allowed = ["ร้านหน้าร้าน", "Shopee / Lazada", "อู่ / โรงงาน", "อื่น ๆ"];
  if (!allowed.includes(channel)) throw new Error("ช่องทางขายไม่ถูกต้อง");

  const db = await ensureDb();
  db.inquirySeq += 1;
  const now = new Date().toISOString();
  const lead: WholesaleLead = {
    id: nanoid(12),
    number: `WS-${todayCode()}-${String(db.inquirySeq).padStart(4, "0")}`,
    shopName,
    province,
    channel,
    contact,
    note,
    status: "new",
    createdAt: now,
    updatedAt: now,
  };
  db.inquiries.push(lead);
  await saveDb(db);
  return lead;
}

// ---------- 3D-print quote requests ----------

async function savePrintQuote__impl(quote: PrintQuote) {
  const db = await ensureDb();
  db.printQuotes ??= [];
  if (db.printQuotes.some((q) => q.id === quote.id)) throw new Error("เลขคำขอซ้ำ");
  db.printQuotes.push(quote);
  await saveDb(db);
  return quote;
}

export async function listPrintQuotes(status?: string) {
  const db = await ensureDb();
  let items = (db.printQuotes ?? []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (status) items = items.filter((q) => q.status === status);
  // Attach the order's bill token so the admin can re-copy the payment message any time.
  const byId = new Map(db.orders.map((o) => [o.id, o]));
  return items.map((q) => {
    const o = q.orderId ? byId.get(q.orderId) : undefined;
    return o ? { ...q, orderToken: o.token, orderTotal: o.grandTotal, orderStatus: o.status } : q;
  });
}

async function updatePrintQuote__impl(id: string, patch: { status?: PrintQuoteStatus; adminNote?: string }) {
  const db = await ensureDb();
  const q = (db.printQuotes ?? []).find((x) => x.id === id);
  if (!q) throw new Error("ไม่พบคำขอ");
  if (patch.status) {
    if (!["new", "closed"].includes(patch.status)) throw new Error("สถานะไม่ถูกต้อง");
    if (q.status === "ordered") throw new Error("คำขอนี้เปิดออเดอร์แล้ว จัดการต่อที่หน้าออเดอร์");
    q.status = patch.status;
  }
  if (patch.adminNote !== undefined) q.adminNote = String(patch.adminNote).slice(0, 2000);
  q.updatedAt = new Date().toISOString();
  await saveDb(db);
  return q;
}

/**
 * Shop confirmed the price: create a normal shop order (pending payment) from the quote,
 * so the usual slip → paid → ship (tracking) → bill-page flow applies.
 */
async function printQuoteToOrder__impl(id: string, input: { printTHB: number; shippingFee: number; note?: string }) {
  const db = await ensureDb();
  const q = (db.printQuotes ?? []).find((x) => x.id === id);
  if (!q) throw new Error("ไม่พบคำขอ");
  if (q.status === "ordered" && q.orderId) throw new Error(`เปิดออเดอร์แล้ว (${q.orderNumber})`);
  const price = Math.round(Number(input.printTHB));
  const shippingFee = Math.round(Number(input.shippingFee));
  if (!Number.isFinite(price) || price <= 0 || price > 1_000_000) throw new Error("ใส่ราคาพิมพ์ให้ถูกต้อง");
  if (!Number.isFinite(shippingFee) || shippingFee < 0 || shippingFee > 10_000) throw new Error("ใส่ค่าส่งให้ถูกต้อง");

  const loc = completeThaiAddress({
    province: q.contact.province,
    district: q.contact.district,
    subdistrict: q.contact.subdistrict,
    postalCode: q.contact.zip,
  });
  const address: ShippingAddress = {
    fullName: q.contact.name,
    phone: q.contact.phone,
    line1: q.contact.address,
    subdistrict: loc.subdistrict || q.contact.subdistrict,
    district: loc.district || q.contact.district,
    province: loc.province || q.contact.province,
    postalCode: loc.postalCode || q.contact.zip,
  };
  const files = q.files.filter((f) => f.status !== "error");
  const pieces = files.reduce((s, f) => s + f.qty, 0);
  const proc = q.process === "fdm" ? "FDM PETG" : "Resin";
  const layer = q.process === "fdm" ? (q.quality === "fine" ? "0.15" : "0.25") : q.quality === "fine" ? "ละเอียด" : "ปกติ";
  const items: OrderItem[] = [
    {
      productId: "custom",
      name: `งานพิมพ์ 3D ${proc} · layer ${layer}`,
      variantName: `${files.length} ไฟล์ · ${pieces} ชิ้น · คำขอ #${q.id}`,
      sku: `PRINT3D-${q.id}`,
      price,
      quantity: 1,
      imageUrl: "/print/part.png",
    },
  ];
  // Job details for the shop (not shown to the customer): files, wanted sizes, notes.
  const fileLines = files.map((f) => {
    const dims = f.dims ? ` ${f.dims.map((n) => Math.round(n)).join("×")} มม.` : "";
    const want = f.wantMm?.some(Boolean) ? ` → ต้องการ ${f.wantMm.map((n) => n || "-").join("×")} มม.` : "";
    const note = f.note?.trim() ? ` · ${f.note.trim()}` : "";
    const warn = f.status === "warn" ? ` ⚠ ${f.statusText}` : "";
    return `• ${f.name} × ${f.qty}${dims}${want}${note}${warn}`;
  });
  const adminNote = [input.note?.trim() ?? "", `งานพิมพ์ 3D คำขอ #${q.id}`, ...fileLines].filter(Boolean).join("\n").slice(0, 4000);
  db.orderSeq += 1;
  const now = new Date().toISOString();
  const order: Order = {
    id: nanoid(12),
    number: `BS-${todayCode()}-${String(db.orderSeq).padStart(4, "0")}`,
    token: nanoid(32),
    status: "pending_payment",
    origin: "shop",
    externalRef: q.id,
    items,
    subtotal: price,
    shippingFee,
    discount: 0,
    grandTotal: price + shippingFee,
    shippingMethod: q.shipping === "rider" ? "rider" : "standard",
    address,
    paymentMethod: "bank_transfer",
    customerNote:
      [
        q.shipping === "rider" ? "ส่งด่วน Grab/ไรเดอร์ ลูกค้าจ่ายค่าส่งปลายทาง" : "",
        q.contact.wantDate ? `ต้องการรับ ${q.contact.wantDate}` : "",
        q.contact.lineId ? `LINE ${q.contact.lineId}` : "",
      ]
        .filter(Boolean)
        .join(" · ") || undefined,
    adminNote,
    shipmentIds: [],
    events: [],
    createdAt: now,
    updatedAt: now,
  };
  pushEvent(order, "created", `สร้างออเดอร์จากคำขอพิมพ์ 3D #${q.id}`);
  const payment: Payment = {
    id: nanoid(12),
    orderId: order.id,
    provider: "bank_transfer",
    amount: order.grandTotal,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  order.paymentId = payment.id;
  db.orders.push(order);
  db.payments.push(payment);
  q.status = "ordered";
  q.orderId = order.id;
  q.orderNumber = order.number;
  q.updatedAt = now;
  await saveDb(db);
  return { quote: q, order };
}

export async function listWholesaleLeads(status?: string) {
  const db = await ensureDb();
  let items = db.inquiries.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (status) items = items.filter((i) => i.status === status);
  return items;
}

async function updateWholesaleLead__impl(
  id: string,
  patch: { status?: WholesaleLeadStatus; adminNote?: string },
) {
  const db = await ensureDb();
  const lead = db.inquiries.find((i) => i.id === id);
  if (!lead) throw new Error("ไม่พบใบสมัครขายส่ง");
  if (patch.status && !["new", "contacted", "closed"].includes(patch.status)) {
    throw new Error("สถานะไม่ถูกต้อง");
  }
  if (patch.status) {
    lead.status = patch.status;
    if (patch.status === "contacted" && !lead.contactedAt) {
      lead.contactedAt = new Date().toISOString();
    }
  }
  if (patch.adminNote !== undefined) lead.adminNote = patch.adminNote;
  lead.updatedAt = new Date().toISOString();
  await saveDb(db);
  return lead;
}

async function attachPaysoRef__impl(orderId: string, paysoRef: string, transactionId: string) {
  const db = await ensureDb();
  const order = db.orders.find((o) => o.id === orderId);
  const payment = order && db.payments.find((p) => p.id === order.paymentId);
  if (!order || !payment) throw new Error("ไม่พบออเดอร์");
  payment.paysoRef = paysoRef;
  payment.providerRef = transactionId || undefined;
  payment.updatedAt = new Date().toISOString();
  pushEvent(order, "payso_created", "สร้างรายการชำระเงิน Payso แล้ว");
  await saveDb(db);
}

export async function findOrderByPaysoRef(paysoRef: string) {
  const db = await ensureDb();
  const payment = db.payments.find((p) => p.paysoRef === paysoRef);
  const order = payment && db.orders.find((o) => o.id === payment.orderId);
  return order && payment ? { order, payment } : null;
}

/** Call only with a result verified via Payso inquiry (never trust the postback body). */
export async function confirmPaysoPaid(paysoRef: string, verifiedTotal: number, paysoOrderNo?: string) {
  const found = await findOrderByPaysoRef(paysoRef);
  if (!found) throw new Error("order not found");
  const { order } = found;
  if (order.status !== "pending_payment" && order.status !== "payment_submitted") {
    return { order, duplicate: true };
  }
  if (Math.round(verifiedTotal * 100) !== Math.round(order.grandTotal * 100)) {
    throw new Error("amount mismatch");
  }
  const result = await markOrderPaid(order.id, paysoOrderNo ? `payso #${paysoOrderNo}` : "payso");
  return { order: result.order, duplicate: false };
}

// Every read-modify-write re-runs on a concurrent-save conflict (see state-store.ts).
export const getSettings = withStateRetry(getSettings__impl);
export const updateSettings = withStateRetry(updateSettings__impl);
export const saveShopReview = withStateRetry(saveShopReview__impl);
export const deleteShopReview = withStateRetry(deleteShopReview__impl);
export const upsertProduct = withStateRetry(upsertProduct__impl);
export const deleteProducts = withStateRetry(deleteProducts__impl);
export const setProductsFeatured = withStateRetry(setProductsFeatured__impl);
export const setProductStock = withStateRetry(setProductStock__impl);
export const createOrder = withStateRetry(createOrder__impl);
export const createManualOrder = withStateRetry(createManualOrder__impl);
export const deleteManualOrder = withStateRetry(deleteManualOrder__impl);
export const markOrderPaid = withStateRetry(markOrderPaid__impl);
export const submitSlip = withStateRetry(submitSlip__impl);
export const attachPaymentSlip = withStateRetry(attachPaymentSlip__impl);
export const setOrderStatus = withStateRetry(setOrderStatus__impl);
export const shipOrder = withStateRetry(shipOrder__impl);
export const updateShipment = withStateRetry(updateShipment__impl);
export const addShipmentPhotos = withStateRetry(addShipmentPhotos__impl);
export const markDelivered = withStateRetry(markDelivered__impl);
export const markShipmentTrackMeta = withStateRetry(markShipmentTrackMeta__impl);
export const applyCarrierTrackingUpdate = withStateRetry(applyCarrierTrackingUpdate__impl);
export const incrementPrintCount = withStateRetry(incrementPrintCount__impl);
export const rejectSlip = withStateRetry(rejectSlip__impl);
export const cancelOrder = withStateRetry(cancelOrder__impl);
export const refundOrder = withStateRetry(refundOrder__impl);
export const completeOrder = withStateRetry(completeOrder__impl);
export const saveAdminNote = withStateRetry(saveAdminNote__impl);
export const createWholesaleLead = withStateRetry(createWholesaleLead__impl);
export const savePrintQuote = withStateRetry(savePrintQuote__impl);
export const updatePrintQuote = withStateRetry(updatePrintQuote__impl);
export const printQuoteToOrder = withStateRetry(printQuoteToOrder__impl);
export const updateWholesaleLead = withStateRetry(updateWholesaleLead__impl);
export const attachPaysoRef = withStateRetry(attachPaysoRef__impl);
