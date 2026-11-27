"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Copy, Eye, Package, Printer } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { adminJson } from "@/lib/admin-client";
import type { AdminOrderRow } from "@/lib/admin-types";
import {
  CARRIERS,
  ORDER_FLOW_STATUSES,
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  MANUAL_CHANNEL_LABEL,
  carrierLabel,
  carrierTrackLabel,
  trackingLinkLabel,
  trackingUrl,
} from "@/lib/shipping";
import type { Carrier, OrderStatus, Shipment } from "@/lib/types";
import { formatThaiLocality } from "@/lib/thai-address-format";
import { formatDateTime, formatTHB, lineAmount } from "@/lib/utils";
import { PhotoThumbs } from "@/components/PhotoThumbs";

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

function ShipmentCard({
  shipment,
  busy,
  onSave,
  onAddPhotos,
}: {
  shipment: Shipment;
  busy: boolean;
  onSave: (shipmentId: string, carrier: Carrier, trackingNo: string) => Promise<void>;
  onAddPhotos: (shipmentId: string, files: File[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [carrier, setCarrier] = useState<Carrier>(shipment.carrier);
  const [trackingNo, setTrackingNo] = useState(shipment.trackingNo);
  const url = trackingUrl(shipment.carrier, shipment.trackingNo);

  useEffect(() => {
    setCarrier(shipment.carrier);
    setTrackingNo(shipment.trackingNo);
    setEditing(false);
  }, [shipment.id, shipment.carrier, shipment.trackingNo]);

  return (
    <li className="min-w-0 rounded-[3px] border border-gray-100 p-3">
      {editing ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <label className="label" htmlFor={`edit-carrier-${shipment.id}`}>
              ขนส่ง
            </label>
            <select
              id={`edit-carrier-${shipment.id}`}
              className="input"
              value={carrier}
              disabled={busy}
              onChange={(e) => {
                const next = e.target.value as Carrier;
                setCarrier(next);
                if (next === "pickup") setTrackingNo("");
              }}
            >
              {CARRIERS.map((c) => (
                <option key={c} value={c}>
                  {carrierLabel(c)}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="label" htmlFor={`edit-tracking-${shipment.id}`}>
              เลขพัสดุ
            </label>
            <input
              id={`edit-tracking-${shipment.id}`}
              className="input"
              value={trackingNo}
              disabled={busy || carrier === "pickup"}
              onChange={(e) => setTrackingNo(e.target.value)}
              placeholder={carrier === "pickup" ? "ไรเดอร์ ไม่ต้องใส่เลข" : "เลขพัสดุจากขนส่ง"}
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() =>
                void onSave(shipment.id, carrier, trackingNo)
                  .then(() => setEditing(false))
                  .catch(() => undefined)
              }
            >
              {busy ? "กำลังบันทึก..." : "บันทึกเลขใหม่"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => {
                setCarrier(shipment.carrier);
                setTrackingNo(shipment.trackingNo);
                setEditing(false);
              }}
            >
              ยกเลิก
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy">{carrierLabel(shipment.carrier)}</p>
              <p className="mt-1 break-all text-sm">เลขพัสดุ {shipment.trackingNo || "—"}</p>
            </div>
            <button
              type="button"
              className="text-sm font-semibold text-forge hover:underline"
              disabled={busy}
              onClick={() => setEditing(true)}
            >
              แก้เลขพัสดุ
            </button>
          </div>
          {shipment.carrierStatus ? (
            <p className="mt-1 text-sm font-medium text-navy">
              {carrierTrackLabel(shipment.carrierStatus)}
              {shipment.carrierStatusText ? ` · ${shipment.carrierStatusText}` : ""}
            </p>
          ) : null}
          {shipment.trackRegisterError ? (
            <p className="mt-1 text-xs text-red-700">ยังตามขนส่งอัตโนมัติไม่ได้: {shipment.trackRegisterError}</p>
          ) : null}
          <p className="text-xs text-muted">{formatDateTime(shipment.shippedAt)}</p>
          {url ? (
            <a
              href={url}
              className="mt-2 inline-flex text-sm font-semibold text-navy underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              {trackingLinkLabel(shipment.carrier)}
            </a>
          ) : shipment.trackingNo && shipment.carrier === "other" ? (
            <p className="mt-2 text-xs text-muted">{trackingLinkLabel("other")}</p>
          ) : null}
        </>
      )}
      <PhotoThumbs
        className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4"
        thumbClassName="h-20 w-full object-cover"
        images={(shipment.photoPaths ?? []).map((file) => ({
          src: `/api/admin/ship?file=${encodeURIComponent(file)}`,
          alt: "ภาพพัสดุ",
        }))}
      />
      <label className="mt-3 block text-xs font-medium text-navy">
        อัปภาพเพิ่ม
        <input
          type="file"
          accept="image/jpeg,image/png"
          multiple
          className="mt-1 block w-full text-sm file:mr-3 file:rounded-[2px] file:border-0 file:bg-steel file:px-3 file:py-1.5"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) onAddPhotos(shipment.id, files);
          }}
        />
      </label>
    </li>
  );
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [row, setRow] = useState<AdminOrderRow | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
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

  async function updateShipmentInfo(shipmentId: string, nextCarrier: Carrier, nextTracking: string) {
    if (!row) return;
    setBusy("ship-edit");
    setError("");
    try {
      const fd = new FormData();
      fd.set("action", "update");
      fd.set("orderId", row.order.id);
      fd.set("shipmentId", shipmentId);
      fd.set("carrier", nextCarrier);
      fd.set("trackingNo", nextTracking);
      await adminJson("/api/admin/ship", { method: "POST", body: fd });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "แก้เลขพัสดุไม่สำเร็จ");
      throw e;
    } finally {
      setBusy("");
    }
  }

  async function attachSlip(file: File) {
    if (!row) return;
    setBusy("slip");
    setError("");
    try {
      const fd = new FormData();
      fd.set("orderId", row.order.id);
      fd.set("slip", file);
      await adminJson("/api/admin/slip", { method: "POST", body: fd });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "แนบสลิปไม่สำเร็จ");
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
          {order.origin === "manual" ? (
            <p className="mt-1 text-sm">
              พิมพ์เอกสาร
              {order.channel ? ` · ${MANUAL_CHANNEL_LABEL[order.channel] ?? order.channel}` : ""}
            </p>
          ) : null}
        </div>
        {order.status === "cancelled" || order.status === "refunded" ? (
          <StatusBadge status={order.status} />
        ) : (
          <label className="block min-w-[12rem]">
            <span className="label">สถานะ</span>
            <select
              className="input"
              value={order.status}
              disabled={!!busy}
              onChange={(e) => {
                const status = e.target.value as OrderStatus;
                if (status === order.status) return;
                if (!window.confirm(`เปลี่ยนสถานะเป็น "${ORDER_STATUS_LABEL[status]}" ?`)) return;
                void run("set_status", { status });
              }}
            >
              {ORDER_FLOW_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {ORDER_STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {order.status === "payment_submitted" || order.status === "pending_payment" ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!!busy}
            onClick={() => {
              if (
                order.status === "pending_payment" &&
                !window.confirm("ยังไม่มีสลิปจากลูกค้า ยืนยันว่าได้รับเงินแล้วจริงไหม? (ระบบจะออกใบเสร็จให้)")
              )
                return;
              void run("confirm_payment");
            }}
          >
            ยืนยันชำระ
          </button>
        ) : null}
        <Link
          href={`/bill/${order.token}`}
          className="btn btn-secondary px-3"
          target="_blank"
          aria-label="หน้าลูกค้า"
          title="หน้าลูกค้า"
        >
          <Eye className="h-5 w-5" aria-hidden />
        </Link>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={async () => {
            const text = `ออเดอร์ ${order.number} ยอด ${order.grandTotal.toLocaleString("th-TH")} บาท\nชำระเงิน แนบสลิป และดูเลขพัสดุได้ที่\n${window.location.origin}/bill/${order.token}`;
            try {
              await navigator.clipboard.writeText(text);
              setCopiedLink(true);
              setTimeout(() => setCopiedLink(false), 1500);
            } catch {
              window.prompt("คัดลอกข้อความนี้", text);
            }
          }}
        >
          <Copy className="h-4 w-4" aria-hidden />
          {copiedLink ? "คัดลอกแล้ว" : "คัดลอกลิงก์ส่งลูกค้า"}
        </button>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link
            href={`/bill/${order.token}/print/label`}
            className="btn btn-secondary"
            target="_blank"
            prefetch={false}
          >
            ใบปะหน้า
            <Package className="h-4 w-4" aria-hidden />
          </Link>
          {document ? (
            <Link
              href={`/bill/${order.token}/print`}
              className="btn btn-secondary"
              target="_blank"
              prefetch={false}
            >
              พิมพ์ {document.number}
              <Printer className="h-4 w-4" aria-hidden />
            </Link>
          ) : null}
        </div>
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
                {formatThaiLocality(addr)}
              </dd>
            </div>
            {order.customerNote ? (
              <div>
                <dt className="text-muted">หมายเหตุลูกค้า</dt>
                <dd>{order.customerNote}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-muted">วิธีส่ง</dt>
              <dd>
                {order.shippingMethod === "pickup"
                  ? "นัดรับเอง"
                  : order.shippingMethod === "rider"
                    ? "ด่วน Grab/ไรเดอร์ (ลูกค้าจ่ายค่าส่งปลายทาง)"
                    : "จัดส่งพัสดุ"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="card p-4">
          <h2 className="font-semibold text-navy">ข้อมูลออกบิล</h2>
          {order.wantReceipt && order.billing ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-muted">ชื่อบนบิล</dt>
                <dd>{order.billing.name}</dd>
              </div>
              <div>
                <dt className="text-muted">อีเมลรับบิล</dt>
                <dd>{order.billing.email}</dd>
              </div>
              {order.billing.phone ? (
                <div>
                  <dt className="text-muted">เบอร์โทรบนบิล</dt>
                  <dd>
                    <a className="underline" href={`tel:${order.billing.phone}`}>
                      {order.billing.phone}
                    </a>
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-muted">ที่อยู่บนบิล</dt>
                <dd>
                  {order.billing.line1}
                  <br />
                  {formatThaiLocality(order.billing)}
                </dd>
              </div>
              {order.billing.taxId ? (
                <div>
                  <dt className="text-muted">เลขผู้เสียภาษี</dt>
                  <dd className="font-latin tracking-wide">{order.billing.taxId}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted">
              {order.wantReceipt ? "ขอรับบิล แต่ยังไม่มีข้อมูลออกบิลแยก — ใช้ที่อยู่จัดส่ง" : "ลูกค้าไม่ได้ขอรับบิลเงินสดทางอีเมล"}
            </p>
          )}
        </section>

      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="font-semibold text-navy">การชำระเงิน</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
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
            ) : (
              <div>
                <dt className="text-muted">เวลาโอน/อัปสลิป</dt>
                <dd className="text-muted">—</dd>
              </div>
            )}
            {order.paidAt ? (
              <div className="col-span-2">
                <dt className="text-muted">ยืนยันเมื่อ</dt>
                <dd>{formatDateTime(order.paidAt)}</dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              {slipSrc ? (
                <>
                  <p className="text-sm font-semibold">สลิปโอนเงิน</p>
                  {isPdf ? (
                    <a href={slipSrc} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm underline">
                      เปิดไฟล์ PDF
                    </a>
                  ) : (
                    <PhotoThumbs
                      images={[{ src: slipSrc, alt: `สลิปโอนเงินบิล ${order.number}` }]}
                      className="mt-2"
                      thumbClassName="max-h-72 w-full bg-white object-contain p-2"
                    />
                  )}
                </>
              ) : order.paymentMethod === "mock" && order.paidAt ? (
                <div className="rounded-[3px] border border-gray-200 bg-steel p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">หลักฐานการจ่าย</p>
                  <p className="mt-1 text-sm font-bold text-navy">เดโม่ — จำลองโอนสำเร็จ</p>
                  <p className="mt-3 text-2xl font-bold text-forge">{formatTHB(order.grandTotal)}</p>
                  <p className="mt-1 text-sm">
                    อ้างอิง {order.number}
                    <br />
                    {formatDateTime(order.paidAt)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted">ยังไม่มีสลิปโอน — แนบจาก LINE หรือมือถือได้</p>
              )}
            </div>
            <div className="min-w-0">
              <label className="block">
                <span className="label">{slipSrc ? "เปลี่ยนสลิป" : "แนบสลิปโอนเงิน"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  disabled={busy === "slip"}
                  className="mt-1 block w-full text-sm file:mr-3 file:rounded-[2px] file:border-0 file:bg-steel file:px-3 file:py-1.5"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void attachSlip(file);
                  }}
                />
                <span className="mt-1 block text-xs text-muted">JPG PNG หรือ PDF ไม่เกิน 5MB</span>
              </label>
              {order.status === "payment_submitted" ? (
                <div className="mt-4">
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!!busy}
                      onClick={() => void run("confirm_payment")}
                    >
                      สลิปผ่าน
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={!!busy}
                      onClick={() => void run("reject_slip", { reason: rejectReason })}
                    >
                      สลิปไม่ผ่าน
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="font-semibold text-navy">บันทึกการส่ง</h2>
          {order.status === "paid" || order.status === "packing" || order.status === "shipped" ? (
            <>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                วางเลขจากใบปะหน้า Flash Home แล้วอัปรูป — ลูกค้าเปิดบิลแล้วกดไปหน้าขนส่งดูสถานะเอง ไม่ต้องสมัครสมาชิก
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
                    placeholder={carrier === "pickup" ? "ไรเดอร์ ไม่ต้องใส่เลข" : "เลขพัสดุจากขนส่ง"}
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
                  className="block w-full min-w-0 text-sm file:mr-3 file:rounded-[2px] file:border-0 file:bg-steel file:px-3 file:py-2 file:text-sm"
                  onChange={(e) => setPhotos(Array.from(e.target.files ?? []).slice(0, 8))}
                />
                {photos.length > 0 ? (
                  <ul className="mt-2 grid grid-cols-3 gap-2">
                    {photos.map((f) => (
                      <li key={`${f.name}-${f.size}-${f.lastModified}`} className="overflow-hidden rounded-[3px] bg-steel">
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
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">ยืนยันชำระก่อน จึงบันทึกเลขพัสดุได้</p>
          )}
          {shipments.length > 0 ? (
            <div className="mt-4 border-t pt-4">
              <h3 className="text-sm font-semibold text-navy">พัสดุ</h3>
              <p className="mt-1 text-xs text-muted">แก้ได้ถ้าส่งผิด — เลขใหม่ขึ้นบนบิลลูกค้าด้วย</p>
              <ul className="mt-3 space-y-4">
                {shipments.map((s) => (
                  <ShipmentCard
                    key={s.id}
                    shipment={s}
                    busy={busy === "ship" || busy === "ship-edit"}
                    onSave={updateShipmentInfo}
                    onAddPhotos={(shipmentId, files) => void submitShipment(shipmentId, files)}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>

      {order.items.length > 0 ? (
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
                <th>ส่วนลด</th>
                <th>รวม</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={`${item.productId}-${item.variantId ?? item.sku}-${i}`}>
                  <td>
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt="" className="h-12 w-12 rounded object-cover bg-steel" />
                      ) : null}
                      <span>
                        {item.name}
                        {item.variantName ? (
                          <span className="mt-0.5 block text-xs text-muted">{item.variantName}</span>
                        ) : null}
                      </span>
                    </div>
                  </td>
                  <td className="text-xs text-muted">{item.sku}</td>
                  <td>{item.quantity}</td>
                  <td>{formatTHB(item.price)}</td>
                  <td>{item.discount ? `-${formatTHB(item.discount)}` : "—"}</td>
                  <td className="font-semibold">{formatTHB(lineAmount(item))}</td>
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
          {order.origin === "manual" ? null : (
            <div className="flex justify-between">
              <span className="text-muted">ค่าส่ง</span>
              <span>{order.shippingFee ? formatTHB(order.shippingFee) : "ฟรี"}</span>
            </div>
          )}
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
      ) : null}

      {document ? (
        <section className="card mt-4 p-4 text-sm">
          <h2 className="font-semibold text-navy">เอกสาร</h2>
          <p className="mt-2">
            ใบเสร็จ {document.number} · ออก {formatDateTime(document.issuedAt)} · พิมพ์แล้ว{" "}
            {document.printCount} ครั้ง
            {document.emailedAt ? ` · ส่งเมลแล้ว ${formatDateTime(document.emailedAt)}` : ""}
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
