import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderByToken } from "@/lib/db";
import { formatTHB } from "@/lib/utils";
import { ORDER_STATUS_LABEL, carrierLabel, trackingLinkLabel, trackingUrl } from "@/lib/shipping";
import { BillActions } from "./BillActions";

const STEPS = ["pending_payment", "payment_submitted", "paid", "packing", "shipped", "delivered"];

export default async function BillPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const detail = await getOrderByToken(token);
  if (!detail) notFound();
  const { order, payment, document, shipments, settings } = detail;

  const stepIndex = Math.max(
    0,
    STEPS.findIndex((s) => s === order.status),
  );

  return (
    <div className="container-bs py-8 md:py-10">
      {sp.paid ? (
        <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          ชำระเงินสำเร็จ — ระบบออกบิลเงินสดให้อัตโนมัติแล้ว
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">บิลออนไลน์</p>
          <h1 className="text-2xl font-bold text-navy">{order.number}</h1>
          <p className="mt-1 text-sm">
            สถานะ:{" "}
            <span className="font-semibold text-forge">
              {ORDER_STATUS_LABEL[order.status] ?? order.status}
            </span>
          </p>
        </div>
        {document ? (
          <Link href={`/bill/${token}/print`} className="btn btn-secondary no-print">
            พิมพ์บิลเงินสด {document.number}
          </Link>
        ) : null}
      </div>

      <ol className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`rounded px-2 py-2 text-center text-xs font-semibold ${
              i <= stepIndex ? "bg-forge text-white" : "bg-steel text-muted"
            }`}
          >
            {ORDER_STATUS_LABEL[s]}
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-bold">รายการสินค้า</h2>
          <ul className="mt-4 space-y-3">
            {order.items.map((item) => (
              <li key={`${item.productId}-${item.variantId ?? item.sku}`} className="flex gap-3">
                <div className="relative h-16 w-16 shrink-0 bg-steel">
                  <Image src={item.imageUrl} alt={item.name} fill className="object-contain p-1" sizes="64px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-muted">
                    SKU {item.sku} · {item.quantity} × {formatTHB(item.price)}
                  </p>
                </div>
                <p className="text-sm font-semibold">{formatTHB(item.price * item.quantity)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span>ยอดสินค้า</span>
              <span>{formatTHB(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>ค่าส่ง</span>
              <span>{order.shippingFee === 0 ? "ฟรี" : formatTHB(order.shippingFee)}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>รวม</span>
              <span className="text-forge">{formatTHB(order.grandTotal)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="font-bold">ที่อยู่จัดส่ง</h2>
            <p className="mt-2 text-sm">
              {order.address.fullName}
              <br />
              {order.address.phone}
              {order.address.email ? (
                <>
                  <br />
                  {order.address.email}
                </>
              ) : null}
              <br />
              {order.address.line1}
              {order.address.line2 ? `, ${order.address.line2}` : ""}
              <br />
              {order.address.district} {order.address.province} {order.address.postalCode}
            </p>
          </div>

          <div className="card p-5">
            <h2 className="font-bold">การชำระเงิน</h2>
            <p className="mt-2 text-sm text-muted">
              วิธี: {order.paymentMethod} · สถานะ: {payment?.status}
            </p>
            <BillActions
              token={token}
              orderId={order.id}
              status={order.status}
              paymentMethod={order.paymentMethod}
              settings={{
                bankName: settings.bankName,
                bankAccountName: settings.bankAccountName,
                bankAccountNumber: settings.bankAccountNumber,
                promptPayId: settings.promptPayId,
                grandTotal: order.grandTotal,
              }}
            />
          </div>

          {shipments.length > 0 ? (
            <div className="card p-5">
              <h2 className="font-bold">การจัดส่ง</h2>
              <ul className="mt-3 space-y-4">
                {shipments.map((s) => {
                  const url = trackingUrl(s.carrier, s.trackingNo);
                  return (
                    <li key={s.id} className="min-w-0 rounded-2xl border border-gray-100 p-3">
                      <p className="font-semibold text-navy">{carrierLabel(s.carrier)}</p>
                      <p className="mt-1 break-all text-sm">เลขพัสดุ {s.trackingNo || "-"}</p>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-navy mt-3 w-full sm:w-auto"
                        >
                          {trackingLinkLabel(s.carrier)}
                        </a>
                      ) : s.carrier === "other" && s.trackingNo ? (
                        <p className="mt-2 text-xs leading-relaxed text-muted">
                          คัดลอกเลขพัสดุไปเช็คกับขนส่งที่ใช้นะ — ร้านเลือกขนส่งเป็นอื่น ๆ จึงไม่มีปุ่มเปิดเว็บอัตโนมัติ
                        </p>
                      ) : s.carrier === "pickup" ? (
                        <p className="mt-2 text-xs text-muted">นัดรับเอง ไม่มีเลขพัสดุ</p>
                      ) : null}
                      {(s.photoPaths ?? []).length > 0 ? (
                        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {(s.photoPaths ?? []).map((file) => (
                            <li key={file} className="overflow-hidden rounded-2xl bg-steel">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`/api/bill/ship-photo?token=${encodeURIComponent(token)}&file=${encodeURIComponent(file)}`}
                                alt="ภาพพัสดุจากร้าน"
                                className="h-32 w-full object-cover"
                              />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}