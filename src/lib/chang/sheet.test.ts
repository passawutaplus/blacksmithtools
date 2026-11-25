import { describe, expect, it } from "vitest";
import { BRAND_CTA_SHORT, BRAND_FREE_NOTE, GO_URL_LABEL, QR_SIZE, WATERMARK_ALPHA, type BrandStyle } from "./brand";
import { C, W, type Painter, type TextMeasurer } from "./canvas-text";
import {
  PDF_FIT_WIDTHS,
  PDF_W,
  buildSheet,
  layoutA4,
  pageHeight,
  paginate,
  paginateSheet,
  paintPage,
  paintSheet,
  sheetHeight,
  type OrderDoc,
  type ResultDoc,
} from "./sheet";

/** ตัววัดจำลอง: ตัวละ 0.55 × ขนาดฟอนต์ (อ่านขนาดจากสตริง font) */
const measure: TextMeasurer = (text, font) => {
  const size = Number(/(\d+)px/.exec(font)?.[1] ?? 16);
  return [...text].length * size * 0.55;
};
const painter: Painter = { measure, ctx: null, thai: "sans-serif", latin: "sans-serif" };
const date = new Date(2026, 10, 25);

const items = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ name: `รายการที่ ${i + 1}`, qty: String((i + 1) * 11), unit: "ถุง", detail: i % 3 ? undefined : "ใช้จริง 12 กก." }));

const order = (n: number, extra: Partial<OrderDoc> = {}): OrderDoc => ({
  kind: "order",
  title: "คิดทั้งงานปูกระเบื้อง",
  subtitle: "ช่างปูกระเบื้อง",
  items: items(n),
  inputs: [
    { label: "กว้างห้อง", value: "4 ม." },
    { label: "ยาวห้อง", value: "5 ม." },
  ],
  date,
  ...extra,
});

const result: ResultDoc = {
  title: "เลือกขนาดสายไฟ",
  subtitle: "ช่างไฟ",
  headline: "สาย 2.5 ตร.มม. · เบรกเกอร์ 20 A",
  rows: [
    { label: "กระแสโหลด", value: "15 A" },
    { label: "ขนาดสายแนะนำ", value: "2.5 ตร.มม.", emphasize: true },
  ],
  tip: "เดินไกลให้เช็กแรงดันตกต่อ",
  date,
};

/** canvas จำลองที่จดทุกคำสั่งวาด พร้อมสถานะ (สี ความทึบ การเกลี่ยภาพ) ตอนที่สั่ง */
type Call = { op: string; args: unknown[]; fillStyle: string; alpha: number; smoothing: boolean };
function recorder() {
  const calls: Call[] = [];
  const state = { fillStyle: "", strokeStyle: "", font: "", textAlign: "left", textBaseline: "alphabetic", lineWidth: 1, globalAlpha: 1, imageSmoothingEnabled: true, imageSmoothingQuality: "low" };
  const stack: (typeof state)[] = [];
  const log = (op: string) => (...args: unknown[]) => {
    calls.push({ op, args, fillStyle: state.fillStyle, alpha: state.globalAlpha, smoothing: state.imageSmoothingEnabled });
  };
  const ctx = Object.assign(state, {
    fillRect: log("fillRect"),
    strokeRect: log("strokeRect"),
    fillText: log("fillText"),
    drawImage: log("drawImage"),
    translate: log("translate"),
    rotate: log("rotate"),
    beginPath: log("beginPath"),
    rect: log("rect"),
    clip: log("clip"),
    save: () => void stack.push({ ...state }),
    restore: () => void Object.assign(state, stack.pop()),
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}
const assets = { logoOnDark: "LOGO_DARK", logoOnLight: "LOGO_LIGHT", qrGo: "QR", markNavy: "MARK" } as unknown as NonNullable<Painter["assets"]>;

function paint(doc: OrderDoc | ResultDoc) {
  const { ctx, calls } = recorder();
  const p = { ...painter, ctx, assets };
  const height = paintSheet(p, buildSheet(p, doc));
  return { calls, height };
}
const texts = (calls: Call[]) => calls.filter((c) => c.op === "fillText").map((c) => String(c.args[0]));

describe("ใบสั่งของ", () => {
  it("ยิ่งมีรายการมากแผ่นยิ่งสูง และมีแถวว่างให้เขียนเพิ่มท้ายตาราง", () => {
    const h = (doc: OrderDoc) => sheetHeight(buildSheet(painter, doc));
    expect(h(order(8))).toBeGreaterThan(h(order(3)) + 5 * 40);
    expect(h(order(3, { blankRows: 4 }))).toBeGreaterThan(h(order(3, { blankRows: 0 })) + 4 * 40);
    expect(h(order(3))).toBe(h(order(3, { blankRows: 2 })));
  });

  it("คำเตือนระดับ C และชื่องานยาว ดันส่วนล่างลง ไม่ทับกัน", () => {
    const h = (doc: OrderDoc) => sheetHeight(buildSheet(painter, doc));
    expect(h(order(3, { disclaimer: "ต้องให้ผู้มีใบอนุญาตตรวจสอบก่อนดำเนินการ ".repeat(6) }))).toBeGreaterThan(h(order(3)) + 60);
    expect(h(order(3, { jobName: "ปูพื้นห้องนั่งเล่นและระเบียงชั้นสอง บ้านคุณสมชาย หมู่บ้านสุขใจ ".repeat(2) }))).toBeGreaterThan(h(order(3)));
  });

  it("วาดหัวตาราง ลำดับ · รายการ · จำนวน · หน่วย · หมายเหตุ/ราคา และข้อมูลทุกแถว", () => {
    const { calls, height } = paint(order(3, { jobName: "ปูพื้นห้องนอน", customer: "คุณสมชาย" }));
    const drawn = texts(calls);
    for (const label of ["ลำดับ", "รายการ", "จำนวน", "หน่วย", "หมายเหตุ / ราคา", "ชื่องาน", "ลูกค้า", "วันที่"]) expect(drawn).toContain(label);
    for (const text of ["รายการที่ 1", "รายการที่ 3", "ใช้จริง 12 กก.", "ปูพื้นห้องนอน", "คุณสมชาย", "รวม 3 รายการ"]) expect(drawn).toContain(text);
    // เลขลำดับรวมแถวว่าง 2 แถว
    expect(drawn.filter((t) => /^[1-5]$/.test(t))).toEqual(["1", "2", "3", "4", "5"]);
    expect(height).toBe(sheetHeight(buildSheet(painter, order(3, { jobName: "ปูพื้นห้องนอน", customer: "คุณสมชาย" }))));
  });
});

describe("เครดิตแบรนด์ 3 แบบ", () => {
  const styles: BrandStyle[] = ["band", "stamp", "watermark"];

  it("ทุกแบบมีโลโก้ในหัวกระดาษ และ QR go ขนาดเต็ม วาดแบบไม่เกลี่ยสี", () => {
    for (const brandStyle of styles) {
      const { calls } = paint(order(4, { brandStyle }));
      const images = calls.filter((c) => c.op === "drawImage");
      expect(images[0].args[0], brandStyle).toBe("LOGO_DARK");
      const qr = images.filter((c) => c.args[0] === "QR");
      expect(qr, brandStyle).toHaveLength(1);
      expect(qr[0].args.slice(3), brandStyle).toEqual([QR_SIZE, QR_SIZE]);
      expect(qr[0].smoothing, brandStyle).toBe(false);
      // ตำแหน่งลงครึ่งจุดพอดี → ที่ 2 เท่าทุกโมดูลลงพิกเซลเต็ม
      expect(Number.isInteger(Number(qr[0].args[1]) * 2) && Number.isInteger(Number(qr[0].args[2]) * 2), brandStyle).toBe(true);
      expect(texts(calls).some((t) => t.includes(GO_URL_LABEL)), brandStyle).toBe(true);
    }
  });

  it("โลโก้ไม่ถูกยืด: สัดส่วนกว้าง/สูงที่วาดเท่ากับไฟล์", () => {
    for (const brandStyle of styles) {
      const logos = paint(order(2, { brandStyle })).calls.filter((c) => c.op === "drawImage" && String(c.args[0]).startsWith("LOGO"));
      expect(logos.length).toBeGreaterThan(0);
      for (const logo of logos) expect(Number(logo.args[3]) / Number(logo.args[4])).toBeCloseTo(634 / 262, 5);
    }
  });

  it("แบบ watermark (ที่ใช้จริง): ลายน้ำจางวาดก่อนตัวหนังสือในเนื้อหา ท้ายแผ่นมี QR · คำเชิญ · โลโก้ชุดพื้นสว่าง", () => {
    const { calls } = paint(order(4));
    const mark = calls.findIndex((c) => c.op === "drawImage" && c.args[0] === "MARK");
    expect(mark).toBeGreaterThan(-1);
    expect(calls[mark].alpha).toBeCloseTo(WATERMARK_ALPHA);
    expect(calls.filter((c) => c.op === "rotate")).toHaveLength(1);
    const firstBodyText = calls.findIndex((c) => c.op === "fillText" && c.args[0] === "คิดทั้งงานปูกระเบื้อง");
    expect(mark).toBeLessThan(firstBodyText);
    // ความทึบกลับเป็น 1 หลังลายน้ำ — ตัวหนังสือไม่จางตาม
    expect(calls.filter((c) => c.op === "fillText").every((c) => c.alpha === 1)).toBe(true);
    const drawn = texts(calls);
    expect(drawn).toContain(BRAND_CTA_SHORT);
    expect(drawn).toContain(`${GO_URL_LABEL} · ${BRAND_FREE_NOTE}`);
    expect(calls.filter((c) => c.op === "drawImage").at(-1)?.args[0]).toBe("LOGO_LIGHT");
  });

  it("แบบอื่นไม่มีลายน้ำ", () => {
    for (const brandStyle of ["band", "stamp"] as const) {
      expect(paint(order(4, { brandStyle })).calls.some((c) => c.args[0] === "MARK")).toBe(false);
    }
  });

  it("ไม่มีตัวหนังสือสี rust เลย (rust บน navy และบนลายน้ำคมชัดไม่พอ) ทั้งใบสั่งของและแผ่นผลคำนวณ", () => {
    for (const brandStyle of styles) {
      for (const doc of [order(4, { brandStyle, disclaimer: "ตรวจกับช่างก่อน" }), { ...result, brandStyle, disclaimer: "ตรวจกับช่างก่อน" }]) {
        const rust = paint(doc).calls.filter((c) => c.op === "fillText" && c.fillStyle === C.rust);
        expect(rust.map((c) => c.args[0])).toEqual([]);
      }
    }
  });

  it("ไฟล์โลโก้โหลดไม่ได้ ยังมีชื่อแบรนด์เป็นตัวหนังสือแทน", () => {
    const { ctx, calls } = recorder();
    const p = { ...painter, ctx, assets: {} };
    paintSheet(p, buildSheet(p, order(2)));
    expect(texts(calls)).toContain("BLACKSMITH");
    expect(calls.some((c) => c.op === "drawImage")).toBe(false);
  });
});

describe("แผ่นผลคำนวณ", () => {
  it("มีวันที่ ชื่อเครื่องมือ คำตอบ และแถวผลครบ", () => {
    const drawn = texts(paint(result).calls);
    for (const text of ["เลือกขนาดสายไฟ", "สาย 2.5 ตร.มม. · เบรกเกอร์ 20 A", "ผลที่คิดได้", "ขนาดสายแนะนำ", "2.5 ตร.มม.", "ผลคำนวณ"]) expect(drawn).toContain(text);
    expect(drawn.some((t) => /2569|2026/.test(t))).toBe(true);
  });
});

describe("paginate", () => {
  const opts = { pageH: 1000, headerH: 100, footerH: 140, reserve: 30, contGap: 10 };
  const flat = (pages: number[][]) => pages.flat();

  it("ทุกบล็อกอยู่ครบ ตามลำดับ ไม่ซ้ำ", () => {
    const blocks = Array.from({ length: 60 }, (_, i) => ({ h: 30 + (i % 4) * 15 }));
    const pages = paginate(blocks, opts);
    expect(pages.length).toBeGreaterThan(2);
    expect(flat(pages)).toEqual(blocks.map((_, i) => i));
  });

  it("ไม่มีหน้าไหนล้น: หน้าทั่วไปเว้นที่เลขหน้า หน้าสุดท้ายเว้นที่ท้ายกระดาษ", () => {
    const head = { h: 36 };
    const blocks = Array.from({ length: 50 }, () => ({ h: 46, head }));
    const pages = paginate(blocks, opts);
    pages.forEach((page, index) => {
      const used = opts.headerH + (index > 0 ? opts.contGap + head.h : 0) + page.reduce((sum, i) => sum + blocks[i].h, 0);
      const limit = opts.pageH - opts.reserve - (index === pages.length - 1 ? opts.footerH : 0);
      expect(used, `หน้า ${index + 1}`).toBeLessThanOrEqual(limit);
    });
  });

  it("หัวข้อ/หัวตาราง (keep) ไม่ถูกทิ้งไว้ท้ายหน้าโดยไม่มีแถวตาม", () => {
    // 100 + 800 = 900 → หัวข้อสูง 40 ยังลงได้ แต่แถวถัดไป 60 ไม่พอ ต้องยกหัวข้อไปหน้าใหม่ด้วย
    const pages = paginate([{ h: 800 }, { h: 40, keep: true }, { h: 60 }, { h: 60 }], opts);
    expect(pages).toEqual([[0], [1, 2, 3]]);
  });

  it("ท้ายกระดาษไม่พอในหน้าสุดท้าย → ยกบล็อกท้ายไปหน้าใหม่ ไม่ปล่อยหน้าที่มีแต่ท้ายกระดาษ", () => {
    // 100 + 400 + 400 = 900 ≤ 970 แต่ท้ายกระดาษ 140 ไม่พอ
    const pages = paginate([{ h: 400 }, { h: 400 }], opts);
    expect(pages).toEqual([[0], [1]]);
    // บล็อกที่ติดกัน (keep) ไปด้วยกัน
    expect(paginate([{ h: 300 }, { h: 100, keep: true }, { h: 400 }], opts)).toEqual([[0], [1, 2]]);
  });

  it("พอดีหน้าเดียว", () => {
    expect(paginate([{ h: 200 }, { h: 300 }], opts)).toEqual([[0, 1]]);
    expect(paginate([], opts)).toEqual([[]]);
  });
});

describe("จัดลง A4", () => {
  it("สัดส่วนหน้าเป็น A4 แนวตั้ง", () => {
    expect(pageHeight(W)).toBe(1018);
    expect(pageHeight(PDF_W) / PDF_W).toBeCloseTo(297 / 210, 2);
    expect(PDF_FIT_WIDTHS[0]).toBe(PDF_W);
    expect(Math.max(...PDF_FIT_WIDTHS) / PDF_W).toBeLessThan(1.21);
  });

  it("ใบสั่งของทั่วไปจบในหน้าเดียวที่ความกว้างมาตรฐาน", () => {
    const layout = layoutA4(painter, order(7));
    expect(layout.width).toBe(PDF_W);
    expect(layout.pages).toHaveLength(1);
    expect(layout.pages[0]).toEqual(layout.sheet.body.map((_, i) => i));
  });

  it("เกินหน้าเดียวไม่มาก → ขยายแผ่นให้พอดีหน้าเดียว แทนการปล่อยหน้า 2 ที่เกือบว่าง", () => {
    // หาจำนวนรายการแรกที่ล้นหน้าเดียวที่ความกว้างมาตรฐาน
    let n = 8;
    while (paginateSheet(buildSheet({ ...painter, width: PDF_W }, order(n)), pageHeight(PDF_W)).length === 1) n++;
    const layout = layoutA4(painter, order(n));
    expect(layout.pages).toHaveLength(1);
    expect(layout.width).toBeGreaterThan(PDF_W);
    expect(sheetHeight(layout.sheet)).toBeLessThanOrEqual(layout.pageH);
  });

  it("รายการยาวมาก → หลายหน้า ใช้จำนวนหน้าน้อยที่สุดด้วยแผ่นแคบที่สุด ทุกแถวอยู่ครบ และหน้าต่อวาดหัวตารางซ้ำ", () => {
    const layout = layoutA4(painter, order(60));
    expect(layout.pages.length).toBeGreaterThanOrEqual(3);
    expect(layout.pages.flat()).toEqual(layout.sheet.body.map((_, i) => i));
    const counts = PDF_FIT_WIDTHS.map((width) => ({
      width,
      pages: paginateSheet(buildSheet({ ...painter, width }, order(60)), pageHeight(width)).length,
    }));
    const fewest = Math.min(...counts.map((c) => c.pages));
    expect(layout.pages.length).toBe(fewest);
    expect(layout.width).toBe(counts.find((c) => c.pages === fewest)?.width);

    const drawnPerPage = layout.pages.map((_, i) => {
      const { ctx, calls } = recorder();
      paintPage({ ...painter, width: layout.width, ctx, assets }, layout.sheet, layout.pages, i, layout.pageH);
      return calls;
    });
    drawnPerPage.forEach((calls, i) => {
      const drawn = texts(calls);
      expect(drawn.filter((t) => t === "รายการ"), `หัวตาราง หน้า ${i + 1}`).toHaveLength(1);
      expect(drawn).toContain(`หน้า ${i + 1}/${layout.pages.length}`);
      // โลโก้หัวกระดาษทุกหน้า · QR เฉพาะท้ายกระดาษของหน้าสุดท้าย
      expect(calls.filter((c) => c.args[0] === "LOGO_DARK")).toHaveLength(1);
      expect(calls.filter((c) => c.args[0] === "QR")).toHaveLength(i === layout.pages.length - 1 ? 1 : 0);
      // ไม่มีอะไรวาดเลยขอบล่างของหน้า
      const bottoms = calls.filter((c) => c.op === "fillText").map((c) => Number(c.args[2]));
      expect(Math.max(...bottoms)).toBeLessThanOrEqual(layout.pageH);
    });
    const allRows = drawnPerPage.flatMap((calls) => texts(calls).filter((t) => /^รายการที่ \d+$/.test(t)));
    expect(allRows).toEqual(items(60).map((i) => i.name));
  });
});
