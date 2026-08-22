import Link from "next/link";
import type { Metadata } from "next";
import { CashReceipt } from "@/components/CashReceipt";
import { DownloadPdfButton } from "@/components/DownloadPdfButton";
import { PrintButton } from "@/components/PrintButton";
import { getOrdersAdminByIds, getSettings } from "@/lib/db";
import { invoicePdfBasename, invoicePdfFilename } from "@/lib/invoice-filename";
import "@/components/receipt-print.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: invoicePdfBasename() } };
}

export default async function BulkPrintBillsPage({
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
  const printable = rows.filter((row) => row.document);
  const skipped = rows.length - printable.length;
  const pdfName = invoicePdfFilename();

  return (
    <div className="a4-print-root min-h-dvh bg-[#e8eaec] print:bg-white">
      <div className="no-print mx-auto flex max-w-[210mm] flex-col gap-3 px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <PrintButton label={`พิมพ์บิล ${printable.length} ใบ`} filename={pdfName} />
          <DownloadPdfButton filename={pdfName} />
          <Link href="/admin/orders" className="btn btn-secondary">
            กลับรายการออเดอร์
          </Link>
        </div>
        {skipped > 0 ? (
          <p className="text-xs text-muted">ข้าม {skipped} บิลที่ยังไม่มีบิลเงินสด</p>
        ) : null}
        {printable.length === 0 ? (
          <p className="text-sm text-muted">ไม่มีบิลเงินสดให้พิมพ์ — จ่ายเงินก่อนระบบจะออกบิล</p>
        ) : (
          <p className="text-xs text-muted">กระดาษ A4 · ชื่อไฟล์ {pdfName}</p>
        )}
      </div>
      {printable.map(({ order, document }) => (
        <div key={order.id} className="a4-sheet mt-6 print:mt-0" data-a4-invoice>
          <CashReceipt order={order} document={document!} settings={settings} />
        </div>
      ))}
    </div>
  );
}
