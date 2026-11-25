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
  fdm: {
    label: "FDM · PETG",
    maxMm: 256,
    layerMm: { normal: 0.25, fine: 0.15 } as Record<Quality, number>,
    infill: 0.15,
    /** PETG density g/cm³. */
    density: 1.27,
    /** Outer wall thickness used to estimate shell weight (mm). */
    wallMm: 1.2,
    /** Shop rule (2026-11-25): FDM is charged by print time only, ฿70 per hour. */
    perGramTHB: 0 as number | null,
    perHourTHB: 70 as number | null,
    /** Minimum charge per order: anything under 1 hour is ฿70. */
    minOrderTHB: 70 as number | null,
    /**
     * Print-time model at 0.25 mm: hours = hPerCm2 × surface area + hPerCm3 × volume.
     * Walls dominate at 15% infill, so area matters more than weight (thin tall parts are slow).
     * Fitted to the shop's real Bambu Studio jobs (model printing time → billed price):
     *  - M12 holder 1h01m → ฿70 · M18 holder 1h28m → ฿105 · blower 1h58m → ฿140
     *  - M18 GEN3 stubby 8h05m → ฿560 · 6× M18 holder on one plate 8h44m → ฿630
     */
    timeModel: { hPerCm2: 0.00433, hPerCm3: 0.00402 },
    /** Fine 0.15 mm: measured ×1.47 time (9× M12 13h29m vs 9h10m), shop chose +35% (Passawut 2026-11-25). */
    qualityTimeFactor: { normal: 1, fine: 1.35 } as Record<Quality, number>,
    /** Bambu "total time" (print + prepare) is billed to the nearest step: 8h12m → 8 h = ฿560, 8h51m → 9 h = ฿630. */
    billStepHours: 0.5,
    /** Bambu Studio "prepare time" per plate (6m26s on the P2S). */
    setupHours: 6.43 / 60,
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
    minOrderTHB: null as number | null,
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
  if (longest < 1) return { level: "warn", text: "ขนาดเล็กผิดปกติ หน่วยไฟล์อาจไม่ใช่มิลลิเมตร ร้านเช็คให้", autoPrice: false };
  if (stats.volumeCm3 < 0.01) return { level: "error", text: "โมเดลไม่มีเนื้อ หรือผิวไม่ปิด คำนวณไม่ได้" };
  if (stats.triangles > PRINT_CONFIG.maxTrianglesAuto) {
    return { level: "warn", text: "ไฟล์ละเอียดเกินจำเป็น ร้านจะประเมินให้", autoPrice: false };
  }
  if (stats.openEdges || stats.nonManifoldEdges) {
    return { level: "warn", text: "ผิวโมเดลไม่สมบูรณ์เล็กน้อย ร้านซ่อมให้", autoPrice: true };
  }
  return { level: "ok", text: "ไฟล์ปกติ พิมพ์ได้" };
}

/** Shop rule: prices always end in 0 or 5 (nearest ฿5, at least ฿5). */
export function roundPrice(thb: number | null) {
  return thb == null || !Number.isFinite(thb) ? null : Math.max(5, Math.round(thb / 5) * 5);
}

export type PieceEstimate = { grams: number; hours: number; priceTHB: number | null };

/** Estimate for ONE piece. Price is null while the rates are not calibrated. */
export function estimatePiece(stats: MeshStats, process: Process, quality: Quality): PieceEstimate {
  if (process === "fdm") {
    const c = PRINT_CONFIG.fdm;
    const shellCm3 = Math.min(stats.volumeCm3, stats.areaCm2 * (c.wallMm / 10));
    const grams = (shellCm3 + (stats.volumeCm3 - shellCm3) * c.infill) * c.density;
    const hours = (c.timeModel.hPerCm2 * stats.areaCm2 + c.timeModel.hPerCm3 * stats.volumeCm3) * c.qualityTimeFactor[quality];
    const priceTHB =
      c.perGramTHB != null && c.perHourTHB != null ? grams * c.perGramTHB + hours * c.perHourTHB : null;
    return { grams, hours, priceTHB: roundPrice(priceTHB) };
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
  return { grams, hours, priceTHB: roundPrice(priceTHB) };
}

export type QuoteLine = { stats: MeshStats; qty: number };

/** Whole-order estimate. null fields = not calibrated yet. */
export function estimateOrder(lines: QuoteLine[], process: Process, quality: Quality) {
  if (!lines.length) return { printTHB: null, hours: null, pieces: 0, minApplied: false, lineTHB: [] as (number | null)[] };
  const pieces = lines.reduce((s, l) => s + l.qty, 0);
  const per = lines.map((l) => ({ l, e: estimatePiece(l.stats, process, quality) }));
  const prices = per.map(({ l, e }) => (e.priceTHB == null ? null : e.priceTHB * l.qty));
  let printTHB: number | null = prices.some((p) => p == null) ? null : prices.reduce<number>((s, p) => s + (p ?? 0), 0);
  if (printTHB != null && process === "fdm" && PRINT_CONFIG.fdm.perHourTHB != null) {
    const c = PRINT_CONFIG.fdm;
    const printHours = per.reduce((s, { l, e }) => s + e.hours * l.qty, 0);
    const grams = per.reduce((s, { l, e }) => s + e.grams * l.qty, 0);
    const billed = Math.round((printHours + c.setupHours) / c.billStepHours) * c.billStepHours;
    printTHB = billed * c.perHourTHB! + grams * (c.perGramTHB ?? 0);
  }
  const min = PRINT_CONFIG[process].minOrderTHB;
  const minApplied = printTHB != null && min != null && printTHB < min;
  if (printTHB != null && min != null) printTHB = Math.max(printTHB, min);

  let hours: number | null;
  if (process === "resin") {
    // One plate: everything prints together, so the tallest part sets the time.
    const tallest = Math.max(...per.map(({ e }) => e.hours));
    hours = Number.isFinite(tallest) ? tallest + PRINT_CONFIG.resin.prepHours : null;
  } else {
    const sum = per.reduce((s, { l, e }) => s + e.hours * l.qty, 0);
    hours = Number.isFinite(sum) ? sum + PRINT_CONFIG.fdm.setupHours : null;
  }
  const total = roundPrice(printTHB);
  return { printTHB: total, hours, pieces, minApplied, lineTHB: splitTotal(total, per.map(({ l, e }) => e.hours * l.qty)) };
}

/**
 * Share an order total across its lines by print time, each share a multiple of ฿5,
 * so the per-file prices the customer sees always add up to the order total.
 */
export function splitTotal(total: number | null, weights: number[]): (number | null)[] {
  if (total == null || !weights.length || weights.some((w) => !Number.isFinite(w))) return weights.map(() => null);
  const sum = weights.reduce((s, w) => s + w, 0) || 1;
  const out = weights.map((w) => Math.round((total * w) / sum / 5) * 5);
  const diff = total - out.reduce((s, v) => s + v, 0);
  const big = weights.indexOf(Math.max(...weights));
  out[big] += diff;
  return out;
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
