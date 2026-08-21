import type { JobDef, ToolDef, Values } from "../types";
import { ceil, fmt, jobFromParts, num, resultX, round, str } from "../math";
import { DISCLAIMER_AB, PUMP, PVC_PIPES, PVC_VEL_MAX, TANK_SIZES, UNIT, WATER } from "../constants";

export function calcTank(v: Values) {
  const people = num(v, "people", 4);
  const lp = num(v, "lp", WATER.perPerson.value);
  const days = num(v, "days", WATER.reserveDays.value);
  const liters = people * lp * days;
  const tank = TANK_SIZES.find((s) => s >= liters) ?? ceil(liters / 1000) * 1000;
  const overTable = liters > TANK_SIZES[TANK_SIZES.length - 1];
  const chosenIdx = TANK_SIZES.indexOf(tank as (typeof TANK_SIZES)[number]);
  const ladder = overTable ? [] : TANK_SIZES.slice(Math.max(0, chosenIdx - 2), chosenIdx + 3);

  return resultX({
    title: "ขนาดถังเก็บน้ำ",
    headline: `ถัง ${fmt(tank)} ลิตร`,
    chart:
      ladder.length > 1
        ? {
            kind: "steps",
            unit: "ลิตร",
            need: liters,
            needLabel: "ใช้น้ำจริงประมาณ",
            items: ladder.map((s) => ({
              label: `${fmt(s)} ล.`,
              value: s,
              state: s === tank ? "chosen" : s < liters ? "under" : "over",
            })),
          }
        : undefined,
    rows: [
      { label: "คนในบ้าน", value: `${fmt(people)} คน` },
      { label: "อัตราใช้น้ำ", value: `${fmt(lp)} ลิตร/คน/วัน` },
      { label: "สำรอง", value: `${fmt(days)} วัน` },
      { label: "ใช้น้ำประมาณ", value: `${fmt(liters)} ลิตร` },
      { label: "ถังแนะนำ", value: `${fmt(tank)} ลิตร`, emphasize: true },
    ],
    tip: "อยากใหญ่เผื่อน้ำไม่ไหลได้ แต่อย่าเผื่อจนน้ำนิ่งเป็นสัปดาห์ คุณภาพน้ำจะตก",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "ปริมาณน้ำสำรอง = จำนวนคน × อัตราใช้น้ำต่อคนต่อวัน × จำนวนวันสำรอง แล้วเลือกถังขั้นที่ไม่เล็กกว่านั้น",
      steps: [
        {
          label: "น้ำที่ต้องสำรอง",
          expr: "ปริมาณ = คน × ลิตร/คน/วัน × วันสำรอง",
          subst: `${fmt(people)} × ${fmt(lp)} × ${fmt(days)} = ${fmt(liters)} ลิตร`,
        },
        {
          label: "เลือกถังจากขนาดที่ขายจริง",
          expr: "เลือกถังที่ความจุ ≥ ปริมาณที่ต้องสำรอง",
          subst: overTable
            ? `${fmt(liters)} ลิตร เกินถังใบเดียวที่ขายทั่วไป → ใช้ ${fmt(tank)} ลิตร โดยต่อหลายใบ`
            : `${fmt(liters)} ลิตร → ถัง ${fmt(tank)} ลิตร`,
          note: overTable ? "เกิน 5,000 ลิตร นิยมต่อถังหลายใบขนานกันแทนถังใบใหญ่ใบเดียว" : undefined,
        },
      ],
      constants: [WATER.perPerson, WATER.reserveDays],
      assumptions: [
        "เป็นบ้านพักอาศัย ไม่ได้รวมน้ำรดสวน สระว่ายน้ำ หรือกิจการค้า",
        "ถังเก็บน้ำใช้ปริมาตรใช้งานได้เกือบเต็มใบ (ถังใต้ดิน/บนดินทรงมาตรฐาน)",
      ],
      caveats: [
        "พื้นที่น้ำประปาไหลอ่อนหรือดับบ่อย ควรสำรอง 2 วัน",
        "ถังใหญ่เกินความจำเป็นทำให้น้ำค้างในถังนาน ควรมีทางระบายล้างถังและล้างถังทุก 6–12 เดือน",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวปฏิบัติงานระบบสุขาภิบาลอาคารพักอาศัย" }],
    },
  });
}

const PUMP_HP_SIZES = [0.33, 0.5, 0.75, 1, 1.5, 2, 3] as const;

export function calcPump(v: Values) {
  const q = num(v, "q", 40);
  const h = num(v, "h", 18);
  const kw = (q / 60) * UNIT.gravity.value * h * PUMP.headReserve.value / (PUMP.efficiency.value * 1000);
  const hp = kw / PUMP.hpPerKw.value;
  const rec = PUMP_HP_SIZES.find((s) => s >= hp) ?? ceil(hp);
  const chosenIdx = PUMP_HP_SIZES.indexOf(rec as (typeof PUMP_HP_SIZES)[number]);
  const ladder = chosenIdx < 0 ? [] : PUMP_HP_SIZES.slice(Math.max(0, chosenIdx - 2), chosenIdx + 3);

  return resultX({
    title: "เลือกปั๊มน้ำ",
    headline: `ปั๊มประมาณ ${fmt(rec, 2)} HP`,
    chart:
      ladder.length > 1
        ? {
            kind: "steps",
            unit: "HP",
            need: round(hp, 2),
            needLabel: "กำลังที่ต้องการ",
            items: ladder.map((s) => ({
              label: `${fmt(s, 2)} HP`,
              value: s,
              state: s === rec ? "chosen" : s < hp ? "under" : "over",
            })),
          }
        : undefined,
    rows: [
      { label: "Q", value: `${fmt(q)} ลิตร/นาที` },
      { label: "Head รวม", value: `${fmt(h)} ม.` },
      { label: "กำลังคำนวณ", value: `${fmt(hp, 2)} HP` },
      { label: "ปั๊มแนะนำ", value: `${fmt(rec, 2)} HP`, emphasize: true },
    ],
    tip: "เผื่อประสิทธิภาพ 55% และ Head สำรอง 20% เลือกกราฟปั๊มจริงอีกที",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "กำลังปั๊ม (kW) = อัตราไหล × แรงโน้มถ่วง × Head รวม ÷ ประสิทธิภาพปั๊ม แล้วแปลงเป็นแรงม้าและเลือกไซซ์ที่ขายจริง",
      steps: [
        {
          label: "กำลังไฮดรอลิกที่ต้องการ",
          expr: `P (kW) = (Q/60) × ${UNIT.gravity.value} × H × ${PUMP.headReserve.value} ÷ (${PUMP.efficiency.value} × 1000)`,
          subst: `(${fmt(q)}/60) × ${UNIT.gravity.value} × ${fmt(h)} × ${PUMP.headReserve.value} ÷ ${PUMP.efficiency.value * 1000} = ${fmt(kw, 3)} kW`,
          note: `×${PUMP.headReserve.value} คือ Head สำรองเผื่อแรงเสียดทานในท่อ · ÷${PUMP.efficiency.value} คือประสิทธิภาพปั๊มทั่วไป`,
        },
        {
          label: "แปลงเป็นแรงม้า",
          expr: `HP = kW ÷ ${PUMP.hpPerKw.value}`,
          subst: `${fmt(kw, 3)} ÷ ${PUMP.hpPerKw.value} = ${fmt(hp, 2)} HP`,
        },
        {
          label: "เลือกไซซ์ที่ขายจริง",
          expr: "ปั๊ม = ไซซ์มาตรฐานตัวถัดไปที่ ≥ HP ที่คำนวณ",
          subst: `${fmt(hp, 2)} HP → ${fmt(rec, 2)} HP`,
        },
      ],
      assumptions: ["Head รวม = Head สถิต (ความสูงที่ส่งจริง) + ประมาณ Head เสียดทานในท่อและอุปกรณ์", "ปั๊มหอยโข่งบ้านพักอาศัยทั่วไป ประสิทธิภาพประมาณ 55%"],
      caveats: [
        "ปั๊มแต่ละยี่ห้อมีกราฟ Q-H ต่างกัน ค่าที่ได้ใช้เลือกเบื้องต้น ควรเทียบกราฟปั๊มจริงก่อนซื้อ",
        "ระยะท่อดูดยาวหรือมีสิ่งกีดขวางมาก ให้เพิ่ม Head สำรองมากกว่า 20%",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "สูตรกำลังปั๊มไฮดรอลิก (Hydraulic Power) — หลักวิศวกรรมเครื่องกล" }],
    },
  });
}

export function calcPlumbPipe(v: Values) {
  const q = num(v, "q", 30);
  const vTarget = num(v, "vel", 1.8);
  const cls = str(v, "pvcClass", "13.5");
  const q_m3s = q / 1000 / 60;
  const area = q_m3s / Math.max(vTarget, 0.5);
  const d_m = Math.sqrt((4 * area) / Math.PI);
  const d_mm = d_m * 1000;
  const idOf = (p: (typeof PVC_PIPES)[number]) => (cls === "8.5" ? p.id85 : p.id135);
  const pipe = PVC_PIPES.find((p) => idOf(p) >= d_mm);
  const over = !pipe;
  const chosen = pipe ?? PVC_PIPES[PVC_PIPES.length - 1];
  const nom = chosen.nom;
  const id = idOf(chosen);
  const actualVel = q_m3s / (Math.PI * (id / 2000) ** 2);
  const tooFast = actualVel > PVC_VEL_MAX.value;
  const chosenIdx = PVC_PIPES.findIndex((p) => p.nom === nom);
  const ladder = PVC_PIPES.slice(Math.max(0, chosenIdx - 2), chosenIdx + 3);

  return {
    ...resultX({
    title: "ขนาดท่อน้ำ",
    headline: over
      ? "เกินขนาดท่อที่ตารางมี ต้องออกแบบแยก"
      : tooFast
        ? `ท่อ ${nom} มม. — ความเร็วจริง ${fmt(actualVel, 1)} ม./วินาที สูงเกิน ${PVC_VEL_MAX.value}`
        : `ท่อ PVC ${nom} มม. (ID ${fmt(id, 1)} มม.)`,
    chart:
      over || ladder.length < 2
        ? undefined
        : {
            kind: "steps",
            unit: "มม.",
            need: round(d_mm, 1),
            needLabel: "ID ที่ต้องการ",
            items: ladder.map((s) => ({
              label: `${s.nom} มม.`,
              value: idOf(s),
              state: s.nom === nom ? "chosen" : idOf(s) < d_mm ? "under" : "over",
            })),
          },
    rows: [
      { label: "อัตราไหล", value: `${fmt(q)} ล./นาที` },
      { label: "ความเร็วเป้า", value: `${fmt(vTarget, 1)} ม./วินาที` },
      { label: "ID ที่คำนวณได้", value: `${fmt(d_mm, 1)} มม.` },
      { label: "ชั้นคุณภาพ", value: `ชั้น ${cls}` },
      { label: "ท่อ PVC แนะนำ", value: over ? "เกินตาราง" : `${nom} มม. (ID ${fmt(id, 1)} มม.)`, emphasize: true },
      { label: "ความเร็วจริงในท่อ", value: `${fmt(actualVel, 1)} ม./วินาที` },
    ],
    tip: over
      ? "อัตราไหลนี้ใหญ่เกินท่อบ้านทั่วไป ให้วิศวกรระบบประปาดู"
      : "เลือกจากเส้นผ่านศูนย์กลางในจริง ไม่ใช่ขนาดเรียก บ้านใช้ความเร็ว 1.5–2.4 ม./วินาที",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "หา ID จากอัตราไหลหารความเร็วเป้า แล้วเลือกท่อ PVC จากตาราง ID ตามชั้นคุณภาพ (มอก. 17) ไม่เทียบกับขนาดเรียก",
      steps: [
        {
          label: "พื้นที่หน้าตัดที่ต้องการ",
          expr: "A = Q ÷ v  (แปลง Q เป็น ลบ.ม./วินาที)",
          subst: `A = (${fmt(q)}/1000/60) ÷ ${fmt(vTarget, 1)} = ${fmt(area, 6)} ตร.ม.`,
        },
        {
          label: "เส้นผ่านศูนย์กลางในที่ต้องการ",
          expr: "d = √(4A ÷ π)",
          subst: `√(4×${fmt(area, 6)} ÷ π) = ${fmt(d_mm, 1)} มม.`,
        },
        {
          label: "เลือกท่อจาก ID จริงตามชั้นคุณภาพ",
          expr: `ชั้น ${cls} เลือกขนาดเรียกที่ ID ≥ ${fmt(d_mm, 1)} มม.`,
          subst: over ? "เกินตาราง" : `${fmt(d_mm, 1)} → ท่อ ${nom} มม. (ID ${fmt(id, 1)} มม.) ความเร็วจริง ${fmt(actualVel, 1)} ม./วินาที`,
        },
      ],
      assumptions: ["ท่อ PVC ตาม มอก. 17 สำหรับน้ำใช้บ้านพักอาศัย", `ความเร็วน้ำเป้าหมาย 1.5–${PVC_VEL_MAX.value} ม./วินาที`],
      caveats: [
        "ขนาดเรียก 20 มม. ชั้น 13.5 มี ID ประมาณ 16 มม. เล็กกว่าที่คำนวณจากขนาดเรียกโดยตรง",
        "ท่อยาวมากหรือมีข้องอเยอะ ต้องคิดแรงดันตกจากความเสียดทานเพิ่มด้วย",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "มอก. 17 ท่อพีวีซีแข็ง สำหรับน้ำใช้ (ชั้น 8.5 / 13.5) — เลือกจาก ID ใน" }],
    },
  }),
    invalid: over,
  };
}

export function calcSlope(v: Values) {
  const len = num(v, "len", 8);
  const ratio = str(v, "ratio", "50");
  const drop = len / Number(ratio);
  const pctPerM = (1 / Number(ratio)) * 100;
  const chartMax = Math.max(3, pctPerM * 1.5);

  return resultX({
    title: "ความลาดท่อน้ำทิ้ง",
    headline: `ตก ${fmt(drop * 100, 1)} ซม. ตลอดระยะ`,
    chart: {
      kind: "threshold",
      unit: "%",
      value: round(pctPerM, 2),
      max: chartMax,
      zones: [
        { upTo: 1, tone: "bad", label: "แบนไป (< 1:100)" },
        { upTo: 2, tone: "good", label: "ใช้ได้ (1:100–1:50)" },
        { upTo: chartMax, tone: "warn", label: "ชันกว่า 1:50" },
      ],
    },
    rows: [
      { label: "ความยาวท่อ", value: `${fmt(len, 1)} ม.` },
      { label: "ความลาด", value: `1:${ratio}` },
      { label: "ตกทั้งเส้น", value: `${fmt(drop * 100, 1)} ซม.`, emphasize: true },
      { label: "ตกต่อเมตร", value: `${fmt((drop / len) * 100, 1)} ซม./ม.` },
    ],
    tip: "ท่อ 2 นิ้วบ้านใช้ 1:50 ได้ ท่อใหญ่และยาวจัด 1:100 อย่าให้มีแอ่ง",
    explain: {
      risk: "B",
      updatedAt: "2026-08-21",
      summary: "ระยะตกทั้งเส้น = ความยาวท่อ ÷ อัตราส่วนความลาด (เช่น 1:50 หมายถึงตก 1 หน่วยทุก 50 หน่วยความยาว)",
      steps: [
        {
          label: "ระยะตกทั้งเส้น",
          expr: "ตก = ความยาว ÷ อัตราส่วน",
          subst: `${fmt(len, 1)} ÷ ${ratio} = ${fmt(drop, 3)} ม. (${fmt(drop * 100, 1)} ซม.)`,
        },
        {
          label: "คิดเป็น % ความลาด",
          expr: "%ลาด = (1 ÷ อัตราส่วน) × 100",
          subst: `(1 ÷ ${ratio}) × 100 = ${fmt(pctPerM, 2)}%`,
        },
      ],
      assumptions: ["ท่อน้ำทิ้ง/น้ำโสโครกในบ้านพักอาศัย ไม่ใช่ท่อระบายน้ำฝนขนาดใหญ่หรือท่อรวมชุมชน"],
      caveats: [
        "ลาดต่ำกว่า 1:100 (แบนกว่า 1%) น้ำไหลไม่พอพาของแข็งไป เสี่ยงตะกอนตกค้างและอุดตัน",
        "ลาดชันเกินไปทำให้น้ำไหลเร็วกว่าของแข็ง เกิดกลิ่นและอุดตันได้เหมือนกัน ไม่ใช่ยิ่งชันยิ่งดี",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวปฏิบัติงานระบบสุขาภิบาล (ความลาดท่อน้ำทิ้ง 1:50–1:100)" }],
    },
  });
}

export function calcPlumbBom(v: Values) {
  const joints = num(v, "joints", 24);
  const glue = joints * 4;
  const bottleMl = 50;
  const bottles = ceil(glue / bottleMl);
  const tape = ceil(joints / 8);

  return resultX({
    title: "ของสิ้นเปลืองงานประปา",
    headline: `กาว PVC ประมาณ ${bottles} ขวดเล็ก`,
    chart:
      bottles > 0
        ? {
            kind: "packs",
            unitLabel: `ขวด ${bottleMl} มล.`,
            count: bottles,
            lastUsed: (glue - (bottles - 1) * bottleMl) / bottleMl,
            note: `ข้อต่อละประมาณ 4 มล. เผื่อขวดสำรองไว้บนรถอีก 1 ขวด`,
          }
        : undefined,
    rows: [
      { label: "ข้อต่อ", value: `${fmt(joints)} จุด` },
      { label: "กาว PVC", value: `${fmt(glue)} มล. (ประมาณ ${bottles} ขวด 50 มล.)`, emphasize: true },
      { label: "เทปพันเกลียว", value: `${tape} ม้วน` },
    ],
    tip: "เผื่อกาวอีกขวดบนรถ หน้างานแห้งเร็ว กาวหมดกลางงานโคตรเสียจังหวะ",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "กาว PVC ประมาณ 4 มล. ต่อข้อต่อหนึ่งจุด เทปพันเกลียวประมาณ 1 ม้วนต่อ 8 จุด",
      steps: [
        {
          label: "ปริมาณกาว PVC",
          expr: "กาว = จำนวนข้อต่อ × 4 มล./จุด",
          subst: `${fmt(joints)} × 4 = ${fmt(glue)} มล. → ${bottles} ขวด (50 มล.)`,
        },
        {
          label: "เทปพันเกลียว",
          expr: "เทป = จำนวนข้อต่อ ÷ 8 ปัดขึ้น",
          subst: `${fmt(joints)} ÷ 8 = ${tape} ม้วน`,
        },
      ],
      assumptions: ["ข้อต่อขนาด 1/2–1 นิ้วทั่วไปของงานประปาบ้าน ไม่ใช่ท่อขนาดใหญ่"],
      caveats: [
        "ข้อต่อขนาดใหญ่กว่า 2 นิ้วใช้กาวมากกว่านี้ต่อจุด ให้เผื่อเพิ่ม",
        "กาว PVC เปิดฝาแล้วแห้งเร็ว ควรมีขวดสำรองไว้เสมอ ไม่ใช่คำนวณให้พอดีเป๊ะ",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวปฏิบัติหน้างานประปา (อัตราใช้กาว PVC ต่อข้อต่อ)" }],
    },
  });
}

export const plumbingTools: ToolDef[] = [
  {
    id: "tank",
    name: "ขนาดถังเก็บน้ำ",
    blurb: "สำรองตามจำนวนคน",
    fields: [
      { type: "number", key: "people", label: "จำนวนคน", unit: "คน", default: 4, min: 1 },
      { type: "number", key: "lp", label: "ใช้น้ำ/คน/วัน", unit: "ลิตร", default: 150, min: 50 },
      { type: "number", key: "days", label: "สำรอง", unit: "วัน", default: 1, min: 0.5, step: 0.5 },
    ],
    calc: calcTank,
  },
  {
    id: "pump",
    name: "เลือกปั๊มน้ำ",
    blurb: "Flow + Head รวม",
    fields: [
    { type: "number", key: "q", label: "อัตราไหล (ล./นาที)", unit: "ล./นาที", default: 40, min: 5 },
    { type: "number", key: "h", label: "เฮดรวม (Flow + Head)", unit: "ม.", default: 18, min: 1 },
    ],
    calc: calcPump,
  },
  {
    id: "pipe",
    name: "ขนาดท่อ + ความเร็วน้ำ",
    blurb: "ให้ความเร็ว 1.5–2.4 ม./วินาที",
    fields: [
      { type: "number", key: "q", label: "อัตราไหล", unit: "ล./นาที", default: 30, min: 1 },
      { type: "number", key: "vel", label: "ความเร็วเป้า", unit: "ม./วินาที", default: 1.8, min: 0.8, step: 0.1 },
      {
        type: "select",
        key: "pvcClass",
        label: "ชั้นคุณภาพท่อ",
        default: "13.5",
        options: [
          { value: "13.5", label: "ชั้น 13.5 (หนา ใช้ในบ้าน)" },
          { value: "8.5", label: "ชั้น 8.5 (บาง)" },
        ],
      },
    ],
    calc: calcPlumbPipe,
  },
  {
    id: "slope",
    name: "ความลาดท่อน้ำทิ้ง",
    blurb: "1:50 / 1:100",
    fields: [
      { type: "number", key: "len", label: "ความยาวท่อ", unit: "ม.", default: 8, min: 1, step: 0.5 },
      {
        type: "select",
        key: "ratio",
        label: "ความลาด",
        default: "50",
        options: [
          { value: "50", label: "1:50 (ท่อเล็กบ้าน)" },
          { value: "80", label: "1:80" },
          { value: "100", label: "1:100 (ท่อใหญ่)" },
        ],
      },
    ],
    calc: calcSlope,
  },
  {
    id: "bom",
    name: "ของสิ้นเปลืองงานประปา",
    blurb: "กาว PVC + เทปพันเกลียว",
    fields: [{ type: "number", key: "joints", label: "จำนวนข้อต่อ", unit: "จุด", default: 24, min: 1 }],
    calc: calcPlumbBom,
  },
];

export const plumbingJob: JobDef = {
  name: "คิดทั้งงานประปาบ้าน",
  blurb: "คนในบ้าน → ถัง ปั๊ม ท่อ ของสิ้นเปลือง",
  fields: [
    { type: "number", key: "people", label: "จำนวนคน", unit: "คน", default: 4, min: 1 },
    { type: "number", key: "floors", label: "ชั้นที่ปั๊มส่ง", unit: "ชั้น", default: 2, min: 1 },
    { type: "number", key: "len", label: "ระยะท่อประมาณ", unit: "ม.", default: 12, min: 1 },
    { type: "number", key: "joints", label: "ข้อต่อประมาณ", unit: "จุด", default: 20, min: 1 },
  ],
  calc: (v) => {
    const tank = calcTank(v);
    const people = num(v, "people", 4);
    const q = Math.min(60, Math.max(20, people * 8));
    const floors = num(v, "floors", 2);
    const len = num(v, "len", 12);
    const h = floors * 3.2 + 8 + len * 0.05;
    const pump = calcPump({ q, h });
    const pipe = calcPlumbPipe({ q, vel: 1.8, pvcClass: "13.5" });
    const bom = calcPlumbBom(v);
    const slope = calcSlope({ ...v, ratio: "50" });
    return jobFromParts({
      title: "งานประปาบ้าน",
      headline: "ชุดงานประปาบ้านคร่าว ๆ",
      rows: [
        ...tank.rows.filter((r) => r.emphasize),
        { label: "อัตราไหลจากจำนวนคน", value: `${fmt(q)} ล./นาที` },
        ...pump.rows.filter((r) => r.emphasize),
        ...pipe.rows.filter((r) => r.emphasize),
        ...slope.rows.filter((r) => r.emphasize),
        ...bom.rows.filter((r) => r.emphasize || r.label.includes("เทป")),
      ],
      tip: "อัตราไหลผูกกับจำนวนคน Head รวมระยะท่อที่กรอก ยังไม่รวมสุขภัณฑ์และบอยเลอร์",
      parts: [tank, pump, pipe, slope, bom],
    });
  },
};
