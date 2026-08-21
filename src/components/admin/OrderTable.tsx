import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { AdminOrderRow } from "@/lib/admin-types";
import { PAYMENT_METHOD_LABEL } from "@/lib/shipping";
import { formatDateTime, formatTHB } from "@/lib/utils";

export function OrderTable({
  rows,
  empty,
}: {
  rows: AdminOrderRow[];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted">{empty}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="admin-table">
        <thead>
          <tr>
            <th>บิล</th>
            <th>ลูกค้า</th>
            <th>ยอด</th>
            <th>จ่าย</th>
            <th>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ order, payment }) => (
            <tr key={order.id}>
              <td>
                <Link href={`/admin/orders/${order.id}`} className="font-semibold text-navy hover:underline">
                  {order.number}
                </Link>
                <p className="text-xs text-muted">{formatDateTime(order.createdAt)}</p>
              </td>
              <td>
                <p>{order.address.fullName}</p>
                <p className="text-xs text-muted">{order.address.phone}</p>
              </td>
              <td className="whitespace-nowrap font-semibold">{formatTHB(order.grandTotal)}</td>
              <td className="text-xs">
                {PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}
                {payment?.status === "submitted" ? (
                  <p className="font-semibold text-forge">มีสลิป</p>
                ) : null}
              </td>
              <td>
                <StatusBadge status={order.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
