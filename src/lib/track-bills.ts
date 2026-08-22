import { normalizePhoneDigits, phonesMatch } from "./phone";
import type { TrackBillSummary } from "./track-types";

type OrderLike = {
  token: string;
  number: string;
  status: string;
  createdAt: string;
  grandTotal: number;
  items: { quantity: number }[];
  address: { phone: string };
};

export function filterBillsByPhone<T extends OrderLike>(orders: T[], phone: string, limit = 20): T[] {
  const digits = normalizePhoneDigits(phone);
  if (digits.length < 9) return [];
  return orders
    .filter((o) => phonesMatch(o.address.phone, phone))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function toTrackBillSummary(order: OrderLike): TrackBillSummary {
  return {
    token: order.token,
    number: order.number,
    status: order.status,
    createdAt: order.createdAt,
    grandTotal: order.grandTotal,
    itemCount: order.items.reduce((n, i) => n + i.quantity, 0),
  };
}
