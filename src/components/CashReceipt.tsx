import { ShopLogo } from "@/components/ShopLogo";
import { baseItemName } from "@/lib/item-name";
import { buyerOnBill } from "@/lib/billing";
import { PAYMENT_METHOD_LABEL } from "@/lib/shipping";
import { formatThaiLocality } from "@/lib/thai-address-format";
import type { DocumentRecord, Order, SiteSettings } from "@/lib/types";
import { bahtText, formatDate, formatTHB, lineAmount } from "@/lib/utils";

export function CashReceipt({
  order,
  document,
  settings,
}: {
  order: Order;
  document: DocumentRecord;
  settings: SiteSettings;
}) {
  const buyer = buyerOnBill(order);
  const issued = document.issuedAt || order.paidAt || order.createdAt;
  const manual = order.origin === "manual";

  return (
    <article className="a4-invoice cash-receipt bg-white text-navy">
      <header className="flex items-start justify-between gap-6 border-b-2 border-navy pb-4">
        <div className="min-w-0 max-w-[118mm]">
          <ShopLogo variant="print" />
          <p className="mt-2 text-[13px] font-semibold leading-snug">{settings.shopName}</p>
          {settings.tagline ? <p className="text-[11px] leading-snug text-muted">{settings.tagline}</p> : null}
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            {settings.address}
            {settings.phone ? (
              <>
                <br />
                โทร {settings.phone}
              </>
            ) : null}
            {settings.email ? (
              <>
                <br />
                {settings.email}
              </>
            ) : null}
          </p>
        </div>
        <div className="w-[72mm] shrink-0 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">เอกสารร้านค้า</p>
          <h1 className="mt-1 text-[26px] font-bold leading-none tracking-tight">บิลเงินสด</h1>
          <p className="mt-2 inline-block rounded-[2px] bg-steel px-2.5 py-0.5 text-[10px] font-semibold text-navy">
            ไม่ใช่ใบกำกับภาษี
          </p>
          <dl className="mt-3 space-y-0.5 text-[11px]">
            <div className="flex justify-end gap-2">
              <dt className="text-muted">เลขที่</dt>
              <dd className="font-latin font-semibold tracking-wide">{document.number}</dd>
            </div>
            <div className="flex justify-end gap-2">
              <dt className="text-muted">วันที่</dt>
              <dd>{formatDate(issued)}</dd>
            </div>
            <div className="flex justify-end gap-2">
              <dt className="text-muted">อ้างอิงออเดอร์</dt>
              <dd className="font-latin font-semibold tracking-wide">{order.number}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="mt-4 grid grid-cols-2 gap-6 border-b border-steel pb-4 text-[13px]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">ผู้ขาย</p>
          <p className="mt-1 font-semibold">{settings.shopName}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            ผู้ประกอบการบุคคลธรรมดา ยังไม่ได้จดภาษีมูลค่าเพิ่ม
            {settings.taxId ? (
              <>
                <br />
                เลขประจำตัวผู้เสียภาษี {settings.taxId}
              </>
            ) : null}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">ผู้ซื้อ</p>
          <p className="mt-1 font-semibold">{buyer.name}</p>
          <p className="mt-1 text-[11px] leading-relaxed">
            {buyer.phone}
            {buyer.email ? (
              <>
                <br />
                {buyer.email}
              </>
            ) : null}
            <br />
            {buyer.line1}
            <br />
            {formatThaiLocality(buyer)}
            {buyer.taxId ? (
              <>
                <br />
                เลขประจำตัวผู้เสียภาษี {buyer.taxId}
              </>
            ) : null}
          </p>
        </div>
      </section>

      <table className="mt-4 w-full text-left text-[13px]">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-muted">
            <th className="w-7 py-2 font-semibold">#</th>
            <th className="py-2 font-semibold">ชื่อสินค้า</th>
            <th className="w-[38mm] py-2 font-semibold">ตัวเลือก</th>
            <th className="w-[22mm] py-2 text-right font-semibold">ราคา</th>
            <th className="w-[16mm] py-2 text-right font-semibold">จำนวน</th>
            {manual ? <th className="w-[20mm] py-2 text-right font-semibold">ส่วนลด</th> : null}
            <th className="w-[24mm] py-2 text-right font-semibold">รวม</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, i) => (
            <tr key={`${item.productId}-${item.variantId ?? item.sku}-${i}`}>
              <td className="py-2 align-top tabular-nums text-muted">{i + 1}</td>
              <td className="py-2 align-top">
                <p className="font-semibold leading-snug">{baseItemName(item)}</p>
                {!manual && item.sku ? (
                  <p className="mt-0.5 font-latin text-[10px] tracking-wide text-muted">{item.sku}</p>
                ) : null}
              </td>
              <td className="py-2 align-top text-[12px]">{item.variantName?.trim() || "—"}</td>
              <td className="py-2 align-top text-right tabular-nums">{formatTHB(item.price)}</td>
              <td className="py-2 align-top text-right tabular-nums">{item.quantity}</td>
              {manual ? (
                <td className="py-2 align-top text-right tabular-nums">
                  {item.discount ? `-${formatTHB(item.discount)}` : "—"}
                </td>
              ) : null}
              <td className="py-2 align-top text-right font-semibold tabular-nums">{formatTHB(lineAmount(item))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-4 grid grid-cols-[1fr_58mm] gap-5">
        <div className="text-[11px] leading-relaxed text-muted">
          <p className="rounded bg-steel px-3 py-2.5 text-navy">
            <span className="font-semibold">จำนวนเงิน (ตัวอักษร)</span>
            <br />
            {bahtText(order.grandTotal)}
          </p>
          {order.customerNote ? (
            <p className="mt-3">
              <span className="font-semibold text-navy">หมายเหตุ: </span>
              {order.customerNote}
            </p>
          ) : null}
          <p className="mt-3">
            ชำระโดย {PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}
            {order.paidAt ? ` · ชำระแล้ว ${formatDate(order.paidAt)}` : ""}
          </p>
        </div>
        <dl className="space-y-1.5 text-[13px]">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">ยอดสินค้า</dt>
            <dd className="tabular-nums">{formatTHB(order.subtotal)}</dd>
          </div>
          {!manual ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">ค่าส่ง</dt>
              <dd className="tabular-nums">{order.shippingFee === 0 ? "ฟรี" : formatTHB(order.shippingFee)}</dd>
            </div>
          ) : null}
          {manual || order.discount ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">ส่วนลด</dt>
              <dd className="tabular-nums">{order.discount ? `-${formatTHB(order.discount)}` : formatTHB(0)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 border-t-2 border-navy pt-2 text-[15px] font-bold">
            <dt>ยอดสุทธิ</dt>
            <dd className="tabular-nums">{formatTHB(order.grandTotal)}</dd>
          </div>
          <p className="pt-1 text-right text-[10px] text-muted">ไม่มีภาษีมูลค่าเพิ่ม</p>
        </dl>
      </section>

      <div className="a4-invoice-end">
        <footer className="grid grid-cols-2 gap-10 border-t border-steel pt-6 text-center text-[11px]">
          <div>
            <div className="mx-auto h-16 w-44" />
            <p className="border-t border-gray-300 pt-2">ผู้รับสินค้า</p>
          </div>
          <div>
            <div className="mx-auto h-16 w-44" />
            <p className="border-t border-gray-300 pt-2">ผู้ขาย / ผู้รับเงิน</p>
            <p className="mt-1 text-muted">{settings.shopName}</p>
          </div>
        </footer>

        <p className="mt-8 text-[10px] leading-relaxed text-muted">
          เอกสารนี้เป็นบิลเงินสดสำหรับลูกค้าปลีก ออกโดยผู้ประกอบการบุคคลธรรมดาที่ยังไม่ได้จดทะเบียนภาษีมูลค่าเพิ่ม
          ไม่ใช่ใบกำกับภาษีตามประมวลรัษฎากร และไม่สามารถใช้หักภาษี ณ ที่จ่ายหรือยื่น VAT ได้
          {order.wantReceipt && buyer.email ? ` ส่งสำเนาทางอีเมล ${buyer.email}` : ""} — ขอบคุณที่อุดหนุนแบรนด์คนไทย
        </p>
      </div>
    </article>
  );
}
