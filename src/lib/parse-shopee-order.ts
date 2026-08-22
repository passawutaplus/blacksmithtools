export type ParsedShopeeItem = {
  name: string;
  variantName: string;
  price: number;
  quantity: number;
  discount: number;
};

export type ParsedShopeeOrder = {
  buyerName: string;
  phone: string;
  email: string;
  line1: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  note: string;
  taxId: string;
  items: ParsedShopeeItem[];
};

function money(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  const s = String(value ?? "").replace(/[^\d.-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function qty(value: unknown): number {
  const n = Math.floor(money(value));
  return Math.max(1, n || 1);
}

function text(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function expandProvince(name: string) {
  const t = name.replace(/^จ(ังหวัด|\.)\s*/u, "").trim();
  if (/^(กทม\.?|กรุงเทพ|กรุงเทพฯ|BKK)$/i.test(t)) return "กรุงเทพมหานคร";
  return t;
}

export function usableShopeePhone(phone: string) {
  if (/[xX*]/.test(phone)) return "";
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9 ? phone.trim() : "";
}

export function extractShopeeJson(raw: string): unknown {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/u, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("อ่านผลจากภาพไม่ได้");
  return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
}

export function normalizeParsedShopee(raw: unknown): ParsedShopeeOrder {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rows = Array.isArray(data.items) ? data.items : [];
  const items: ParsedShopeeItem[] = rows
    .map((row) => {
      const item = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
      return {
        name: text(item.name ?? item.productName),
        variantName: text(item.variantName ?? item.variation ?? item.option),
        price: money(item.price ?? item.unitPrice),
        quantity: qty(item.quantity ?? item.qty),
        discount: money(item.discount),
      };
    })
    .filter((item) => item.name);

  const orderDiscount = money(data.orderDiscount ?? data.voucher);
  if (orderDiscount > 0 && items.length > 0 && items.every((item) => item.discount === 0)) {
    items[0] = { ...items[0], discount: orderDiscount };
  }

  return {
    buyerName: text(data.buyerName ?? data.recipientName ?? data.name),
    phone: usableShopeePhone(text(data.phone ?? data.mobile)),
    email: text(data.email),
    line1: text(data.line1 ?? data.address),
    subdistrict: text(data.subdistrict),
    district: text(data.district),
    province: expandProvince(text(data.province)),
    postalCode: text(data.postalCode).replace(/\D/g, "").slice(0, 5),
    note: text(data.note),
    taxId: text(data.taxId).replace(/\D/g, "").slice(0, 13),
    items,
  };
}
