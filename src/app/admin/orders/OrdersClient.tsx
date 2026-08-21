"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OrderTable } from "@/components/admin/OrderTable";
import { adminJson } from "@/lib/admin-client";
import type { AdminOrderRow } from "@/lib/admin-types";
import { ORDER_STATUS_LABEL } from "@/lib/shipping";

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

export function OrdersClient() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") ?? "";
  const [status, setStatus] = useState(initialStatus);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<AdminOrderRow[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("resource", "orders");
    if (status) p.set("status", status);
    if (q.trim()) p.set("q", q.trim());
    return `/api/admin?${p.toString()}`;
  }, [status, q]);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    let ignore = false;
    setBusy(true);
    setError("");
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">ออเดอร์</h1>
      <p className="mt-1 text-sm text-muted">ค้นหาจากเลขบิล ชื่อ หรือเบอร์โทร</p>

      <div className="mt-4">
        <label className="label" htmlFor="order-q">
          ค้นหา
        </label>
        <input
          id="order-q"
          className="input sm:max-w-xs"
          placeholder="เลขบิล / ชื่อ / เบอร์"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
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

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <div className="card mt-4 overflow-hidden">
        {rows === null || busy ? (
          <p className="px-4 py-8 text-center text-sm text-muted">กำลังโหลดออเดอร์…</p>
        ) : (
          <OrderTable
            rows={rows}
            empty={
              status
                ? `ไม่มีออเดอร์สถานะ${ORDER_STATUS_LABEL[status] ?? status}`
                : "ยังไม่มีออเดอร์"
            }
          />
        )}
      </div>
    </div>
  );
}
