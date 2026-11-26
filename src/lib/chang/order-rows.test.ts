import { describe, expect, it } from "vitest";
import { hasOrderRows, orderCandidates, parseQuantity, pickOrderItems } from "./order-rows";
import type { ResultRow } from "./types";

const row = (label: string, value: string, emphasize = false): ResultRow => ({ label, value, emphasize });
const selected = (rows: ResultRow[]) => pickOrderItems(orderCandidates(rows));

describe("parseQuantity", () => {
  it("อ่านจำนวน + หน่วยที่ซื้อขายกัน", () => {
    expect(parseQuantity("59 แผ่น")).toMatchObject({ qty: "59", amount: 59, unit: "แผ่น", kind: "count", rest: "" });
    expect(parseQuantity("1,760 ก้อน")).toMatchObject({ qty: "1,760", amount: 1760, unit: "ก้อน" });
    expect(parseQuantity("99.0 กก.")).toMatchObject({ qty: "99.0", amount: 99, unit: "กก.", kind: "bulk" });
    expect(parseQuantity("0.21 ลบ.ม.")).toMatchObject({ unit: "ลบ.ม.", kind: "bulk" });
    expect(parseQuantity("17.1 ม.")).toMatchObject({ unit: "ม.", kind: "bulk" });
  });

  it("เก็บข้อความต่อท้ายเป็นรายละเอียด", () => {
    expect(parseQuantity("1 ใบ (เผื่อตัด 45°)")).toMatchObject({ qty: "1", unit: "ใบ", rest: "เผื่อตัด 45°" });
    expect(parseQuantity("9 แผง × 450 W")).toMatchObject({ qty: "9", unit: "แผง", rest: "× 450 W" });
    expect(parseQuantity("96 มล. (ประมาณ 2 ขวด 50 มล.)")).toMatchObject({ qty: "96", unit: "มล.", rest: "ประมาณ 2 ขวด 50 มล." });
    expect(parseQuantity("3 เส้น Ø 80 มม.")).toMatchObject({ qty: "3", unit: "เส้น", rest: "Ø 80 มม." });
  });

  it("สเปกนำหน้า จำนวนอยู่ท้าย", () => {
    expect(parseQuantity("400 มม. × 3 ชุด")).toMatchObject({ qty: "3", unit: "ชุด", kind: "count", rest: "400 มม." });
  });

  it("ค่าที่เป็นขนาด/อัตรา/ผลวัด ไม่ใช่ของที่สั่ง", () => {
    for (const value of ["20.00 ตร.ม.", "2.5 ตร.มม.", "20 A", "18,000 BTU", "8 มม. รอบห้อง", "32 ล./นาที", "40 ลิตร/นาที", "1.8 ม./วินาที", "3.68 %", "ผ่าน", "1/4\""]) {
      expect(parseQuantity(value), value).toBeNull();
    }
  });
});

describe("orderCandidates", () => {
  it("หน้าคิดทั้งงานปูกระเบื้อง: รวมแถวขนาดบรรจุกับปริมาณของวัสดุเดียวกัน", () => {
    const rows = [
      row("จำนวนแผ่น", "59 แผ่น", true),
      row("จำนวนกล่อง", "15 กล่อง", true),
      row("เหลือเก็บซ่อม", "1 แผ่น"),
      row("ยาแนว", "2.1 กก.", true),
      row("ถุง 5 กก.", "1 ถุง", true),
      row("ปูนกาว", "99.0 กก.", true),
      row("ถุง 20 กก.", "5 ถุง", true),
      row("คลิป + ลิ่ม", "448 ชุด", true),
      row("เส้นคิ้ว", "17.1 ม.", true),
      row("ใบตัดเพชร", "1 ใบ (เผื่อตัด 45°)"),
    ];
    expect(selected(rows)).toEqual([
      { name: "จำนวนแผ่น", qty: "59", unit: "แผ่น", detail: undefined },
      { name: "จำนวนกล่อง", qty: "15", unit: "กล่อง", detail: undefined },
      { name: "ยาแนว · ถุง 5 กก.", qty: "1", unit: "ถุง", detail: "ใช้จริง 2.1 กก." },
      { name: "ปูนกาว · ถุง 20 กก.", qty: "5", unit: "ถุง", detail: "ใช้จริง 99.0 กก." },
      { name: "คลิป + ลิ่ม", qty: "448", unit: "ชุด", detail: undefined },
      { name: "เส้นคิ้ว", qty: "17.1", unit: "ม.", detail: undefined },
      { name: "ใบตัดเพชร", qty: "1", unit: "ใบ", detail: "เผื่อตัด 45°" },
    ]);
    // "เหลือเก็บซ่อม" ยังอยู่ในรายการให้ติ๊กเอง แต่ไม่ถูกเลือกให้
    const spare = orderCandidates(rows).find((c) => c.item.name === "เหลือเก็บซ่อม");
    expect(spare?.selected).toBe(false);
  });

  it("แถวขนาดบรรจุที่อยู่ติดวัสดุอื่น (หน่วยไม่ตรง/จำนวนไม่ลงตัว) ไม่ถูกรวมผิดตัว", () => {
    const rows = [
      row("จำนวนที่ต้องใช้", "1,760 ก้อน", true),
      row("ปูนซีเมนต์ 50 กก.", "2 ถุง", true),
      row("ทราย", "0.21 ลบ.ม.", true),
      row("ถุง 50 กก.", "15 ถุง", true), // ปูนฉาบ ไม่ใช่ทราย
      row("เหล็ก RB6 ประมาณ", "9.5 ม.", true),
    ];
    expect(selected(rows).map((i) => `${i.name}|${i.qty}|${i.unit}`)).toEqual([
      "จำนวนที่ต้องใช้|1,760|ก้อน",
      "ปูนซีเมนต์ 50 กก.|2|ถุง",
      "ทราย|0.21|ลบ.ม.",
      "ถุง 50 กก.|15|ถุง",
      "เหล็ก RB6 ประมาณ|9.5|ม.",
    ]);
    // หน่วยตรงแต่จำนวนถุงไม่ใช่ผลปัดขึ้นของปริมาณ ÷ ขนาดถุง → ไม่รวม
    expect(selected([row("ปูนกาว", "99.0 กก.", true), row("ถุง 20 กก.", "9 ถุง", true)]).map((i) => i.name)).toEqual([
      "ปูนกาว",
      "ถุง 20 กก.",
    ]);
  });

  it("ขนาดบรรจุแบบนับชิ้น (กล่อง 250) รวมกับจำนวนชิ้น", () => {
    const rows = [row("โซนลม", "กลางหลังคา"), row("จำนวนสกรู", "662 ตัว", true), row("กล่อง 250", "3 กล่อง")];
    expect(selected(rows)).toEqual([{ name: "จำนวนสกรู · กล่อง 250", qty: "3", unit: "กล่อง", detail: "ใช้จริง 662 ตัว" }]);
  });

  it("แถวก่อนแถวเน้นแรกเป็นค่าที่กรอก/ค่าระหว่างทาง ไม่ถูกเลือก", () => {
    const rows = [row("แผ่นประมาณ", "56 แผ่น"), row("คลิป/แผ่น", "8 ตัว"), row("คลิป + ลิ่ม", "448 ชุด", true)];
    expect(selected(rows).map((i) => i.name)).toEqual(["คลิป + ลิ่ม"]);
  });

  it("ค่าที่กรอก ผลวัด ตัวเลือกสำรอง และจำนวนที่ไม่เต็มหน่วย ไม่ใช่ของที่สั่ง", () => {
    const rows = [
      row("ปูนซีเมนต์ 50 กก.", "2 ถุง", true),
      row("ระยะเดินท่อ", "8.0 ม.", true),
      row("น้ำหนัก", "36.0 กก.", true),
      row("ปริมาตร", "50.000 ลบ.ม.", true),
      row("ถ้าใช้ปูนก่อสำเร็จแทน", "9 ถุง"),
      row("น้ำประมาณ", "31 ลิตร"),
      row("ทับหน้า", "2.74 แกลลอน (10.4 ล.)"),
      row("สั่งทับหน้า", "3 แกลลอน", true),
    ];
    expect(selected(rows).map((i) => i.name)).toEqual(["ปูนซีเมนต์ 50 กก.", "สั่งทับหน้า"]);
  });

  it("เครื่องมือที่ไม่มีของต้องซื้อ ไม่เสนอใบสั่งของ", () => {
    const hvacJob = [
      row("พื้นที่ห้อง", "20.00 ตร.ม."),
      row("BTU ที่ต้องการ", "16,000 BTU/ชม.", true),
      row("ขนาดแอร์แนะนำ", "18,000 BTU", true),
      row("เบรกเกอร์", "20 A", true),
      row("สายไฟ (ทองแดง)", "2.5 ตร.มม.", true),
      row("ค่าไฟ/เดือน", "1,512 บาท"),
    ];
    const converter = [row("ผลลัพธ์", "3.2808 ฟุต", true), row("เป็นมม.", "1,000.00 มม."), row("กิโลกรัม", "1.000 กก.", true)];
    expect(hasOrderRows(hvacJob)).toBe(false);
    expect(hasOrderRows(converter)).toBe(false);
    expect(hasOrderRows([])).toBe(false);
    // แถวที่ไม่ใช่ของยังเป็นตัวเลือกให้ติ๊กเอง: ชื่อ = ป้าย รายละเอียด = ค่า ไม่มีจำนวน
    expect(orderCandidates(hvacJob)[3]).toMatchObject({ selected: false, item: { name: "เบรกเกอร์", detail: "20 A", qty: "", unit: "" } });
  });

  it("คีย์ของแต่ละแถวไม่ซ้ำกัน แม้ป้ายซ้ำ", () => {
    const keys = orderCandidates([row("ถุง 50 กก.", "2 ถุง", true), row("ถุง 50 กก.", "15 ถุง", true)]).map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("pickOrderItems", () => {
  const candidates = orderCandidates([row("บานพับรวม", "4 ตัว", true), row("รางลิ้นชัก", "400 มม. × 3 ชุด", true), row("ระบบ", "ปิดทับเต็ม")]);

  it("ค่าเริ่มต้น = ชุดที่เลือกให้อัตโนมัติ", () => {
    expect(pickOrderItems(candidates)).toEqual([
      { name: "บานพับรวม", qty: "4", unit: "ตัว", detail: undefined },
      { name: "รางลิ้นชัก", qty: "3", unit: "ชุด", detail: "400 มม." },
    ]);
  });

  it("ผู้ใช้เอาออก/ติ๊กเพิ่มได้ ลำดับยังตามแถวผลลัพธ์", () => {
    const picked = pickOrderItems(candidates, { [candidates[0].key]: false, [candidates[2].key]: true });
    expect(picked.map((i) => i.name)).toEqual(["รางลิ้นชัก", "ระบบ"]);
    expect(picked[1]).toMatchObject({ qty: "", unit: "", detail: "ปิดทับเต็ม" });
  });
});
