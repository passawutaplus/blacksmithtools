import { bangkokDateKey } from "./utils";

function safeDocPart(value?: string | null) {
  return (value ?? "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

/** Default download name: blacksmith_invoice_YYYY-MM-DD_RC-xxxx */
export function invoicePdfBasename(issuedAt?: string | null, documentNumber?: string | null) {
  const date = bangkokDateKey(issuedAt);
  const num = safeDocPart(documentNumber);
  return num ? `blacksmith_invoice_${date}_${num}` : `blacksmith_invoice_${date}`;
}

export function invoicePdfFilename(issuedAt?: string | null, documentNumber?: string | null) {
  return `${invoicePdfBasename(issuedAt, documentNumber)}.pdf`;
}

export function bulkInvoicePdfFilename(
  docs: Array<{ issuedAt?: string | null; number?: string | null }>,
) {
  if (docs.length === 1) {
    return invoicePdfFilename(docs[0]?.issuedAt, docs[0]?.number);
  }
  const date = bangkokDateKey(docs[0]?.issuedAt);
  return `blacksmith_invoice_${date}_${docs.length}bills.pdf`;
}
