/**
 * ส่งออกแผ่นผลคำนวณ / ใบสั่งของ เป็นไฟล์: PNG · PDF (A4) · ส่งรูปเข้าแชต
 * ส่วนนี้แตะ DOM (canvas, ฟอนต์, ดาวน์โหลด) — เลย์เอาต์ล้วนอยู่ใน sheet.ts
 * ทุกฟังก์ชันคืนผลให้หน้าจอบอกผู้ใช้ได้ว่าสำเร็จหรือไม่ ห้ามล้มเหลวเงียบ
 */
import { BRAND_CREDIT, BRAND_CTA, DEFAULT_BRAND_STYLE, EXPORT_ASSETS, GO_URL_LABEL, type ExportAssetKey } from "./brand";
import { C, W, type Painter, type TextMeasurer } from "./canvas-text";
import { buildSheet, layoutA4, paintPage, paintSheet, sheetHeight, type SheetDoc } from "./sheet";

/**
 * ชื่อไฟล์: blacksmith-<รหัสเครื่องมือ>[-order]-YYYY-MM-DD.<นามสกุล> เช่น blacksmith-tile-job-order-2026-11-25.pdf
 * ใช้รหัสอังกฤษของเครื่องมือ (ไม่ใช่ชื่อไทย) — ชื่อไฟล์ภาษาไทยในแอตทริบิวต์ download ถูกเบราว์เซอร์บางตัวทิ้งทั้งชื่อ
 * และอ่านไม่ออกเมื่อส่งต่อข้ามแอป/ข้ามเครื่อง
 */
export function exportFileName(
  toolSlug: string,
  date: Date = new Date(),
  kind: "result" | "order" = "result",
  ext: "png" | "pdf" = "png",
): string {
  const slug =
    toolSlug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "result";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `blacksmith-${slug}${kind === "order" ? "-order" : ""}-${y}-${m}-${d}.${ext}`;
}

/** ชื่อไฟล์รูปผลคำนวณ (คงไว้ให้โค้ดเดิมเรียกได้) */
export function resultFileName(toolSlug: string, date: Date = new Date()): string {
  return exportFileName(toolSlug, date, "result", "png");
}

function docFileName(doc: SheetDoc, ext: "png" | "pdf"): string {
  return exportFileName(doc.fileSlug ?? "", doc.date, doc.kind === "order" ? "order" : "result", ext);
}

/* ───────── โลโก้ / QR ───────── */

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

/** โหลดภาพจากโดเมนเดียวกัน (canvas ไม่ถูก taint) — โหลดไม่ได้คืน null แล้วแผ่นใช้ข้อความสำรองแทน */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  let pending = imageCache.get(src);
  if (!pending) {
    pending = new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => {
        imageCache.delete(src); // เน็ตหลุดชั่วคราว: ครั้งหน้าลองใหม่ได้
        resolve(null);
      };
      img.src = src;
    });
    imageCache.set(src, pending);
  }
  return pending;
}

function assetKeysFor(doc: SheetDoc): ExportAssetKey[] {
  const style = doc.brandStyle ?? DEFAULT_BRAND_STYLE;
  return style === "watermark" ? ["logoOnDark", "logoOnLight", "qrGo", "markNavy"] : ["logoOnDark", "qrGo"];
}

/**
 * โหลดโลโก้/QR รอไว้ก่อนผู้ใช้กดส่งออก
 * สำคัญกับ "ส่งรูปเข้าแชต": navigator.share ต้องถูกเรียกไม่นานหลังการแตะ ถ้ามัวรอโหลดรูป เบราว์เซอร์จะปฏิเสธ
 */
export function preloadExportAssets(): void {
  if (typeof Image === "undefined") return;
  for (const key of Object.keys(EXPORT_ASSETS) as ExportAssetKey[]) void loadImage(EXPORT_ASSETS[key].src);
}

async function loadAssets(doc: SheetDoc): Promise<NonNullable<Painter["assets"]>> {
  const keys = assetKeysFor(doc);
  const images = await Promise.all(keys.map((key) => loadImage(EXPORT_ASSETS[key].src)));
  const assets: NonNullable<Painter["assets"]> = {};
  keys.forEach((key, i) => {
    const image = images[i];
    if (image) assets[key] = image;
  });
  return assets;
}

/* ───────── ฟอนต์ ───────── */

function fontFamilies(): { thai: string; latin: string } {
  const body = getComputedStyle(document.body).fontFamily || "sans-serif";
  const outfit = getComputedStyle(document.documentElement).getPropertyValue("--font-outfit").trim();
  return { thai: body, latin: outfit ? `${outfit}, ${body}` : body };
}

async function ensureFonts(thai: string, latin: string, sample: string): Promise<void> {
  if (!document.fonts?.load) return;
  const loads = [400, 500, 600, 700].map((w) => document.fonts.load(`${w} 16px ${thai}`, sample));
  loads.push(document.fonts.load(`500 13px ${latin}`, GO_URL_LABEL));
  // ฟอนต์โหลดไม่ทันก็วาดด้วยฟอนต์สำรอง ดีกว่าค้างไม่ได้รูป
  await Promise.race([Promise.allSettled(loads), new Promise((resolve) => setTimeout(resolve, 1500))]);
}

function sampleText(doc: SheetDoc): string {
  const parts: (string | undefined)[] = [doc.title, doc.subtitle, doc.disclaimer, BRAND_CREDIT, BRAND_CTA];
  for (const input of doc.inputs ?? []) parts.push(input.label, input.value);
  if (doc.kind === "order") {
    parts.push(doc.jobName, doc.customer);
    for (const item of doc.items) parts.push(item.name, item.detail, item.qty, item.unit);
  } else {
    parts.push(doc.headline, doc.tip);
    for (const row of doc.rows) parts.push(row.label, row.value);
  }
  return parts.filter(Boolean).join(" ");
}

/* ───────── วาดลง canvas ───────── */

/** พื้นที่ canvas สูงสุดที่ iOS Safari ยอมให้ (16.7 ล้านจุด) — แผ่นยาวมากจะลดความละเอียดลงแทนที่จะได้รูปว่าง */
const MAX_CANVAS_AREA = 16_000_000;

async function preparePainter(doc: SheetDoc): Promise<Omit<Painter, "ctx"> | null> {
  if (typeof document === "undefined") return null;
  const { thai, latin } = fontFamilies();
  const [assets] = await Promise.all([loadAssets(doc), ensureFonts(thai, latin, sampleText(doc))]);
  const scratch = document.createElement("canvas").getContext("2d");
  if (!scratch) return null;
  const measure: TextMeasurer = (text, font) => {
    scratch.font = font;
    return scratch.measureText(text).width;
  };
  return { measure, thai, latin, assets };
}

function makeCanvas(
  width: number,
  height: number,
  scale: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);
  ctx.fillStyle = C.white;
  ctx.fillRect(0, 0, width, height);
  return { canvas, ctx };
}

/** วาดแผ่นเป็นรูปยาวรูปเดียว (กว้าง 720 จุด ความละเอียด 2 เท่า = 1440px) */
export async function renderSheetCanvas(doc: SheetDoc): Promise<HTMLCanvasElement | null> {
  const base = await preparePainter(doc);
  if (!base) return null;
  const sheet = buildSheet({ ...base, ctx: null }, doc);
  const height = sheetHeight(sheet);
  const scale = Math.min(2, Math.sqrt(MAX_CANVAS_AREA / (W * height)));
  const made = makeCanvas(W, height, scale);
  if (!made) return null;
  paintSheet({ ...base, ctx: made.ctx }, sheet);
  return made.canvas;
}

/** วาดแผ่นเป็นหน้า A4 ทีละหน้า (ความละเอียด 2 เท่าของเลย์เอาต์ ≈ 210–250 dpi บนกระดาษ) */
export async function renderSheetPages(doc: SheetDoc): Promise<HTMLCanvasElement[] | null> {
  const base = await preparePainter(doc);
  if (!base) return null;
  const { width, pageH, sheet, pages } = layoutA4({ ...base, ctx: null }, doc);
  const canvases: HTMLCanvasElement[] = [];
  for (let i = 0; i < pages.length; i++) {
    const made = makeCanvas(width, pageH, 2);
    if (!made) return null;
    paintPage({ ...base, width, ctx: made.ctx }, sheet, pages, i, pageH);
    canvases.push(made.canvas);
  }
  return canvases;
}

/* ───────── บันทึก / ส่งต่อ ───────── */

function saveBlob(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.download = filename;
  a.href = href;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/** บันทึกรูป PNG ลงเครื่อง — คืน false ถ้าสร้างรูปหรือสั่งบันทึกไม่ได้ */
export async function downloadSheetPng(doc: SheetDoc): Promise<boolean> {
  try {
    const canvas = await renderSheetCanvas(doc);
    const blob = canvas ? await canvasBlob(canvas) : null;
    if (!blob) return false;
    saveBlob(blob, docFileName(doc, "png"));
    return true;
  } catch {
    return false;
  }
}

/**
 * บันทึก PDF A4 แนวตั้ง — วางรูปที่วาดจาก canvas ลงทีละหน้า ตัวหนังสือไทยจึงออกมาเหมือน PNG ทุกจุด
 * (ไม่ต้องฝังฟอนต์ไทยใน PDF) jsPDF โหลดเมื่อกดเท่านั้น ไม่ถ่วงหน้าเครื่องมือ
 */
export async function downloadSheetPdf(doc: SheetDoc): Promise<boolean> {
  try {
    const [pages, { jsPDF }] = await Promise.all([renderSheetPages(doc), import("jspdf")]);
    if (!pages?.length) return false;
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "p", compress: true });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const filename = docFileName(doc, "pdf");
    pdf.setProperties({ title: filename.replace(/\.pdf$/, ""), creator: `BlackSmith Tools - ${GO_URL_LABEL}` });
    pages.forEach((canvas, i) => {
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pageW, pageH, undefined, "FAST");
    });
    saveBlob(pdf.output("blob"), filename);
    return true;
  } catch {
    return false;
  }
}

/** เครื่องนี้ส่ง "ไฟล์รูป" ผ่านหน้าต่างแชร์ของระบบได้ไหม (Web Share Level 2) */
export function canShareFiles(): boolean {
  try {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function" || typeof navigator.canShare !== "function") {
      return false;
    }
    return navigator.canShare({ files: [new File([""], "blacksmith.png", { type: "image/png" })] });
  } catch {
    return false;
  }
}

/**
 * shared    = เปิดหน้าต่างแชร์ของเครื่องแล้วส่งรูปสำเร็จ
 * saved     = เครื่องนี้ส่งไฟล์ตรงไม่ได้ จึงบันทึกรูปลงเครื่องให้แทน
 * cancelled = ผู้ใช้ปิดหน้าต่างแชร์เอง (ไม่ต้องแจ้งอะไร)
 * failed    = สร้างรูปไม่ได้
 */
export type ShareImageOutcome = "shared" | "saved" | "cancelled" | "failed";

/** ส่งรูปเข้าแชต (LINE ฯลฯ) ผ่านหน้าต่างแชร์ของระบบ — ถ้าเครื่องไม่รองรับหรือถูกปฏิเสธ บันทึกรูปลงเครื่องแทน */
export async function shareSheetImage(doc: SheetDoc): Promise<ShareImageOutcome> {
  try {
    const canvas = await renderSheetCanvas(doc);
    const blob = canvas ? await canvasBlob(canvas) : null;
    if (!blob) return "failed";
    const filename = docFileName(doc, "png");
    const file = new File([blob], filename, { type: "image/png" });
    if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: doc.title });
        return "shared";
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
        /* แชร์ไม่ได้ด้วยเหตุอื่น → บันทึกลงเครื่องแทน */
      }
    }
    saveBlob(blob, filename);
    return "saved";
  } catch {
    return "failed";
  }
}
