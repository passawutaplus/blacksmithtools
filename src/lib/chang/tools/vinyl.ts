import type { JobDef, ToolDef, Values } from "../types";
import { ceil, fmt, jobFromParts, num, resultX, round, str } from "../math";
import { DISCLAIMER_AB } from "../constants";

function netArea(v: Values) {
  return Math.max(0, num(v, "w", 4) * num(v, "l", 5) - num(v, "deduct", 0));
}

export function calcVinylQty(v: Values) {
  const net = netArea(v);
  const boxM2 = num(v, "boxM2", 2.16);
  const waste = num(v, "waste", 8) / 100;
  const need = net * (1 + waste);
  const boxes = ceil(need / Math.max(boxM2, 0.1));
  const lastUsed = boxM2 > 0 ? (need - (boxes - 1) * boxM2) / boxM2 : 1;

  return resultX({
    title: "จำนวนกระเบื้องยาง",
    headline: `${boxes} กล่อง`,
    chart: {
      kind: "packs",
      unitLabel: `กล่อง ${fmt(boxM2, 2)} ตร.ม.`,
      count: boxes,
      lastUsed,
      note: `พื้นที่สุทธิ ${fmt(net, 2)} ตร.ม. + เผื่อเสีย ${fmt(waste * 100)}%`,
    },
    rows: [
      { label: "พื้นที่สุทธิ", value: `${fmt(net, 2)} ตร.ม.` },
      { label: "เผื่อเสีย", value: `${fmt(waste * 100)}%` },
      { label: "ต้องใช้", value: `${fmt(need, 2)} ตร.ม.` },
      { label: "จำนวนกล่อง", value: `${boxes} กล่อง`, emphasize: true },
    ],
    tip: "ลายไม้ปูสลับรอยต่อ เผื่ออย่างน้อย 8% ห้องเอียงเผื่อ 10–12%",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "พื้นที่ที่ต้องใช้ = พื้นที่สุทธิ + เผื่อเสียจากการตัดเข้ามุม/รอยต่อ แล้วหารด้วยพื้นที่ต่อกล่องแล้วปัดขึ้นเป็นกล่องเต็ม",
      steps: [
        { label: "พื้นที่สุทธิ", expr: "กว้าง × ยาว − หักพื้นที่", subst: `${fmt(net, 2)} ตร.ม.` },
        { label: "พื้นที่ต้องใช้จริง", expr: "สุทธิ × (1 + เผื่อเสีย)", subst: `${fmt(net, 2)} × ${fmt(1 + waste, 2)} = ${fmt(need, 2)} ตร.ม.` },
        { label: "จำนวนกล่อง", expr: "ปัดขึ้น(ต้องใช้ ÷ ตร.ม./กล่อง)", subst: `${fmt(need, 2)} ÷ ${fmt(boxM2, 2)} = ${boxes} กล่อง` },
      ],
      assumptions: ["เผื่อเสีย 8% ใช้กับลายปูตรง/สลับทั่วไป ห้องมีมุมเยอะหรือปูทแยง 45° ต้องเผื่อมากกว่านี้"],
      caveats: [
        "ควรสั่ง batch/lot เดียวกันให้พอในครั้งเดียว เพราะสีอาจต่าง lot กันเล็กน้อย",
        "ห้องรูปร่างซับซ้อนหรือมีเสามาก เผื่อเสียจริงอาจสูงถึง 12–15%",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวปฏิบัติงานปูพื้นกระเบื้องยาง (LVT/SPC/WPC) มาตรฐานผู้ผลิต" }],
    },
  });
}

export function calcSelfLevel(v: Values) {
  const net = netArea(v);
  const thick = num(v, "thick", 3);
  const kg = net * thick * 1.5;
  const bags = ceil(kg / 25);
  const lastUsed = (kg - (bags - 1) * 25) / 25;

  return resultX({
    title: "ปูนปรับระดับพื้น",
    headline: `ปูนปรับระดับ ${bags} ถุง`,
    chart: {
      kind: "packs",
      unitLabel: "ถุง 25 กก.",
      count: bags,
      lastUsed,
      note: `ใช้ปูนรวม ${fmt(kg, 1)} กก. หนา ${fmt(thick)} มม. บนพื้นที่ ${fmt(net, 2)} ตร.ม.`,
    },
    rows: [
      { label: "หนา", value: `${fmt(thick)} มม.` },
      { label: "ปูน", value: `${fmt(kg, 1)} กก.` },
      { label: "ถุง 25 กก.", value: `${bags} ถุง`, emphasize: true },
    ],
    tip: "พื้นขรุขระต้องหนาเกิน 3 มม. ตามแนว ASTM F710 ดามความชื้นก่อนปูคลิก",
    explain: {
      risk: "B",
      updatedAt: "2026-08-21",
      summary: "ปริมาณปูนปรับระดับ = พื้นที่ × ความหนา × ความหนาแน่นเฉลี่ยของปูน self-level (~1.5 กก./ตร.ม./มม.) แล้วปัดขึ้นเป็นถุง 25 กก.",
      steps: [
        { label: "น้ำหนักปูนที่ต้องใช้", expr: "กก. = พื้นที่ × หนา(มม.) × 1.5", subst: `${fmt(net, 2)} × ${fmt(thick)} × 1.5 = ${fmt(kg, 1)} กก.` },
        { label: "จำนวนถุง", expr: "ปัดขึ้น(กก. ÷ 25)", subst: `${fmt(kg, 1)} ÷ 25 = ${bags} ถุง` },
      ],
      constants: [{ value: 1.5, unit: "กก./ตร.ม./มม.", label: "ความหนาแน่นเฉลี่ยปูน self-level", source: "ค่าเฉลี่ยผลิตภัณฑ์ปูนปรับระดับทั่วไป" }],
      assumptions: ["พื้นเดิมค่อนข้างเรียบ เทหนาเฉลี่ยเท่ากันทั้งห้อง", "ไม่รวมปูนที่ใช้ปะรอยแตกหรือหลุมลึกเฉพาะจุด"],
      caveats: [
        "มาตรฐาน ASTM F710 กำหนดให้พื้นต้องได้ระดับไม่เกิน 3 มม. ในช่วง 3 ม. ก่อนปูวัสดุปิดผิว ถ้าไม่ได้ตามนี้ต้องปรับระดับก่อนเสมอ",
        "ต้องวัดความชื้นพื้นคอนกรีตก่อนเท ถ้าความชื้นสูงเกินเกณฑ์ วัสดุปิดผิวจะพองหรือหลุดหลังปูไม่นาน",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "ASTM F710 Standard Practice for Preparing Concrete Floors" }],
    },
  });
}

export function calcVinylAdhesive(v: Values) {
  const net = netArea(v);
  const kind = str(v, "kind", "click");
  if (kind === "click") {
    const rolls = ceil(net / 10);
    const lastUsed = (net - (rolls - 1) * 10) / 10;
    return resultX({
      title: "กาว + โฟมรองพื้น",
      headline: `โฟมรองพื้น ${rolls} ม้วน`,
      chart: {
        kind: "packs",
        unitLabel: "ม้วน 10 ตร.ม.",
        count: rolls,
        lastUsed,
        note: `พื้นที่สุทธิ ${fmt(net, 2)} ตร.ม.`,
      },
      rows: [
        { label: "ระบบ", value: "คลิกล็อก" },
        { label: "โฟมรอง (ม้วน 10 ตร.ม.)", value: `${rolls} ม้วน`, emphasize: true },
      ],
      tip: "โฟมกันชื้นใต้ SPC อย่าลืมเทปกาวรอยต่อ",
      explain: {
        risk: "A",
        updatedAt: "2026-08-21",
        summary: "ระบบคลิกล็อกใช้โฟมรองพื้นปูคลุมทั้งห้อง (ไม่ทับซ้อน) จำนวนม้วน = พื้นที่สุทธิ ÷ พื้นที่ต่อม้วน ปัดขึ้น",
        steps: [{ label: "จำนวนม้วน", expr: "ปัดขึ้น(พื้นที่ ÷ 10)", subst: `${fmt(net, 2)} ÷ 10 = ${rolls} ม้วน` }],
        assumptions: ["โฟมปูชนกันไม่ซ้อนทับ (butt joint) เผื่อเศษจากการตัดเข้ามุม/ผนังเล็กน้อยในตัวเลขนี้แล้ว"],
        caveats: ["ต้องใช้เทปกาวปิดรอยต่อโฟมทุกแนวเพื่อกันความชื้นซึมและกันเสียงเอี๊ยดอ๊าดตอนเดิน", DISCLAIMER_AB],
        refs: [{ label: "แนวปฏิบัติงานปูพื้นระบบคลิกล็อก (Floating Floor Installation)" }],
      },
    });
  }
  const kg = net * 0.3;
  const tins = ceil(kg / 4);
  const lastUsed = (kg - (tins - 1) * 4) / 4;
  return resultX({
    title: "กาว + โฟมรองพื้น",
    headline: `กาวประมาณ ${tins} แกลลอน`,
    chart: {
      kind: "packs",
      unitLabel: "แกลลอน 4 กก.",
      count: tins,
      lastUsed,
      note: `กาวรวม ${fmt(kg, 1)} กก. บนพื้นที่ ${fmt(net, 2)} ตร.ม.`,
    },
    rows: [
      { label: "ระบบ", value: "กาวลงพื้น" },
      { label: "กาว", value: `${fmt(kg, 1)} กก.` },
      { label: "แกลลอน 4 กก.", value: `${tins} แกลลอน`, emphasize: true },
    ],
    tip: "กาวลงทั้งแผ่น อย่าหยอดเป็นจุด ขอบจะพอง",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "ระบบกาวลงพื้นใช้อัตราเฉลี่ย ~0.3 กก./ตร.ม. (เกรียงหวีมาตรฐาน) จำนวนแกลลอน = น้ำหนักกาวรวม ÷ 4 กก. ปัดขึ้น",
      steps: [
        { label: "น้ำหนักกาวรวม", expr: "กก. = พื้นที่ × 0.3", subst: `${fmt(net, 2)} × 0.3 = ${fmt(kg, 1)} กก.` },
        { label: "จำนวนแกลลอน", expr: "ปัดขึ้น(กก. ÷ 4)", subst: `${fmt(kg, 1)} ÷ 4 = ${tins} แกลลอน` },
      ],
      assumptions: ["อัตราใช้กาว 0.3 กก./ตร.ม. คือค่าเฉลี่ยเกรียงหวี (V-notch) ทั่วไป ผิวพื้นเรียบมากอาจใช้น้อยกว่านี้"],
      caveats: [
        "ต้องปาดกาวให้เต็มแผ่นสม่ำเสมอ ถ้าหยอดเป็นจุด (spot bonding) ขอบแผ่นจะพองหรือยกตัวเมื่อโดนความร้อน/แรงกด",
        "เวลาเปิดหน้ากาว (open time) มีจำกัด ต้องปูให้ทันก่อนกาวแห้งเป็นฟิล์ม",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวปฏิบัติงานปูพื้นระบบกาวลง (Full-Spread Adhesive Installation)" }],
    },
  });
}

export function calcSkirting(v: Values) {
  const peri = Math.max(2 * (num(v, "w", 4) + num(v, "l", 5)) - num(v, "doors", 1) * 0.9, 0);
  const bars = ceil(peri / 2.4);
  const tmold = num(v, "tmold", 1);
  const lastUsed = (peri - (bars - 1) * 2.4) / 2.4;

  return resultX({
    title: "บัว + ตัวจบ",
    headline: `บัว ${fmt(round(peri, 1), 1)} ม.`,
    chart: {
      kind: "packs",
      unitLabel: "เส้น 2.4 ม.",
      count: bars,
      lastUsed,
      note: `ความยาวบัวรอบห้อง ${fmt(peri, 1)} ม. (หักช่องประตูแล้ว)`,
    },
    rows: [
      { label: "บัวรอบห้อง", value: `${fmt(peri, 1)} ม.`, emphasize: true },
      { label: "เส้น 2.4 ม.", value: `${bars} เส้น` },
      { label: "T-Molding / ตัวจบ", value: `${fmt(tmold)} เส้น` },
    ],
    tip: "มุมภายในตัด 45 เผื่อ 1 เส้น รอยต่อห้องอื่นใส่ T-mold",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "ความยาวบัวรอบห้อง = เส้นรอบรูปห้อง หักช่องประตู แล้วหารด้วยความยาวเส้นบัวมาตรฐาน 2.4 ม. ปัดขึ้น",
      steps: [
        { label: "เส้นรอบรูปห้อง หักช่องประตู", expr: "2×(กว้าง+ยาว) − ประตู×0.9", subst: `2×(${fmt(num(v, "w", 4))}+${fmt(num(v, "l", 5))}) − ${fmt(num(v, "doors", 1))}×0.9 = ${fmt(peri, 1)} ม.` },
        { label: "จำนวนเส้นบัว", expr: "ปัดขึ้น(รอบห้อง ÷ 2.4)", subst: `${fmt(peri, 1)} ÷ 2.4 = ${bars} เส้น` },
      ],
      assumptions: ["ช่องประตูแต่ละบานหักออกเฉลี่ย 0.9 ม. (ความกว้างวงกบมาตรฐาน)"],
      caveats: ["มุมภายใน/มุมนอกทุกมุมกินเศษบัวจากการตัด 45° เผื่อซื้อเพิ่มอีก 1 เส้นถ้าห้องมีมุมเยอะหรือรูปทรงซับซ้อน"],
      refs: [{ label: "แนวปฏิบัติงานติดตั้งบัวเชิงผนัง (Skirting/Baseboard Installation)" }],
    },
  });
}

export function calcGap(v: Values) {
  const w = num(v, "w", 4);
  const l = num(v, "l", 5);
  const span = Math.max(w, l);
  const gap = span > 8 ? 12 : span > 5 ? 10 : 8;

  return resultX({
    title: "ระยะเผื่อขยายตัว",
    headline: `เผื่อขอบ ${gap} มม.`,
    chart: {
      kind: "steps",
      unit: "มม.",
      items: [
        { label: "≤ 5 ม.", value: 8, state: span <= 5 ? "chosen" : "under" },
        { label: "5–8 ม.", value: 10, state: span > 5 && span <= 8 ? "chosen" : span <= 5 ? "over" : "under" },
        { label: "> 8 ม.", value: 12, state: span > 8 ? "chosen" : "over" },
      ],
    },
    rows: [
      { label: "ช่วงยาวสุด", value: `${fmt(span, 1)} ม.` },
      { label: "ระยะขยายตัว", value: `${gap} มม. รอบห้อง`, emphasize: true },
    ],
    tip: "คลิกล็อกต้องมีช่องขยาย ปิดด้วยบัว อย่าซิลิโคนอัดแน่นทุกด้าน",
    explain: {
      risk: "B",
      updatedAt: "2026-08-21",
      summary: "พื้นคลิกล็อก/ลามิเนตขยายตัวตามความชื้นและอุณหภูมิ ยิ่งห้องช่วงยาวมาก ยิ่งต้องเผื่อช่องขยายรอบผนังมากขึ้นตามขั้นบันไดมาตรฐาน",
      steps: [{ label: "เลือกระยะเผื่อตามช่วงห้อง", expr: "≤5ม.→8มม. · 5–8ม.→10มม. · >8ม.→12มม.", subst: `ช่วงยาวสุด ${fmt(span, 1)} ม. → เผื่อ ${gap} มม.` }],
      assumptions: ["ห้องรูปสี่เหลี่ยมทั่วไป ไม่มีผนังกั้นแบ่งพื้นเป็นช่วงย่อยที่ต้องเผื่อ gap เพิ่มตรงกลางห้อง"],
      caveats: [
        "ห้องยาวเกิน 12–15 ม. ควรเผื่อ expansion gap กลางห้อง (transition strip) เพิ่ม ไม่ใช่เผื่อรอบผนังอย่างเดียว",
        "ปิดช่องเผื่อด้วยบัวหรือ T-mold ที่ไม่ยึดแน่นกับพื้น ห้ามอัดซิลิโคน/กาวเต็มช่องเพราะพื้นจะดันจนโก่ง",
      ],
      refs: [{ label: "แนวปฏิบัติงานปูพื้นลอย (Floating Floor) — ระยะเผื่อขยายตัวตามผู้ผลิต" }],
    },
  });
}

const room = [
  { type: "number" as const, key: "w", label: "กว้าง", unit: "ม.", default: 4, min: 0.5, step: 0.1 },
  { type: "number" as const, key: "l", label: "ยาว", unit: "ม.", default: 5, min: 0.5, step: 0.1 },
  { type: "number" as const, key: "deduct", label: "หักพื้นที่", unit: "ตร.ม.", default: 0, min: 0, step: 0.1 },
];

export const vinylTools: ToolDef[] = [
  {
    id: "qty",
    name: "จำนวนกระเบื้องยาง",
    blurb: "กล่อง LVT / SPC / WPC",
    fields: [
      ...room,
      { type: "number", key: "boxM2", label: "ตารางเมตร/กล่อง", unit: "ตร.ม.", default: 2.16, min: 0.5, step: 0.01 },
      { type: "number", key: "waste", label: "เผื่อเสีย", unit: "%", default: 8, min: 5 },
    ],
    calc: calcVinylQty,
  },
  {
    id: "level",
    name: "ปูนปรับระดับพื้น",
    blurb: "self-level ตามความหนา",
    fields: [...room, { type: "number", key: "thick", label: "หนาที่ปรับ", unit: "มม.", default: 3, min: 1, step: 0.5 }],
    calc: calcSelfLevel,
  },
  {
    id: "adhesive",
    name: "กาว + โฟมรองพื้น",
    blurb: "คลิกล็อกหรือกาวลง",
    fields: [
      ...room,
      {
        type: "select",
        key: "kind",
        label: "ระบบปู",
        default: "click",
        options: [
          { value: "click", label: "คลิกล็อก + โฟม" },
          { value: "glue", label: "กาวลงพื้น" },
        ],
      },
    ],
    calc: calcVinylAdhesive,
  },
  {
    id: "trim",
    name: "บัว + ตัวจบ",
    blurb: "บัว T-mold reducer",
    fields: [
      { type: "number", key: "w", label: "กว้าง", unit: "ม.", default: 4, min: 0.5, step: 0.1 },
      { type: "number", key: "l", label: "ยาว", unit: "ม.", default: 5, min: 0.5, step: 0.1 },
      { type: "number", key: "doors", label: "ประตู", unit: "บาน", default: 1, min: 0 },
      { type: "number", key: "tmold", label: "รอยต่อต่างวัสดุ", unit: "เส้น", default: 1, min: 0 },
    ],
    calc: calcSkirting,
  },
  {
    id: "gap",
    name: "ระยะเผื่อขยายตัว",
    blurb: "ช่องขอบคลิกล็อก",
    fields: [
      { type: "number", key: "w", label: "กว้าง", unit: "ม.", default: 4, min: 0.5, step: 0.1 },
      { type: "number", key: "l", label: "ยาว", unit: "ม.", default: 5, min: 0.5, step: 0.1 },
    ],
    calc: calcGap,
  },
];

export const vinylJob: JobDef = {
  name: "คิดทั้งงานพื้นกระเบื้องยาง",
  blurb: "ห้องครั้งเดียว ได้กล่อง โฟม บัว ระยะเผื่อ",
  fields: [
    ...room,
    { type: "number", key: "boxM2", label: "ตร.ม./กล่อง", unit: "ตร.ม.", default: 2.16, min: 0.5, step: 0.01 },
    { type: "number", key: "waste", label: "เผื่อเสีย", unit: "%", default: 8, min: 5 },
    { type: "number", key: "thick", label: "ปรับระดับ", unit: "มม.", default: 3, min: 0, step: 0.5 },
    {
      type: "select",
      key: "kind",
      label: "ระบบปู",
      default: "click",
      options: [
        { value: "click", label: "คลิกล็อก" },
        { value: "glue", label: "กาวลง" },
      ],
    },
    { type: "number", key: "doors", label: "ประตู", unit: "บาน", default: 1, min: 0 },
    { type: "number", key: "tmold", label: "รอยต่อต่างวัสดุ", unit: "เส้น", default: 1, min: 0 },
  ],
  calc: (v) => {
    const qty = calcVinylQty(v);
    const level = num(v, "thick", 3) > 0 ? calcSelfLevel(v) : null;
    const adh = calcVinylAdhesive(v);
    const trim = calcSkirting(v);
    const gap = calcGap(v);
    return jobFromParts({
      title: "งานพื้นกระเบื้องยาง",
      headline: qty.headline ?? "งานพื้นกระเบื้องยาง",
      rows: [
        ...qty.rows.filter((r) => r.emphasize),
        ...(level ? level.rows.filter((r) => r.emphasize) : []),
        ...adh.rows.filter((r) => r.emphasize),
        ...trim.rows.filter((r) => r.emphasize),
        ...gap.rows.filter((r) => r.emphasize),
      ],
      tip: "พื้นต้องเรียบก่อนปู คลิกล็อกอย่าลืมช่องขยายรอบห้อง",
      parts: [qty, ...(level ? [level] : []), adh, trim, gap],
    });
  },
};
