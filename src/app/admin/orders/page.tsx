import { Suspense } from "react";
import { OrdersClient } from "./OrdersClient";

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">กำลังโหลดออเดอร์…</p>}>
      <OrdersClient />
    </Suspense>
  );
}
