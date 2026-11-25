import type { JobDef, ToolDef, Values } from "../types";
import { blockedResult, ceil, fmt, guardInputs, guardTool, jobFromParts, lerpTable, num, resultX, round, str, withDefaults } from "../math";
import {
  ALU_BAR,
  DISCLAIMER_AB,
  DISCLAIMER_C,
  GLASS_WIND,
  MATERIAL,
  PLATE_BETA,
  PLATE_BETA_MAX,
  PLATE_BETA_SOURCE,
  SEALANT,
} from "../constants";

const guard = (id: string, v: Values) => guardTool(glassTools, id, v);

export function calcAluCut(v: Values) {
  const bad = guard("cut", v);
  if (bad) return bad;
  const w = num(v, "w", 1200);
  const h = num(v, "h", 1500);
  const n = num(v, "n", 2);
  const profile = num(v, "profile", 45);
  const miter = str(v, "miter", "45");
  const widthCut = w;
  const heightCut = miter === "45" ? h : h - 2 * profile;
  if (heightCut <= 0) {
    return blockedResult({
      headline: `หักเฟรม 2 ข้าง (${fmt(2 * profile)} มม.) แล้วไม่เหลือความสูงให้ตัด — ตรวจสูงช่องกับหน้าตัดเฟรม`,
      rows: [
        { label: "สูงช่อง", value: `${fmt(h)} มม.` },
        { label: "หน้าตัดเฟรม × 2", value: `${fmt(2 * profile)} มม.` },
      ],
      tip: "ตัดชน 90° ด้านสูงต้องหักหน้าตัดเฟรมบน-ล่างออก สูงช่องจึงต้องมากกว่า 2 เท่าของหน้าตัดเฟรม",
    });
  }
  const per = 2 * widthCut + 2 * heightCut;
  const total = per * n;
  const barLen = ALU_BAR.value;
  const bars = ceil(total / barLen);

  return resultX({
    title: "ระยะตัดอลูมิเนียม",
    headline: `ตัดรวม ${fmt(total / 1000, 2)} ม.`,
    chart:
      bars > 0
        ? {
            kind: "packs",
            unitLabel: `เส้น ${fmt(barLen / 1000, 1)} ม.`,
            count: bars,
            lastUsed: (total - (bars - 1) * barLen) / barLen,
            note: `ต่อช่อง ${fmt(per / 1000, 2)} ม. × ${fmt(n)} ช่อง`,
          }
        : undefined,
    rows: [
      { label: "ตัดกว้าง", value: `${fmt(widthCut)} มม.` },
      { label: "ตัดสูง", value: `${fmt(heightCut)} มม.` },
      { label: "ต่อช่อง", value: `${fmt(per / 1000, 2)} ม.` },
      { label: "รวมทั้งงาน", value: `${fmt(total / 1000, 2)} ม.`, emphasize: true },
      { label: `เส้น ${fmt(barLen / 1000, 1)} ม.`, value: `${bars} เส้น` },
    ],
    tip: "ระยะตัดเป็นแนว 45° หน้างาน เผื่อเส้นพลาด 1 เส้น",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary:
        miter === "45"
          ? "ตัดมุม 45° ใช้ความยาวปลายยาวเท่าขนาดนอกของช่อง ทั้งกว้างและสูง"
          : "ตัดชน 90° ด้านกว้าง = ขนาดนอก ด้านสูงหักหน้าตัดเฟรมสองข้าง",
      steps: [
        {
          label: miter === "45" ? "ตัดมุม 45° (ปลายยาว = ขนาดนอก)" : "ตัดชน 90° (ด้านสูงหักเฟรม 2 ข้าง)",
          expr: miter === "45" ? "ตัดกว้าง = กว้างช่อง · ตัดสูง = สูงช่อง" : "ตัดกว้าง = กว้างช่อง · ตัดสูง = สูง − 2×หน้าตัดเฟรม",
          subst: `กว้าง ${fmt(widthCut)} มม. · สูง ${fmt(heightCut)} มม.`,
        },
        {
          label: "ความยาวต่อช่อง",
          expr: "ต่อช่อง = 2×ตัดกว้าง + 2×ตัดสูง",
          subst: `2×${fmt(widthCut)} + 2×${fmt(heightCut)} = ${fmt(per)} มม.`,
        },
        {
          label: "รวมทั้งงานและแปลงเป็นเส้น",
          expr: `รวม = ต่อช่อง × จำนวนช่อง ÷ ${barLen / 1000} ม. ปัดขึ้น`,
          subst: `${fmt(per)} × ${fmt(n)} = ${fmt(total)} มม. → ${bars} เส้น`,
        },
      ],
      assumptions: ["ทุกช่องใช้หน้าตัดเฟรมและขนาดเดียวกัน", "เส้นอลูมิเนียมมาตรฐานยาว 5.8–6 ม."],
      caveats: ["บานเปิด/บานเลื่อนมีเฟรมชั้นในเพิ่มที่ยังไม่รวมในนี้ ให้บวกแยกตามแบบ", DISCLAIMER_AB],
      refs: [{ label: "แนวปฏิบัติงานตัดกรอบอลูมิเนียมหน้างาน" }],
    },
  });
}

export function calcGlassWeight(v: Values) {
  const bad = guard("weight", v);
  if (bad) return bad;
  const w = num(v, "w", 1200) / 1000;
  const h = num(v, "h", 1500) / 1000;
  const t = num(v, "t", 8);
  const n = num(v, "n", 1);
  const density = MATERIAL.glassDensity.value / 1000;
  const kg = density * t * w * h * n;
  const hw = kg < 25 ? "บานพับ 2 ตัว / ลูกล้อเบา" : kg < 45 ? "บานพับ 3 ตัว หรือลูกล้อ 2" : "ลูกล้อเฮฟวี่ + รางเสริม";
  const chartMax = Math.max(60, Math.ceil(kg * 1.3));

  return resultX({
    title: "น้ำหนักกระจก",
    headline: `${fmt(kg, 1)} กก.`,
    chart: {
      kind: "threshold",
      unit: "กก.",
      value: round(kg, 1),
      max: chartMax,
      zones: [
        { upTo: 25, tone: "good", label: "บานพับ 2 / ลูกล้อเบา" },
        { upTo: 45, tone: "warn", label: "บานพับ 3 / ลูกล้อ 2" },
        { upTo: chartMax, tone: "bad", label: "ลูกล้อเฮฟวี่ + รางเสริม" },
      ],
    },
    rows: [
      { label: "กระจก", value: `${fmt(w, 2)}×${fmt(h, 2)} ม. หนา ${fmt(t)} มม. × ${fmt(n)}` },
      { label: "น้ำหนัก", value: `${fmt(kg, 1)} กก.`, emphasize: true },
      { label: "ฮาร์ดแวร์", value: hw },
    ],
    tip: "กระจก 2.5 กก./ตร.ม./มม. บานเลื่อนใหญ่เช็กน้ำหนักลูกล้อก่อนสั่ง",
    explain: {
      risk: "B",
      updatedAt: "2026-08-21",
      summary: "น้ำหนักกระจก = ความหนาแน่น × ความหนา × พื้นที่ × จำนวนแผ่น แล้วเทียบพิกัดฮาร์ดแวร์ที่ต้องใช้",
      steps: [
        {
          label: "น้ำหนักรวม",
          expr: "kg = 2.5 × หนา(มม.) × กว้าง(ม.) × สูง(ม.) × จำนวน",
          subst: `${density} × ${fmt(t)} × ${fmt(w, 2)} × ${fmt(h, 2)} × ${fmt(n)} = ${fmt(kg, 1)} กก.`,
        },
        {
          label: "เทียบพิกัดฮาร์ดแวร์",
          expr: "< 25 กก. บานพับเบา · 25–45 กก. บานพับ 3/ลูกล้อ 2 · > 45 กก. ลูกล้อเฮฟวี่",
          subst: `${fmt(kg, 1)} กก. → ${hw}`,
        },
      ],
      constants: [{ value: density, unit: "กก./ตร.ม./มม.", label: "ความหนาแน่นกระจกต่อความหนา", source: "EN 572 / TDS ผู้ผลิต (ความหนาแน่นกระจก 2,500 กก./ลบ.ม.)" }],
      assumptions: ["กระจกโฟลตทั่วไป ไม่ใช่กระจกลามิเนตหรือกระจกฉนวน (IGU) ซึ่งหนักกว่านี้"],
      caveats: [
        "บานใหญ่หรือหนาเป็นพิเศษ (ลามิเนต/IGU) น้ำหนักต่างจากนี้มาก ต้องเช็กสเปกจริงจากผู้ผลิต",
        "พิกัดฮาร์ดแวร์เป็นแนวปฏิบัติทั่วไป ให้เทียบกับสเปกที่ผู้ผลิตบานพับ/ลูกล้อระบุไว้จริงเสมอ",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "EN 572 มาตรฐานกระจกโฟลต (ความหนาแน่น 2,500 กก./ลบ.ม.)" }],
    },
  });
}

const GLASS_THICKNESS = [6, 8, 10, 12] as const;

/** หน่วยแรงดัดสูงสุดของบานกระจกยึดขอบ 4 ด้าน (MPa): σ = β × q × b² ÷ t² โดย b = ด้านสั้น (มม.) q เป็น N/ตร.มม. */
export function glassStress(shortM: number, longM: number, qPa: number, tMm: number): number {
  const ratio = longM / shortM;
  const beta = ratio >= PLATE_BETA[PLATE_BETA.length - 1][0] ? PLATE_BETA_MAX : lerpTable(ratio, PLATE_BETA);
  return (beta * (qPa / 1e6) * (shortM * 1000) ** 2) / tMm ** 2;
}

export function calcWind(v: Values) {
  const bad = guard("wind", v);
  if (bad) return bad;
  const w = num(v, "w", 1.2);
  const h = num(v, "h", 1.5);
  const wind = num(v, "wind", 25);
  const q = GLASS_WIND.pressureCoef.value * wind * wind;
  const span = Math.max(w, h);
  const short = Math.min(w, h);
  const maxSide = GLASS_WIND.maxSide.value;
  const maxWind = GLASS_WIND.maxWind.value;
  const allow = GLASS_WIND.allowStress.value;
  const inputRows = [
    { label: "ขนาดบาน", value: `${fmt(w, 2)} × ${fmt(h, 2)} ม.` },
    { label: "ความเร็วลม", value: `${fmt(wind)} ม./วินาที` },
    { label: "แรงลมประมาณ", value: `${fmt(q, 0)} N/ตร.ม.` },
  ];
  const engineerTip = "บานใหญ่หรือลมแรงระดับนี้ ต้องให้วิศวกรคิดตาม มยผ. 1311 / ASTM E1300 และมักต้องใช้กระจกนิรภัย";

  if (span > maxSide || wind > maxWind) {
    const why =
      span > maxSide && wind > maxWind
        ? `บานยาว ${fmt(span, 2)} ม. และลม ${fmt(wind)} ม./วินาที`
        : span > maxSide
          ? `บานยาว ${fmt(span, 2)} ม.`
          : `ลม ${fmt(wind)} ม./วินาที`;
    return blockedResult({
      headline: `${why} เกินตารางหน้างาน — ต้องให้วิศวกรคำนวณ`,
      rows: [
        ...inputRows,
        { label: "ช่วงที่ตารางนี้ตอบได้", value: `ด้านยาวไม่เกิน ${maxSide} ม. · ลมไม่เกิน ${maxWind} ม./วินาที` },
      ],
      tip: engineerTip,
    });
  }

  // ขั้นที่ 1: ตารางแนวปฏิบัติหน้างาน (ตามช่วงกว้างและความเร็วลม)
  let tTable = 6;
  if (wind >= 30 || span > 1.5) tTable = 8;
  if (wind >= 35 || span > 2) tTable = 10;
  if (span > 2.4) tTable = 12;
  // ขั้นที่ 2: เช็กหน่วยแรงดัดจริงของแผ่น ถ้าตารางบางไปให้ขยับหนาขึ้น — เลือกค่าที่หนากว่าเสมอ
  const tStress = GLASS_THICKNESS.find((s) => glassStress(short, span, q, s) <= allow);
  if (tStress === undefined) {
    const thickest = GLASS_THICKNESS[GLASS_THICKNESS.length - 1];
    return blockedResult({
      headline: `กระจกธรรมดา ${thickest} มม. ยังรับไม่ไหว — ต้องให้วิศวกรคำนวณ`,
      rows: [
        ...inputRows,
        {
          label: `หน่วยแรงที่กระจก ${thickest} มม.`,
          value: `${fmt(glassStress(short, span, q, thickest), 1)} MPa (ยอมให้ ${allow} MPa)`,
        },
      ],
      tip: engineerTip,
    });
  }
  const t = Math.max(tTable, tStress);
  const sigma = glassStress(short, span, q, t);

  return resultX({
    title: "แรงลม + ความหนากระจก",
    headline: `ตารางหน้างาน — หนาอย่างน้อย ${t} มม. (ยังไม่ใช่แบบวิศวกร)`,
    chart: {
      kind: "steps",
      unit: "มม.",
      items: GLASS_THICKNESS.map((s) => ({
        label: `${s} มม.`,
        value: s,
        state: s === t ? "chosen" : s < t ? "under" : "over",
      })),
    },
    rows: [
      ...inputRows,
      { label: "ด้านยาวสุด", value: `${fmt(span, 2)} ม.` },
      { label: "ความหนากระจกขั้นต่ำ", value: `${t} มม.`, emphasize: true },
      { label: "หน่วยแรงดัดที่ความหนานี้", value: `${fmt(sigma, 1)} MPa (ยอมให้ ${allow} MPa)` },
    ],
    tip: "ค่าประมาณหน้างาน ไม่ใช่แบบวิศวกร อาคารสูงหรือติดทะเลให้วิศวกรคำนวณแรงลม",
    explain: {
      risk: "C",
      updatedAt: "2026-11-25",
      summary:
        "แรงลมประมาณ q = 0.6v² → เลือกความหนาจากตารางแนวปฏิบัติ แล้วเช็กหน่วยแรงดัดของแผ่นยึดขอบ 4 ด้านอีกชั้น ใช้ค่าที่หนากว่า นอกช่วงตารางจะไม่ให้ตัวเลข",
      steps: [
        {
          label: "แรงดันลมประมาณ",
          expr: `q = ${GLASS_WIND.pressureCoef.value} × v²`,
          subst: `${GLASS_WIND.pressureCoef.value} × ${fmt(wind)}² = ${fmt(q, 0)} N/ตร.ม.`,
        },
        {
          label: "ความหนาจากตารางแนวปฏิบัติ",
          expr: "ยิ่งลมแรงหรือด้านยาวมาก ต้องหนาขึ้น",
          subst: `ลม ${fmt(wind)} ม./วินาที, ด้านยาว ${fmt(span, 2)} ม. → ${tTable} มม.`,
        },
        {
          label: "เช็กหน่วยแรงดัดของแผ่น",
          expr: `σ = β × q × (ด้านสั้น)² ÷ t² ต้องไม่เกิน ${allow} MPa`,
          subst: `ด้านสั้น ${fmt(short, 2)} ม. หนา ${t} มม. → ${fmt(sigma, 1)} MPa`,
          note: tStress > tTable ? `ตารางให้ ${tTable} มม. แต่หน่วยแรงเกิน จึงขยับเป็น ${tStress} มม.` : undefined,
        },
      ],
      constants: [
        GLASS_WIND.pressureCoef,
        GLASS_WIND.allowStress,
        GLASS_WIND.maxSide,
        GLASS_WIND.maxWind,
        { value: PLATE_BETA_MAX, unit: "-", label: "สัมประสิทธิ์หน่วยแรงดัด β สูงสุดของแผ่นยึด 4 ด้าน", source: PLATE_BETA_SOURCE, range: "0.29–0.75" },
      ],
      assumptions: [
        "กระจกโฟลตธรรมดายึดขอบ 4 ด้าน (บานติดตาย/บานเลื่อนกรอบอลูมิเนียม)",
        "อาคารเตี้ยทั่วไป ไม่ใช่ตึกสูงหรือพื้นที่เปิดโล่งริมทะเล",
        `ตอบเฉพาะบานด้านยาวไม่เกิน ${maxSide} ม. และลมไม่เกิน ${maxWind} ม./วินาที`,
      ],
      caveats: [
        "นี่คือตารางประมาณหน้างาน ไม่ใช่การคำนวณตามมาตรฐานกระจกรับแรงลม (เช่น ASTM E1300)",
        "ยังไม่รวมตัวคูณลมกระโชก มุมอาคาร และความสูงอาคาร ซึ่งทำให้แรงลมจริงสูงกว่านี้ได้",
        "อาคารสูง ริมทะเล หรือพื้นที่ลมกระโชกแรง ต้องให้วิศวกรคำนวณแรงลมออกแบบและความหนากระจกตามมาตรฐานจริง",
        DISCLAIMER_C,
      ],
      refs: [
        { label: "ASTM E1300 Determining Load Resistance of Glass (แนวทางอ้างอิง)" },
        { label: "มยผ. 1311 มาตรฐานการคำนวณแรงลมและการตอบสนองของอาคาร" },
        { label: PLATE_BETA_SOURCE },
      ],
    },
  });
}

export function calcSealant(v: Values) {
  const bad = guard("sealant", v);
  if (bad) return bad;
  const peri = num(v, "peri", 8);
  const gap = num(v, "gap", 6);
  const depth = num(v, "depth", 6);

  // ยาว 1 ม. × ร่อง 1 มม. × ลึก 1 มม. = 1,000 มม.³ = 1 มล. ตัวเลขจึงคูณกันตรง ๆ ได้เลย
  const raw = peri * gap * depth;
  const ml = raw * (1 + SEALANT.waste.value / 100);
  const tubes = ceil(ml / SEALANT.tube.value);
  const perTube = round(SEALANT.tube.value / (gap * depth), 1);
  const inLast = tubes > 0 ? ml - (tubes - 1) * SEALANT.tube.value : 0;

  return resultX({
    title: "ระยะเผื่อ + ซิลิโคน",
    headline: `ซิลิโคน ${tubes} หลอด`,
    chart:
      tubes > 0
        ? {
            kind: "packs",
            unitLabel: `หลอด ${SEALANT.tube.value} มล.`,
            count: tubes,
            lastUsed: inLast / SEALANT.tube.value,
            note: `หลอดเดียวยิงได้ประมาณ ${fmt(perTube, 1)} ม. ที่ร่อง ${fmt(gap)}×${fmt(depth)} มม.`,
          }
        : undefined,
    rows: [
      { label: "เส้นรอบ", value: `${fmt(peri, 1)} ม.` },
      { label: "ร่อง × ลึก", value: `${fmt(gap)} × ${fmt(depth)} มม.` },
      { label: "เนื้อซิลิโคน", value: `${fmt(round(raw, 0))} มล.` },
      { label: `รวมเผื่อ ${SEALANT.waste.value}%`, value: `${fmt(round(ml, 0))} มล.` },
      { label: `หลอด ${SEALANT.tube.value} มล.`, value: `${tubes} หลอด`, emphasize: true },
      { label: "ยิงได้ต่อหลอด", value: `${fmt(perTube, 1)} ม.` },
    ],
    tip: "ร่องลึกเกิน 12 มม. ใส่แบกเกอร์ร็อดก่อน ซิลิโคนจะยืดหยุ่นได้และไม่ฉีกตอนกระจกขยับ",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "ปริมาณ = ความยาวร่อง × กว้างร่อง × ลึกร่อง แล้วเผื่อการสูญเสีย",
      steps: [
        {
          label: "เนื้อซิลิโคนที่ต้องเติมในร่อง",
          expr: "ปริมาณ (มล.) = ยาว (ม.) × กว้าง (มม.) × ลึก (มม.)",
          subst: `${fmt(peri, 1)} × ${fmt(gap)} × ${fmt(depth)} = ${fmt(round(raw, 0))} มล.`,
          note: "ยาว 1 ม. ร่อง 1×1 มม. ได้ 1,000 มม.³ ซึ่งเท่ากับ 1 มล. พอดี จึงคูณกันตรง ๆ ได้",
        },
        {
          label: `เผื่อสูญเสีย ${SEALANT.waste.value}%`,
          expr: `รวมเผื่อ = ปริมาณ × ${1 + SEALANT.waste.value / 100}`,
          subst: `${fmt(round(raw, 0))} × ${1 + SEALANT.waste.value / 100} = ${fmt(round(ml, 0))} มล.`,
        },
        {
          label: "แปลงเป็นหลอด",
          expr: `หลอด = รวมเผื่อ ÷ ${SEALANT.tube.value} ปัดขึ้น`,
          subst: `${fmt(round(ml, 0))} ÷ ${SEALANT.tube.value} = ${tubes} หลอด`,
        },
      ],
      constants: [SEALANT.tube, SEALANT.waste, SEALANT.minDepth],
      assumptions: [
        "ร่องเป็นสี่เหลี่ยมเต็มความลึกที่กรอก ไม่ได้ยิงแบบปาดบาง",
        "ยิงด้านเดียวของกระจก ถ้ายิงทั้งสองด้านให้คูณสอง",
      ],
      caveats: [
        "ร่องกว้างเกิน 12 มม. ต้องใส่แบกเกอร์ร็อด ไม่ใช่กรอกซิลิโคนให้ลึกขึ้น เพราะซิลิโคนที่ยึดสามด้านจะฉีกเมื่อรอยต่อขยับ",
        "หลอดที่ขายมีทั้ง 280 และ 300 มล. ถ้าซื้อ 300 มล. จะใช้จำนวนหลอดน้อยกว่านี้เล็กน้อย",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "ASTM C1193 Standard Guide for Use of Joint Sealants" }],
    },
  });
}

export function calcGlassHw(v: Values) {
  const bad = guard("hardware", v);
  if (bad) return bad;
  const w = num(v, "w", 1200);
  const h = num(v, "h", 2200);
  const kind = str(v, "kind", "door");
  const edge = kind === "door" ? 100 : 80;
  const edgeShare = Math.min(1, (edge * 2) / Math.max(h, 1));

  return resultX({
    title: "ระยะเจาะกระจก",
    headline: `เจาะห่างขอบ ${edge} มม.`,
    chart: {
      kind: "stack",
      parts: [
        { label: "โซนเจาะ/บาก (บน+ล่าง)", value: edgeShare, display: `${edge}×2 มม.`, tone: "accent" },
        { label: "เนื้อกระจกกลางบาน", value: 1 - edgeShare, display: `${fmt(h - edge * 2)} มม.`, tone: "mute" },
      ],
      totalLabel: "สูงบาน",
      totalDisplay: `${fmt(h)} มม.`,
    },
    rows: [
      { label: "งาน", value: kind === "door" ? "ประตูกระจก" : "ฟิตติ้งบาน" },
      { label: "ขนาด", value: `${fmt(w)} × ${fmt(h)} มม.` },
      { label: "ระยะเจาะ/บาก", value: `${edge} มม. จากขอบ`, emphasize: true },
      { label: "สูงมือจับประมาณ", value: kind === "door" ? "900–1000 มม. จากพื้น" : "-" },
    ],
    tip: "ส่งโรงงานให้ระบุซ้าย-ขวาและด้านเจียร อย่าเดาฝั่งบาน",
    explain: {
      risk: "B",
      updatedAt: "2026-08-21",
      summary: "ระยะเจาะ/บากยึดฮาร์ดแวร์ห่างจากขอบกระจกตามค่ามาตรฐานของงาน (ประตูเจาะลึกกว่าฟิตติ้งบานทั่วไป)",
      steps: [
        {
          label: "เลือกระยะตามชนิดงาน",
          expr: "ประตูกระจก = 100 มม. · ฟิตติ้งบานทั่วไป = 80 มม.",
          subst: `งาน${kind === "door" ? "ประตูกระจก" : "ฟิตติ้งบาน"} → ${edge} มม. จากขอบ`,
        },
      ],
      assumptions: ["กระจกนิรภัย (tempered) หนา 10–12 มม. เจาะ/บากจากโรงงานเท่านั้น ห้ามเจาะหน้างาน"],
      caveats: [
        "ตำแหน่งเจาะจริงต้องยึดตามสเปกฮาร์ดแวร์ (บานพับ/ล็อค/มือจับ) ของแต่ละยี่ห้อ ตัวเลขนี้เป็นค่าเริ่มต้นทั่วไปเท่านั้น",
        "กระจกเจาะแล้วตัด-เจียรเพิ่มไม่ได้ ต้องยืนยันแบบและด้านเจียรกับโรงงานก่อนสั่งผลิต",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวปฏิบัติงานฟิตติ้งกระจกนิรภัย (ระยะเจาะ/บากมาตรฐาน)" }],
    },
  });
}

export const glassTools: ToolDef[] = [
  {
    id: "cut",
    name: "ระยะตัดอลูมิเนียม",
    blurb: "หักเฟรมอัตโนมัติ",
    fields: [
      { type: "number", key: "w", label: "กว้างช่อง", unit: "มม.", default: 1200, min: 200, max: 5800 },
      { type: "number", key: "h", label: "สูงช่อง", unit: "มม.", default: 1500, min: 200, max: 5800 },
      { type: "number", key: "n", label: "จำนวนช่อง", unit: "ช่อง", default: 2, min: 1, max: 200 },
      { type: "number", key: "profile", label: "หน้าตัดเฟรม", unit: "มม.", default: 45, min: 20, max: 100 },
      {
        type: "select",
        key: "miter",
        label: "วิธีตัดมุม",
        default: "45",
        options: [
          { value: "45", label: "มุม 45° (ปลายยาว = ขนาดนอก)" },
          { value: "90", label: "ชน 90° (ด้านสูงหักเฟรม 2 ข้าง)" },
        ],
      },
    ],
    calc: calcAluCut,
  },
  {
    id: "weight",
    name: "น้ำหนักกระจก",
    blurb: "แนะนำลูกล้อ/บานพับ",
    fields: [
      { type: "number", key: "w", label: "กว้าง", unit: "มม.", default: 1200, min: 100, max: 6000 },
      { type: "number", key: "h", label: "สูง", unit: "มม.", default: 1500, min: 100, max: 6000 },
      { type: "number", key: "t", label: "หนา", unit: "มม.", default: 8, min: 3, max: 25 },
      { type: "number", key: "n", label: "จำนวนแผ่น", unit: "แผ่น", default: 1, min: 1, max: 500 },
    ],
    calc: calcGlassWeight,
  },
  {
    id: "wind",
    name: "แรงลม + ความหนากระจก",
    blurb: "ขั้นต่ำตามช่วงและลม",
    fields: [
      { type: "number", key: "w", label: "กว้าง", unit: "ม.", default: 1.2, min: 0.3, max: 6, step: 0.05 },
      { type: "number", key: "h", label: "สูง", unit: "ม.", default: 1.5, min: 0.3, max: 6, step: 0.05 },
      { type: "number", key: "wind", label: "ความเร็วลมออกแบบ", unit: "ม./วินาที", default: 25, min: 15, max: 80 },
    ],
    calc: calcWind,
  },
  {
    id: "sealant",
    name: "ระยะเผื่อ + ซิลิโคน",
    blurb: "ปริมาณหลอด",
    fields: [
      { type: "number", key: "peri", label: "เส้นรอบร่อง", unit: "ม.", default: 8, min: 0.5, max: 5000, step: 0.1 },
      { type: "number", key: "gap", label: "กว้างร่อง", unit: "มม.", default: 6, min: 3, max: 50 },
      { type: "number", key: "depth", label: "ลึกยา", unit: "มม.", default: 6, min: 3, max: 25 },
    ],
    calc: calcSealant,
  },
  {
    id: "hardware",
    name: "ระยะเจาะกระจก",
    blurb: "ส่งโรงงาน",
    fields: [
      { type: "number", key: "w", label: "กว้าง", unit: "มม.", default: 1200, min: 300, max: 3000 },
      { type: "number", key: "h", label: "สูง", unit: "มม.", default: 2200, min: 400, max: 3500 },
      {
        type: "select",
        key: "kind",
        label: "งาน",
        default: "door",
        options: [
          { value: "door", label: "ประตู" },
          { value: "patch", label: "พัทช์ฟิตติ้ง" },
        ],
      },
    ],
    calc: calcGlassHw,
  },
];

export const glassJob: JobDef = {
  name: "คิดทั้งงานหน้าต่าง/ประตู",
  blurb: "ช่องครั้งเดียว ได้ตัดเฟรม น้ำหนัก ซิลิโคน",
  fields: [
    { type: "number", key: "w", label: "กว้างช่อง", unit: "มม.", default: 1200, min: 200, max: 5800 },
    { type: "number", key: "h", label: "สูงช่อง", unit: "มม.", default: 1500, min: 200, max: 5800 },
    { type: "number", key: "n", label: "จำนวนช่อง", unit: "ช่อง", default: 1, min: 1, max: 200 },
    { type: "number", key: "profile", label: "หน้าตัดเฟรม", unit: "มม.", default: 45, min: 20, max: 100 },
    { type: "number", key: "t", label: "หนากระจก", unit: "มม.", default: 8, min: 4, max: 25 },
  ],
  calc: (input) => {
    const bad = guardInputs(glassJob.fields, input);
    if (bad) return bad;
    const v = withDefaults(glassJob.fields, input);
    const cut = calcAluCut(v);
    const wt = calcGlassWeight(v);
    const peri = (2 * (num(v, "w", 1200) + num(v, "h", 1500)) * num(v, "n", 1)) / 1000;
    const seal = calcSealant({ peri, gap: 6, depth: 6 });
    return jobFromParts({
      title: "งานกระจก-อลูมิเนียม",
      headline: "ชุดหน้าต่าง/ประตู",
      rows: [
        ...cut.rows.filter((r) => r.emphasize || r.label.includes("เส้น")),
        ...wt.rows.filter((r) => r.emphasize || r.label === "ฮาร์ดแวร์"),
        ...seal.rows.filter((r) => r.emphasize),
      ],
      tip: "ยังไม่รวมมุ้งและมือจับ ส่งโรงงานให้ยืนยันระยะเจาะอีกครั้ง",
      parts: [cut, wt, seal],
    });
  },
};
