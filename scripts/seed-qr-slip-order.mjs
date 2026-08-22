/**
 * Seeds one realistic PromptPay QR order with a simulated bank slip.
 * Usage: node scripts/seed-qr-slip-order.mjs
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dbFile = join(root, "data", "runtime", "db.json");
const slipSrc = join(root, "scripts", "fixtures", "mock-promptpay-slip.png");
const slipDir = join(root, "data", "runtime", "slips");
const slipName = "demo-promptpay-qr.png";

function nid(len = 12) {
  return randomBytes(18)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, len);
}

if (!existsSync(dbFile)) throw new Error("ยังไม่มี data/runtime/db.json — เปิดหน้าร้านก่อนแล้วรันใหม่");
if (!existsSync(slipSrc)) throw new Error("ไม่พบสลิปจำลองที่ scripts/fixtures/mock-promptpay-slip.png");

const db = JSON.parse(readFileSync(dbFile, "utf8"));
if (!Array.isArray(db.orders)) db.orders = [];
if (!Array.isArray(db.payments)) db.payments = [];

const already = db.orders.find((o) => o.qrSlipDemo);
if (already) {
  const pay = db.payments.find((p) => p.id === already.paymentId);
  console.log("QR demo order already exists:");
  console.log(`  ${already.number}  ${already.status}  ฿${already.grandTotal}`);
  console.log(`  admin  http://localhost:3000/admin/orders/${already.id}`);
  console.log(`  bill   http://localhost:3000/bill/${already.token}`);
  console.log(`  slip   ${pay?.slipPath || "-"}`);
  process.exit(0);
}

const product = db.products.find((p) => p.id === "p-15247704699");
if (!product) throw new Error("ไม่พบสินค้า Milwaukee M12 Holder");
const variant = product.variants?.find((v) => v.id === "232062387044") ?? product.variants?.[0];
if (!variant) throw new Error("ไม่พบตัวเลือก Milwaukee M18 แดง");

const qty = 2;
const shipFee = db.settings?.flatShippingFee ?? 35;
const subtotal = variant.price * qty;
const grandTotal = subtotal + shipFee;
if (grandTotal !== 313) {
  console.warn(`ยอดรวม ฿${grandTotal} ไม่ตรงสลิป ฿313 — ตรวจราคา/ค่าส่ง`);
}

variant.stock = Math.max(0, (variant.stock ?? 0) - qty);
product.stock = (product.variants ?? []).reduce((s, v) => s + (v.stock ?? 0), 0);

const seq = Math.max(db.orderSeq ?? 0, 3) + 1;
db.orderSeq = seq;
const day = "260822";
const number = `BS-${day}-${String(seq).padStart(4, "0")}`;
const createdAt = "2026-08-22T09:08:00.000Z";
const slipAt = "2026-08-22T09:18:00.000Z";
const orderId = nid(12);
const paymentId = nid(12);
const token = nid(32);

mkdirSync(slipDir, { recursive: true });
copyFileSync(slipSrc, join(slipDir, slipName));

const address = {
  fullName: "วิชัย ช่างเหล็ก",
  phone: "0812345678",
  email: "wichai.chang@example.com",
  line1: "42/8 ซอยติวานนท์ 12",
  subdistrict: "ตลาดขวัญ",
  district: "เมืองนนทบุรี",
  province: "นนทบุรี",
  postalCode: "11000",
};

db.orders.push({
  id: orderId,
  number,
  token,
  demoSeed: true,
  qrSlipDemo: true,
  status: "payment_submitted",
  items: [
    {
      productId: product.id,
      variantId: variant.id,
      variantName: variant.name,
      name: product.nameTh || product.name,
      sku: variant.sku || product.sku,
      price: variant.price,
      quantity: qty,
      imageUrl: variant.imageUrl || product.imageUrl,
    },
  ],
  subtotal,
  shippingFee: shipFee,
  discount: 0,
  grandTotal,
  shippingMethod: "standard",
  address,
  paymentMethod: "promptpay_qr",
  paymentId,
  shipmentIds: [],
  events: [
    { id: nid(10), at: createdAt, type: "created", message: "สร้างคำสั่งซื้อแล้ว", by: "system" },
    { id: nid(10), at: slipAt, type: "slip_submitted", message: "ลูกค้าอัปโหลดสลิปแล้ว", by: "system" },
  ],
  stockReservedUntil: "2026-08-23T09:08:00.000Z",
  createdAt,
  updatedAt: slipAt,
  customerNote: "ส่งช่วงเย็นหลังห้าโมง โทรก่อนถึงบ้าน",
});

db.payments.push({
  id: paymentId,
  orderId,
  provider: "promptpay_qr",
  amount: grandTotal,
  status: "submitted",
  slipPath: slipName,
  transferredAt: slipAt,
  createdAt,
  updatedAt: slipAt,
});

if (db.settings) {
  if (!db.settings.promptPayId || db.settings.promptPayId === "0000000000") {
    db.settings.promptPayId = "0866259407";
  }
}

writeFileSync(dbFile, JSON.stringify(db, null, 2));
console.log("seeded PromptPay QR demo order:");
console.log(`  ${number}  รอตรวจสลิป  ฿${grandTotal}`);
console.log(`  ลูกค้า  ${address.fullName}  ${address.phone}`);
console.log(`  สินค้า  Milwaukee M12 Holder ×${qty} (${variant.name})`);
console.log(`  admin   http://localhost:3000/admin/orders/${orderId}`);
console.log(`  bill    http://localhost:3000/bill/${token}`);
