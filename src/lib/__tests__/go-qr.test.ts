import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GO_QR_DOWNLOAD_NAME, GO_QR_URL } from "../go-qr";

describe("GO sticker QR", () => {
  it("always encodes the production portal, not localhost", () => {
    expect(GO_QR_URL).toBe("https://blacksmith-tools.com/go");
    expect(GO_QR_DOWNLOAD_NAME).toBe("blacksmith-go-qr.svg");
  });

  it("ships a vector SVG that encodes the production /go URL", () => {
    const svg = readFileSync(join(process.cwd(), "public/go/qr.svg"), "utf8");
    expect(svg).toContain(GO_QR_URL);
    expect(svg).toContain("<path");
    expect(svg).toContain('width="40mm"');
    expect(svg).toContain("viewBox=");
  });

  it("keeps the generator pointed at the same production URL", () => {
    const script = readFileSync(join(process.cwd(), "scripts/build-go-qr.mjs"), "utf8");
    expect(script).toContain(`"${GO_QR_URL}"`);
  });
});
