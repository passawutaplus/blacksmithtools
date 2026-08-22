"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { AdminOrderRow } from "@/lib/admin-types";
import { PAYMENT_METHOD_LABEL } from "@/lib/shipping";
import { formatDateTime, formatTHB } from "@/lib/utils";

function orderHref(id: string) {
  return `/admin/orders/${id}`;
}

export function OrderTable({
  rows,
  empty,
  selectedIds = [],
  onSelectedIdsChange,
}: {
  rows: AdminOrderRow[];
  empty: string;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
}) {
  const router = useRouter();
  const headerBox = useRef<HTMLInputElement>(null);
  const ids = rows.map((r) => r.order.id);
  const selected = new Set(selectedIds);
  const selectable = Boolean(onSelectedIdsChange);
  const allOn = selectable && ids.length > 0 && ids.every((id) => selected.has(id));
  const someOn = selectable && ids.some((id) => selected.has(id));

  useEffect(() => {
    if (headerBox.current) headerBox.current.indeterminate = someOn && !allOn;
  }, [allOn, someOn]);

  function toggle(id: string, on: boolean) {
    if (!onSelectedIdsChange) return;
    const next = new Set(selected);
    if (on) next.add(id);
    else next.delete(id);
    onSelectedIdsChange([...next]);
  }

  function toggleAll(on: boolean) {
    onSelectedIdsChange?.(on ? ids : []);
  }

  if (rows.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted">{empty}</p>;
  }

  return (
    <>
      <ul className="divide-y md:hidden">
        {rows.map(({ order, payment }) => (
          <li key={order.id} className="flex items-start gap-2 px-3 py-3">
            {selectable ? (
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-forge"
                checked={selected.has(order.id)}
                onChange={(e) => toggle(order.id, e.target.checked)}
                aria-label={`เลือก ${order.number}`}
              />
            ) : null}
            <Link href={orderHref(order.id)} className="min-w-0 flex-1 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-latin font-semibold tracking-wide text-navy">{order.number}</p>
                  <p className="mt-0.5 text-xs text-muted">{formatDateTime(order.createdAt)}</p>
                  <p className="mt-1 truncate text-sm">{order.address.fullName}</p>
                  <p className="text-xs text-muted">{order.address.phone}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums">{formatTHB(order.grandTotal)}</p>
                  <p className="mt-1 text-xs text-muted">
                    {PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}
                    {payment?.status === "submitted" ? " · มีสลิป" : ""}
                  </p>
                  <div className="mt-2 flex justify-end">
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              </div>
              <p className="mt-2 text-sm font-semibold text-forge">เปิดออเดอร์ →</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="admin-table">
          <thead>
            <tr>
              {selectable ? (
                <th className="w-10">
                  <input
                    ref={headerBox}
                    type="checkbox"
                    className="h-4 w-4 accent-forge"
                    checked={allOn}
                    onChange={(e) => toggleAll(e.target.checked)}
                    aria-label="เลือกทั้งหมด"
                  />
                </th>
              ) : null}
              <th>บิล</th>
              <th>ลูกค้า</th>
              <th>ยอด</th>
              <th>จ่าย</th>
              <th>สถานะ</th>
              <th className="w-px">
                <span className="sr-only">เปิด</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ order, payment }) => (
              <tr
                key={order.id}
                className="cursor-pointer"
                onClick={() => router.push(orderHref(order.id))}
              >
                {selectable ? (
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-forge"
                      checked={selected.has(order.id)}
                      onChange={(e) => toggle(order.id, e.target.checked)}
                      aria-label={`เลือก ${order.number}`}
                    />
                  </td>
                ) : null}
                <td>
                  <span className="font-latin font-semibold tracking-wide text-navy underline decoration-navy/30 underline-offset-2">
                    {order.number}
                  </span>
                  <p className="text-xs text-muted">{formatDateTime(order.createdAt)}</p>
                </td>
                <td>
                  <p>{order.address.fullName}</p>
                  <p className="text-xs text-muted">{order.address.phone}</p>
                </td>
                <td className="whitespace-nowrap font-semibold tabular-nums">{formatTHB(order.grandTotal)}</td>
                <td className="text-xs">
                  {PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}
                  {payment?.status === "submitted" ? (
                    <p className="font-semibold text-forge">มีสลิป</p>
                  ) : null}
                </td>
                <td>
                  <StatusBadge status={order.status} />
                </td>
                <td>
                  <Link
                    href={orderHref(order.id)}
                    className="btn btn-sm border-navy bg-white text-navy hover:bg-steel"
                    onClick={(e) => e.stopPropagation()}
                  >
                    เปิด
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
