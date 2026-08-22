import { bangkokDateKey } from "./utils";

/** Default Save-as / download name: blacksmith_invoice_YYYY-MM-DD */
export function invoicePdfBasename(issuedAt?: string | null) {
  return `blacksmith_invoice_${bangkokDateKey(issuedAt)}`;
}

export function invoicePdfFilename(issuedAt?: string | null) {
  return `${invoicePdfBasename(issuedAt)}.pdf`;
}
