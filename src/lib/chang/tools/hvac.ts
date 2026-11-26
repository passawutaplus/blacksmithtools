import type { JobDef, ToolDef, Values } from "../types";
import {
  blockedResult,
  bool,
  ceil,
  fmt,
  fmtTrim,
  guardInputs,
  guardTool,
  jobFromParts,
  lerpTable,
  num,
  resultX,
  round,
  str,
  tableRange,
  withDefaults,
} from "../math";
import {
  AC,
  AC_BREAKER_SOURCE,
  AC_BREAKER_TABLE,
  AC_CHARGE_G_PER_M,
  AC_PIPE_LONG_RUN,
  AC_SIZES,
  BTU_FACTOR,
  CABLE_METHODS,
  CABLE_TABLE_5_20,
  CABLE_TABLE_SOURCE,
  DISCLAIMER_AB,
  DISCLAIMER_C,
  ELEC,
  REFRIGERANT_PT,
  REFRIGERANT_PT_SOURCE,
  SHSC,
} from "../constants";

const guard = (id: string, v: Values) => guardTool(hvacTools, id, v);

export function calcBtu(v: Values) {
  const bad = guard("btu", v);
  if (bad) return bad;
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
  const biggest = AC_SIZES[AC_SIZES.length - 1];
  const size = AC_SIZES.find((s) => s >= btu) ?? biggest;
  const ton = round(size / AC.btuPerTon.value, 2);
  const undersized = size < btu;
  // ห้องใหญ่เกินแอร์ตัวเดียว: แบ่งเป็นกี่ตัว และตัวละเท่าไหร่ (เลือกรุ่นที่ขายจริงที่พอกับส่วนแบ่ง)
  const units = undersized ? ceil(btu / biggest) : 1;
  const unitSize = undersized ? (AC_SIZES.find((s) => s >= btu / units) ?? biggest) : size;

  const sizeIdx = AC_SIZES.indexOf(size);
  const ladder = AC_SIZES.slice(Math.max(0, sizeIdx - 2), sizeIdx + 3);

  return resultX({
    title: "คำนวณ BTU แอร์",
    headline: undersized
      ? `ต้องการ ${fmt(ceil(btu))} BTU — เกินแอร์ตัวเดียว (ใหญ่สุด ${fmt(biggest)}) แบ่ง ${units} ตัวหรือใช้ระบบท่อลม`
      : `แนะนำแอร์ ${fmt(size)} BTU (ประมาณ ${ton} ตัน)`,
    chart: undersized
      ? undefined
      : {
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
      ...(undersized
        ? [
            { label: "แอร์ตัวเดียวใหญ่สุดที่ขายทั่วไป", value: `${fmt(biggest)} BTU — ไม่พอ` },
            { label: "ถ้าแบ่งหลายตัว", value: `${units} ตัว × ${fmt(unitSize)} BTU`, emphasize: true },
          ]
        : [
            { label: "ขนาดแอร์แนะนำ", value: `${fmt(size)} BTU`, emphasize: true },
            { label: "ประมาณ", value: `${ton} ตัน` },
          ]),
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
          subst: undersized
            ? `${fmt(ceil(btu))} BTU เกินรุ่นใหญ่สุด ${fmt(biggest)} BTU → แบ่ง ${units} ตัว × ${fmt(unitSize)} BTU`
            : `${fmt(ceil(btu))} → ${fmt(size)} BTU (${ton} ตัน)`,
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
        ...(undersized
          ? ["ห้องใหญ่ระดับนี้ควรให้ช่างแอร์/วิศวกรคิดภาระความเย็นจริงและวางตำแหน่งเครื่อง ไม่ใช่คูณต่อตารางเมตรอย่างเดียว"]
          : []),
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

/**
 * เปิดตาราง P–T — คืน ok:false เมื่อไม่รู้จักน้ำยาหรือแรงดันอยู่นอกช่วงตาราง
 * (ห้ามหนีบค่าปลายตาราง: แรงดันสูงกว่าตารางแล้วตอบอุณหภูมิแถวสุดท้าย ทำให้ Subcooling เพี้ยน)
 */
export function satLookup(
  kind: string,
  psi: number,
): { ok: true; t: number } | { ok: false; reason: string } {
  const table = REFRIGERANT_PT[kind];
  if (!table) return { ok: false, reason: `ยังไม่มีตาราง P–T ของน้ำยา ${kind}` };
  const { min, max } = tableRange(table);
  if (!Number.isFinite(psi) || psi < min || psi > max) {
    const top = table[table.length - 1];
    return {
      ok: false,
      reason: `แรงดัน ${fmt(psi)} psi เกินช่วงตาราง ${kind} (${fmt(min)}–${fmt(max, 0)} psi ≈ ถึง ${fmt(top[1])} °C)`,
    };
  }
  return { ok: true, t: round(lerpTable(psi, table), 1) };
}

/** อุณหภูมิอิ่มตัว (°C) — นอกช่วงตารางหรือไม่รู้จักน้ำยาคืน NaN ไม่หนีบค่า */
export function satTemp(kind: string, psi: number): number {
  const hit = satLookup(kind, psi);
  return hit.ok ? hit.t : Number.NaN;
}

const PT_OUT_OF_RANGE_TIP =
  "เช็กว่าเลือกน้ำยาถูกชนิดและอ่านเกจเป็น psi (ไม่ใช่ bar/MPa) ถ้าแรงดันสูงจริงระดับนี้ให้หยุดเครื่องแล้วหาสาเหตุก่อน";

const PT_SAMPLE_PSI = [0, 30, 60, 100, 150, 200, 250, 300, 400] as const;

export function calcPt(v: Values) {
  const bad = guard("pt", v);
  if (bad) return bad;
  const kind = str(v, "kind", "R32");
  const psi = num(v, "psi", 150);
  const hit = satLookup(kind, psi);
  if (!hit.ok) return blockedResult({ headline: `${hit.reason} — ตอบไม่ได้`, tip: PT_OUT_OF_RANGE_TIP });
  const t = hit.t;
  const maxPsi = tableRange(REFRIGERANT_PT[kind]).max;
  const nearest = [...PT_SAMPLE_PSI].sort((a, b) => Math.abs(a - psi) - Math.abs(b - psi))[0];
  const chosenIdx = PT_SAMPLE_PSI.indexOf(nearest);
  const ladder = PT_SAMPLE_PSI.slice(Math.max(0, chosenIdx - 2), chosenIdx + 3).filter((p) => p <= maxPsi);

  return resultX({
    title: "แรงดัน → อุณหภูมิ",
    headline: `${kind} ที่ ${fmt(psi)} psi ≈ ${fmt(t, 1)} °C`,
    chart:
      ladder.length > 1 && ladder.includes(nearest)
        ? {
            kind: "steps",
            unit: "psi",
            need: psi,
            needLabel: "แรงดันที่วัดได้",
            items: ladder.map((p) => ({
              label: `${p} psi (${fmt(satTemp(kind, p), 0)}°C)`,
              value: p,
              state: p === nearest ? "chosen" : p < psi ? "under" : "over",
            })),
          }
        : undefined,
    rows: [
      { label: "น้ำยา", value: kind },
      { label: "แรงดันเกจ", value: `${fmt(psi)} psi` },
      { label: "อุณหภูมิอิ่มตัว", value: `${fmt(t, 1)} °C`, emphasize: true },
    ],
    tip: "เทียบคร่าวจากตารางอิ่มตัว เกจหน้างานแต่ละยี่ห้อคลาดได้ ใช้เช็กแนว ไม่ใช่ใบสอบเทียบ",
    explain: {
      risk: "B",
      updatedAt: "2026-11-25",
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
          label: REFRIGERANT_PT_SOURCE,
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

/** ช่างแอร์เรียกท่อทองแดงเป็น "หุน" (1 หุน = 1/8 นิ้ว): 1/4" = 2 หุน · 3/8" = 3 หุน · 1/2" = 4 หุน · 5/8" = 5 หุน · 3/4" = 6 หุน */
export function copperHun(inchLabel: string): string {
  const m = inchLabel.match(/^(\d+)\/(\d+)"$/);
  if (!m) return inchLabel;
  const hun = (Number(m[1]) / Number(m[2])) * 8;
  return `${fmt(hun)} หุน (${inchLabel})`;
}

export function calcPipe(v: Values) {
  const bad = guard("pipe", v);
  if (bad) return bad;
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
    headline: `ท่อทองแดง ${copperHun(liq).split(" (")[0]} + ${copperHun(suc).split(" (")[0]} (${liq} + ${suc}) ยาว ${fmtTrim(run, 1)} ม.`,
    chart: {
      kind: "steps",
      unit: "BTU",
      need: btu,
      needLabel: "ขนาดแอร์",
      items: [12000, 18000, 24000, 30000].map((upTo, i) => ({
        label: `${copperHun(PIPE_BRACKETS[i].liq).split(" หุน")[0]}+${copperHun(PIPE_BRACKETS[i].suc).split(" (")[0]}`,
        value: upTo,
        state: i === chosenIdx ? "chosen" : i < chosenIdx ? "under" : "over",
      })),
    },
    rows: [
      { label: "ขนาดแอร์", value: `${fmt(btu)} BTU` },
      { label: "ระยะเดินท่อ", value: `${fmt(run, 1)} ม.` },
      { label: "ท่อน้ำยาเหลว (ท่อเล็ก)", value: copperHun(liq), emphasize: true },
      { label: "ท่อดูด (ท่อใหญ่)", value: copperHun(suc), emphasize: true },
      { label: "ความยาวที่ต้องซื้อ", value: `ท่อคู่ ${fmtTrim(run, 1)} ม. ต่อเครื่อง (เส้นเล็ก ${fmtTrim(run, 1)} ม. + เส้นใหญ่ ${fmtTrim(run, 1)} ม.) พร้อมฉนวนหุ้มทั้งสองเส้น` },
    ],
    tip: `${extra} · ความหนาท่อและช่วงขนาดให้ดูคู่มือรุ่น (R32/R410A แรงดันสูง ใช้ท่อหนาตามที่ผู้ผลิตกำหนด)`,
    explain: {
      risk: "B",
      updatedAt: "2026-08-21",
      summary: "ขนาดท่อทองแดง (เหลว/ดูด) เลือกจากช่วงขนาดแอร์มาตรฐานที่ผู้ผลิตกำหนด ระยะเดินไกลต้องเลื่อนไซซ์ขึ้น",
      steps: [
        {
          label: "เปิดตารางตามขนาดแอร์",
          expr: "≤12,000 BTU → 1/4\"/3/8\" · ≤18,000 → 1/4\"/1/2\" · ≤24,000 → 3/8\"/5/8\" · เกิน → 3/8\"/3/4\"",
          subst: `${fmt(btu)} BTU → ${liq} / ${suc} = ${copperHun(liq).split(" (")[0]} / ${copperHun(suc).split(" (")[0]}`,
          note: "1 หุน = 1/8 นิ้ว",
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
  const bad = guard("charge", v);
  if (bad) return bad;
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
    tip:
      kind === "R32"
        ? "ชั่งน้ำหนักตามที่คิดได้ อย่าเดาจากเกจอย่างเดียว · R32 ติดไฟได้ เติมในที่อากาศถ่ายเท ห้ามมีประกายไฟ"
        : "ชั่งน้ำหนักตามที่คิดได้ อย่าเดาจากเกจอย่างเดียว เทียบอัตราเติมกับคู่มือรุ่นอีกครั้ง",
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
        ...(kind === "R32" ? ["น้ำยา R32 ติดไฟได้เล็กน้อย (A2L) ต้องเติมในที่อากาศถ่ายเทและห้ามมีประกายไฟ"] : []),
        DISCLAIMER_AB,
      ],
      refs: [{ label: "คู่มือติดตั้งเครื่องปรับอากาศ (อัตราเติมน้ำยาเพิ่มต่อระยะท่อ)" }],
    },
  });
}

type AcCableMethod = keyof typeof CABLE_METHODS;

/**
 * เบรกเกอร์ + สายไฟแอร์ตามขนาด BTU
 * สายต้องทนกระแสไม่น้อยกว่าพิกัดเบรกเกอร์ตามตาราง วสท. 5-20 ของวิธีเดินสายที่เลือก (ตารางเดียวกับเครื่องมือช่างไฟ)
 * คืน null เมื่อ BTU เกินแถวสุดท้ายของตารางคร่าว — ห้ามใช้แถวสุดท้ายแทน
 */
export function breakerForBtu(btu: number, method: AcCableMethod = "surface") {
  const row = AC_BREAKER_TABLE.find((r) => btu <= r.upTo);
  if (!row) return null;
  const column = `${CABLE_METHODS[method].group}c2` as "g1c2" | "g2c2";
  const cable = CABLE_TABLE_5_20.find((c) => c[column] >= row.breaker && c.mm2 >= row.minWire);
  if (!cable) return null;
  return { amp: row.amp, breaker: row.breaker, wire: cable.mm2, ampacity: cable[column], minWire: row.minWire };
}

const BREAKER_LADDER = [...new Set(AC_BREAKER_TABLE.map((r) => r.breaker))];
const AC_BREAKER_MAX_BTU = AC_BREAKER_TABLE[AC_BREAKER_TABLE.length - 1].upTo;

export function calcBreaker(v: Values) {
  const bad = guard("breaker", v);
  if (bad) return bad;
  const btu = num(v, "btu", 18000);
  const method: AcCableMethod = str(v, "method", "surface") === "embed" ? "embed" : "surface";
  const methodName = CABLE_METHODS[method].short;
  const s = breakerForBtu(btu, method);
  if (!s) {
    return blockedResult({
      headline: `แอร์ ${fmt(btu)} BTU เกินตารางคร่าว (ถึง ${fmt(AC_BREAKER_MAX_BTU)} BTU) — ใช้ค่าบนป้ายเครื่อง`,
      tip: "ดูค่า MCA / MOCP หรือกระแสสูงสุดบนป้ายคอยล์ร้อน แล้วเอากระแสนั้นไปคิดในเครื่องมือ “เลือกขนาดสายไฟ” ของช่างไฟ หรือให้ช่างไฟ/วิศวกรกำหนด",
    });
  }
  const factor = ELEC.continuousFactor.value;
  const designAmp = round(s.amp * factor, 1);

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
      { label: "สายทนได้ตามตาราง", value: `${s.ampacity} A ≥ เบรกเกอร์ ${s.breaker} A` },
      { label: "วิธีเดินสายที่คิด", value: methodName },
    ],
    tip: "เดินสายแยกวงจร อย่าพ่วงกับปลั๊กทั่วไป ถ้าป้ายเครื่องบอกเบรกเกอร์/สายใหญ่กว่านี้ให้ยึดป้ายเครื่อง ระยะไกลเช็กแรงดันตกด้วย",
    explain: {
      risk: "C",
      updatedAt: "2026-11-25",
      summary:
        "เปิดตารางกระแสประมาณตามขนาด BTU → เผื่อโหลดต่อเนื่อง 125% → เลือกเบรกเกอร์ → เลือกสายที่ทนกระแสไม่น้อยกว่าเบรกเกอร์จากตาราง วสท. 5-20 ตามวิธีเดินสาย",
      steps: [
        {
          label: "กระแสประมาณจากขนาดแอร์",
          expr: "เปิดตารางความสัมพันธ์ BTU → กระแส (แนวปฏิบัติ)",
          subst: `${fmt(btu)} BTU → ประมาณ ${s.amp} A`,
        },
        {
          label: "เผื่อโหลดต่อเนื่อง 125%",
          expr: `I_design = กระแส × ${factor}`,
          subst: `${s.amp} × ${factor} = ${fmt(designAmp, 1)} A`,
        },
        {
          label: "เลือกเบรกเกอร์",
          expr: "เบรกเกอร์ ≥ I_design",
          subst: `${fmt(designAmp, 1)} A → เบรกเกอร์ ${s.breaker} A`,
        },
        {
          label: "เลือกสายจากตาราง วสท. 5-20",
          expr: "พิกัดสายในตาราง (1 เฟส ตามวิธีเดินสาย) ≥ พิกัดเบรกเกอร์ และไม่เล็กกว่าขนาดขั้นต่ำของช่างแอร์",
          subst: `${methodName}: สาย ${s.wire} ตร.มม. ทนได้ ${s.ampacity} A ≥ ${s.breaker} A (ขั้นต่ำช่างแอร์ ${s.minWire} ตร.มม.)`,
          note: "สายต้องทนกระแสได้ไม่น้อยกว่าเบรกเกอร์ที่ป้องกันมันอยู่ — หลักเดียวกับเครื่องมือเลือกขนาดสายไฟ",
        },
      ],
      constants: [ELEC.continuousFactor],
      assumptions: [
        "แอร์ 220 V 1 เฟส เดินสายแยกวงจรเดี่ยว 1 วงจรต่อท่อ ไม่พ่วงปลั๊กอื่น",
        `วิธีเดินสาย: ${methodName} · สายทองแดงฉนวนพีวีซี (THW) อุณหภูมิโดยรอบไม่เกิน 40 °C`,
        "ระยะเดินสายไม่เกิน 20–25 ม. (ไม่กระทบแรงดันตกจนต้องขยับไซซ์)",
      ],
      caveats: [
        "กระแสในตารางเป็นค่าประมาณตามขนาด BTU ไม่ใช่ค่าของรุ่น — ถ้าป้ายเครื่อง (MCA/MOCP) ระบุมากกว่านี้ให้ยึดป้ายเครื่อง",
        "ท่อร้อยสายที่วิ่งในฝ้าใต้หลังคาร้อนจัด หลายวงจรในท่อเดียว หรืออุณหภูมิเกิน 40 °C ต้องลดพิกัดสาย ให้คิดในเครื่องมือเลือกขนาดสายไฟ",
        `แอร์ 3 เฟสหรือใหญ่กว่า ${fmt(AC_BREAKER_MAX_BTU)} BTU ต้องคิดจากสเปกจริงของรุ่น ไม่ใช่ตารางประมาณนี้`,
        "ระยะเดินสายไกลกว่า 20–25 ม. ต้องเช็กแรงดันตกเพิ่ม อาจต้องขยับไซซ์สายขึ้น",
        DISCLAIMER_C,
      ],
      refs: [
        { label: AC_BREAKER_SOURCE },
        { label: CABLE_TABLE_SOURCE },
        { label: "วสท. มาตรฐานการติดตั้งทางไฟฟ้า — เกณฑ์โหลดต่อเนื่อง 125%" },
      ],
    },
  });
}

type ShscLevel = "impossible" | "flood" | "low" | "ok" | "high";

function shLevel(sh: number): ShscLevel {
  if (sh < SHSC.impossible.value) return "impossible";
  if (sh < SHSC.shFlood.value) return "flood";
  if (sh < SHSC.shMin.value) return "low";
  if (sh > SHSC.shMax.value) return "high";
  return "ok";
}

function scLevel(sc: number): ShscLevel {
  if (sc < SHSC.impossible.value) return "impossible";
  if (sc < SHSC.scMin.value) return "low";
  if (sc > SHSC.scMax.value) return "high";
  return "ok";
}

/** วินิจฉัยจาก SH และ SC ทีละตัว แล้วค่อยดูคู่ — "ดูโอเค" ได้เฉพาะเมื่อทั้งสองค่าอยู่ในช่วงปกติเท่านั้น */
export function diagnoseShsc(sh: number, sc: number): { level: "ok" | "warn" | "danger"; text: string; tip: string } {
  const a = shLevel(sh);
  const b = scLevel(sc);
  const range = `ช่วงปกติ SH ${SHSC.shMin.value}–${SHSC.shMax.value} °C · SC ${SHSC.scMin.value}–${SHSC.scMax.value} °C`;
  if (a === "flood") {
    const cause =
      b === "high"
        ? "SC สูงด้วย น่าจะน้ำยาเกิน"
        : "เช็กลมผ่านคอยล์เย็น (ฟิลเตอร์ตัน คอยล์สกปรก พัดลมช้า) และวาล์วลดแรงดันเปิดค้าง";
    return {
      level: "danger",
      text: `SH ต่ำมาก (${fmt(sh, 1)} °C) — เสี่ยงน้ำยาเหลวไหลกลับคอมเพรสเซอร์`,
      tip: `${cause} · อย่าปล่อยเดินนาน คอมเพรสเซอร์อัดของเหลวแล้วพังได้ · ${range}`,
    };
  }
  if (a === "low") {
    return {
      level: "warn",
      text:
        b === "high"
          ? "SH ต่ำ SC สูง — น่าจะน้ำยาเกิน"
          : b === "low"
            ? "SH ต่ำ SC ต่ำ — วาล์วลดแรงดันป้อนน้ำยามากไป หรือลมผ่านคอยล์เย็นน้อย"
            : "SH ต่ำ — เช็กลมผ่านคอยล์เย็นและฟิลเตอร์ก่อน",
      tip: `SH ยิ่งต่ำยิ่งเสี่ยงน้ำยาเหลวกลับคอมเพรสเซอร์ แก้สาเหตุแล้ววัดซ้ำ · ${range}`,
    };
  }
  if (a === "high") {
    return {
      level: "warn",
      text:
        b === "low"
          ? "SH สูง SC ต่ำ — น่าจะน้ำยาน้อยหรือรั่ว"
          : b === "high"
            ? "SH สูง SC สูง — น่าจะมีจุดตันทางน้ำยา (ไดเออร์ แคปทิ้ว วาล์ว)"
            : "SH สูง — น้ำยาเข้าคอยล์เย็นไม่พอ เช็กรั่ว/จุดตัน และดูว่าโหลดห้องสูงผิดปกติไหม",
      tip: `SH สูงนาน ๆ คอมเพรสเซอร์ร้อนจัดเพราะไอดูดเย็นไม่พอ หารอยรั่วก่อนเติมน้ำยา และชั่งน้ำหนักตอนเติม · ${range}`,
    };
  }
  if (b === "low") {
    return {
      level: "warn",
      text: "SC ต่ำ — น้ำยาอาจน้อย เช็กรอยรั่วก่อน",
      tip: `SH ยังอยู่ในช่วง แต่ของเหลวก่อนเข้าวาล์วเย็นไม่พอ วัดซ้ำตอนระบบนิ่งอย่างน้อย 15 นาที · ${range}`,
    };
  }
  if (b === "high") {
    return {
      level: "warn",
      text: "SC สูง — น้ำยาอาจเกิน หรือคอยล์ร้อนระบายไม่ดี",
      tip: `ล้างคอยล์ร้อน เช็กพัดลมคอยล์ร้อนและอากาศค้างในระบบก่อนสรุปว่าน้ำยาเกิน · ${range}`,
    };
  }
  return {
    level: "ok",
    text: "ดูโอเค — SH และ SC อยู่ในช่วงใช้งาน",
    tip: `${range} แล้วแต่ระบบ เทียบคู่มือรุ่นก่อนจบงาน`,
  };
}

export function calcShsc(v: Values) {
  const bad = guard("shsc", v);
  if (bad) return bad;
  const kind = str(v, "kind", "R32");
  const sucP = num(v, "sucP", 120);
  const sucT = num(v, "sucT", 12);
  const liqP = num(v, "liqP", 380);
  const liqT = num(v, "liqT", 38);
  const hitSuc = satLookup(kind, sucP);
  const hitLiq = satLookup(kind, liqP);
  if (!hitSuc.ok) return blockedResult({ headline: `ท่อดูด: ${hitSuc.reason} — ยังสรุปไม่ได้`, tip: PT_OUT_OF_RANGE_TIP });
  if (!hitLiq.ok) return blockedResult({ headline: `ท่อของเหลว: ${hitLiq.reason} — ยังสรุปไม่ได้`, tip: PT_OUT_OF_RANGE_TIP });
  const satSuc = hitSuc.t;
  const satLiq = hitLiq.t;
  const sh = round(sucT - satSuc, 1);
  const sc = round(satLiq - liqT, 1);
  const measured = [
    { label: "น้ำยา", value: kind },
    { label: "Superheat", value: `${fmt(sh, 1)} °C`, emphasize: true },
    { label: "Subcooling", value: `${fmt(sc, 1)} °C`, emphasize: true },
    { label: "T sat ดูด", value: `${fmt(satSuc, 1)} °C` },
    { label: "T sat ของเหลว", value: `${fmt(satLiq, 1)} °C` },
  ];
  if (shLevel(sh) === "impossible" || scLevel(sc) === "impossible") {
    const which = [
      ...(shLevel(sh) === "impossible" ? [`SH ${fmt(sh, 1)} °C`] : []),
      ...(scLevel(sc) === "impossible" ? [`SC ${fmt(sc, 1)} °C`] : []),
    ].join(" และ ");
    return blockedResult({
      headline: `ค่าที่วัดเป็นไปไม่ได้ (${which} ติดลบ) — เช็กเกจ จุดวัดอุณหภูมิ และชนิดน้ำยา`,
      tip: "ท่อดูดเย็นกว่าอุณหภูมิอิ่มตัว หรือท่อของเหลวร้อนกว่าอุณหภูมิอิ่มตัวไม่ได้ ส่วนใหญ่มาจากเลือกน้ำยาผิดชนิด เกจคลาด หรือเทอร์โมมิเตอร์แนบท่อไม่สนิท วัดใหม่ก่อนวินิจฉัย",
      rows: measured,
    });
  }
  const diag = diagnoseShsc(sh, sc);
  const chartMax = Math.max(20, Math.ceil(sh * 1.2));

  return resultX({
    title: "วิเคราะห์ SH/SC",
    headline: diag.text,
    chart: {
      kind: "threshold",
      unit: "°C",
      value: Math.max(0, sh),
      max: chartMax,
      zones: [
        // ขอบโซนถอยลง 0.1 เพราะกราฟนับค่าที่เท่ากับขอบเป็นโซนล่าง — SH เท่ากับค่าต่ำสุดพอดีต้องเป็น "ปกติ"
        { upTo: SHSC.shFlood.value - 0.1, tone: "bad", label: "ต่ำมาก — น้ำยาเหลวกลับคอม" },
        { upTo: SHSC.shMin.value - 0.1, tone: "warn", label: "ต่ำ" },
        { upTo: SHSC.shMax.value, tone: "good", label: "ปกติ" },
        { upTo: chartMax, tone: "bad", label: "สูง — น้ำยาเข้าคอยล์เย็นไม่พอ" },
      ],
    },
    rows: measured,
    tip: diag.tip,
    explain: {
      risk: "B",
      updatedAt: "2026-11-25",
      summary: "Superheat = อุณหภูมิท่อดูดจริง − อุณหภูมิอิ่มตัวที่แรงดันดูด · Subcooling = อุณหภูมิอิ่มตัวที่แรงดันของเหลว − อุณหภูมิท่อของเหลวจริง",
      steps: [
        {
          label: "Superheat (SH)",
          expr: "SH = T ท่อดูดจริง − T sat ที่ความดันดูด",
          subst: `${fmt(sucT, 1)} − ${fmt(satSuc, 1)} = ${fmt(sh, 1)} °C`,
        },
        {
          label: "Subcooling (SC)",
          expr: "SC = T sat ที่ความดันของเหลว − T ท่อของเหลวจริง",
          subst: `${fmt(satLiq, 1)} − ${fmt(liqT, 1)} = ${fmt(sc, 1)} °C`,
        },
        {
          label: "วินิจฉัยจาก SH และ SC",
          expr: `ดูทีละค่าเทียบช่วงปกติ (SH ${SHSC.shMin.value}–${SHSC.shMax.value} · SC ${SHSC.scMin.value}–${SHSC.scMax.value} °C) แล้วดูคู่: SH สูง+SC ต่ำ → น้ำยาน้อย · SH ต่ำ+SC สูง → น้ำยาเกิน · สูงทั้งคู่ → จุดตัน · SH ต่ำกว่า ${SHSC.shFlood.value} → เสี่ยงน้ำยาเหลวกลับคอม`,
          subst: diag.text,
        },
      ],
      constants: [SHSC.shMin, SHSC.shMax, SHSC.shFlood, SHSC.scMin, SHSC.scMax],
      assumptions: [
        "แอร์บ้านแยกส่วนทั่วไป วัดขณะระบบเดินนิ่งแล้วอย่างน้อย 15 นาที",
        "แรงดันเป็นแรงดันเกจ (psig) วัดอุณหภูมิที่ผิวท่อใกล้จุดวัดแรงดัน หุ้มฉนวนหัววัดแล้ว",
      ],
      caveats: [
        "ช่วงปกติต่างกันตามรุ่น ชนิดอุปกรณ์ลดแรงดัน (แคปทิ้ว / TXV / EEV อินเวอร์เตอร์) และอากาศขณะวัด ให้เทียบคู่มือรุ่นเป็นหลัก",
        "ผลนี้ชี้แนวทางตรวจ ไม่ใช่คำสั่งให้เติมหรือปล่อยน้ำยา — การเติมต้องชั่งน้ำหนักตามคู่มือรุ่น",
        "วัดขณะระบบยังไม่นิ่ง (เพิ่งเปิดไม่ถึง 15 นาที) ค่าจะไม่แม่นยำ",
        DISCLAIMER_AB,
      ],
      refs: [
        { label: "แนวปฏิบัติงานวินิจฉัยระบบทำความเย็นด้วย Superheat/Subcooling" },
        { label: REFRIGERANT_PT_SOURCE },
      ],
    },
  });
}

const EER_LADDER = [9, 12, 15, 18, 21] as const;

export function calcEnergy(v: Values) {
  const bad = guard("energy", v);
  if (bad) return bad;
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
      { type: "number", key: "w", label: "กว้าง", unit: "ม.", default: 4, min: 1, max: 50, step: 0.1 },
      { type: "number", key: "l", label: "ยาว", unit: "ม.", default: 5, min: 1, max: 50, step: 0.1 },
      { type: "number", key: "h", label: "สูงฝ้า", unit: "ม.", default: 2.6, min: 2, max: 8, step: 0.1 },
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
      { type: "number", key: "people", label: "คนใช้ห้อง", unit: "คน", default: 2, min: 1, max: 100 },
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
      { type: "number", key: "psi", label: "แรงดันเกจ", unit: "psi", default: 150, min: 0, max: 1000 },
    ],
    calc: calcPt,
  },
  {
    id: "pipe",
    name: "ขนาดท่อทองแดง",
    blurb: "ท่อน้ำยาตามขนาดแอร์และระยะ",
    fields: [
      { type: "number", key: "btu", label: "ขนาดแอร์", unit: "BTU", default: 18000, min: 5000, max: 60000, step: 1000 },
      { type: "number", key: "run", label: "ระยะเดินท่อ", unit: "ม.", default: 8, min: 1, max: 50, step: 0.5 },
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
      { type: "number", key: "factory", label: "ชาร์จจากโรงงาน", unit: "กรัม", default: 700, min: 0, max: 5000 },
      { type: "number", key: "std", label: "ระยะมาตรฐานรุ่น", unit: "ม.", default: 5, min: 0, max: 30 },
      { type: "number", key: "run", label: "ระยะท่อจริง", unit: "ม.", default: 8, min: 0, max: 50, step: 0.5 },
    ],
    calc: calcCharge,
  },
  {
    id: "breaker",
    name: "เบรกเกอร์ + สายไฟแอร์",
    blurb: "เลือกเบรกเกอร์และสายตามขนาดแอร์",
    fields: [
      { type: "number", key: "btu", label: "ขนาดแอร์", unit: "BTU", default: 18000, min: 5000, max: 60000, step: 1000 },
      {
        type: "select",
        key: "method",
        label: "วิธีเดินสาย",
        default: "surface",
        options: [
          { value: "surface", label: CABLE_METHODS.surface.label },
          { value: "embed", label: CABLE_METHODS.embed.label },
        ],
      },
    ],
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
      { type: "number", key: "sucP", label: "แรงดันท่อดูด", unit: "psi", default: 120, min: 0, max: 1000 },
      { type: "number", key: "sucT", label: "อุณหภูมิท่อดูด (ใช้คิดความร้อนเกิน)", unit: "°C", default: 12, min: -40, max: 60 },
      { type: "number", key: "liqP", label: "แรงดันท่อของเหลว", unit: "psi", default: 380, min: 0, max: 1000 },
      { type: "number", key: "liqT", label: "อุณหภูมิท่อของเหลว (ใช้คิดความเย็นเกิน)", unit: "°C", default: 38, min: -10, max: 80 },
    ],
    calc: calcShsc,
  },
  {
    id: "energy",
    name: "ค่าไฟแอร์",
    blurb: "ประเมินค่าไฟต่อเดือน",
    fields: [
      { type: "number", key: "btu", label: "ขนาดแอร์", unit: "BTU", default: 18000, min: 5000, max: 60000, step: 1000 },
      { type: "number", key: "eer", label: "ค่าประสิทธิภาพแอร์ (EER)", default: 12, min: 6, max: 30, step: 0.1 },
      { type: "number", key: "hours", label: "ชั่วโมง/วัน", unit: "ชม.", default: 8, min: 1, max: 24 },
      { type: "number", key: "days", label: "วัน/เดือน", unit: "วัน", default: 30, min: 1, max: 31 },
      { type: "number", key: "rate", label: "ค่าไฟ", unit: "บาท/หน่วย", default: 4.2, min: 0.5, max: 20, step: 0.1 },
    ],
    calc: calcEnergy,
  },
];

export const hvacJob: JobDef = {
  name: "คิดทั้งงานแอร์",
  blurb: "กรอกห้องครั้งเดียว ได้ขนาดแอร์ ท่อทองแดง น้ำยา สายไฟ ค่าไฟ",
  fields: [
    ...hvacTools[0].fields,
    {
      type: "select",
      key: "bought",
      label: "ขนาดแอร์ที่ซื้อแล้ว",
      default: "auto",
      options: [{ value: "auto", label: "ยังไม่ซื้อ — ให้คิดจากห้อง" }, ...AC_SIZES.map((x) => ({ value: String(x), label: `${fmt(x)} BTU` }))],
    },
    { type: "number", key: "run", label: "ระยะท่อน้ำยา", unit: "ม.", default: 4, min: 1, max: 50, step: 0.5 },
    {
      type: "select",
      key: "kind",
      label: "น้ำยา",
      default: "R32",
      options: ["R32", "R410A", "R22"].map((x) => ({ value: x, label: x })),
    },
    { type: "number", key: "std", label: "ระยะท่อที่ไม่ต้องเติมน้ำยา (ดูคู่มือรุ่น)", unit: "ม.", default: 5, min: 0, max: 30 },
    { type: "number", key: "eer", label: "ค่าประสิทธิภาพแอร์ (EER ถ้าไม่รู้ใส่ 12)", default: 12, min: 6, max: 30, step: 0.1 },
    { type: "number", key: "hours", label: "ชั่วโมงเปิด/วัน", unit: "ชม.", default: 8, min: 1, max: 24 },
    { type: "number", key: "rate", label: "ค่าไฟ", unit: "บาท/หน่วย", default: 4.2, min: 0.5, max: 20, step: 0.1 },
  ],
  calc: (input) => {
    const bad = guardInputs(hvacJob.fields, input);
    if (bad) return bad;
    const v = withDefaults(hvacJob.fields, input);
    const btuRes = calcBtu(v);
    const sizeRow = btuRes.rows.find((r) => r.label === "ขนาดแอร์แนะนำ");
    const boughtKey = str(v, "bought", "auto");
    const bought = boughtKey === "auto" ? 0 : Number(boughtKey);
    if (bought === 0 && (btuRes.invalid || !sizeRow)) {
      // ห้องใหญ่เกินแอร์ตัวเดียว: ไม่มีขนาดเครื่องให้คิดสายไฟ/ค่าไฟต่อ — ตอบเฉพาะภาระ
      return jobFromParts({
        title: "งานแอร์ทั้งห้อง",
        headline: btuRes.headline ?? "ห้องใหญ่เกินแอร์ตัวเดียว",
        rows: [
          ...btuRes.rows,
          { label: "ท่อ / สายไฟ / ค่าไฟ", value: "คิดต่อเครื่องหลังเลือกจำนวนและขนาดเครื่องแล้ว (เลือกในช่อง “ขนาดแอร์ที่ซื้อแล้ว”)" },
        ],
        tip: "ห้องใหญ่ระดับนี้ให้ช่างแอร์สำรวจหน้างาน แบ่งเครื่องตามโซน แล้วค่อยคิดเบรกเกอร์และค่าไฟทีละเครื่อง",
        parts: [btuRes],
      });
    }
    const recSize = sizeRow && !btuRes.invalid ? Number(sizeRow.value.replace(/[^\d.]/g, "")) : 0;
    const size = bought > 0 ? bought : recSize;
    const run = num(v, "run", 4);
    const breakerRes = calcBreaker({ btu: size });
    const pipeRes = calcPipe({ btu: size, run });
    const chargeRes = calcCharge({ kind: v.kind, std: v.std, run });
    const energy = calcEnergy({ btu: size, eer: v.eer, hours: v.hours, rate: v.rate });
    const breakerOk = !breakerRes.invalid;
    const breakerRow = breakerRes.rows.find((r) => r.label === "เบรกเกอร์")?.value;
    const wireRow = breakerRes.rows.find((r) => r.label === "สายไฟ (ทองแดง)")?.value;
    // แถวขนาดแอร์: ถ้าลูกค้าซื้อมาแล้วให้ยึดเครื่องนั้น แล้วบอกว่าเทียบกับที่ห้องต้องการเป็นอย่างไร
    const sizeRows =
      bought > 0
        ? [
            ...btuRes.rows.filter((r) => r.label !== "ขนาดแอร์แนะนำ").map((r) => ({ ...r, emphasize: false })),
            ...(recSize > 0 ? [{ label: "ขนาดที่ห้องต้องการ", value: `${fmt(recSize)} BTU` }] : []),
            {
              label: "ขนาดแอร์ที่ใช้คิด (ซื้อแล้ว)",
              value:
                recSize === 0
                  ? `${fmt(size)} BTU ต่อเครื่อง — ห้องนี้ต้องใช้หลายเครื่อง`
                  : size < recSize
                    ? `${fmt(size)} BTU — เล็กกว่าที่ห้องต้องการ เย็นช้าและคอมเพรสเซอร์ทำงานหนัก`
                    : `${fmt(size)} BTU`,
              emphasize: true,
            },
          ]
        : btuRes.rows;
    const pipeText = pipeRes.headline?.replace("ท่อทองแดง ", "") ?? "-";
    return jobFromParts({
      title: "งานแอร์ทั้งห้อง",
      headline:
        bought > 0
          ? `แอร์ ${fmt(size)} BTU (ซื้อแล้ว)${breakerOk ? ` · เบรกเกอร์ ${breakerRow} · สาย ${wireRow}` : ""}`
          : (btuRes.headline ?? `แนะนำแอร์ ${fmt(size)} BTU`),
      rows: [
        ...sizeRows,
        { label: "ท่อทองแดง", value: pipeText, emphasize: true },
        {
          label: `น้ำยา ${str(v, "kind", "R32")} เติมเพิ่ม`,
          value:
            run > num(v, "std", 5)
              ? (chargeRes.rows.find((r) => r.label === "เติมเพิ่ม")?.value ?? "-")
              : `ไม่ต้องเติม (ท่อ ${fmtTrim(run, 1)} ม. ไม่เกิน ${fmtTrim(num(v, "std", 5), 1)} ม.)`,
        },
        ...(breakerOk
          ? [
              ...breakerRes.rows.filter((r) => r.emphasize || r.label === "กระแสประมาณ"),
              { label: "หมายเหตุสายไฟ", value: `ตารางคร่าวตาม BTU (${CABLE_METHODS.surface.short}) — ให้ช่างไฟยืนยันกับป้ายเครื่อง` },
            ]
          : [{ label: "เบรกเกอร์ / สายไฟ", value: `เกินตารางคร่าว (ถึง ${fmt(AC_BREAKER_MAX_BTU)} BTU) — ใช้ค่าบนป้ายเครื่อง` }]),
        { label: "ค่าไฟ/เดือน", value: energy.rows.find((r) => r.emphasize)?.value ?? "-" },
      ],
      tip: "ยังไม่รวมฉนวนท่อ สายคอนโทรล ท่อน้ำทิ้ง รางครอบท่อ และขาแขวน · สายไฟเป็นตารางคร่าวตามขนาดแอร์ งานจริงเทียบป้ายเครื่องและให้ช่างไฟ/วิศวกรยืนยัน ยังไม่รวมค่าติดตั้ง",
      parts: [...(btuRes.invalid ? [] : [btuRes]), pipeRes, chargeRes, ...(breakerOk ? [breakerRes] : []), energy],
      chart: bought > 0 ? undefined : btuRes.chart,
    });
  },
};
