import "server-only";
import { after } from "next/server";
import type { Order } from "./types";
import { formatTHB } from "./utils";

/**
 * Shop alerts via LINE Messaging API (LINE Notify was shut down in 2025).
 * Needs a Messaging API channel on the shop's LINE OA:
 *   LINE_CHANNEL_ACCESS_TOKEN — long-lived channel access token
 *   LINE_NOTIFY_TO            — comma-separated userId / groupId that receive alerts
 * Missing env = alerts are skipped silently.
 */
export function lineNotifyConfigured() {
  return Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim() && process.env.LINE_NOTIFY_TO?.trim());
}

export async function pushLine(text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  const targets = (process.env.LINE_NOTIFY_TO ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!token || targets.length === 0) return;
  const message = { type: "text", text: text.slice(0, 4900) };
  await Promise.all(
    targets.map(async (to) => {
      try {
        const res = await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ to, messages: [message] }),
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) console.error("[line] push failed", res.status, (await res.text()).slice(0, 200));
      } catch (e) {
        console.error("[line] push error", e instanceof Error ? e.message : e);
      }
    }),
  );
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
}

const PAY_LABEL: Record<string, string> = {
  payso: "Payso",
  bank_transfer: "โอน",
  promptpay_qr: "PromptPay",
  mock: "ทดสอบ",
};

export function orderAlertText(kind: "new" | "slip" | "paid", order: Order) {
  const head =
    kind === "new" ? "🛒 ออเดอร์ใหม่" : kind === "slip" ? "🧾 ลูกค้าส่งสลิปแล้ว รอตรวจ" : "✅ ชำระเงินแล้ว";
  const items = order.items
    .slice(0, 5)
    .map((i) => `• ${i.name}${i.variantName ? ` (${i.variantName})` : ""} × ${i.quantity}`)
    .join("\n");
  const more = order.items.length > 5 ? `\n…และอีก ${order.items.length - 5} รายการ` : "";
  const link = siteUrl() ? `\n${siteUrl()}/admin/orders/${order.id}` : "";
  return `${head}\n${order.number} · ${formatTHB(order.grandTotal)} · ${PAY_LABEL[order.paymentMethod] ?? order.paymentMethod}\n${order.address.fullName} ${order.address.province}\n${items}${more}${link}`;
}

/** Send after the response is sent, so customers never wait on LINE. */
export function notifyShop(text: string) {
  if (!lineNotifyConfigured()) return;
  after(() => pushLine(text));
}
