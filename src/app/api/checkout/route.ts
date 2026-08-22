import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, getOrCreateCart, updateCart } from "@/lib/db";
import { getActivePaymentProviders } from "@/lib/payments/adapters";
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
    cartId: z.string().min(1),
    items: z.array(
      z.object({
        productId: z.string(),
        variantId: z.string().optional(),
        quantity: z.number().int().positive(),
      }),
    ),
    paymentMethod: z.enum(["mock", "payso", "bank_transfer", "promptpay_qr"]),
    customerNote: z.string().max(500).optional().or(z.literal("")),
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
  try {
    const json = await req.json();
    const data = schema.parse(json);
    const settings = await getSettings();
    const allowed = getActivePaymentProviders(settings.paymentsLive);
    if (!allowed.includes(data.paymentMethod)) {
      return NextResponse.json({ error: "ช่องทางชำระเงินไม่พร้อมใช้งาน" }, { status: 400 });
    }
    if (!settings.paymentsLive && data.paymentMethod === "payso") {
      return NextResponse.json(
        { error: "ยังไม่เปิดรับชำระผ่าน Payso — ใช้โหมดทดสอบหรือโอนสลิป" },
        { status: 400 },
      );
    }

    await getOrCreateCart(data.cartId);
    await updateCart(data.cartId, data.items);

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
      cartId: data.cartId,
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
    });

    return NextResponse.json({
      ok: true,
      orderNumber: order.number,
      token: order.token,
      billUrl: `/bill/${order.token}`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "สร้างออเดอร์ไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
