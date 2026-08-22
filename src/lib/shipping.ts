import type { Carrier } from "./types";

const CARRIER_LABELS: Record<Carrier, string> = {
  flash: "Flash Express",
  kerry: "Kerry Express",
  thailand_post: "ไปรษณีย์ไทย",
  jnt: "J&T Express",
  best: "Best Express",
  pickup: "นัดรับเอง",
  other: "อื่น ๆ",
};

export function carrierLabel(carrier: Carrier) {
  return CARRIER_LABELS[carrier] ?? carrier;
}

export function trackingUrl(carrier: Carrier, trackingNo: string) {
  const no = encodeURIComponent(trackingNo.trim());
  if (!trackingNo.trim()) return null;
  switch (carrier) {
    case "flash":
      return `https://www.flashexpress.com/fle/tracking?se=${no}`;
    case "kerry":
      return `https://th.kerryexpress.com/th/track/?track=${no}`;
    case "thailand_post":
      return `https://track.thailandpost.co.th/?trackNumber=${no}`;
    case "jnt":
      return `https://www.jtexpress.co.th/index/query/gzquery.html?billcode=${no}`;
    case "best":
      return `https://www.best-inc.co.th/track?bills=${no}`;
    default:
      return null;
  }
}

export function trackingLinkLabel(carrier: Carrier) {
  if (carrier === "pickup") return "นัดรับเอง ไม่มีเลขพัสดุ";
  if (carrier === "other") return "คัดลอกเลขไปเช็คกับขนส่ง";
  return `เปิดหน้า ${carrierLabel(carrier)} — เลขใส่ให้แล้ว`;
}

export const CARRIERS = Object.keys(CARRIER_LABELS) as Carrier[];

export const CARRIER_TRACK_LABEL: Record<string, string> = {
  NotFound: "ยังไม่พบข้อมูลจากขนส่ง",
  InfoReceived: "ขนส่งรับข้อมูลแล้ว",
  InTransit: "กำลังขนส่ง",
  Expired: "เกินเวลานาน ยังไม่ถึง",
  AvailableForPickup: "ถึงจุดรับแล้ว",
  OutForDelivery: "กำลังนำจ่าย",
  DeliveryFailure: "นำจ่ายไม่สำเร็จ",
  Delivered: "ขนส่งยืนยันถึงมือแล้ว",
  Exception: "ขนส่งแจ้งปัญหา",
};

export function carrierTrackLabel(status?: string | null) {
  if (!status) return "";
  return CARRIER_TRACK_LABEL[status] ?? status;
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "รอชำระเงิน",
  payment_submitted: "รอตรวจสลิป",
  paid: "ชำระแล้ว",
  packing: "กำลังแพ็ก",
  shipped: "ส่งแล้ว",
  delivered: "ถึงแล้ว",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
  refunded: "คืนเงิน",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  mock: "เดโม่",
  payso: "Payso",
  bank_transfer: "โอนเงิน",
  promptpay_qr: "PromptPay",
  cash: "เงินสด / นอกเว็บ",
  shopee: "Shopee",
  lazada: "Lazada",
  claim: "เคลม / รับประกัน",
};

export const MANUAL_CHANNEL_LABEL: Record<string, string> = {
  receipt: "ใบเสร็จ",
  label: "ใบปะหน้า",
  walk_in: "ขายหน้าร้าน",
  shopee: "Shopee",
  lazada: "Lazada",
  line: "LINE",
  claim: "เคลม / รับประกัน",
  other: "อื่น ๆ",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "รอชำระ",
  submitted: "รอตรวจสลิป",
  paid: "จ่ายแล้ว",
  failed: "ไม่ผ่าน",
  cancelled: "ยกเลิก",
};

export const ORDER_STATUS_TONE: Record<string, string> = {
  pending_payment: "bg-gray-100 text-gray-800",
  payment_submitted: "bg-orange-100 text-orange-900",
  paid: "bg-blue-100 text-blue-900",
  packing: "bg-navy/10 text-navy",
  shipped: "bg-sky-100 text-sky-900",
  delivered: "bg-emerald-100 text-emerald-900",
  completed: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-gray-100 text-gray-600",
  refunded: "bg-purple-100 text-purple-900",
};

export const OPEN_ORDER_STATUSES = [
  "pending_payment",
  "payment_submitted",
  "paid",
  "packing",
  "shipped",
] as const;

/** ขั้นตอนหลักที่แอดมินย้ายไป-กลับได้จาก dropdown */
export const ORDER_FLOW_STATUSES = [
  "pending_payment",
  "payment_submitted",
  "paid",
  "packing",
  "shipped",
  "delivered",
  "completed",
] as const;