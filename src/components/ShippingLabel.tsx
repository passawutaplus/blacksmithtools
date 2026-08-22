import { formatPhoneDisplay } from "@/lib/phone";
import { formatThaiLocalityOnLabel } from "@/lib/thai-address-format";
import type { Order, OrderItem, SiteSettings } from "@/lib/types";

const MAX_LABEL_ITEMS = 4;

function productNameOnLabel(item: OrderItem) {
  const variant = item.variantName?.trim();
  if (!variant) return item.name;
  const suffixes = [` — ${variant}`, ` – ${variant}`, ` - ${variant}`];
  for (const suffix of suffixes) {
    if (item.name.endsWith(suffix)) return item.name.slice(0, -suffix.length).trim();
  }
  return item.name;
}

export function ShippingLabel({ order, settings }: { order: Order; settings: SiteSettings }) {
  const addr = order.address;
  const showItems = order.origin !== "manual" && order.items.length > 0;
  const qty = order.items.reduce((n, item) => n + item.quantity, 0);
  const paid = Boolean(order.paidAt);
  const visible = order.items.slice(0, MAX_LABEL_ITEMS);
  const extra = order.items.length - visible.length;

  return (
    <article className="shipping-label">
      <header className="shipping-label-head">
        <div className="shipping-label-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark-white.png" alt="" className="shipping-label-mark" />
          <div className="min-w-0">
            <p className="shipping-label-kicker">ใบปะหน้าส่งของ</p>
            <p className="shipping-label-shop">Blacksmith Tools</p>
          </div>
        </div>
        <p className="shipping-label-order font-latin">{order.number}</p>
      </header>

      <section className="shipping-label-from">
        <div className="shipping-label-from-text">
          <p className="shipping-label-tag">ผู้ส่ง / ที่อยู่คืนของ</p>
          <p className="font-semibold leading-snug">{settings.shopName}</p>
          <p className="mt-0.5 leading-snug">
            {settings.address}
            {settings.phone ? ` · โทร ${formatPhoneDisplay(settings.phone)}` : null}
          </p>
        </div>
        {settings.lineUrl ? (
          <div className="shipping-label-line-qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/line-oa-qr.png" alt={`LINE ${settings.lineId || ""}`.trim()} />
            <span>LINE</span>
          </div>
        ) : null}
      </section>

      <section className="shipping-label-to">
        <p className="shipping-label-tag">ผู้รับ — จัดส่งที่นี่</p>
        <p className="shipping-label-name">{addr.fullName}</p>
        <a className="shipping-label-phone font-latin" href={`tel:${addr.phone}`}>
          {formatPhoneDisplay(addr.phone)}
        </a>
        <p className="shipping-label-addr">
          {addr.line1}
          <br />
          {formatThaiLocalityOnLabel(addr)}
        </p>
      </section>
      {order.customerNote ? (
        <p className="shipping-label-note">หมายเหตุ: {order.customerNote}</p>
      ) : null}

      {showItems ? (
      <footer className="shipping-label-foot">
        <div className="shipping-label-items-head">
          <p>รายการสินค้า · {qty} ชิ้น</p>
          <p className="shipping-label-cod">{paid ? "จ่ายแล้ว · ไม่เก็บปลายทาง" : "เช็กชำระก่อนส่ง"}</p>
        </div>
        <table className="shipping-label-items-table">
          <colgroup>
            <col className="shipping-label-col-no" />
            <col />
            <col className="shipping-label-col-opt" />
            <col className="shipping-label-col-qty" />
          </colgroup>
          <thead>
            <tr>
              <th>#</th>
              <th>ชื่อสินค้า</th>
              <th>ตัวเลือกสินค้า</th>
              <th>จำนวน</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item, i) => (
              <tr key={`${item.productId}-${item.variantId ?? item.sku}-${i}`}>
                <td className="shipping-label-cell-no">{i + 1}</td>
                <td>
                  <span className="shipping-label-clamp">{productNameOnLabel(item)}</span>
                </td>
                <td>
                  <span className="shipping-label-clamp">{item.variantName?.trim() || "—"}</span>
                </td>
                <td className="shipping-label-cell-qty">{item.quantity}</td>
              </tr>
            ))}
            {extra > 0 ? (
              <tr>
                <td colSpan={4} className="shipping-label-items-more">
                  และอีก {extra} รายการ
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </footer>
      ) : null}
    </article>
  );
}
