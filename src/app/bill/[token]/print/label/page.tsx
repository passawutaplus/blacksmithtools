import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { ShippingLabel } from "@/components/ShippingLabel";
import { getOrderByToken } from "@/lib/db";
import "./label-print.css";

export const dynamic = "force-dynamic";

export default async function PrintShippingLabelPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const detail = await getOrderByToken(token);
  if (!detail) notFound();
  const { order, document, settings } = detail;

  return (
    <div className="shipping-label-root min-h-dvh bg-[#e8eaec] print:bg-white">
      <div className="no-print mx-auto flex max-w-[100mm] flex-col gap-3 px-4 py-4">
        <div className="flex flex-wrap gap-2">
          <PrintButton label="พิมพ์ใบปะหน้า" />
          {document ? (
            <Link href={`/bill/${token}/print`} className="btn btn-secondary" prefetch={false}>
              กลับพิมพ์บิล
            </Link>
          ) : (
            <Link href={`/bill/${token}`} className="btn btn-secondary">
              กลับบิลออเดอร์
            </Link>
          )}
        </div>
        <p className="text-xs leading-relaxed text-muted">
          ขนาด 100 × 100 มม. — ในหน้าพิมพ์เลือกกระดาษ 100mm × 100mm (Xprinter) ขอบ 0
        </p>
      </div>
      <div className="shipping-label-stage flex justify-center px-4 pb-10 print:p-0">
        <ShippingLabel order={order} settings={settings} />
      </div>
    </div>
  );
}
