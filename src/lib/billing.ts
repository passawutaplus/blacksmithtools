import type { BillingInfo, Order } from "./types";
import { formatThaiLocality } from "./thai-address-format";

export function buyerOnBill(order: Order): BillingInfo {
  if (order.billing) return order.billing;
  const addr = order.address;
  return {
    name: addr.fullName,
    email: addr.email ?? "",
    phone: addr.phone,
    line1: addr.line1,
    subdistrict: addr.subdistrict,
    district: addr.district,
    province: addr.province,
    postalCode: addr.postalCode,
  };
}

export function formatBillingAddress(info: BillingInfo) {
  return `${info.line1} ${formatThaiLocality(info)}`.replace(/\s+/g, " ").trim();
}