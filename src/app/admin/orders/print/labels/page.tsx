import Link from "next/link";
import { PrintButton } from "@/components/PrintButton";
import { ShippingLabel } from "@/components/ShippingLabel";
import { getOrdersAdminByIds, getSettings } from "@/lib/db";
import "./bulk-label-print.css";

export const dynamic = "force-dynamic";

export default async function BulkPrintLabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids: raw } = await searchParams;
  const ids = String(raw ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 50);
  const rows = await getOrdersAdminByIds(ids);
  const settings = await getSettings();

  return (
    <div className="shipping-label-root min-h-dvh bg-[#e8eaec] print:bg-white">
      <div className="no-print mx-auto flex max-w-[210mm] flex-col gap-3 px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <PrintButton label={`พิมพ์ใบปะหน้า ${rows.length} ใบ`} />
          <Link href="/admin/orders" className="btn btn-secondary">
            กลับรายการออเดอร์
          </Link>
        </div>
        <p className="text-xs text-muted">
          ขนาด 100 × 100 มม. — เลือกกระดาษ 100mm × 100mm ในหน้าพิมพ์ ขอบ 0
        </p>
        {rows.length === 0 ? <p className="text-sm text-muted">ยังไม่ได้เลือกออเดอร์</p> : null}
      </div>
      <div className="flex flex-col items-center gap-6 px-4 pb-10 print:gap-0 print:p-0">
        {rows.map(({ order }) => (
          <div key={order.id} className="bulk-label">
            <ShippingLabel order={order} settings={settings} />
          </div>
        ))}
      </div>
    </div>
  );
}
