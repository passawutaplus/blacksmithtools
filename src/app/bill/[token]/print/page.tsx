import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CashReceipt } from "@/components/CashReceipt";
import { DownloadPdfButton } from "@/components/DownloadPdfButton";
import { PrintButton } from "@/components/PrintButton";
import { getOrderByToken } from "@/lib/db";
import { invoicePdfBasename, invoicePdfFilename } from "@/lib/invoice-filename";
import "@/components/receipt-print.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const detail = await getOrderByToken(token);
  const issued = detail?.document?.issuedAt || detail?.order.paidAt || detail?.order.createdAt;
  return { title: { absolute: invoicePdfBasename(issued) } };
}

export default async function PrintReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const detail = await getOrderByToken(token);
  if (!detail?.document) notFound();
  const { order, document, settings } = detail;
  const issued = document.issuedAt || order.paidAt || order.createdAt;
  const pdfName = invoicePdfFilename(issued);

  return (
    <div className="a4-print-root min-h-dvh bg-[#e8eaec] print:bg-white">
      <div className="no-print mx-auto flex max-w-[210mm] flex-col gap-2 px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <PrintButton label="พิมพ์บิลเงินสด" token={token} filename={pdfName} />
          <DownloadPdfButton filename={pdfName} />
          <Link href={`/bill/${token}/print/label`} className="btn btn-secondary" prefetch={false}>
            พิมพ์ใบปะหน้า 100×100
          </Link>
          <Link href={`/bill/${token}`} className="btn btn-secondary">
            กลับบิลออเดอร์
          </Link>
        </div>
        <p className="text-xs text-muted">กระดาษ A4 · ชื่อไฟล์ {pdfName}</p>
      </div>
      <div className="a4-sheet" data-a4-invoice>
        <CashReceipt order={order} document={document} settings={settings} />
      </div>
    </div>
  );
}
