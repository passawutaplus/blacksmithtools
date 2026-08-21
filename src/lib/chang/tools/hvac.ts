import type { JobDef, ToolDef, Values } from "../types";
import { bool, ceil, fmt, jobFromParts, lerpTable, num, resultX, round, str } from "../math";
import {
  AC,
  AC_CHARGE_G_PER_M,
  AC_PIPE_LONG_RUN,
  AC_SIZES,
  BTU_FACTOR,
  DISCLAIMER_AB,
  DISCLAIMER_C,
  REFRIGERANT_PT,
} from "../constants";

export function calcBtu(v: Values) {
  const w = num(v, "w", 4);
  const l = num(v, "l", 5);
  const h = num(v, "h", 2.6);
  const room = str(v, "room", "live");
  const sunKey = str(v, "sunload", "none");
  const top = bool(v, "top");
  const people = num(v, "people", 2);
  const heat = str(v, "heat", "none");

  const area = w * l;
  const factor = (BTU_FACTOR[room as keyof typeof BTU_FACTOR] ?? BTU_FACTOR.live).value;

  // เพดานสูงเกิน 3 ม. คิดตามปริมาตรแล้วหารด้วยความสูงอ้างอิง (วิธีที่ช่างแอร์ไทยใช้)
  const tall = h > AC.ceilingRef.value;
  const base = tall ? (area * h * factor) / AC.ceilingRef.value : area * factor;

  const hotRoom = room === "hot";
  const sunFactor = hotRoom
    ? 1
    : sunKey === "afternoon"
      ? AC.sunAfternoon.value
      : sunKey === "morning"
        ? AC.sunMorning.value
        : 1;
  const topFactor = hotRoom || !top ? 1 : AC.topFloor.value;
  const doubleCounted = hotRoom && (sunKey !== "none" || top);
  const extraPeople = Math.max(0, people - 2) * AC.perPerson.value;
  const extraHeat = heat === "mid" ? AC.applianceMid.value : heat === "high" ? AC.applianceHigh.value : 0;

  const btu = base * sunFactor * topFactor + extraPeople + extraHeat;
  const size = AC_SIZES.find((s) => s >= btu) ?? AC_SIZES[AC_SIZES.length - 1];
  const ton = round(size / AC.btuPerTon.value, 2);
  const undersized = size < btu;

  const sizeIdx = AC_SIZES.indexOf(size);
  const ladder = AC_SIZES.slice(Math.max(0, sizeIdx - 2), sizeIdx + 3);

  return resultX({
    title: "คำนวณ BTU แอร์",
    headline: `แนะนำแอร์ ${fmt(size)} BTU (ประมาณ ${ton} ตัน)`,
    chart: {
      kind: "steps",
      unit: "BTU",
      need: ceil(btu),
      needLabel: "ห้องนี้ต้องการ",
      items: ladder.map((s) => ({
        label: `${fmt(s)} BTU`,
        value: s,
        state: s === size ? "chosen" : s < btu ? "under" : "over",
      })),
    },
    rows: [
      { label: "พื้นที่ห้อง", value: `${fmt(area, 2)} ตร.ม.` },
      { label: "ตัวแปรความร้อน", value: `${fmt(factor)} BTU/ตร.ม.` },
      ...(tall ? [{ label: "ปรับเพดานสูง", value: `× ${fmt(h, 2)} ÷ 3 ม.` }] : []),
      ...(sunFactor > 1 ? [{ label: "ปรับแดด", value: `× ${fmt(sunFactor, 2)}` }] : []),
      ...(topFactor > 1 ? [{ label: "ชั้นบนสุด", value: `× ${fmt(topFactor, 2)}` }] : []),
      ...(extraPeople > 0 ? [{ label: "คนเกิน 2 คน", value: `+ ${fmt(extraPeople)} BTU` }] : []),
      ...(extraHeat > 0 ? [{ label: "อุปกรณ์ความร้อน", value: `+ ${fmt(extraHeat)} BTU` }] : []),
      { label: "BTU ที่ต้องการ", value: `${fmt(ceil(btu))} BTU/ชม.`, emphasize: true },
      { label: "ขนาดแอร์แนะนำ", value: `${fmt(size)} BTU`, emphasize: true },
      { label: "ประมาณ", value: `${ton} ตัน` },
    ],
    tip: undersized
      ? "ห้องนี้ใหญ่เกินแอร์ตัวเดียวที่ขายทั่วไป ควรแบ่งเป็นสองตัวหรือใช้ระบบท่อลม"
      : "เลือกรุ่นที่ BTU ไม่ต่ำกว่าค่าที่คิดได้ ใหญ่เกินไปมากจะตัดบ่อยและดูดความชื้นไม่ทัน",
    explain: {
      risk: "B",
      updatedAt: "2026-08-21",
      summary: tall
        ? "BTU = (กว้าง × ยาว × สูง) × ตัวแปร ÷ 3 × ตัวคูณแดด × ตัวคูณชั้นบนสุด + ความร้อนจากคนและอุปกรณ์"
        : "BTU = (กว้าง × ยาว) × ตัวแปร × ตัวคูณแดด × ตัวคูณชั้นบนสุด + ความร้อนจากคนและอุปกรณ์",
      steps: [
        {
          label: "พื้นที่ห้อง",
          expr: "A = กว้าง × ยาว",
          subst: `A = ${fmt(w, 2)} × ${fmt(l, 2)} = ${fmt(area, 2)} ตร.ม.`,
        },
        tall
          ? {
              label: "ภาระความเย็นพื้นฐาน (เพดานสูง)",
              expr: "Q = A × สูง × ตัวแปร ÷ 3",
              subst: `Q = ${fmt(area, 2)} × ${fmt(h, 2)} × ${fmt(factor)} ÷ 3 = ${fmt(ceil(base))} BTU/ชม.`,
              note: "เพดานสูงเกิน 3 ม. มีอากาศต้องทำความเย็นมากกว่า จึงคิดจากปริมาตรเทียบกับเพดานมาตรฐาน 3 ม.",
            }
          : {
              label: "ภาระความเย็นพื้นฐาน",
              expr: "Q = A × ตัวแปรความร้อน",
              subst: `Q = ${fmt(area, 2)} × ${fmt(factor)} = ${fmt(ceil(base))} BTU/ชม.`,
            },
        {
          label: "ปรับตามแดดและตำแหน่งห้อง",
          expr: "Q₂ = Q × ตัวคูณแดด × ตัวคูณชั้นบนสุด",
          subst: `Q₂ = ${fmt(ceil(base))} × ${fmt(sunFactor, 2)} × ${fmt(topFactor, 2)} = ${fmt(ceil(base * sunFactor * topFactor))} BTU/ชม.`,
          note: hotRoom
            ? "ประเภทห้องครัว/ทิศตะวันตก/ชั้นบนสุด นับแดดและชั้นบนไว้ในตัวแปรแล้ว จึงไม่คูณซ้ำ"
            : "ตัวคูณแดดรวมทิศห้องไว้ในตัวเดียว เลือกอย่างเดียวไม่นับซ้ำ",
        },
        {
          label: "บวกความร้อนจากคนและอุปกรณ์",
          expr: "BTU = Q₂ + (คน − 2) × 600 + อุปกรณ์",
          subst: `BTU = ${fmt(ceil(base * sunFactor * topFactor))} + ${fmt(extraPeople)} + ${fmt(extraHeat)} = ${fmt(ceil(btu))} BTU/ชม.`,
        },
        {
          label: "เลือกรุ่นที่ขายจริง",
          expr: "ขนาดแอร์ = รุ่นที่ BTU ไม่ต่ำกว่าค่าที่คำนวณได้",
          subst: `${fmt(ceil(btu))} → ${fmt(size)} BTU (${ton} ตัน)`,
        },
      ],
      constants: [
        BTU_FACTOR[room as keyof typeof BTU_FACTOR] ?? BTU_FACTOR.live,
        AC.ceilingRef,
        ...(sunFactor > 1 ? [sunKey === "afternoon" ? AC.sunAfternoon : AC.sunMorning] : []),
        ...(topFactor > 1 ? [AC.topFloor] : []),
        ...(extraPeople > 0 ? [AC.perPerson] : []),
        AC.btuPerTon,
      ],
      assumptions: [
        "ห้องมีฉนวนและกระจกแบบบ้านไทยทั่วไป ประตูหน้าต่างปิดสนิทขณะใช้แอร์",
        "คิดเป็นภาระความเย็นต่อพื้นที่ ไม่ได้คิดการถ่ายเทความร้อนผ่านผนังทีละด้าน",
      ],
      caveats: [
        ...(doubleCounted
          ? ["เลือกประเภทห้องครัว/ทิศตะวันตก/ชั้นบนสุด แล้ว — ไม่คูณแดดบ่ายหรือชั้นบนซ้ำอีก"]
          : []),
        "ตัวแปรความร้อนต่อตารางเมตรเป็นแนวปฏิบัติของช่างแอร์ไทย ไม่ใช่ค่ามาตรฐานบังคับ",
        "ห้องกระจกทั้งด้าน ห้องครัวเปิดโล่ง หรือร้านที่คนเข้าออกตลอด ควรเผื่อเพิ่มอีก 10–15%",
        "งานอาคารพาณิชย์ขนาดใหญ่ต้องคิดภาระความเย็นแบบ ASHRAE ไม่ใช่ตัวคูณต่อตารางเมตร",
        DISCLAIMER_AB,
      ],
      refs: [
        { label: "แนวทางเลือกขนาดแอร์ Carrier Thailand / SC Asset (ตัวแปร 700–1,000 BTU/ตร.ม.)" },
        { label: "ASHRAE Handbook — Fundamentals (ภาระความเย็นจากผู้ใช้อาคาร)" },
      ],
    },
  });
}

export function satTemp(kind: string, psi: number): number {
  const table = REFRIGERANT_PT[kind] ?? REFRIGERANT_PT.R32;
  return round(lerpTable(psi, table), 1);
}

const PT_SAMPLE_PSI = [0, 30, 60, 100, 150, 200, 250, 300, 400] as const;

export function calcPt(v: Values) {
  const kind = str(v, "kind", "R32");
  const psi = num(v, "psi", 150);
  const t = satTemp(kind, psi);
  const nearest = [...PT_SAMPLE_PSI].sort((a, b) => Math.abs(a - psi) - Math.abs(b - psi))[0];
  const chosenIdx = PT_SAMPLE_PSI.indexOf(nearest);
  const ladder = PT_SAMPLE_PSI.slice(Math.max(0, chosenIdx - 2), chosenIdx + 3);

  return resultX({
    title: "แรงดัน → อุณหภูมิ",
    headline: `${kind} ที่ ${fmt(psi)} psi ≈ ${fmt(t, 1)} °C`,
    chart: {
      kind: "steps",
      unit: "psi",
      need: psi,
      needLabel: "แรงดันที่วัดได้",
      items: ladder.map((p) => ({
        label: `${p} psi (${fmt(satTemp(kind, p), 0)}°C)`,
        value: p,
        state: p === nearest ? "chosen" : p < psi ? "under" : "over",
      })),
    },
    rows: [
      { label: "น้ำยา", value: kind },
      { label: "แรงดันเกจ", value: `${fmt(psi)} psi` },
      { label: "อุณหภูมิอิ่มตัว", value: `${fmt(t, 1)} °C`, emphasize: true },
    ],
    tip: "เทียบคร่าวจากตารางอิ่มตัว เกจหน้างานแต่ละยี่ห้อคลาดได้ ใช้เช็กแนว ไม่ใช่ใบสอบเทียบ",
    explain: {
      risk: "B",
      updatedAt: "2026-08-21",
      summary: "อ่านแรงดันจากเกจแล้วเทียบกับตาราง P-T (แรงดัน–อุณหภูมิอิ่มตัว) ของน้ำยาแต่ละชนิด โดยประมาณค่าระหว่างจุดตาราง (interpolation)",
      steps: [
        {
          label: "เปิดตาราง P-T ของน้ำยาที่เลือก",
          expr: "แต่ละน้ำยามีตารางแรงดัน-อุณหภูมิอิ่มตัวของตัวเอง",
          subst: `น้ำยา ${kind}`,
        },
        {
          label: "ประมาณค่าระหว่างจุดตาราง",
          expr: "ถ้าแรงดันไม่ตรงจุดในตาราง ให้ประมาณเชิงเส้นระหว่างจุดที่ใกล้ที่สุดสองจุด",
          subst: `${fmt(psi)} psi → ประมาณ ${fmt(t, 1)} °C`,
        },
      ],
      assumptions: ["เกจวัดแรงดันเกจ (gauge pressure) ไม่ใช่แรงดันสัมบูรณ์ (absolute)", "น้ำยาบริสุทธิ์ ไม่ปนอากาศหรือน้ำยาอื่น"],
      caveats: [
        "เกจหน้างานแต่ละยี่ห้อคลาดเคลื่อนได้ 2–5 psi ใช้เทียบแนวโน้ม ไม่ใช่ค่าสอบเทียบ (calibration)",
        "ถ้าอ่านที่ท่อดูดใกล้คอมเพรสเซอร์ (ไม่ใช่ที่ถังหรือใกล้คอยล์) ค่าจะคลาดจากอุณหภูมิอิ่มตัวจริงมากขึ้น",
        DISCLAIMER_AB,
      ],
      refs: [
        {
          label:
            "ตาราง P–T อิ่มตัว R32/R410A/R22/R134a (แนว REFPROP / TDS ผู้ผลิตน้ำยา) หน่วยแรงดันเกจ psig",
        },
      ],
    },
  });
}

const PIPE_BRACKETS = [
  { upTo: 12000, liq: '1/4"', suc: '3/8"' },
  { upTo: 18000, liq: '1/4"', suc: '1/2"' },
  { upTo: 24000, liq: '3/8"', suc: '5/8"' },
  { upTo: Infinity, liq: '3/8"', suc: '3/4"' },
] as const;

export function calcPipe(v: Values) {
  const btu = num(v, "btu", 18000);
  const run = num(v, "run", 8);
  let chosenIdx = PIPE_BRACKETS.findIndex((b) => btu <= b.upTo);
  if (chosenIdx < 0) chosenIdx = PIPE_BRACKETS.length - 1;
  const longRun = run > AC_PIPE_LONG_RUN.value;
  if (longRun) chosenIdx = Math.min(chosenIdx + 1, PIPE_BRACKETS.length - 1);
  const bracket = PIPE_BRACKETS[chosenIdx];
  const { liq, suc } = bracket;
  const extra = longRun
    ? `เดินไกลเกิน ${AC_PIPE_LONG_RUN.value} ม. เลื่อนขึ้นหนึ่งไซซ์แล้ว — ยึดคู่มือรุ่นเป็นหลัก`
    : "ระยะมาตรฐาน ใช้ไซซ์ตารางได้";

  return resultX({
    title: "ขนาดท่อทองแดง",
    headline: `ท่อทองแดง ${liq} / ${suc}`,
    chart: {
      kind: "steps",
      unit: "BTU",
      need: btu,
      needLabel: "ขนาดแอร์",
      items: [12000, 18000, 24000, 30000].map((upTo, i) => ({
        label: `${PIPE_BRACKETS[i].liq}/${PIPE_BRACKETS[i].suc}`,
        value: upTo,
        state: i === chosenIdx ? "chosen" : i < chosenIdx ? "under" : "over",
      })),
    },
    rows: [
      { label: "ขนาดแอร์", value: `${fmt(btu)} BTU` },
      { label: "ระยะเดินท่อ", value: `${fmt(run, 1)} ม.` },
      { label: "ท่อน้ำยาเหลว", value: liq, emphasize: true },
      { label: "ท่อดูด", value: suc, emphasize: true },
    ],
    tip: extra,
    explain: {
      risk: "B",
      updatedAt: "2026-08-21",
      summary: "ขนาดท่อทองแดง (เหลว/ดูด) เลือกจากช่วงขนาดแอร์มาตรฐานที่ผู้ผลิตกำหนด ระยะเดินไกลต้องเลื่อนไซซ์ขึ้น",
      steps: [
        {
          label: "เปิดตารางตามขนาดแอร์",
          expr: "≤12,000 BTU → 1/4\"/3/8\" · ≤18,000 → 1/4\"/1/2\" · ≤24,000 → 3/8\"/5/8\" · เกิน → 3/8\"/3/4\"",
          subst: `${fmt(btu)} BTU → ${liq} / ${suc}`,
        },
        {
          label: "เช็กระยะเดินท่อ",
          expr: "ระยะเดินท่อเกิน 15 ม. ให้เลื่อนขึ้นหนึ่งไซซ์",
          subst: `${fmt(run, 1)} ม. → ${extra}`,
        },
      ],
      assumptions: ["ระบบแยกส่วน (split type) ทั่วไป ไม่ใช่ระบบ VRF/มัลติ", "ระยะสูงต่างระหว่างชุดคอยล์ร้อน-เย็นอยู่ในเกณฑ์มาตรฐานรุ่น"],
      caveats: [
        "แอร์แต่ละรุ่น/ยี่ห้ออาจกำหนดขนาดท่อและระยะเดินท่อสูงสุดต่างจากตารางนี้ ให้ยึดคู่มือรุ่นที่ติดตั้งจริงเป็นหลัก",
        "ระยะสูงต่าง (เกิน 5–8 ม.) ต้องเช็กข้อจำกัดของรุ่นและอาจต้องเพิ่มน้ำมันหล่อลื่นคอมเพรสเซอร์",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "คู่มือติดตั้งเครื่องปรับอากาศแยกส่วน (ตารางขนาดท่อทองแดงตามขนาด BTU)" }],
    },
  });
}

export function calcCharge(v: Values) {
  const kind = str(v, "kind", "R32");
  const factory = num(v, "factory", 700);
  const std = num(v, "std", 5);
  const run = num(v, "run", 8);
  const gPerM = (AC_CHARGE_G_PER_M[kind] ?? AC_CHARGE_G_PER_M.R32).value;
  const extraM = Math.max(0, run - std);
  const add = extraM * gPerM;
  const total = factory + add;

  return resultX({
    title: "เติมน้ำยาแอร์",
    headline: extraM > 0 ? `เติมเพิ่ม ${fmt(add)} กรัม` : "ระยะไม่เกินโรงงาน ไม่ต้องเติมเพิ่ม",
    chart:
      add > 0
        ? {
            kind: "stack",
            parts: [
              { label: "ชาร์จจากโรงงาน", value: factory, display: `${fmt(factory)} ก.`, tone: "accent" },
              { label: `เติมเพิ่ม (${fmt(extraM, 1)} ม. × ${gPerM} ก./ม.)`, value: add, display: `${fmt(add)} ก.`, tone: "warn" },
            ],
            totalLabel: "น้ำยารวมโดยประมาณ",
            totalDisplay: `${fmt(total)} ก.`,
          }
        : undefined,
    rows: [
      { label: "น้ำยา", value: kind },
      { label: "ชาร์จจากโรงงาน", value: `${fmt(factory)} ก.` },
      { label: "ระยะท่อ", value: `${fmt(run, 1)} ม. (มาตรฐาน ${fmt(std)} ม.)` },
      { label: "เติมเพิ่ม", value: `${fmt(add)} ก. (${gPerM} ก./ม.)`, emphasize: true },
      { label: "รวมโดยประมาณ", value: `${fmt(total)} ก.` },
    ],
    tip: "ชั่งจากหลอดตามรุ่น อย่าเดาจากเกจอย่างเดียว น้ำยา R32 ระวังไฟไหม้",
    explain: {
      risk: "B",
      updatedAt: "2026-08-21",
      summary: "น้ำยาที่ต้องเติมเพิ่ม = ระยะท่อที่เกินจากมาตรฐานโรงงาน × อัตราเติมต่อเมตรของน้ำยาชนิดนั้น",
      steps: [
        {
          label: "ระยะท่อที่เกินมาตรฐาน",
          expr: "extraM = max(0, ระยะท่อจริง − ระยะมาตรฐานโรงงาน)",
          subst: `max(0, ${fmt(run, 1)} − ${fmt(std)}) = ${fmt(extraM, 1)} ม.`,
        },
        {
          label: "น้ำยาที่ต้องเติมเพิ่ม",
          expr: "เติมเพิ่ม = extraM × อัตรา (ก./ม.)",
          subst: `${fmt(extraM, 1)} × ${gPerM} = ${fmt(add)} ก.`,
        },
      ],
      assumptions: [`น้ำยา ${kind} ใช้อัตราเติม ${gPerM} ก./ม. ตามแนวปฏิบัติทั่วไป`, "ระยะมาตรฐานโรงงานตามที่กรอก (ปกติดูจากคู่มือรุ่น 5–7.5 ม.)"],
      caveats: [
        "แต่ละรุ่น/ยี่ห้อกำหนดอัตราเติมต่อเมตรต่างกัน ให้ยึดคู่มือรุ่นที่ติดตั้งจริงเป็นหลัก",
        "การเติมน้ำยาควรชั่งน้ำหนักจากถังตามที่คำนวณ ไม่ใช่เติมจนกว่าเกจจะขึ้นตามความรู้สึก",
        "น้ำยา R32 ติดไฟได้เล็กน้อย (A2L) ต้องเติมในที่อากาศถ่ายเทและห้ามมีประกายไฟ",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "คู่มือติดตั้งเครื่องปรับอากาศ (อัตราเติมน้ำยาเพิ่มต่อระยะท่อ)" }],
    },
  });
}

export function breakerForBtu(btu: number) {
  if (btu <= 9000) return { amp: 6, breaker: 16, wire: 2.5 };
  if (btu <= 12000) return { amp: 7, breaker: 16, wire: 2.5 };
  if (btu <= 18000) return { amp: 10, breaker: 20, wire: 2.5 };
  if (btu <= 24000) return { amp: 13, breaker: 20, wire: 4 };
  if (btu <= 30000) return { amp: 16, breaker: 25, wire: 4 };
  return { amp: 20, breaker: 32, wire: 6 };
}

const BREAKER_LADDER = [16, 20, 25, 32] as const;

export function calcBreaker(v: Values) {
  const btu = num(v, "btu", 18000);
  const s = breakerForBtu(btu);
  const designAmp = round(s.amp * 1.25, 1);

  return resultX({
    title: "เบรกเกอร์ + สายไฟแอร์",
    headline: `เบรกเกอร์ ${s.breaker}A · สาย ${s.wire} ตร.มม.`,
    chart: {
      kind: "steps",
      unit: "A",
      need: designAmp,
      needLabel: "ต้องทนได้ไม่น้อยกว่า (125% ของโหลด)",
      items: BREAKER_LADDER.map((a) => ({
        label: `${a} A`,
        value: a,
        state: a === s.breaker ? "chosen" : a < designAmp ? "under" : "over",
      })),
    },
    rows: [
      { label: "ขนาดแอร์", value: `${fmt(btu)} BTU` },
      { label: "กระแสประมาณ", value: `${s.amp} A` },
      { label: "เบรกเกอร์", value: `${s.breaker} A`, emphasize: true },
      { label: "สายไฟ (ทองแดง)", value: `${s.wire} ตร.มม.`, emphasize: true },
    ],
    tip: "เดินสายแยกวงจร อย่าพ่วงกับปลั๊กทั่วไป ระยะไกลให้เช็กแรงดันตกด้วย",
    explain: {
      risk: "C",
      updatedAt: "2026-08-21",
      summary: "เปิดตารางกระแสประมาณตามขนาด BTU แล้วเผื่อโหลดต่อเนื่อง 125% ก่อนเลือกเบรกเกอร์และสายไฟตามตาราง",
      steps: [
        {
          label: "กระแสประมาณจากขนาดแอร์",
          expr: "เปิดตารางความสัมพันธ์ BTU → กระแส (แนวปฏิบัติ)",
          subst: `${fmt(btu)} BTU → ประมาณ ${s.amp} A`,
        },
        {
          label: "เผื่อโหลดต่อเนื่อง 125%",
          expr: "I_design = กระแส × 1.25",
          subst: `${s.amp} × 1.25 = ${fmt(designAmp, 1)} A`,
        },
        {
          label: "เลือกเบรกเกอร์และสาย",
          expr: "เบรกเกอร์ ≥ I_design แล้วเปิดตารางสายตามพิกัดเบรกเกอร์",
          subst: `${fmt(designAmp, 1)} A → เบรกเกอร์ ${s.breaker} A · สาย ${s.wire} ตร.มม.`,
        },
      ],
      assumptions: ["แอร์ 220V 1 เฟส เดินสายแยกวงจรเดี่ยวไม่พ่วงปลั๊กอื่น", "ระยะเดินสายไม่เกิน 20–25 ม. (ไม่กระทบแรงดันตกจนต้องขยับไซซ์)"],
      caveats: [
        "แอร์ 3 เฟสหรือขนาดใหญ่กว่า 30,000 BTU ต้องคำนวณกระแสจากสเปกจริงของรุ่น ไม่ใช่ตารางประมาณนี้",
        "ระยะเดินสายไกลกว่า 20–25 ม. ต้องเช็กแรงดันตกเพิ่ม อาจต้องขยับไซซ์สายขึ้น",
        DISCLAIMER_C,
      ],
      refs: [{ label: "วสท. มาตรฐานการติดตั้งทางไฟฟ้า — เกณฑ์โหลดต่อเนื่อง 125%" }],
    },
  });
}

export function calcShsc(v: Values) {
  const kind = str(v, "kind", "R32");
  const sucP = num(v, "sucP", 120);
  const sucT = num(v, "sucT", 12);
  const liqP = num(v, "liqP", 380);
  const liqT = num(v, "liqT", 38);
  const satSuc = satTemp(kind, sucP);
  const satLiq = satTemp(kind, liqP);
  const sh = round(sucT - satSuc, 1);
  const sc = round(satLiq - liqT, 1);
  let diag = "ดูโอเค — ความร้อนเกิน/ความเย็นเกินอยู่ในช่วงใช้งาน";
  if (sh > 12 && sc < 4) diag = "ความร้อนเกินสูง ความเย็นเกินต่ำ — น่าจะน้ำยาน้อย";
  else if (sh < 4 && sc > 12) diag = "ความร้อนเกินต่ำ ความเย็นเกินสูง — น่าจะน้ำยาเกิน";
  else if (sh > 12 && sc > 12) diag = "ทั้งคู่สูง — อาจอุดตันหรือลมไหลไม่พอ";
  else if (sh < 3 && sc < 3) diag = "ทั้งคู่ต่ำ — ดู TXV/คอยล์และลม";

  return resultX({
    title: "วิเคราะห์ SH/SC",
    headline: diag,
    chart: {
      kind: "threshold",
      unit: "°C",
      value: round(sh, 1),
      max: 20,
      zones: [
        { upTo: 4, tone: "bad", label: "ต่ำ — สงสัยน้ำยาเกิน" },
        { upTo: 12, tone: "good", label: "ปกติ" },
        { upTo: 20, tone: "bad", label: "สูง — สงสัยน้ำยาน้อย" },
      ],
    },
    rows: [
      { label: "น้ำยา", value: kind },
      { label: "Superheat", value: `${fmt(sh, 1)} °C`, emphasize: true },
      { label: "Subcooling", value: `${fmt(sc, 1)} °C`, emphasize: true },
      { label: "T sat ดูด", value: `${fmt(satSuc, 1)} °C` },
      { label: "T sat ของเหลว", value: `${fmt(satLiq, 1)} °C` },
    ],
    tip: "ช่วงบ้านทั่วไป SH ประมาณ 5–12°C SC 5–10°C แล้วแต่ระบบ เทียบคู่มือรุ่นก่อนจบงาน",
    explain: {
      risk: "B",
      updatedAt: "2026-08-21",
      summary: "Superheat = อุณหภูมิท่อดูดจริง − อุณหภูมิอิ่มตัวที่แรงดันดูด · Subcooling = อุณหภูมิอิ่มตัวที่แรงดันของเหลว − อุณหภูมิท่อของเหลวจริง",
      steps: [
        {
          label: "Superheat (SH)",
          expr: "SH = T ท่อดูดจริง − T sat ที่ความดันดูด",
          subst: `${fmt(sucT)} − ${fmt(satSuc, 1)} = ${fmt(sh, 1)} °C`,
        },
        {
          label: "Subcooling (SC)",
          expr: "SC = T sat ที่ความดันของเหลว − T ท่อของเหลวจริง",
          subst: `${fmt(satLiq, 1)} − ${fmt(liqT)} = ${fmt(sc, 1)} °C`,
        },
        {
          label: "วินิจฉัยจากคู่ SH/SC",
          expr: "SH สูง+SC ต่ำ → น้ำยาน้อย · SH ต่ำ+SC สูง → น้ำยาเกิน · ทั้งคู่สูง → ลม/ท่ออุดตัน",
          subst: diag,
        },
      ],
      assumptions: ["ระบบ Fixed orifice/Capillary ทั่วไปของแอร์บ้าน ไม่ใช่ระบบ TXV ที่ SH ควบคุมอัตโนมัติแคบกว่า"],
      caveats: [
        "ค่าช่วงปกติแตกต่างกันตามรุ่นและสภาพอากาศขณะวัด (โหลดคอยล์ร้อน/เย็น) ให้เทียบคู่มือรุ่นเป็นหลัก",
        "วัดขณะระบบยังไม่นิ่ง (เพิ่งเปิดไม่ถึง 15 นาที) ค่าจะไม่แม่นยำ",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวปฏิบัติงานวินิจฉัยระบบทำความเย็นด้วย Superheat/Subcooling" }],
    },
  });
}

const EER_LADDER = [9, 12, 15, 18, 21] as const;

export function calcEnergy(v: Values) {
  const btu = num(v, "btu", 18000);
  const eer = num(v, "eer", 12);
  const hours = num(v, "hours", 8);
  const days = num(v, "days", 30);
  const rate = num(v, "rate", 4.2);
  const watts = btu / Math.max(eer, 1);
  const kwh = (watts / 1000) * hours * days;
  const cost = kwh * rate;
  const costAt = (e: number) => ((btu / e / 1000) * hours * days) * rate;

  return resultX({
    title: "ค่าไฟแอร์",
    headline: `ค่าไฟประมาณ ${fmt(ceil(cost))} บาท/เดือน`,
    chart: {
      kind: "steps",
      unit: "บาท/เดือน",
      items: EER_LADDER.map((e) => ({
        label: `EER ${e}`,
        value: round(costAt(e), 0),
        state: e === Math.round(eer) ? "chosen" : e < eer ? "over" : "under",
      })),
    },
    rows: [
      { label: "กำลังไฟฟ้า", value: `${fmt(watts / 1000, 2)} kW` },
      { label: "ใช้ไฟ", value: `${fmt(kwh, 1)} หน่วย/เดือน` },
      { label: "ค่าไฟประมาณ", value: `${fmt(ceil(cost))} บาท`, emphasize: true },
    ],
    tip: "คิดจาก EER และชั่วโมงที่พี่กรอก โหมดประหยัดจริงมักต่ำกว่านี้ ถ้าร้านเปิดทั้งวันให้ใส่ชั่วโมงจริง",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "กำลังไฟฟ้า = BTU ÷ EER แล้วคิดหน่วยไฟที่ใช้ต่อเดือนจากชั่วโมงเปิดใช้งาน คูณค่าไฟต่อหน่วย",
      steps: [
        {
          label: "กำลังไฟฟ้าที่ใช้จริง",
          expr: "W = BTU ÷ EER",
          subst: `${fmt(btu)} ÷ ${fmt(eer, 1)} = ${fmt(watts, 0)} W`,
        },
        {
          label: "หน่วยไฟต่อเดือน",
          expr: "kWh = (W/1000) × ชม./วัน × วัน/เดือน",
          subst: `(${fmt(watts / 1000, 2)}) × ${fmt(hours)} × ${fmt(days)} = ${fmt(kwh, 1)} หน่วย`,
        },
        {
          label: "ค่าไฟประมาณ",
          expr: "ค่าไฟ = kWh × ค่าไฟต่อหน่วย",
          subst: `${fmt(kwh, 1)} × ${fmt(rate, 2)} = ${fmt(ceil(cost))} บาท`,
        },
      ],
      assumptions: ["EER คงที่ตลอดการทำงาน ไม่ได้คิดโหมดประหยัด/อินเวอร์เตอร์ที่ลดกำลังหลังถึงอุณหภูมิเป้า", "ค่าไฟเป็นอัตราเดียว ไม่ได้คิดแบบขั้นบันไดของการไฟฟ้า"],
      caveats: [
        "แอร์อินเวอร์เตอร์ใช้ไฟน้อยกว่านี้มากหลังห้องเย็นถึงอุณหภูมิที่ตั้ง เพราะลดกำลังคอมเพรสเซอร์ลง ไม่ได้เปิด-ปิดเต็มกำลังตลอด",
        "อัตราค่าไฟจริงเป็นขั้นบันได (ยิ่งใช้มากยิ่งแพงต่อหน่วย) ตัวเลขนี้ใช้อัตราเฉลี่ยเดียวเพื่อความง่าย",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "ป้ายประหยัดไฟเบอร์ 5 (EER/SEER) การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย" }],
    },
  });
}

export const hvacTools: ToolDef[] = [
  {
    id: "btu",
    name: "คำนวณ BTU แอร์",
    blurb: "ขนาดแอร์ที่เหมาะกับห้อง",
    fields: [
      { type: "number", key: "w", label: "กว้าง", unit: "ม.", default: 4, min: 1, step: 0.1 },
      { type: "number", key: "l", label: "ยาว", unit: "ม.", default: 5, min: 1, step: 0.1 },
      { type: "number", key: "h", label: "สูงฝ้า", unit: "ม.", default: 2.6, min: 2, step: 0.1 },
      {
        type: "select",
        key: "room",
        label: "ประเภทห้อง",
        default: "live",
        options: [
          { value: "bed", label: "ห้องนอน (725)" },
          { value: "live", label: "ห้องนั่งเล่น / รับแขก (800)" },
          { value: "work", label: "ห้องทำงาน / ออฟฟิศ (900)" },
          { value: "hot", label: "ครัว / ร้านค้า / ห้องกระจก (950)" },
        ],
      },
        {
          type: "select",
          key: "sunload",
          label: "แดดเข้าห้อง",
          default: "none",
          when: { key: "room", is: ["bed", "live", "work"] },
          options: [
            { value: "none", label: "ไม่โดนแดดตรง" },
            { value: "morning", label: "แดดเช้า / ทิศตะวันออก (+5%)" },
            { value: "afternoon", label: "แดดบ่าย / ทิศตะวันตก (+15%)" },
          ],
        },
      {
        type: "bool",
        key: "top",
        label: "อยู่ชั้นบนสุดใต้หลังคา (+10%)",
        default: false,
        when: { key: "room", is: ["bed", "live", "work"] },
      },
      { type: "number", key: "people", label: "คนใช้ห้อง", unit: "คน", default: 2, min: 1 },
      {
        type: "select",
        key: "heat",
        label: "เครื่องใช้ความร้อน",
        default: "none",
        options: [
          { value: "none", label: "น้อย / ไม่มี" },
          { value: "mid", label: "ปานกลาง (คอม+ทีวี)" },
          { value: "high", label: "มาก (ครัว / เซิร์ฟเวอร์)" },
        ],
      },
    ],
    calc: calcBtu,
  },
  {
    id: "pt",
    name: "แรงดัน → อุณหภูมิ",
    blurb: "แปลงเกจน้ำยาเป็นอุณหภูมิอิ่มตัว",
    fields: [
      {
        type: "select",
        key: "kind",
        label: "น้ำยา",
        default: "R32",
        options: ["R32", "R410A", "R22", "R134a"].map((x) => ({ value: x, label: x })),
      },
      { type: "number", key: "psi", label: "แรงดันเกจ", unit: "psi", default: 150, min: 0 },
    ],
    calc: calcPt,
  },
  {
    id: "pipe",
    name: "ขนาดท่อทองแดง",
    blurb: "ท่อน้ำยาตามขนาดแอร์และระยะ",
    fields: [
      { type: "number", key: "btu", label: "ขนาดแอร์", unit: "BTU", default: 18000, min: 5000, step: 1000 },
      { type: "number", key: "run", label: "ระยะเดินท่อ", unit: "ม.", default: 8, min: 1, step: 0.5 },
    ],
    calc: calcPipe,
  },
  {
    id: "charge",
    name: "เติมน้ำยาแอร์",
    blurb: "น้ำยาที่ต้องเติมเพิ่มเป็นกรัม",
    fields: [
      {
        type: "select",
        key: "kind",
        label: "น้ำยา",
        default: "R32",
        options: ["R32", "R410A", "R22"].map((x) => ({ value: x, label: x })),
      },
      { type: "number", key: "factory", label: "ชาร์จจากโรงงาน", unit: "กรัม", default: 700, min: 0 },
      { type: "number", key: "std", label: "ระยะมาตรฐานรุ่น", unit: "ม.", default: 5, min: 0 },
      { type: "number", key: "run", label: "ระยะท่อจริง", unit: "ม.", default: 8, min: 0, step: 0.5 },
    ],
    calc: calcCharge,
  },
  {
    id: "breaker",
    name: "เบรกเกอร์ + สายไฟแอร์",
    blurb: "เลือกเบรกเกอร์และสายตามขนาดแอร์",
    fields: [{ type: "number", key: "btu", label: "ขนาดแอร์", unit: "BTU", default: 18000, min: 5000, step: 1000 }],
    calc: calcBreaker,
  },
  {
    id: "shsc",
    name: "วิเคราะห์ความร้อนเกิน / ความเย็นเกิน",
    blurb: "Superheat / Subcooling วินิจฉัยอาการ",
    fields: [
      {
        type: "select",
        key: "kind",
        label: "น้ำยา",
        default: "R32",
        options: ["R32", "R410A", "R22", "R134a"].map((x) => ({ value: x, label: x })),
      },
      { type: "number", key: "sucP", label: "แรงดันท่อดูด", unit: "psi", default: 120, min: 0 },
      { type: "number", key: "sucT", label: "อุณหภูมิต่อดูด (ใช้คิดความร้อนเกิน)", unit: "°C", default: 12 },
      { type: "number", key: "liqP", label: "แรงดันท่อของเหลว", unit: "psi", default: 380, min: 0 },
      { type: "number", key: "liqT", label: "อุณหภูมิต่อของเหลว (ใช้คิดความเย็นเกิน)", unit: "°C", default: 38 },
    ],
    calc: calcShsc,
  },
  {
    id: "energy",
    name: "ค่าไฟแอร์",
    blurb: "ประเมินค่าไฟต่อเดือน",
    fields: [
      { type: "number", key: "btu", label: "ขนาดแอร์", unit: "BTU", default: 18000, min: 5000, step: 1000 },
      { type: "number", key: "eer", label: "ค่าประสิทธิภาพแอร์ (EER)", default: 12, min: 6, step: 0.1 },
      { type: "number", key: "hours", label: "ชั่วโมง/วัน", unit: "ชม.", default: 8, min: 1 },
      { type: "number", key: "days", label: "วัน/เดือน", unit: "วัน", default: 30, min: 1 },
      { type: "number", key: "rate", label: "ค่าไฟ", unit: "บาท/หน่วย", default: 4.2, min: 0, step: 0.1 },
    ],
    calc: calcEnergy,
  },
];

export const hvacJob: JobDef = {
  name: "คิดทั้งงานแอร์",
  blurb: "กรอกห้องครั้งเดียว ได้ขนาดแอร์ สายไฟ และค่าไฟคร่าว ๆ",
  fields: [
    ...hvacTools[0].fields,
    { type: "number", key: "eer", label: "ค่าประสิทธิภาพแอร์ (EER ถ้าไม่รู้ใส่ 12)", default: 12, min: 6, step: 0.1 },
    { type: "number", key: "hours", label: "ชั่วโมงเปิด/วัน", unit: "ชม.", default: 8, min: 1 },
    { type: "number", key: "rate", label: "ค่าไฟ", unit: "บาท/หน่วย", default: 4.2, min: 0, step: 0.1 },
  ],
  calc: (v) => {
    const btuRes = calcBtu(v);
    const sizeRow = btuRes.rows.find((r) => r.label === "ขนาดแอร์แนะนำ");
    const size = Number(String(sizeRow?.value).replace(/[^\d.]/g, "")) || 18000;
    const breakerRes = calcBreaker({ btu: size });
    const energy = calcEnergy({ ...v, btu: size });
    return jobFromParts({
      title: "งานแอร์ทั้งห้อง",
      headline: btuRes.headline ?? `แนะนำแอร์ ${fmt(size)} BTU`,
      rows: [
        ...btuRes.rows,
        ...breakerRes.rows.filter((r) => r.emphasize || r.label === "กระแสประมาณ"),
        { label: "ค่าไฟ/เดือน", value: energy.rows.find((r) => r.emphasize)?.value ?? "-" },
        { label: "หมายเหตุสายไฟ", value: "ตารางคร่าวตาม BTU ไม่ใช่ตาราง วสท. — ให้ช่างไฟยืนยัน" },
      ],
      tip: "สายไฟในหน้านี้เป็นตารางคร่าวตามขนาดแอร์ งานจริงเทียบสเปกรุ่นและให้ช่างไฟ/วิศวกรยืนยัน ยังไม่รวมค่าติดตั้งและขาแขวน",
      parts: [btuRes, breakerRes, energy],
      chart: btuRes.chart,
    });
  },
};
