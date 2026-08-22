/**
 * Seeds a few demo orders into data/runtime/db.json
 * Usage: node scripts/seed-mock-orders.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dbFile = join(root, "data", "runtime", "db.json");

function nid(len = 12) {
  return randomBytes(18).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").slice(0, len);
}

function todayCode(d = new Date()) {
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

const db = JSON.parse(readFileSync(dbFile, "utf8"));
if (!Array.isArray(db.orders)) db.orders = [];
if (!Array.isArray(db.payments)) db.payments = [];
if (!Array.isArray(db.documents)) db.documents = [];
if (!Array.isArray(db.shipments)) db.shipments = [];

const existing = db.orders.filter((o) => o.demoSeed);
if (existing.length) {
  console.log("demo orders already exist:");
  for (const o of existing) {
    console.log(`  ${o.number}  ${o.status}  /bill/${o.token}`);
  }
  process.exit(0);
}

const osuka = db.products.find((p) => p.id === "p-49705099519");
const goop = db.products.find((p) => p.id === "p-21344275549");
if (!osuka || !goop) {
  throw new Error("ไม่พบสินค้าตัวอย่างในแคตตาล็อก");
}
const osukaVar = osuka.variants.find((v) => v.id === "330467973206") ?? osuka.variants[0];
const goopVar = goop.variants.find((v) => v.id === "246407444955") ?? goop.variants[0];

const address = {
  fullName: "สมชาย เครื่องมือ",
  phone: "0866259407",
  email: "demo@blacksmith.local",
  line1: "90 เพชรเกษม 63/2",
  subdistrict: "หลักสอง",
  district: "เขตบางแค",
  province: "กรุงเทพมหานคร",
  postalCode: "10160",
};

const billing = {
  name: "สมชาย เครื่องมือ",
  email: "demo@blacksmith.local",
  phone: "0866259407",
  line1: address.line1,
  subdistrict: address.subdistrict,
  district: address.district,
  province: address.province,
  postalCode: address.postalCode,
  taxId: "1101700234561",
};

const day = todayCode();
const shipFee = db.settings?.flatShippingFee ?? 35;
const now = new Date();
const t = (minsAgo) => new Date(now.getTime() - minsAgo * 60 * 1000).toISOString();

function ev(type, message, at, by = "system") {
  return { id: nid(10), at, type, message, by };
}

function line(product, variant, qty) {
  return {
    productId: product.id,
    variantId: variant.id,
    variantName: variant.name,
    name: product.nameTh || product.name,
    sku: variant.sku || product.sku,
    price: variant.price,
    quantity: qty,
    imageUrl: variant.imageUrl || product.imageUrl,
  };
}

function bumpStock(variant, qty) {
  variant.stock = Math.max(0, (variant.stock ?? 0) - qty);
}

function addOrder({
  seq,
  status,
  paid,
  shipped,
  packing,
  items,
  note,
  createdMinsAgo,
}) {
  db.orderSeq = Math.max(db.orderSeq ?? 0, seq);
  const createdAt = t(createdMinsAgo);
  const paidAt = paid ? t(createdMinsAgo - 8) : undefined;
  const packedAt = packing || shipped ? t(createdMinsAgo - 16) : undefined;
  const shippedAt = shipped ? t(createdMinsAgo - 22) : undefined;
  const orderId = nid(12);
  const paymentId = nid(12);
  const token = nid(32);
  const number = `BS-${day}-${String(seq).padStart(4, "0")}`;
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const grandTotal = subtotal + shipFee;

  let documentId;
  const events = [ev("created", "สร้างคำสั่งซื้อแล้ว", createdAt)];
  if (paidAt) {
    events.push(ev("paid", "ยืนยันชำระเงินแล้ว", paidAt, "mock"));
    db.receiptSeq = Math.max(db.receiptSeq ?? 0, seq);
    const docId = nid(12);
    const docNumber = `RC-${day}-${String(seq).padStart(4, "0")}`;
    events.push(ev("receipt_issued", `ออกบิลเงินสด ${docNumber} ส่งไป ${billing.email}`, paidAt));
    db.documents.push({
      id: docId,
      orderId,
      type: "cash_receipt",
      number: docNumber,
      issuedAt: paidAt,
      emailedAt: paidAt,
      printCount: 0,
    });
    documentId = docId;
  }
  if (packedAt) events.push(ev("status", "ย้ายสถานะจาก ชำระแล้ว เป็น กำลังแพ็ก", packedAt, "admin"));
  if (shippedAt) {
    events.push(ev("status", "ย้ายสถานะจาก กำลังแพ็ก เป็น ส่งแล้ว", shippedAt, "admin"));
    events.push(ev("shipped", "ส่งแล้ว (flash) FLASHDEMO001234", shippedAt, "admin"));
  }

  const shipmentIds = [];
  if (shippedAt) {
    const shipmentId = nid(12);
    shipmentIds.push(shipmentId);
    db.shipments.push({
      id: shipmentId,
      orderId,
      carrier: "flash",
      trackingNo: "FLASHDEMO001234",
      shippedAt,
    });
  }

  db.orders.push({
    id: orderId,
    number,
    token,
    demoSeed: true,
    status,
    items,
    subtotal,
    shippingFee: shipFee,
    discount: 0,
    grandTotal,
    shippingMethod: "standard",
    address,
    paymentMethod: "mock",
    paymentId,
    documentId,
    shipmentIds,
    events,
    stockReservedUntil: t(-24 * 60),
    createdAt,
    updatedAt: shippedAt || packedAt || paidAt || createdAt,
    paidAt,
    customerNote: note,
    wantReceipt: true,
    billing,
  });

  db.payments.push({
    id: paymentId,
    orderId,
    provider: "mock",
    amount: grandTotal,
    status: paid ? "paid" : "pending",
    createdAt,
    updatedAt: paidAt || createdAt,
  });

  return { number, token, status, grandTotal };
}

bumpStock(osukaVar, 2);
bumpStock(goopVar, 1);
osuka.stock = osuka.variants.reduce((s, v) => s + v.stock, 0);
goop.stock = goop.variants.reduce((s, v) => s + v.stock, 0);

if (db.settings) {
  db.settings.address =
    "143/109 บางซื่อคอนโดมิเนียม ถนนริมคลองประปา แขวงบางซื่อ บางซื่อ กรุงเทพมหานคร 10800";
  if (!db.settings.phone) db.settings.phone = "0866259407";
  if (!db.settings.email) db.settings.email = "hello@blacksmith.local";
}

const made = [
  addOrder({
    seq: 1,
    status: "shipped",
    paid: true,
    packing: true,
    shipped: true,
    createdMinsAgo: 40,
    note: "วางของไว้ที่รั้วหน้าบ้านได้",
    items: [line(osuka, osukaVar, 1)],
  }),
  addOrder({
    seq: 2,
    status: "paid",
    paid: true,
    packing: false,
    shipped: false,
    createdMinsAgo: 25,
    note: "โทรก่อนส่ง",
    items: [line(goop, goopVar, 1)],
  }),
  addOrder({
    seq: 3,
    status: "pending_payment",
    paid: false,
    packing: false,
    shipped: false,
    createdMinsAgo: 8,
    items: [line(osuka, osukaVar, 1)],
  }),
];

writeFileSync(dbFile, JSON.stringify(db, null, 2));
console.log("seeded demo orders:");
for (const o of made) {
  console.log(`  ${o.number}  ${o.status.padEnd(16)}  ฿${o.grandTotal}  http://localhost:3000/bill/${o.token}`);
}
