/**
 * Writes public/go/qr.svg — scan target is always production /go.
 * Usage: npm run qr:go
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderSVG } from "uqr";

const GO_QR_URL = "https://blacksmith-tools.com/go";

const raw = renderSVG(GO_QR_URL, {
  ecc: "H",
  border: 4,
  pixelSize: 1,
  whiteColor: "#ffffff",
  blackColor: "#111111",
});

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Product sticker QR. Encodes ${GO_QR_URL} -->
${raw.replace(
  /<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="([^"]+)">/,
  `<svg xmlns="http://www.w3.org/2000/svg" width="40mm" height="40mm" viewBox="$1" shape-rendering="crispEdges" role="img" aria-label="QR code to ${GO_QR_URL}">
<title>BlackSmith Tools</title>
<desc>${GO_QR_URL}</desc>`,
)}
`;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "go");
const outFile = join(outDir, "qr.svg");

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, svg, "utf8");
console.log(`wrote ${outFile}`);
console.log(`encodes ${GO_QR_URL}`);
