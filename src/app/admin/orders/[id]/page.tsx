"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { adminJson } from "@/lib/admin-client";
import type { AdminOrderRow } from "@/lib/admin-types";
import {
  CARRIERS,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  carrierLabel,
  trackingLinkLabel,
  trackingUrl,
} from "@/lib/shipping";
import type { Carrier } from "@/lib/types";
import { formatDateTime, formatTHB } from "@/lib/utils";

function PhotoThumb({ file }: { file: File }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  if (!src) return <div className="h-20 bg-steel" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-20 w-full object-cover" />
  );
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [row, setRow] = useState<AdminOrderRow | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [carrier, setCarrier] = useState<Carrier>("flash");
  const [trackingNo, setTrackingNo] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [note, setNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await adminJson<AdminOrderRow>(`/api/admin?resource=order&id=${encodeURIComponent(id)}`);
      setRow(data);
      setNote(data.order.adminNote ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: string, extra: Record<string, unknown> = {}) {
    if (!row) return;
    setBusy(action);
    setError("");
    try {
      await adminJson("/api/admin", {
        method: "POST",
        body: JSON.stringify({ action, orderId: row.order.id, ...extra }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusy("");
    }
  }

  async function submitShipment(shipmentId?: string, extraFiles?: File[]) {
    if (!row) return;
    setBusy("ship");
    setError("");
    try {
      const fd = new FormData();
      fd.set("orderId", row.order.id);
      if (shipmentId) {
        fd.set("shipmentId", shipmentId);
        for (const f of extraFiles ?? []) fd.append("photos", f);
      } else {
        fd.set("carrier", carrier);
        fd.set("trackingNo", trackingNo);
        for (const f of photos) fd.append("photos", f);
      }
      await adminJson("/api/admin/ship", { method: "POST", body: fd });
      if (!shipmentId) {
        setTrackingNo("");
        setPhotos([]);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกการส่งไม่สำเร็จ");
    } finally {
      setBusy("");
    }
  }

  if (error && !row) return <p className="text-sm text-red-700">{error}</p>;
  if (!row) return <p className="text-sm text-muted">กำลังโหลดบิล…</p>;

  const { order, payment, document, shipments } = row;
  const addr = order.address;
  const slipSrc = payment?.slipPath
    ? `/api/admin/slip?file=${encodeURIComponent(payment.slipPath)}`
    : null;
  const isPdf = payment?.slipPath?.toLowerCase().endsWith(".pdf");

  return (
    <div>
      <Link href="/admin/orders" className="text-sm text-muted hover:underline">
        ← ออเดอร์ทั้งหมด
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">{order.number}</h1>
          <p className="mt-1 text-sm text-muted">{formatDateTime(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {order.status === "payment_submitted" || order.status === "pending_payment" ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!!busy}
            onClick={() => void run("confirm_payment")}
          >
            ยืนยันชำระ
          </button>
        ) : null}
        {order.status === "paid" ? (
          <button
            type="button"
            className="btn btn-navy"
            disabled={!!busy}
            onClick={() => void run("packing")}
          >
            เริ่มแพ็ก
          </button>
        ) : null}
        {order.status === "shipped" ? (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!!busy}
            onClick={() => void run("delivered")}
          >
            ถึงแล้ว
          </button>
        ) : null}
        {order.status === "delivered" ? (
          <button
            type="button"
            className="btn btn-navy"
            disabled={!!busy}
            onClick={() => void run("complete")}
          >
            ปิดงาน
          </button>
        ) : null}
        <Link href={`/bill/${order.token}`} className="btn btn-secondary" target="_blank">
          เปิดบิลลูกค้า
        </Link>
        {document ? (
          <Link
            href={`/bill/${order.token}/print`}
            className="btn btn-secondary"
            target="_blank"
            onClick={() =>
              void run("print_receipt", { documentId: document.id }).catch(() => undefined)
            }
          >
            พิมพ์ {document.number}
          </Link>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="font-semibold text-navy">ลูกค้า / ที่อยู่ส่ง</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-muted">ชื่อ</dt>
              <dd>{addr.fullName}</dd>
            </div>
            <div>
              <dt className="text-muted">โทร</dt>
              <dd>
                <a className="underline" href={`tel:${addr.phone}`}>
                  {addr.phone}
                </a>
              </dd>
            </div>
            {addr.email ? (
              <div>
                <dt className="text-muted">อีเมล</dt>
                <dd>{addr.email}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-muted">ที่อยู่</dt>
              <dd>
                {addr.line1}
                {addr.line2 ? ` ${addr.line2}` : ""}
                <br />
                {addr.district} {addr.province} {addr.postalCode}
              </dd>
            </div>
            <div>
              <dt className="text-muted">วิธีส่ง</dt>
              <dd>{order.shippingMethod === "pickup" ? "นัดรับเอง" : "จัดส่ง"}</dd>
            </div>
          </dl>
        </section>

        <section className="card p-4">
          <h2 className="font-semibold text-navy">การชำระเงิน</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-muted">วิธี</dt>
              <dd>{PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}</dd>
            </div>
            <div>
              <dt className="text-muted">สถานะจ่าย</dt>
              <dd>{PAYMENT_STATUS_LABEL[payment?.status ?? ""] ?? payment?.status ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">ยอดที่ต้องได้</dt>
              <dd className="text-lg font-bold text-forge">{formatTHB(order.grandTotal)}</dd>
            </div>
            {payment?.transferredAt ? (
              <div>
                <dt className="text-muted">เวลาโอน/อัปสลิป</dt>
                <dd>{formatDateTime(payment.transferredAt)}</dd>
              </div>
            ) : null}
            {order.paidAt ? (
              <div>
                <dt className="text-muted">ยืนยันเมื่อ</dt>
                <dd>{formatDateTime(order.paidAt)}</dd>
              </div>
            ) : null}
          </dl>
          {slipSrc ? (
            <div className="mt-4">
              <p className="text-sm font-semibold">สลิป</p>
              {isPdf ? (
                <a href={slipSrc} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm underline">
                  เปิดไฟล์ PDF
                </a>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slipSrc} alt="สลิปโอนเงิน" className="mt-2 max-h-80 rounded border object-contain" />
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">ยังไม่มีสลิป</p>
          )}
          {order.status === "payment_submitted" ? (
            <div className="mt-4 border-t pt-4">
              <label className="label" htmlFor="reject-reason">
                เหตุผลถ้าสลิปไม่ผ่าน
              </label>
              <input
                id="reject-reason"
                className="input"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="เช่น ยอดไม่ตรง / ภาพไม่ชัด"
              />
              <button
                type="button"
                className="btn btn-secondary mt-2"
                disabled={!!busy}
                onClick={() => void run("reject_slip", { reason: rejectReason })}
              >
                สลิปไม่ผ่าน
              </button>
            </div>
          ) : null}
        </section>
      </div>

      <section className="card mt-4 overflow-hidden">
        <h2 className="border-b px-4 py-3 font-semibold text-navy">สินค้า</h2>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>รายการ</th>
                <th>SKU</th>
                <th>จำนวน</th>
                <th>ราคา</th>
                <th>รวม</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={`${item.productId}-${item.sku}`}>
                  <td>
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt="" className="h-12 w-12 rounded object-cover bg-steel" />
                      ) : null}
                      <span>{item.name}</span>
                    </div>
                  </td>
                  <td className="text-xs text-muted">{item.sku}</td>
                  <td>{item.quantity}</td>
                  <td>{formatTHB(item.price)}</td>
                  <td className="font-semibold">{formatTHB(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-1 border-t px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">สินค้า</span>
            <span>{formatTHB(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">ค่าส่ง</span>
            <span>{order.shippingFee ? formatTHB(order.shippingFee) : "ฟรี"}</span>
          </div>
          {order.discount ? (
            <div className="flex justify-between">
              <span className="text-muted">ส่วนลด</span>
              <span>-{formatTHB(order.discount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between font-bold text-navy">
            <span>ยอดสุทธิ</span>
            <span>{formatTHB(order.grandTotal)}</span>
          </div>
        </div>
      </section>

      {(order.status === "paid" || order.status === "packing") && (
        <section className="card mt-4 p-4">
          <h2 className="font-semibold text-navy">บันทึกการส่ง</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            ใส่เลขพัสดุแล้วลูกค้ากดลิงก์ไปเว็บขนส่งได้ — อัปภาพกล่องหรือใบปะหน้าได้ด้วย
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label className="label" htmlFor="carrier">
                ขนส่ง
              </label>
              <select
                id="carrier"
                className="input"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value as Carrier)}
              >
                {CARRIERS.map((c) => (
                  <option key={c} value={c}>
                    {carrierLabel(c)}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className="label" htmlFor="tracking">
                เลขแทรก
              </label>
              <input
                id="tracking"
                className="input"
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
                disabled={carrier === "pickup"}
                placeholder={carrier === "pickup" ? "นัดรับ ไม่ต้องใส่เลข" : "เลขพัสดุจากขนส่ง"}
              />
            </div>
          </div>
          <div className="mt-3 min-w-0">
            <label className="label" htmlFor="ship-photos">
              ภาพกล่อง / ใบปะหน้า (ไม่บังคับ)
            </label>
            <input
              id="ship-photos"
              type="file"
              accept="image/jpeg,image/png"
              multiple
              className="block w-full min-w-0 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-steel file:px-3 file:py-2 file:text-sm"
              onChange={(e) => setPhotos(Array.from(e.target.files ?? []).slice(0, 8))}
            />
            {photos.length > 0 ? (
              <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {photos.map((f) => (
                  <li key={`${f.name}-${f.size}-${f.lastModified}`} className="overflow-hidden rounded-xl bg-steel">
                    <PhotoThumb file={f} />
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-1 text-xs text-muted">JPG หรือ PNG ไม่เกิน 5MB ต่อรูป สูงสุด 8 รูป</p>
          </div>
          <button
            type="button"
            className="btn btn-primary mt-4"
            disabled={!!busy}
            onClick={() => void submitShipment()}
          >
            {busy === "ship" ? "กำลังบันทึก..." : "ส่งแล้ว"}
          </button>
        </section>
      )}

      {shipments.length > 0 ? (
        <section className="card mt-4 p-4">
          <h2 className="font-semibold text-navy">พัสดุ</h2>
          <ul className="mt-3 space-y-4">
            {shipments.map((s) => {
              const url = trackingUrl(s.carrier, s.trackingNo);
              return (
                <li key={s.id} className="min-w-0 rounded-2xl border border-gray-100 p-3">
                  <p className="text-sm font-semibold text-navy">{carrierLabel(s.carrier)}</p>
                  <p className="mt-1 break-all text-sm">เลขพัสดุ {s.trackingNo || "—"}</p>
                  <p className="text-xs text-muted">{formatDateTime(s.shippedAt)}</p>
                  {url ? (
                    <a
                      href={url}
                      className="mt-2 inline-flex text-sm font-semibold text-navy underline underline-offset-2"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {trackingLinkLabel(s.carrier)}
                    </a>
                  ) : s.trackingNo && s.carrier === "other" ? (
                    <p className="mt-2 text-xs text-muted">{trackingLinkLabel("other")}</p>
                  ) : null}
                  {(s.photoPaths ?? []).length > 0 ? (
                    <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {(s.photoPaths ?? []).map((file) => (
                        <li key={file} className="overflow-hidden rounded-xl bg-steel">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/admin/ship?file=${encodeURIComponent(file)}`}
                            alt="ภาพพัสดุ"
                            className="h-20 w-full object-cover"
                          />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <label className="mt-3 block text-xs font-medium text-navy">
                    อัปภาพเพิ่ม
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      multiple
                      className="mt-1 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-steel file:px-3 file:py-1.5"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        e.target.value = "";
                        if (files.length) void submitShipment(s.id, files);
                      }}
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {document ? (
        <section className="card mt-4 p-4 text-sm">
          <h2 className="font-semibold text-navy">เอกสาร</h2>
          <p className="mt-2">
            ใบเสร็จ {document.number} · ออก {formatDateTime(document.issuedAt)} · พิมพ์แล้ว{" "}
            {document.printCount} ครั้ง
          </p>
        </section>
      ) : null}

      <section className="card mt-4 p-4">
        <h2 className="font-semibold text-navy">โน้ตภายใน</h2>
        <p className="text-xs text-muted">ลูกค้าไม่เห็นข้อความนี้</p>
        <textarea
          className="input mt-2 min-h-[88px]"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-secondary mt-2"
          disabled={!!busy}
          onClick={() => void run("save_note", { note })}
        >
          บันทึกโน้ต
        </button>
      </section>

      <section className="card mt-4 p-4">
        <h2 className="font-semibold text-navy">ไทม์ไลน์</h2>
        {order.events.length === 0 ? (
          <p className="mt-2 text-sm text-muted">ยังไม่มีเหตุการณ์</p>
        ) : (
          <ol className="mt-3 space-y-3 border-l border-gray-200 pl-4">
            {[...order.events].reverse().map((ev) => (
              <li key={ev.id} className="text-sm">
                <p>{ev.message}</p>
                <p className="text-xs text-muted">
                  {formatDateTime(ev.at)}
                  {ev.by ? ` · ${ev.by}` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {order.status !== "cancelled" && order.status !== "refunded" && order.status !== "completed" ? (
        <section className="card mt-4 p-4">
          <h2 className="font-semibold text-navy">ยกเลิก / คืนเงิน</h2>
          <label className="label mt-3" htmlFor="cancel-reason">
            เหตุผล
          </label>
          <input
            id="cancel-reason"
            className="input"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="เช่น ลูกค้าขอยกเลิก"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {order.status === "pending_payment" ||
            order.status === "payment_submitted" ||
            order.status === "paid" ||
            order.status === "packing" ? (
              <button
                type="button"
                className="btn btn-danger"
                disabled={!!busy}
                onClick={() => {
                  if (confirm("ยกเลิกออเดอร์นี้และคืนสต็อก?")) void run("cancel", { reason: cancelReason });
                }}
              >
                ยกเลิกออเดอร์
              </button>
            ) : null}
            {order.status === "paid" ||
            order.status === "packing" ||
            order.status === "shipped" ||
            order.status === "delivered" ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!!busy}
                onClick={() => {
                  if (confirm("บันทึกว่าคืนเงินแล้ว?")) void run("refund", { reason: cancelReason });
                }}
              >
                คืนเงินแล้ว
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
