import { NextResponse } from "next/server";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { z } from "zod";
import { createOrder } from "@/lib/db";
import { getActivePaymentProviders } from "@/lib/payments/adapters";
import { createPaysoPayment, newPaysoRef, postbackToken } from "@/lib/payments/payso";
import { attachPaysoRef } from "@/lib/db";
import { notifyShop, orderAlertText } from "@/lib/notify";
import { getSettings } from "@/lib/db";
import { completeThaiAddress } from "@/lib/thai-address";

const localitySchema = {
  subdistrict: z.string().min(1),
  district: z.string().min(1),
  province: z.string().min(1),
  postalCode: z.string().min(5),
};

const billingSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().or(z.literal("")),
  line1: z.string().min(3),
  ...localitySchema,
  taxId: z.string().regex(/^\d{13}$/, "เลขผู้เสียภาษีต้องเป็น 13 หลัก"),
});

const schema = z
  .object({
    cartId: z.string().optional().nullable(),
    items: z.array(
      z.object({
        productId: z.string(),
        variantId: z.string().optional(),
        quantity: z.number().int().positive().max(99),
      }),
    ).min(1).max(50),
    paymentMethod: z.enum(["mock", "payso", "bank_transfer", "promptpay_qr"]),
    customerNote: z.string().max(500).optional().or(z.literal("")),
    voucherCode: z.string().max(30).optional().or(z.literal("")),
    wantReceipt: z.boolean().optional(),
    billing: billingSchema.optional(),
    address: z.object({
      fullName: z.string().min(2),
      phone: z.string().min(9),
      email: z.string().email().optional().or(z.literal("")),
      line1: z.string().min(3),
      line2: z.string().optional(),
      ...localitySchema,
    }),
  })
  .superRefine((data, ctx) => {
    if (!data.wantReceipt) return;
    if (!data.billing) {
      ctx.addIssue({
        code: "custom",
        message: "กรอกข้อมูลสำหรับออกบิล",
        path: ["billing"],
      });
    }
  });

export async function POST(req: Request) {
  if (rateLimited(`checkout:${clientIp(req)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "สั่งซื้อบ่อยเกินไป รอ 10 นาทีหรือทัก LINE ร้าน" }, { status: 429 });
  }
  try {
    const json = await req.json();
    const data = schema.parse(json);
    const settings = await getSettings();
    const allowed = getActivePaymentProviders(settings.paymentsLive);
    if (!allowed.includes(data.paymentMethod)) {
      return NextResponse.json({ error: "ช่องทางชำระเงินไม่พร้อมใช้งาน" }, { status: 400 });
    }
    const payEmail = (data.address.email || data.billing?.email || "").trim();
    if (data.paymentMethod === "payso" && !payEmail) {
      return NextResponse.json(
        { error: "ชำระผ่านบัตร/QR ต้องใส่อีเมลเพื่อรับใบเสร็จจาก Payso" },
        { status: 400 },
      );
    }

    const shippingLocality = completeThaiAddress(data.address);
    if (!shippingLocality.subdistrict || !shippingLocality.postalCode) {
      return NextResponse.json(
        { error: "กรุณาเลือกจังหวัด เขต/อำเภอ และแขวง/ตำบล" },
        { status: 400 },
      );
    }

    const billingLocality = data.wantReceipt && data.billing
      ? completeThaiAddress(data.billing)
      : null;
    if (data.wantReceipt && data.billing && (!billingLocality?.subdistrict || !billingLocality.postalCode)) {
      return NextResponse.json(
        { error: "กรุณาเลือกที่อยู่บนบิลให้ครบ จังหวัด เขต/อำเภอ และแขวง/ตำบล" },
        { status: 400 },
      );
    }

    const billing = data.wantReceipt && data.billing && billingLocality
      ? {
          name: data.billing.name.trim(),
          email: data.billing.email.trim(),
          phone: data.billing.phone?.trim() || undefined,
          line1: data.billing.line1.trim(),
          ...billingLocality,
          taxId: data.billing.taxId.trim(),
        }
      : undefined;

    const { order } = await createOrder({
      items: data.items,
      address: {
        ...data.address,
        ...shippingLocality,
        email: data.address.email || undefined,
        line2: data.address.line2 || undefined,
      },
      paymentMethod: data.paymentMethod,
      customerNote: data.customerNote?.trim() || undefined,
      wantReceipt: data.wantReceipt || undefined,
      billing,
      voucherCode: data.voucherCode || undefined,
    });

    notifyShop(orderAlertText("new", order));

    let redirectUrl: string | undefined;
    if (data.paymentMethod === "payso") {
      const site = (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, "");
      const ref = newPaysoRef();
      try {
        const pay = await createPaysoPayment({
          referenceNo: ref,
          amount: order.grandTotal,
          customerEmail: payEmail,
          description: `BlackSmith ${order.number}`,
          returnUrl: `${site}/bill/${order.token}?payso=1`,
          postbackUrl: `${site}/api/payments/payso/webhook?ref=${ref}&k=${postbackToken(ref)}`,
        });
        await attachPaysoRef(order.id, ref, pay.transactionId);
        redirectUrl = pay.redirectUrl;
      } catch (e) {
        console.error("[payso] create payment failed", e instanceof Error ? e.message : e);
        // Order stays pending; the bill page lets the customer transfer + upload a slip instead.
      }
    }

    return NextResponse.json({
      ok: true,
      redirectUrl,
      orderNumber: order.number,
      token: order.token,
      billUrl: `/bill/${order.token}`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "สร้างออเดอร์ไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
