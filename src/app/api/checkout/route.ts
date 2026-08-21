import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, getOrCreateCart, updateCart } from "@/lib/db";
import { getActivePaymentProviders } from "@/lib/payments/adapters";
import { getSettings } from "@/lib/db";

const schema = z.object({
  cartId: z.string().min(1),
  items: z.array(
    z.object({
      productId: z.string(),
      variantId: z.string().optional(),
      quantity: z.number().int().positive(),
    }),
  ),
  paymentMethod: z.enum(["mock", "payso", "bank_transfer", "promptpay_qr"]),
  address: z.object({
    fullName: z.string().min(2),
    phone: z.string().min(9),
    email: z.string().email().optional().or(z.literal("")),
    line1: z.string().min(3),
    line2: z.string().optional(),
    district: z.string().min(1),
    province: z.string().min(1),
    postalCode: z.string().min(5),
  }),
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

    const { order } = await createOrder({
      cartId: data.cartId,
      address: {
        ...data.address,
        email: data.address.email || undefined,
      },
      paymentMethod: data.paymentMethod,
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