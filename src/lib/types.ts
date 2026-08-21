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

export type PaymentProvider = "mock" | "payso" | "bank_transfer" | "promptpay_qr";
export type PaymentStatus = "pending" | "submitted" | "paid" | "failed" | "cancelled";

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
  district: string;
  province: string;
  postalCode: string;
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
  adminNote?: string;
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
  products: Product[];
  brands: Brand[];
  categories: Category[];
  carts: Cart[];
  orders: Order[];
  payments: Payment[];
  documents: DocumentRecord[];
  shipments: Shipment[];
  inquiries: WholesaleLead[];
  settings: SiteSettings;
  receiptSeq: number;
  orderSeq: number;
  inquirySeq: number;
}