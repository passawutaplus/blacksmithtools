import type { JobDef, ToolDef, Values } from "../types";
import { blockedResult, ceil, fmt, fmtTrim, guardInputs, guardTool, jobFromParts, num, resultX, round, str, withDefaults } from "../math";
import {
  DISCLAIMER_AB,
  DISCLAIMER_C,
  HOME_PUMP,
  HOME_PUMP_WATTS,
  PIPE_KIT,
  PRESSURE_TANK,
  PRESSURE_TANK_SIZES,
  PUMP,
  PUMP_HP_SIZES,
  PVC_PIPES,
  PVC_VEL_MAX,
  TANK_SIZES,
  TANK_STAND,
  UNIT,
  WATER,
  WATER_HEAT,
} from "../constants";

const guard = (id: string, v: Values) => guardTool(plumbingTools, id, v);

export function calcTank(v: Values) {
  const bad = guard("tank", v);
  if (bad) return bad;
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
    headline: overTable
      ? `ต้องสำรอง ${fmt(liters)} ลิตร — เกินถังใบเดียว (ใหญ่สุด ${fmt(TANK_SIZES[TANK_SIZES.length - 1])} ล.) ต่อถังหลายใบ`
      : `ถัง ${fmt(tank)} ลิตร`,
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
      {
        label: "ถังแนะนำ",
        value: overTable ? `รวม ${fmt(tank)} ลิตร (ต่อหลายใบขนานกัน)` : `${fmt(tank)} ลิตร`,
        emphasize: true,
      },
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

/** กำลังปั๊มที่ต้องการจากอัตราไหล (ล./นาที) และเฮดรวม (ม.) — ใช้ร่วมกันระหว่างเครื่องมือเลือกปั๊มและปั๊มบ้าน */
export function pumpPower(q: number, h: number): { kw: number; hp: number; watts: number } {
  const kw = (q / 60) * UNIT.gravity.value * h * PUMP.headReserve.value / (PUMP.efficiency.value * 1000);
  return { kw, hp: kw / PUMP.hpPerKw.value, watts: kw * 1000 };
}

/** เฮดรวมของบ้าน = ชั้น × สูงต่อชั้น + แรงดันเหลือปลายก๊อก + แรงเสียดทานตามระยะท่อ (ค่าเดียวกับหน้าคิดทั้งงานประปา) */
export function homeHead(floors: number, len: number): number {
  return floors * HOME_PUMP.floorHeight.value + HOME_PUMP.residualHead.value + len * HOME_PUMP.frictionPerM.value;
}

export function calcPump(v: Values) {
  const bad = guard("pump", v);
  if (bad) return bad;
  const q = num(v, "q", 40);
  const h = num(v, "h", 18);
  const { kw, hp, watts } = pumpPower(q, h);
  const rec = PUMP_HP_SIZES.find((s) => s >= hp) ?? ceil(hp);
  const chosenIdx = PUMP_HP_SIZES.indexOf(rec as (typeof PUMP_HP_SIZES)[number]);
  const ladder = chosenIdx < 0 ? [] : PUMP_HP_SIZES.slice(Math.max(0, chosenIdx - 2), chosenIdx + 3);
  // ปั๊มบ้านตัวเล็กติดป้ายเป็นวัตต์ จึงตอบวัตต์นำเมื่อกำลังที่ต้องการไม่เกินขั้น 0.5 แรงม้า
  const small = hp <= PUMP.smallHp.value;
  const hpText = `${fmtTrim(rec, 2)} HP`;
  const wattText = `${fmt(ceil(watts))} วัตต์`;

  return resultX({
    title: "เลือกปั๊มน้ำ",
    headline: small ? `ปั๊มกำลังไม่ต่ำกว่า ${wattText} (เทียบขั้น ${hpText})` : `ปั๊มประมาณ ${hpText} (ต้องการ ${wattText})`,
    chart:
      ladder.length > 1
        ? {
            kind: "steps",
            unit: "HP",
            need: round(hp, 2),
            needLabel: "กำลังที่ต้องการ",
            items: ladder.map((s) => ({
              label: `${fmtTrim(s, 2)} HP`,
              value: s,
              state: s === rec ? "chosen" : s < hp ? "under" : "over",
            })),
          }
        : undefined,
    rows: [
      { label: "อัตราไหล", value: `${fmt(q)} ลิตร/นาที` },
      { label: "เฮดรวม", value: `${fmt(h)} ม.` },
      { label: "กำลังที่ต้องการ", value: `${wattText} (${fmt(hp, 2)} HP)` },
      {
        label: "ปั๊มแนะนำ",
        value: small ? `รุ่นที่กำลังมอเตอร์ไม่ต่ำกว่า ${wattText} · ถ้าดูเป็นแรงม้า ${hpText}` : `${hpText} (${fmt(rec * PUMP.hpPerKw.value * 1000)} วัตต์)`,
        emphasize: true,
      },
    ],
    tip: small
      ? "ปั๊มบ้านดูวัตต์บนฉลาก เลือกรุ่นที่วัตต์ไม่ต่ำกว่านี้ แล้วเทียบกราฟอัตราไหล-เฮดของรุ่นนั้นอีกที"
      : "เผื่อประสิทธิภาพ 55% และเฮดสำรอง 20% เลือกจากกราฟปั๊มจริงอีกที",
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
          subst: `${fmt(kw, 3)} kW = ${fmt(watts)} วัตต์ · ${fmt(kw, 3)} ÷ ${PUMP.hpPerKw.value} = ${fmt(hp, 2)} HP`,
        },
        {
          label: "เลือกไซซ์ที่ขายจริง",
          expr: "ปั๊ม = ไซซ์มาตรฐานตัวถัดไปที่ ≥ HP ที่คำนวณ",
          subst: `${fmt(hp, 2)} HP → ${hpText}`,
          note: "ขั้นแรงม้าตามพิกัดมอเตอร์มาตรฐาน ปั๊มบ้านตัวเล็กให้ดูวัตต์บนฉลากแทน",
        },
      ],
      constants: [PUMP.efficiency, PUMP.headReserve, PUMP.hpPerKw],
      assumptions: ["เฮดรวม = ความสูงที่ส่งน้ำขึ้นจริง + แรงดันที่ต้องการปลายทาง + แรงเสียดทานในท่อและอุปกรณ์ (คิดเป็นเมตรน้ำ)", "ปั๊มหอยโข่งบ้านพักอาศัยทั่วไป ประสิทธิภาพประมาณ 55%"],
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
  const bad = guard("pipe", v);
  if (bad) return bad;
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
  const bad = guard("slope", v);
  if (bad) return bad;
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
        // กราฟนับค่าที่เท่ากับขอบเป็นโซนล่าง จึงถอยขอบลงเล็กน้อย — 1:100 (1.00%) ต้องอยู่โซน "ใช้ได้" ตามกติกาที่เขียนไว้
        { upTo: 0.99, tone: "bad", label: "แบนไป (< 1:100)" },
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
  const bad = guard("bom", v);
  if (bad) return bad;
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
    tip: "เผื่อกาวอีกขวดบนรถ หน้างานแห้งเร็ว กาวหมดกลางงานเสียจังหวะมาก",
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

/* ─────────── ถังแรงดัน (คิดจากน้ำที่ถังต้องจ่ายต่อรอบ) ─────────── */

export function calcPressureTank(v: Values) {
  const bad = guard("ptank", v);
  if (bad) return bad;
  const watts = num(v, "watts", 250);
  const q = num(v, "q", 30);
  const on = num(v, "cutIn", 1.4);
  const off = num(v, "cutOut", 2.8);
  const psi = PRESSURE_TANK.psiPerBar.value;
  const minDiff = PRESSURE_TANK.minDiff.value;
  if (off - on < minDiff - 1e-9) {
    return blockedResult({
      headline:
        off <= on
          ? `แรงดันปั๊มตัด (${fmtTrim(off, 1)} bar) ต้องสูงกว่าปั๊มติด (${fmtTrim(on, 1)} bar) — ตรวจค่าที่กรอก`
          : `ปั๊มติด-ตัดห่างกันแค่ ${fmtTrim(off - on, 2)} bar น้อยเกินไป (อย่างน้อย ${fmtTrim(minDiff, 1)} bar)`,
      rows: [{ label: "ที่คิดได้", value: `ปั๊มตัดสูงกว่าปั๊มติดอย่างน้อย ${fmtTrim(minDiff, 1)} bar` }],
      tip: "ดูค่าบนสวิตช์แรงดัน: ตัวเลขต่ำคือปั๊มติด ตัวเลขสูงคือปั๊มตัด",
    });
  }
  const large = watts > PRESSURE_TANK.largePumpW.value;
  const runRef = large ? PRESSURE_TANK.minRunLarge : PRESSURE_TANK.minRunSmall;
  const drawdown = q * runRef.value;
  const atm = PRESSURE_TANK.atm.value;
  const pre = on - PRESSURE_TANK.prechargeBelowCutIn.value;
  // กฎของบอยล์: ลมในถังอัดจากแรงดันเติมลมไปถึงแรงดันปั๊มติด/ตัด → ส่วนของถังที่จ่ายน้ำได้ระหว่างปั๊มตัดถึงปั๊มติด
  const frac = (pre + atm) * (1 / (on + atm) - 1 / (off + atm));
  const liters = drawdown / frac;
  const biggest = PRESSURE_TANK_SIZES[PRESSURE_TANK_SIZES.length - 1];
  const tank = PRESSURE_TANK_SIZES.find((s) => s >= liters - 1e-9);
  const count = tank ? 1 : ceil(liters / biggest);
  const chosenIdx = tank ? PRESSURE_TANK_SIZES.indexOf(tank) : -1;
  const ladder = chosenIdx < 0 ? [] : PRESSURE_TANK_SIZES.slice(Math.max(0, chosenIdx - 2), chosenIdx + 3);
  const tankText = tank ? `ถังแรงดัน ${fmt(tank)} ลิตร` : `ถัง ${fmt(biggest)} ลิตร × ${fmt(count)} ใบ (ต่อขนาน)`;

  return resultX({
    title: "ขนาดถังแรงดัน",
    headline: tankText,
    chart:
      ladder.length > 1
        ? {
            kind: "steps",
            unit: "ลิตร",
            need: round(liters, 1),
            needLabel: "ความจุที่ต้องการ",
            items: ladder.map((s) => ({ label: `${fmt(s)} ล.`, value: s, state: s === tank ? "chosen" : s < liters ? "under" : "over" })),
          }
        : undefined,
    rows: [
      { label: "ปั๊ม", value: `${fmt(watts)} วัตต์ · ${fmt(q)} ล./นาที` },
      { label: "ปั๊มติด / ปั๊มตัด", value: `${fmtTrim(on, 1)} / ${fmtTrim(off, 1)} bar (${fmt(on * psi)} / ${fmt(off * psi)} psi)` },
      { label: "เติมลมถังเปล่า", value: `${fmtTrim(pre, 2)} bar (${fmt(pre * psi)} psi) — ต่ำกว่าปั๊มติดเล็กน้อย` },
      { label: "ปั๊มเดินอย่างน้อย", value: `${fmtTrim(runRef.value, 1)} นาที/รอบ` },
      { label: "น้ำที่ถังต้องจ่ายต่อรอบ", value: `${fmt(drawdown)} ลิตร` },
      { label: "ถังจ่ายน้ำได้", value: `${fmt(frac * 100, 1)}% ของความจุ` },
      { label: "ความจุที่ต้องการ", value: `${fmt(liters)} ลิตร` },
      { label: "ถังแนะนำ", value: tankText, emphasize: true },
    ],
    tip: "ปั๊มอัตโนมัติที่มีถังในตัว หรือปั๊มแรงดันคงที่ (อินเวอร์เตอร์) ไม่ต้องใช้ถังนี้ · เช็กลมถังตอนไม่มีน้ำในถังเท่านั้น",
    explain: {
      risk: "B",
      updatedAt: "2026-11-25",
      summary:
        "ความจุถัง = น้ำที่ต้องจ่ายต่อรอบ (อัตราไหล × เวลาปั๊มเดินขั้นต่ำ) ÷ สัดส่วนที่ถังจ่ายได้ระหว่างปั๊มตัดถึงปั๊มติด (กฎของบอยล์ คิดแรงดันสัมบูรณ์)",
      steps: [
        { label: "น้ำที่ถังต้องจ่ายต่อรอบ", expr: "อัตราไหล × เวลาเดินขั้นต่ำ", subst: `${fmt(q)} × ${fmtTrim(runRef.value, 1)} = ${fmt(drawdown)} ลิตร` },
        {
          label: "สัดส่วนที่ถังจ่ายได้",
          expr: "(P เติมลม + 1.013) × [1 ÷ (P ติด + 1.013) − 1 ÷ (P ตัด + 1.013)]",
          subst: `(${fmtTrim(pre, 2)} + ${fmtTrim(atm, 3)}) × [1 ÷ ${fmtTrim(on + atm, 3)} − 1 ÷ ${fmtTrim(off + atm, 3)}] = ${fmt(frac, 3)}`,
          note: "แรงดันในสูตรต้องบวกความดันบรรยากาศให้เป็นแรงดันสัมบูรณ์ก่อน",
        },
        { label: "ความจุที่ต้องการ", expr: "น้ำต่อรอบ ÷ สัดส่วน", subst: `${fmt(drawdown)} ÷ ${fmt(frac, 3)} = ${fmt(liters, 1)} ลิตร` },
        {
          label: "เลือกถังที่ขาย",
          expr: "ถังขนาดถัดไปที่ ≥ ความจุที่ต้องการ",
          subst: tank ? `${fmt(liters, 1)} → ${fmt(tank)} ลิตร` : `เกินใบใหญ่สุด ${fmt(biggest)} ลิตร → ${fmt(count)} ใบ`,
        },
      ],
      constants: [runRef, PRESSURE_TANK.prechargeBelowCutIn, PRESSURE_TANK.atm, PRESSURE_TANK.largePumpW],
      assumptions: [
        "ถังแรงดันแบบไดอะแฟรม/ถุงยาง เติมลมต่ำกว่าแรงดันปั๊มติดเล็กน้อย",
        "อัตราไหลคือที่ปั๊มส่งได้จริงช่วงแรงดันใช้งาน (ดูกราฟปั๊ม) ไม่ใช่ตัวเลขสูงสุดบนกล่อง",
        `เวลาเดินขั้นต่ำ ${fmtTrim(PRESSURE_TANK.minRunSmall.value, 1)} นาที (ปั๊มไม่เกิน ${fmt(PRESSURE_TANK.largePumpW.value)} W) · ${fmtTrim(PRESSURE_TANK.minRunLarge.value, 1)} นาที (ใหญ่กว่า)`,
      ],
      caveats: [
        "ถังเล็กไปปั๊มจะติด-ดับถี่ มอเตอร์และสวิตช์แรงดันพังเร็ว ถ้าคู่มือปั๊มกำหนดเวลาเดิน/ถังขั้นต่ำ ให้ยึดคู่มือ",
        "ลมในถังรั่วออกได้เรื่อย ๆ ตรวจและเติมลมปีละครั้ง (ตอนถังไม่มีน้ำ)",
        DISCLAIMER_AB,
      ],
      refs: [
        { label: "กฎของบอยล์ (P₁V₁ = P₂V₂) — วิธีคิดขนาดถังแรงดันจากน้ำที่จ่ายต่อรอบ (drawdown)" },
        { label: "คู่มือเลือกขนาดถังแรงดันไดอะแฟรมของผู้ผลิต (เวลาเดินปั๊มขั้นต่ำ, แรงดันเติมลม)" },
      ],
    },
  });
}

/* ─────────── ปั๊มบ้านเป็นวัตต์ ตามชั้นและห้องน้ำ ─────────── */

export function calcHomePump(v: Values) {
  const bad = guard("homepump", v);
  if (bad) return bad;
  const floors = num(v, "floors", 2);
  const baths = num(v, "baths", 2);
  const len = num(v, "len", 15);
  const q = Math.max(HOME_PUMP.minFlow.value, baths * HOME_PUMP.perBathLpm.value);
  const h = homeHead(floors, len);
  const { hp, watts } = pumpPower(q, h);
  const cls = HOME_PUMP_WATTS.find((w) => w >= watts - 1e-9);
  const hpRec = PUMP_HP_SIZES.find((s) => s >= hp) ?? ceil(hp);
  const maxW = HOME_PUMP_WATTS[HOME_PUMP_WATTS.length - 1];
  const needText = `${fmt(ceil(watts))} วัตต์`;

  return resultX({
    title: "ปั๊มบ้านกี่วัตต์",
    headline: cls ? `ปั๊มบ้าน ${fmt(cls)} วัตต์ (ต้องการ ${needText})` : `เกินปั๊มบ้าน ${fmt(maxW)} วัตต์ — ใช้ปั๊ม ${fmtTrim(hpRec, 2)} HP`,
    chart: cls
      ? {
          kind: "steps",
          unit: "W",
          need: ceil(watts) || 1,
          needLabel: "กำลังที่ต้องการ",
          items: HOME_PUMP_WATTS.map((w) => ({ label: `${w} W`, value: w, state: w === cls ? "chosen" : w < watts ? "under" : "over" })),
        }
      : undefined,
    rows: [
      { label: "บ้าน", value: `${fmt(floors)} ชั้น · ห้องน้ำ ${fmt(baths)} ห้อง` },
      { label: "อัตราไหลที่ใช้คิด", value: `${fmt(q)} ล./นาที` },
      { label: "เฮดรวม", value: `${fmt(h, 1)} ม.` },
      { label: "กำลังที่ต้องการ", value: `${needText} (${fmt(hp, 2)} HP)` },
      {
        label: "ปั๊มแนะนำ",
        value: cls ? `ปั๊มอัตโนมัติ ${fmt(cls)} วัตต์` : `ปั๊ม ${fmtTrim(hpRec, 2)} HP (เกินรุ่นบ้าน ${fmt(maxW)} W) — ดูเครื่องมือเลือกปั๊มน้ำ`,
        emphasize: true,
      },
    ],
    tip: "เทียบกราฟอัตราไหล-เฮดของรุ่นที่จะซื้ออีกที · มีเครื่องทำน้ำอุ่นหลายจุดหรือฝักบัวแรง ขยับขึ้นหนึ่งขั้น",
    explain: {
      risk: "B",
      updatedAt: "2026-11-25",
      summary: "อัตราไหลจากจำนวนห้องน้ำ + เฮดจากจำนวนชั้นและระยะท่อ → กำลังปั๊ม (สูตรเดียวกับเครื่องมือเลือกปั๊มน้ำ) → เลือกขั้นวัตต์ของปั๊มบ้าน",
      steps: [
        {
          label: "อัตราไหล",
          expr: `มากกว่าระหว่าง ${fmt(HOME_PUMP.minFlow.value)} กับ ห้องน้ำ × ${fmt(HOME_PUMP.perBathLpm.value)} ล./นาที`,
          subst: `max(${fmt(HOME_PUMP.minFlow.value)}, ${fmt(baths)} × ${fmt(HOME_PUMP.perBathLpm.value)}) = ${fmt(q)} ล./นาที`,
        },
        {
          label: "เฮดรวม",
          expr: `ชั้น × ${HOME_PUMP.floorHeight.value} + ${HOME_PUMP.residualHead.value} + ระยะท่อ × ${HOME_PUMP.frictionPerM.value}`,
          subst: `${fmt(floors)} × ${HOME_PUMP.floorHeight.value} + ${HOME_PUMP.residualHead.value} + ${fmt(len)} × ${HOME_PUMP.frictionPerM.value} = ${fmt(h, 2)} ม.`,
        },
        {
          label: "กำลังที่ต้องการ",
          expr: `(Q/60) × ${UNIT.gravity.value} × H × ${PUMP.headReserve.value} ÷ ${PUMP.efficiency.value}`,
          subst: `(${fmt(q)}/60) × ${UNIT.gravity.value} × ${fmt(h, 2)} × ${PUMP.headReserve.value} ÷ ${PUMP.efficiency.value} = ${fmt(watts, 1)} W`,
        },
        {
          label: "เลือกขั้นวัตต์",
          expr: `ขั้นถัดไปที่ ≥ กำลังที่ต้องการ (${HOME_PUMP_WATTS.join(" / ")} W)`,
          subst: cls ? `${fmt(watts, 1)} W → ${fmt(cls)} W` : `${fmt(watts, 1)} W เกิน ${fmt(maxW)} W → ${fmtTrim(hpRec, 2)} HP`,
        },
      ],
      constants: [HOME_PUMP.perBathLpm, HOME_PUMP.minFlow, HOME_PUMP.floorHeight, HOME_PUMP.residualHead, HOME_PUMP.frictionPerM, PUMP.efficiency, PUMP.headReserve],
      assumptions: [
        "ทุกห้องน้ำเปิดน้ำพร้อมกัน ห้องละประมาณ 10 ล./นาที (ฝักบัว/ก๊อกทั่วไป)",
        "ปั๊มตั้งที่ชั้นล่าง ดูดจากถังเก็บน้ำบนดิน (ไม่ใช่ดูดลึกจากบ่อ)",
        "ขั้นวัตต์ตามรุ่นปั๊มบ้านอัตโนมัติที่ขายทั่วไป เทียบกับกำลังที่ต้องการแบบไม่ต่ำกว่า",
      ],
      caveats: [
        "ปั๊มดูดจากบ่อลึกหรือถังใต้ดินลึก ต้องบวกความลึกดูดเข้าเฮดด้วย แล้วคิดในเครื่องมือเลือกปั๊มน้ำ",
        "วัตต์บนฉลากแต่ละยี่ห้อวัดต่างกัน ให้ดูกราฟอัตราไหล-เฮดของรุ่นประกอบ",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "สูตรกำลังปั๊มไฮดรอลิก (Hydraulic Power) — สูตรเดียวกับเครื่องมือเลือกปั๊มน้ำ" }],
    },
  });
}

/* ─────────── นับท่อ + ข้อต่อจากจำนวนจุดน้ำ (ประมาณ) ─────────── */

/** ชนิดจุดน้ำ + ค่าตั้งต้น (บ้าน 2 ห้องน้ำทั่วไป) — ค่าตั้งต้นต้องตรงกับช่องกรอก */
const FIXTURE_FIELDS = [
  { key: "faucet", name: "ก๊อกน้ำ", def: 3 },
  { key: "toilet", name: "ชักโครก", def: 2 },
  { key: "shower", name: "ฝักบัว", def: 2 },
  { key: "basin", name: "อ่างล้างหน้า/ซิงค์", def: 2 },
  { key: "washer", name: "เครื่องซักผ้า", def: 1 },
  { key: "heater", name: "เครื่องทำน้ำอุ่น", def: 1 },
] as const;

/** ปากที่ต้องทากาวต่อข้อต่อหนึ่งตัว: สามทาง 3 · ข้องอ/ข้อต่อตรง/บอลวาล์วสวม 2 · ข้องอเกลียวใน 1 (อีกด้านเป็นเกลียว) */
const GLUED_ENDS = { tee: 3, elbow: 2, socket: 2, valve: 2, threadElbow: 1 } as const;

export function calcFittings(v: Values) {
  const bad = guard("fittings", v);
  if (bad) return bad;
  const counts = Object.fromEntries(FIXTURE_FIELDS.map((f) => [f.key, num(v, f.key, f.def)])) as Record<(typeof FIXTURE_FIELDS)[number]["key"], number>;
  const points = FIXTURE_FIELDS.reduce((s, f) => s + counts[f.key], 0);
  if (points < 1) {
    return blockedResult({
      headline: "ยังไม่มีจุดน้ำ — ใส่จำนวนก๊อก/ชักโครก/ฝักบัวอย่างน้อย 1 จุด",
      tip: "กรอกจำนวนจุดน้ำที่จะเดินท่อไปถึง แล้วรายการท่อและข้อต่อจะขึ้นเอง",
    });
  }
  const run = num(v, "run", 15);
  const waste = num(v, "waste", 10);
  const stick = PIPE_KIT.stickLen.value;
  const branchTotal = points * PIPE_KIT.branchLen.value;
  const mainSticks = ceil((run * (1 + waste / 100)) / stick);
  const branchSticks = ceil((branchTotal * (1 + waste / 100)) / stick);
  const tees = points - 1;
  const endElbow = 1;
  const mainElbows = ceil(run / PIPE_KIT.mainElbowEvery.value);
  const sockets = Math.max(0, ceil(run / stick) - 1);
  const branchElbows = points;
  const threadElbows = points;
  const ballValve = 1;
  const stopValves = counts.toilet + counts.basin + counts.washer + counts.heater;
  const fittings = tees + endElbow + mainElbows + sockets + branchElbows + threadElbows;
  const gluedEnds =
    tees * GLUED_ENDS.tee +
    (endElbow + mainElbows + branchElbows) * GLUED_ENDS.elbow +
    sockets * GLUED_ENDS.socket +
    threadElbows * GLUED_ENDS.threadElbow +
    ballValve * GLUED_ENDS.valve;
  const glue = gluedEnds * PIPE_KIT.gluePerJoint.value;
  const cans = ceil(glue / PIPE_KIT.glueCan.value);
  const threads = threadElbows + stopValves;
  const tapes = ceil(threads / PIPE_KIT.threadsPerTape.value);
  const bigHouse = points > PIPE_KIT.mainCheckAt.value;
  const pointsText = FIXTURE_FIELDS.filter((f) => counts[f.key] > 0)
    .map((f) => `${f.name} ${fmt(counts[f.key])}`)
    .join(" · ");
  const stickText = (n: number) => `${fmt(n)} เส้น (เส้นละ ${fmtTrim(stick, 1)} ม.)`;

  return resultX({
    title: "ท่อ + ข้อต่อประปา (ประมาณ)",
    headline: `ท่อ 6 หุน ${fmt(mainSticks)} เส้น · 4 หุน ${fmt(branchSticks)} เส้น · ข้อต่อ ${fmt(fittings)} ตัว (ประมาณ)`,
    rows: [
      { label: "จุดน้ำ", value: `${pointsText} (รวม ${fmt(points)} จุด)` },
      { label: "ท่อเมน PVC 6 หุน (3/4\") ชั้น 13.5", value: stickText(mainSticks), emphasize: true },
      { label: "ท่อแยก PVC 4 หุน (1/2\") ชั้น 13.5", value: stickText(branchSticks), emphasize: true },
      { label: "สามทางลด 6 × 4 หุน", value: `${fmt(tees)} ตัว` },
      { label: "ข้องอลด 6 × 4 หุน (ปลายท่อเมน)", value: `${fmt(endElbow)} ตัว` },
      { label: "ข้องอ 6 หุน (เลี้ยวท่อเมน)", value: `${fmt(mainElbows)} ตัว` },
      { label: "ข้อต่อตรง 6 หุน", value: `${fmt(sockets)} ตัว` },
      { label: "ข้องอ 4 หุน", value: `${fmt(branchElbows)} ตัว` },
      { label: "ข้องอเกลียวใน 4 หุน (หัวจุดน้ำ)", value: `${fmt(threadElbows)} ตัว` },
      { label: "บอลวาล์ว 6 หุน (ต้นทาง)", value: `${fmt(ballValve)} ตัว` },
      ...(stopValves > 0 ? [{ label: "สต็อปวาล์ว (ชักโครก อ่าง เครื่องซักผ้า เครื่องทำน้ำอุ่น)", value: `${fmt(stopValves)} ตัว` }] : []),
      { label: "กาว PVC", value: `ราว ${fmt(glue)} ก. → ${fmt(cans)} กระป๋อง (${fmt(PIPE_KIT.glueCan.value)} ก.)`, emphasize: true },
      { label: "เทปพันเกลียว", value: `${fmt(tapes)} ม้วน (${fmt(threads)} จุดเกลียว)` },
      ...(bigHouse
        ? [{ label: "จุดน้ำเยอะ", value: `เกิน ${fmt(PIPE_KIT.mainCheckAt.value)} จุด เช็กขนาดท่อเมนด้วยเครื่องมือ "ขนาดท่อ + ความเร็วน้ำ" อาจต้องใช้ 1 นิ้ว`, emphasize: true }]
        : []),
    ],
    tip: "เป็นตัวเลขประมาณจากจำนวนจุด แนวท่อจริงเลี้ยวมาก/น้อยกว่านี้ได้ — ซื้อข้อต่อเผื่ออีกถุงเล็ก ของเหลือคืนร้านได้ถูกกว่ารถวิ่งรอบสอง",
    explain: {
      risk: "A",
      updatedAt: "2026-11-25",
      summary:
        "ท่อเมน 6 หุนวิ่งจากต้นทางผ่านทุกจุด แต่ละจุดแยกด้วยสามทางลดลงท่อ 4 หุน — นับท่อเป็นเส้น 4 ม. และนับข้อต่อตามจำนวนจุด (ประมาณ ไม่ใช่แบบจริง)",
      steps: [
        { label: "จำนวนจุดน้ำ", expr: "รวมทุกชนิด", subst: `${fmt(points)} จุด` },
        {
          label: "ท่อเมน 6 หุน",
          expr: "ปัดขึ้น(ระยะท่อเมน × (1 + เผื่อ) ÷ ยาวเส้น)",
          subst: `${fmt(run, 1)} × ${fmtTrim(1 + waste / 100, 2)} ÷ ${fmtTrim(stick, 1)} → ${fmt(mainSticks)} เส้น`,
        },
        {
          label: "ท่อแยก 4 หุน",
          expr: `ปัดขึ้น(จุด × ${fmtTrim(PIPE_KIT.branchLen.value, 1)} ม. × (1 + เผื่อ) ÷ ยาวเส้น)`,
          subst: `${fmt(points)} × ${fmtTrim(PIPE_KIT.branchLen.value, 1)} = ${fmt(branchTotal, 1)} ม. × ${fmtTrim(1 + waste / 100, 2)} ÷ ${fmtTrim(stick, 1)} → ${fmt(branchSticks)} เส้น`,
        },
        { label: "สามทางลด", expr: "จุด − 1 (จุดสุดท้ายใช้ข้องอลด)", subst: `${fmt(points)} − 1 = ${fmt(tees)} ตัว` },
        {
          label: "ข้องอ + ข้อต่อตรงท่อเมน",
          expr: `ข้องอ = ปัดขึ้น(ระยะ ÷ ${fmt(PIPE_KIT.mainElbowEvery.value)}) · ข้อต่อตรง = ปัดขึ้น(ระยะ ÷ ${fmtTrim(stick, 1)}) − 1`,
          subst: `ข้องอ ${fmt(mainElbows)} ตัว · ข้อต่อตรง ${fmt(sockets)} ตัว`,
        },
        { label: "หัวจุดน้ำ", expr: "ทุกจุด: ข้องอ 1 + ข้องอเกลียวใน 1", subst: `${fmt(branchElbows)} + ${fmt(threadElbows)} ตัว` },
        {
          label: "กาว PVC",
          expr: `ปากที่ทากาว × ${fmtTrim(PIPE_KIT.gluePerJoint.value, 1)} ก. (สามทาง 3 ปาก · ข้องอ/ข้อต่อตรง/บอลวาล์ว 2 · ข้องอเกลียวใน 1)`,
          subst: `${fmt(gluedEnds)} ปาก × ${fmtTrim(PIPE_KIT.gluePerJoint.value, 1)} = ${fmt(glue)} ก. → ${fmt(cans)} กระป๋อง`,
        },
        {
          label: "เทปพันเกลียว",
          expr: `ปัดขึ้น(จุดเกลียว ÷ ${fmt(PIPE_KIT.threadsPerTape.value)})`,
          subst: `(${fmt(threadElbows)} หัวจุดน้ำ + ${fmt(stopValves)} สต็อปวาล์ว) ÷ ${fmt(PIPE_KIT.threadsPerTape.value)} → ${fmt(tapes)} ม้วน`,
        },
      ],
      constants: [PIPE_KIT.stickLen, PIPE_KIT.branchLen, PIPE_KIT.mainElbowEvery, PIPE_KIT.gluePerJoint, PIPE_KIT.glueCan, PIPE_KIT.threadsPerTape],
      assumptions: [
        "ท่อเมนเส้นเดียววิ่งผ่านทุกจุด (ไม่แยกหลายสาย) ท่อน้ำเย็นอย่างเดียว",
        "เครื่องทำน้ำอุ่นเป็นแบบจุดเดียว (ต่อน้ำเย็นเข้าเครื่อง) ไม่มีท่อน้ำร้อนเดินในผนัง",
        "ก๊อกและฝักบัวมีวาล์วในตัว จึงใส่สต็อปวาล์วเฉพาะชักโครก อ่าง เครื่องซักผ้า เครื่องทำน้ำอุ่น",
        "ระยะท่อเมนคือระยะเดินจริงจากมิเตอร์/ปั๊มถึงจุดไกลสุด รวมช่วงขึ้น-ลงแล้ว",
      ],
      caveats: [
        "เป็นค่าประมาณจากจำนวนจุด ไม่ใช่การถอดแบบ แนวท่อจริงอาจเลี้ยวมากกว่านี้",
        "บ้านสองชั้นหรือจุดน้ำเยอะ ควรแยกท่อเมนแต่ละชั้น/โซน และเช็กขนาดท่อเมน",
        "ยังไม่รวมท่อน้ำทิ้ง ท่อโสโครก ท่ออากาศ และข้อต่อสายอ่อนของสุขภัณฑ์",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวปฏิบัติหน้างานประปาบ้าน (ท่อเมน 6 หุน แยกจุดละ 4 หุน)" }],
    },
  });
}

/* ═══════════════ รอบ 4 (2026-11-26): น้ำหนักถังน้ำบนแท่น ═══════════════ */

/** น้ำหนักเต็มถัง (กก.) = ลิตร × 1 กก./ลิตร + ถังเปล่า + แท่น · แรง (kN) = กก. × g ÷ 1000 */
export function tankLoad(liters: number, emptyKg: number, standKg: number, legs: number) {
  const waterKg = liters * WATER_HEAT.density.value;
  const totalKg = waterKg + emptyKg + standKg;
  const kN = (totalKg * UNIT.gravity.value) / 1000;
  return { waterKg, totalKg, kN, legKg: totalKg / legs, legKN: kN / legs };
}

export function calcTankLoad(v: Values) {
  const bad = guard("tankload", v);
  if (bad) return bad;
  const liters = num(v, "liters", 1000);
  const emptyKg = num(v, "empty", TANK_STAND.emptyKg.value);
  const standKg = num(v, "stand", 0);
  const legs = num(v, "legs", 4);
  const t = tankLoad(liters, emptyKg, standKg, legs);
  return resultX({
    title: "น้ำหนักถังน้ำบนแท่น",
    headline: `เต็มถัง ${fmt(t.totalKg)} กก. (${fmt(t.kN, 2)} kN) · ขาละ ${fmt(t.legKg)} กก.`,
    chart:
      emptyKg + standKg > 0
        ? {
            kind: "stack",
            parts: [
              { label: "น้ำ", value: t.waterKg, display: `${fmt(t.waterKg)} กก.`, tone: "accent" },
              { label: "ถังเปล่า", value: emptyKg, display: `${fmt(emptyKg)} กก.`, tone: "mute" },
              ...(standKg > 0 ? [{ label: "แท่น/โครง", value: standKg, display: `${fmt(standKg)} กก.`, tone: "mute" as const }] : []),
            ],
            totalLabel: "รวมเต็มถัง",
            totalDisplay: `${fmt(t.totalKg)} กก.`,
          }
        : undefined,
    rows: [
      { label: `น้ำ ${fmt(liters)} ลิตร`, value: `${fmt(t.waterKg)} กก.` },
      { label: "ถังเปล่า", value: `${fmt(emptyKg, 1)} กก.` },
      ...(standKg > 0 ? [{ label: "แท่น/โครงเหล็ก", value: `${fmt(standKg, 1)} กก.` }] : []),
      { label: "น้ำหนักรวมเต็มถัง", value: `${fmt(t.totalKg, 1)} กก. = ${fmt(t.kN, 2)} kN`, emphasize: true },
      { label: `แบ่ง ${fmt(legs)} ขาเท่ากัน`, value: `ขาละ ${fmt(t.legKg, 1)} กก. = ${fmt(t.legKN, 2)} kN`, emphasize: true },
      { label: "แท่น / โครง / พื้นที่วาง", value: "ต้องให้วิศวกรออกแบบหรือตรวจ" },
    ],
    tip: "น้ำ 1 ลิตรหนัก 1 กก. ถัง 1,000 ลิตรเต็มถังหนักเกิน 1 ตัน วางบนดาดฟ้า/หลังคาต้องให้วิศวกรดูพื้นก่อน",
    explain: {
      risk: "C",
      updatedAt: "2026-11-26",
      summary: "น้ำหนักเต็มถัง = น้ำ (ลิตร × 1 กก./ลิตร) + ถังเปล่า + แท่น · แรง (kN) = กก. × 9.80665 ÷ 1000 · แบ่งเท่ากันทุกขา",
      steps: [
        { label: "น้ำ", expr: "กก. = ลิตร × 1 กก./ลิตร", subst: `${fmt(liters)} × ${WATER_HEAT.density.value} = ${fmt(t.waterKg)} กก.` },
        { label: "รวม", expr: "น้ำ + ถังเปล่า + แท่น", subst: `${fmt(t.waterKg)} + ${fmtTrim(emptyKg, 1)} + ${fmtTrim(standKg, 1)} = ${fmt(t.totalKg, 1)} กก.` },
        { label: "เป็นแรง", expr: `kN = กก. × ${UNIT.gravity.value} ÷ 1000`, subst: `${fmt(t.totalKg, 1)} × ${UNIT.gravity.value} ÷ 1000 = ${fmt(t.kN, 3)} kN` },
        { label: "ต่อขา", expr: "รวม ÷ จำนวนขา", subst: `${fmt(t.totalKg, 1)} ÷ ${fmt(legs)} = ${fmt(t.legKg, 1)} กก. (${fmt(t.legKN, 3)} kN)` },
      ],
      constants: [WATER_HEAT.density, TANK_STAND.emptyKg, UNIT.gravity],
      assumptions: ["ถังตั้งตรงกลางแท่น ทุกขารับเท่ากัน", "ใส่น้ำเต็มความจุตามป้ายถัง (บางถังใส่ได้เกินป้ายเล็กน้อย)"],
      caveats: [
        "แท่น/โครงต้องให้วิศวกร — ขาที่พื้นไม่เรียบหรือแท่นไม่ตรง ขาบางขารับมากกว่าค่าเฉลี่ยมาก (ขา 4 ขาอาจเหลือ 2 ขาทแยงรับเกือบทั้งหมด)",
        "ยังไม่รวมแรงลม แรงสั่นจากปั๊ม และแผ่นดินไหว",
        DISCLAIMER_C,
      ],
      refs: [{ label: "ความหนาแน่นน้ำและความเร่งโน้มถ่วงมาตรฐาน (ISO 80000-3)" }],
    },
  });
}

const tankLoadTool: ToolDef = {
  id: "tankload",
  name: "น้ำหนักถังน้ำบนแท่น",
  blurb: "ลิตร + ถังเปล่า → น้ำหนักเต็มถัง กก./kN และต่อขา",
  keywords: ["แท่นถังน้ำ", "ขาตั้งถัง", "หอถังน้ำ", "ถังบนดาดฟ้า", "น้ำหนักถัง", "kn"],
  fields: [
    { type: "number", key: "liters", label: "ความจุถัง", unit: "ลิตร", default: 1000, min: 50, max: 20000, step: 50 },
    { type: "number", key: "empty", label: "น้ำหนักถังเปล่า (ดูป้ายถัง)", unit: "กก.", default: TANK_STAND.emptyKg.value, min: 0, max: 2000, step: 0.5 },
    { type: "number", key: "stand", label: "น้ำหนักแท่น/โครง (ไม่รู้ใส่ 0)", unit: "กก.", default: 0, min: 0, max: 5000, step: 0.5 },
    { type: "number", integer: true, key: "legs", label: "จำนวนขา", unit: "ขา", default: 4, min: 1, max: 12 },
  ],
  calc: calcTankLoad,
};

export const plumbingTools: ToolDef[] = [
  {
    id: "tank",
    name: "ขนาดถังเก็บน้ำ",
    blurb: "สำรองตามจำนวนคน",
    fields: [
      { type: "number", integer: true, key: "people", label: "จำนวนคน", unit: "คน", default: 4, min: 1, max: 100 },
      { type: "number", key: "lp", label: "ใช้น้ำ/คน/วัน", unit: "ลิตร", default: 150, min: 50, max: 500 },
      { type: "number", key: "days", label: "สำรอง", unit: "วัน", default: 1, min: 0.5, max: 7, step: 0.5 },
    ],
    calc: calcTank,
  },
  {
    id: "pump",
    name: "เลือกปั๊มน้ำ",
    blurb: "อัตราไหล + เฮดรวม → วัตต์ / แรงม้า",
    fields: [
      { type: "number", key: "q", label: "อัตราไหล", unit: "ล./นาที", default: 40, min: 5, max: 500 },
      { type: "number", key: "h", label: "เฮดรวม (สูงที่ส่ง + แรงเสียดทานท่อ)", unit: "ม.", default: 18, min: 1, max: 100 },
    ],
    calc: calcPump,
  },
  {
    id: "homepump",
    name: "ปั๊มบ้านกี่วัตต์",
    blurb: "จำนวนชั้น + ห้องน้ำ → ปั๊ม 150–400 วัตต์",
    fields: [
      { type: "number", integer: true, key: "floors", label: "จำนวนชั้นที่ส่งน้ำขึ้น", unit: "ชั้น", default: 2, min: 1, max: 4 },
      { type: "number", integer: true, key: "baths", label: "ห้องน้ำ", unit: "ห้อง", default: 2, min: 1, max: 6 },
      { type: "number", key: "len", label: "ระยะท่อจากปั๊มถึงจุดไกลสุด", unit: "ม.", default: 15, min: 1, max: 100 },
    ],
    calc: calcHomePump,
  },
  {
    id: "ptank",
    name: "ขนาดถังแรงดัน",
    blurb: "ปั๊มติด-ตัด + อัตราไหล → ถังกี่ลิตร",
    fields: [
      { type: "number", key: "watts", label: "ปั๊ม", unit: "W", default: 250, min: 100, max: 5000 },
      { type: "number", key: "q", label: "อัตราไหลของปั๊ม", unit: "ล./นาที", default: 30, min: 5, max: 300 },
      { type: "number", key: "cutIn", label: "แรงดันปั๊มติด", unit: "bar", default: 1.4, min: 0.5, max: 5, step: 0.1 },
      { type: "number", key: "cutOut", label: "แรงดันปั๊มตัด", unit: "bar", default: 2.8, min: 1, max: 7, step: 0.1 },
    ],
    calc: calcPressureTank,
  },
  {
    id: "pipe",
    name: "ขนาดท่อ + ความเร็วน้ำ",
    blurb: "ให้ความเร็ว 1.5–2.4 ม./วินาที",
    fields: [
      { type: "number", key: "q", label: "อัตราไหล", unit: "ล./นาที", default: 30, min: 1, max: 2000 },
      { type: "number", key: "vel", label: "ความเร็วเป้า", unit: "ม./วินาที", default: 1.8, min: 0.8, max: 3, step: 0.1 },
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
      { type: "number", key: "len", label: "ความยาวท่อ", unit: "ม.", default: 8, min: 1, max: 200, step: 0.5 },
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
    fields: [{ type: "number", integer: true, key: "joints", label: "จำนวนข้อต่อ", unit: "จุด", default: 24, min: 1, max: 2000 }],
    calc: calcPlumbBom,
  },
  {
    id: "fittings",
    name: "นับท่อ + ข้อต่อจากจุดน้ำ",
    blurb: "จำนวนก๊อก ชักโครก ฝักบัว → ท่อเป็นเส้น ข้องอ สามทาง วาล์ว",
    fields: [
      { type: "number", integer: true, key: "faucet", label: "ก๊อกน้ำ (ซิงค์/ล้างพื้น/สนาม)", unit: "จุด", default: 3, min: 0, max: 30 },
      { type: "number", integer: true, key: "toilet", label: "ชักโครก", unit: "จุด", default: 2, min: 0, max: 10 },
      { type: "number", integer: true, key: "shower", label: "ฝักบัว", unit: "จุด", default: 2, min: 0, max: 10 },
      { type: "number", integer: true, key: "basin", label: "อ่างล้างหน้า/ซิงค์", unit: "จุด", default: 2, min: 0, max: 10 },
      { type: "number", integer: true, key: "washer", label: "เครื่องซักผ้า", unit: "จุด", default: 1, min: 0, max: 5 },
      { type: "number", integer: true, key: "heater", label: "เครื่องทำน้ำอุ่น", unit: "จุด", default: 1, min: 0, max: 10 },
      { type: "number", key: "run", label: "ระยะท่อเมนถึงจุดไกลสุด", unit: "ม.", default: 15, min: 1, max: 200, step: 0.5 },
      { type: "number", key: "waste", label: "เผื่อท่อตัดเสีย", unit: "%", default: 10, min: 0, max: 30 },
    ],
    calc: calcFittings,
  },
  tankLoadTool,
];

export const plumbingJob: JobDef = {
  name: "คิดทั้งงานประปาบ้าน",
  blurb: "คนในบ้าน → ถัง ปั๊ม ท่อ ของสิ้นเปลือง",
  fields: [
    { type: "number", integer: true, key: "people", label: "จำนวนคน", unit: "คน", default: 4, min: 1, max: 100 },
    { type: "number", integer: true, key: "floors", label: "ชั้นที่ปั๊มส่ง", unit: "ชั้น", default: 2, min: 1, max: 10 },
    { type: "number", key: "len", label: "ยาวท่อน้ำดีประมาณ", unit: "ม.", default: 12, min: 1, max: 200 },
    { type: "number", key: "drainLen", label: "ยาวท่อน้ำทิ้ง (เส้นยาวสุด)", unit: "ม.", default: 8, min: 1, max: 200, step: 0.5 },
    { type: "number", integer: true, key: "joints", label: "ข้อต่อประมาณ", unit: "จุด", default: 20, min: 1, max: 2000 },
  ],
  calc: (input) => {
    const bad = guardInputs(plumbingJob.fields, input);
    if (bad) return bad;
    const v = withDefaults(plumbingJob.fields, input);
    const tank = calcTank(v);
    const people = num(v, "people", 4);
    const q = Math.min(60, Math.max(20, people * 8));
    const floors = num(v, "floors", 2);
    const len = num(v, "len", 12);
    const h = homeHead(floors, len);
    const pump = calcPump({ q, h });
    const pipe = calcPlumbPipe({ q, vel: 1.8, pvcClass: "13.5" });
    const bom = calcPlumbBom(v);
    // ความลาดคิดจากความยาวท่อน้ำทิ้งโดยเฉพาะ ไม่ใช่ระยะท่อน้ำดี (40 ม. ของท่อน้ำดีเคยกลายเป็น "ตก 80 ซม.")
    const drainLen = num(v, "drainLen", 8);
    const slope = calcSlope({ len: drainLen, ratio: "50" });
    return jobFromParts({
      title: "งานประปาบ้าน",
      headline: "ชุดงานประปาบ้านคร่าว ๆ",
      rows: [
        ...tank.rows.filter((r) => r.emphasize),
        { label: "อัตราไหลจากจำนวนคน", value: `${fmt(q)} ล./นาที` },
        ...pump.rows.filter((r) => r.emphasize),
        ...pipe.rows.filter((r) => r.emphasize),
        ...slope.rows.filter((r) => r.emphasize).map((r) => ({ ...r, label: `ท่อน้ำทิ้ง ${fmtTrim(drainLen, 1)} ม. ต้องตก (1:50)` })),
        ...bom.rows.filter((r) => r.emphasize || r.label.includes("เทป")),
      ],
      tip: "อัตราไหลผูกกับจำนวนคน เฮดรวมคิดจากจำนวนชั้นและระยะท่อน้ำดี ยังไม่รวมสุขภัณฑ์และเครื่องทำน้ำอุ่น",
      parts: [tank, pump, pipe, slope, bom],
    });
  },
};
