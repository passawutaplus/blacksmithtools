import { describe, expect, it } from "vitest";
import { draftMatchesValue, formatFieldNumber, normalizeNumberText, parseNumberInput, toFieldValue } from "./number-input";

const num = (s: string) => {
  const p = parseNumberInput(s);
  return p.kind === "number" ? p.value : p.kind;
};

describe("parseNumberInput", () => {
  it("อ่านเลขปกติ", () => {
    expect(num("4")).toBe(4);
    expect(num("4.5")).toBe(4.5);
    expect(num(" 2.60 ")).toBe(2.6);
    expect(num(".5")).toBe(0.5);
    expect(num("4.")).toBe(4);
    expect(num("-3")).toBe(-3);
  });

  it("4,5 ต้องเป็น 4.5 ไม่ใช่ 45", () => {
    expect(num("4,5")).toBe(4.5);
    expect(num("12,75")).toBe(12.75);
    expect(num("0,5")).toBe(0.5);
    expect(num("0,500")).toBe(0.5);
    expect(num("4,")).toBe(4);
  });

  it("คอมมาคั่นหลักพันยังใช้ได้", () => {
    expect(num("1,500")).toBe(1500);
    expect(num("18,000")).toBe(18000);
    expect(num("1,234,567.5")).toBe(1234567.5);
  });

  it("เลขไทย", () => {
    expect(num("๓")).toBe(3);
    expect(num("๔.๕")).toBe(4.5);
    expect(num("๔,๕")).toBe(4.5);
    expect(num("๑๘,๐๐๐")).toBe(18000);
    expect(normalizeNumberText("๐๑๒๓๔๕๖๗๘๙")).toBe("0123456789");
  });

  it("ช่องว่างคือยังไม่กรอก", () => {
    expect(num("")).toBe("empty");
    expect(num("   ")).toBe("empty");
  });

  it("ตีความไม่ได้ต้องบอกว่าไม่ใช่ตัวเลข ไม่เดา", () => {
    for (const bad of ["abc", "4,5,6", "1,2.3,4", "4..5", "-", ".", "1e5", "4x5", "4,5.6.7", "12,34,567"]) {
      expect(num(bad), bad).toBe("invalid");
    }
  });
});

describe("ค่าที่เก็บในฟอร์ม", () => {
  it("toFieldValue", () => {
    expect(toFieldValue(parseNumberInput(""))).toBe("");
    expect(toFieldValue(parseNumberInput("4,5"))).toBe(4.5);
    expect(Number.isNaN(toFieldValue(parseNumberInput("abc")))).toBe(true);
  });

  it("draftMatchesValue คงข้อความที่พิมพ์ไว้เมื่อค่ายังตรงกัน", () => {
    expect(draftMatchesValue("4.", 4)).toBe(true);
    expect(draftMatchesValue("4,5", 4.5)).toBe(true);
    expect(draftMatchesValue("๓", 3)).toBe(true);
    expect(draftMatchesValue("", "")).toBe(true);
    expect(draftMatchesValue("abc", Number.NaN)).toBe(true);
    expect(draftMatchesValue("4", 5)).toBe(false);
    expect(draftMatchesValue("abc", 5)).toBe(false);
    expect(draftMatchesValue("", 5)).toBe(false);
  });

  it("formatFieldNumber", () => {
    expect(formatFieldNumber(4.5)).toBe("4.5");
    expect(formatFieldNumber("")).toBe("");
    expect(formatFieldNumber(Number.NaN)).toBe("");
    expect(formatFieldNumber(undefined)).toBe("");
  });
});
