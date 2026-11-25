/**
 * คัดลอก / แชร์ / บันทึกรูปผลคำนวณ
 * ทุกฟังก์ชันคืนผลลัพธ์ให้หน้าจอบอกผู้ใช้ได้ว่าสำเร็จหรือไม่ — ห้ามล้มเหลวเงียบ
 */

/** คัดลอกข้อความ: ลอง Clipboard API ก่อน ถ้าไม่ได้ (http, เบราว์เซอร์ในแอป) ลองวิธีเก่าผ่าน textarea */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* ลองวิธีสำรองต่อ */
  }
  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  if (typeof document === "undefined") return false;
  const area = document.createElement("textarea");
  try {
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.left = "-9999px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

/**
 * shared    = เปิดหน้าต่างแชร์ของเครื่องแล้วส่งสำเร็จ
 * copied    = เครื่องนี้แชร์ตรงไม่ได้ จึงคัดลอกข้อความให้แทน
 * cancelled = ผู้ใช้ปิดหน้าต่างแชร์เอง (ไม่ต้องแจ้งอะไร)
 * failed    = ทั้งแชร์และคัดลอกไม่ได้ ต้องให้ผู้ใช้เลือกข้อความเอง
 */
export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

export async function shareText(title: string, text: string): Promise<ShareOutcome> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      /* แชร์ไม่ได้ด้วยเหตุอื่น → คัดลอกแทน */
    }
  }
  return (await copyText(text)) ? "copied" : "failed";
}

/* ───────── บันทึกรูป ───────── */

export type ResultImageOptions = {
  title: string;
  /** ชื่อสายงาน แสดงเหนือชื่อเครื่องมือ */
  subtitle?: string;
  headline?: string;
  /** ค่าที่ผู้ใช้กรอก — คนรับรูปจะได้รู้ว่าคิดจากอะไร */
  inputs?: { label: string; value: string }[];
  rows: { label: string; value: string; emphasize?: boolean }[];
  tip?: string;
  disclaimer?: string;
  /** รหัสเครื่องมือสำหรับชื่อไฟล์ เช่น "electrical/cable" */
  fileSlug?: string;
  /** ที่อยู่หน้าเว็บ (ไม่ต้องมี https://) */
  url?: string;
  date?: Date;
};

export type TextMeasurer = (text: string, font: string) => number;

/**
 * ชื่อไฟล์: blacksmith-<รหัสเครื่องมือ>-YYYY-MM-DD.png เช่น blacksmith-electrical-cable-2026-11-25.png
 * ใช้รหัสอังกฤษของเครื่องมือ (ไม่ใช่ชื่อไทย) — ชื่อไฟล์ภาษาไทยในแอตทริบิวต์ download ถูกเบราว์เซอร์บางตัวทิ้งทั้งชื่อ
 * และอ่านไม่ออกเมื่อส่งต่อข้ามแอป/ข้ามเครื่อง
 */
export function resultFileName(toolSlug: string, date: Date = new Date()): string {
  const slug =
    toolSlug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "result";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `blacksmith-${slug}-${y}-${m}-${d}.png`;
}

export function formatThaiDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function segments(text: string): string[] {
  try {
    if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
      const seg = new Intl.Segmenter("th", { granularity: "word" });
      return [...seg.segment(text)].map((s) => s.segment);
    }
  } catch {
    /* ใช้วิธีสำรอง */
  }
  // ไม่มี Segmenter: ตัดทีละตัวอักษร แต่ไม่แยกสระบน/ล่าง/วรรณยุกต์ออกจากพยัญชนะ
  return text.match(/[\s\S][ัิ-ฺ็-๎]*/g) ?? [];
}

function graphemes(text: string): string[] {
  return text.match(/[\s\S][ัิ-ฺ็-๎]*/g) ?? [];
}

/** ตัดบรรทัดตามความกว้างจริงที่วัดได้ (ไม่เดาจากจำนวนตัวอักษร) — ตัดตามคำไทยถ้าเบราว์เซอร์แบ่งคำได้ */
export function wrapLines(measure: TextMeasurer, text: string, font: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n/)) {
    let line = "";
    const push = () => {
      if (line.trim()) lines.push(line.trimEnd());
      line = "";
    };
    for (const piece of segments(paragraph)) {
      if (measure(line + piece, font) <= maxWidth) {
        line += piece;
        continue;
      }
      push();
      if (!piece.trim()) continue;
      if (measure(piece, font) <= maxWidth) {
        line = piece;
        continue;
      }
      // คำเดียวยาวกว่าบรรทัด: หั่นทีละตัวอักษร
      for (const g of graphemes(piece)) {
        if (line && measure(line + g, font) > maxWidth) push();
        line += g;
      }
    }
    push();
  }
  return lines.length ? lines : [""];
}

const C = {
  navy: "#253641",
  rust: "#C14D35",
  white: "#FFFFFF",
  paper: "#F4F5F6",
  hairline: "#D9DDE0",
  muted: "#55626C",
  onNavyMuted: "#C3CAD0",
} as const;

const W = 720;
const PAD = 32;
const CONTENT = W - PAD * 2;
const HEADER_H = 84;

export type Painter = {
  measure: TextMeasurer;
  /** null = รอบวัดความสูง ไม่ต้องวาด */
  ctx: CanvasRenderingContext2D | null;
  thai: string;
  latin: string;
};

function fillText(p: Painter, text: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = "left") {
  if (!p.ctx) return;
  p.ctx.font = font;
  p.ctx.fillStyle = color;
  p.ctx.textAlign = align;
  p.ctx.textBaseline = "alphabetic";
  p.ctx.fillText(text, x, y);
}

function fillRect(p: Painter, x: number, y: number, w: number, h: number, color: string) {
  if (!p.ctx) return;
  p.ctx.fillStyle = color;
  p.ctx.fillRect(x, y, w, h);
}

/** วาดข้อความหลายบรรทัด คืน y ของขอบล่าง */
function paragraph(
  p: Painter,
  text: string,
  x: number,
  top: number,
  maxWidth: number,
  font: string,
  size: number,
  lineHeight: number,
  color: string,
  align: CanvasTextAlign = "left",
): number {
  const lines = wrapLines(p.measure, text, font, maxWidth);
  // วางเส้นฐานให้ตัวหนังสืออยู่กลางบรรทัด (ฟอนต์ไทยมีสระบน/ล่าง ต้องเผื่อทั้งสองด้าน)
  const baseline = (lineHeight - size) / 2 + size * 0.82;
  lines.forEach((line, i) => {
    fillText(p, line, align === "right" ? x + maxWidth : x, top + i * lineHeight + baseline, font, color, align);
  });
  return top + lines.length * lineHeight;
}

function sectionHeader(p: Painter, label: string, top: number): number {
  fillRect(p, PAD, top, CONTENT, 30, C.paper);
  fillRect(p, PAD, top, 3, 30, C.rust);
  fillText(p, label, PAD + 14, top + 20, `600 13px ${p.thai}`, C.navy);
  return top + 30;
}

function specRows(
  p: Painter,
  rows: { label: string; value: string; emphasize?: boolean }[],
  top: number,
  size: number,
): number {
  let y = top;
  const lineHeight = Math.round(size * 1.55);
  const padY = size >= 16 ? 9 : 7;
  const gap = 20;
  rows.forEach((row, i) => {
    const valueFont = `${row.emphasize ? 700 : 600} ${size}px ${p.thai}`;
    const labelFont = `400 ${size}px ${p.thai}`;
    // ให้ค่ากินที่เท่าที่ต้องใช้ (ไม่เกิน 62%) ที่เหลือเป็นของป้ายชื่อ ทั้งสองฝั่งตัดบรรทัดได้ ไม่มีทางทับกัน
    const valueWidth = Math.min(p.measure(row.value, valueFont), CONTENT * 0.62);
    const labelWidth = CONTENT - valueWidth - gap;
    const labelBottom = paragraph(p, row.label, PAD, y + padY, labelWidth, labelFont, size, lineHeight, C.muted);
    const valueBottom = paragraph(
      p,
      row.value,
      PAD + CONTENT - valueWidth,
      y + padY,
      valueWidth,
      valueFont,
      size,
      lineHeight,
      C.navy,
      "right",
    );
    y = Math.max(labelBottom, valueBottom) + padY;
    if (i < rows.length - 1) fillRect(p, PAD, y, CONTENT, 1, C.hairline);
  });
  return y;
}

/** วาด (หรือแค่วัด) รูปผลคำนวณ คืนความสูงทั้งหมด */
export function paintResultImage(p: Painter, opts: ResultImageOptions): number {
  const date = opts.date ?? new Date();

  // แถบหัว navy + เส้นสนิม
  fillRect(p, 0, 0, W, HEADER_H, C.navy);
  fillRect(p, 0, HEADER_H, W, 4, C.rust);
  fillText(p, "BLACKSMITH", PAD, 38, `700 21px ${p.latin}`, C.white);
  fillText(p, "ผู้ช่วยงานช่าง", PAD, 62, `400 14px ${p.thai}`, C.onNavyMuted);
  fillText(p, formatThaiDate(date), W - PAD, 38, `500 15px ${p.thai}`, C.white, "right");
  fillText(p, "วันที่คิด", W - PAD, 62, `400 13px ${p.thai}`, C.onNavyMuted, "right");

  let y = HEADER_H + 4 + 26;

  if (opts.subtitle) {
    fillRect(p, PAD, y + 8, 18, 2, C.rust);
    fillText(p, opts.subtitle, PAD + 26, y + 14, `600 13px ${p.thai}`, C.navy);
    y += 26;
  }
  y = paragraph(p, opts.title, PAD, y, CONTENT, `600 26px ${p.thai}`, 26, 36, C.navy);

  if (opts.headline) {
    y += 14;
    const top = y;
    const bottom = paragraph(p, opts.headline, PAD + 18, top + 14, CONTENT - 36, `700 23px ${p.thai}`, 23, 33, C.navy);
    const h = bottom + 14 - top;
    // กรอบคำตอบ: เส้นบาง navy + แถบสนิมด้านซ้าย (วาดกรอบทับหลังวัดความสูงได้)
    if (p.ctx) {
      p.ctx.strokeStyle = C.navy;
      p.ctx.lineWidth = 1;
      p.ctx.strokeRect(PAD + 0.5, top + 0.5, CONTENT - 1, h - 1);
    }
    fillRect(p, PAD, top, 4, h, C.rust);
    y = top + h;
  }

  if (opts.disclaimer) {
    y += 14;
    const top = y;
    fillText(p, "ข้อควรระวัง", PAD, top + 14, `700 13px ${p.thai}`, C.rust);
    y = paragraph(p, opts.disclaimer, PAD, top + 22, CONTENT, `400 13px ${p.thai}`, 13, 21, C.navy);
  }

  if (opts.inputs?.length) {
    y += 20;
    y = sectionHeader(p, "ค่าที่กรอก", y);
    y = specRows(p, opts.inputs, y, 14);
  }

  if (opts.rows.length) {
    y += 18;
    y = sectionHeader(p, "ผลที่คิดได้", y);
    y = specRows(p, opts.rows, y, 16);
  }

  if (opts.tip) {
    y += 16;
    const top = y;
    const bottom = paragraph(p, opts.tip, PAD + 14, top + 10, CONTENT - 28, `400 13px ${p.thai}`, 13, 21, C.navy);
    // วัดก่อนแล้วค่อยปูพื้น: รอบวาดจริงต้องปูพื้นก่อนตัวหนังสือ
    if (p.ctx) {
      fillRect(p, PAD, top, CONTENT, bottom + 10 - top, C.paper);
      paragraph(p, opts.tip, PAD + 14, top + 10, CONTENT - 28, `400 13px ${p.thai}`, 13, 21, C.navy);
    }
    y = bottom + 10;
  }

  y += 20;
  fillRect(p, PAD, y, CONTENT, 1, C.navy);
  y += 10;
  const note = "ค่าประมาณจากค่าที่กรอก ตรวจกับหน้างานจริงก่อนสั่งของ";
  const noteFont = `400 12px ${p.thai}`;
  const urlWidth = opts.url ? p.measure(opts.url, `500 12px ${p.latin}`) + 16 : 0;
  const noteBottom = paragraph(p, note, PAD, y, CONTENT - urlWidth, noteFont, 12, 20, C.muted);
  if (opts.url) fillText(p, opts.url, W - PAD, y + 14, `500 12px ${p.latin}`, C.muted, "right");
  return noteBottom + 22;
}

function fontFamilies(): { thai: string; latin: string } {
  const body = getComputedStyle(document.body).fontFamily || "sans-serif";
  const outfit = getComputedStyle(document.documentElement).getPropertyValue("--font-outfit").trim();
  return { thai: body, latin: outfit ? `${outfit}, ${body}` : body };
}

async function ensureFonts(thai: string, latin: string, sample: string): Promise<void> {
  if (!document.fonts?.load) return;
  const loads = [400, 500, 600, 700].map((w) => document.fonts.load(`${w} 16px ${thai}`, sample));
  loads.push(document.fonts.load(`700 21px ${latin}`, "BLACKSMITH"));
  // ฟอนต์โหลดไม่ทันก็วาดด้วยฟอนต์สำรอง ดีกว่าค้างไม่ได้รูป
  await Promise.race([Promise.allSettled(loads), new Promise((resolve) => setTimeout(resolve, 1500))]);
}

/** สร้างรูป PNG ของผลคำนวณ (กว้าง 720 จุด ความละเอียด 2 เท่า) */
export async function renderResultPng(opts: ResultImageOptions): Promise<HTMLCanvasElement | null> {
  if (typeof document === "undefined") return null;
  const { thai, latin } = fontFamilies();
  const sample = [opts.title, opts.headline, opts.tip, ...opts.rows.flatMap((r) => [r.label, r.value])].join(" ");
  await ensureFonts(thai, latin, sample);

  const scratch = document.createElement("canvas").getContext("2d");
  if (!scratch) return null;
  const measure: TextMeasurer = (text, font) => {
    scratch.font = font;
    return scratch.measureText(text).width;
  };

  const height = Math.ceil(paintResultImage({ measure, ctx: null, thai, latin }, opts));
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);
  ctx.fillStyle = C.white;
  ctx.fillRect(0, 0, W, height);
  paintResultImage({ measure, ctx, thai, latin }, opts);
  return canvas;
}

/** บันทึกรูปลงเครื่อง — คืน false ถ้าสร้างรูปหรือสั่งบันทึกไม่ได้ */
export async function downloadResultPng(opts: ResultImageOptions): Promise<boolean> {
  try {
    const canvas = await renderResultPng(opts);
    if (!canvas) return false;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    const href = blob ? URL.createObjectURL(blob) : canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.download = resultFileName(opts.fileSlug ?? "", opts.date);
    a.href = href;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (blob) window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
    return true;
  } catch {
    return false;
  }
}
