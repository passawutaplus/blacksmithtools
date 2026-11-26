import type { JobDef, ToolDef, Values } from "../types";
import { blockedResult, ceil, fmt, fmtTrim, guardInputs, guardTool, jobFromParts, num, resultX, round, stockPieces, str, withDefaults } from "../math";
import { DISCLAIMER_AB, ROOF, ROOF_KIT, UNIT, WASTE_DEFAULT } from "../constants";

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

/** วัสดุมุง: cut = เมทัลชีทสั่งตัดตามยาว · metal = เมทัลชีทแผ่นยาวสำเร็จ · tile = กระเบื้องคอนกรีต · roman = ลอนคู่ */
function isMetal(kind: string) {
  return kind === "cut" || kind === "metal";
}

/** คำเตือนความชันต่ำกว่าที่วัสดุมุงทั่วไปรับได้ — เป็นแนวทางทั่วไป ไม่ใช่ข้อกำหนด */
export function pitchWarning(kind: string, pitchPct: number): string | null {
  const ref = isMetal(kind) ? ROOF.minPitchMetal : kind === "roman" ? ROOF.minPitchRoman : ROOF.minPitchTile;
  const name = isMetal(kind) ? "เมทัลชีท" : kind === "roman" ? "กระเบื้องลอนคู่" : "กระเบื้องคอนกรีต";
  const deg = pitchDegrees(pitchPct);
  if (deg >= ref.value - 1e-9) return null;
  return `ชัน ${fmt(deg, 1)}° ค่อนข้างต่ำสำหรับ${name} (ทั่วไปแนะนำราว ${fmt(ref.value)}° ขึ้นไป) เสี่ยงน้ำย้อนรอยซ้อน — เช็กคู่มือรุ่นที่ใช้ก่อนมุง`;
}

/**
 * เรขาคณิตเมทัลชีทตามแถว — ใช้ร่วมกันระหว่าง "จำนวนแผ่นหลังคา" กับ "เมทัลชีทสั่งตัด + แป"
 * ยาวแนวลาดต่อด้าน = (กว้างแปลน ÷ ด้าน + ชายคายื่น) × √(1 + ชัน²) · แถว = ปัดขึ้น(ยาวแปลน ÷ กว้างคลุม)
 */
export function metalLayout(v: Values, coverDefault: number, eaveDefault = 0) {
  const w = num(v, "w", 8);
  const l = num(v, "l", 12);
  const pitch = pitchPercent(v);
  const lean = str(v, "shape", "gable") === "lean";
  const sides = lean ? 1 : 2;
  const coverW = num(v, "coverW", coverDefault);
  const eave = num(v, "eave", eaveDefault);
  const run = w / sides + eave;
  const slopeLen = run * Math.sqrt(1 + (pitch / 100) ** 2);
  const rows = ceil(l / coverW);
  // สั่งตัดปัดขึ้นเป็นเซนติเมตร
  const cutLen = Math.ceil(slopeLen * 100 - 1e-6) / 100;
  return { w, l, pitch, lean, sides, coverW, eave, run, slopeLen, rows, cutLen };
}

export function calcRoofMaterial(v: Values) {
  const bad = guard("material", v);
  if (bad) return bad;
  const kind = str(v, "kind", "cut");
  const pitchWarn = pitchWarning(kind, pitchPercent(v));
  const warnRow = pitchWarn ? [{ label: "เตือนความชัน", value: pitchWarn, emphasize: true }] : [];
  const warnCaveat = pitchWarn ? [pitchWarn] : [];
  if (!isMetal(kind)) {
    const area = trueRoofArea(num(v, "w", 8) * num(v, "l", 12), pitchPercent(v)) * (1 + num(v, "waste", WASTE_DEFAULT.value) / 100);
    const roman = kind === "roman";
    const perM2 = roman ? num(v, "perM2Roman", ROOF.romanPerM2.value) : num(v, "perM2", ROOF.tilePerM2.value);
    const tileName = roman ? "กระเบื้องลอนคู่" : "กระเบื้องคอนกรีต";
    const need = area * perM2;
    const n = ceil(need);
    return resultX({
      title: "จำนวนแผ่นหลังคา",
      headline: pitchWarn ? `${fmt(n)} แผ่น${tileName} — ชันต่ำ เช็กคู่มือก่อน` : `${fmt(n)} แผ่น${tileName}`,
      chart: {
        kind: "packs",
        unitLabel: "แผ่น",
        count: n,
        lastUsed: need - Math.floor(need) || 1,
        note: `พื้นที่รวมเผื่อ ${fmt(area, 1)} ตร.ม. × ${fmtTrim(perM2, 2)} แผ่น/ตร.ม.`,
      },
      rows: [
        { label: "พื้นที่รวมเผื่อ", value: `${fmt(area, 1)} ตร.ม.` },
        { label: "อัตราที่ใช้", value: `${fmtTrim(perM2, 2)} แผ่น/ตร.ม. (${tileName})` },
        { label: `แผ่น${tileName}`, value: `${fmt(n)} แผ่น`, emphasize: true },
        ...warnRow,
      ],
      tip: "แผ่นต่อ ตร.ม. ต่างกันตามรุ่นและระยะแป ดูสเปกรุ่นที่ซื้อแล้วแก้ช่องนี้ ครอบสันและตะเข้นับแยก",
      explain: {
        risk: "B",
        updatedAt: "2026-11-25",
        summary: "จำนวนแผ่นกระเบื้องหลังคา = พื้นที่หลังคาจริง (รวมเผื่อ) × อัตราแผ่นต่อตารางเมตรของกระเบื้องรุ่นนั้น",
        steps: [{ label: "จำนวนแผ่น", expr: "ปัดขึ้น(พื้นที่ × แผ่น/ตร.ม.)", subst: `${fmt(area, 1)} × ${fmtTrim(perM2, 2)} = ${fmt(n)} แผ่น` }],
        constants: [roman ? ROOF.romanPerM2 : ROOF.tilePerM2, roman ? ROOF.minPitchRoman : ROOF.minPitchTile],
        assumptions: ["อัตราแผ่น/ตร.ม. เป็นค่าจากสเปกผู้ผลิตกระเบื้องแต่ละรุ่น (ขึ้นกับขนาดแผ่นและระยะซ้อนทับ/แนวตะปู) ค่าตั้งต้นเป็นค่าประมาณ แก้ได้"],
        caveats: [...warnCaveat, "ยังไม่รวมครอบสัน ครอบตะเข้ และแผ่นกันลมที่ต้องนับแยกตามความยาวจริง", DISCLAIMER_AB],
        refs: [{ label: "สเปกกระเบื้องหลังคาคอนกรีต/ลอนคู่ตามผู้ผลิต (แผ่น/ตร.ม. และความชันต่ำสุด)" }],
      },
    });
  }
  // เมทัลชีทนับเป็น "แถว" ตามแนวชายคา × จำนวนแผ่นต่อแถวตามแนวลาด — หารพื้นที่ตรง ๆ จะได้แผ่นน้อยเกินจริง
  // เพราะเศษปลายแผ่นเอาไปต่อแถวอื่นไม่ได้ (รอยต่อกลางลาดต้องซ้อนและรั่วง่าย)
  const { w, l, pitch, lean, sides, coverW, eave, slopeLen, rows, cutLen } = metalLayout(v, 0.7);
  const shapeName = lean ? "เพิงหมาแหงน (ลาดทางเดียว)" : "จั่ว 2 ด้าน";
  const slopeStep = {
    label: "ยาวแนวลาดต่อด้าน",
    expr: lean ? "(กว้างแปลน + ชายคายื่น) × √(1 + (ชัน/100)²)" : "(กว้างแปลน ÷ 2 + ชายคายื่น) × √(1 + (ชัน/100)²)",
    subst: `(${fmt(w / sides, 2)} + ${fmt(eave, 2)}) × √(1 + ${fmt(pitch / 100, 2)}²) = ${fmt(slopeLen, 2)} ม.`,
  };
  const rowStep = { label: "จำนวนแถวต่อด้าน", expr: "ปัดขึ้น(ยาวแปลน ÷ กว้างคลุม)", subst: `${fmt(l, 1)} ÷ ${fmt(coverW, 2)} → ${rows} แถว` };
  const assumptions = [
    "ด้านกว้างแปลนคือด้านที่น้ำไหลลง (แนวลาด) ด้านยาวแปลนคือแนวสัน/ชายคา",
    eave > 0
      ? `บวกชายคายื่น ${fmt(eave, 2)} ม. ต่อด้านรับน้ำเข้ากับแนวลาดแล้ว — ถ้าแปลนที่กรอกรวมชายคาอยู่แล้วให้ใส่ 0`
      : "ถือว่าขนาดแปลนรวมชายคายื่นแล้ว (ช่องชายคายื่น = 0) ถ้าแปลนเป็นแนวเสา/ผนัง ให้ใส่ระยะชายคายื่นเพิ่ม",
    "ความกว้างคลุมที่กรอกคือความกว้างใช้งานจริงหลังซ้อนทับลอนข้าง (effective coverage) ไม่ใช่ความกว้างเต็มแผ่นก่อนซ้อน",
  ];

  if (kind === "cut") {
    // สั่งตัดตามยาวแนวลาด: ได้แผ่นยาวถึงสันพอดี ไม่มีเศษปลายแผ่น จึงไม่คูณเผื่อเสีย
    const sheets = sides * rows;
    const long = cutLen > ROOF.longSheetWarn.value;
    return resultX({
      title: "จำนวนแผ่นหลังคา",
      headline: `สั่งตัดยาว ${fmt(cutLen, 2)} ม. × ${fmt(sheets)} แผ่น`,
      chart: {
        kind: "stack",
        parts: Array.from({ length: sides }, (_, i) => ({
          label: sides === 1 ? `ลาดทางเดียว ${rows} แถว` : `ด้านที่ ${i + 1} · ${rows} แถว`,
          value: rows,
          display: `${rows} แผ่น`,
          tone: "accent" as const,
        })),
        totalLabel: `แผ่นคลุม ${fmt(coverW, 2)} ม. ยาว ${fmt(cutLen, 2)} ม.`,
        totalDisplay: `${fmt(sheets)} แผ่น`,
      },
      rows: [
        { label: "ทรงหลังคา", value: shapeName },
        { label: "ยาวแนวลาดต่อด้าน", value: `${fmt(slopeLen, 2)} ม.${eave > 0 ? ` (รวมชายคายื่น ${fmt(eave, 2)} ม.)` : ""}` },
        { label: "แถวตามแนวชายคา", value: `${rows} แถว/ด้าน (คลุมแผ่นละ ${fmt(coverW, 2)} ม.)` },
        { label: "สั่งตัดยาว", value: `${fmt(cutLen, 2)} ม./แผ่น`, emphasize: true },
        { label: "จำนวนแผ่น (สั่งตัด ไม่เผื่อเสีย)", value: `${fmt(sheets)} แผ่น`, emphasize: true },
        { label: "ความยาวรวมที่สั่ง", value: `${fmt(cutLen * sheets, 1)} ม.` },
        ...(long
          ? [{ label: "แผ่นยาวมาก", value: `ยาวเกิน ${fmt(ROOF.longSheetWarn.value)} ม. ถามโรงรีดเรื่องขนส่งก่อน หรือเปลี่ยนเป็นแผ่นสำเร็จต่อซ้อนปลาย`, emphasize: true }]
          : []),
        ...warnRow,
      ],
      tip: "แผ่นสั่งตัดยาวถึงสันพอดี ไม่มีเศษจึงไม่เผื่อเสีย ถ้ากลัวแผ่นบุบตอนขนให้สั่งเกิน 1–2 แผ่นเอง",
      explain: {
        risk: "B",
        updatedAt: "2026-11-25",
        summary: "เมทัลชีทสั่งตัด: ยาวแผ่น = ยาวแนวลาด (รวมชายคายื่น) · จำนวนแผ่น = จำนวนด้าน × ปัดขึ้น(ยาวชายคา ÷ ความกว้างคลุม) — ไม่คูณเผื่อเสียเพราะไม่มีเศษปลายแผ่น",
        steps: [
          slopeStep,
          { label: "ยาวที่สั่งตัด", expr: "ปัดขึ้นเป็นเซนติเมตร", subst: `${fmt(slopeLen, 3)} → ${fmt(cutLen, 2)} ม.` },
          rowStep,
          { label: "จำนวนแผ่นรวม", expr: "ด้าน × แถว", subst: `${sides} × ${rows} = ${fmt(sheets)} แผ่น` },
        ],
        constants: [ROOF.minPitchMetal, ROOF.longSheetWarn],
        assumptions,
        caveats: [
          ...warnCaveat,
          "หลังคาปั้นหยาหรือมีตะเข้ แผ่นต้องตัดเฉียง จำนวนและความยาวจริงต่างจากนี้ ให้นับจากแบบ",
          "ยังไม่รวมระยะยื่นเลยแปตัวสุดท้ายลงรางน้ำ ถ้าต้องการให้บวกเพิ่มในช่องชายคายื่น",
          DISCLAIMER_AB,
        ],
        refs: [{ label: "คู่มือติดตั้งเมทัลชีทของผู้ผลิต (ความกว้างคลุมจริงและความชันต่ำสุด)" }],
      },
    });
  }

  const wastePct = num(v, "waste", WASTE_DEFAULT.value);
  const len = num(v, "sheetLen", 6);
  const lap = ROOF.endLap.value;
  const perRun = slopeLen <= len ? 1 : ceil((slopeLen - lap) / (len - lap));
  const base = sides * rows * perRun;
  const sheets = ceil(base * (1 + wastePct / 100));
  const spare = sheets - base;

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
      { label: "ยาวแนวลาดต่อด้าน", value: `${fmt(slopeLen, 2)} ม.${eave > 0 ? ` (รวมชายคายื่น ${fmt(eave, 2)} ม.)` : ""}` },
      { label: "แถวตามแนวชายคา", value: `${rows} แถว/ด้าน (คลุมแผ่นละ ${fmt(coverW, 2)} ม.)` },
      {
        label: "แผ่นต่อแถว",
        value: perRun === 1 ? `1 แผ่น (แผ่นยาว ${fmt(len, 1)} ม. ถึงสัน)` : `${perRun} แผ่น ต่อซ้อนปลาย ${fmt(lap * 100)} ซม.`,
      },
      { label: "นับตามแถว", value: `${base} แผ่น` },
      { label: `จำนวนแผ่น (เผื่อ ${fmt(wastePct)}%)`, value: `${sheets} แผ่น`, emphasize: true },
      ...warnRow,
    ],
    tip:
      perRun === 1
        ? `สั่งตัดยาว ${fmt(Math.ceil(slopeLen * 10) / 10, 1)} ม. ตามแนวลาดได้ จะไม่เหลือเศษปลายแผ่น`
        : "แนวลาดยาวกว่าแผ่น ต้องต่อซ้อนปลาย ถ้าสั่งแผ่นยาวถึงสันได้จะรั่วยากกว่า",
    explain: {
      risk: "B",
      updatedAt: "2026-11-25",
      summary:
        "เมทัลชีทนับเป็นแถว: จำนวนแถว = ยาวชายคา ÷ ความกว้างคลุม (ปัดขึ้น) × จำนวนแผ่นต่อแถวตามแนวลาด × จำนวนด้าน แล้วเผื่อเสีย — ไม่ใช้วิธีหารพื้นที่ เพราะเศษปลายแผ่นใช้ต่อไม่ได้",
      steps: [
        slopeStep,
        rowStep,
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
      constants: [ROOF.endLap, ROOF.minPitchMetal],
      assumptions,
      caveats: [
        ...warnCaveat,
        "หลังคาปั้นหยาหรือมีตะเข้ แผ่นต้องตัดเฉียง จำนวนจริงมากกว่านี้ ให้นับจากแบบ",
        "แผ่นสั่งตัดยาวพิเศษราคาต่อแผ่นสูงขึ้น ควรเทียบราคากับแผ่นยาวมาตรฐาน + ต่อแนวก่อนสั่ง",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "คู่มือติดตั้งเมทัลชีทของผู้ผลิต (ความกว้างคลุมจริงและระยะซ้อนปลายแผ่น)" }],
    },
  });
}

/** ขนาดเรียกเป็นนิ้วของราง/ท่อ (มม. → นิ้วใกล้สุด) ใช้คู่กับ มม. เพราะร้านเรียกเป็นนิ้ว */
function inchName(mm: number): string {
  return `${fmt(Math.round(mm / UNIT.inch.value))} นิ้ว`;
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
    headline: `ราง ${gutterMm} มม. (${inchName(gutterMm)}) · ท่อลง ${down} เส้น`,
    chart: {
      kind: "threshold",
      unit: "ตร.ม.",
      value: round(area, 1),
      max: chartMax,
      zones: [
        { upTo: 50, tone: "good", label: "ราง 100 มม. (4 นิ้ว)" },
        { upTo: 120, tone: "warn", label: "ราง 125 มม. (5 นิ้ว)" },
        { upTo: chartMax, tone: "bad", label: "ราง 150 มม. (6 นิ้ว)" },
      ],
    },
    rows: [
      { label: "พื้นที่รับน้ำ", value: `${fmt(area, 1)} ตร.ม.` },
      { label: "รางน้ำ", value: `${gutterMm} มม. (${inchName(gutterMm)})`, emphasize: true },
      { label: "ท่อลง", value: `${down} เส้น Ø ${downDia} มม. (${inchName(downDia)})` },
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

/* ─────────── เมทัลชีทสั่งตัด + แป (ใบสั่งของ) ─────────── */

/** ชายคายื่นตั้งต้นของเครื่องมือเมทัลชีท + แป (ค่าตั้งต้นของช่องกรอก ไม่ใช่ค่าคำนวณ — ผู้ใช้แก้ได้) */
const METAL_KIT_EAVE = 0.5;

export function calcMetalKit(v: Values) {
  const bad = guard("metal-kit", v);
  if (bad) return bad;
  const g = metalLayout(v, ROOF_KIT.coverW.value, METAL_KIT_EAVE);
  const spacing = num(v, "spacing", ROOF_KIT.purlinSpacing.value);
  const warn = pitchWarning("cut", g.pitch);
  const sheets = g.sides * g.rows;
  // แปตัวแรกที่ปลายชายคา ตัวสุดท้ายชิดสัน — ช่วงแนวลาดแบ่งเป็นช่องไม่เกินระยะแป
  const lines = ceil(g.slopeLen / spacing) + 1;
  const totalLines = lines * g.sides;
  const stock = ROOF_KIT.purlinStock.value;
  const sticksPerLine = ceil(g.l / stock);
  const purlinSticks = totalLines * sticksPerLine;
  const perSheetLine = ROOF_KIT.screwsPerSheetPerPurlin.value;
  const screws = sheets * lines * perSheetLine;
  const boxes = ceil(screws / ROOF_KIT.screwBox.value);
  const ridge = g.lean ? null : calcRidge({ ridge: g.l, hips: 0, hipLen: 0 });
  const ridgePcs = ridge?.rows.find((r) => r.label === "เส้น 2 ม.")?.value ?? "";
  const trimLen = ROOF_KIT.trimLen.value;
  const sideTrimM = 2 * g.sides * g.slopeLen;
  const sideTrim = stockPieces(sideTrimM, trimLen, "ท่อน");
  const wallTrim = g.lean ? stockPieces(g.l, trimLen, "ท่อน") : null;
  const long = g.cutLen > ROOF.longSheetWarn.value;
  const wide = spacing > ROOF_KIT.purlinSpacingWarn.value + 1e-9;
  const shapeName = g.lean ? "เพิงหมาแหงน (ลาดทางเดียว)" : "หน้าจั่ว 2 ด้าน";
  const perSide = g.lean ? "" : ` (ด้านละ ${fmt(g.rows)} แผ่น)`;

  return resultX({
    title: "เมทัลชีทสั่งตัด + แป",
    headline: warn ? `สั่งตัดยาว ${fmt(g.cutLen, 2)} ม. × ${fmt(sheets)} แผ่น — ชันต่ำ เช็กคู่มือก่อน` : `สั่งตัดยาว ${fmt(g.cutLen, 2)} ม. × ${fmt(sheets)} แผ่น`,
    chart: {
      kind: "stack",
      parts: Array.from({ length: g.sides }, (_, i) => ({
        label: g.sides === 1 ? `ลาดทางเดียว ${g.rows} แถว` : `ด้านที่ ${i + 1} · ${g.rows} แถว`,
        value: g.rows,
        display: `${g.rows} แผ่น`,
        tone: "accent" as const,
      })),
      totalLabel: `แผ่นคลุม ${fmtTrim(g.coverW, 2)} ม. ยาว ${fmt(g.cutLen, 2)} ม.`,
      totalDisplay: `${fmt(sheets)} แผ่น`,
    },
    rows: [
      { label: "ทรงหลังคา", value: `${shapeName} · ชัน ${fmt(g.pitch, 1)}% ≈ ${fmt(pitchDegrees(g.pitch), 1)}°` },
      { label: "ยาวแนวลาดต่อด้าน", value: `${fmt(g.slopeLen, 2)} ม.${g.eave > 0 ? ` (รวมชายคายื่น ${fmtTrim(g.eave, 2)} ม.)` : ""}` },
      { label: "เมทัลชีทสั่งตัด", value: `ยาว ${fmt(g.cutLen, 2)} ม. × ${fmt(sheets)} แผ่น${perSide}`, emphasize: true },
      {
        label: `แป ระยะ ${fmtTrim(spacing, 2)} ม.`,
        value: `${fmt(lines)} แนว/ด้าน × ${fmt(g.sides)} ด้าน = ${fmt(totalLines)} แนว ยาวแนวละ ${fmtTrim(g.l, 2)} ม.`,
      },
      { label: "เหล็กแป", value: `${fmt(purlinSticks)} เส้น (เส้นละ ${fmtTrim(stock, 1)} ม. · แนวละ ${fmt(sticksPerLine)} เส้น)`, emphasize: true },
      { label: "สกรูยึดแผ่น", value: `${fmt(screws)} ตัว → ${fmt(boxes)} กล่อง (${fmt(ROOF_KIT.screwBox.value)} ตัว)`, emphasize: true },
      ...(ridge ? [{ label: "ครอบสัน", value: `${fmtTrim(g.l, 2)} ม. → ${ridgePcs}` }] : []),
      { label: "ครอบข้าง/ปั้นลม (ขอบหัว-ท้าย 2 ข้าง)", value: `${fmt(sideTrimM, 1)} ม. → ${sideTrim.text}` },
      ...(wallTrim ? [{ label: "แผ่นปิดชนผนัง (ด้านบน)", value: `${fmtTrim(g.l, 2)} ม. → ${wallTrim.text}` }] : []),
      ...(warn ? [{ label: "เตือนความชัน", value: warn, emphasize: true }] : []),
      ...(wide
        ? [{ label: "แปห่าง", value: `เกิน ${fmtTrim(ROOF_KIT.purlinSpacingWarn.value, 1)} ม. เช็กตารางช่วงพาดของแผ่นรุ่นที่สั่ง แผ่นบางอาจยุบเวลาเหยียบ`, emphasize: true }]
        : []),
      ...(long ? [{ label: "แผ่นยาวมาก", value: `ยาวเกิน ${fmt(ROOF.longSheetWarn.value)} ม. ถามโรงรีดเรื่องขนส่งก่อน`, emphasize: true }] : []),
    ],
    tip: "แผ่นสั่งตัดไม่มีเศษจึงไม่เผื่อเสีย กลัวบุบตอนขนให้สั่งเกินเอง 1–2 แผ่น · ชายคาและสันยิงสกรูถี่กว่ากลางหลังคา",
    explain: {
      risk: "B",
      updatedAt: "2026-11-25",
      summary:
        "แผ่นสั่งตัดยาวตามแนวลาด × จำนวนแถว · แปวางทุกระยะที่กรอกจากชายคาถึงสัน แนวละยาวเท่าแนวสัน · สกรู = แผ่น × แนวแปต่อด้าน × ตัวต่อแผ่นต่อแป",
      steps: [
        {
          label: "ยาวแนวลาดต่อด้าน",
          expr: g.lean ? "(กว้างแปลน + ชายคายื่น) × √(1 + (ชัน/100)²)" : "(กว้างแปลน ÷ 2 + ชายคายื่น) × √(1 + (ชัน/100)²)",
          subst: `(${fmt(g.w / g.sides, 2)} + ${fmt(g.eave, 2)}) × √(1 + ${fmt(g.pitch / 100, 2)}²) = ${fmt(g.slopeLen, 2)} ม. → สั่งตัด ${fmt(g.cutLen, 2)} ม.`,
        },
        { label: "จำนวนแผ่น", expr: "ด้าน × ปัดขึ้น(ยาวแปลน ÷ กว้างคลุม)", subst: `${g.sides} × ปัดขึ้น(${fmtTrim(g.l, 2)} ÷ ${fmtTrim(g.coverW, 2)}) = ${g.sides} × ${g.rows} = ${fmt(sheets)} แผ่น` },
        { label: "แนวแปต่อด้าน", expr: "ปัดขึ้น(ยาวแนวลาด ÷ ระยะแป) + 1", subst: `ปัดขึ้น(${fmt(g.slopeLen, 2)} ÷ ${fmtTrim(spacing, 2)}) + 1 = ${fmt(lines)} แนว` },
        {
          label: "เหล็กแป",
          expr: `แนวรวม × ปัดขึ้น(ยาวแนว ÷ ${fmtTrim(stock, 1)} ม.)`,
          subst: `${fmt(totalLines)} × ${fmt(sticksPerLine)} = ${fmt(purlinSticks)} เส้น`,
          note: "ต่อแปกลางแนวต้องต่อบนจันทัน เศษข้ามแนวจึงไม่นับรวม",
        },
        { label: "สกรู", expr: `แผ่น × แนวแปต่อด้าน × ${fmt(perSheetLine)}`, subst: `${fmt(sheets)} × ${fmt(lines)} × ${fmt(perSheetLine)} = ${fmt(screws)} ตัว → ${fmt(boxes)} กล่อง` },
        {
          label: "ครอบข้าง/ปั้นลม",
          expr: `2 ขอบจั่ว × ด้าน × ยาวแนวลาด ÷ ${fmtTrim(trimLen, 1)} ม.`,
          subst: `2 × ${g.sides} × ${fmt(g.slopeLen, 2)} = ${fmt(sideTrimM, 1)} ม. → ${sideTrim.text}`,
        },
      ],
      constants: [ROOF_KIT.coverW, ROOF_KIT.purlinSpacing, ROOF_KIT.purlinStock, ROOF_KIT.screwsPerSheetPerPurlin, ROOF_KIT.screwBox, ROOF_KIT.trimLen, ROOF.minPitchMetal],
      assumptions: [
        "ด้านกว้างแปลนคือด้านที่น้ำไหลลง ด้านยาวแปลนคือแนวสัน/ชายคา",
        "แปตัวแรกที่ปลายชายคา ตัวสุดท้ายชิดสัน ระยะระหว่างแปไม่เกินที่กรอก",
        "ความกว้างคลุมคือความกว้างใช้งานจริงหลังซ้อนลอน (ค่าตั้งต้น 0.76 ม.)",
        "ยังไม่รวมจันทัน อะเส เชิงชาย รางน้ำ และแผ่นปิดชายคา",
      ],
      caveats: [
        ...(warn ? [warn] : []),
        "ขนาดและระยะแป/จันทันเป็นงานโครงสร้าง ให้ช่างหรือวิศวกรกำหนดตามช่วงพาดและน้ำหนักจริง ใบนี้นับจำนวนให้เท่านั้น",
        "หลังคาปั้นหยาหรือมีตะเข้ แผ่นต้องตัดเฉียง ให้นับจากแบบ",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "คู่มือติดตั้งเมทัลชีทของผู้ผลิต (กว้างคลุม ระยะแป จำนวนสกรู ความชันต่ำสุด)" }],
    },
  });
}

const METAL_KINDS = ["cut", "metal"];

const kindField = {
  type: "select" as const,
  key: "kind",
  label: "วัสดุมุง",
  default: "cut",
  options: [
    { value: "cut", label: "เมทัลชีท สั่งตัดตามยาว" },
    { value: "metal", label: "เมทัลชีท แผ่นยาวสำเร็จ (ต่อเอง)" },
    { value: "tile", label: "กระเบื้องคอนกรีต (ซีแพค)" },
    { value: "roman", label: "กระเบื้องลอนคู่" },
  ],
};

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
    when: { key: "kind", is: METAL_KINDS },
  },
  { type: "number" as const, key: "eave", label: "ชายคายื่นเพิ่มจากแปลน (ต่อด้าน)", unit: "ม.", default: 0, min: 0, max: 3, step: 0.05, when: { key: "kind", is: METAL_KINDS } },
  { type: "number" as const, key: "coverW", label: "กว้างคลุม (เมทัล)", unit: "ม.", default: 0.7, min: 0.3, max: 1.5, step: 0.01, when: { key: "kind", is: METAL_KINDS } },
  { type: "number" as const, key: "sheetLen", label: "ยาวแผ่นสำเร็จ", unit: "ม.", default: 6, min: 1, max: 12, step: 0.1, when: { key: "kind", is: "metal" } },
];

const tileFields = [
  { type: "number" as const, key: "perM2", label: "แผ่น/ตร.ม. (ดูสเปกรุ่น)", unit: "แผ่น", default: ROOF.tilePerM2.value, min: 1, max: 150, step: 0.1, when: { key: "kind", is: "tile" } },
  { type: "number" as const, key: "perM2Roman", label: "แผ่น/ตร.ม. ลอนคู่ (ดูสเปกรุ่น)", unit: "แผ่น", default: ROOF.romanPerM2.value, min: 1, max: 20, step: 0.1, when: { key: "kind", is: "roman" } },
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
    blurb: "เมทัลชีทสั่งตัดยาวเท่าไร กี่แผ่น / กระเบื้อง",
    fields: [
      ...roof,
      kindField,
      ...metalFields,
      ...tileFields,
    ],
    calc: calcRoofMaterial,
  },
  {
    id: "metal-kit",
    name: "เมทัลชีทสั่งตัด + แป",
    blurb: "ยาวตัด จำนวนแผ่น แป สกรู ครอบสัน ปั้นลม",
    fields: [
      {
        type: "select",
        key: "shape",
        label: "ทรงหลังคา",
        default: "gable",
        options: [
          { value: "gable", label: "หน้าจั่ว 2 ด้าน" },
          { value: "lean", label: "เพิงหมาแหงน (ลาดทางเดียว)" },
        ],
      },
      ...roof.filter((f) => f.key !== "waste"),
      { type: "number", key: "eave", label: "ชายคายื่นเพิ่มจากแปลน (ต่อด้าน)", unit: "ม.", default: METAL_KIT_EAVE, min: 0, max: 3, step: 0.05 },
      { type: "number", key: "coverW", label: "กว้างคลุมแผ่น", unit: "ม.", default: ROOF_KIT.coverW.value, min: 0.3, max: 1.5, step: 0.01 },
      { type: "number", key: "spacing", label: "ระยะแป", unit: "ม.", default: ROOF_KIT.purlinSpacing.value, min: 0.5, max: 1.5, step: 0.05 },
    ],
    calc: calcMetalKit,
  },
  { id: "gutter", name: "ขนาดรางน้ำ + ท่อ", blurb: "ตามพื้นที่รับน้ำ", fields: roof, calc: calcGutter },
  {
    id: "ridge",
    name: "สันครอบ + ตะเข้สัน",
    blurb: "ความยาวครอบ",
    fields: [
      { type: "number", key: "ridge", label: "ยาวสัน", unit: "ม.", default: 12, min: 0, max: 500, step: 0.1 },
      { type: "number", integer: true, key: "hips", label: "จำนวนตะเข้สัน", unit: "เส้น", default: 4, min: 0, max: 20 },
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
  blurb: "แปลนครั้งเดียว ได้พื้นที่ แผ่น ราง ครอบ สกรู",
  fields: [
    ...roof,
    kindField,
    ...metalFields,
    ...tileFields,
    { type: "number", key: "ridge", label: "ยาวสัน", unit: "ม.", default: 12, min: 0, max: 500, step: 0.1 },
    { type: "number", integer: true, key: "hips", label: "ตะเข้สัน", unit: "เส้น", default: 0, min: 0, max: 20 },
    { type: "number", key: "hipLen", label: "ยาวตะเข้/เส้น", unit: "ม.", default: 6, min: 0, max: 50, step: 0.1 },
  ],
  calc: (input) => {
    const bad = guardInputs(roofJob.fields, input);
    if (bad) return bad;
    const v = withDefaults(roofJob.fields, input);
    const kind = str(v, "kind", "cut");
    const metal = isMetal(kind);
    const area = calcRoofArea(v);
    const mat = calcRoofMaterial(v);
    const gutter = calcGutter(v);
    const ridge = calcRidge(v);
    // สกรูหัวเจาะใช้กับเมทัลชีทเท่านั้น — กระเบื้องยึดด้วยขอ/สกรูของระบบกระเบื้อง นับตามคู่มือรุ่น
    const fast = metal ? calcFastener({ ...v, zone: "mid" }) : null;
    return jobFromParts({
      title: "งานหลังคาทั้งหลัง",
      headline: mat.headline ?? "งานหลังคา",
      rows: [
        // แผ่นสั่งตัดไม่คูณเผื่อเสีย จึงไม่โชว์แถว "รวมเผื่อ" ให้สับสน
        ...area.rows.filter((r) => r.emphasize || (kind !== "cut" && r.label.includes("เผื่อ"))),
        ...mat.rows.filter((r) => r.emphasize),
        ...gutter.rows.filter((r) => r.emphasize || r.label === "ท่อลง"),
        ...ridge.rows.filter((r) => r.emphasize || r.label === "เส้น 2 ม."),
        ...(fast ? fast.rows.filter((r) => r.emphasize || r.label === "กล่อง 250") : []),
      ],
      tip: metal
        ? "หลังคาปั้นหยายังต้องนับตะเข้รางและแผ่นจั่วเพิ่ม สกรูคิดอัตรากลางหลังคา ชายคา/มุมใส่ถี่กว่า"
        : "กระเบื้องยึดด้วยขอยึด/สกรูของระบบกระเบื้อง นับตามคู่มือรุ่น รายการนี้จึงไม่มีสกรูเมทัลชีท",
      parts: [area, mat, gutter, ridge, ...(fast ? [fast] : [])],
    });
  },
};
