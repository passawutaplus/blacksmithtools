import type { JobDef, ToolDef, Values } from "../types";
import { fmt, guardTool, invalidResult, num, resultX, str } from "../math";
import { UNIT } from "../constants";

const guard = (id: string, v: Values) => guardTool(generalTools, id, v);

const LENGTH: Record<string, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  km: 1_000_000,
  in: 25.4,
  hun: 3.175,
  ft: 304.8,
  yd: 914.4,
};

export function convertLength(value: number, from: string, to: string): number {
  const mm = value * (LENGTH[from] ?? 1);
  return mm / (LENGTH[to] ?? 1);
}

export function calcLen(v: Values) {
  const bad = guard("unit-length", v);
  if (bad) return bad;
  const x = num(v, "x", 1);
  const from = str(v, "from", "m");
  const to = str(v, "to", "ft");
  const y = convertLength(x, from, to);
  const hun = convertLength(x, from, "hun");
  return resultX({
    title: "แปลงหน่วยความยาว",
    headline: `${fmt(x, 4)} ${labelLen(from)} = ${fmt(y, 4)} ${labelLen(to)}`,
    rows: [
      { label: "ผลลัพธ์", value: `${fmt(y, 4)} ${labelLen(to)}`, emphasize: true },
      { label: "เป็นหุน", value: `${fmt(hun, 2)} หุน` },
      { label: "เป็นมม.", value: `${fmt(convertLength(x, from, "mm"), 2)} มม.` },
      { label: "เป็นนิ้ว", value: `${fmt(convertLength(x, from, "in"), 3)} นิ้ว` },
    ],
    tip: "1 นิ้ว = 8 หุน = 25.4 มม. ช่างไม้ไทยยังใช้หุนบ่อย",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "แปลงทุกหน่วยความยาวผ่านมิลลิเมตรเป็นตัวกลาง (base unit) แล้วคูณ/หารด้วยตัวคูณของหน่วยปลายทาง",
      steps: [
        { label: "แปลงเป็นมม. (ตัวกลาง)", expr: "มม. = ค่า × ตัวคูณของหน่วยต้นทาง", subst: `${fmt(x, 4)} ${labelLen(from)} = ${fmt(convertLength(x, from, "mm"), 2)} มม.` },
        { label: "แปลงจากมม.เป็นหน่วยปลายทาง", expr: "ผลลัพธ์ = มม. ÷ ตัวคูณของหน่วยปลายทาง", subst: `${fmt(convertLength(x, from, "mm"), 2)} มม. = ${fmt(y, 4)} ${labelLen(to)}` },
      ],
      assumptions: ["1 นิ้ว = 25.4 มม. พอดี (นิยามสากล) 1 หุน = 1/8 นิ้ว ตามธรรมเนียมช่างไม้ไทย"],
      caveats: ["หน่วย 'หุน' ที่ช่างไม้/ช่างทองใช้ในแต่ละงานอาจมีนิยามต่างกันเล็กน้อย ควรเทียบให้ตรงกับที่ทีมงานใช้ก่อนตัดวัสดุจริง"],
      refs: [{ label: "มาตราแปลงหน่วยความยาวสากล (SI) และหน่วยช่างไม้ไทย" }],
    },
  });
}

function labelLen(k: string) {
  const m: Record<string, string> = {
    mm: "มม.",
    cm: "ซม.",
    m: "ม.",
    km: "กม.",
    in: "นิ้ว",
    hun: "หุน",
    ft: "ฟุต",
    yd: "หลา",
  };
  return m[k] ?? k;
}

export function calcAreaVol(v: Values) {
  const bad = guard("unit-area-vol", v);
  if (bad) return bad;
  const x = num(v, "x", 1);
  const kind = str(v, "kind", "area");
  const from = kind === "vol" ? str(v, "fromVol", "m3") : str(v, "fromArea", "m2");
  const to = kind === "vol" ? str(v, "toVol", "L") : str(v, "toArea", "ft2");
  const ft = UNIT.foot.value;
  const area: Record<string, number> = { m2: 1, cm2: 0.0001, ft2: ft * ft, wa: UNIT.sqWa.value };
  const vol: Record<string, number> = { m3: 1, L: 0.001, gal: UNIT.gallon.value / 1000, ft3: ft * ft * ft };
  const unitName: Record<string, string> = {
    m2: "ตร.ม.",
    cm2: "ตร.ซม.",
    ft2: "ตร.ฟุต",
    wa: "ตร.วา",
    m3: "ลบ.ม.",
    L: "ลิตร",
    gal: "แกลลอน",
    ft3: "ลบ.ฟุต",
  };
  const table = kind === "vol" ? vol : area;
  if (!(from in table) || !(to in table)) {
    return invalidResult("เลือกหน่วยให้ตรงชนิด — พื้นที่แปลงกับพื้นที่ ปริมาตรแปลงกับปริมาตร");
  }
  const si = x * (table[from] ?? 1);
  const y = si / (table[to] ?? 1);
  return resultX({
    title: "แปลงพื้นที่และปริมาตร",
    headline: `${fmt(x, 4)} ${unitName[from]} = ${fmt(y, 4)} ${unitName[to]}`,
    rows: [{ label: "ผลลัพธ์", value: `${fmt(y, 4)} ${unitName[to]}`, emphasize: true }],
    tip: kind === "vol" ? "1 คิว = 1 ลบ.ม. = 1,000 ลิตร" : "1 ตารางวา = 4 ตร.ม.",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: `แปลง${kind === "vol" ? "ปริมาตร" : "พื้นที่"}ผ่านหน่วย SI (${kind === "vol" ? "ลบ.ม." : "ตร.ม."}) เป็นตัวกลาง แล้วคูณ/หารด้วยตัวคูณของหน่วยปลายทาง`,
      steps: [
        { label: `แปลงเป็น${kind === "vol" ? "ลบ.ม." : "ตร.ม."} (ตัวกลาง)`, expr: "SI = ค่า × ตัวคูณหน่วยต้นทาง", subst: `${fmt(x, 4)} → ${fmt(si, 4)}` },
        { label: "แปลงเป็นหน่วยปลายทาง", expr: "ผลลัพธ์ = SI ÷ ตัวคูณหน่วยปลายทาง", subst: `${fmt(si, 6)} ${kind === "vol" ? "ลบ.ม." : "ตร.ม."} → ${fmt(y, 4)} ${unitName[to]}` },
      ],
      assumptions: ["1 ตารางวา = 4 ตร.ม. (มาตราไทย) · 1 แกลลอน = แกลลอนสหรัฐ (US gal) = 3.785 ลิตร"],
      caveats: ["หน่วยที่ดินไทย (วา/งาน/ไร่) มีลำดับซ้อนกัน ถ้าต้องการแปลงเป็นไร่-งาน-วา ให้ใช้เครื่องมือแปลงพื้นที่ดินแยกต่างหากเพื่อความชัดเจน"],
      refs: [{ label: "มาตราแปลงหน่วยพื้นที่/ปริมาตรสากล (SI) และมาตราไทย" }],
    },
  });
}

export function calcWeightForce(v: Values) {
  const bad = guard("unit-weight", v);
  if (bad) return bad;
  const x = num(v, "x", 1);
  const from = str(v, "from", "kg");
  const mass: Record<string, number> = { kg: 1, g: 0.001, lb: 0.453592, t: 1000 };
  const kg = x * (mass[from] ?? 1);
  return resultX({
    title: "แปลงน้ำหนักและแรง",
    rows: [
      { label: "กิโลกรัม", value: `${fmt(kg, 3)} กก.`, emphasize: true },
      { label: "ปอนด์", value: `${fmt(kg / 0.453592, 3)} lb` },
      { label: "ตัน", value: `${fmt(kg / 1000, 4)} ตัน` },
      { label: "นิวตัน (บนโลก)", value: `${fmt(kg * UNIT.gravity.value, 2)} N` },
      { label: "kgf", value: `${fmt(kg, 3)} kgf` },
    ],
    tip: "น้ำหนักกับมวลคนละอย่าง แต่หน้างานช่างพูดปนกัน ตารางนี้แปลงให้ครบ",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "แปลงมวลผ่านหน่วยกิโลกรัมเป็นตัวกลาง แล้วแปลงเป็นแรง (นิวตัน) โดยคูณด้วยความเร่งโน้มถ่วง g ≈ 9.81 ม./วินาที²",
      steps: [
        { label: "แปลงเป็นกิโลกรัม", expr: "กก. = ค่า × ตัวคูณหน่วยต้นทาง", subst: `${fmt(x, 3)} → ${fmt(kg, 3)} กก.` },
        { label: "แปลงมวลเป็นแรง", expr: `N = กก. × ${UNIT.gravity.value}`, subst: `${fmt(kg, 3)} × ${UNIT.gravity.value} = ${fmt(kg * UNIT.gravity.value, 2)} N` },
      ],
      assumptions: ["kgf (กิโลกรัมแรง) มีค่าตัวเลขเท่ากับมวลเป็นกิโลกรัม เพราะนิยามจากแรงโน้มถ่วงมาตรฐานบนโลก"],
      caveats: ["มวลไม่เปลี่ยนตามตำแหน่ง แต่น้ำหนัก/แรงเปลี่ยนตาม g ของพื้นที่นั้น (ปกติถือ g=9.81 ม./วินาที² สำหรับใช้งานทั่วไปบนพื้นโลก)"],
      refs: [{ label: "มาตราแปลงหน่วยมวลและแรงสากล (SI/Imperial)" }],
    },
  });
}

export function calcForce(v: Values) {
  const bad = guard("force", v);
  if (bad) return bad;
  const m = num(v, "m", 100);
  const g = num(v, "g", UNIT.gravity.value);
  const n = m * g;
  return resultX({
    title: "มวล → แรง",
    headline: `${fmt(n, 1)} N`,
    rows: [
      { label: "มวล", value: `${fmt(m, 2)} กก.` },
      { label: "g", value: `${fmt(g, 3)} ม./วินาที²` },
      { label: "แรง", value: `${fmt(n, 1)} N`, emphasize: true },
      { label: "กิโลนิวตัน", value: `${fmt(n / 1000, 3)} kN` },
      { label: "kgf", value: `${fmt(n / UNIT.gravity.value, 2)} kgf` },
      { label: "lbf", value: `${fmt(n / 4.448, 2)} lbf` },
    ],
    tip: "F = m·g ใช้ตอนคิดโหลดคร่าว ๆ ไม่แทนแบบวิศวกร",
    explain: {
      risk: "B",
      updatedAt: "2026-08-21",
      summary: "แรงที่เกิดจากมวลภายใต้ความเร่งโน้มถ่วง คำนวณตรงจากกฎข้อสองของนิวตัน F = m×g",
      steps: [{ label: "แรงจากมวล", expr: "F = m × g", subst: `${fmt(m, 2)} × ${fmt(g, 3)} = ${fmt(n, 1)} N` }],
      assumptions: ["ใช้ g = 9.81 ม./วินาที² เป็นค่ามาตรฐานบนพื้นโลก (ปรับได้ในช่องกรอก)"],
      caveats: ["นี่คือแรงโน้มถ่วงสถิต (static load) ใช้ประมาณโหลดคร่าว ๆ เท่านั้น งานรับแรงจริงต้องคิดโหลดพลวัต (dynamic/impact load) และ safety factor โดยวิศวกรโครงสร้าง"],
      refs: [{ label: "กฎการเคลื่อนที่ข้อที่สองของนิวตัน (F = ma)" }],
    },
  });
}

export function calcGeometry(v: Values) {
  const bad = guard("geometry", v);
  if (bad) return bad;
  const shape = str(v, "shape", "rect");
  const a = num(v, "a", 4);
  const b = num(v, "b", 5);
  const h = num(v, "h", 2.5);
  let area = 0;
  let vol = 0;
  if (shape === "rect") {
    area = a * b;
    vol = a * b * h;
  } else if (shape === "tri") {
    area = 0.5 * a * b;
    vol = area * h;
  } else if (shape === "circle") {
    area = Math.PI * (a / 2) ** 2;
    vol = area * h;
  } else if (shape === "cyl") {
    area = 2 * Math.PI * a * h + 2 * Math.PI * a * a;
    vol = Math.PI * a * a * h;
  } else if (shape === "cone") {
    vol = (1 / 3) * Math.PI * a * a * h;
    area = Math.PI * a * (a + Math.sqrt(h * h + a * a));
  } else {
    vol = (1 / 3) * a * a * h;
    area = a * a + 2 * a * Math.sqrt((a / 2) ** 2 + h * h);
  }
  const shapeName: Record<string, string> = {
    rect: "สี่เหลี่ยม/กล่อง (พื้นที่ = ก×ข, ปริมาตร = ก×ข×สูง)",
    tri: "สามเหลี่ยม (พื้นที่ = ½×ก×ข, ปริมาตร = พื้นที่×สูง)",
    circle: "วงกลม (พื้นที่ = π×รัศมี²)",
    cyl: "ทรงกระบอก (ปริมาตร = π×รัศมี²×สูง)",
    cone: "กรวย (ปริมาตร = ⅓×π×รัศมี²×สูง)",
    pyr: "พีระมิดฐานสี่เหลี่ยม (ปริมาตร = ⅓×ฐาน²×สูง)",
  };
  return resultX({
    title: "คณิตศาสตร์รูปทรง",
    rows: [
      { label: "พื้นที่", value: `${fmt(area, 3)} ตร.ม.`, emphasize: true },
      { label: "ปริมาตร", value: `${fmt(vol, 3)} ลบ.ม.`, emphasize: true },
    ],
    tip: "กรอกเป็นเมตร จะได้ตารางเมตรและลูกบาศก์เมตรตรง ๆ",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: `ใช้สูตรเรขาคณิตมาตรฐานของรูปทรง${shapeName[shape] ?? shape} คำนวณพื้นที่ผิว/หน้าตัดและปริมาตรตรงจากค่าที่กรอก`,
      steps: [{ label: "สูตรที่ใช้", expr: shapeName[shape] ?? shape, subst: `พื้นที่ ${fmt(area, 3)} ตร.ม. · ปริมาตร ${fmt(vol, 3)} ลบ.ม.` }],
      assumptions: ["กรอกทุกค่าเป็นหน่วยเมตรเพื่อให้ผลลัพธ์เป็นตารางเมตร/ลูกบาศก์เมตรตรงตัว ไม่ต้องแปลงหน่วยซ้ำ"],
      caveats: ["รูปทรงในความเป็นจริงที่ไม่สมบูรณ์แบบ (ผิวเอียง/ไม่เท่ากันทุกด้าน) ควรแบ่งเป็นรูปทรงย่อยแล้วคำนวณรวมทีละส่วนเพื่อความแม่นยำ"],
      refs: [{ label: "สูตรเรขาคณิตพื้นฐาน (พื้นที่และปริมาตรของรูปทรงมาตรฐาน)" }],
    },
  });
}

export function calcTriangle(v: Values) {
  const bad = guard("triangle", v);
  if (bad) return bad;
  const mode = str(v, "mode", "hyp");
  const a = num(v, "a", 3);
  const b = num(v, "b", 4);
  if (mode === "hyp") {
    const c = Math.sqrt(a * a + b * b);
    const ang = (Math.atan(a / b) * 180) / Math.PI;
    const slope = (a / b) * 100;
    return resultX({
      title: "พีทาโกรัสและมุม",
      headline: `ระยะทแยง ${fmt(c, 3)} ม.`,
      rows: [
        { label: "ด้านตรงข้ามมุมฉาก", value: `${fmt(c, 3)} ม.`, emphasize: true },
        { label: "มุม", value: `${fmt(ang, 1)}°` },
        { label: "ความชัน", value: `${fmt(slope, 1)}%` },
      ],
      tip: "ใช้จับฉากหลังคา บันได และเดินท่อขึ้นชั้น",
      explain: {
        risk: "A",
        updatedAt: "2026-08-21",
        summary: "ใช้ทฤษฎีบทพีทาโกรัส c² = a² + b² หาด้านตรงข้ามมุมฉาก แล้วหามุมด้วยฟังก์ชัน arctan และความชันเป็นสัดส่วนร้อยละ",
        steps: [
          { label: "ด้านตรงข้ามมุมฉาก", expr: "c = √(a² + b²)", subst: `√(${fmt(a, 2)}² + ${fmt(b, 2)}²) = ${fmt(c, 3)} ม.` },
          { label: "มุมเอียง", expr: "θ = arctan(a/b)", subst: `arctan(${fmt(a, 2)}/${fmt(b, 2)}) = ${fmt(ang, 1)}°` },
        ],
        assumptions: ["A และ B เป็นด้านประกอบมุมฉากของสามเหลี่ยมมุมฉากจริง (ตั้งฉากกัน 90°)"],
        caveats: ["ใช้จับฉากหน้างานได้แม่นยำเมื่อวัดด้าน A และ B ตรงและถูกตำแหน่งจริง ถ้าตั้งฉากไม่แม่นตั้งแต่แรก มุมที่คำนวณได้จะผิดตามไปด้วย"],
        refs: [{ label: "ทฤษฎีบทพีทาโกรัส (Pythagorean Theorem) — คณิตศาสตร์พื้นฐาน" }],
      },
    });
  }
  if (a <= b) {
    return invalidResult("ด้านทแยง (A) ต้องยาวกว่าด้านฉาก (B) — ตรวจว่ากรอกถูกช่อง");
  }
  const c = Math.sqrt(a * a - b * b);
  return resultX({
    title: "พีทาโกรัสและมุม",
    headline: `ด้านที่เหลือ ${fmt(c, 3)} ม.`,
    rows: [{ label: "ด้านที่หา", value: `${fmt(c, 3)} ม.`, emphasize: true }],
    tip: "ใส่ด้านตรงข้ามมุมฉากในช่อง A และด้านที่รู้ในช่อง B",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "หาด้านประกอบมุมฉากที่เหลือจากด้านตรงข้ามมุมฉากและอีกด้านที่รู้ ด้วยทฤษฎีบทพีทาโกรัสในรูปสลับที่",
      steps: [{ label: "ด้านที่เหลือ", expr: "b = √(c² − a²)", subst: `√(${fmt(a, 2)}² − ${fmt(b, 2)}²) = ${fmt(c, 3)} ม.` }],
      assumptions: ["ช่อง A คือด้านตรงข้ามมุมฉาก (ด้านที่ยาวที่สุด) ต้องยาวกว่าช่อง B เสมอ ไม่เช่นนั้นผลลัพธ์จะเป็น 0"],
      caveats: ["ถ้ากรอกด้าน A สั้นกว่าหรือเท่ากับ B ระบบจะตัดผลลัพธ์เป็น 0 เพราะไม่เป็นสามเหลี่ยมมุมฉากที่ถูกต้องแล้ว ให้ตรวจสอบว่ากรอกด้านถูกช่อง"],
      refs: [{ label: "ทฤษฎีบทพีทาโกรัส (Pythagorean Theorem) — คณิตศาสตร์พื้นฐาน" }],
    },
  });
}

const lenOpts = [
  { value: "mm", label: "มม." },
  { value: "cm", label: "ซม." },
  { value: "m", label: "ม." },
  { value: "km", label: "กม." },
  { value: "in", label: "นิ้ว" },
  { value: "hun", label: "หุน" },
  { value: "ft", label: "ฟุต" },
  { value: "yd", label: "หลา" },
];

export const generalTools: ToolDef[] = [
  {
    id: "unit-length",
    name: "แปลงหน่วยความยาว",
    blurb: "นิ้ว หุน ฟุต มม. ซม. ม.",
    fields: [
      { type: "number", key: "x", label: "ค่า", default: 1, min: 0, max: 1000000000, step: 0.001 },
      { type: "select", key: "from", label: "จาก", default: "m", options: lenOpts },
      { type: "select", key: "to", label: "เป็น", default: "ft", options: lenOpts },
    ],
    calc: calcLen,
  },
  {
    id: "unit-area-vol",
    name: "แปลงพื้นที่และปริมาตร",
    blurb: "ตร.ม. ตร.ฟุต คิว ลิตร แกลลอน",
    fields: [
      {
        type: "select",
        key: "kind",
        label: "ชนิด",
        default: "area",
        options: [
          { value: "area", label: "พื้นที่" },
          { value: "vol", label: "ปริมาตร" },
        ],
      },
      { type: "number", key: "x", label: "ค่า", default: 1, min: 0, max: 1000000000, step: 0.001 },
      {
        type: "select",
        key: "fromArea",
        when: { key: "kind", is: "area" },
        label: "จาก (พื้นที่)",
        default: "m2",
        options: [
          { value: "m2", label: "ตร.ม." },
          { value: "cm2", label: "ตร.ซม." },
          { value: "ft2", label: "ตร.ฟุต" },
          { value: "wa", label: "ตร.วา" },
        ],
      },
      {
        type: "select",
        key: "toArea",
        when: { key: "kind", is: "area" },
        label: "เป็น (พื้นที่)",
        default: "ft2",
        options: [
          { value: "m2", label: "ตร.ม." },
          { value: "cm2", label: "ตร.ซม." },
          { value: "ft2", label: "ตร.ฟุต" },
          { value: "wa", label: "ตร.วา" },
        ],
      },
      {
        type: "select",
        key: "fromVol",
        when: { key: "kind", is: "vol" },
        label: "จาก (ปริมาตร)",
        default: "m3",
        options: [
          { value: "m3", label: "ลบ.ม. / คิว" },
          { value: "L", label: "ลิตร" },
          { value: "gal", label: "แกลลอน" },
          { value: "ft3", label: "ลูกบาศก์ฟุต" },
        ],
      },
      {
        type: "select",
        key: "toVol",
        when: { key: "kind", is: "vol" },
        label: "เป็น (ปริมาตร)",
        default: "L",
        options: [
          { value: "m3", label: "ลบ.ม. / คิว" },
          { value: "L", label: "ลิตร" },
          { value: "gal", label: "แกลลอน" },
          { value: "ft3", label: "ลูกบาศก์ฟุต" },
        ],
      },
    ],
    calc: calcAreaVol,
  },
  {
    id: "unit-weight",
    name: "แปลงน้ำหนักและแรง",
    blurb: "กก. ปอนด์ ตัน นิวตัน",
    fields: [
      { type: "number", key: "x", label: "ค่า", default: 1, min: 0, max: 1000000000, step: 0.001 },
      {
        type: "select",
        key: "from",
        label: "หน่วย",
        default: "kg",
        options: [
          { value: "kg", label: "กก." },
          { value: "g", label: "กรัม" },
          { value: "lb", label: "ปอนด์" },
          { value: "t", label: "ตัน" },
        ],
      },
    ],
    calc: calcWeightForce,
  },
  {
    id: "force",
    name: "มวล → แรง",
    blurb: "F = m·g",
    fields: [
      { type: "number", key: "m", label: "มวล", unit: "กก.", default: 100, min: 0, max: 1000000, step: 0.1 },
      { type: "number", key: "g", label: "ความเร่งโน้มถ่วง (g)", unit: "ม./วินาที²", default: 9.80665, min: 1, max: 30, step: 0.00001 },
    ],
    calc: calcForce,
  },
  {
    id: "geometry",
    name: "คณิตศาสตร์รูปทรง",
    blurb: "พื้นที่และปริมาตร",
    fields: [
      {
        type: "select",
        key: "shape",
        label: "รูป",
        default: "rect",
        options: [
          { value: "rect", label: "สี่เหลี่ยม / ห้อง" },
          { value: "tri", label: "สามเหลี่ยม" },
          { value: "circle", label: "วงกลม (ใส่เส้นผ่านศูนย์กลางที่ ก)" },
          { value: "cyl", label: "ทรงกระบอก (รัศมี ก, สูง)" },
          { value: "cone", label: "กรวย" },
          { value: "pyr", label: "พีระมิดฐานสี่เหลี่ยม" },
        ],
      },
      { type: "number", key: "a", label: "ก / กว้าง / รัศมี", unit: "ม.", default: 4, min: 0, max: 10000, step: 0.01 },
      { type: "number", key: "b", label: "ข / ยาว / สูงสามเหลี่ยม", unit: "ม.", default: 5, min: 0, max: 10000, step: 0.01 },
      { type: "number", key: "h", label: "สูง / ลึก", unit: "ม.", default: 2.5, min: 0, max: 10000, step: 0.01 },
    ],
    calc: calcGeometry,
  },
  {
    id: "triangle",
    name: "พีทาโกรัสและมุม",
    blurb: "ทแยง มุม ความชัน",
    fields: [
      {
        type: "select",
        key: "mode",
        label: "หาอะไร",
        default: "hyp",
        options: [
          { value: "hyp", label: "หาด้านทแยง จากสองด้านฉาก" },
          { value: "leg", label: "หาด้านฉาก จากทแยงกับอีกด้าน" },
        ],
      },
      { type: "number", key: "a", label: "ด้าน A (โหมดหาฉาก = ทแยง)", unit: "ม.", default: 3, min: 0, max: 10000, step: 0.01 },
      { type: "number", key: "b", label: "ด้าน B", unit: "ม.", default: 4, min: 0.01, max: 10000, step: 0.01 },
    ],
    calc: calcTriangle,
  },
];

export const generalJob: JobDef = {
  name: "แปลงหน่วยด่วน",
  blurb: "ความยาวที่ใช้บ่อยบนหน้างาน",
  fields: generalTools[0].fields,
  calc: calcLen,
};
