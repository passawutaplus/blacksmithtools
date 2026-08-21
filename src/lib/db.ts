import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { brands, categories, CATALOG_VERSION, defaultSettings, seedProducts } from "./seed";
import { linePricing, normalizeVariants, syncFromVariants } from "./product";
import { slugify } from "./utils";
import type { AdminOrderRow } from "./admin-types";
import type {
  Brand,
  Carrier,
  Cart,
  DbShape,
  DocumentRecord,
  Order,
  OrderEvent,
  OrderStatus,
  Payment,
  PaymentProvider,
  Product,
  Shipment,
  ShippingAddress,
  SiteSettings,
  WholesaleLead,
  WholesaleLeadStatus,
} from "./types";

const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "blacksmith-runtime")
  : path.join(process.cwd(), "data", "runtime");
const DB_FILE = path.join(DATA_DIR, "db.json");

export function slipDir() {
  return path.join(DATA_DIR, "slips");
}

export function slipFilePath(filename: string) {
  const base = path.basename(filename);
  if (!base || base !== filename.replace(/\\/g, "/").split("/").pop()) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(base)) return null;
  return path.join(slipDir(), base);
}

export function shipPhotoDir() {
  return path.join(DATA_DIR, "ship-photos");
}

export function shipPhotoFilePath(filename: string) {
  const base = path.basename(filename);
  if (!base || base !== filename.replace(/\\/g, "/").split("/").pop()) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(base)) return null;
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
    shippingPolicyVersion: SHIPPING_POLICY_VERSION,
    products: structuredClone(seedProducts),
    brands: structuredClone(brands),
    categories: structuredClone(categories),
    carts: [],
    orders: [],
    payments: [],
    documents: [],
    shipments: [],
    inquiries: [],
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

function applyShippingPolicy(db: DbShape): boolean {
  if (db.shippingPolicyVersion === SHIPPING_POLICY_VERSION) return false;
  db.settings.flatShippingFee = defaultSettings.flatShippingFee;
  db.settings.freeShippingMin = defaultSettings.freeShippingMin;
  db.shippingPolicyVersion = SHIPPING_POLICY_VERSION;
  return true;
}

async function ensureDb(): Promise<DbShape> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const db = JSON.parse(raw) as DbShape;
    if (!Array.isArray(db.inquiries)) db.inquiries = [];
    if (typeof db.inquirySeq !== "number") db.inquirySeq = db.inquiries.length;
    const catalogChanged = applyCatalog(db);
    const shippingChanged = applyShippingPolicy(db);
    if (catalogChanged || shippingChanged) await saveDb(db);
    return db;
  } catch {
    const db = emptyDb();
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
    return db;
  }
}

async function saveDb(db: DbShape) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
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

export async function getSettings() {
  const db = await ensureDb();
  if (!db.settings.lineUrl || db.settings.lineUrl === LEGACY_LINE_URL) {
    db.settings.lineUrl = defaultSettings.lineUrl;
    await saveDb(db);
  }
  return db.settings;
}

export async function updateSettings(patch: Partial<SiteSettings>) {
  const db = await ensureDb();
  db.settings = { ...db.settings, ...patch };
  await saveDb(db);
  return db.settings;
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

export async function upsertProduct(product: Product) {
  const db = await ensureDb();
  const idx = db.products.findIndex((p) => p.id === product.id);
  if (idx >= 0) db.products[idx] = product;
  else db.products.push(product);
  await saveDb(db);
  return product;
}

export async function deleteProducts(ids: string[]) {
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

export async function setProductsFeatured(ids: string[], featured: boolean) {
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

export async function setProductStock(id: string, stock: number) {
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

export async function getOrCreateCart(cartId?: string | null) {
  const db = await ensureDb();
  if (cartId) {
    const existing = db.carts.find((c) => c.id === cartId);
    if (existing) return existing;
  }
  const cart: Cart = { id: nanoid(16), items: [], updatedAt: new Date().toISOString() };
  db.carts.push(cart);
  await saveDb(db);
  return cart;
}

export async function updateCart(
  cartId: string,
  items: { productId: string; variantId?: string; quantity: number }[],
) {
  const db = await ensureDb();
  let cart = db.carts.find((c) => c.id === cartId);
  if (!cart) {
    cart = { id: cartId, items: [], updatedAt: new Date().toISOString() };
    db.carts.push(cart);
  }
  cart.items = items
    .filter((i) => i.quantity > 0)
    .map((i) => ({
      productId: i.productId,
      variantId: i.variantId || undefined,
      quantity: i.quantity,
    }));
  cart.updatedAt = new Date().toISOString();
  await saveDb(db);
  return cart;
}

export async function getCartWithProducts(cartId: string) {
  const db = await ensureDb();
  const cart = db.carts.find((c) => c.id === cartId);
  if (!cart) return null;
  const lines = cart.items
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
  return { cart, lines, subtotal, settings: db.settings };
}

function calcShipping(subtotal: number, settings: SiteSettings) {
  if (subtotal >= settings.freeShippingMin) return 0;
  return settings.flatShippingFee;
}

export async function createOrder(input: {
  cartId: string;
  address: ShippingAddress;
  paymentMethod: PaymentProvider;
  shippingMethod?: string;
}) {
  const db = await ensureDb();
  const cart = db.carts.find((c) => c.id === input.cartId);
  if (!cart || cart.items.length === 0) throw new Error("ตะกร้าว่าง");

  const items = cart.items.map((ci) => {
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

  cart.items = [];
  cart.updatedAt = now;
  db.orders.push(order);
  db.payments.push(payment);
  await saveDb(db);
  return { order, payment, settings: db.settings };
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
  const normalized = phone.replace(/\D/g, "");
  const order = db.orders.find(
    (o) =>
      o.number.toLowerCase() === number.toLowerCase() &&
      o.address.phone.replace(/\D/g, "") === normalized,
  );
  if (!order) return null;
  return getOrderByToken(order.token);
}

export type { AdminOrderRow };

function toOrderRow(db: DbShape, order: Order): AdminOrderRow {
  return {
    order,
    payment: db.payments.find((p) => p.id === order.paymentId),
    document: db.documents.find((d) => d.id === order.documentId),
    shipments: db.shipments.filter((s) => order.shipmentIds.includes(s.id)),
  };
}

export async function listOrders(filters?: { status?: string; q?: string }) {
  const db = await ensureDb();
  let orders = db.orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (filters?.status) {
    orders = orders.filter((o) => o.status === filters.status);
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
        (o.address.email ?? "").toLowerCase().includes(q)
      );
    });
  }
  return orders.map((order) => toOrderRow(db, order));
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
  const orders = db.orders;
  const byStatus = (status: OrderStatus) => orders.filter((o) => o.status === status);

  const revenueInRange = (prefixLen: number, key: string) =>
    orders
      .filter((o) => COUNTED_REVENUE.includes(o.status) && o.paidAt)
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
    orderCount: orders.length,
    wholesaleCount: db.inquiries.length,
    recentWholesale: db.inquiries
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5),
    lowStock,
    recent: orders
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
    emailedAt: order.address.email ? null : null,
    printCount: 0,
  };
  if (order.address.email) {
    doc.emailedAt = new Date().toISOString();
  }
  db.documents.push(doc);
  order.documentId = doc.id;
  pushEvent(order, "receipt_issued", `ออกบิลเงินสด ${number}`);
  return doc;
}

export async function markOrderPaid(orderId: string, by = "system") {
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

export async function submitSlip(orderId: string, slipPath: string, transferredAt?: string) {
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

export async function mockPay(orderId: string) {
  return markOrderPaid(orderId, "mock");
}

export async function setOrderStatus(orderId: string, status: OrderStatus, by = "admin") {
  const db = await ensureDb();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("ไม่พบออเดอร์");
  order.status = status;
  pushEvent(order, "status", `เปลี่ยนสถานะเป็น ${status}`, by);
  await saveDb(db);
  return order;
}

export async function startPacking(orderId: string) {
  return setOrderStatus(orderId, "packing");
}

export async function shipOrder(
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

export async function addShipmentPhotos(orderId: string, shipmentId: string, photoPaths: string[]) {
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
  return shipPhotoFilePath(filename);
}

export async function markDelivered(orderId: string) {
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

export async function incrementPrintCount(documentId: string) {
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

export async function rejectSlip(orderId: string, reason: string, by = "admin") {
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

export async function cancelOrder(orderId: string, reason: string, by = "admin") {
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

export async function refundOrder(orderId: string, reason: string, by = "admin") {
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

export async function completeOrder(orderId: string, by = "admin") {
  const db = await ensureDb();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("ไม่พบออเดอร์");
  if (order.status !== "delivered") throw new Error("ต้องถึงมือลูกค้าก่อนจึงจะปิดงาน");
  order.status = "completed";
  pushEvent(order, "completed", "ปิดงานแล้ว", by);
  await saveDb(db);
  return toOrderRow(db, order);
}

export async function saveAdminNote(orderId: string, note: string, by = "admin") {
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

export async function createWholesaleLead(input: {
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

export async function listWholesaleLeads(status?: string) {
  const db = await ensureDb();
  let items = db.inquiries.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (status) items = items.filter((i) => i.status === status);
  return items;
}

export async function updateWholesaleLead(
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

export async function applyPaysoWebhook(payload: {
  refno: string;
  amount: number;
  status: string;
  providerRef: string;
}) {
  const db = await ensureDb();
  const order = db.orders.find((o) => o.number === payload.refno || o.id === payload.refno);
  if (!order) throw new Error("order not found");
  const payment = db.payments.find((p) => p.id === order.paymentId);
  if (!payment) throw new Error("payment not found");
  if (payment.providerRef === payload.providerRef && payment.status === "paid") {
    return { order, payment, duplicate: true };
  }
  if (Math.round(payload.amount) !== Math.round(order.grandTotal)) {
    throw new Error("amount mismatch");
  }
  if (payload.status !== "success" && payload.status !== "paid") {
    payment.status = "failed";
    payment.updatedAt = new Date().toISOString();
    await saveDb(db);
    return { order, payment, duplicate: false };
  }
  payment.providerRef = payload.providerRef;
  await saveDb(db);
  return { ...(await markOrderPaid(order.id, "payso")), duplicate: false };
}