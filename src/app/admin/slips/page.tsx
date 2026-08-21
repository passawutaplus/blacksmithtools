"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { adminJson } from "@/lib/admin-client";
import type { AdminOrderRow } from "@/lib/admin-types";
import { formatTHB } from "@/lib/utils";

export default function AdminSlipsPage() {
  const [rows, setRows] = useState<AdminOrderRow[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});

  async function load() {
    setError("");
    try {
      const data = await adminJson<{ slips: AdminOrderRow[] }>("/api/admin?resource=slips");
      setRows(data.slips);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function act(orderId: string, action: "confirm_payment" | "reject_slip") {
    setBusyId(orderId);
    setError("");
    try {
      await adminJson("/api/admin", {
        method: "POST",
        body: JSON.stringify({
          action,
          orderId,
          reason: reasons[orderId] ?? "",
        }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusyId("");
    }
  }

  if (!rows && !error) return <p className="text-sm text-muted">กำลังโหลดคิวสลิป…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">สลิปรอตรวจ</h1>
      <p className="mt-1 text-sm text-muted">ยืนยันเมื่อยอดและบัญชีตรง — ไม่ผ่านแล้วลูกค้าอัปใหม่ได้</p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      {rows && rows.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-sm text-muted">
          ไม่มีสลิปรอตรวจ
          <div className="mt-3">
            <Link href="/admin/orders" className="font-semibold text-forge hover:underline">
              ไปหน้าออเดอร์
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {rows?.map(({ order, payment }) => {
            const src = payment?.slipPath
              ? `/api/admin/slip?file=${encodeURIComponent(payment.slipPath)}`
              : "";
            const pdf = payment?.slipPath?.toLowerCase().endsWith(".pdf");
            return (
              <article key={order.id} className="card overflow-hidden">
                <div className="flex items-start justify-between gap-2 border-b px-4 py-3">
                  <div>
                    <Link href={`/admin/orders/${order.id}`} className="font-bold text-navy hover:underline">
                      {order.number}
                    </Link>
                    <p className="text-sm">
                      {order.address.fullName} · {order.address.phone}
                    </p>
                    <p className="text-lg font-bold text-forge">{formatTHB(order.grandTotal)}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="bg-steel p-3">
                  {src && !pdf ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={`สลิปบิล ${order.number}`} className="mx-auto max-h-80 object-contain" />
                  ) : src ? (
                    <a href={src} target="_blank" rel="noreferrer" className="text-sm underline">
                      เปิด PDF
                    </a>
                  ) : (
                    <p className="text-sm text-muted">ไม่มีไฟล์</p>
                  )}
                </div>
                <div className="space-y-2 p-4">
                  <label className="label" htmlFor={`r-${order.id}`}>
                    เหตุผลถ้าไม่ผ่าน
                  </label>
                  <input
                    id={`r-${order.id}`}
                    className="input"
                    value={reasons[order.id] ?? ""}
                    onChange={(e) => setReasons((s) => ({ ...s, [order.id]: e.target.value }))}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busyId === order.id}
                      onClick={() => void act(order.id, "confirm_payment")}
                    >
                      ยืนยันชำระ
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={busyId === order.id}
                      onClick={() => void act(order.id, "reject_slip")}
                    >
                      ไม่ผ่าน
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
