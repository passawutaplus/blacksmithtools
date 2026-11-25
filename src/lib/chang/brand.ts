/**
 * เครดิตแบรนด์บนไฟล์ที่ส่งออกจากผู้ช่วยงานช่าง (รูปผลคำนวณ / ใบสั่งของ / PDF / ข้อความที่คัดลอก)
 *
 * QR ที่ใช้คือ QR "go" ของร้าน — ชี้ไป GO_QR_URL (หน้าช่องทางร้าน ซึ่งมีทางเข้าผู้ช่วยงานช่าง) เสมอ
 * ห้ามสร้าง QR ใหม่ที่ชี้ที่อื่น: สติกเกอร์สินค้า ใบปลิว และไฟล์ส่งออกต้องพาไปที่เดียวกัน
 */
import { GO_QR_URL } from "../go-qr";

/**
 * หน้าตาเครดิตแบรนด์บนแผ่นส่งออก — เจ้าของร้านเลือกแบบ watermark แล้ว (2026-11-25)
 * อีกสองแบบเก็บไว้ในโค้ดเป็นตัวเลือกของ brandStyle แต่ไม่มีปุ่มให้เลือกบนหน้าจอ
 * watermark = ตรา B จาง ๆ เอียงหลังเนื้อหา (ครอปรูปแล้วแบรนด์ยังติดไป) + ท้ายแผ่นพื้นขาว: QR ซ้าย · คำเชิญสแกน · โลโก้ขวา
 * band      = แถบ navy ท้ายแผ่น: โลโก้ซ้าย · คำเชิญสแกน · QR ขวา
 * stamp     = QR เป็นตราประทับมุมขวาของหัวกระดาษ ท้ายแผ่นเหลือเครดิตบรรทัดเดียว
 */
export type BrandStyle = "band" | "stamp" | "watermark";

export const BRAND_STYLES: readonly BrandStyle[] = ["band", "stamp", "watermark"];

/** ค่าเดียวที่ตัดสินว่าทุกไฟล์ส่งออก (รูปผลคำนวณ · ใบสั่งของ · PDF) ใช้แบบไหน */
export const DEFAULT_BRAND_STYLE: BrandStyle = "watermark";

export function isBrandStyle(value: unknown): value is BrandStyle {
  return typeof value === "string" && (BRAND_STYLES as readonly string[]).includes(value);
}

export const GO_URL = GO_QR_URL;
/** ที่อยู่แบบสั้นสำหรับพิมพ์บนแผ่น (ไม่มี https://) */
export const GO_URL_LABEL = GO_QR_URL.replace(/^https?:\/\//, "");

export const BRAND_CREDIT = "คำนวณด้วย ผู้ช่วยงานช่าง BlackSmith";
/** หน้า /go เป็นหน้ารวมช่องทางร้านที่มีทางเข้าผู้ช่วยงานช่าง — คำเชิญจึงบอกทั้งสองอย่าง */
export const BRAND_CTA = "สแกนเปิดผู้ช่วยงานช่างและช่องทางร้าน";
export const BRAND_CTA_SHORT = "สแกนเปิดผู้ช่วยงานช่าง";
export const BRAND_FREE_NOTE = "ใช้ฟรี ไม่ต้องสมัคร";
export const ASSISTANT_NAME = "ผู้ช่วยงานช่าง";

/** บรรทัดเครดิตท้ายข้อความที่คัดลอก/แชร์ — ใส่ลิงก์เต็มให้แอปแชตทำเป็นลิงก์กดได้ */
export const COPY_CREDIT_LINE = `เปิดผู้ช่วยงานช่าง BlackSmith: ${GO_URL}`;

/** ต่อบรรทัดเครดิต (พร้อมลิงก์ go) ท้ายข้อความ — ไม่แตะเนื้อหาเดิม และไม่ใส่ซ้ำถ้ามีลิงก์อยู่แล้ว */
export function withBrandCredit(text: string): string {
  if (text.includes(GO_URL_LABEL)) return text;
  return `${text.replace(/\s+$/, "")}\n${COPY_CREDIT_LINE}`;
}

/**
 * ไฟล์ภาพที่ใช้วาดลงแผ่น (อยู่ public/assistant/export โหลดจากโดเมนเดียวกัน canvas จึงไม่ถูก taint)
 * โลโก้/ตรา B เรนเดอร์จาก SVG ทางการของแบรนด์ — w/h คือสัดส่วนจริงของไฟล์ ใช้คำนวณขนาดวาดเพื่อไม่ให้โลโก้ถูกยืด
 */
export const EXPORT_ASSETS = {
  logoOnDark: { src: "/assistant/export/logo-on-dark.png", w: 634, h: 262 },
  logoOnLight: { src: "/assistant/export/logo-on-light.png", w: 634, h: 262 },
  markNavy: { src: "/assistant/export/mark-navy.png", w: 458, h: 600 },
  /** QR go: navy บนขาว 41×41 โมดูล (33 โมดูล + ขอบเงียบ 4 โมดูลรอบด้าน) ไฟล์ละ 10 จุด/โมดูล */
  qrGo: { src: "/assistant/export/qr-go.png", w: 410, h: 410 },
} as const;

export type ExportAssetKey = keyof typeof EXPORT_ASSETS;

/** จำนวนโมดูลต่อด้านของ QR รวมขอบเงียบ */
export const QR_MODULES = 41;
/**
 * ขนาด QR บนแผ่น (หน่วยจุดของเลย์เอาต์ 720) = 2.5 จุด/โมดูล → ไฟล์ส่งออก 2 เท่าได้ 205px (5px/โมดูลพอดี คมทุกโมดูล)
 * ห้ามเล็กกว่า 90 (= 180px ในไฟล์จริง) กล้องมือถือจะเริ่มสแกนไม่ติดเมื่อรูปถูกบีบอัดในแชต
 */
export const QR_SIZE = QR_MODULES * 2.5;

/**
 * ความทึบของลายน้ำตรา B (แบบ watermark) — 6% ของ navy บนพื้นขาว
 * ที่ค่านี้ตัวหนังสือ navy และเทา (muted) ที่ทับลายน้ำยังคมชัดเกิน 4.5:1 แต่ตัวหนังสือ rust จะเหลือ 4.3:1
 * แผ่นส่งออกจึงไม่ใช้ตัวหนังสือสี rust บนพื้นขาวเลย (rust ใช้เป็นขีด/แถบเท่านั้น) — มีเทสต์คุมไว้ใน brand.test.ts
 */
export const WATERMARK_ALPHA = 0.06;
/** มุมเอียงของลายน้ำ (องศา ทวนเข็มเป็นลบ) */
export const WATERMARK_ANGLE = -14;

/* ───────── ตรวจความคมชัดของสี (ใช้ในเทสต์ยืนยันว่าลายน้ำไม่ทำให้ตัวหนังสืออ่านยาก) ───────── */

function channel(hex: string, index: number): number {
  return parseInt(hex.replace("#", "").slice(index * 2, index * 2 + 2), 16);
}

/** ผสมสี fg ทึบ alpha ทับ bg (ทั้งคู่เป็น #RRGGBB) */
export function blendOver(fg: string, alpha: number, bg: string): string {
  const mix = (i: number) => Math.round(channel(fg, i) * alpha + channel(bg, i) * (1 - alpha));
  return `#${[0, 1, 2].map((i) => mix(i).toString(16).padStart(2, "0")).join("")}`;
}

function luminance(hex: string): number {
  const lin = (i: number) => {
    const c = channel(hex, i) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(0) + 0.7152 * lin(1) + 0.0722 * lin(2);
}

/** อัตราความคมชัดตาม WCAG 2.x ระหว่างสองสี */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
