import type { Field, JobDef, ToolDef, Values } from "../types";
import {
  blockedResult,
  ceil,
  fmt,
  fmtInchFraction,
  fmtTrim,
  guardInputs,
  guardTool,
  inchFraction,
  invalidResult,
  num,
  resultX,
  str,
} from "../math";
import { DISCLAIMER_AB, RAILING, SPACING, TRADE_LEN, UNIT } from "../constants";

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

/** ละเอียดสุดของเศษส่วนนิ้วที่ตลับเมตรช่างอ่านได้ */
const INCH_DEN = 16;

/**
 * ความยาวแบบที่ช่างพูด: "7 ฟุต 10 1/2 นิ้ว" (ปัดเข้าเศษส่วนนิ้วใกล้สุด 1/16)
 * สั้นกว่า 1 ฟุตตอบเป็นนิ้วเศษส่วนอย่างเดียว เช่น "3/4 นิ้ว"
 */
export function feetInchText(mm: number): string {
  const f = inchFraction(mm / UNIT.inch.value, INCH_DEN);
  const feet = Math.floor(f.whole / 12);
  const restIn = f.whole - feet * 12 + f.num / f.den;
  if (feet === 0) return `${fmtInchFraction(restIn, INCH_DEN)} นิ้ว`;
  return restIn === 0 ? `${fmt(feet)} ฟุต` : `${fmt(feet)} ฟุต ${fmtInchFraction(restIn, INCH_DEN)} นิ้ว`;
}

/** นิ้วเศษส่วนใกล้สุด + หุน + ระยะที่คลาดจากค่าจริง เช่น 19 มม. → "3/4 นิ้ว (6 หุน) · ต่างจากค่าจริง 0.05 มม." */
export function inchHunText(mm: number): string {
  const f = inchFraction(mm / UNIT.inch.value, INCH_DEN);
  const inches = f.whole + f.num / f.den;
  const diff = Math.abs(inches * UNIT.inch.value - mm);
  return `${fmtInchFraction(inches, INCH_DEN)} นิ้ว (${fmtTrim(inches * 8, 1)} หุน) · ต่างจากค่าจริง ${fmt(diff, 2)} มม.`;
}

/** แถวหน่วยช่างของความยาวหนึ่งค่า (มม.) — ยาวเกิน 1 ฟุตตอบเป็นฟุต-นิ้ว สั้นกว่านั้นตอบเป็นนิ้วเศษส่วน + หุน */
function tradeLengthRows(mm: number) {
  const inches = mm / UNIT.inch.value;
  if (inches * INCH_DEN < 0.5) return [];
  return inches >= 12
    ? [{ label: "ฟุต-นิ้ว (ใกล้สุด 1/16 นิ้ว)", value: feetInchText(mm) }]
    : [{ label: "นิ้วเศษส่วนใกล้สุด", value: inchHunText(mm) }];
}

export function calcLen(v: Values) {
  const bad = guard("unit-length", v);
  if (bad) return bad;
  const x = num(v, "x", 1);
  const from = str(v, "from", "m");
  const to = str(v, "to", "ft");
  const y = convertLength(x, from, to);
  const mm = convertLength(x, from, "mm");
  return resultX({
    title: "แปลงหน่วยความยาว",
    headline: `${fmt(x, 4)} ${labelLen(from)} = ${fmt(y, 4)} ${labelLen(to)}`,
    rows: [
      { label: "ผลลัพธ์", value: `${fmt(y, 4)} ${labelLen(to)}`, emphasize: true },
      ...tradeLengthRows(mm),
      { label: "เป็นมม.", value: `${fmt(mm, 2)} มม.` },
      { label: "เป็นนิ้ว", value: `${fmt(convertLength(x, from, "in"), 3)} นิ้ว` },
    ],
    tip: "1 นิ้ว = 8 หุน = 25.4 มม. ยาวเกิน 1 ฟุตจะบอกเป็นฟุต-นิ้วแบบที่อ่านจากตลับเมตร",
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
  const fromName: Record<string, string> = { kg: "กก.", g: "กรัม", lb: "ปอนด์", t: "ตัน" };
  return resultX({
    title: "แปลงน้ำหนักและแรง",
    headline:
      from === "kg"
        ? `${fmt(kg, 3)} กก. = ${fmt(kg / 0.453592, 3)} ปอนด์`
        : `${fmt(x, 3)} ${fromName[from] ?? from} = ${fmt(kg, 3)} กก.`,
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
    headline: `พื้นที่ ${fmt(area, 2)} ตร.ม. · ปริมาตร ${fmt(vol, 2)} ลบ.ม. (คิว)`,
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

/* ─────────────── นิ้ว-หุน-เศษส่วน ↔ มม. (อ่านข้อความที่ช่างพิมพ์) ─────────────── */

type TradeUnit = "ft" | "in" | "hun" | "mm" | "cm" | "m";

const TRADE_UNIT_MM: Record<TradeUnit, () => number> = {
  ft: () => UNIT.foot.value * 1000,
  in: () => UNIT.inch.value,
  hun: () => UNIT.inch.value / TRADE_LEN.hunPerInch.value,
  mm: () => 1,
  cm: () => 10,
  m: () => 1000,
};

const TRADE_UNIT_NAME: Record<TradeUnit, string> = { ft: "ฟุต", in: "นิ้ว", hun: "หุน", mm: "มม.", cm: "ซม.", m: "ม." };

/** คำหน่วยที่ช่างพิมพ์ — เรียงคำยาวก่อนคำสั้น (มม. ก่อน ม. · inch ก่อน in) */
const TRADE_UNIT_WORDS: Array<[RegExp, TradeUnit]> = [
  [/^(ฟุต|feet|foot|ft|')/, "ft"],
  [/^(นิ้ว|inches|inch|in|")/, "in"],
  [/^หุน/, "hun"],
  [/^(มม\.?|มิลลิเมตร|มิล|mm)/, "mm"],
  [/^(ซม\.?|เซนติเมตร|เซนต์|เซน|cm)/, "cm"],
  [/^(เมตร|ม\.?|m)/, "m"],
];

const UNICODE_FRACTIONS: Record<string, string> = { "½": "1/2", "¼": "1/4", "¾": "3/4", "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8" };

export type TradeLengthPart = { value: number; unit: TradeUnit };

/**
 * อ่านความยาวแบบที่ช่างพิมพ์: 1 1/2" · 1-1/2 นิ้ว · 3/4 · 6 หุน · 19 มม. · 7' 10½" · 7 ฟุต 10 1/2 นิ้ว · นิ้วครึ่ง
 * - ตัวเลขไม่มีหน่วยใช้หน่วยตาม `bare` — ยกเว้นตัวเลขที่ตามหลังฟุต ถือเป็นนิ้ว (7' 10 = 7 ฟุต 10 นิ้ว)
 * - อ่านไม่ออกตรงไหนต้องบอก ห้ามเดา
 */
export function parseTradeLength(raw: string, bare: TradeUnit = "in"): { mm: number; parts: TradeLengthPart[] } | { error: string } {
  let s = raw.trim().toLowerCase();
  if (!s) return { error: "พิมพ์ขนาดก่อน เช่น 1 1/2\" · 6 หุน · 19 มม." };
  if (s.startsWith("-")) return { error: "ความยาวติดลบไม่ได้" };
  s = s.replace(/[½¼¾⅛⅜⅝⅞]/g, (ch) => ` ${UNICODE_FRACTIONS[ch]}`);
  s = s.replace(/[”″“]/g, '"').replace(/[’′‘]/g, "'");
  s = s.replace(/(\d),(\d{3})(?!\d)/g, "$1$2");

  const parts: TradeLengthPart[] = [];
  let rest = s;
  const skipSeparators = () => {
    rest = rest.replace(/^[\s,+\-]+/, "");
  };
  while (true) {
    skipSeparators();
    if (!rest) break;
    let value: number | null = null;
    const frac = rest.match(/^(\d+)\s*\/\s*(\d+)/);
    const mixed = rest.match(/^(\d+(?:\.\d+)?)(?:(?:\s+|-)(\d+)\s*\/\s*(\d+))?/);
    if (frac) {
      if (Number(frac[2]) === 0) return { error: `เศษส่วน ${frac[0]} หารศูนย์ไม่ได้` };
      value = Number(frac[1]) / Number(frac[2]);
      rest = rest.slice(frac[0].length);
    } else if (mixed) {
      value = Number(mixed[1]);
      if (mixed[2] !== undefined) {
        if (Number(mixed[3]) === 0) return { error: `เศษส่วน ${mixed[2]}/${mixed[3]} หารศูนย์ไม่ได้` };
        value += Number(mixed[2]) / Number(mixed[3]);
      }
      rest = rest.slice(mixed[0].length);
    }
    rest = rest.replace(/^\s+/, "");
    let unit: TradeUnit | null = null;
    for (const [re, u] of TRADE_UNIT_WORDS) {
      const m = rest.match(re);
      if (m) {
        unit = u;
        rest = rest.slice(m[0].length);
        break;
      }
    }
    if (value === null) {
      // "นิ้วครึ่ง" / "ฟุตครึ่ง" — ไม่มีตัวเลขนำหน้าแปลว่า 1
      if (unit === "in" || unit === "ft") value = 1;
      else return { error: `อ่านไม่ออกตรง "${rest.slice(0, 12)}" — พิมพ์แบบ 1 1/2" · 6 หุน · 19 มม.` };
    }
    if (unit && /^\s*ครึ่ง/.test(rest)) {
      value += 0.5;
      rest = rest.replace(/^\s*ครึ่ง/, "");
    }
    if (!unit) {
      const prev = parts[parts.length - 1];
      if (prev?.unit === "ft") unit = "in";
      else if (parts.length === 0) unit = bare;
      else return { error: `ตัวเลข ${fmtTrim(value, 3)} ไม่มีหน่วย — ใส่หน่วยต่อท้าย เช่น นิ้ว หุน มม.` };
    }
    parts.push({ value, unit });
  }
  if (parts.length === 0) return { error: "พิมพ์ขนาดก่อน เช่น 1 1/2\" · 6 หุน · 19 มม." };
  const mm = parts.reduce((sum, p) => sum + p.value * TRADE_UNIT_MM[p.unit](), 0);
  if (!(mm > 0)) return { error: "ความยาวต้องมากกว่าศูนย์" };
  if (mm > TRADE_LEN.maxMm.value) return { error: `ยาวเกิน ${fmt(TRADE_LEN.maxMm.value / 1000)} ม. — เครื่องมือนี้ไว้แปลงขนาดหน้างาน` };
  return { mm, parts };
}

function partText(p: TradeLengthPart): string {
  if (p.unit === "in" || p.unit === "ft") {
    const sixteenths = p.value * TRADE_LEN.fractionDen.value;
    if (Math.abs(sixteenths - Math.round(sixteenths)) < 1e-9) return `${fmtInchFraction(p.value, TRADE_LEN.fractionDen.value)} ${TRADE_UNIT_NAME[p.unit]}`;
  }
  return `${fmtTrim(p.value, 3)} ${TRADE_UNIT_NAME[p.unit]}`;
}

export function calcInchText(v: Values) {
  const bad = guard("inch", v);
  if (bad) return bad;
  const raw = str(v, "q", '1 1/2"');
  const bare = str(v, "bare", "in") as TradeUnit;
  const parsed = parseTradeLength(raw, bare in TRADE_UNIT_MM ? bare : "in");
  if ("error" in parsed) return invalidResult(parsed.error, { q: parsed.error }, 'ตัวอย่างที่อ่านได้: 1 1/2" · 3/4 · 6 หุน · 19 มม. · 7\' 10½" · นิ้วครึ่ง');
  const { mm, parts } = parsed;
  const read = parts.map(partText).join(" ");
  const inches = mm / UNIT.inch.value;
  const den = TRADE_LEN.fractionDen.value;
  const hunExact = inches * TRADE_LEN.hunPerInch.value;
  const fracText = fmtInchFraction(inches, den);
  const roundedIn = inchFraction(inches, den);
  const tooSmall = roundedIn.whole === 0 && roundedIn.num === 0;
  const metricOnly = parts.every((p) => p.unit === "mm" || p.unit === "cm" || p.unit === "m");
  const hunRounded = fmtTrim((roundedIn.whole + roundedIn.num / roundedIn.den) * TRADE_LEN.hunPerInch.value, 1);
  const tradeText = inches >= 12 ? feetInchText(mm) : `${fracText} นิ้ว (${hunRounded} หุน)`;
  return resultX({
    title: "นิ้ว-หุน-เศษส่วน ↔ มม.",
    headline: tooSmall ? `${read} = ${fmt(mm, 2)} มม.` : `${metricOnly ? read : `${read} = ${fmtTrim(mm, 2)} มม.`} ≈ ${tradeText}`,
    rows: [
      { label: "อ่านได้ว่า", value: read },
      { label: "มิลลิเมตร", value: `${fmt(mm, 2)} มม.`, emphasize: true },
      ...(tooSmall ? [] : [{ label: "นิ้วเศษส่วนใกล้สุด (1/16)", value: inchHunText(mm), emphasize: true }]),
      { label: "หุน (ไม่ปัด)", value: `${fmt(hunExact, 2)} หุน` },
      { label: "นิ้ว (ทศนิยม)", value: `${fmt(inches, 3)} นิ้ว` },
      { label: "เซนติเมตร", value: `${fmt(mm / 10, 2)} ซม.` },
      ...(inches >= 12 ? [{ label: "ฟุต-นิ้ว (ใกล้สุด 1/16 นิ้ว)", value: feetInchText(mm) }] : []),
    ],
    tip: "ท่อ ข้อต่อ ดอกสว่าน ที่เรียกเป็นหุน/นิ้วคือขนาดเรียก ไม่ใช่ Ø จริงเสมอไป — วัดของจริงก่อนสั่งตัด",
    explain: {
      risk: "A",
      updatedAt: "2026-11-25",
      summary: "อ่านตัวเลขกับหน่วยทีละส่วน แปลงเป็นมิลลิเมตรแล้วรวมกัน จากนั้นแปลงกลับเป็นนิ้วเศษส่วนใกล้สุด 1/16 นิ้ว และหุน (1 หุน = 1/8 นิ้ว)",
      steps: [
        {
          label: "แปลงแต่ละส่วนเป็นมม.",
          expr: "ฟุต × 304.8 · นิ้ว × 25.4 · หุน × 3.175 · ซม. × 10 · ม. × 1,000",
          subst: `${parts.map((p) => `${partText(p)} = ${fmt(p.value * TRADE_UNIT_MM[p.unit](), 2)} มม.`).join(" + ")} → ${fmt(mm, 2)} มม.`,
        },
        {
          label: "เป็นนิ้วเศษส่วน",
          expr: `นิ้ว = มม. ÷ 25.4 แล้วปัดเข้า 1/${den} นิ้วใกล้สุด`,
          subst: `${fmt(mm, 2)} ÷ 25.4 = ${fmt(inches, 3)} นิ้ว ≈ ${fracText} นิ้ว`,
        },
        {
          label: "เป็นหุน",
          expr: `หุน = นิ้ว × ${TRADE_LEN.hunPerInch.value}`,
          subst: `${fmt(inches, 3)} × ${TRADE_LEN.hunPerInch.value} = ${fmt(hunExact, 2)} หุน`,
        },
      ],
      constants: [UNIT.inch, UNIT.foot, TRADE_LEN.hunPerInch, TRADE_LEN.fractionDen],
      assumptions: [
        `ตัวเลขที่ไม่มีหน่วยนับเป็น${TRADE_UNIT_NAME[bare in TRADE_UNIT_MM ? bare : "in"]} ยกเว้นตัวเลขที่ตามหลังฟุตนับเป็นนิ้ว (7' 10 = 7 ฟุต 10 นิ้ว)`,
        "1 หุน = 1/8 นิ้ว ตามที่ช่างไทยใช้กับท่อ เหล็กเส้น และดอกสว่าน",
      ],
      caveats: [
        "เศษส่วนนิ้วปัดเข้า 1/16 นิ้วใกล้สุด คลาดได้ไม่เกิน 0.8 มม. งานที่ต้องเป๊ะกว่านั้นให้ยึดค่ามิลลิเมตร",
        "ขนาดท่อ/ข้อต่อเป็นขนาดเรียก เช่น ท่อ 4 หุน Ø นอกไม่ใช่ 12.7 มม. — เทียบตารางของชนิดท่อนั้น",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "นิยามหน่วยสากล (ISO 80000) · หน่วยช่างไทย (หุน = 1/8 นิ้ว)" }],
    },
  });
}

/* ─────────────── แบ่งระยะเท่า ๆ กัน ─────────────── */

export type SpacingEnds = "gap" | "member";

/**
 * แบ่งระยะรวมให้ช่องว่างเท่ากัน
 * - ends = "gap": ปลายทั้งสองเป็นช่อง (ลูกกรงระหว่างเสา) → n ชิ้น มี n + 1 ช่อง
 * - ends = "member": มีชิ้นชิดปลายทั้งสองข้าง (โครงคร่าว ชั้นวางรวมบน-ล่าง) → n ชิ้น มี n − 1 ช่อง
 * คืนตำแหน่งขอบซ้ายของแต่ละชิ้น วัดจากปลายซ้ายทุกจุด (ไม่ใช่วัดต่อกัน)
 */
export function equalSpacing(total: number, width: number, n: number, ends: SpacingEnds) {
  const gaps = ends === "gap" ? n + 1 : n - 1;
  const gap = gaps > 0 ? (total - n * width) / gaps : NaN;
  const starts = Array.from({ length: n }, (_, i) => (ends === "gap" ? (i + 1) * gap + i * width : i * (gap + width)));
  return { gap, gaps, pitch: gap + width, starts };
}

/** จำนวนชิ้นน้อยสุดที่ทำให้ช่องว่างไม่เกิน maxGap */
export function countForMaxGap(total: number, width: number, maxGap: number, ends: SpacingEnds): number {
  if (ends === "gap") return Math.max(1, ceil((total - maxGap) / (maxGap + width)));
  return Math.max(2, ceil((total + maxGap) / (maxGap + width)));
}

export function calcSpacing(v: Values) {
  const bad = guard("spacing", v);
  if (bad) return bad;
  const total = num(v, "total", 2000);
  const width = num(v, "w", 20);
  const mode = str(v, "mode", "count");
  const ends = (str(v, "ends", "gap") === "member" ? "member" : "gap") as SpacingEnds;
  const mark = str(v, "mark", "edge");
  const maxGap = num(v, "maxGap", 100);
  const n = mode === "maxgap" ? countForMaxGap(total, width, maxGap, ends) : Math.round(num(v, "n", 9));
  if (ends === "member" && n < 2) {
    return blockedResult({
      headline: "แบบมีชิ้นชิดปลายทั้งสองข้าง ต้องมีอย่างน้อย 2 ชิ้น",
      tip: "ใส่จำนวนชิ้นตั้งแต่ 2 ขึ้นไป หรือเปลี่ยนเป็นแบบปลายทั้งสองเป็นช่อง",
    });
  }
  if (n * width >= total) {
    return blockedResult({
      headline: `${fmt(n)} ชิ้น × กว้าง ${fmtTrim(width, 1)} มม. = ${fmt(n * width)} มม. ไม่น้อยกว่าระยะรวม ${fmt(total)} มม. — ไม่เหลือช่อง`,
      tip: "ลดจำนวนชิ้น ใช้ชิ้นที่แคบลง หรือตรวจว่าใส่ระยะรวมเป็น มม.",
    });
  }
  const sp = equalSpacing(total, width, n, ends);
  const positions = sp.starts.map((x) => (mark === "center" ? x + width / 2 : x));
  const maxMarks = SPACING.maxMarks.value;
  const shown = positions.slice(0, maxMarks).map((x) => fmt(x));
  const markLabel = mark === "center" ? "มาร์กกึ่งกลางชิ้น (วัดจากปลายซ้าย)" : "มาร์กขอบซ้ายชิ้น (วัดจากปลายซ้าย)";
  const railNote = sp.gap > RAILING.maxGapCm.value * 10;
  return resultX({
    title: "แบ่งระยะเท่า ๆ กัน",
    headline: `${fmt(n)} ชิ้น · ช่องละ ${fmtTrim(sp.gap, 1)} มม.`,
    rows: [
      ...(mode === "maxgap" ? [{ label: "ช่องไม่เกิน", value: `${fmtTrim(maxGap, 1)} มม. → ใช้ ${fmt(n)} ชิ้น` }] : []),
      { label: "จำนวนชิ้น", value: `${fmt(n)} ชิ้น · ${fmt(sp.gaps)} ช่อง` },
      { label: "ช่องว่างจริง", value: `${fmtTrim(sp.gap, 1)} มม.`, emphasize: true },
      { label: "ระยะศูนย์ถึงศูนย์ (c/c)", value: `${fmtTrim(sp.pitch, 1)} มม.` },
      {
        label: markLabel,
        value: `${shown.join(" · ")} มม.${positions.length > maxMarks ? ` (แสดง ${fmt(maxMarks)} จุดแรกจาก ${fmt(positions.length)})` : ""}`,
        emphasize: true,
      },
    ],
    tip: railNote
      ? `ทุกจุดวัดจากปลายซ้ายจุดเดียว อย่าวัดต่อทีละช่อง ระยะจะคลาดสะสม · ถ้าเป็นลูกกรงราวกันตก ช่องต้องไม่เกิน ${fmt(RAILING.maxGapCm.value)} ซม.`
      : "ทุกจุดวัดจากปลายซ้ายจุดเดียว อย่าวัดต่อทีละช่อง ระยะจะคลาดสะสม",
    explain: {
      risk: "A",
      updatedAt: "2026-11-25",
      summary:
        ends === "gap"
          ? "ปลายทั้งสองเป็นช่อง: ช่อง = (ระยะรวม − จำนวน × กว้างชิ้น) ÷ (จำนวน + 1)"
          : "มีชิ้นชิดปลายทั้งสองข้าง: ช่อง = (ระยะรวม − จำนวน × กว้างชิ้น) ÷ (จำนวน − 1)",
      steps: [
        ...(mode === "maxgap"
          ? [
              {
                label: "หาจำนวนชิ้นน้อยสุด",
                expr: ends === "gap" ? "n = ปัดขึ้น((ระยะรวม − ช่องสูงสุด) ÷ (ช่องสูงสุด + กว้างชิ้น))" : "n = ปัดขึ้น((ระยะรวม + ช่องสูงสุด) ÷ (ช่องสูงสุด + กว้างชิ้น))",
                subst: `${fmt(total)} ${ends === "gap" ? "−" : "+"} ${fmtTrim(maxGap, 1)} ÷ (${fmtTrim(maxGap, 1)} + ${fmtTrim(width, 1)}) → ${fmt(n)} ชิ้น`,
              },
            ]
          : []),
        {
          label: "ช่องว่างจริง",
          expr: `ช่อง = (ระยะรวม − n × กว้างชิ้น) ÷ ${ends === "gap" ? "(n + 1)" : "(n − 1)"}`,
          subst: `(${fmt(total)} − ${fmt(n)} × ${fmtTrim(width, 1)}) ÷ ${fmt(sp.gaps)} = ${fmtTrim(sp.gap, 2)} มม.`,
        },
        {
          label: "ตำแหน่งชิ้นที่ i",
          expr: ends === "gap" ? "ขอบซ้าย = i × ช่อง + (i − 1) × กว้างชิ้น" : "ขอบซ้าย = (i − 1) × (ช่อง + กว้างชิ้น)",
          subst: `ชิ้นแรก ${fmt(positions[0])} มม. · ชิ้นสุดท้าย ${fmt(positions[positions.length - 1])} มม.${mark === "center" ? " (กึ่งกลาง = ขอบซ้าย + กว้าง ÷ 2)" : ""}`,
        },
      ],
      constants: [SPACING.maxMarks],
      assumptions: ["ระยะรวมคือระยะในระหว่างของสองข้าง (เช่น ระหว่างผิวเสา) ไม่ใช่ศูนย์เสาถึงศูนย์เสา", "ตำแหน่งปัดเป็นมิลลิเมตรเต็มทีละจุด ไม่ปัดสะสม"],
      caveats: ["ของจริงกว้างไม่เท่าสเปก (เหล็กกล่อง ไม้) วัดชิ้นจริงมาใส่ก่อนมาร์ก", DISCLAIMER_AB],
      refs: [{ label: "เรขาคณิตพื้นฐาน — แบ่งช่วงเท่ากัน" }],
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

/* ═══════════════ รอบ 4 (2026-11-26): ความชัน · ไร่-งาน-วา · ปริมาตรถัง · เทียบราคาต่อหน่วย ═══════════════ */

const RAD = Math.PI / 180;

/** องศาทศนิยม → องศา-ลิปดา-ฟิลิปดา เช่น 4.7636 → "4° 45′ 49″" (ปัดฟิลิปดาครั้งเดียว) */
export function degText(deg: number): string {
  const totalSec = Math.round(deg * 3600);
  const d = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec - d * 3600) / 60);
  const s = totalSec - d * 3600 - m * 60;
  return `${d}° ${m}′ ${s}″`;
}

/** ความชันในรูปต่าง ๆ จาก tanθ (ยก ÷ ราบ) */
export function slopeForms(tan: number) {
  const deg = Math.atan(tan) / RAD;
  return { tan, pct: tan * 100, deg, n: 1 / tan, perM: tan * 100 };
}

export function calcSlopeConvert(v: Values) {
  const bad = guard("slope", v);
  if (bad) return bad;
  const mode = str(v, "mode", "ratio");
  const len = num(v, "len", 3);
  let tan: number;
  let given: string;
  if (mode === "pct") {
    const pct = num(v, "pct", 2);
    tan = pct / 100;
    given = `${fmtTrim(pct, 4)}%`;
  } else if (mode === "deg") {
    const deg = num(v, "deg", 30);
    tan = Math.tan(deg * RAD);
    given = `${fmtTrim(deg, 4)}°`;
  } else if (mode === "rise") {
    const rise = num(v, "rise", 25);
    const run = num(v, "run", 3);
    tan = rise / 100 / run;
    given = `ยก ${fmtTrim(rise, 2)} ซม. ในระยะราบ ${fmtTrim(run, 3)} ม.`;
  } else {
    const n = num(v, "n", 12);
    tan = 1 / n;
    given = `1:${fmtTrim(n, 4)}`;
  }
  const f = slopeForms(tan);
  const riseLen = len * tan;
  const slopeLen = len * Math.sqrt(1 + tan * tan);
  return resultX({
    title: "แปลงความชัน",
    headline: [
      given,
      ...(mode === "pct" ? [] : [`${fmtTrim(f.pct, 3)}%`]),
      ...(mode === "deg" ? [] : [`${fmtTrim(f.deg, 3)}°`]),
      ...(mode === "ratio" ? [] : [f.n >= 1 ? `1:${fmtTrim(f.n, 3)}` : `${fmtTrim(tan, 3)}:1`]),
    ].join(" = "),
    rows: [
      { label: "เปอร์เซ็นต์", value: `${fmtTrim(f.pct, 4)}%`, emphasize: true },
      { label: "องศา", value: `${fmtTrim(f.deg, 4)}° (${degText(f.deg)})`, emphasize: true },
      { label: "อัตราส่วน ยก : ราบ", value: f.n >= 1 ? `1:${fmtTrim(f.n, 3)}` : `${fmtTrim(tan, 3)}:1 (ยกมากกว่าราบ)`, emphasize: true },
      { label: "ยกต่อระยะราบ 1 ม.", value: `${fmtTrim(f.perM, 3)} ซม. (${fmtTrim(f.perM * 10, 2)} มม./ม.)` },
      { label: `ระยะราบ ${fmtTrim(len, 3)} ม. ต้องยก`, value: `${fmtTrim(riseLen * 100, 2)} ซม.` },
      { label: `ความยาวตามแนวเอียง (ราบ ${fmtTrim(len, 3)} ม.)`, value: `${fmtTrim(slopeLen, 4)} ม.` },
    ],
    tip: "ทางลาดคนพิการตามกฎกระทรวงต้องไม่ชันกว่า 1:12 · ท่อน้ำทิ้งในบ้านใช้ราว 1:50 ถึง 1:100 ดูเครื่องมือความลาดท่อในสายงานประปา",
    explain: {
      risk: "A",
      updatedAt: "2026-11-26",
      summary: "ทุกรูปแบบมาจากค่าเดียวคือ ยก ÷ ราบ (tanθ): % = tanθ × 100 · องศา = arctan(tanθ) · 1:n โดย n = 1 ÷ tanθ",
      steps: [
        { label: "ยก ÷ ราบ", expr: "tanθ จากค่าที่กรอก", subst: `${given} → tanθ = ${fmtTrim(tan, 6)}` },
        { label: "เปอร์เซ็นต์", expr: "% = tanθ × 100", subst: `${fmtTrim(tan, 6)} × 100 = ${fmtTrim(f.pct, 4)}%` },
        { label: "องศา", expr: "θ = arctan(tanθ)", subst: `arctan(${fmtTrim(tan, 6)}) = ${fmtTrim(f.deg, 4)}°` },
        { label: "1:n", expr: "n = 1 ÷ tanθ", subst: `1 ÷ ${fmtTrim(tan, 6)} = ${fmtTrim(f.n, 4)}` },
        { label: "ยกตามระยะ", expr: "ยก = ระยะราบ × tanθ · แนวเอียง = ระยะราบ × √(1 + tan²θ)", subst: `${fmtTrim(len, 3)} × ${fmtTrim(tan, 6)} = ${fmtTrim(riseLen, 4)} ม. · แนวเอียง ${fmtTrim(slopeLen, 4)} ม.` },
      ],
      assumptions: ["ระยะราบวัดตามแนวนอน ไม่ใช่ตามแนวเอียง"],
      caveats: ["100% = 45° ไม่ใช่ 90° — ระวังอ่านสลับ", DISCLAIMER_AB],
      refs: [{ label: "ตรีโกณมิติพื้นฐาน (tan, arctan)" }, { label: "กฎกระทรวงกำหนดสิ่งอำนวยความสะดวกในอาคารสำหรับผู้พิการฯ (ทางลาด 1:12)" }],
    },
  });
}

/* ── ไร่-งาน-ตารางวา ── */

/**
 * ตร.ม. → ไร่ งาน ตร.วา (1 ไร่ = 4 งาน = 400 ตร.วา = 1,600 ตร.ม. · 1 ตร.วา = 4 ตร.ม.)
 * ปัดตารางวาเป็นทศนิยม 2 ตำแหน่งก่อนแตกหน่วย กัน "99.999 ตร.วา" ปัดขึ้นเป็น 100 แล้วไม่ทดเป็นงาน
 */
export function raiNganWa(m2: number) {
  const wa = m2 / UNIT.sqWa.value;
  const cents = Math.round(wa * 100);
  const waPerRai = UNIT.rai.value / UNIT.sqWa.value;
  const waPerNgan = UNIT.ngan.value / UNIT.sqWa.value;
  const rai = Math.floor(cents / (waPerRai * 100));
  const ngan = Math.floor((cents - rai * waPerRai * 100) / (waPerNgan * 100));
  const restWa = (cents - rai * waPerRai * 100 - ngan * waPerNgan * 100) / 100;
  return { wa, rai, ngan, restWa };
}

/**
 * พิมพ์ตารางวา: ปกติทศนิยม 2 ตำแหน่ง แต่พื้นที่เล็กกว่า 1 ตร.วา ให้ละเอียดขึ้น (ไม่เกิน 4 ตำแหน่ง)
 * กัน 0.01 ตร.ม. = 0.0025 ตร.วา ขึ้นเป็น "0 ตร.วา"
 */
export function waText(wa: number): string {
  return `${fmtTrim(wa, Math.abs(wa) < 1 ? 4 : 2)} ตร.วา`;
}

export function raiText(m2: number): string {
  const r = raiNganWa(m2);
  const parts = [] as string[];
  if (r.rai > 0) parts.push(`${fmt(r.rai)} ไร่`);
  if (r.ngan > 0) parts.push(`${fmt(r.ngan)} งาน`);
  // ไม่ถึง 1 ตร.วา และไม่มีไร่/งาน: ใช้ค่าตารางวาเต็มความละเอียด (ไม่ใช้ค่าที่ปัดเป็นสตางค์ของตารางวาแล้ว)
  if (parts.length === 0 && r.wa < 1) return waText(r.wa);
  if (r.restWa > 0 || parts.length === 0) parts.push(`${fmtTrim(r.restWa, 2)} ตร.วา`);
  return parts.join(" ");
}

export function calcRai(v: Values) {
  const bad = guard("rai", v);
  if (bad) return bad;
  const mode = str(v, "mode", "m2");
  let m2: number;
  let given: string;
  if (mode === "thai") {
    const rai = num(v, "rai", 2);
    const ngan = num(v, "ngan", 1);
    const wa = num(v, "wa", 35.5);
    m2 = rai * UNIT.rai.value + ngan * UNIT.ngan.value + wa * UNIT.sqWa.value;
    given = `${fmtTrim(rai, 4)} ไร่ ${fmtTrim(ngan, 4)} งาน ${fmtTrim(wa, 2)} ตร.วา`;
  } else if (mode === "wl") {
    const w = num(v, "w", 40);
    const l = num(v, "l", 93.55);
    m2 = w * l;
    given = `${fmtTrim(w, 3)} × ${fmtTrim(l, 3)} ม.`;
  } else {
    m2 = num(v, "m2", 3742);
    given = `${fmtTrim(m2, 2)} ตร.ม.`;
  }
  if (m2 <= 0) {
    return blockedResult({ headline: "พื้นที่เป็น 0 — ใส่ขนาดที่ดินก่อน", tip: "ใส่ไร่ งาน หรือตารางวา อย่างน้อยหนึ่งช่อง" });
  }
  const r = raiNganWa(m2);
  const price = num(v, "price", 0);
  const text = raiText(m2);
  const m2Text = `${fmtTrim(m2, 2)} ตร.ม.`;
  // กรอกเป็นไร่-งาน-วาอยู่แล้ว หัวเรื่องต้องบอกตารางเมตร ไม่ใช่ทวนค่าเดิม · ถ้ากรอกเกินหลัก (5 งาน) ค่อยต่อด้วยค่าที่ทดหลักแล้ว
  const thaiNormalized = mode === "thai" && given === `${fmtTrim(r.rai, 4)} ไร่ ${fmtTrim(r.ngan, 4)} งาน ${fmtTrim(r.restWa, 2)} ตร.วา`;
  const headline = mode === "thai" ? `${given} = ${m2Text}${thaiNormalized ? "" : ` (${text})`}` : `${given} = ${text}`;
  return resultX({
    title: "ไร่-งาน-ตารางวา",
    headline,
    rows: [
      { label: "ไร่ งาน ตารางวา", value: text, emphasize: true },
      { label: "ตารางเมตร", value: m2Text, emphasize: true },
      { label: "ตารางวารวม", value: waText(r.wa) },
      { label: "ไร่ (ทศนิยม)", value: `${fmtTrim(m2 / UNIT.rai.value, m2 < UNIT.rai.value / 100 ? 8 : 4)} ไร่` },
      ...(price > 0 ? [{ label: `ราคา ${fmt(price)} บาท/ตร.วา`, value: `${fmt(r.wa * price)} บาท`, emphasize: true }] : []),
    ],
    tip: "ขนาดตามโฉนดคือค่าที่ใช้ซื้อขาย ที่วัดเองเป็นค่าประมาณ ที่ดินไม่ใช่สี่เหลี่ยมให้แบ่งเป็นรูปย่อยแล้วรวม",
    explain: {
      risk: "A",
      updatedAt: "2026-11-26",
      summary: "1 ไร่ = 4 งาน = 400 ตร.วา = 1,600 ตร.ม. · 1 งาน = 100 ตร.วา = 400 ตร.ม. · 1 ตร.วา = 4 ตร.ม. (ค่าตามนิยาม ไม่ปัด)",
      steps: [
        {
          label: "เป็นตารางเมตร",
          expr: mode === "thai" ? "ตร.ม. = ไร่ × 1,600 + งาน × 400 + ตร.วา × 4" : mode === "wl" ? "ตร.ม. = กว้าง × ยาว" : "ตร.ม. ตามที่กรอก",
          subst: mode === "m2" ? `${fmtTrim(m2, 4)} ตร.ม.` : `${given} = ${fmtTrim(m2, 4)} ตร.ม.`,
        },
        { label: "เป็นตารางวา", expr: "ตร.วา = ตร.ม. ÷ 4", subst: `${fmtTrim(m2, 4)} ÷ 4 = ${fmtTrim(r.wa, 4)} ตร.วา` },
        {
          label: "แตกเป็นไร่ งาน วา",
          expr: "ไร่ = ปัดลง(ตร.วา ÷ 400) · งาน = ปัดลง(เศษ ÷ 100) · ที่เหลือเป็นตร.วา",
          subst: `${fmtTrim(r.wa, 2)} = ${fmt(r.rai)} × 400 + ${fmt(r.ngan)} × 100 + ${fmtTrim(r.restWa, 2)} → ${text}`,
        },
      ],
      constants: [UNIT.rai, UNIT.ngan, UNIT.sqWa],
      assumptions: ["ตารางวาแสดงทศนิยม 2 ตำแหน่ง (พื้นที่ไม่ถึง 1 ตร.วา แสดงถึง 4 ตำแหน่ง)"],
      caveats: [DISCLAIMER_AB],
      refs: [{ label: "หน่วยวัดพื้นที่ไทย (ไร่ งาน ตารางวา) — ใช้ในโฉนดที่ดิน" }],
    },
  });
}

/* ── ปริมาตรถัง / ทรงกระบอกเป็นลิตร ── */

/** พื้นที่ส่วนของวงกลมรัศมี r ที่น้ำสูง h จากก้น (หน่วยเดียวกับ r ยกกำลังสอง) — สูตรตรงของ circular segment */
export function segmentArea(r: number, h: number): number {
  if (h <= 0) return 0;
  if (h >= 2 * r) return Math.PI * r * r;
  return r * r * Math.acos((r - h) / r) - (r - h) * Math.sqrt(2 * r * h - h * h);
}

/** ปริมาตรถัง (ลิตร) เต็มถังและที่ระดับน้ำ (ซม.) · ลิตรต่อ 1 ซม. ที่ระดับนั้น — คิดเป็น ซม. แล้ว ÷ 1000 */
export function tankVolume(shape: string, dims: { d: number; len: number; h: number; bw: number; bl: number }, level: number) {
  if (shape === "hcyl") {
    const r = dims.d / 2;
    const full = (Math.PI * r * r * dims.len) / 1000;
    const at = (segmentArea(r, level) * dims.len) / 1000;
    const chord = level > 0 && level < dims.d ? 2 * Math.sqrt(2 * r * level - level * level) : 0;
    return { full, at, perCm: (chord * dims.len) / 1000, top: dims.d };
  }
  if (shape === "box") {
    const base = dims.bw * dims.bl;
    return { full: (base * dims.h) / 1000, at: (base * level) / 1000, perCm: base / 1000, top: dims.h };
  }
  const base = (Math.PI * dims.d * dims.d) / 4;
  return { full: (base * dims.h) / 1000, at: (base * level) / 1000, perCm: base / 1000, top: dims.h };
}

export function calcTankVolume(v: Values) {
  const bad = guard("tank", v);
  if (bad) return bad;
  const shape = str(v, "shape", "hcyl");
  const dims = { d: num(v, "d", 100), len: num(v, "len", 200), h: num(v, "h", 130), bw: num(v, "bw", 100), bl: num(v, "bl", 100) };
  const level = num(v, "level", 30);
  const t = tankVolume(shape, dims, level);
  const topName = shape === "hcyl" ? "เส้นผ่านศูนย์กลาง" : "ความสูงถัง";
  if (level > t.top + 1e-9) {
    return blockedResult({
      headline: `ระดับน้ำ ${fmtTrim(level, 1)} ซม. สูงกว่า${topName} (${fmtTrim(t.top, 1)} ซม.)`,
      tip: "วัดระดับน้ำจากก้นถังขึ้นมา ไม่เกินความสูงภายในถัง",
    });
  }
  const shapeName: Record<string, string> = { vcyl: "ถังกลมตั้ง", hcyl: "ถังกลมนอน", box: "ถังเหลี่ยม" };
  const sizeText =
    shape === "hcyl"
      ? `Ø ${fmtTrim(dims.d, 1)} × ยาว ${fmtTrim(dims.len, 1)} ซม.`
      : shape === "box"
        ? `${fmtTrim(dims.bw, 1)} × ${fmtTrim(dims.bl, 1)} × สูง ${fmtTrim(dims.h, 1)} ซม.`
        : `Ø ${fmtTrim(dims.d, 1)} × สูง ${fmtTrim(dims.h, 1)} ซม.`;
  const pctVol = (t.at / t.full) * 100;
  const fullExpr =
    shape === "hcyl" ? "π × (Ø/2)² × ยาว ÷ 1000" : shape === "box" ? "กว้าง × ยาว × สูง ÷ 1000" : "π × (Ø/2)² × สูง ÷ 1000";
  const atExpr =
    shape === "hcyl"
      ? "[r² × arccos((r − h)/r) − (r − h) × √(2rh − h²)] × ยาว ÷ 1000"
      : shape === "box"
        ? "กว้าง × ยาว × ระดับ ÷ 1000"
        : "π × (Ø/2)² × ระดับ ÷ 1000";
  return resultX({
    title: "ปริมาตรถังเป็นลิตร",
    headline: `${shapeName[shape] ?? "ถัง"} เต็ม ${fmt(t.full, 1)} ลิตร · น้ำสูง ${fmtTrim(level, 1)} ซม. = ${fmt(t.at, 1)} ลิตร (${fmt(pctVol, 1)}%)`,
    chart: {
      kind: "threshold",
      unit: "ลิตร",
      value: t.at,
      max: t.full,
      zones: [{ upTo: t.full, tone: "accent", label: "ความจุถัง" }],
    },
    rows: [
      { label: "ขนาดภายในถัง", value: sizeText },
      { label: "ความจุเต็มถัง", value: `${fmt(t.full, 1)} ลิตร (${fmt(t.full / 1000, 3)} ลบ.ม.)`, emphasize: true },
      { label: `น้ำที่ระดับ ${fmtTrim(level, 1)} ซม.`, value: `${fmt(t.at, 1)} ลิตร`, emphasize: true },
      { label: "เต็มถัง", value: `${fmt(pctVol, 1)}% ของปริมาตร (${fmt((level / t.top) * 100, 1)}% ของความสูง)` },
      { label: "เติมอีกจนเต็ม", value: `${fmt(t.full - t.at, 1)} ลิตร` },
      { label: "ที่ระดับนี้ น้ำขึ้น 1 ซม.", value: `${fmt(t.perCm, 2)} ลิตร` },
    ],
    tip:
      shape === "hcyl"
        ? "ถังนอน % ความสูงไม่เท่ากับ % น้ำ — ช่วงก้นและบนถังน้ำน้อยต่อ 1 ซม. ช่วงกลางถังมากสุด"
        : "วัดขนาดภายในถัง (หักความหนาผนัง) จะได้ลิตรตรงกว่าขนาดนอก",
    explain: {
      risk: "A",
      updatedAt: "2026-11-26",
      summary:
        shape === "hcyl"
          ? "ถังกลมนอน: ปริมาตรน้ำ = พื้นที่ส่วนของวงกลมใต้ระดับน้ำ × ความยาวถัง (สูตรตรง ไม่ได้เทียบตาราง) · 1 ลิตร = 1,000 ลบ.ซม."
          : "ปริมาตร = พื้นที่ฐาน × ความสูง (หรือระดับน้ำ) · 1 ลิตร = 1,000 ลบ.ซม.",
      steps: [
        { label: "เต็มถัง", expr: fullExpr, subst: `${sizeText} → ${fmt(t.full, 2)} ลิตร` },
        {
          label: "ที่ระดับน้ำ",
          expr: atExpr,
          subst: shape === "hcyl" ? `r = ${fmtTrim(dims.d / 2, 2)}, h = ${fmtTrim(level, 2)} ซม. → ${fmt(t.at, 2)} ลิตร` : `ระดับ ${fmtTrim(level, 2)} ซม. → ${fmt(t.at, 2)} ลิตร`,
        },
        {
          label: "น้ำต่อ 1 ซม.",
          expr: shape === "hcyl" ? "ความกว้างผิวน้ำ 2√(2rh − h²) × ยาว ÷ 1000" : "พื้นที่ฐาน ÷ 1000",
          subst: `${fmt(t.perCm, 3)} ลิตร/ซม.`,
        },
      ],
      assumptions: [
        shape === "hcyl" ? "ฝาหัวท้ายแบน (ถังฝาโค้ง/ฝาครึ่งทรงกลมจุมากกว่านี้)" : "ก้นถังเรียบ ผนังตั้งฉาก",
        "ใช้ขนาดภายในถัง",
      ],
      caveats: ["ถังจริงมีก้นโค้ง/ข้อต่อ/ลูกลอย ความจุจริงต่างจากป้ายได้เล็กน้อย", DISCLAIMER_AB],
      refs: [{ label: "เรขาคณิต: พื้นที่ส่วนของวงกลม (circular segment)" }],
    },
  });
}

/* ── เทียบราคาต่อหน่วย ── */

const UNIT_PRICE_UNITS: Record<string, string> = { L: "ลิตร", kg: "กก.", m2: "ตร.ม.", m: "ม.", pc: "ชิ้น" };
const UNIT_PRICE_MAX = 3;
/** ค่าตั้งต้นใช้ลิตรตามฉลากถังสี (UNIT.gallon = 3.785 ล. ปัดตามฉลาก ไม่ใช่ 3.785411784 ตามนิยาม — ดูหมายเหตุในค่าคงที่) */
const UNIT_PRICE_DEFAULTS = [
  { name: "ถังเล็ก 1 แกลลอน", p: 450, c: 1, s: UNIT.gallon.value },
  { name: "ถังใหญ่ 5 แกลลอน", p: 1890, c: 1, s: UNIT.gallon.value * UNIT.paintPail.value },
  { name: "แพ็ก 4 แกลลอน", p: 1700, c: 4, s: UNIT.gallon.value },
];

export function calcUnitPrice(v: Values) {
  const bad = guard("unitprice", v);
  if (bad) return bad;
  const n = Number(str(v, "n", "2"));
  const unit = UNIT_PRICE_UNITS[str(v, "unit", "L")] ?? "หน่วย";
  const need = num(v, "need", 20);
  const items = [] as Array<{ name: string; price: number; qty: number; per: number; packs: number; cost: number; extra: number }>;
  for (let i = 1; i <= n; i++) {
    const d = UNIT_PRICE_DEFAULTS[i - 1];
    const name = str(v, `name${i}`, d.name).trim() || `ตัวที่ ${i}`;
    const price = num(v, `p${i}`, d.p);
    const qty = num(v, `c${i}`, d.c) * num(v, `s${i}`, d.s);
    const packs = need > 0 ? ceil(need / qty) : 0;
    items.push({ name, price, qty, per: price / qty, packs, cost: packs * price, extra: packs * qty - need });
  }
  const best = items.reduce((a, b) => (b.per < a.per - 1e-12 ? b : a), items[0]);
  // ราคาต่อหน่วยเท่ากัน = ต่างกันแค่ระดับเศษทศนิยมของเครื่อง · ทุกตัวที่เท่าตัวถูกสุดได้ป้าย "ถูกสุด" ด้วยกัน ไม่เลือกตัวแรก
  const cheapest = items.filter((x) => Math.abs(x.per - best.per) <= 1e-9 * best.per);
  const allSame = cheapest.length === items.length;
  // ยอดจ่ายจริงเทียบเป็นสตางค์ ยอดเท่ากันต้องบอกว่าเท่ากัน
  const satang = (b: number) => Math.round(b * 100);
  const minCost = Math.min(...items.map((x) => satang(x.cost)));
  const payLeast = need > 0 ? items.filter((x) => satang(x.cost) === minCost) : [];
  const payTie = payLeast.length > 1;
  const payAll = payLeast.length === items.length;
  const payText =
    need <= 0 || (payLeast.length === 1 && payLeast[0] === best && cheapest.length === 1)
      ? ""
      : payAll
        ? ` · ซื้อ ${fmtTrim(need, 2)} ${unit} จ่ายเท่ากันทุกตัว`
        : payTie
          ? ` · ซื้อ ${fmtTrim(need, 2)} ${unit} จ่ายน้อยสุดเท่ากัน: ${payLeast.map((x) => x.name).join(", ")}`
          : ` · ซื้อ ${fmtTrim(need, 2)} ${unit} จ่ายน้อยสุด: ${payLeast[0].name}`;
  const pctMore = (x: (typeof items)[number]) => (x.per / best.per - 1) * 100;
  return resultX({
    title: "เทียบราคาต่อหน่วย",
    headline: allSame
      ? `ราคาต่อ${unit}เท่ากันทุกตัว (${fmt(best.per, 2)} บาท/${unit})${payText}`
      : `ถูกสุดต่อ${unit}${cheapest.length > 1 ? " (เท่ากัน)" : ""}: ${cheapest.map((x) => x.name).join(", ")} ${fmt(best.per, 2)} บาท/${unit}${payText}`,
    rows: [
      ...items.map((x) => ({
        label: `${x.name} (${fmtTrim(x.price, 2)} บาท / ${fmtTrim(x.qty, 4)} ${unit})`,
        value: `${fmt(x.per, 2)} บาท/${unit}${allSame ? "" : cheapest.includes(x) ? (cheapest.length > 1 ? " · ถูกสุด (เท่ากัน)" : " · ถูกสุด") : ` · แพงกว่า ${fmt(pctMore(x), 1)}%`}`,
        emphasize: cheapest.includes(x) && !allSame,
      })),
      ...(need > 0
        ? items.map((x) => ({
            label: `ต้องใช้ ${fmtTrim(need, 2)} ${unit}: ${x.name}`,
            value: `ซื้อ ${fmt(x.packs)} แพ็ก = ${fmtTrim(x.cost, 2)} บาท (เหลือ ${fmtTrim(x.extra, 3)} ${unit})${payAll ? " · จ่ายเท่ากัน" : payLeast.includes(x) ? (payTie ? " · จ่ายน้อยสุด (เท่ากัน)" : " · จ่ายน้อยสุด") : ""}`,
            emphasize: payLeast.includes(x) && !payAll,
          }))
        : []),
    ],
    tip: "ถูกต่อหน่วยไม่ได้แปลว่าจ่ายน้อยสุดเสมอ ถ้าแพ็กใหญ่ใช้ไม่หมด ดูแถว \"ต้องใช้\" ประกอบ · ซื้อผสมขนาดอาจถูกกว่านี้อีก",
    explain: {
      risk: "A",
      updatedAt: "2026-11-26",
      summary: `ราคาต่อ${unit} = ราคา ÷ (จำนวนต่อแพ็ก × ขนาดต่อชิ้น) · แพงกว่า % = (ราคาต่อหน่วย ÷ ถูกสุด − 1) × 100 · ซื้อจริง = ปัดขึ้น(ที่ต้องใช้ ÷ ขนาดแพ็ก) × ราคา`,
      steps: [
        ...items.map((x) => ({ label: x.name, expr: "บาท/หน่วย = ราคา ÷ ปริมาณในแพ็ก", subst: `${fmtTrim(x.price, 2)} ÷ ${fmtTrim(x.qty, 4)} = ${fmt(x.per, 4)} บาท/${unit}` })),
        ...items
          .filter((x) => !cheapest.includes(x))
          .map((x) => ({ label: `${x.name} เทียบตัวถูกสุด`, expr: "(ตัวนี้ ÷ ถูกสุด − 1) × 100", subst: `(${fmt(x.per, 4)} ÷ ${fmt(best.per, 4)} − 1) × 100 = ${fmt(pctMore(x), 2)}%` })),
        ...(need > 0
          ? items.map((x) => ({ label: `ซื้อจริง: ${x.name}`, expr: "แพ็ก = ปัดขึ้น(ที่ต้องใช้ ÷ ปริมาณในแพ็ก)", subst: `${fmtTrim(need, 2)} ÷ ${fmtTrim(x.qty, 4)} → ${fmt(x.packs)} แพ็ก × ${fmtTrim(x.price, 2)} = ${fmtTrim(x.cost, 2)} บาท` }))
          : []),
      ],
      constants: unit === UNIT_PRICE_UNITS.L ? [UNIT.gallon] : undefined,
      assumptions: [
        "ของทุกตัวคุณภาพเท่ากัน ใช้แทนกันได้",
        "ปริมาณในแพ็กใช้หน่วยเดียวกันทุกตัว (เช่น ลิตรทั้งหมด)",
        ...(unit === UNIT_PRICE_UNITS.L ? ["ค่าตั้งต้นใช้ลิตรตามฉลากถังสี (1 แกลลอน = 3.785 ล. ปัดตามฉลาก) — ถ้าคิดด้วยแกลลอนตามนิยาม 3.785411784 ล. บาท/ลิตรต่างได้ที่ทศนิยมตำแหน่งที่ 2"] : []),
      ],
      caveats: ["ใส่ปริมาณให้เป็นหน่วยเดียวกัน — เทียบกระเบื้องให้แปลงเป็น ตร.ม. ต่อแผ่น/กล่องก่อน", DISCLAIMER_AB],
      refs: [{ label: "เลขคณิตราคาต่อหน่วย" }],
    },
  });
}

function unitPriceFields(): Field[] {
  const out: Field[] = [];
  for (let i = 1; i <= UNIT_PRICE_MAX; i++) {
    const d = UNIT_PRICE_DEFAULTS[i - 1];
    const when = i <= 2 ? undefined : { key: "n", is: ["3"] };
    out.push(
      { type: "text", key: `name${i}`, label: `ตัวที่ ${i}: ชื่อ`, default: d.name, placeholder: "เช่น ถังใหญ่", ...(when ? { when } : {}) },
      { type: "number", key: `p${i}`, label: `ตัวที่ ${i}: ราคา`, unit: "บาท", default: d.p, min: 0.01, max: 10000000, step: 0.01, ...(when ? { when } : {}) },
      { type: "number", integer: true, key: `c${i}`, label: `ตัวที่ ${i}: จำนวนในแพ็ก`, unit: "ชิ้น", default: d.c, min: 1, max: 100000, ...(when ? { when } : {}) },
      { type: "number", key: `s${i}`, label: `ตัวที่ ${i}: ขนาดต่อชิ้น (หน่วยที่เลือก)`, default: d.s, min: 0.0001, max: 1000000, step: 0.0001, ...(when ? { when } : {}) },
    );
  }
  return out;
}

const round4Tools: ToolDef[] = [
  {
    id: "slope",
    name: "ความชัน % ↔ องศา ↔ 1:n",
    blurb: "แปลงความชันทุกแบบ · ยกเท่าไหร่ในระยะที่กำหนด",
    keywords: ["ความชัน", "ความลาด", "องศา", "เปอร์เซ็นต์ลาด", "1:12", "ทางลาด", "slope", "ยก"],
    fields: [
      {
        type: "select",
        key: "mode",
        label: "รู้ค่าอะไร",
        default: "ratio",
        options: [
          { value: "ratio", label: "อัตราส่วน 1:n" },
          { value: "pct", label: "เปอร์เซ็นต์" },
          { value: "deg", label: "องศา" },
          { value: "rise", label: "ยก (ซม.) ในระยะราบ (ม.)" },
        ],
      },
      { type: "number", key: "n", label: "n ใน 1:n", default: 12, min: 0.01, max: 10000, step: 0.01, when: { key: "mode", is: "ratio" } },
      { type: "number", key: "pct", label: "ความชัน", unit: "%", default: 2, min: 0.01, max: 10000, step: 0.01, when: { key: "mode", is: "pct" } },
      { type: "number", key: "deg", label: "มุม", unit: "องศา", default: 30, min: 0.01, max: 89, step: 0.01, when: { key: "mode", is: "deg" } },
      { type: "number", key: "rise", label: "ยก", unit: "ซม.", default: 25, min: 0.01, max: 100000, step: 0.01, when: { key: "mode", is: "rise" } },
      { type: "number", key: "run", label: "ระยะราบ", unit: "ม.", default: 3, min: 0.01, max: 10000, step: 0.01, when: { key: "mode", is: "rise" } },
      { type: "number", key: "len", label: "ระยะราบที่จะคิดยก", unit: "ม.", default: 3, min: 0.01, max: 10000, step: 0.01 },
    ],
    calc: calcSlopeConvert,
  },
  {
    id: "rai",
    name: "ไร่-งาน-ตารางวา ↔ ตร.ม.",
    blurb: "แปลงขนาดที่ดิน หรือคิดจาก กว้าง × ยาว เป็นเมตร",
    keywords: ["ไร่", "งาน", "ตารางวา", "ตร.วา", "ที่ดิน", "โฉนด", "ราคาที่ดิน"],
    fields: [
      {
        type: "select",
        key: "mode",
        label: "รู้ค่าอะไร",
        default: "m2",
        options: [
          { value: "m2", label: "ตารางเมตร" },
          { value: "thai", label: "ไร่ งาน ตารางวา" },
          { value: "wl", label: "กว้าง × ยาว (ม.)" },
        ],
      },
      { type: "number", key: "m2", label: "พื้นที่", unit: "ตร.ม.", default: 3742, min: 0.01, max: 100000000, step: 0.01, when: { key: "mode", is: "m2" } },
      { type: "number", key: "rai", label: "ไร่", unit: "ไร่", default: 2, min: 0, max: 100000, when: { key: "mode", is: "thai" } },
      { type: "number", key: "ngan", label: "งาน", unit: "งาน", default: 1, min: 0, max: 1000, when: { key: "mode", is: "thai" } },
      { type: "number", key: "wa", label: "ตารางวา", unit: "ตร.วา", default: 35.5, min: 0, max: 1000000, step: 0.01, when: { key: "mode", is: "thai" } },
      { type: "number", key: "w", label: "กว้าง", unit: "ม.", default: 40, min: 0.01, max: 100000, step: 0.01, when: { key: "mode", is: "wl" } },
      { type: "number", key: "l", label: "ยาว", unit: "ม.", default: 93.55, min: 0.01, max: 100000, step: 0.01, when: { key: "mode", is: "wl" } },
      { type: "number", key: "price", label: "ราคาต่อตารางวา (ไม่ใส่ก็ได้)", unit: "บาท", default: 0, min: 0, max: 10000000 },
    ],
    calc: calcRai,
  },
  {
    id: "tank",
    name: "ปริมาตรถังเป็นลิตร",
    blurb: "ถังกลมตั้ง/นอน ถังเหลี่ยม · เต็มถังกี่ลิตร น้ำสูงเท่านี้เหลือกี่ลิตร",
    keywords: ["ลิตร", "ถังนอน", "ถังน้ำมัน", "ระดับน้ำ", "ทรงกระบอก", "ความจุถัง", "วัดน้ำในถัง"],
    fields: [
      {
        type: "select",
        key: "shape",
        label: "รูปถัง",
        default: "hcyl",
        options: [
          { value: "hcyl", label: "ถังกลมนอน" },
          { value: "vcyl", label: "ถังกลมตั้ง" },
          { value: "box", label: "ถังเหลี่ยม / บ่อ" },
        ],
      },
      { type: "number", key: "d", label: "เส้นผ่านศูนย์กลางใน", unit: "ซม.", default: 100, min: 10, max: 1000, step: 0.1, when: { key: "shape", is: ["hcyl", "vcyl"] } },
      { type: "number", key: "len", label: "ยาวถัง", unit: "ซม.", default: 200, min: 10, max: 3000, step: 0.1, when: { key: "shape", is: "hcyl" } },
      { type: "number", key: "bw", label: "กว้างใน", unit: "ซม.", default: 100, min: 10, max: 3000, step: 0.1, when: { key: "shape", is: "box" } },
      { type: "number", key: "bl", label: "ยาวใน", unit: "ซม.", default: 100, min: 10, max: 3000, step: 0.1, when: { key: "shape", is: "box" } },
      { type: "number", key: "h", label: "สูงใน", unit: "ซม.", default: 130, min: 10, max: 3000, step: 0.1, when: { key: "shape", is: ["vcyl", "box"] } },
      { type: "number", key: "level", label: "ระดับน้ำจากก้นถัง", unit: "ซม.", default: 30, min: 0, max: 3000, step: 0.1 },
    ],
    calc: calcTankVolume,
  },
  {
    id: "unitprice",
    name: "เทียบราคาต่อหน่วย",
    blurb: "2–3 ตัวเลือก ราคากับขนาดแพ็ก → บาทต่อหน่วย ตัวไหนถูก ซื้อจริงจ่ายเท่าไหร่",
    keywords: ["เทียบราคา", "ราคาต่อหน่วย", "ถูกกว่า", "คุ้มกว่า", "ถังเล็กถังใหญ่", "บาทต่อลิตร", "บาทต่อตร.ม."],
    fields: [
      {
        type: "select",
        key: "n",
        label: "จำนวนตัวเลือก",
        default: "2",
        options: [
          { value: "2", label: "2 ตัว" },
          { value: "3", label: "3 ตัว" },
        ],
      },
      {
        type: "select",
        key: "unit",
        label: "เทียบต่อ",
        default: "L",
        options: Object.entries(UNIT_PRICE_UNITS).map(([value, label]) => ({ value, label })),
      },
      ...unitPriceFields(),
      { type: "number", key: "need", label: "ต้องใช้จริง (0 = ไม่คิด)", default: 20, min: 0, max: 10000000, step: 0.01 },
    ],
    calc: calcUnitPrice,
  },
];

export const generalTools: ToolDef[] = [
  {
    id: "inch",
    name: "นิ้ว-หุน-เศษส่วน ↔ มม.",
    blurb: "พิมพ์ 1 1/2\" · 6 หุน · 19 มม. ได้เศษส่วนนิ้ว หุน ฟุต-นิ้ว",
    keywords: ["หุน", "เศษส่วนนิ้ว", "นิ้วครึ่ง", "ฟุต-นิ้ว", "inch"],
    fields: [
      { type: "text", key: "q", label: "ขนาด (พิมพ์ได้: 1 1/2\" · 3/4 · 6 หุน · 19 มม. · 7' 10½\")", default: '1 1/2"', placeholder: '1 1/2" · 6 หุน · 19 มม.' },
      {
        type: "select",
        key: "bare",
        label: "ตัวเลขไม่มีหน่วย นับเป็น",
        default: "in",
        options: [
          { value: "in", label: "นิ้ว" },
          { value: "hun", label: "หุน" },
          { value: "mm", label: "มม." },
          { value: "cm", label: "ซม." },
        ],
      },
    ],
    calc: calcInchText,
  },
  {
    id: "spacing",
    name: "แบ่งระยะเท่า ๆ กัน",
    blurb: "ลูกกรง ชั้นวาง โครงคร่าว — ช่องจริงและตำแหน่งมาร์ก",
    keywords: ["แบ่งช่อง", "ลูกกรง", "ระยะห่าง", "ชั้นวาง", "โครงคร่าว"],
    fields: [
      { type: "number", key: "total", label: "ระยะรวม (ในระหว่าง)", unit: "มม.", default: 2000, min: 10, max: 100000 },
      { type: "number", key: "w", label: "กว้างชิ้น", unit: "มม.", default: 20, min: 0, max: 2000, step: 0.5 },
      {
        type: "select",
        key: "mode",
        label: "รู้อะไร",
        default: "count",
        options: [
          { value: "count", label: "รู้จำนวนชิ้น" },
          { value: "maxgap", label: "รู้ช่องห่างไม่เกิน" },
        ],
      },
      { type: "number", integer: true, key: "n", label: "จำนวนชิ้น", unit: "ชิ้น", default: 9, min: 1, max: 500, when: { key: "mode", is: "count" } },
      { type: "number", key: "maxGap", label: "ช่องห่างไม่เกิน", unit: "มม.", default: 100, min: 1, max: 100000, when: { key: "mode", is: "maxgap" } },
      {
        type: "select",
        key: "ends",
        label: "ที่ปลายสองข้าง",
        default: "gap",
        options: [
          { value: "gap", label: "เป็นช่อง (ลูกกรงระหว่างเสา)" },
          { value: "member", label: "มีชิ้นชิดปลาย (โครง ชั้นบน-ล่าง)" },
        ],
      },
      {
        type: "select",
        key: "mark",
        label: "มาร์กที่",
        default: "edge",
        options: [
          { value: "edge", label: "ขอบซ้ายชิ้น" },
          { value: "center", label: "กึ่งกลางชิ้น" },
        ],
      },
    ],
    calc: calcSpacing,
  },
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
  ...round4Tools,
];

/** แปลงหน่วยด่วน: ใส่ค่าเดียว ได้ทุกหน่วยที่ใช้บนหน้างานพร้อมกัน (ต่างจากเครื่องมือแปลงความยาวที่เลือกหน่วยปลายทางทีละตัว) */
export function calcQuickLength(v: Values) {
  const bad = guardInputs(generalJob.fields, v);
  if (bad) return bad;
  const x = num(v, "x", 2.4);
  const from = str(v, "from", "m");
  const mm = convertLength(x, from, "mm");
  const m = mm / 1000;
  const trade = tradeLengthRows(mm);
  return resultX({
    title: "แปลงหน่วยด่วน",
    headline: trade.length
      ? `${fmtTrim(x, 4)} ${labelLen(from)} = ${trade[0].value.split(" · ")[0]}`
      : `${fmtTrim(x, 4)} ${labelLen(from)} = ${fmt(mm, 2)} มม.`,
    rows: [
      ...trade.map((r) => ({ ...r, emphasize: true })),
      { label: "มิลลิเมตร", value: `${fmt(mm, 1)} มม.` },
      { label: "เซนติเมตร", value: `${fmt(mm / 10, 2)} ซม.` },
      { label: "เมตร", value: `${fmt(m, 3)} ม.` },
      { label: "นิ้ว (ทศนิยม)", value: `${fmt(mm / UNIT.inch.value, 3)} นิ้ว` },
      { label: "ฟุต (ทศนิยม)", value: `${fmt(m / UNIT.foot.value, 3)} ฟุต` },
      { label: "ศอก", value: `${fmt(m / UNIT.sok.value, 2)} ศอก` },
      { label: "วา", value: `${fmt(m / UNIT.wa.value, 2)} วา` },
    ],
    tip: "ใส่ค่าเดียวได้ครบทุกหน่วย ฟุต-นิ้วปัดเข้าเศษส่วน 1/16 นิ้วใกล้สุดแบบที่อ่านจากตลับเมตร",
    explain: {
      risk: "A",
      updatedAt: "2026-11-25",
      summary: "แปลงค่าที่กรอกเป็นมิลลิเมตรก่อน แล้วหารด้วยตัวคูณของแต่ละหน่วย",
      steps: [
        { label: "แปลงเป็นมม.", expr: "มม. = ค่า × ตัวคูณของหน่วยต้นทาง", subst: `${fmtTrim(x, 4)} ${labelLen(from)} = ${fmt(mm, 2)} มม.` },
        {
          label: "ฟุต-นิ้วแบบเศษส่วน",
          expr: "นิ้ว = มม. ÷ 25.4 แล้วปัดเข้า 1/16 นิ้วใกล้สุด · 12 นิ้ว = 1 ฟุต · 1 นิ้ว = 8 หุน",
          subst: `${fmt(mm, 2)} ÷ 25.4 = ${fmt(mm / UNIT.inch.value, 3)} นิ้ว`,
        },
      ],
      constants: [UNIT.inch, UNIT.foot, UNIT.sok, UNIT.wa],
      assumptions: ["เศษส่วนนิ้วปัดเข้า 1/16 นิ้วใกล้สุด คลาดจากค่าจริงได้ไม่เกิน 0.8 มม."],
      caveats: ["งานที่ต้องเป๊ะกว่า 1 มม. ให้ยึดค่ามิลลิเมตร ไม่ใช่ค่าฟุต-นิ้วที่ปัดแล้ว"],
      refs: [{ label: "นิยามหน่วยสากล (ISO 80000) และหน่วยวัดไทย" }],
    },
  });
}

export const generalJob: JobDef = {
  name: "แปลงหน่วยด่วน",
  blurb: "ใส่ค่าเดียว ได้ มม. ซม. ม. นิ้ว ฟุต-นิ้ว หุน ศอก วา พร้อมกัน",
  fields: [
    { type: "number", key: "x", label: "ค่า", default: 2.4, min: 0, max: 1000000000, step: 0.001 },
    { type: "select", key: "from", label: "หน่วยที่วัดมา", default: "m", options: lenOpts },
  ],
  calc: calcQuickLength,
};
