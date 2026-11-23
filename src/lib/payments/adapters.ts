import { paysoReady } from "./payso";
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

export function getActivePaymentProviders(paymentsLive: boolean): PaymentProvider[] {
  const list: PaymentProvider[] = ["bank_transfer", "promptpay_qr"];
  if (paymentsLive && paysoReady()) {
    list.unshift("payso");
  } else if (process.env.NODE_ENV !== "production") {
    list.unshift("mock");
  }
  return list;
}