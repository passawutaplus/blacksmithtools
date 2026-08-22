import { describe, expect, it } from "vitest";
import { bulkInvoicePdfFilename, invoicePdfBasename, invoicePdfFilename } from "../invoice-filename";

describe("invoicePdfFilename", () => {
  it("uses Bangkok date and receipt number so files do not overwrite", () => {
    expect(invoicePdfBasename("2026-08-22T10:00:00.000+07:00")).toBe("blacksmith_invoice_2026-08-22");
    expect(invoicePdfFilename("2026-08-22T10:00:00.000+07:00", "RC-260822-0001")).toBe(
      "blacksmith_invoice_2026-08-22_RC-260822-0001.pdf",
    );
  });

  it("names a bulk download by count", () => {
    expect(
      bulkInvoicePdfFilename([
        { issuedAt: "2026-08-22T10:00:00.000+07:00", number: "RC-1" },
        { issuedAt: "2026-08-22T10:00:00.000+07:00", number: "RC-2" },
      ]),
    ).toBe("blacksmith_invoice_2026-08-22_2bills.pdf");
  });
});
