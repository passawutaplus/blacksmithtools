import type { MeshStats } from "./mesh";

/**
 * Instant-quote settings. Rates left as `null` are not calibrated yet:
 * the tool then shows "—" instead of inventing a price.
 * Fill them from the shop's real jobs (file + sale price + print time).
 */
export type Process = "fdm" | "resin";
export type Quality = "normal" | "fine";

export const PRINT_CONFIG = {
  shippingTHB: 50,
  /** Parcel shipping is free when the print total reaches this (THB). */
  freeShipFromTHB: 1000,
  /** Minimum charge per order (THB) — null until set. */
  minOrderTHB: null as number | null,
  fdm: {
    label: "FDM · PETG",
    maxMm: 256,
    layerMm: { normal: 0.25, fine: 0.15 } as Record<Quality, number>,
    infill: 0.15,
    /** PETG density g/cm³. */
    density: 1.27,
    /** Outer wall thickness used to estimate shell weight (mm). */
    wallMm: 1.2,
    /** THB per gram of printed part — null until calibrated. */
    perGramTHB: null as number | null,
    /** THB per machine hour — null until calibrated. */
    perHourTHB: null as number | null,
    /** Grams the printer lays down per hour at each layer height — null until calibrated. */
    gramsPerHour: { normal: null, fine: null } as Record<Quality, number | null>,
    /** Fixed setup time per plate (hours). */
    setupHours: 0.25,
  },
  resin: {
    label: "Resin SLA/DLP",
    /** Placeholder until the shop gives its resin printer's build size. */
    maxMm: 200,
    /** Placeholder layer heights until confirmed. */
    layerMm: { normal: 0.05, fine: 0.03 } as Record<Quality, number>,
    density: 1.1,
    /** Resin used incl. supports ÷ part volume — null until calibrated from slicer data. */
    supportFactor: null as number | null,
    perGramTHB: null as number | null,
    perHourTHB: null as number | null,
    /** Exposure + lift per layer (seconds) — null until calibrated. */
    secPerLayer: null as number | null,
    prepHours: 0.33,
  },
  /** Above this, the file is too dense to price automatically. */
  maxTrianglesAuto: 1_500_000,
};

export type FileStatus =
  | { level: "ok"; text: string }
  | { level: "warn"; text: string; autoPrice: boolean }
  | { level: "error"; text: string };

export function maxMm(process: Process) {
  return PRINT_CONFIG[process].maxMm;
}

export function fileStatus(stats: MeshStats | null, process: Process, readError?: string, cad?: boolean): FileStatus {
  if (cad && !readError) return { level: "warn", text: "ไฟล์ STEP ร้านเปิดตรวจและประเมินให้", autoPrice: false };
  if (readError || !stats) return { level: "error", text: readError || "อ่านไฟล์ไม่ได้ ไฟล์อาจเสีย" };
  const longest = Math.max(...stats.size);
  const limit = maxMm(process);
  if (longest > limit) {
    return {
      level: "error",
      text: `ใหญ่เกิน ${limit} มม. (ยาว ${longest.toFixed(0)} มม.) แบ่งชิ้นหรือให้ร้านดู`,
    };
  }
  if (stats.volumeCm3 < 0.01) return { level: "error", text: "โมเดลไม่มีเนื้อ หรือผิวไม่ปิด คำนวณไม่ได้" };
  if (longest < 1) return { level: "warn", text: "ขนาดเล็กผิดปกติ หน่วยไฟล์อาจไม่ใช่มิลลิเมตร", autoPrice: false };
  if (stats.triangles > PRINT_CONFIG.maxTrianglesAuto) {
    return { level: "warn", text: "ไฟล์ละเอียดเกินจำเป็น ร้านจะประเมินให้", autoPrice: false };
  }
  if (stats.openEdges || stats.nonManifoldEdges) {
    return { level: "warn", text: "ผิวโมเดลไม่สมบูรณ์เล็กน้อย ร้านซ่อมให้", autoPrice: true };
  }
  return { level: "ok", text: "ไฟล์ปกติ พิมพ์ได้" };
}

export type PieceEstimate = { grams: number; hours: number; priceTHB: number | null };

/** Estimate for ONE piece. Price is null while the rates are not calibrated. */
export function estimatePiece(stats: MeshStats, process: Process, quality: Quality): PieceEstimate {
  if (process === "fdm") {
    const c = PRINT_CONFIG.fdm;
    const shellCm3 = Math.min(stats.volumeCm3, stats.areaCm2 * (c.wallMm / 10));
    const grams = (shellCm3 + (stats.volumeCm3 - shellCm3) * c.infill) * c.density;
    const gph = c.gramsPerHour[quality];
    const hours = gph ? grams / gph : NaN;
    const priceTHB =
      c.perGramTHB != null && c.perHourTHB != null && gph
        ? grams * c.perGramTHB + hours * c.perHourTHB
        : null;
    return { grams, hours, priceTHB };
  }
  const c = PRINT_CONFIG.resin;
  const grams = stats.volumeCm3 * (c.supportFactor ?? NaN) * c.density;
  // Resin cures a whole layer at once: time depends on height, not volume.
  const layers = stats.size[2] / c.layerMm[quality];
  const hours = c.secPerLayer != null ? (layers * c.secPerLayer) / 3600 : NaN;
  const priceTHB =
    c.perGramTHB != null && c.perHourTHB != null && c.supportFactor != null && c.secPerLayer != null
      ? grams * c.perGramTHB + hours * c.perHourTHB
      : null;
  return { grams, hours, priceTHB };
}

export type QuoteLine = { stats: MeshStats; qty: number };

/** Whole-order estimate. null fields = not calibrated yet. */
export function estimateOrder(lines: QuoteLine[], process: Process, quality: Quality) {
  if (!lines.length) return { printTHB: null, hours: null, pieces: 0 };
  const pieces = lines.reduce((s, l) => s + l.qty, 0);
  const per = lines.map((l) => ({ l, e: estimatePiece(l.stats, process, quality) }));
  const prices = per.map(({ l, e }) => (e.priceTHB == null ? null : e.priceTHB * l.qty));
  let printTHB: number | null = prices.some((p) => p == null) ? null : prices.reduce<number>((s, p) => s + (p ?? 0), 0);
  if (printTHB != null && PRINT_CONFIG.minOrderTHB != null) printTHB = Math.max(printTHB, PRINT_CONFIG.minOrderTHB);

  let hours: number | null;
  if (process === "resin") {
    // One plate: everything prints together, so the tallest part sets the time.
    const tallest = Math.max(...per.map(({ e }) => e.hours));
    hours = Number.isFinite(tallest) ? tallest + PRINT_CONFIG.resin.prepHours : null;
  } else {
    const sum = per.reduce((s, { l, e }) => s + e.hours * l.qty, 0);
    hours = Number.isFinite(sum) ? sum + PRINT_CONFIG.fdm.setupHours : null;
  }
  return { printTHB: printTHB == null ? null : Math.ceil(printTHB), hours, pieces };
}

export function formatHours(h: number | null) {
  if (h == null || !Number.isFinite(h)) return "—";
  const total = Math.max(1, Math.round(h * 60));
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return hh ? `${hh} ชม.${mm ? ` ${mm} นาที` : ""}` : `${mm} นาที`;
}

/** Parcel fee for an order: free at/above `freeShipFromTHB`, otherwise the flat fee. Unknown total = flat fee. */
export function parcelFee(printTHB: number | null) {
  return printTHB != null && printTHB >= PRINT_CONFIG.freeShipFromTHB ? 0 : PRINT_CONFIG.shippingTHB;
}
