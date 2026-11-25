/**
 * คัดลอก / แชร์ข้อความผลคำนวณ
 * ทุกฟังก์ชันคืนผลลัพธ์ให้หน้าจอบอกผู้ใช้ได้ว่าสำเร็จหรือไม่ — ห้ามล้มเหลวเงียบ
 *
 * ส่วนส่งออกเป็นไฟล์แยกไปอยู่ที่: canvas-text.ts (วาดข้อความ) · sheet.ts (เลย์เอาต์ผลคำนวณ/ใบสั่งของ)
 * · export-file.ts (PNG / PDF / ส่งรูปเข้าแชต) — ท้ายไฟล์นี้ส่งชื่อเดิมต่อให้โค้ดที่เรียกอยู่
 */
import { buildSheet, paintSheet, type ResultDoc } from "./sheet";
import type { Painter } from "./canvas-text";

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

/* ───────── รูปผลคำนวณ ───────── */

export type ResultImageOptions = ResultDoc;
export type { Painter, TextMeasurer } from "./canvas-text";
export { formatThaiDate, wrapLines } from "./canvas-text";
export { resultFileName } from "./export-file";

/** วาด (หรือแค่วัด เมื่อ p.ctx เป็น null) รูปผลคำนวณ คืนความสูงทั้งหมด */
export function paintResultImage(p: Painter, opts: ResultImageOptions): number {
  return paintSheet(p, buildSheet(p, opts));
}
