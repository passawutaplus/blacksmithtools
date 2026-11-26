/**
 * เลย์เอาต์ของแผ่นส่งออก: "ผลคำนวณ" และ "ใบสั่งของ"
 *
 * แผ่นประกอบจากบล็อกเรียงต่อกัน (หัวกระดาษ → เนื้อหา → ท้ายกระดาษ) แต่ละบล็อกรู้ความสูงของตัวเอง
 * จึงใช้ชุดเดียวกันได้ทั้งรูป PNG ยาวแผ่นเดียว และ PDF A4 ที่ต้องแบ่งหน้าโดยไม่ตัดกลางแถว
 * ไฟล์นี้ไม่แตะ DOM — รับ Painter เข้ามา วัดอย่างเดียว (ctx = null) หรือวาดจริงก็ได้
 */
import {
  ASSISTANT_NAME,
  BRAND_CREDIT,
  BRAND_CTA,
  BRAND_CTA_SHORT,
  BRAND_FREE_NOTE,
  DEFAULT_BRAND_STYLE,
  EXPORT_ASSETS,
  GO_URL_LABEL,
  QR_SIZE,
  WATERMARK_ALPHA,
  WATERMARK_ANGLE,
  type BrandStyle,
} from "./brand";
import {
  C,
  PAD,
    baselineOf,
  drawAsset,
  fillRect,
  fillText,
  formatThaiDate,
  paragraph,
  sheetSize,
  strokeRect,
  wrapLines,
  type Painter,
} from "./canvas-text";
import type { OrderItem } from "./order-rows";

export type SheetRow = { label: string; value: string; emphasize?: boolean };

type CommonDoc = {
  title: string;
  /** ชื่อสายงาน แสดงเหนือชื่อเครื่องมือ */
  subtitle?: string;
  /** ค่าที่ผู้ใช้กรอก — คนรับรูปจะได้รู้ว่าคิดจากอะไร */
  inputs?: { label: string; value: string }[];
  disclaimer?: string;
  /** รหัสเครื่องมือสำหรับชื่อไฟล์ เช่น "electrical/cable" */
  fileSlug?: string;
  /** ที่อยู่หน้าเว็บ (ไม่ต้องมี https://) */
  url?: string;
  date?: Date;
  /** แบบเครดิตแบรนด์ — ไม่ระบุใช้ DEFAULT_BRAND_STYLE */
  brandStyle?: BrandStyle;
};

/** แผ่นผลคำนวณ: คำตอบ + ค่าที่กรอก + ตารางผล + ข้อแนะนำ */
export type ResultDoc = CommonDoc & {
  kind?: "result";
  headline?: string;
  rows: SheetRow[];
  tip?: string;
};

/** ใบสั่งของ: ตาราง ลำดับ · รายการ · จำนวน · หน่วย · ช่องว่างให้เขียนหมายเหตุ/ราคา */
export type OrderDoc = CommonDoc & {
  kind: "order";
  items: OrderItem[];
  jobName?: string;
  customer?: string;
  /** แถวว่างท้ายตารางให้เขียนของเพิ่มเอง (ค่าเริ่มต้น 2) */
  blankRows?: number;
};

export type SheetDoc = ResultDoc | OrderDoc;

export type Block = {
  h: number;
  draw: (p: Painter, top: number) => void;
  /** ห้ามขึ้นหน้าใหม่ระหว่างบล็อกนี้กับบล็อกถัดไป (หัวข้อ/หัวตารางต้องติดกับแถวแรก) */
  keep?: boolean;
  /** ถ้าบล็อกนี้เป็นตัวแรกของหน้าต่อ ให้วาดหัวนี้ซ้ำก่อน (หัวตาราง/หัวข้อ "ต่อ") */
  head?: Block;
  /** อยู่ในพื้นที่ที่วางลายน้ำตรา B ได้ (ตาราง/แถวผล — ไม่มีตัวหนังสือสี rust) */
  zone?: boolean;
};

export type Sheet = {
  style: BrandStyle;
  header: Block;
  body: Block[];
  footer: Block;
};

type Draw = (p: Painter, top: number) => number;

/** สร้างบล็อกจากฟังก์ชันวาดที่คืน y ขอบล่าง — ความสูงได้จากการ "วาดแบบวัดอย่างเดียว" หนึ่งรอบ */
function block(p: Painter, draw: Draw, extra: Partial<Block> = {}): Block {
  const h = Math.ceil(draw({ ...p, ctx: null }, 0));
  return { h, draw: (painter, top) => void draw(painter, top), ...extra };
}

function linesHeight(p: Painter, text: string, font: string, maxWidth: number, lineHeight: number): number {
  return wrapLines(p.measure, text, font, maxWidth).length * lineHeight;
}

/* ───────── โลโก้ / QR ───────── */

const LOGO_RATIO = EXPORT_ASSETS.logoOnDark.w / EXPORT_ASSETS.logoOnDark.h;

/**
 * วาดโลโก้จากไฟล์ทางการ: onDark ใช้บนพื้น navy · onLight ใช้บนพื้นขาว (ห้ามสลับ ห้ามเปลี่ยนสี)
 * กำหนดแค่ความสูง ความกว้างคิดจากสัดส่วนจริงของไฟล์ — ไม่มีทางถูกยืด · คืนความกว้างที่ใช้
 * ถ้าไฟล์โลโก้โหลดไม่ได้ วาดชื่อแบรนด์เป็นตัวหนังสือแทน ดีกว่าหัวกระดาษว่าง
 */
function drawLogo(p: Painter, x: number, y: number, h: number, on: "dark" | "light" = "dark"): number {
  const w = h * LOGO_RATIO;
  if (p.ctx && !drawAsset(p, on === "dark" ? "logoOnDark" : "logoOnLight", x, y, w, h)) {
    fillText(p, "BLACKSMITH", x, y + h * 0.64, `700 ${Math.round(h * 0.36)}px ${p.latin}`, on === "dark" ? C.white : C.navy);
  }
  return w;
}

/** วาด QR go พร้อมพื้นขาว (ขอบเงียบ 4 โมดูลอยู่ในไฟล์แล้ว) วางบนครึ่งจุดให้ทุกโมดูลลงพิกเซลพอดีที่ 2 เท่า */
function drawQr(p: Painter, x: number, y: number): void {
  if (!p.ctx || !p.assets?.qrGo) return;
  const sx = Math.round(x * 2) / 2;
  const sy = Math.round(y * 2) / 2;
  fillRect(p, sx, sy, QR_SIZE, QR_SIZE, C.white);
  drawAsset(p, "qrGo", sx, sy, QR_SIZE, QR_SIZE, { pixelated: true });
}

/* ───────── หัวกระดาษ ───────── */

const RULE_H = 4;
const HEADER_H = 96;
const HEADER_LOGO_H = 58;
/** หัวแบบ stamp สูงกว่าเพราะมี QR อยู่ในหัว */
const STAMP_PAD = 8;
const STAMP_H = QR_SIZE + STAMP_PAD * 2;
const STAMP_HEADER_H = Math.ceil(STAMP_H + 16);

function headerBlock(p: Painter, style: BrandStyle, doc: SheetDoc): Block {
  if (style === "stamp") {
    return block(p, (q, top) => {
      const { W } = sheetSize(q);
      fillRect(q, 0, top, W, STAMP_HEADER_H, C.navy);
      fillRect(q, 0, top + STAMP_HEADER_H, W, RULE_H, C.rust);
      drawLogo(q, PAD, top + (STAMP_HEADER_H - HEADER_LOGO_H) / 2, HEADER_LOGO_H);

      // ตราประทับ QR มุมขวา: กรอบเส้นบาง ข้อความชิดขวาติดกับ QR
      const boxTop = top + 8;
      const qrX = W - PAD - STAMP_PAD - QR_SIZE;
      const lineA = `600 14px ${q.thai}`;
      const lineB = `500 12px ${q.latin}`;
      const textW = Math.max(q.measure(BRAND_CTA_SHORT, lineA), q.measure(GO_URL_LABEL, lineB));
      const textRight = qrX - 14;
      const boxLeft = Math.floor(textRight - textW - 16);
      strokeRect(q, boxLeft, boxTop, W - PAD - boxLeft, STAMP_H, C.onNavyLine);
      drawQr(q, qrX, boxTop + STAMP_PAD);
      const mid = boxTop + STAMP_H / 2;
      fillText(q, BRAND_CTA_SHORT, textRight, mid - 3, lineA, C.white, "right");
      fillText(q, GO_URL_LABEL, textRight, mid + 17, lineB, C.onNavyMuted, "right");
      return top + STAMP_HEADER_H + RULE_H;
    });
  }
  return block(p, (q, top) => {
    const { W } = sheetSize(q);
    fillRect(q, 0, top, W, HEADER_H, C.navy);
    fillRect(q, 0, top + HEADER_H, W, RULE_H, C.rust);
    drawLogo(q, PAD, top + (HEADER_H - HEADER_LOGO_H) / 2, HEADER_LOGO_H);
    // มุมขวา: ชื่อเครื่องมือของร้าน + ชนิดเอกสาร (วันที่อยู่ในเนื้อหา)
    fillText(q, ASSISTANT_NAME, W - PAD, top + 45, `600 17px ${q.thai}`, C.white, "right");
    fillText(q, doc.kind === "order" ? "ใบสั่งของ" : "ผลคำนวณ", W - PAD, top + 68, `400 14px ${q.thai}`, C.onNavyMuted, "right");
    return top + HEADER_H + RULE_H;
  });
}

/* ───────── ท้ายกระดาษ (เครดิตแบรนด์ 3 แบบ) ───────── */

const BAND_PAD = 18;
const BAND_H = Math.ceil(QR_SIZE + BAND_PAD * 2);
const BAND_LOGO_H = 50;
/** โลโก้ท้ายแผ่นแบบ watermark — กว้าง ≈ 121 จุด (ไม่ต่ำกว่าขนาดเล็กสุดของโลโก้ 120) */
const FOOTER_LOGO_H = 50;

function footerBlock(p: Painter, style: BrandStyle): Block {
  if (style === "stamp") {
    // เครดิตบรรทัดเดียวบนแถบสีกระดาษ — QR อยู่ที่หัวแล้ว
    return block(p, (q, top) => {
      const { W } = sheetSize(q);
      const h = 40;
      fillRect(q, 0, top, W, h, C.paperTint);
      fillRect(q, 0, top, W, 1, C.hairline);
      fillRect(q, PAD, top + 19, 18, 2, C.rust);
      fillText(q, BRAND_CREDIT, PAD + 26, top + 25, `600 13px ${q.thai}`, C.navy);
      fillText(q, GO_URL_LABEL, W - PAD, top + 25, `500 13px ${q.latin}`, C.navy, "right");
      return top + h;
    });
  }

  if (style === "watermark") {
    // ท้ายแผ่นพื้นขาว เส้นบน navy 1.5 จุด: QR ซ้าย · คำเชิญสแกน · โลโก้ (ชุดพื้นสว่าง) ขวา
    return block(p, (q, top) => {
      const { W, CONTENT } = sheetSize(q);
      const pad = 16;
      const h = Math.ceil(1.5 + pad + QR_SIZE + pad);
      fillRect(q, PAD, top, CONTENT, 1.5, C.navy);
      const qrTop = top + 1.5 + pad;
      // ขอบเงียบของ QR อยู่ในไฟล์แล้ว (4 โมดูล = 10 จุด) ขยับซ้ายเท่านั้นให้ลายโมดูลชิดแนวขอบเนื้อหา
      drawQr(q, PAD - 10, qrTop);
      const textX = PAD + QR_SIZE + 8;
      const mid = qrTop + QR_SIZE / 2;
      fillText(q, BRAND_CTA_SHORT, textX, mid - 4, `600 17px ${q.thai}`, C.navy);
      fillText(q, `${GO_URL_LABEL} · ${BRAND_FREE_NOTE}`, textX, mid + 20, `400 13px ${q.thai}`, C.muted);
      const logoW = FOOTER_LOGO_H * LOGO_RATIO;
      drawLogo(q, W - PAD - logoW, qrTop + (QR_SIZE - FOOTER_LOGO_H) / 2, FOOTER_LOGO_H, "light");
      return top + h;
    });
  }

  // band: แถบ navy เต็มความกว้าง โลโก้ซ้าย · ข้อความกลาง · QR ขวา (ไม่มีตัวหนังสือ rust บน navy)
  return block(p, (q, top) => {
    const { W } = sheetSize(q);
    fillRect(q, 0, top, W, RULE_H, C.rust);
    const y = top + RULE_H;
    fillRect(q, 0, y, W, BAND_H, C.navy);
    const logoW = drawLogo(q, PAD, y + (BAND_H - BAND_LOGO_H) / 2, BAND_LOGO_H);
    const dividerX = Math.round(PAD + logoW + 22);
    fillRect(q, dividerX, y + 34, 1, BAND_H - 68, C.onNavyLine);
    const textX = dividerX + 22;
    const mid = y + BAND_H / 2;
    fillText(q, BRAND_CREDIT, textX, mid - 16, `600 15px ${q.thai}`, C.white);
    fillText(q, BRAND_CTA, textX, mid + 7, `400 13px ${q.thai}`, C.onNavyMuted);
    fillText(q, GO_URL_LABEL, textX, mid + 28, `500 13px ${q.latin}`, C.white);
    drawQr(q, W - PAD - QR_SIZE, y + BAND_PAD);
    return y + BAND_H;
  });
}

/* ───────── บล็อกเนื้อหาที่ใช้ร่วมกัน ───────── */

function titleBlock(p: Painter, doc: SheetDoc): Block {
  const order = doc.kind === "order";
  const kicker = [doc.subtitle, order ? "ใบสั่งของ" : ""].filter(Boolean).join(" · ");
  // ใบสั่งของมีช่อง "วันที่" ในหัวใบอยู่แล้ว · แผ่นผลคำนวณวางวันที่ชิดขวาบรรทัดเดียวกับชื่อสายงาน
  const dateText = order ? "" : formatThaiDate(doc.date ?? new Date());
  return block(p, (q, top) => {
    const { W, CONTENT } = sheetSize(q);
    let y = top + 26;
    const dateFont = `500 13px ${q.thai}`;
    const dateW = dateText ? q.measure(dateText, dateFont) + 16 : 0;
    if (kicker || dateText) {
      let bottom = y + 22;
      if (kicker) {
        fillRect(q, PAD, y + 10, 18, 2, C.rust);
        bottom = paragraph(q, kicker, PAD + 26, y, CONTENT - 26 - dateW, `600 13px ${q.thai}`, 13, 22, C.navy);
      }
      if (dateText) fillText(q, dateText, W - PAD, y + baselineOf(13, 22), dateFont, C.muted, "right");
      y = bottom + 4;
    }
    return paragraph(q, doc.title, PAD, y, CONTENT, `600 26px ${q.thai}`, 26, 36, C.navy);
  });
}

function headlineBlock(p: Painter, headline: string): Block {
  return block(p, (q, start) => {
    const { CONTENT } = sheetSize(q);
    const top = start + 14;
    const font = `700 23px ${q.thai}`;
    const bottom = paragraph(q, headline, PAD + 18, top + 14, CONTENT - 36, font, 23, 33, C.navy);
    const h = bottom + 14 - top;
    // กรอบคำตอบ: เส้นบาง navy + แถบสนิมด้านซ้าย
    strokeRect(q, PAD, top, CONTENT, h, C.navy);
    fillRect(q, PAD, top, 4, h, C.rust);
    return top + h;
  });
}

/** คำเตือน (สูตรระดับ C) — หัวข้อเป็น navy มีขีดสนิมนำ: ตัวหนังสือ rust บนลายน้ำจะคมชัดไม่ถึง 4.5:1 */
function disclaimerBlock(p: Painter, text: string): Block {
  return block(p, (q, start) => {
    const { CONTENT } = sheetSize(q);
    const top = start + 14;
    const bottom = paragraph(q, text, PAD + 14, top + 22, CONTENT - 14, `400 13px ${q.thai}`, 13, 21, C.navy);
    fillRect(q, PAD, top + 3, 3, bottom - top - 5, C.rust);
    fillText(q, "ข้อควรระวัง", PAD + 14, top + 14, `700 13px ${q.thai}`, C.navy);
    return bottom;
  });
}

function sectionHeader(p: Painter, label: string, gap: number): Block {
  return block(
    p,
    (q, start) => {
      const { CONTENT } = sheetSize(q);
      const top = start + gap;
      fillRect(q, PAD, top, CONTENT, 30, C.paperTint);
      fillRect(q, PAD, top, 3, 30, C.rust);
      fillText(q, label, PAD + 14, top + 20, `600 13px ${q.thai}`, C.navy);
      return top + 30;
    },
    { keep: true },
  );
}

/** แถวสเปก ป้ายซ้าย-ค่าขวา: ค่ากินที่เท่าที่ต้องใช้ (ไม่เกิน 62%) ที่เหลือเป็นของป้าย ทั้งสองฝั่งตัดบรรทัดได้ ไม่มีทางทับกัน */
function specRow(p: Painter, row: SheetRow, size: number, last: boolean, extra: Partial<Block>): Block {
  return block(
    p,
    (q, top) => {
      const { CONTENT } = sheetSize(q);
      const lineHeight = Math.round(size * 1.55);
      const padY = size >= 16 ? 9 : 7;
      const gap = 20;
      const valueFont = `${row.emphasize ? 700 : 600} ${size}px ${q.thai}`;
      const labelFont = `400 ${size}px ${q.thai}`;
      const valueWidth = Math.min(q.measure(row.value, valueFont), CONTENT * 0.62);
      const labelWidth = CONTENT - valueWidth - gap;
      const labelBottom = paragraph(q, row.label, PAD, top + padY, labelWidth, labelFont, size, lineHeight, C.muted);
      const valueBottom = paragraph(
        q,
        row.value,
        PAD + CONTENT - valueWidth,
        top + padY,
        valueWidth,
        valueFont,
        size,
        lineHeight,
        C.navy,
        "right",
      );
      const bottom = Math.max(labelBottom, valueBottom) + padY;
      if (!last) fillRect(q, PAD, bottom, CONTENT, 1, C.hairline);
      return bottom;
    },
    extra,
  );
}

function specSection(p: Painter, label: string, rows: SheetRow[], size: number, gap: number, zone: boolean): Block[] {
  const head = sectionHeader(p, label, gap);
  const again = sectionHeader(p, `${label} (ต่อ)`, 0);
  return [
    { ...head, zone },
    ...rows.map((row, i) => specRow(p, row, size, i === rows.length - 1, { head: again, zone })),
  ];
}

function tipBlock(p: Painter, tip: string): Block {
  return block(p, (q, start) => {
    const { CONTENT } = sheetSize(q);
    const top = start + 16;
    const font = `400 13px ${q.thai}`;
    const h = linesHeight(q, tip, font, CONTENT - 28, 21) + 20;
    fillRect(q, PAD, top, CONTENT, h, C.paperTint);
    paragraph(q, tip, PAD + 14, top + 10, CONTENT - 28, font, 13, 21, C.navy);
    return top + h;
  });
}

/**
 * หมายเหตุท้ายเนื้อหา "เป็นค่าประมาณ…" + ที่อยู่หน้าเครื่องมือ
 * boxed = กล่องพื้นกระดาษมีแถบสนิมนำ (ใบสั่งของ) · ไม่ boxed = บรรทัดตัวเล็กธรรมดา (แผ่นผลคำนวณมีกล่องข้อแนะนำอยู่แล้ว)
 */
function finePrintBlock(p: Painter, note: string, url: string | undefined, boxed: boolean): Block {
  return block(p, (q, start) => {
    const { W, CONTENT } = sheetSize(q);
    const urlFont = `500 12px ${q.latin}`;
    const urlWidth = url ? q.measure(url, urlFont) + 16 : 0;
    const font = `400 13px ${q.thai}`;
    if (boxed) {
      const top = start + 16;
      const textW = CONTENT - 30 - urlWidth;
      const h = linesHeight(q, note, font, textW, 21) + 20;
      fillRect(q, PAD, top, CONTENT, h, C.paperTint);
      fillRect(q, PAD, top, 3, h, C.rust);
      paragraph(q, note, PAD + 16, top + 10, textW, font, 13, 21, C.muted);
      if (url) fillText(q, url, W - PAD - 14, top + 10 + baselineOf(12, 21), urlFont, C.muted, "right");
      return top + h + 22;
    }
    const top = start + 12;
    const bottom = paragraph(q, note, PAD, top, CONTENT - urlWidth, font, 13, 21, C.muted);
    if (url) fillText(q, url, W - PAD, top + baselineOf(12, 21), urlFont, C.muted, "right");
    return bottom + 20;
  });
}

/* ───────── ใบสั่งของ ───────── */

/** ช่องหัวใบสั่ง: ชื่องาน · ลูกค้า · วันที่ — ช่องที่ไม่ได้กรอกเว้นเส้นไว้ให้เขียนเอง */
function orderFieldsBlock(p: Painter, doc: OrderDoc): Block {
  const fields = [
    { label: "ชื่องาน", value: doc.jobName?.trim() ?? "", share: 0.44 },
    { label: "ลูกค้า", value: doc.customer?.trim() ?? "", share: 0.32 },
    { label: "วันที่", value: formatThaiDate(doc.date ?? new Date()), share: 0.24 },
  ];
  return block(p, (q, start) => {
    const { CONTENT } = sheetSize(q);
    const top = start + 14;
    const font = `600 15px ${q.thai}`;
    const lineHeight = 23;
    // ช่องสุดท้ายรับเศษที่เหลือ ให้ขอบขวาชนกรอบพอดี
    const widths = fields.map((f) => Math.round(CONTENT * f.share));
    widths[widths.length - 1] = CONTENT - widths.slice(0, -1).reduce((a, b) => a + b, 0);
    const cells = fields.map((f, i) => ({ ...f, w: widths[i] }));
    const valueH = Math.max(...cells.map((c) => (c.value ? linesHeight(q, c.value, font, c.w - 24, lineHeight) : lineHeight)));
    const h = 10 + 18 + valueH + 11;
    strokeRect(q, PAD, top, CONTENT, h, C.navy);
    let x = PAD;
    cells.forEach((cell, i) => {
      if (i > 0) fillRect(q, x, top + 1, 1, h - 2, C.hairline);
      fillText(q, cell.label, x + 12, top + 23, `400 12px ${q.thai}`, C.muted);
      if (cell.value) paragraph(q, cell.value, x + 12, top + 28, cell.w - 24, font, 15, lineHeight, C.navy);
      else fillRect(q, x + 12, top + 28 + lineHeight - 3, cell.w - 24, 1, C.rule);
      x += cell.w;
    });
    return top + h;
  });
}

function orderInputsBlock(p: Painter, inputs: { label: string; value: string }[]): Block {
  const text = inputs.map((i) => `${i.label} ${i.value}`).join("  ·  ");
  return block(p, (q, start) => {
    const { CONTENT } = sheetSize(q);
    const top = start + 12;
    const labelFont = `600 12px ${q.thai}`;
    const label = "ค่าที่ใช้คิด";
    const labelW = q.measure(label, labelFont) + 12;
    fillText(q, label, PAD, top + baselineOf(12, 20), labelFont, C.navy);
    return paragraph(q, text, PAD + labelW, top, CONTENT - labelW, `400 12px ${q.thai}`, 12, 20, C.muted);
  });
}

/** คอลัมน์ตารางใบสั่งของ — ลำดับ/จำนวน/หน่วย/หมายเหตุ กว้างคงที่ "รายการ" ได้ที่เหลือทั้งหมด */
const COL = { no: 48, qty: 92, unit: 84, note: 150 } as const;
const TABLE_HEAD_H = 36;
const ROW_MIN_H = 46;

/** ตำแหน่ง x ของขอบซ้ายแต่ละคอลัมน์ ตามความกว้างเนื้อหาของแผ่น */
function columns(content: number) {
  const item = content - COL.no - COL.qty - COL.unit - COL.note;
  const xItem = PAD + COL.no;
  const xUnit = xItem + item + COL.qty;
  const xNote = xUnit + COL.unit;
  return { item, xItem, xUnit, xNote };
}

/** หัวตาราง: พื้นกระดาษ เส้นบน navy 1.5 จุด (ไม่ใช้พื้นทึบเข้ม ให้ลายน้ำและตารางดูเป็นแผ่นเดียวกัน) */
function tableHead(p: Painter, gap: number): Block {
  return block(
    p,
    (q, start) => {
      const { CONTENT } = sheetSize(q);
      const col = columns(CONTENT);
      const top = start + gap;
      const font = `600 13px ${q.thai}`;
      const base = top + 1.5 + 22;
      fillRect(q, PAD, top, CONTENT, TABLE_HEAD_H, C.paperTint);
      fillRect(q, PAD, top, CONTENT, 1.5, C.navy);
      fillRect(q, PAD, top + TABLE_HEAD_H - 1, CONTENT, 1, C.hairline);
      fillText(q, "ลำดับ", PAD + COL.no / 2, base, font, C.navy, "center");
      fillText(q, "รายการ", col.xItem + 12, base, font, C.navy);
      fillText(q, "จำนวน", col.xUnit - 14, base, font, C.navy, "right");
      fillText(q, "หน่วย", col.xUnit + 10, base, font, C.navy);
      fillText(q, "หมายเหตุ / ราคา", col.xNote + 14, base, font, C.navy);
      return top + TABLE_HEAD_H;
    },
    { keep: true, zone: true },
  );
}

/** แถวตาราง — item = null คือแถวว่างให้เขียนเอง */
function tableRow(p: Painter, index: number, item: OrderItem | null, head: Block): Block {
  return block(
    p,
    (q, top) => {
      const { CONTENT } = sheetSize(q);
      const col = columns(CONTENT);
      const nameFont = `500 16px ${q.thai}`;
      const detailFont = `400 12px ${q.thai}`;
      const nameLH = 24;
      const detailLH = 19;
      const textW = col.item - 24;
      const nameH = item ? linesHeight(q, item.name, nameFont, textW, nameLH) : 0;
      const detailH = item?.detail ? linesHeight(q, item.detail, detailFont, textW, detailLH) : 0;
      const contentH = nameH + detailH;
      const h = Math.max(ROW_MIN_H, contentH + 20);
      const y = top + Math.floor((h - Math.max(contentH, nameLH)) / 2);

      fillText(q, String(index), PAD + COL.no / 2, y + baselineOf(15, nameLH), `400 15px ${q.thai}`, C.muted, "center");
      if (item) {
        paragraph(q, item.name, col.xItem + 12, y, textW, nameFont, 16, nameLH, C.navy);
        if (item.detail) paragraph(q, item.detail, col.xItem + 12, y + nameH, textW, detailFont, 12, detailLH, C.muted);
        if (item.qty) fillText(q, item.qty, col.xUnit - 14, y + baselineOf(17, nameLH), `700 17px ${q.thai}`, C.navy, "right");
        if (item.unit) fillText(q, item.unit, col.xUnit + 10, y + baselineOf(15, nameLH), `400 15px ${q.thai}`, C.navy);
      }

      // เส้นแบ่งแถวบาง ๆ + เส้นตั้งหน้าช่อง "หมายเหตุ / ราคา" ให้เห็นว่าเป็นช่องเขียนเอง
      fillRect(q, col.xNote, top, 1, h, C.hairline);
      fillRect(q, PAD, top + h - 1, CONTENT, 1, C.hairline);
      return top + h;
    },
    { head, zone: true },
  );
}

function orderTable(p: Painter, doc: OrderDoc): Block[] {
  const head = tableHead(p, 16);
  const again = tableHead(p, 0);
  const blanks = Math.max(0, doc.blankRows ?? 2);
  const total = doc.items.length + blanks;
  const rows: Block[] = [];
  for (let i = 0; i < total; i++) {
    rows.push(tableRow(p, i + 1, doc.items[i] ?? null, again));
  }
  const count = block(p, (q, start) => {
    const { W } = sheetSize(q);
    const top = start + 6;
    const font = `400 12px ${q.thai}`;
    fillText(q, `รวม ${doc.items.length} รายการ`, PAD, top + baselineOf(12, 20), font, C.muted);
    fillText(q, "ช่องหมายเหตุ / ราคา เว้นไว้ให้เขียนเอง", W - PAD, top + baselineOf(12, 20), font, C.muted, "right");
    return top + 20;
  });
  // หัวตารางต้องติดแถวแรก และแถวสุดท้ายต้องติดบรรทัดสรุป
  if (rows.length) rows[rows.length - 1] = { ...rows[rows.length - 1], keep: true };
  return [head, ...rows, count];
}

/* ───────── ประกอบแผ่น ───────── */

export const RESULT_NOTE = "ค่าประมาณจากค่าที่กรอก ตรวจกับหน้างานจริงก่อนสั่งของ";
export const ORDER_NOTE = "จำนวนเป็นค่าประมาณจากค่าที่กรอก ตรวจกับหน้างานจริงก่อนสั่งของ";

/** จัดแผ่นจากข้อมูล: วัดทุกบล็อกด้วย p.measure ที่ความกว้าง p.width (ยังไม่วาดอะไร) — ต้องวาดด้วย Painter ความกว้างเดียวกัน */
export function buildSheet(p: Painter, doc: SheetDoc): Sheet {
  const style = doc.brandStyle ?? DEFAULT_BRAND_STYLE;
  const body: Block[] = [titleBlock(p, doc)];

  if (doc.kind === "order") {
    body.push(orderFieldsBlock(p, doc));
    if (doc.inputs?.length) body.push(orderInputsBlock(p, doc.inputs));
    body.push(...orderTable(p, doc));
    if (doc.disclaimer) body.push(disclaimerBlock(p, doc.disclaimer));
    body.push(finePrintBlock(p, ORDER_NOTE, doc.url, true));
  } else {
    if (doc.headline) body.push(headlineBlock(p, doc.headline));
    if (doc.disclaimer) body.push(disclaimerBlock(p, doc.disclaimer));
    if (doc.inputs?.length) body.push(...specSection(p, "ค่าที่กรอก", doc.inputs, 14, 20, false));
    if (doc.rows.length) body.push(...specSection(p, "ผลที่คิดได้", doc.rows, 16, 18, true));
    if (doc.tip) body.push(tipBlock(p, doc.tip));
    body.push(finePrintBlock(p, RESULT_NOTE, doc.url, false));
  }

  return { style, header: headerBlock(p, style, doc), body, footer: footerBlock(p, style) };
}

export function sheetHeight(sheet: Sheet): number {
  return sheet.header.h + sheet.body.reduce((sum, b) => sum + b.h, 0) + sheet.footer.h;
}

type Placed = { block: Block; top: number };

const MARK_RATIO = EXPORT_ASSETS.markNavy.w / EXPORT_ASSETS.markNavy.h;

/**
 * ลายน้ำตรา B (เฉพาะแบบ watermark) — วาด "ก่อน" เนื้อหาเสมอ จึงอยู่หลังตัวหนังสือ ไม่มีทางทับ
 * ตราใหญ่ เอียง WATERMARK_ANGLE ทึบแค่ WATERMARK_ALPHA กึ่งกลางอยู่ต่ำกว่ากลางตาราง/แถวผลเล็กน้อย
 * ตัดขอบไว้ในพื้นที่เนื้อหา ไม่ล้ำหัว/ท้ายกระดาษ · ตารางยาวมากจะวางซ้ำทุกประมาณหนึ่งจอ ให้ครอปตรงไหนก็ยังเห็นตรา
 */
function paintWatermark(p: Painter, style: BrandStyle, placed: Placed[], bodyTop: number, bodyBottom: number): void {
  const mark = p.assets?.markNavy;
  if (style !== "watermark" || !p.ctx || !mark) return;
  const { W } = sheetSize(p);
  const zone = placed.filter((b) => b.block.zone);
  const top = zone.length ? Math.min(...zone.map((b) => b.top)) : bodyTop;
  const bottom = zone.length ? Math.max(...zone.map((b) => b.top + b.block.h)) : bodyBottom;
  const height = bottom - top;
  const bodyH = bodyBottom - bodyTop;
  if (bodyH < 160) return;

  const count = Math.max(1, Math.round(height / 640));
  const slot = height / count;
  const markH = Math.min(460, Math.max(320, slot * 1.1), bodyH - 24);
  const markW = markH * MARK_RATIO;
  const ctx = p.ctx;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, bodyTop, W, bodyH);
  ctx.clip();
  ctx.globalAlpha = WATERMARK_ALPHA;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  for (let i = 0; i < count; i++) {
    // กึ่งกลางของช่วง แล้วเลื่อนลงเล็กน้อย — แต่ไม่ให้ตราหลุดพื้นที่เนื้อหาเมื่อตารางสั้น
    const wanted = top + slot * (i + 0.5) + Math.min(24, slot * 0.05);
    const cy = Math.min(Math.max(wanted, bodyTop + markH / 2 + 8), bodyBottom - markH / 2 - 8);
    ctx.save();
    ctx.translate(W / 2, cy);
    ctx.rotate((WATERMARK_ANGLE * Math.PI) / 180);
    ctx.drawImage(mark, -markW / 2, -markH / 2, markW, markH);
    ctx.restore();
  }
  ctx.restore();
}

/** วาดทั้งแผ่นเป็นรูปยาวรูปเดียว (PNG) คืนความสูงทั้งหมด */
export function paintSheet(p: Painter, sheet: Sheet): number {
  let y = 0;
  sheet.header.draw(p, y);
  y += sheet.header.h;
  const bodyTop = y;
  const placed: Placed[] = sheet.body.map((b) => {
    const at = { block: b, top: y };
    y += b.h;
    return at;
  });
  paintWatermark(p, sheet.style, placed, bodyTop, y);
  for (const { block: b, top } of placed) b.draw(p, top);
  sheet.footer.draw(p, y);
  return y + sheet.footer.h;
}

/* ───────── แบ่งหน้า A4 (PDF) ───────── */

/**
 * ความกว้างแผ่นของ PDF A4 — กว้างกว่ารูป PNG (720) ตัวหนังสือขนาดเดิมจึงเล็กลงเมื่อเทียบกับกระดาษ:
 * 15 จุด ≈ 10 pt บน A4 อ่านสบายตอนพิมพ์ และใบสั่งของทั่วไปจบในหน้าเดียว · QR บนกระดาษกว้างราว 25 มม.
 */
export const PDF_W = 864;

/** ความสูงหน้า A4 แนวตั้ง (210 × 297 มม.) ในหน่วยเดียวกับความกว้างแผ่น */
export function pageHeight(width: number): number {
  return Math.floor((width * 297) / 210);
}

/** ที่ว่างท้ายหน้าไว้ใส่เลขหน้า */
const PAGE_RESERVE = 30;
/** ช่องไฟใต้หัวกระดาษของหน้าต่อ */
const CONT_GAP = 14;

export type PageBlock = Pick<Block, "h" | "keep"> & { head?: Pick<Block, "h"> };

/**
 * แบ่งบล็อกเนื้อหาลงหน้า — คืนดัชนีบล็อกของแต่ละหน้า
 * - ไม่ตัดกลางบล็อก และไม่ทิ้งหัวข้อ/หัวตาราง (keep) ไว้ท้ายหน้าโดยไม่มีแถวตาม
 * - หน้าต่อที่ขึ้นด้วยแถวกลางตาราง เผื่อที่ให้หัวตารางที่จะวาดซ้ำ
 * - หน้าสุดท้ายต้องเหลือที่ให้ท้ายกระดาษ (เครดิตแบรนด์ + QR) ถ้าไม่พอ ยกบล็อกท้ายไปขึ้นหน้าใหม่พร้อมกัน
 */
export function paginate(
  blocks: PageBlock[],
  opts: { pageH: number; headerH: number; footerH: number; reserve?: number; contGap?: number },
): number[][] {
  const reserve = opts.reserve ?? PAGE_RESERVE;
  const contGap = opts.contGap ?? CONT_GAP;
  const limit = opts.pageH - reserve;
  const startY = (index: number, first: PageBlock | undefined) =>
    opts.headerH + (index > 0 ? contGap + (first?.head?.h ?? 0) : 0);

  const pages: number[][] = [[]];
  let y = startY(0, blocks[0]);
  blocks.forEach((b, i) => {
    const page = pages[pages.length - 1];
    // ความสูงของบล็อกนี้รวมบล็อกถัดไปที่ต้องอยู่ติดกัน
    let chain = b.h;
    for (let j = i; blocks[j].keep && j + 1 < blocks.length; j++) chain += blocks[j + 1].h;
    if (page.length > 0 && y + chain > limit) {
      pages.push([i]);
      y = startY(pages.length - 1, b) + b.h;
      return;
    }
    page.push(i);
    y += b.h;
  });

  const last = pages[pages.length - 1];
  if (y + opts.footerH > limit && last.length > 1) {
    // ยกบล็อกท้ายสุด (และหัวข้อที่ต้องติดกับมัน) ไปหน้าใหม่ ให้ท้ายกระดาษไม่ล้นและไม่อยู่หน้าเปล่า
    let cut = last.length - 1;
    while (cut > 0 && blocks[last[cut - 1]].keep) cut--;
    if (cut > 0) pages.push(last.splice(cut));
  }
  return pages;
}

export function paginateSheet(sheet: Sheet, pageH: number): number[][] {
  // พอดีหน้าเดียว (ไม่มีเลขหน้า จึงไม่ต้องกันที่ท้ายหน้า): ทุกบล็อกอยู่หน้าเดียว ท้ายกระดาษติดขอบล่าง
  if (sheetHeight(sheet) + 8 <= pageH) return [sheet.body.map((_, i) => i)];
  return paginate(sheet.body, { pageH, headerH: sheet.header.h, footerH: sheet.footer.h });
}

/**
 * ความกว้างแผ่นที่ลองไล่เมื่อจัดลง A4: เริ่มที่ PDF_W แล้วขยายแผ่นทีละขั้น (= ย่อทั้งแผ่นบนกระดาษ)
 * ไม่เกิน 1.2 เท่า ตัวหนังสือ 15 จุดยังได้ราว 8.5 pt และ QR ยังกว้างเกิน 20 มม.
 */
export const PDF_FIT_WIDTHS: readonly number[] = [PDF_W, 907, 950, 994, 1037];

export type A4Layout = { width: number; pageH: number; sheet: Sheet; pages: number[][] };

/**
 * จัดแผ่นลงหน้า A4: เลือกความกว้างที่ใช้จำนวนหน้าน้อยที่สุด ถ้าเท่ากันเอาแผ่นแคบสุด (ตัวหนังสือใหญ่สุด)
 * เนื้อหาที่เกินหน้าเดียวไปนิดเดียวจึงถูกย่อให้จบในหน้าเดียว แทนการปล่อยหน้าท้ายที่มีแต่ท้ายกระดาษ
 */
export function layoutA4(p: Painter, doc: SheetDoc): A4Layout {
  let best: A4Layout | null = null;
  for (const width of PDF_FIT_WIDTHS) {
    const pageH = pageHeight(width);
    const sheet = buildSheet({ ...p, width, ctx: null }, doc);
    const layout = { width, pageH, sheet, pages: paginateSheet(sheet, pageH) };
    if (!best || layout.pages.length < best.pages.length) best = layout;
    if (best.pages.length === 1) break;
  }
  return best as A4Layout;
}

/** วาดหน้า PDF หนึ่งหน้า (สูง pageH): หัวกระดาษทุกหน้า · ท้ายกระดาษติดขอบล่างของหน้าสุดท้าย · เลขหน้าเมื่อมีหลายหน้า */
export function paintPage(p: Painter, sheet: Sheet, pages: number[][], index: number, pageH: number): void {
  const { W } = sheetSize(p);
  const isLast = index === pages.length - 1;
  sheet.header.draw(p, 0);
  let y = sheet.header.h;
  const bodyTop = y;
  const placed: Placed[] = [];
  const first = sheet.body[pages[index][0]];
  if (index > 0) {
    y += CONT_GAP;
    if (first?.head) {
      placed.push({ block: first.head, top: y });
      y += first.head.h;
    }
  }
  for (const i of pages[index]) {
    placed.push({ block: sheet.body[i], top: y });
    y += sheet.body[i].h;
  }
  const footerTop = pageH - sheet.footer.h;
  paintWatermark(p, sheet.style, placed, bodyTop, isLast ? Math.min(y, footerTop) : y);
  for (const { block: b, top } of placed) b.draw(p, top);
  if (isLast) sheet.footer.draw(p, footerTop);

  if (pages.length > 1) {
    const base = (isLast ? footerTop : pageH) - 11;
    const font = `400 12px ${p.thai}`;
    fillText(p, `หน้า ${index + 1}/${pages.length}`, W - PAD, base, font, C.muted, "right");
    if (!isLast) fillText(p, "มีต่อหน้าถัดไป", PAD, base, font, C.muted);
  }
}
