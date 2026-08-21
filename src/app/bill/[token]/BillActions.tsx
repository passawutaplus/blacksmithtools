"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatTHB } from "@/lib/utils";
import type { OrderStatus, PaymentProvider } from "@/lib/types";

export function BillActions({
  token,
  orderId,
  status,
  paymentMethod,
  settings,
}: {
  token: string;
  orderId: string;
  status: OrderStatus;
  paymentMethod: PaymentProvider;
  settings: {
    bankName: string;
    bankAccountName: string;
    bankAccountNumber: string;
    promptPayId: string;
    grandTotal: number;
  };
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const unpaid = status === "pending_payment" || status === "payment_submitted";

  async function mockPay() {
    window.location.href = `/api/payments/mock/complete?orderId=${encodeURIComponent(orderId)}`;
  }

  async function onSlip(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);
    setMsg("");
    const fd = new FormData(e.currentTarget);
    fd.set("token", token);
    try {
      const res = await fetch("/api/payments/slip", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "อัปโหลดไม่สำเร็จ");
      setMsg("ส่งสลิปแล้ว รอร้านยืนยัน");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "error");
    } finally {
      setUploading(false);
    }
  }

  if (!unpaid) {
    return <p className="mt-3 text-sm text-green-700">ชำระเงินเรียบร้อยแล้ว</p>;
  }

  return (
    <div className="mt-4 space-y-4">
      {paymentMethod === "mock" ? (
        <button type="button" className="btn btn-primary w-full" onClick={mockPay}>
          จำลองชำระเงิน (เดโม่)
        </button>
      ) : null}

      {(paymentMethod === "bank_transfer" || paymentMethod === "promptpay_qr") && (
        <div className="rounded bg-steel p-3 text-sm">
          <p className="font-semibold">โอน {formatTHB(settings.grandTotal)}</p>
          <p className="mt-1">
            {settings.bankName}
            <br />
            ชื่อบัญชี: {settings.bankAccountName}
            <br />
            เลขบัญชี: {settings.bankAccountNumber}
          </p>
          {paymentMethod === "promptpay_qr" ? (
            <p className="mt-2">
              PromptPay: {settings.promptPayId}
              <br />
              <span className="text-xs text-muted">
                (QR แบบยอดล็อกจะเชื่อมเมื่อเปิด Payso / PromptPay gateway)
              </span>
            </p>
          ) : null}
        </div>
      )}

      {(paymentMethod === "bank_transfer" || paymentMethod === "promptpay_qr") && (
        <form onSubmit={onSlip} className="space-y-3">
          <label className="label" htmlFor="slip">
            อัปโหลดสลิป
          </label>
          <input id="slip" name="slip" type="file" accept="image/jpeg,image/png,application/pdf" required className="input" />
          <button type="submit" className="btn btn-navy w-full" disabled={uploading}>
            {uploading ? "กำลังส่ง..." : "แจ้งชำระเงิน"}
          </button>
        </form>
      )}

      {msg ? <p className="text-sm text-navy">{msg}</p> : null}
    </div>
  );
}