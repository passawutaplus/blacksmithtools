"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OrderTable } from "@/components/admin/OrderTable";
import { adminJson } from "@/lib/admin-client";
import type { AdminDashboard } from "@/lib/admin-types";
import { formatTHB } from "@/lib/utils";

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminJson<AdminDashboard>("/api/admin?resource=dashboard")
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }
  if (!data) {
    return <p className="text-sm text-muted">กำลังโหลดภาพรวม…</p>;
  }

  const cards = [
    {
      label: "ขายส่งรอติดต่อ",
      value: data.counts.wholesaleNew,
      href: "/admin/inquiries",
      warn: data.counts.wholesaleNew > 0,
    },
    {
      label: "รอตรวจสลิป",
      value: data.counts.awaitingSlip,
      href: "/admin/slips",
      warn: data.counts.awaitingSlip > 0,
    },
    { label: "รอชำระ", value: data.counts.pendingPayment, href: "/admin/orders?status=pending_payment" },
    { label: "รอแพ็ก", value: data.counts.paid, href: "/admin/orders?status=paid" },
    { label: "กำลังส่ง", value: data.counts.shipped, href: "/admin/orders?status=shipped" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">ภาพรวม</h1>
      <p className="mt-1 text-sm text-muted">
        ชำระเงิน: {data.paymentsLive ? "รับเงินจริง" : "โหมดทดลอง"} · ออเดอร์ทั้งหมด {data.orderCount} ใบ
      </p>
      <p className="mt-3">
        <Link href="/admin/issue" className="btn btn-primary">
          พิมพ์บิล / ใบปะหน้า
        </Link>
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`card p-4 hover:border-navy/30 ${c.warn ? "ring-1 ring-forge/40" : ""}`}
          >
            <p className="text-xs text-muted">{c.label}</p>
            <p className={`mt-1 text-2xl font-bold ${c.warn ? "text-forge" : "text-navy"}`}>{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <p className="text-xs text-muted">ยอดวันนี้</p>
          <p className="mt-1 text-xl font-bold text-navy">{formatTHB(data.todayRevenue)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted">ยอดเดือนนี้</p>
          <p className="mt-1 text-xl font-bold text-navy">{formatTHB(data.monthRevenue)}</p>
        </div>
      </div>

      <section className="card mt-8 overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold text-navy">ออเดอร์ล่าสุด</h2>
          <Link href="/admin/orders" className="text-sm font-semibold text-forge hover:underline">
            ดูทั้งหมด
          </Link>
        </div>
        <OrderTable rows={data.recent} empty="ยังไม่มีออเดอร์ — เมื่อมีลูกค้าสั่ง จะโชว์ที่นี่" />
      </section>

      <section className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold text-navy">ขายส่งล่าสุด</h2>
          <Link href="/admin/inquiries" className="text-sm font-semibold text-forge hover:underline">
            ดูทั้งหมด
          </Link>
        </div>
        {data.recentWholesale.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">ยังไม่มีใบสมัครขายส่ง</p>
        ) : (
          <ul className="divide-y">
            {data.recentWholesale.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <Link href="/admin/inquiries" className="font-medium hover:underline">
                    {lead.shopName}
                  </Link>
                  <p className="text-xs text-muted">
                    {lead.province} · {lead.contact}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted">
                  {lead.status === "new" ? "รอติดต่อ" : lead.status === "contacted" ? "ติดต่อแล้ว" : "ปิดงาน"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold text-navy">สินค้าใกล้หมด</h2>
          <Link href="/admin/products" className="text-sm font-semibold text-forge hover:underline">
            จัดการสต็อก
          </Link>
        </div>
        {data.lowStock.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">สต็อกยังไม่ต่ำ</p>
        ) : (
          <ul className="divide-y">
            {data.lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">
                  {p.nameTh}
                </Link>
                <span className={p.stock <= 0 ? "font-semibold text-red-700" : "text-muted"}>
                  คงเหลือ {p.stock}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
