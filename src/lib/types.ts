export type OrderStatus =
  | "pending_payment"
  | "payment_submitted"
  | "paid"
  | "packing"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled"
  | "refunded";

export type PaymentProvider =
  | "mock"
  | "payso"
  | "bank_transfer"
  | "promptpay_qr"
  | "cash"
  | "shopee"
  | "lazada"
  | "claim";
export type PaymentStatus = "pending" | "submitted" | "paid" | "failed" | "cancelled";

export type ManualChannel = "receipt" | "label" | "walk_in" | "shopee" | "lazada" | "line" | "claim" | "other";

export type Carrier =
  | "flash"
  | "kerry"
  | "thailand_post"
  | "jnt"
  | "best"
  | "pickup"
  | "other";

export interface Brand {
  id: string;
  slug: string;
  name: string;
  nameTh: string;
  logoUrl?: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  nameTh: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  nameTh: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  imageUrl: string;
  images: string[];
  brandIds: string[];
  categoryIds: string[];
  compatibilities: string[];
  featured?: boolean;
  shopeeUrl?: string | null;
  lazadaUrl?: string | null;
  tiktokUrl?: string | null;
  sku: string;
  variants?: ProductVariant[];
}

export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  updatedAt: string;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  email?: string;
  line1: string;
  line2?: string;
  subdistrict?: string;
  district: string;
  province: string;
  postalCode: string;
}

/** ข้อมูลผู้ซื้อบนบิลเงินสด อาจต่างจากที่อยู่จัดส่ง */
export interface BillingInfo {
  name: string;
  email: string;
  phone?: string;
  line1: string;
  subdistrict?: string;
  district: string;
  province: string;
  postalCode: string;
  taxId?: string;
}

export interface OrderItem {
  productId: string;
  variantId?: string;
  variantName?: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  imageUrl: string;
  /** ส่วนลดของรายการนี้ (บาท) */
  discount?: number;
}

export interface OrderEvent {
  id: string;
  at: string;
  type: string;
  message: string;
  by?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  provider: PaymentProvider;
  amount: number;
  status: PaymentStatus;
  providerRef?: string;
  /** Payso referenceNo (12 digits) sent when creating the hosted payment */
  paysoRef?: string;
  slipPath?: string;
  transferredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRecord {
  id: string;
  orderId: string;
  type: "cash_receipt";
  number: string;
  issuedAt: string;
  emailedAt?: string | null;
  printCount: number;
}

export interface Shipment {
  id: string;
  orderId: string;
  carrier: Carrier;
  trackingNo: string;
  note?: string;
  photoPaths?: string[];
  shippedAt: string;
  deliveredAt?: string | null;
  /** Latest main status from 17TRACK, e.g. InTransit / Delivered. */
  carrierStatus?: string | null;
  carrierSubStatus?: string | null;
  carrierStatusText?: string | null;
  carrierStatusAt?: string | null;
  trackRegisteredAt?: string | null;
  trackRegisterError?: string | null;
}

export interface Order {
  id: string;
  number: string;
  token: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  grandTotal: number;
  shippingMethod: string;
  address: ShippingAddress;
  paymentMethod: PaymentProvider;
  paymentId?: string;
  documentId?: string;
  shipmentIds: string[];
  events: OrderEvent[];
  stockReservedUntil?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  /** หมายเหตุจากลูกค้าตอนสั่ง เช่น เวลาว่างรับของ */
  customerNote?: string;
  /** ลูกค้าขอรับบิลเงินสดทางอีเมล */
  wantReceipt?: boolean;
  billing?: BillingInfo;
  adminNote?: string;
  /** ออเดอร์จากหน้าร้าน หรือแอดมินออกเอกสารเอง */
  origin?: "shop" | "manual";
  channel?: ManualChannel;
  /** เลขออเดอร์ Shopee / Lazada / อ้างอิงภายนอก */
  externalRef?: string;
  /** โค้ดส่วนลดที่ใช้ตอนสั่ง (ส่วนลดอยู่ใน discount) */
  voucherCode?: string;
}

export type VoucherKind = "fixed" | "percent" | "free_shipping";

/** คูปองร้านค้า — ตรวจเงื่อนไขและตัดยอดที่เซิร์ฟเวอร์เท่านั้น */
export interface Voucher {
  id: string;
  /** ตัวพิมพ์ใหญ่ A-Z 0-9 - เท่านั้น */
  code: string;
  kind: VoucherKind;
  /** fixed = บาท, percent = 1-100, free_shipping = ไม่ใช้ */
  value: number;
  minSubtotal: number;
  /** เพดานส่วนลดสำหรับ percent (0 = ไม่จำกัด) */
  maxDiscount: number;
  startsAt?: string;
  endsAt?: string;
  /** 0 = ไม่จำกัดจำนวนสิทธิ์ */
  usageLimit: number;
  usedCount: number;
  /** ลูกค้าเบอร์เดียวกันใช้ได้ครั้งเดียว */
  oncePerPhone: boolean;
  /** true = โชว์ปุ่ม "เก็บโค้ด" บนหน้าสินค้า, false = โค้ดลับ ต้องพิมพ์เอง */
  public: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SiteSettings {
  shopName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  lineUrl: string;
  lineId: string;
  shopeeShopUrl: string;
  lazadaShopUrl: string;
  thaiMartShopUrl: string;
  tiktokShopUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  tiktokSocialUrl: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  promptPayId: string;
  paymentsLive: boolean;
  freeShippingMin: number;
  flatShippingFee: number;
  /** คะแนนร้านบน Shopee ที่กรอกเอง เช่น 4.9 — 0 คือไม่โชว์ */
  shopeeRating: number;
  /** จำนวนรีวิวบน Shopee ที่กรอกเอง — 0 คือไม่โชว์ตัวเลข */
  shopeeReviewCount: number;
}

export type ReviewSource = "shopee" | "lazada" | "line" | "web";

/** รีวิวที่คัดจาก Shopee/ช่องทางอื่น แปะเองในหลังร้าน ไม่ดึงอัตโนมัติ */
export interface ShopReview {
  id: string;
  quote: string;
  author: string;
  stars: number;
  productName: string;
  productId: string;
  source: ReviewSource;
  sourceUrl: string;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type WholesaleLeadStatus = "new" | "contacted" | "closed";

export interface WholesaleLead {
  id: string;
  number: string;
  shopName: string;
  province: string;
  channel: string;
  contact: string;
  note: string;
  status: WholesaleLeadStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
  contactedAt?: string;
}

export interface DbShape {
  catalogVersion?: string;
  shippingPolicyVersion?: string;
  shopAddressVersion?: string;
  products: Product[];
  brands: Brand[];
  categories: Category[];
  carts: Cart[];
  orders: Order[];
  payments: Payment[];
  documents: DocumentRecord[];
  shipments: Shipment[];
  inquiries: WholesaleLead[];
  testimonials: ShopReview[];
  vouchers?: Voucher[];
  settings: SiteSettings;
  receiptSeq: number;
  orderSeq: number;
  inquirySeq: number;
}