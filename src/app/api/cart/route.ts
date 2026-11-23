import { NextResponse } from "next/server";
import { getActivePaymentProviders } from "@/lib/payments/adapters";
import { getCartWithProducts, getOrCreateCart, getSettings, updateCart } from "@/lib/db";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    cartId?: string | null;
    items?: { productId: string; variantId?: string; quantity: number }[];
  };
  const cart = await getOrCreateCart(body.cartId);
  if (body.items) {
    await updateCart(cart.id, body.items);
  }
  const detail = await getCartWithProducts(cart.id);
  const settings = await getSettings();
  const subtotal = detail?.subtotal ?? 0;
  const shippingFee =
    subtotal >= settings.freeShippingMin ? 0 : subtotal > 0 ? settings.flatShippingFee : 0;

  return NextResponse.json({
    cartId: cart.id,
    lines: (detail?.lines ?? []).map((l) => ({
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