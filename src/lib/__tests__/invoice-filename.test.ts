import { describe, expect, it } from "vitest";
import { invoicePdfBasename, invoicePdfFilename } from "../invoice-filename";

describe("invoicePdfFilename", () => {
  it("uses Bangkok calendar date after blacksmith_invoice_", () => {
    expect(invoicePdfBasename("2026-08-22T10:00:00.000+07:00")).toBe("blacksmith_invoice_2026-08-22");
    expect(invoicePdfFilename("2026-08-22T10:00:00.000+07:00")).toBe("blacksmith_invoice_2026-08-22.pdf");
  });
});
