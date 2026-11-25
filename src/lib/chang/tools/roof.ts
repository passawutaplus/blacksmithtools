import type { JobDef, ToolDef, Values } from "../types";
import { blockedResult, ceil, fmt, guardInputs, guardTool, jobFromParts, num, resultX, round, str, withDefaults } from "../math";
import { DISCLAIMER_AB, ROOF, WASTE_DEFAULT } from "../constants";

/** ด่านตรวจของสายหลังคา: ช่องกรอกอยู่ในช่วง + ความชันไม่เกินที่สูตรรองรับ */
const guard = (id: string, v: Values) => guardTool(roofTools, id, v) ?? pitchGuard(v);

function pitchGuard(v: Values) {
  const pitch = num(v, "pitch", 30);
  const deg = str(v, "pitchUnit", "pct") === "deg" ? pitch : pitchDegrees(pitch);
  const max = ROOF.maxPitchDeg.value;
  if (deg <= max) return null;
  return blockedResult({
    headline: `ความชัน ${fmt(deg, 1)}° ชันเกินที่คิดให้ได้ (ไม่เกิน ${max}°) — ตรวจหน่วยความชันอีกครั้ง`,
    rows: [{ label: "ช่วงที่คิดได้", value: `ไม่เกิน ${max}° หรือราว ${fmt(Math.tan((max * Math.PI) / 180) * 100)}%` }],
    tip: "หลังคาบ้านทั่วไปชัน 5–45° ถ้าชันกว่านี้เป็นงานผนังเอียง ให้คิดจากความยาวแนวลาดที่วัดจริง",
  });
}

export function pitchPercent(v: Values): number {
  const pitch = num(v, "pitch", 30);
  const unit = str(v, "pitchUnit", "pct");
  if (unit === "deg") return Math.tan((pitch * Math.PI) / 180) * 100;
  return pitch;
}

export function pitchDegrees(pct: number): number {
  return (Math.atan(pct / 100) * 180) / Math.PI;
}

export function trueRoofArea(plan: number, pitchPct: number) {
  const riseRun = pitchPct / 100;
  return plan * Math.sqrt(1 + riseRun * riseRun);
}

export function calcRoofArea(v: Values) {
  const bad = guard("area", v);
  if (bad) return bad;
  const w = num(v, "w", 8);
  const l = num(v, "l", 12);
  const pitch = pitchPercent(v);
  const wastePct = num(v, "waste", WASTE_DEFAULT.value);
  const plan = w * l;
  const trueA = trueRoofArea(plan, pitch);
  const withWaste = trueA * (1 + wastePct / 100);
  const slopeAdd = trueA - plan;
  const wasteAdd = withWaste - trueA;

  return resultX({
    title: "พื้นที่หลังคาจริง",
    headline: `${fmt(withWaste, 1)} ตร.ม. รวมเผื่อ`,
    chart: {
      kind: "stack",
      parts: [
        { label: "พื้นที่แปลน (มองจากบน)", value: plan, display: `${fmt(plan, 1)} ตร.ม.`, tone: "mute" },
        { label: `เพิ่มจากความชัน ${fmt(pitch)}%`, value: slopeAdd, display: `${fmt(slopeAdd, 1)} ตร.ม.`, tone: "accent" },
        { label: `เผื่อเสีย/ซ้อนทับ ${fmt(wastePct)}%`, value: wasteAdd, display: `${fmt(wasteAdd, 1)} ตร.ม.`, tone: "warn" },
      ],
      totalLabel: "พื้นที่หลังคารวมเผื่อ",
      totalDisplay: `${fmt(withWaste, 1)} ตร.ม.`,
    },
    rows: [
      { label: "พื้นที่แปลน", value: `${fmt(plan, 1)} ตร.ม.` },
      { label: "ความชัน", value: `${fmt(pitch, 1)}% ≈ ${fmt(pitchDegrees(pitch), 1)}°` },
      { label: "พื้นที่จริง", value: `${fmt(trueA, 1)} ตร.ม.`, emphasize: true },
      { label: `รวมเผื่อ ${fmt(wastePct)}%`, value: `${fmt(withWaste, 1)} ตร.ม.` },
    ],
    tip: "หลังคาปั้นหยา/หลังคาหลาย lap เผื่อเพิ่มอีก 5–8%",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "พื้นที่หลังคาจริง (ตามผิวเอียง) มากกว่าพื้นที่แปลนที่มองจากด้านบน ตามอัตราส่วนของมุมชัน (pitch factor = √(1 + (ชัน%)²)) แล้วเผื่อเสีย/ซ้อนทับตามที่กรอก",
      steps: [
        { label: "พื้นที่แปลน", expr: "กว้าง × ยาว", subst: `${fmt(w)} × ${fmt(l)} = ${fmt(plan, 1)} ตร.ม.` },
        {
          label: "พื้นที่ผิวจริงตามความชัน",
          expr: "พื้นที่จริง = แปลน × √(1 + (ชัน/100)²)",
          subst: `${fmt(plan, 1)} × √(1 + ${fmt(pitch / 100, 2)}²) = ${fmt(trueA, 1)} ตร.ม.`,
        },
        { label: "รวมเผื่อเสีย/ซ้อนทับ", expr: "พื้นที่จริง × (1 + เผื่อเสีย)", subst: `${fmt(trueA, 1)} × ${fmt(1 + wastePct / 100, 2)} = ${fmt(withWaste, 1)} ตร.ม.` },
      ],
      assumptions: ["หลังคาจั่วธรรมดา ผิวเอียงสม่ำเสมอทิศเดียว ไม่มีหลังคาซ้อนหลายระดับ"],
      caveats: [
        "หลังคาปั้นหยา (hip roof) หรือมีหลังคาหลายชั้น/มุมจั่วซับซ้อน ต้องเผื่อเพิ่มอีก 5–8% จากรอยต่อและการซ้อนทับที่มากกว่าหลังคาจั่วธรรมดา",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "หลักตรีโกณมิติพื้นฐาน (Roof Pitch Factor) สำหรับประมาณพื้นที่หลังคาจากแปลน" }],
    },
  });
}

export function calcRoofMaterial(v: Values) {
  const bad = guard("material", v);
  if (bad) return bad;
  const area = trueRoofArea(num(v, "w", 8) * num(v, "l", 12), pitchPercent(v)) * (1 + num(v, "waste", WASTE_DEFAULT.value) / 100);
  const kind = str(v, "kind", "metal");
  if (kind === "tile") {
    const perM2 = num(v, "perM2", 10);
    const need = area * perM2;
    const n = ceil(need);
    return resultX({
      title: "จำนวนแผ่นหลังคา",
      headline: `${n} แผ่นกระเบื้อง`,
      chart: {
        kind: "packs",
        unitLabel: "แผ่น",
        count: n,
        lastUsed: need - Math.floor(need) || 1,
        note: `พื้นที่รวมเผื่อ ${fmt(area, 1)} ตร.ม. × ${perM2} แผ่น/ตร.ม.`,
      },
      rows: [
        { label: "พื้นที่รวมเผื่อ", value: `${fmt(area, 1)} ตร.ม.` },
        { label: "แผ่นกระเบื้อง", value: `${n} แผ่น`, emphasize: true },
      ],
      tip: "ตรวจครอบสันและตะเข้แยกจากจำนวนแผ่น",
      explain: {
        risk: "A",
        updatedAt: "2026-08-21",
        summary: "จำนวนแผ่นกระเบื้องหลังคา = พื้นที่หลังคาจริง (รวมเผื่อ) × อัตราแผ่นต่อตารางเมตรของกระเบื้องรุ่นนั้น",
        steps: [{ label: "จำนวนแผ่น", expr: "ปัดขึ้น(พื้นที่ × แผ่น/ตร.ม.)", subst: `${fmt(area, 1)} × ${perM2} = ${n} แผ่น` }],
        assumptions: ["อัตราแผ่น/ตร.ม. เป็นค่าจากสเปกผู้ผลิตกระเบื้องแต่ละรุ่น (ขึ้นกับขนาดแผ่นและระยะซ้อนทับ/แนวตะปู)"],
        caveats: ["ยังไม่รวมครอบสัน ครอบตะเข้ และแผ่นกันลมที่ต้องนับแยกตามความยาวจริง", DISCLAIMER_AB],
        refs: [{ label: "สเปกกระเบื้องหลังคาคอนกรีต/ลอนคู่ตามผู้ผลิต (แผ่น/ตร.ม.)" }],
      },
    });
  }
  // เมทัลชีทนับเป็น "แถว" ตามแนวชายคา × จำนวนแผ่นต่อแถวตามแนวลาด — หารพื้นที่ตรง ๆ จะได้แผ่นน้อยเกินจริง
  // เพราะเศษปลายแผ่นเอาไปต่อแถวอื่นไม่ได้ (รอยต่อกลางลาดต้องซ้อนและรั่วง่าย)
  const w = num(v, "w", 8);
  const l = num(v, "l", 12);
  const wastePct = num(v, "waste", WASTE_DEFAULT.value);
  const pitch = pitchPercent(v);
  const lean = str(v, "shape", "gable") === "lean";
  const sides = lean ? 1 : 2;
  const coverW = num(v, "coverW", 0.7);
  const len = num(v, "sheetLen", 6);
  const lap = ROOF.endLap.value;
  const slopeLen = (w / sides) * Math.sqrt(1 + (pitch / 100) ** 2);
  const rows = ceil(l / coverW);
  const perRun = slopeLen <= len ? 1 : ceil((slopeLen - lap) / (len - lap));
  const base = sides * rows * perRun;
  const sheets = ceil(base * (1 + wastePct / 100));
  const spare = sheets - base;
  const shapeName = lean ? "เพิงหมาแหงน (ลาดทางเดียว)" : "จั่ว 2 ด้าน";

  return resultX({
    title: "จำนวนแผ่นหลังคา",
    headline: `${sheets} แผ่นเมทัลชีท`,
    chart: {
      kind: "stack",
      parts: [
        { label: `นับตามแถว (${sides} ด้าน × ${rows} แถว × ${perRun} แผ่น)`, value: base, display: `${base} แผ่น`, tone: "accent" },
        ...(spare > 0 ? [{ label: `เผื่อเสีย ${fmt(wastePct)}%`, value: spare, display: `${spare} แผ่น`, tone: "warn" as const }] : []),
      ],
      totalLabel: `แผ่น ${fmt(coverW, 2)}×${fmt(len, 1)} ม.`,
      totalDisplay: `${sheets} แผ่น`,
    },
    rows: [
      { label: "ทรงหลังคา", value: shapeName },
      { label: "ยาวแนวลาดต่อด้าน", value: `${fmt(slopeLen, 2)} ม.` },
      { label: "แถวตามแนวชายคา", value: `${rows} แถว/ด้าน (คลุมแผ่นละ ${fmt(coverW, 2)} ม.)` },
      {
        label: "แผ่นต่อแถว",
        value: perRun === 1 ? `1 แผ่น (แผ่นยาว ${fmt(len, 1)} ม. ถึงสัน)` : `${perRun} แผ่น ต่อซ้อนปลาย ${fmt(lap * 100)} ซม.`,
      },
      { label: "นับตามแถว", value: `${base} แผ่น` },
      { label: `จำนวนแผ่น (เผื่อ ${fmt(wastePct)}%)`, value: `${sheets} แผ่น`, emphasize: true },
    ],
    tip:
      perRun === 1
        ? `สั่งตัดยาว ${fmt(Math.ceil(slopeLen * 10) / 10, 1)} ม. ตามแนวลาดได้ จะไม่เหลือเศษปลายแผ่น`
        : "แนวลาดยาวกว่าแผ่น ต้องต่อซ้อนปลาย ถ้าสั่งแผ่นยาวถึงสันได้จะรั่วยากกว่า",
    explain: {
      risk: "A",
      updatedAt: "2026-11-25",
      summary:
        "เมทัลชีทนับเป็นแถว: จำนวนแถว = ยาวชายคา ÷ ความกว้างคลุม (ปัดขึ้น) × จำนวนแผ่นต่อแถวตามแนวลาด × จำนวนด้าน แล้วเผื่อเสีย — ไม่ใช้วิธีหารพื้นที่ เพราะเศษปลายแผ่นใช้ต่อไม่ได้",
      steps: [
        {
          label: "ยาวแนวลาดต่อด้าน",
          expr: lean ? "กว้างแปลน × √(1 + (ชัน/100)²)" : "(กว้างแปลน ÷ 2) × √(1 + (ชัน/100)²)",
          subst: `${fmt(w / sides, 2)} × √(1 + ${fmt(pitch / 100, 2)}²) = ${fmt(slopeLen, 2)} ม.`,
        },
        { label: "จำนวนแถวต่อด้าน", expr: "ปัดขึ้น(ยาวแปลน ÷ กว้างคลุม)", subst: `${fmt(l, 1)} ÷ ${fmt(coverW, 2)} → ${rows} แถว` },
        {
          label: "แผ่นต่อแถว",
          expr: `ถ้าแนวลาด ≤ ยาวแผ่น ใช้ 1 แผ่น · ถ้ายาวกว่า = ปัดขึ้น((แนวลาด − ${lap}) ÷ (ยาวแผ่น − ${lap}))`,
          subst: `แนวลาด ${fmt(slopeLen, 2)} ม. แผ่นยาว ${fmt(len, 1)} ม. → ${perRun} แผ่น`,
        },
        {
          label: "จำนวนแผ่นรวม",
          expr: "ปัดขึ้น(ด้าน × แถว × แผ่นต่อแถว × (1 + เผื่อเสีย))",
          subst: `${sides} × ${rows} × ${perRun} = ${base} แผ่น → เผื่อ ${fmt(wastePct)}% = ${sheets} แผ่น`,
        },
      ],
      constants: [ROOF.endLap],
      assumptions: [
        "ด้านกว้างแปลนคือด้านที่น้ำไหลลง (แนวลาด) ด้านยาวแปลนคือแนวสัน/ชายคา และขนาดแปลนรวมชายคายื่นแล้ว",
        "ความกว้างคลุมที่กรอกคือความกว้างใช้งานจริงหลังซ้อนทับลอนข้าง (effective coverage) ไม่ใช่ความกว้างเต็มแผ่นก่อนซ้อน",
      ],
      caveats: [
        "หลังคาปั้นหยาหรือมีตะเข้ แผ่นต้องตัดเฉียง จำนวนจริงมากกว่านี้ ให้นับจากแบบ",
        "แผ่นสั่งตัดยาวพิเศษราคาต่อแผ่นสูงขึ้น ควรเทียบราคากับแผ่นยาวมาตรฐาน + ต่อแนวก่อนสั่ง",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "คู่มือติดตั้งเมทัลชีทของผู้ผลิต (ความกว้างคลุมจริงและระยะซ้อนปลายแผ่น)" }],
    },
  });
}

export function calcGutter(v: Values) {
  const bad = guard("gutter", v);
  if (bad) return bad;
  const area = trueRoofArea(num(v, "w", 8) * num(v, "l", 12), pitchPercent(v));
  const gutterMm = area < 50 ? 100 : area < 120 ? 125 : 150;
  const down = ceil(area / 50);
  const downDia = gutterMm >= 150 ? 100 : 80;
  const chartMax = Math.max(area * 1.2, 150);

  return resultX({
    title: "ขนาดรางน้ำ + ท่อ",
    headline: `ราง ${gutterMm} มม. · ท่อลง ${down} เส้น`,
    chart: {
      kind: "threshold",
      unit: "ตร.ม.",
      value: round(area, 1),
      max: chartMax,
      zones: [
        { upTo: 50, tone: "good", label: "ราง 100 มม." },
        { upTo: 120, tone: "warn", label: "ราง 125 มม." },
        { upTo: chartMax, tone: "bad", label: "ราง 150 มม." },
      ],
    },
    rows: [
      { label: "พื้นที่รับน้ำ", value: `${fmt(area, 1)} ตร.ม.` },
      { label: "รางน้ำ", value: `${gutterMm} มม.`, emphasize: true },
      { label: "ท่อลง", value: `${down} เส้น Ø ${downDia} มม.` },
    ],
    tip: "แนว SMACNA คร่าว ๆ ฝนไทยหนักจัดเพิ่มท่อลงมุมบ้าน",
    explain: {
      risk: "B",
      updatedAt: "2026-08-21",
      summary: "ขนาดรางน้ำและจำนวนท่อลงเลือกจากพื้นที่หลังคาที่รับน้ำฝนจริง ยิ่งพื้นที่รับน้ำมาก รางต้องใหญ่ขึ้นและต้องมีท่อลงมากขึ้นเพื่อไม่ให้น้ำล้นรางตอนฝนตกหนัก",
      steps: [
        { label: "พื้นที่รับน้ำ", expr: "พื้นที่ผิวหลังคาจริงตามความชัน", subst: `${fmt(area, 1)} ตร.ม.` },
        { label: "เลือกขนาดราง", expr: "<50→100มม. · <120→125มม. · ≥120→150มม.", subst: `${fmt(area, 1)} ตร.ม. → ราง ${gutterMm} มม.` },
        { label: "จำนวนท่อลง", expr: "ปัดขึ้น(พื้นที่ ÷ 50)", subst: `${fmt(area, 1)} ÷ 50 = ${down} เส้น` },
      ],
      assumptions: ["คิดจากปริมาณฝนไทยทั่วไป (ไม่ใช่พื้นที่ฝนตกหนักเป็นพิเศษ) พื้นที่รับน้ำต่อท่อลง ~50 ตร.ม."],
      caveats: [
        "พื้นที่ที่ฝนตกหนักจัด (ภาคใต้/ช่วงมรสุม) ควรลดพื้นที่ต่อท่อลงเหลือ 35–40 ตร.ม. หรือเพิ่มขนาดรางขึ้นหนึ่งขั้น",
        "มุมบ้านและจุดรับน้ำจากหลังคาหลายด้านต้องเพิ่มท่อลงเฉพาะจุดแม้พื้นที่รวมยังไม่เข้าเกณฑ์",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวทาง SMACNA Architectural Sheet Metal Manual (Gutter & Downspout Sizing)" }],
    },
  });
}

export function calcRidge(v: Values) {
  const bad = guardTool(roofTools, "ridge", v);
  if (bad) return bad;
  const ridge = num(v, "ridge", 12);
  const hips = num(v, "hips", 4);
  const hipLen = num(v, "hipLen", 6);
  const hipTotal = hips * hipLen;
  const cap = ridge + hipTotal;
  const pcs = ceil(cap / 2);

  return resultX({
    title: "สันครอบ + ตะเข้สัน",
    headline: `สัน+ตะเข้ ${fmt(cap, 1)} ม.`,
    chart: {
      kind: "stack",
      parts: [
        { label: "สันหลังคา", value: ridge, display: `${fmt(ridge, 1)} ม.`, tone: "accent" },
        { label: "ตะเข้สัน", value: hipTotal, display: `${fmt(hipTotal, 1)} ม.`, tone: "mute" },
      ],
      totalLabel: "ครอบรวม",
      totalDisplay: `${fmt(cap, 1)} ม.`,
    },
    rows: [
      { label: "สันหลังคา", value: `${fmt(ridge, 1)} ม.` },
      { label: "ตะเข้สัน", value: `${fmt(hipTotal, 1)} ม.` },
      { label: "ครอบรวม", value: `${fmt(cap, 1)} ม.`, emphasize: true },
      { label: "เส้น 2 ม.", value: `${pcs} เส้น` },
    ],
    tip: "ตะเข้ราง (valley) คิดคนละรายการ อย่าลืมแผ่นบัวชายคา",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "ความยาวครอบรวม = ความยาวสันหลังคา (ridge) + ความยาวตะเข้สันทั้งหมด (hip) แล้วหารด้วยความยาวครอบมาตรฐาน 2 ม. ปัดขึ้น",
      steps: [
        { label: "ความยาวตะเข้สันรวม", expr: "จำนวนตะเข้ × ยาว/เส้น", subst: `${fmt(hips)} × ${fmt(hipLen, 1)} = ${fmt(hipTotal, 1)} ม.` },
        { label: "ครอบรวม", expr: "สัน + ตะเข้สันรวม", subst: `${fmt(ridge, 1)} + ${fmt(hipTotal, 1)} = ${fmt(cap, 1)} ม.` },
        { label: "จำนวนเส้นครอบ", expr: "ปัดขึ้น(ครอบรวม ÷ 2)", subst: `${fmt(cap, 1)} ÷ 2 = ${pcs} เส้น` },
      ],
      assumptions: ["ครอบสันมาตรฐานความยาวเส้นละ 2 ม. (ตามสเปกกระเบื้อง/เมทัลชีทส่วนใหญ่)"],
      caveats: ["ตะเข้ราง (valley) ที่รับน้ำฝนไหลรวมต้องนับแยกเป็นรายการวัสดุกันซึม/แผ่นรองตะเข้รางเพิ่มเติม ไม่รวมในตัวเลขนี้"],
      refs: [{ label: "แนวปฏิบัติงานติดตั้งครอบสันหลังคา (Ridge & Hip Cap Installation)" }],
    },
  });
}

export function calcFastener(v: Values) {
  const bad = guard("fastener", v);
  if (bad) return bad;
  const area = trueRoofArea(num(v, "w", 8) * num(v, "l", 12), pitchPercent(v)) * (1 + num(v, "waste", WASTE_DEFAULT.value) / 100);
  const zone = str(v, "zone", "mid");
  const per = zone === "edge" ? 10 : zone === "coast" ? 12 : 6;
  const n = ceil(area * per);
  const boxes = ceil(n / 250);
  const lastUsed = (n - (boxes - 1) * 250) / 250;

  return resultX({
    title: "สกรูยึดหลังคา",
    headline: `${fmt(n)} ตัว`,
    chart: {
      kind: "packs",
      unitLabel: "กล่อง 250 ตัว",
      count: boxes,
      lastUsed,
      note: `${zone === "coast" ? "โซนชายทะเล" : zone === "edge" ? "ชายคา/มุม" : "กลางหลังคา"} · ${per} ตัว/ตร.ม.`,
    },
    rows: [
      { label: "โซนลม", value: zone === "coast" ? "ชายทะเล" : zone === "edge" ? "ชายคา/มุม" : "กลางหลังคา" },
      { label: "สกรู/ตร.ม.", value: `${per}` },
      { label: "จำนวนสกรู", value: `${fmt(n)} ตัว`, emphasize: true },
      { label: "กล่อง 250", value: `${boxes} กล่อง` },
    ],
    tip: "มุมและชายคาใส่ถี่กว่ากลางหลังคา อย่าใช้ตะปูกับเมทัลชีท",
    explain: {
      risk: "B",
      updatedAt: "2026-08-21",
      summary: "จำนวนสกรูยึดหลังคาแปรผันตามความเสี่ยงแรงลมของแต่ละโซน — กลางหลังคาใส่ห่างได้ แต่ชายคา มุม และพื้นที่ชายทะเลที่ลมกระโชกแรง ต้องใส่ถี่ขึ้นตามอัตราส่วน",
      steps: [
        { label: "เลือกอัตราสกรู/ตร.ม. ตามโซน", expr: "กลาง 6 · ชายคา/มุม 10 · ชายทะเล 12", subst: `โซนที่เลือก → ${per} ตัว/ตร.ม.` },
        { label: "จำนวนสกรูรวม", expr: "พื้นที่รวมเผื่อ × อัตรา/ตร.ม.", subst: `${fmt(area, 1)} × ${per} = ${fmt(n)} ตัว` },
        { label: "จำนวนกล่อง", expr: "ปัดขึ้น(สกรู ÷ 250)", subst: `${fmt(n)} ÷ 250 = ${boxes} กล่อง` },
      ],
      assumptions: ["อัตราสกรูต่อตารางเมตรเป็นค่าประมาณเดียวทั้งพื้นที่โซนนั้น ไม่ได้แยกจุดยึดตามแนวคานเฉพาะ"],
      caveats: [
        "พื้นที่ที่ต้องออกแบบตามมาตรฐานลม (เช่น ตึกสูง ริมทะเล พื้นที่พายุ) ควรให้วิศวกรกำหนดระยะยึดจากค่าแรงลมออกแบบจริง ไม่ใช่ใช้อัตราประมาณนี้",
        "เมทัลชีทต้องใช้สกรูหัวเจาะพร้อมยางกันรั่วเฉพาะ ห้ามใช้ตะปูหรือสกรูไม่มียางเพราะรูจะรั่วซึมภายหลัง",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวปฏิบัติงานยึดแผ่นหลังคาตามโซนแรงลม (Wind Zone Fastening Pattern)" }],
    },
  });
}

const metalFields = [
  {
    type: "select" as const,
    key: "shape",
    label: "ทรงหลังคา",
    default: "gable",
    options: [
      { value: "gable", label: "จั่ว 2 ด้าน" },
      { value: "lean", label: "เพิงหมาแหงน (ลาดทางเดียว)" },
    ],
    when: { key: "kind", is: "metal" },
  },
  { type: "number" as const, key: "coverW", label: "กว้างคลุม (เมทัล)", unit: "ม.", default: 0.7, min: 0.3, max: 1.5, step: 0.01, when: { key: "kind", is: "metal" } },
  { type: "number" as const, key: "sheetLen", label: "ยาวแผ่น", unit: "ม.", default: 6, min: 1, max: 12, step: 0.1, when: { key: "kind", is: "metal" } },
];

const roof = [
  { type: "number" as const, key: "w", label: "กว้างแปลน (แนวลาด)", unit: "ม.", default: 8, min: 2, max: 100, step: 0.1 },
  { type: "number" as const, key: "l", label: "ยาวแปลน (แนวสัน)", unit: "ม.", default: 12, min: 2, max: 100, step: 0.1 },
  {
    type: "select" as const,
    key: "pitchUnit",
    label: "หน่วยความชัน",
    default: "pct",
    options: [
      { value: "pct", label: "เปอร์เซ็นต์ (30% ≈ 17°)" },
      { value: "deg", label: "องศา (17° ≈ 30%)" },
    ],
  },
  { type: "number" as const, key: "pitch", label: "ความชัน", default: 30, min: 2, max: 173 },
  { type: "number" as const, key: "waste", label: "เผื่อเสีย/ซ้อนทับ", unit: "%", default: 10, min: 0, max: 25 },
];

export const roofTools: ToolDef[] = [
  { id: "area", name: "พื้นที่หลังคาจริง", blurb: "ตามความชัน + เผื่อเสีย", fields: roof, calc: calcRoofArea },
  {
    id: "material",
    name: "จำนวนแผ่นหลังคา",
    blurb: "เมทัลชีท / กระเบื้อง",
    fields: [
      ...roof,
      {
        type: "select",
        key: "kind",
        label: "วัสดุ",
        default: "metal",
        options: [
          { value: "metal", label: "เมทัลชีท" },
          { value: "tile", label: "กระเบื้องลอน" },
        ],
      },
      ...metalFields,
      { type: "number", key: "perM2", label: "แผ่นกระเบื้อง/ตร.ม.", default: 10, min: 3, max: 150, when: { key: "kind", is: "tile" } },
    ],
    calc: calcRoofMaterial,
  },
  { id: "gutter", name: "ขนาดรางน้ำ + ท่อ", blurb: "ตามพื้นที่รับน้ำ", fields: roof, calc: calcGutter },
  {
    id: "ridge",
    name: "สันครอบ + ตะเข้สัน",
    blurb: "ความยาวครอบ",
    fields: [
      { type: "number", key: "ridge", label: "ยาวสัน", unit: "ม.", default: 12, min: 0, max: 500, step: 0.1 },
      { type: "number", key: "hips", label: "จำนวนตะเข้สัน", unit: "เส้น", default: 4, min: 0, max: 20 },
      { type: "number", key: "hipLen", label: "ยาวตะเข้/เส้น", unit: "ม.", default: 6, min: 0, max: 50, step: 0.1 },
    ],
    calc: calcRidge,
  },
  {
    id: "fastener",
    name: "สกรูยึดหลังคา",
    blurb: "ตามโซนแรงลม",
    fields: [
      ...roof,
      {
        type: "select",
        key: "zone",
        label: "โซน",
        default: "mid",
        options: [
          { value: "mid", label: "กลางหลังคา" },
          { value: "edge", label: "ชายคา / มุม" },
          { value: "coast", label: "ชายทะเล" },
        ],
      },
    ],
    calc: calcFastener,
  },
];

export const roofJob: JobDef = {
  name: "คิดทั้งงานหลังคา",
  blurb: "แปลนครั้งเดียว ได้พื้นที่ แผ่น ราง สกรู",
  fields: [
    ...roof,
    {
      type: "select",
      key: "kind",
      label: "วัสดุ",
      default: "metal",
      options: [
        { value: "metal", label: "เมทัลชีท" },
        { value: "tile", label: "กระเบื้อง" },
      ],
    },
    ...metalFields,
    { type: "number", key: "ridge", label: "ยาวสัน", unit: "ม.", default: 12, min: 0, max: 500, step: 0.1 },
    { type: "number", key: "hips", label: "ตะเข้สัน", unit: "เส้น", default: 0, min: 0, max: 20 },
    { type: "number", key: "hipLen", label: "ยาวตะเข้/เส้น", unit: "ม.", default: 6, min: 0, max: 50, step: 0.1 },
  ],
  calc: (input) => {
    const bad = guardInputs(roofJob.fields, input);
    if (bad) return bad;
    const v = withDefaults(roofJob.fields, input);
    const area = calcRoofArea(v);
    const mat = calcRoofMaterial(v);
    const gutter = calcGutter(v);
    const ridge = calcRidge(v);
    const fast = calcFastener({ ...v, zone: "mid" });
    return jobFromParts({
      title: "งานหลังคาทั้งหลัง",
      headline: mat.headline ?? "งานหลังคา",
      rows: [
        ...area.rows.filter((r) => r.emphasize || r.label.includes("เผื่อ")),
        ...mat.rows.filter((r) => r.emphasize),
        ...gutter.rows.filter((r) => r.emphasize || r.label === "ท่อลง"),
        ...ridge.rows.filter((r) => r.emphasize),
        ...fast.rows.filter((r) => r.emphasize),
      ],
      tip: "หลังคาปั้นหยายังต้องนับตะเข้รางและแผ่นจั่วเพิ่ม",
      parts: [area, mat, gutter, ridge, fast],
    });
  },
};
