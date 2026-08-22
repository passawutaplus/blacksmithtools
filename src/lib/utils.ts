import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTHB(amount: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function lineAmount(item: { price: number; quantity: number; discount?: number }) {
  return Math.max(0, item.price * item.quantity - (item.discount ?? 0));
}

export function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));
}

export function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));
}

const THAI_DIGITS = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const THAI_PLACES = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

function readThaiGroup(n: number): string {
  const s = String(n);
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const d = Number(s[i]);
    const p = s.length - i - 1;
    if (d === 0) continue;
    if (p === 1) {
      if (d === 1) out += "สิบ";
      else if (d === 2) out += "ยี่สิบ";
      else out += `${THAI_DIGITS[d]}สิบ`;
    } else if (p === 0) {
      out += d === 1 && s.length > 1 ? "เอ็ด" : THAI_DIGITS[d];
    } else {
      out += `${THAI_DIGITS[d]}${THAI_PLACES[p]}`;
    }
  }
  return out;
}

function readThaiNumber(n: number): string {
  if (n >= 1_000_000) {
    const mil = Math.floor(n / 1_000_000);
    const rest = n % 1_000_000;
    return `${readThaiNumber(mil)}ล้าน${rest ? readThaiGroup(rest) : ""}`;
  }
  return readThaiGroup(n);
}

/** จำนวนเงินเป็นตัวอักษรไทย สำหรับบิลเงินสด เช่น หนึ่งพันสิบสามบาทถ้วน */
export function bahtText(amount: number): string {
  const n = Math.round(Math.abs(amount));
  if (!Number.isFinite(n)) return "";
  if (n === 0) return "ศูนย์บาทถ้วน";
  return `${readThaiNumber(n)}บาทถ้วน`;
}

export function bangkokDateKey(iso?: string | null) {
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\u0E00-\u0E7F]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}