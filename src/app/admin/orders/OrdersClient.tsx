"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { OrderTable } from "@/components/admin/OrderTable";
import { adminJson } from "@/lib/admin-client";
import type { AdminOrderRow } from "@/lib/admin-types";
import { CARRIERS, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, carrierLabel } from "@/lib/shipping";
import type { PaymentProvider } from "@/lib/types";

const FILTERS = [
  { id: "", label: "ทั้งหมด" },
  { id: "payment_submitted", label: "รอตรวจสลิป" },
  { id: "pending_payment", label: "รอชำระ" },
  { id: "paid", label: "รอแพ็ก" },
  { id: "packing", label: "กำลังแพ็ก" },
  { id: "shipped", label: "กำลังส่ง" },
  { id: "delivered", label: "ถึงแล้ว" },
  { id: "cancelled", label: "ยกเลิก" },
  { id: "refunded", label: "คืนเงิน" },
];

const PAY_FILTERS: { id: "" | PaymentProvider; label: string }[] = [
  { id: "", label: "ทุกช่องทาง" },
  { id: "mock", label: PAYMENT_METHOD_LABEL.mock },
  { id: "bank_transfer", label: PAYMENT_METHOD_LABEL.bank_transfer },
  { id: "promptpay_qr", label: PAYMENT_METHOD_LABEL.promptpay_qr },
  { id: "payso", label: PAYMENT_METHOD_LABEL.payso },
  { id: "cash", label: PAYMENT_METHOD_LABEL.cash },
  { id: "shopee", label: PAYMENT_METHOD_LABEL.shopee },
  { id: "lazada", label: PAYMENT_METHOD_LABEL.lazada },
  { id: "claim", label: PAYMENT_METHOD_LABEL.claim },
];

function bangkokYmd(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function daysAgoYmd(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return bangkokYmd(d);
}

function monthStartYmd() {
  return `${bangkokYmd().slice(0, 7)}-01`;
}

export function OrdersClient() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") ?? "";
  const [status, setStatus] = useState(initialStatus);
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [carrier, setCarrier] = useState("");
  const [hasReceipt, setHasReceipt] = useState("");
  const [rows, setRows] = useState<AdminOrderRow[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(q.trim()), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("resource", "orders");
    if (status) p.set("status", status);
    if (qDebounced) p.set("q", qDebounced);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (paymentMethod) p.set("paymentMethod", paymentMethod);
    if (carrier) p.set("carrier", carrier);
    if (hasReceipt) p.set("hasReceipt", hasReceipt);
    return `/api/admin?${p.toString()}`;
  }, [status, qDebounced, from, to, paymentMethod, carrier, hasReceipt]);

  useEffect(() => {
    let ignore = false;
    setBusy(true);
    setError("");
    setSelectedIds([]);
    adminJson<{ orders: AdminOrderRow[] }>(query)
      .then((data) => {
        if (!ignore) setRows(data.orders);
      })
      .catch((e: Error) => {
        if (!ignore) setError(e.message);
      })
      .finally(() => {
        if (!ignore) setBusy(false);
      });
    return () => {
      ignore = true;
    };
  }, [query]);

  const rangeKey = from === bangkokYmd() && to === bangkokYmd()
    ? "today"
    : from === daysAgoYmd(6) && to === bangkokYmd()
      ? "7d"
      : from === monthStartYmd() && to === bangkokYmd()
        ? "month"
        : from || to
          ? "custom"
          : "all";

  function setRange(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
  }

  function openPrint(kind: "bills" | "labels") {
    if (selectedIds.length === 0) return;
    const ids = selectedIds.slice(0, 50).join(",");
    window.open(`/admin/orders/print/${kind}?ids=${encodeURIComponent(ids)}`, "_blank");
  }

  const selected = rows?.filter((r) => selectedIds.includes(r.order.id)) ?? [];
  const withBill = selected.filter((r) => r.document).length;
  const withoutBill = selected.length - withBill;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">ออเดอร์</h1>
          <p className="mt-1 text-sm text-muted">
            ค้นหา ติ๊กเลือก แล้วพิมพ์บิลหรือใบปะหน้าทีเดียว — กดแถวเพื่อเปิดรายละเอียด
          </p>
        </div>
        <Link href="/admin/issue" className="btn btn-secondary">
          พิมพ์บิล / ใบปะหน้า
        </Link>
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="order-q">
          ค้นหา
        </label>
        <input
          id="order-q"
          className="input max-w-xl"
          placeholder="เลขบิล / ชื่อ / เบอร์"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        {(
          [
            ["all", "ทุกช่วง", "", ""],
            ["today", "วันนี้", bangkokYmd(), bangkokYmd()],
            ["7d", "7 วัน", daysAgoYmd(6), bangkokYmd()],
            ["month", "เดือนนี้", monthStartYmd(), bangkokYmd()],
          ] as const
        ).map(([key, label, nextFrom, nextTo]) => (
          <button
            key={key}
            type="button"
            className={`h-11 shrink-0 rounded-full border px-3 text-sm ${
              rangeKey === key ? "border-navy bg-navy text-white" : "border-gray-200 bg-white"
            }`}
            onClick={() => setRange(nextFrom, nextTo)}
          >
            {label}
          </button>
        ))}
        <div className="min-w-[9.5rem] flex-1 sm:max-w-[11rem]">
          <label className="label" htmlFor="order-from">
            จากวันที่
          </label>
          <input
            id="order-from"
            type="date"
            className="input"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="min-w-[9.5rem] flex-1 sm:max-w-[11rem]">
          <label className="label" htmlFor="order-to">
            ถึงวันที่
          </label>
          <input
            id="order-to"
            type="date"
            className="input"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="order-pay">
            ช่องทางจ่าย
          </label>
          <select
            id="order-pay"
            className="input"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            {PAY_FILTERS.map((f) => (
              <option key={f.id || "all"} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="order-carrier">
            ขนส่ง
          </label>
          <select
            id="order-carrier"
            className="input"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
          >
            <option value="">ทุกขนส่ง</option>
            {CARRIERS.map((c) => (
              <option key={c} value={c}>
                {carrierLabel(c)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="order-bill">
            บิลเงินสด
          </label>
          <select
            id="order-bill"
            className="input"
            value={hasReceipt}
            onChange={(e) => setHasReceipt(e.target.value)}
          >
            <option value="">ทั้งหมด</option>
            <option value="yes">มีบิลแล้ว</option>
            <option value="no">ยังไม่มีบิล</option>
          </select>
        </div>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
              status === f.id ? "border-navy bg-navy text-white" : "border-gray-200 bg-white"
            }`}
            onClick={() => setStatus(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {selectedIds.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-navy/15 bg-white px-4 py-3">
          <p className="mr-auto text-sm font-semibold text-navy">เลือก {selectedIds.length} บิล</p>
          <button
            type="button"
            className="md:hidden text-sm font-semibold text-forge hover:underline"
            onClick={() => setSelectedIds(rows?.map((r) => r.order.id) ?? [])}
          >
            เลือกทั้งหมด
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => openPrint("bills")}>
            พิมพ์บิล {withBill ? `(${withBill})` : ""}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => openPrint("labels")}>
            พิมพ์ใบปะหน้า
          </button>
          <button type="button" className="text-sm text-muted hover:underline" onClick={() => setSelectedIds([])}>
            ยกเลิกเลือก
          </button>
          {withoutBill > 0 ? (
            <p className="w-full text-xs text-muted">มี {withoutBill} ใบที่ยังไม่มีบิลเงินสด — พิมพ์บิลจะข้ามรายการนั้น</p>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      {rows && rows.length > 0 && selectedIds.length === 0 ? (
        <label className="mt-4 flex items-center gap-2 text-sm md:hidden">
          <input
            type="checkbox"
            className="h-4 w-4 accent-forge"
            checked={false}
            onChange={(e) => {
              if (e.target.checked) setSelectedIds(rows.map((r) => r.order.id));
            }}
          />
          เลือกทั้งหมดในรายการนี้
        </label>
      ) : null}

      <div className="card mt-4 overflow-hidden">
        {rows === null || busy ? (
          <p className="px-4 py-8 text-center text-sm text-muted">กำลังโหลดออเดอร์…</p>
        ) : (
          <OrderTable
            rows={rows}
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
            empty={
              status
                ? `ไม่มีออเดอร์สถานะ${ORDER_STATUS_LABEL[status] ?? status}`
                : "ยังไม่มีออเดอร์ในช่วงที่เลือก"
            }
          />
        )}
      </div>
    </div>
  );
}
