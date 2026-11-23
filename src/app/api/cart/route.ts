import { NextResponse } from "next/server";
import { getActivePaymentProviders } from "@/lib/payments/adapters";
import { priceCart, type CartItemInput } from "@/lib/db";

/** Prices the browser's cart. Nothing is stored server-side. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    cartId?: string | null;
    items?: CartItemInput[];
  };
  const { lines, subtotal, settings } = await priceCart(Array.isArray(body.items) ? body.items : []);
  const shippingFee =
    subtotal >= settings.freeShippingMin ? 0 : subtotal > 0 ? settings.flatShippingFee : 0;

  return NextResponse.json({
    cartId: body.cartId || null,
    lines: lines.map((l) => ({
      product: l.product,
      productId: l.productId,
      variantId: l.variantId,
      variantName: l.variantName,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      sku: l.sku,
      imageUrl: l.imageUrl,
      lineTotal: l.lineTotal,
    })),
    subtotal,
    shippingFee,
    freeShippingMin: settings.freeShippingMin,
    flatShippingFee: settings.flatShippingFee,
    paymentMethods: getActivePaymentProviders(settings.paymentsLive),
  });
}
