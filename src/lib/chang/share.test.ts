import { describe, expect, it } from "vitest";
import { paintResultImage, resultFileName, wrapLines, type TextMeasurer } from "./share";

/** ตัววัดจำลอง: ตัวละ 0.6 × ขนาดฟอนต์ (อ่านขนาดจากสตริง font) */
const measure: TextMeasurer = (text, font) => {
  const size = Number(/(\d+)px/.exec(font)?.[1] ?? 16);
  return [...text].length * size * 0.6;
};
const painter = { measure, ctx: null, thai: "sans-serif", latin: "sans-serif" };

describe("resultFileName", () => {
  it("มีรหัสเครื่องมือและวันที่ เป็น ASCII ล้วน", () => {
    expect(resultFileName("electrical/cable", new Date(2026, 10, 25))).toBe("blacksmith-electrical-cable-2026-11-25.png");
    expect(resultFileName("general/unit-area-vol", new Date(2026, 0, 5))).toBe("blacksmith-general-unit-area-vol-2026-01-05.png");
    expect(resultFileName("hvac/job", new Date(2026, 0, 5))).toBe("blacksmith-hvac-job-2026-01-05.png");
  });
  it("ชื่อแปลก/ว่าง ไม่ทำให้ชื่อไฟล์พัง", () => {
    expect(resultFileName("", new Date(2026, 0, 5))).toBe("blacksmith-result-2026-01-05.png");
    expect(resultFileName("../..\\x:*?", new Date(2026, 0, 5))).toBe("blacksmith-x-2026-01-05.png");
    expect(resultFileName("สายไฟ", new Date(2026, 0, 5))).toBe("blacksmith-result-2026-01-05.png");
  });
});

describe("wrapLines", () => {
  it("ไม่มีบรรทัดไหนกว้างเกินที่กำหนด และไม่มีตัวอักษรหาย", () => {
    const text = "ผลนี้เป็นค่าประมาณเบื้องต้น งานไฟฟ้าต้องให้ช่างที่มีใบอนุญาตตรวจหน้างานจริงก่อนลงมือทุกครั้ง";
    const font = "400 13px sans-serif";
    const lines = wrapLines(measure, text, font, 200);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(measure(line, font)).toBeLessThanOrEqual(200);
    expect(lines.join("").replace(/\s/g, "")).toBe(text.replace(/\s/g, ""));
  });

  it("บรรทัดไม่ขึ้นต้นด้วยสระบน/วรรณยุกต์ที่หลุดจากพยัญชนะ", () => {
    const lines = wrapLines(measure, "น้ำยาที่ต้องเติมเพิ่มเป็นกรัมทั้งสิ้น", "400 13px sans-serif", 40);
    for (const line of lines) expect(/^[ัิ-ฺ็-๎]/.test(line)).toBe(false);
  });
});

describe("paintResultImage", () => {
  const base = {
    title: "เลือกขนาดสายไฟ",
    headline: "ใช้สาย THW 2.5 ตร.มม. + เบรกเกอร์ 20 A",
    rows: [
      { label: "กระแสโหลด", value: "16 A" },
      { label: "สายที่แนะนำ", value: "THW 2.5 ตร.มม.", emphasize: true },
    ],
    tip: "เดินไกลเกิน 30 ม. เช็กแรงดันตกเพิ่ม",
    date: new Date(2026, 10, 25),
  };

  it("คำเตือนยาวขึ้น รูปต้องสูงขึ้น (คำเตือนไม่ไปทับส่วนอื่น)", () => {
    const plain = paintResultImage(painter, base);
    const short = paintResultImage(painter, { ...base, disclaimer: "ตรวจกับช่างก่อน" });
    const long = paintResultImage(painter, { ...base, disclaimer: "ตรวจกับช่างที่มีใบอนุญาตก่อนลงมือทุกครั้ง ".repeat(8) });
    expect(short).toBeGreaterThan(plain);
    expect(long).toBeGreaterThan(short + 60);
  });

  it("หัวข้อคำตอบยาวหลายบรรทัดก็ดันส่วนล่างลง", () => {
    const one = paintResultImage(painter, base);
    const many = paintResultImage(painter, { ...base, headline: base.headline.repeat(5) });
    expect(many).toBeGreaterThan(one + 30);
  });

  it("ใส่ค่าที่กรอกแล้วรูปสูงขึ้นตามจำนวนแถว", () => {
    const none = paintResultImage(painter, base);
    const two = paintResultImage(painter, {
      ...base,
      inputs: [
        { label: "กว้าง", value: "4 ม." },
        { label: "ยาว", value: "5 ม." },
      ],
    });
    expect(two).toBeGreaterThan(none + 60);
  });
});
