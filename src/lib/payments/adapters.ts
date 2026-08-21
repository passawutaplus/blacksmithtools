import type { PaymentProvider } from "../types";

export interface CreatePaymentInput {
  orderId: string;
  orderNumber: string;
  amount: number;
  returnUrl: string;
  customerEmail?: string;
}

export interface CreatePaymentResult {
  provider: PaymentProvider;
  redirectUrl?: string;
  qrPayload?: string;
  message: string;
}

export interface PaymentAdapter {
  id: PaymentProvider;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
}

export const mockAdapter: PaymentAdapter = {
  id: "mock",
  async createPayment(input) {
    return {
      provider: "mock",
      redirectUrl: `/api/payments/mock/complete?orderId=${encodeURIComponent(input.orderId)}`,
      message: "โหมดทดสอบ — กดยืนยันเพื่อจำลองชำระเงินสำเร็จ",
    };
  },
};

/** Payso (Pay Solutions) adapter — พร้อมใช้เมื่อมี merchant + PAYMENTS_LIVE */
export const paysoAdapter: PaymentAdapter = {
  id: "payso",
  async createPayment(input) {
    const merchantId = process.env.PAYSO_MERCHANT_ID;
    const secret = process.env.PAYSO_SECRET;
    if (!merchantId || !secret) {
      return {
        provider: "payso",
        message: "ยังไม่ได้ตั้งค่า PAYSO_MERCHANT_ID / PAYSO_SECRET",
      };
    }
    // Redirect flow placeholder — ใส่ endpoint จริงตามเอกสาร Pay Solutions เมื่อได้ credential
    const params = new URLSearchParams({
      merchantid: merchantId,
      refno: input.orderNumber,
      amount: input.amount.toFixed(2),
      customeremail: input.customerEmail ?? "",
      returnurl: input.returnUrl,
    });
    return {
      provider: "payso",
      redirectUrl: `https://www.paysolutions.asia/payment?${params.toString()}`,
      message: "กำลังพาไปชำระผ่าน Payso",
    };
  },
};

export function getActivePaymentProviders(paymentsLive: boolean): PaymentProvider[] {
  const list: PaymentProvider[] = ["bank_transfer", "promptpay_qr"];
  if (paymentsLive && process.env.PAYSO_MERCHANT_ID) {
    list.unshift("payso");
  } else {
    list.unshift("mock");
  }
  return list;
}