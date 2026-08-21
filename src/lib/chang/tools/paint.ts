import type { JobDef, ToolDef, Values } from "../types";
import { ceil, fmt, jobFromParts, num, resultX, str } from "../math";
import { DISCLAIMER_AB, UNIT } from "../constants";

function wallBreakdown(v: Values) {
  const l = num(v, "l", 5);
  const w = num(v, "w", 4);
  const h = num(v, "h", 2.6);
  const doors = num(v, "doors", 1);
  const windows = num(v, "windows", 1);
  const factor = str(v, "surf", "smooth") === "rough" ? 1.15 : str(v, "surf", "smooth") === "tex" ? 1.25 : 1;
  const gross = 2 * (l + w) * h;
  const openings = doors * 1.8 + windows * 1.2;
  const net = Math.max(0, (gross - openings) * factor);
  return { gross, openings, factor, net };
}

function wallNet(v: Values) {
  return wallBreakdown(v).net;
}

export function calcWallArea(v: Values) {
  const { gross, openings, factor, net } = wallBreakdown(v);
  const netBeforeFactor = Math.max(0, gross - openings);

  return resultX({
    title: "พื้นที่ผนังสุทธิ",
    rows: [{ label: "พื้นที่ผนังสุทธิ", value: `${fmt(net, 2)} ตร.ม.`, emphasize: true }],
    chart: {
      kind: "stack",
      parts: [
        { label: "ผนังสุทธิ (หักช่องเปิด)", value: netBeforeFactor, display: `${fmt(netBeforeFactor, 2)} ตร.ม.`, tone: "accent" },
        { label: "ประตู-หน้าต่าง (หักออก)", value: openings, display: `${fmt(openings, 2)} ตร.ม.`, tone: "mute" },
      ],
      totalLabel: factor > 1 ? `พื้นที่คิดสี (×${factor} ผิวขรุขระ)` : "พื้นที่รอบห้อง",
      totalDisplay: `${fmt(factor > 1 ? net : gross, 2)} ตร.ม.`,
    },
    tip: "หักประตู-หน้าต่างแล้ว ผนังเปลือยฉาบไม่เรียบใช้ตัวคูณผิวขรุขระ",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "พื้นที่ผนังสุทธิ = พื้นที่รอบห้อง (เส้นรอบ × สูง) หักพื้นที่ประตู-หน้าต่าง แล้วคูณตัวคูณผิวผนังถ้าไม่เรียบ",
      steps: [
        {
          label: "พื้นที่รอบห้อง",
          expr: "gross = 2×(ยาว+กว้าง) × สูง",
          subst: `2×(${fmt(num(v, "l", 5), 1)}+${fmt(num(v, "w", 4), 1)}) × ${fmt(num(v, "h", 2.6), 1)} = ${fmt(gross, 2)} ตร.ม.`,
        },
        {
          label: "หักช่องเปิด",
          expr: "openings = ประตู×1.8 + หน้าต่าง×1.2",
          subst: `${fmt(num(v, "doors", 1))}×1.8 + ${fmt(num(v, "windows", 1))}×1.2 = ${fmt(openings, 2)} ตร.ม.`,
        },
        ...(factor > 1
          ? [
              {
                label: "คูณตัวคูณผิวผนัง",
                expr: `net = (gross − openings) × ${factor}`,
                subst: `${fmt(netBeforeFactor, 2)} × ${factor} = ${fmt(net, 2)} ตร.ม.`,
                note: "ผิวหยาบหรือลายผิวดูดสีมากกว่าผิวเรียบ จึงคิดพื้นที่เสมือนมากขึ้น",
              },
            ]
          : []),
      ],
      assumptions: ["ประตูมาตรฐานกว้างเฉลี่ย 0.9×2 ม. (1.8 ตร.ม.) หน้าต่างเฉลี่ย 1.2 ตร.ม./บาน ถ้าขนาดจริงต่างมากควรกรอกพื้นที่เอง"],
      caveats: ["ผนังที่มีคานหรือเสาโผล่จะมีพื้นที่จริงมากกว่าที่คิดจากเส้นรอบตรง ๆ", DISCLAIMER_AB],
      refs: [{ label: "แนวปฏิบัติงานประมาณราคางานทาสี" }],
    },
  });
}

export function calcPaintQty(v: Values) {
  const net = num(v, "area", 0) || wallNet(v);
  const covP = Math.max(num(v, "covP", 30), 1);
  const coatsP = num(v, "coatsP", 1);
  const covT = Math.max(num(v, "covT", 32), 1);
  const coatsT = num(v, "coatsT", 2);
  const primerGal = (net * coatsP) / covP;
  const topGal = (net * coatsT) / covT;
  const pack = (gals: number) => {
    const pails = Math.floor(gals / UNIT.paintPail.value);
    const rest = ceil(gals - pails * UNIT.paintPail.value);
    return pails > 0 ? `${pails} ถังใหญ่ + ${rest} แกลลอน` : rest > 0 ? `${rest} แกลลอน` : "0 แกลลอน";
  };
  return resultX({
    title: "ปริมาณสี",
    headline: `สีทับหน้าประมาณ ${pack(topGal)}`,
    chart: {
      kind: "stack",
      parts: [
        {
          label: `รองพื้น ${fmt(coatsP)} เที่ยว`,
          value: primerGal,
          display: `${fmt(primerGal, 2)} แกลลอน`,
          tone: "mute",
        },
        {
          label: `ทับหน้า ${fmt(coatsT)} เที่ยว`,
          value: topGal,
          display: `${fmt(topGal, 2)} แกลลอน`,
          tone: "accent",
        },
      ],
      totalLabel: "รวมเนื้อสีที่ใช้จริง",
      totalDisplay: `${fmt(primerGal + topGal, 2)} แกลลอน`,
    },
    rows: [
      { label: "พื้นที่คิดสี", value: `${fmt(net, 2)} ตร.ม.` },
      { label: "รองพื้น", value: `${fmt(primerGal, 2)} แกลลอน (${fmt(primerGal * UNIT.gallon.value, 1)} ล.)` },
      { label: "สั่งรองพื้น", value: pack(primerGal), emphasize: true },
      { label: "ทับหน้า", value: `${fmt(topGal, 2)} แกลลอน (${fmt(topGal * UNIT.gallon.value, 1)} ล.)` },
      { label: "สั่งทับหน้า", value: pack(topGal), emphasize: true },
    ],
    tip: "1 แกลลอน = 3.785 ลิตร · 1 ถังใหญ่ = 5 แกลลอน สั่ง Lot เดียวกันสีไม่เพี้ยน",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "ปริมาณสี = พื้นที่ทาสี × จำนวนเที่ยว ÷ ความครอบคลุมต่อแกลลอน",
      steps: [
        {
          label: "พื้นที่ผนังสุทธิ",
          expr: "A = รอบห้อง × สูง − ช่องเปิด แล้วคูณตัวคูณผิวผนัง",
          subst: `A = ${fmt(net, 2)} ตร.ม.`,
          note: "ผิวหยาบหรืออิฐโชว์ดูดสีมากกว่าผิวเรียบ จึงมีตัวคูณเพิ่ม",
        },
        {
          label: "สีรองพื้น",
          expr: "แกลลอน = A × เที่ยว ÷ ความครอบคลุม",
          subst: `${fmt(net, 2)} × ${fmt(coatsP)} ÷ ${fmt(covP)} = ${fmt(primerGal, 2)} แกลลอน`,
        },
        {
          label: "สีทับหน้า",
          expr: "แกลลอน = A × เที่ยว ÷ ความครอบคลุม",
          subst: `${fmt(net, 2)} × ${fmt(coatsT)} ÷ ${fmt(covT)} = ${fmt(topGal, 2)} แกลลอน`,
        },
        {
          label: "จัดเป็นขนาดบรรจุที่ขาย",
          expr: "รวมเป็นถังใหญ่ (5 แกลลอน) ก่อน เศษปัดขึ้นเป็นแกลลอน",
          subst: `รองพื้น ${pack(primerGal)} · ทับหน้า ${pack(topGal)}`,
        },
      ],
      constants: [UNIT.gallon, UNIT.paintPail],
      assumptions: [
        "ความครอบคลุมต่อแกลลอนใช้ค่าที่ผู้ใช้กรอก ค่าตั้งต้นเป็นค่ากลางของสีอิมัลชันในไทย",
        "ทาด้วยลูกกลิ้งบนผนังฉาบเรียบ",
      ],
      caveats: [
        "ค่าความครอบคลุมบนกระป๋องคือค่าในห้องแล็บ หน้างานจริงมักได้น้อยกว่า 10–20%",
        "ผนังฉาบใหม่หรือสีเข้มทับสีอ่อน ต้องเพิ่มเที่ยวหรือเผื่อสีมากขึ้น",
        DISCLAIMER_AB,
      ],
      refs: [
        { label: "TDS สีอิมัลชัน (ค่าความครอบคลุมต่อแกลลอน)" },
        { label: "ISO 2808 การวัดความหนาฟิล์มสี" },
      ],
    },
  });
}

export function calcSkim(v: Values) {
  const net = num(v, "area", 0) || wallNet(v);
  const rate = 1.8;
  const coats = 2;
  const bagSize = 20;
  const kg = net * rate * coats;
  const bags = ceil(kg / bagSize);

  return resultX({
    title: "ฉาบบาง + พุตตี้",
    headline: `ฉาบบางประมาณ ${bags} ถุง`,
    chart:
      bags > 0
        ? {
            kind: "packs",
            unitLabel: `ถุง ${bagSize} กก.`,
            count: bags,
            lastUsed: (kg - (bags - 1) * bagSize) / bagSize,
            note: `${coats} เที่ยว ที่อัตรา ${rate} กก./ตร.ม./เที่ยว`,
          }
        : undefined,
    rows: [
      { label: "พื้นที่", value: `${fmt(net, 2)} ตร.ม.` },
      { label: "สกิม/พุตตี้ 2 เที่ยว", value: `${fmt(kg, 1)} กก.` },
      { label: "ถุง 20 กก.", value: `${bags} ถุง`, emphasize: true },
    ],
    tip: "ผนังมวลเบาและยิปซัมฉาบ 2 เที่ยว ก่อนทารองพื้น",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "น้ำหนักสกิม/พุตตี้ = พื้นที่ × อัตราใช้ต่อเที่ยว × จำนวนเที่ยว",
      steps: [
        {
          label: "น้ำหนักรวม",
          expr: `kg = พื้นที่ × ${rate} × ${coats} เที่ยว`,
          subst: `${fmt(net, 2)} × ${rate} × ${coats} = ${fmt(kg, 1)} กก.`,
        },
        {
          label: "แปลงเป็นถุง",
          expr: `ถุง = kg ÷ ${bagSize} ปัดขึ้น`,
          subst: `${fmt(kg, 1)} ÷ ${bagSize} = ${bags} ถุง`,
        },
      ],
      assumptions: ["ผนังมวลเบา/ยิปซัมที่ต้องฉาบบางปิดรอยต่อและเรียบผิวก่อนทาสี ไม่ใช่ผนังปูนที่เรียบอยู่แล้ว"],
      caveats: ["ผนังไม่เรียบมากอาจต้องฉาบเพิ่มเที่ยวหรือหนาขึ้นเฉพาะจุด ทำให้ใช้มากกว่านี้", DISCLAIMER_AB],
      refs: [{ label: "TDS สกิม/พุตตี้สำเร็จรูป (อัตราการใช้ต่อตารางเมตรต่อเที่ยว)" }],
    },
  });
}

export function calcWallpaper(v: Values) {
  const net = num(v, "area", 0) || wallNet(v);
  const roll = num(v, "roll", 5.3);
  const waste = num(v, "waste", 15) / 100;
  const need = net * (1 + waste);
  const rolls = ceil(need / Math.max(roll, 1));

  return resultX({
    title: "วอลเปเปอร์",
    headline: `${rolls} ม้วน`,
    chart:
      rolls > 0
        ? {
            kind: "packs",
            unitLabel: `ม้วน ${fmt(roll, 1)} ตร.ม.`,
            count: rolls,
            lastUsed: (need - (rolls - 1) * roll) / roll,
            note: `เผื่อลาย ${fmt(waste * 100)}% แล้ว`,
          }
        : undefined,
    rows: [
      { label: "พื้นที่", value: `${fmt(net, 2)} ตร.ม.` },
      { label: "ม้วนละ", value: `${fmt(roll, 1)} ตร.ม.` },
      { label: "เผื่อต่อลาย", value: `${fmt(waste * 100)}%` },
      { label: "จำนวนม้วน", value: `${rolls} ม้วน`, emphasize: true },
    ],
    tip: "ลายซ้ำสูงเผื่อ 20% เก็บม้วน Lot เดียวกัน",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "จำนวนม้วน = พื้นที่ × (1 + เผื่อลาย) ÷ พื้นที่ต่อม้วน ปัดขึ้น",
      steps: [
        {
          label: "พื้นที่ที่ต้องใช้จริง",
          expr: "need = พื้นที่ × (1 + เผื่อ)",
          subst: `${fmt(net, 2)} × ${1 + waste} = ${fmt(need, 2)} ตร.ม.`,
        },
        {
          label: "แปลงเป็นม้วน",
          expr: "ม้วน = need ÷ พื้นที่ต่อม้วน ปัดขึ้น",
          subst: `${fmt(need, 2)} ÷ ${fmt(roll, 1)} = ${rolls} ม้วน`,
        },
      ],
      assumptions: ["ผนังเรียบพร้อมติด ไม่ได้เผื่อเศษเพิ่มจากผนังไม่ตรง"],
      caveats: ["ลายซ้ำสูง (large repeat) เสียเศษมากกว่าลายเรียบ ควรเผื่อ 15–20% หรือมากกว่านั้น", DISCLAIMER_AB],
      refs: [{ label: "แนวปฏิบัติงานติดตั้งวอลเปเปอร์ (เผื่อลายซ้ำ)" }],
    },
  });
}

export function calcConsumables(v: Values) {
  const net = num(v, "area", 0) || wallNet(v);
  const tape = ceil(net / 20);
  const roller = Math.max(1, ceil(net / 40));
  const brush = 2;
  const sheet = ceil(net / 30);

  return resultX({
    title: "วัสดุสิ้นเปลือง",
    headline: "ชุดสิ้นเปลืองงานสี",
    chart: {
      kind: "stack",
      parts: [
        { label: "เทปย่น", value: tape, display: `${tape} ม้วน`, tone: "accent" },
        { label: "ลูกกลิ้ง", value: roller, display: `${roller} อัน`, tone: "mute" },
        { label: "ผ้าคลุม", value: sheet, display: `${sheet} ผืน`, tone: "warn" },
      ],
      totalLabel: "พื้นที่งาน",
      totalDisplay: `${fmt(net, 2)} ตร.ม.`,
    },
    rows: [
      { label: "เทปย่น", value: `${tape} ม้วน`, emphasize: true },
      { label: "ลูกกลิ้ง", value: `${roller} อัน` },
      { label: "แปรง", value: `${brush} ด้าม` },
      { label: "ผ้าคลุม", value: `${sheet} ผืน` },
    ],
    tip: "อย่าลืมกระดาษทราย 180/240 และถาดสี",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "ประมาณจำนวนวัสดุสิ้นเปลืองตามพื้นที่งาน — เทปย่นทุก 20 ตร.ม. ลูกกลิ้งทุก 40 ตร.ม. ผ้าคลุมทุก 30 ตร.ม.",
      steps: [
        {
          label: "เทปย่นและผ้าคลุม",
          expr: "เทป = พื้นที่ ÷ 20 · ผ้าคลุม = พื้นที่ ÷ 30",
          subst: `${fmt(net, 2)} ÷ 20 = ${tape} ม้วน · ${fmt(net, 2)} ÷ 30 = ${sheet} ผืน`,
        },
        {
          label: "ลูกกลิ้ง",
          expr: "ลูกกลิ้ง = พื้นที่ ÷ 40 (อย่างน้อย 1 อัน)",
          subst: `${fmt(net, 2)} ÷ 40 = ${roller} อัน`,
        },
      ],
      assumptions: ["ตัวเลขนี้เป็นค่าประมาณเผื่อของหน้างานทั่วไป ไม่ได้คิดจากอัตราสิ้นเปลืองที่วัดจริง"],
      caveats: ["งานที่มีมุมหรือขอบซับซ้อนมากใช้เทปย่นมากกว่านี้", DISCLAIMER_AB],
      refs: [{ label: "แนวปฏิบัติหน้างานทาสี (ประมาณของสิ้นเปลืองตามพื้นที่)" }],
    },
  });
}

const room = [
  { type: "number" as const, key: "l", label: "ยาวห้อง", unit: "ม.", default: 5, min: 1, step: 0.1 },
  { type: "number" as const, key: "w", label: "กว้างห้อง", unit: "ม.", default: 4, min: 1, step: 0.1 },
  { type: "number" as const, key: "h", label: "สูงห้อง", unit: "ม.", default: 2.6, min: 2, step: 0.1 },
  { type: "number" as const, key: "doors", label: "ประตู", unit: "บาน", default: 1, min: 0 },
  { type: "number" as const, key: "windows", label: "หน้าต่าง", unit: "บาน", default: 1, min: 0 },
  {
    type: "select" as const,
    key: "surf",
    label: "ผิวผนัง",
    default: "smooth",
    options: [
      { value: "smooth", label: "เรียบ" },
      { value: "rough", label: "ฉาบหยาบ" },
      { value: "tex", label: "ลายผิว / อิฐโชว์" },
    ],
  },
];

export const paintTools: ToolDef[] = [
  { id: "area", name: "พื้นที่ผนังสุทธิ", blurb: "หักประตูหน้าต่าง", fields: room, calc: calcWallArea },
  {
    id: "qty",
    name: "ปริมาณสี",
    blurb: "รองพื้น + ทับหน้า เป็นแกลลอน",
    fields: [
      ...room,
      { type: "number", key: "covP", label: "รองพื้นครอบคลุม", unit: "ตร.ม./แกลลอน", default: 30, min: 10 },
      { type: "number", key: "coatsP", label: "เที่ยวรองพื้น", unit: "เที่ยว", default: 1, min: 0 },
      { type: "number", key: "covT", label: "ทับหน้าครอบคลุม", unit: "ตร.ม./แกลลอน", default: 32, min: 10 },
      { type: "number", key: "coatsT", label: "เที่ยวทับหน้า", unit: "เที่ยว", default: 2, min: 1 },
    ],
    calc: calcPaintQty,
  },
  { id: "skim", name: "ฉาบบาง + พุตตี้", blurb: "ก่อนทาสี", fields: room, calc: calcSkim },
  {
    id: "wallpaper",
    name: "วอลเปเปอร์",
    blurb: "จำนวนม้วน + เผื่อลาย",
    fields: [
      ...room,
      { type: "number", key: "roll", label: "พื้นที่/ม้วน", unit: "ตร.ม.", default: 5.3, min: 2, step: 0.1 },
      { type: "number", key: "waste", label: "เผื่อต่อลาย", unit: "%", default: 15, min: 5 },
    ],
    calc: calcWallpaper,
  },
  { id: "consumables", name: "วัสดุสิ้นเปลือง", blurb: "เทป ลูกกลิ้ง ผ้าคลุม", fields: room, calc: calcConsumables },
];

export const paintJob: JobDef = {
  name: "คิดทั้งงานทาสีห้อง",
  blurb: "ห้องครั้งเดียว ได้สี ฉาบบาง ของสิ้นเปลือง",
  fields: [
    ...room,
    { type: "number", key: "covP", label: "รองพื้น ตร.ม./แกลลอน", default: 30, min: 10 },
    { type: "number", key: "coatsP", label: "เที่ยวรองพื้น", default: 1, min: 0 },
    { type: "number", key: "covT", label: "ทับหน้า ตร.ม./แกลลอน", default: 32, min: 10 },
    { type: "number", key: "coatsT", label: "เที่ยวทับหน้า", default: 2, min: 1 },
  ],
  calc: (v) => {
    const area = calcWallArea(v);
    const paint = calcPaintQty(v);
    const skim = calcSkim(v);
    const con = calcConsumables(v);
    return jobFromParts({
      title: "งานทาสีทั้งห้อง",
      headline: paint.headline ?? "งานทาสี",
      rows: [
        ...area.rows,
        ...paint.rows.filter((r) => r.emphasize || r.label.startsWith("สั่ง")),
        ...skim.rows.filter((r) => r.emphasize),
        ...con.rows.filter((r) => r.emphasize || r.label === "ลูกกลิ้ง"),
      ],
      tip: "ยังไม่รวมค่าแรง นี่คือของที่ต้องซื้อก่อนขึ้นนั่งร้าน",
      parts: [area, paint, skim, con],
    });
  },
};
