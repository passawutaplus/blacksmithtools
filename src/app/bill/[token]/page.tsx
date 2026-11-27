import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderByToken } from "@/lib/db";
import { verifyPaysoRef } from "@/lib/payments/payso-confirm";
import { formatThaiLocality } from "@/lib/thai-address-format";
import { formatTHB } from "@/lib/utils";
import { ORDER_STATUS_LABEL, carrierLabel, trackingLinkLabel, trackingUrl } from "@/lib/shipping";
import { BillActions } from "./BillActions";
import { CopyButton } from "@/components/CopyButton";
import { PhotoThumbs } from "@/components/PhotoThumbs";
import { RememberBill } from "@/components/RememberBill";

const PAY_METHOD_LABEL: Record<string, string> = {
  payso: "บัตร / QR ผ่าน Payso",
  bank_transfer: "โอนเข้าบัญชีร้าน",
  promptpay_qr: "PromptPay",
  mock: "ทดสอบ",
  cash: "เงินสด",
};
const PAY_STATUS_LABEL: Record<string, string> = {
  pending: "รอชำระ",
  submitted: "ส่งสลิปแล้ว รอตรวจ",
  paid: "ชำระแล้ว",
  failed: "ไม่สำเร็จ",
  cancelled: "ยกเลิก",
};

const STEPS = ["pending_payment", "payment_submitted", "paid", "packing", "shipped", "delivered"];

export default async function BillPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string; payso?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  let detail = await getOrderByToken(token);
  if (!detail) notFound();
  // Back from Payso: ask Payso directly instead of waiting for the postback.
  if (
    sp.payso &&
    detail.order.paymentMethod === "payso" &&
    detail.order.status === "pending_payment" &&
    detail.payment?.paysoRef
  ) {
    const r = await verifyPaysoRef(detail.payment.paysoRef).catch(() => null);
    if (r?.ok) detail = (await getOrderByToken(token)) ?? detail;
  }
  const { order, payment, document, shipments, settings } = detail;

  const stepIndex = Math.max(
    0,
    STEPS.findIndex((s) => s === order.status),
  );

  return (
    <div className="container-bs py-8 md:py-10">
      <RememberBill token={order.token} number={order.number} />
      {sp.payso && order.status === "pending_payment" ? (
        <div className="mb-4 border-l-4 border-forge bg-white px-4 py-3 text-sm">
          ยังไม่ได้รับยืนยันการชำระจาก Payso ถ้าจ่ายแล้ว รอสักครู่แล้วรีเฟรชหน้านี้ หรือกดจ่ายอีกครั้งด้านล่าง
        </div>
      ) : null}
      {sp.paid || (sp.payso && order.status === "paid") ? (
        <div className="mb-4 border-l-4 border-green-700 bg-white px-4 py-3 text-sm text-green-800">
          ชำระเงินสำเร็จ — ระบบออกบิลเงินสดให้อัตโนมัติแล้ว
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Online bill</p>
          <h1 className="num mt-2 text-2xl font-semibold text-navy md:text-3xl">{order.number}</h1>
          <p className="mt-2 inline-flex items-center bg-navy px-2.5 py-1 text-xs font-semibold text-white">
            {ORDER_STATUS_LABEL[order.status] ?? order.status}
          </p>
        </div>
        {document ? (
          <Link href={`/bill/${token}/print`} prefetch={false} className="btn btn-secondary relative z-10 no-print">
            พิมพ์บิลเงินสด {document.number}
          </Link>
        ) : null}
      </div>

      <ol className="mt-6 grid grid-cols-3 gap-x-1 gap-y-3 sm:grid-cols-6" aria-label="ขั้นตอนคำสั่งซื้อ">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === stepIndex ? "step" : undefined}>
            <span className={`block h-1.5 ${i <= stepIndex ? "bg-forge" : "bg-navy/10"}`} />
            <span
              className={`mt-1.5 flex items-baseline gap-1.5 text-xs ${
                i === stepIndex ? "font-semibold text-navy" : i < stepIndex ? "text-navy/70" : "text-muted"
              }`}
            >
              <span className="num">{String(i + 1).padStart(2, "0")}</span>
              {ORDER_STATUS_LABEL[s]}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-bold">รายการสินค้า</h2>
          <ul className="mt-4 space-y-3">
            {order.items.map((item, i) => (
              <li key={`${item.productId}-${item.variantId ?? item.sku}-${i}`} className="flex gap-3">
                <div className="relative h-16 w-16 shrink-0 bg-steel">
                  <Image src={item.imageUrl} alt={item.name} fill className="object-contain p-1" sizes="64px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{item.name}</p>
                  {item.variantName ? <p className="text-xs text-muted">{item.variantName}</p> : null}
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
            {order.origin === "manual" ? null : (
              <div className="flex justify-between">
                <span>ค่าส่ง</span>
                <span>
                  {order.shippingMethod === "rider"
                    ? "ไรเดอร์ · จ่ายปลายทาง"
                    : order.shippingFee === 0
                      ? "ฟรี"
                      : formatTHB(order.shippingFee)}
                </span>
              </div>
            )}
            {order.discount ? (
              <div className="flex justify-between">
                <span>ส่วนลด</span>
                <span>-{formatTHB(order.discount)}</span>
              </div>
            ) : null}
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
              {formatThaiLocality(order.address)}
            </p>
            {order.customerNote ? (
              <p className="mt-3 border-t border-gray-100 pt-3 text-sm">
                <span className="font-semibold">หมายเหตุ: </span>
                {order.customerNote}
              </p>
            ) : null}
          </div>

          {order.wantReceipt ? (
            <div className="card p-5">
              <h2 className="font-bold">ข้อมูลออกบิล</h2>
              {order.billing ? (
                <p className="mt-2 text-sm">
                  {order.billing.name}
                  <br />
                  {order.billing.phone}
                  {order.billing.email ? (
                    <>
                      <br />
                      {order.billing.email}
                    </>
                  ) : null}
                  <br />
                  {order.billing.line1}
                  <br />
                  {formatThaiLocality(order.billing)}
                  {order.billing.taxId ? (
                    <>
                      <br />
                      เลขประจำตัวผู้เสียภาษี {order.billing.taxId}
                    </>
                  ) : null}
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted">ใช้ที่อยู่จัดส่งบนบิล</p>
              )}
              <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed text-muted">
                {order.billing?.email || order.address.email
                  ? document?.emailedAt
                    ? `ส่งบิลเงินสดไปที่ ${order.billing?.email || order.address.email} แล้ว — ไม่ใช่ใบกำกับภาษี เพราะร้านเป็นบุคคลธรรมดา ยังไม่ได้จด VAT`
                    : `เมื่อชำระแล้ว ร้านจะส่งบิลเงินสดไปที่ ${order.billing?.email || order.address.email} — ไม่ใช่ใบกำกับภาษี เพราะร้านเป็นบุคคลธรรมดา ยังไม่ได้จด VAT`
                  : "ร้านเป็นบุคคลธรรมดา ยังไม่ได้จด VAT จึงออกได้แค่บิลเงินสด ไม่ใช่ใบกำกับภาษี"}
              </p>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-muted">
              ร้านเป็นบุคคลธรรมดา ยังไม่ได้จด VAT จึงออกได้แค่บิลเงินสด ไม่ใช่ใบกำกับภาษี
            </p>
          )}

          <div className="card p-5">
            <h2 className="font-bold">การชำระเงิน</h2>
            <p className="mt-2 text-sm text-muted">
              วิธี: {PAY_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod} · สถานะ:{" "}
              {PAY_STATUS_LABEL[payment?.status ?? ""] ?? payment?.status}
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
              <p className="mt-1 text-sm leading-relaxed text-muted">
                ร้านลงเลขพัสดุและรูปใบปะหน้าแล้ว สถานะระหว่างทางดูที่เว็บขนส่ง — กดปุ่มด้านล่างได้เลย เลขถูกใส่ให้แล้ว
              </p>
              <ul className="mt-3 space-y-4">
                {shipments.map((s) => {
                  const url = trackingUrl(s.carrier, s.trackingNo);
                  return (
                    <li key={s.id} className="min-w-0 rounded-[3px] border border-gray-100 p-3">
                      <p className="font-semibold text-navy">{carrierLabel(s.carrier)}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="min-w-0 break-all text-sm">เลขพัสดุ {s.trackingNo || "-"}</p>
                        {s.trackingNo && s.carrier !== "pickup" ? (
                          <CopyButton value={s.trackingNo} compact />
                        ) : null}
                      </div>
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
                      <PhotoThumbs
                        images={(s.photoPaths ?? []).map((file) => ({
                          src: `/api/bill/ship-photo?token=${encodeURIComponent(token)}&file=${encodeURIComponent(file)}`,
                          alt: "ภาพพัสดุจากร้าน",
                        }))}
                      />
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