import { describe, expect, it } from "vitest";
import { describeInputs, mergeSavedValues } from "./saved-values";
import { parsePathList } from "./storage";
import type { Field } from "./types";

const fields: Field[] = [
  { type: "number", key: "w", label: "กว้าง", unit: "ม.", min: 1, default: 4 },
  { type: "select", key: "room", label: "ประเภทห้อง", default: "living", options: [
    { value: "living", label: "ห้องนั่งเล่น" },
    { value: "bed", label: "ห้องนอน" },
  ] },
  { type: "bool", key: "top", label: "ชั้นบนสุด", default: false },
  { type: "number", key: "extra", label: "เฉพาะห้องนอน", default: 1, when: { key: "room", is: "bed" } },
];

describe("mergeSavedValues", () => {
  it("ไม่มีของเดิม/ข้อมูลเสีย = ค่าเริ่มต้น", () => {
    const defaults = { w: 4, room: "living", top: false, extra: 1 };
    expect(mergeSavedValues(fields, null)).toEqual(defaults);
    expect(mergeSavedValues(fields, "{not json")).toEqual(defaults);
    expect(mergeSavedValues(fields, "[1,2,3]")).toEqual(defaults);
    expect(mergeSavedValues(fields, '"text"')).toEqual(defaults);
  });

  it("ค่าที่จำไว้ชนะค่าเริ่มต้น (รีโหลดแล้วไม่โดนทับ)", () => {
    const saved = JSON.stringify({ w: 7.5, room: "bed", top: true });
    expect(mergeSavedValues(fields, saved)).toEqual({ w: 7.5, room: "bed", top: true, extra: 1 });
  });

  it("ช่องว่างและค่าที่ไม่ใช่ตัวเลขยังอยู่ ไม่เด้งกลับค่าเริ่มต้น", () => {
    expect(mergeSavedValues(fields, JSON.stringify({ w: "" })).w).toBe("");
    expect(Number.isNaN(mergeSavedValues(fields, JSON.stringify({ w: Number.NaN })).w)).toBe(true);
  });

  it("ทิ้งคีย์แปลกปลอมและชนิดที่ไม่ตรง", () => {
    const saved = JSON.stringify({ w: "<script>", room: "nope", top: "yes", hack: 1, __proto__: { x: 1 } });
    expect(mergeSavedValues(fields, saved)).toEqual({ w: 4, room: "living", top: false, extra: 1 });
  });
});

describe("describeInputs", () => {
  it("แสดงเฉพาะช่องที่มองเห็น พร้อมหน่วยและชื่อตัวเลือก", () => {
    expect(describeInputs(fields, { w: 4.5, room: "living", top: true, extra: 9 })).toEqual([
      { key: "w", label: "กว้าง", value: "4.5 ม." },
      { key: "room", label: "ประเภทห้อง", value: "ห้องนั่งเล่น" },
      { key: "top", label: "ชั้นบนสุด", value: "ใช่" },
    ]);
  });
  it("ข้ามช่องตัวเลขที่ยังว่าง", () => {
    expect(describeInputs(fields, { w: "", room: "bed", top: false, extra: 2 }).map((i) => i.key)).toEqual(["room", "top", "extra"]);
  });
});

describe("parsePathList", () => {
  it("ตัดความยาวตอนอ่าน ทิ้งของที่ไม่ใช่ข้อความ/ซ้ำ", () => {
    const big = JSON.stringify(["hvac/btu", "hvac/btu", 5, null, ...Array.from({ length: 50000 }, (_, i) => `x/${i}`)]);
    const list = parsePathList(big, 40);
    expect(list).toHaveLength(40);
    expect(list[0]).toBe("hvac/btu");
    expect(list[1]).toBe("x/0");
  });
  it("ข้อมูลเสีย = รายการว่าง", () => {
    expect(parsePathList("{", 8)).toEqual([]);
    expect(parsePathList('{"a":1}', 8)).toEqual([]);
    expect(parsePathList(null, 8)).toEqual([]);
  });
});
