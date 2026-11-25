/**
 * เครื่องมือวาดข้อความลง canvas ของแผ่นส่งออก (รูปผลคำนวณ / ใบสั่งของ)
 * ทุกฟังก์ชันรับ Painter: ถ้า ctx เป็น null คือ "รอบวัดความสูง" คำนวณตำแหน่งเหมือนเดิมแต่ไม่วาด
 * เลย์เอาต์จึงวัดจากความกว้างตัวหนังสือจริง ไม่เดาจากจำนวนตัวอักษร และทดสอบได้โดยไม่ต้องมีเบราว์เซอร์
 */
import type { ExportAssetKey } from "./brand";

export type TextMeasurer = (text: string, font: string) => number;

export type Painter = {
  measure: TextMeasurer;
  /** null = รอบวัดความสูง ไม่ต้องวาด */
  ctx: CanvasRenderingContext2D | null;
  thai: string;
  latin: string;
  /** ความกว้างแผ่นในหน่วยจุดของเลย์เอาต์ — ไม่ระบุ = W (720 รูป PNG) · PDF A4 ใช้แผ่นกว้างกว่าให้ตัวหนังสือบนกระดาษไม่ใหญ่เกิน */
  width?: number;
  /** โลโก้/QR ที่โหลดไว้แล้ว — ตัวไหนโหลดไม่ได้จะถูกข้าม (มีข้อความสำรองแทนโลโก้) */
  assets?: Partial<Record<ExportAssetKey, CanvasImageSource>>;
};

/** สีตามกฎแบรนด์: navy + rust เท่านั้น ที่เหลือเป็นเทาของ navy */
export const C = {
  navy: "#253641",
  rust: "#C14D35",
  white: "#FFFFFF",
  paper: "#F4F5F6",
  /** พื้นกระดาษแบบโปร่ง (navy 5%) — บนพื้นขาวได้สีเดียวกับ paper แต่ลายน้ำข้างหลังยังมองทะลุได้ */
  paperTint: "rgba(37, 54, 65, 0.05)",
  hairline: "#D9DDE0",
  /** เส้นให้เขียนทับ (เข้มกว่า hairline เล็กน้อยให้เห็นตอนพิมพ์) */
  rule: "#AEB6BC",
  muted: "#55626C",
  onNavyMuted: "#C3CAD0",
  /** เส้นบางบนพื้น navy */
  onNavyLine: "#5E6C76",
} as const;

/** ความกว้างแผ่นของรูป PNG (จุดของเลย์เอาต์) — ไฟล์จริงเรนเดอร์ 2 เท่า = 1440px */
export const W = 720;
export const PAD = 32;

/** ขนาดแผ่นที่ Painter นี้วาด: ความกว้างทั้งแผ่น · ความกว้างเนื้อหา (หักขอบซ้าย-ขวา) */
export function sheetSize(p: Pick<Painter, "width">): { W: number; CONTENT: number } {
  const width = p.width ?? W;
  return { W: width, CONTENT: width - PAD * 2 };
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

export function fillText(
  p: Painter,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = "left",
) {
  if (!p.ctx) return;
  p.ctx.font = font;
  p.ctx.fillStyle = color;
  p.ctx.textAlign = align;
  p.ctx.textBaseline = "alphabetic";
  p.ctx.fillText(text, x, y);
}

export function fillRect(p: Painter, x: number, y: number, w: number, h: number, color: string) {
  if (!p.ctx) return;
  p.ctx.fillStyle = color;
  p.ctx.fillRect(x, y, w, h);
}

/** กรอบเส้น 1 จุด วางบนครึ่งพิกเซลให้เส้นคม */
export function strokeRect(p: Painter, x: number, y: number, w: number, h: number, color: string) {
  if (!p.ctx) return;
  p.ctx.strokeStyle = color;
  p.ctx.lineWidth = 1;
  p.ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

/** เส้นฐานของบรรทัดแรก: ให้ตัวหนังสืออยู่กลางบรรทัด (ฟอนต์ไทยมีสระบน/ล่าง ต้องเผื่อทั้งสองด้าน) */
export function baselineOf(size: number, lineHeight: number): number {
  return (lineHeight - size) / 2 + size * 0.82;
}

/** วาดข้อความหลายบรรทัด คืน y ของขอบล่าง — align right/center ยึดกับกรอบกว้าง maxWidth ที่เริ่มจาก x */
export function paragraph(
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
  const baseline = baselineOf(size, lineHeight);
  const anchor = align === "right" ? x + maxWidth : align === "center" ? x + maxWidth / 2 : x;
  lines.forEach((line, i) => {
    fillText(p, line, anchor, top + i * lineHeight + baseline, font, color, align);
  });
  return top + lines.length * lineHeight;
}

/** วาดภาพจากชุด assets — คืน false ถ้าเป็นรอบวัดหรือภาพโหลดไม่ได้ (ให้ผู้เรียกวาดข้อความสำรอง) */
export function drawAsset(
  p: Painter,
  key: ExportAssetKey,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { alpha?: number; pixelated?: boolean } = {},
): boolean {
  const image = p.assets?.[key];
  if (!p.ctx || !image) return false;
  const ctx = p.ctx;
  ctx.save();
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
  // QR ต้องขยาย/ย่อแบบไม่เกลี่ยสี ไม่งั้นขอบโมดูลเบลอและสแกนยากขึ้น
  ctx.imageSmoothingEnabled = !opts.pixelated;
  if (!opts.pixelated) ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, x, y, w, h);
  ctx.restore();
  return true;
}
