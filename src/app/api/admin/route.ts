import { NextResponse } from "next/server";
import {
  cancelOrder,
  completeOrder,
  createManualOrder,
  deleteManualOrder,
  deleteProducts,
  getBrandsAndCategories,
  getDashboard,
  getOrderAdmin,
  getProductById,
  getSettings,
  incrementPrintCount,
  listOrders,
  listPendingSlips,
  listProducts,
  listWholesaleLeads,
  markDelivered,
  markOrderPaid,
  refundOrder,
  rejectSlip,
  saveAdminNote,
  saveProductInput,
  setOrderStatus,
  setProductStock,
  setProductsFeatured,
  shipOrder,
  startPacking,
  updateSettings,
  updateWholesaleLead,
} from "@/lib/db";
import type { Carrier, OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const resource = url.searchParams.get("resource") ?? "dashboard";

  switch (resource) {
    case "session": {
      const settings = await getSettings();
      const dash = await getDashboard();
      return NextResponse.json({
        ok: true,
        shopName: settings.shopName,
        slipCount: dash.counts.awaitingSlip,
        inquiryCount: dash.counts.wholesaleNew,
      });
    }
    case "dashboard":
      return NextResponse.json(await getDashboard());
    case "orders":
      return NextResponse.json({
        orders: await listOrders({
          status: url.searchParams.get("status") || undefined,
          q: url.searchParams.get("q") || undefined,
          from: url.searchParams.get("from") || undefined,
          to: url.searchParams.get("to") || undefined,
          paymentMethod: url.searchParams.get("paymentMethod") || undefined,
          carrier: url.searchParams.get("carrier") || undefined,
          hasReceipt: url.searchParams.get("hasReceipt") || undefined,
          origin: url.searchParams.get("origin") || undefined,
        }),
      });
    case "order": {
      const id = url.searchParams.get("id") ?? "";
      const row = await getOrderAdmin(id);
      if (!row) return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 });
      return NextResponse.json(row);
    }
    case "slips":
      return NextResponse.json({ slips: await listPendingSlips() });
    case "products": {
      const catalog = await listProducts({ q: url.searchParams.get("q") || undefined });
      return NextResponse.json(catalog);
    }
    case "product": {
      const id = url.searchParams.get("id") ?? "";
      const product = await getProductById(id);
      if (!product) return NextResponse.json({ error: "ไม่พบสินค้า" }, { status: 404 });
      const { brands, categories } = await getBrandsAndCategories();
      return NextResponse.json({ product, brands, categories });
    }
    case "catalog-meta":
      return NextResponse.json(await getBrandsAndCategories());
    case "settings":
      return NextResponse.json({ settings: await getSettings() });
    case "inquiries":
      return NextResponse.json({
        inquiries: await listWholesaleLeads(url.searchParams.get("status") || undefined),
      });
    default:
      return NextResponse.json({ error: "ไม่รู้จักรายการ" }, { status: 400 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const action = String(body.action ?? "");

  try {
    switch (action) {
      case "confirm_payment":
        return NextResponse.json(await markOrderPaid(body.orderId, "admin"));
      case "create_manual_order":
        return NextResponse.json(
          await createManualOrder({
            kind: body.kind === "label" ? "label" : "receipt",
            address: body.address,
            items: Array.isArray(body.items) ? body.items : [],
            customerNote: body.customerNote,
            billing: body.billing,
          }),
        );
      case "delete_manual_order":
        return NextResponse.json(await deleteManualOrder(String(body.orderId ?? "")));
      case "reject_slip":
        return NextResponse.json(
          await rejectSlip(body.orderId, String(body.reason ?? ""), "admin"),
        );
      case "packing":
        return NextResponse.json({ order: await startPacking(body.orderId) });
      case "set_status": {
        const status = String(body.status ?? "") as OrderStatus;
        return NextResponse.json({ order: await setOrderStatus(body.orderId, status, "admin") });
      }
      case "ship":
        return NextResponse.json(
          await shipOrder(body.orderId, {
            carrier: body.carrier as Carrier,
            trackingNo: String(body.trackingNo ?? ""),
            note: body.note,
          }),
        );
      case "delivered":
        return NextResponse.json({ order: await markDelivered(body.orderId) });
      case "complete":
        return NextResponse.json(await completeOrder(body.orderId));
      case "cancel":
        return NextResponse.json(
          await cancelOrder(body.orderId, String(body.reason ?? ""), "admin"),
        );
      case "refund":
        return NextResponse.json(
          await refundOrder(body.orderId, String(body.reason ?? ""), "admin"),
        );
      case "save_note":
        return NextResponse.json(
          await saveAdminNote(body.orderId, String(body.note ?? ""), "admin"),
        );
      case "print_receipt":
        return NextResponse.json({
          document: await incrementPrintCount(body.documentId),
        });
      case "upsert_product":
        return NextResponse.json({ product: await saveProductInput(body.product ?? {}) });
      case "delete_products":
        return NextResponse.json(await deleteProducts(Array.isArray(body.ids) ? body.ids : [body.id]));
      case "set_featured":
        return NextResponse.json(
          await setProductsFeatured(
            Array.isArray(body.ids) ? body.ids : [body.id],
            Boolean(body.featured),
          ),
        );
      case "set_stock":
        return NextResponse.json({
          product: await setProductStock(String(body.id ?? ""), Number(body.stock)),
        });
      case "update_settings":
        return NextResponse.json({ settings: await updateSettings(body.settings ?? {}) });
      case "update_inquiry":
        return NextResponse.json({
          inquiry: await updateWholesaleLead(body.id, {
            status: body.status,
            adminNote: body.adminNote,
          }),
        });
      default:
        return NextResponse.json({ error: "ไม่รู้จักคำสั่ง" }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "ทำรายการไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
