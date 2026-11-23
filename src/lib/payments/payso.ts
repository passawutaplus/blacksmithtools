import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "crypto";

/**
 * Payso (Pay Solutions) Web API v2 — hosted (redirect) payment.
 * Docs: https://api-docs.payso.co/docs/api/overviews
 * Only production exists; coordinate test transactions with Payso.
 */
const BASE_URL = "https://apis.paysolutions.asia";

export function paysoConfig() {
  return {
    merchantId: process.env.PAYSO_MERCHANT_ID?.trim() ?? "",
    apiKey: process.env.PAYSO_API_KEY?.trim() ?? "",
    secretKey: (process.env.PAYSO_SECRET_KEY ?? process.env.PAYSO_SECRET)?.trim() ?? "",
    terminalId: process.env.PAYSO_TERMINAL_ID?.trim() ?? "",
    keyVersion: Number(process.env.PAYSO_KEY_VERSION ?? 1) || 1,
  };
}

export function paysoReady() {
  const c = paysoConfig();
  return Boolean(/^\d{8}$/.test(c.merchantId) && c.apiKey && c.secretKey && c.terminalId);
}

/** Payso referenceNo: unique, max 12 chars. We use 12 digits (also valid for PromptPay API). */
export function newPaysoRef(now = Date.now()) {
  const t = String(Math.floor(now / 1000) % 1e8).padStart(8, "0");
  return t + String(randomInt(0, 10000)).padStart(4, "0");
}

/** HMAC we put in our own postbackUrl so we can tell the callback came from a URL we issued. */
export function postbackToken(ref: string) {
  return createHmac("sha256", paysoConfig().secretKey).update(`payso:${ref}`).digest("hex").slice(0, 32);
}

export function postbackTokenValid(ref: string, token: string | null) {
  if (!token || !paysoConfig().secretKey) return false;
  const a = Buffer.from(postbackToken(ref));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sameAmount(a: number, b: number) {
  return Math.round(a * 100) === Math.round(b * 100);
}

export async function createPaysoPayment(input: {
  referenceNo: string;
  amount: number;
  customerEmail: string;
  description: string;
  returnUrl: string;
  postbackUrl: string;
}) {
  const c = paysoConfig();
  const res = await fetch(`${BASE_URL}/payment/gateway/v2/ui-payments`, {
    method: "POST",
    headers: {
      apiKey: c.apiKey,
      secretKey: c.secretKey,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      merchantId: c.merchantId,
      customerEmail: input.customerEmail.slice(0, 50),
      referenceNo: input.referenceNo,
      description: input.description.replace(/[<>]/g, "").slice(0, 100),
      amount: Number(input.amount.toFixed(2)),
      paymentChannel: "ALL",
      paymentGateway: "",
      installmentTerm: "",
      currencyCode: "00",
      lang: "TH",
      returnUrl: input.returnUrl,
      postbackUrl: input.postbackUrl,
      terminalId: c.terminalId,
      keyVersion: c.keyVersion,
    }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as {
    status?: { statusCode?: string; message?: string };
    transactionId?: string;
    redirectUrl?: string;
  };
  if (data.status?.statusCode !== "2A002" || !data.redirectUrl) {
    throw new Error(
      `Payso สร้างรายการไม่สำเร็จ (${data.status?.statusCode ?? res.status}) ${data.status?.message ?? ""}`.trim(),
    );
  }
  return { transactionId: data.transactionId ?? "", redirectUrl: data.redirectUrl };
}

/**
 * Ask Payso for the real status of a reference. Postbacks are not signed,
 * so we only trust what this inquiry returns. Payso returns nothing for unpaid refs.
 */
export async function inquirePayso(referenceNo: string) {
  const c = paysoConfig();
  const mid5 = c.merchantId.slice(-5);
  const res = await fetch(`${BASE_URL}/order/orderdetailpost`, {
    method: "POST",
    headers: {
      merchantID: mid5,
      merchantSecretKey: c.secretKey,
      apikey: c.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ merchantID: mid5, orderNo: "X", refno: referenceNo, productDetail: "QWERTY" }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const raw = await res.text();
  if (!raw.trim()) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const row = (Array.isArray(data) ? data[0] : data) as
    | { ReferenceNo?: string; Total?: number | string; Status?: string; OrderNo?: string | number }
    | undefined;
  if (!row || String(row.ReferenceNo ?? "") !== referenceNo) return null;
  return {
    paid: String(row.Status ?? "").toUpperCase() === "CP",
    total: Number(row.Total),
    orderNo: String(row.OrderNo ?? ""),
  };
}
