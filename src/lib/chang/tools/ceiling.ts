import type { JobDef, ToolDef, Values } from "../types";
import { ceil, fmt, jobFromParts, num, resultX, round, str } from "../math";
import { DISCLAIMER_AB, WASTE_DEFAULT } from "../constants";

function area(v: Values) {
  return num(v, "w", 4) * num(v, "l", 5);
}

export function calcGypsum(v: Values) {
  const a = area(v);
  const wastePct = num(v, "waste", WASTE_DEFAULT.value);
  const need = (a / 2.88) * (1 + wastePct / 100);
  const boards = ceil(need);
  const hangers = ceil(a / (1.2 * 0.9));
  const cline = ceil((a / 0.4) * 1.05);
  const lastUsed = need - Math.floor(need) || 1;

  return resultX({
    title: "ฝ้ายิปซัมฉาบเรียบ",
    headline: `ยิปซัม ${boards} แผ่น`,
    chart: {
      kind: "packs",
      unitLabel: "แผ่น 1.2×2.4 ม.",
      count: boards,
      lastUsed,
      note: `พื้นที่ ${fmt(a, 2)} ตร.ม. + เผื่อเสีย ${fmt(wastePct)}%`,
    },
    rows: [
      { label: "พื้นที่", value: `${fmt(a, 2)} ตร.ม.` },
      { label: "แผ่น 1.2×2.4", value: `${boards} แผ่น`, emphasize: true },
      { label: "ชุดแขวน", value: `${hangers} ชุด` },
      { label: "โครง C-Line ประมาณ", value: `${fmt(cline, 0)} ม.` },
    ],
    tip: "ระยะแขวนไม่เกิน 1.2 ม. แผ่นฉาบเรียบเผื่อเสีย 10%",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "จำนวนแผ่นยิปซัม = พื้นที่ฝ้า ÷ พื้นที่แผ่น (1.2×2.4=2.88 ตร.ม.) เผื่อเสียจากการตัดเข้ามุม/ท่อ 10% ส่วนโครง C-Line และชุดแขวนคิดจากระยะห่างมาตรฐาน 1.2×0.9 ม.",
      steps: [
        { label: "จำนวนแผ่นยิปซัม", expr: "ปัดขึ้น(พื้นที่ ÷ 2.88 × (1+เผื่อเสีย))", subst: `${fmt(a, 2)} ÷ 2.88 × ${fmt(1 + wastePct / 100, 2)} = ${boards} แผ่น` },
        { label: "จำนวนชุดแขวน", expr: "พื้นที่ ÷ (1.2×0.9)", subst: `${fmt(a, 2)} ÷ 1.08 = ${hangers} ชุด` },
        { label: "โครง C-Line ประมาณ", expr: "(พื้นที่ ÷ 0.4) × 1.05", subst: `${fmt(a, 2)} ÷ 0.4 × 1.05 ≈ ${fmt(cline, 0)} ม.` },
      ],
      assumptions: ["ระยะแขวนโครงเพดานมาตรฐาน 1.2×0.9 ม. ตามระบบฝ้าฉาบเรียบทั่วไป"],
      caveats: [
        "ห้องที่มีคานหรือท่องานระบบพาดผ่านต้องเพิ่มจุดแขวนเสริมเฉพาะจุด ไม่ใช่คิดจากระยะห่างมาตรฐานอย่างเดียว",
        "ฝ้าที่ต้องรับดาวน์ไลท์/แอร์ฝังต้องเสริมโครงรับเฉพาะจุดก่อนติดแผ่น",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวปฏิบัติงานติดตั้งฝ้ายิปซัมฉาบเรียบ (Gypsum Board Ceiling System)" }],
    },
  });
}

export function calcTbar(v: Values) {
  const a = area(v);
  const tileSize = str(v, "tile", "60") === "120" ? 0.72 : 0.36;
  const need = (a / tileSize) * 1.05;
  const tiles = ceil(need);
  const main = ceil((num(v, "w", 4) / 1.2) * num(v, "l", 5));
  const cross = ceil((num(v, "l", 5) / 0.6) * num(v, "w", 4));
  const lastUsed = need - Math.floor(need) || 1;

  return resultX({
    title: "ฝ้าทีบาร์",
    headline: `แผ่นทีบาร์ ${tiles} แผ่น`,
    chart: {
      kind: "packs",
      unitLabel: `แผ่น ${str(v, "tile", "60") === "120" ? "60×120" : "60×60"} ซม.`,
      count: tiles,
      lastUsed,
      note: `พื้นที่ ${fmt(a, 2)} ตร.ม. + เผื่อมุมห้อง 5%`,
    },
    rows: [
      { label: "แผ่นฝ้า", value: `${tiles} แผ่น`, emphasize: true },
      { label: "Main tee ประมาณ", value: `${fmt(main, 1)} ม.` },
      { label: "Cross tee ประมาณ", value: `${fmt(cross, 1)} ม.` },
    ],
    tip: "เผื่อแผ่นมุมห้อง 5% ตรวจระดับก่อนใส่แผ่นสุดท้าย",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "จำนวนแผ่นฝ้าทีบาร์ = พื้นที่ห้อง ÷ พื้นที่แผ่น เผื่อมุมห้อง 5% ส่วน Main tee/Cross tee ประมาณจากตารางกริดโครงทีบาร์มาตรฐาน",
      steps: [
        { label: "จำนวนแผ่นฝ้า", expr: "ปัดขึ้น(พื้นที่ ÷ ขนาดแผ่น × 1.05)", subst: `${fmt(a, 2)} ÷ ${tileSize} × 1.05 = ${tiles} แผ่น` },
        { label: "Main tee ประมาณ", expr: "(กว้าง ÷ 1.2) × ยาว", subst: `(${fmt(num(v, "w", 4))} ÷ 1.2) × ${fmt(num(v, "l", 5))} ≈ ${fmt(main, 1)} ม.` },
        { label: "Cross tee ประมาณ", expr: "(ยาว ÷ 0.6) × กว้าง", subst: `(${fmt(num(v, "l", 5))} ÷ 0.6) × ${fmt(num(v, "w", 4))} ≈ ${fmt(cross, 1)} ม.` },
      ],
      assumptions: ["โครงกริดทีบาร์มาตรฐาน Main tee ระยะ 1.2 ม. Cross tee ระยะ 0.6 ม."],
      caveats: ["ห้องที่ไม่ได้สี่เหลี่ยมจตุรัส/มีเสาโผล่กลางห้องต้องตัดแผ่นเพิ่ม เผื่อมากกว่า 5% ตามความซับซ้อนจริง", DISCLAIMER_AB],
      refs: [{ label: "แนวปฏิบัติงานติดตั้งฝ้าทีบาร์ (Exposed Grid T-bar Ceiling)" }],
    },
  });
}

export function calcRt60(v: Values) {
  const a = area(v);
  const h = num(v, "h", 2.8);
  const vol = a * h;
  const alpha = num(v, "alpha", 0.15);
  const A = a * 2 * alpha + 2 * (num(v, "w") + num(v, "l")) * h * 0.05;
  const rt = (0.161 * vol) / Math.max(A, 0.1);
  const need = rt > 0.8;
  const panels = need ? ceil(((0.161 * vol) / 0.8 - A) / 0.8) : 0;
  const chartMax = Math.max(rt * 1.3, 1.6);

  return resultX({
    title: "RT60 อะคูสติก",
    headline: `RT60 ≈ ${fmt(rt, 2)} วินาที`,
    chart: {
      kind: "threshold",
      unit: "วินาที",
      value: round(rt, 2),
      max: chartMax,
      zones: [
        { upTo: 0.8, tone: "good", label: "ก้องน้อย เหมาะบ้าน/ออฟฟิศ/ห้องประชุม" },
        { upTo: 1.2, tone: "warn", label: "ก้องพอสังเกตได้ ฟังเสียงพูดยากขึ้น" },
        { upTo: chartMax, tone: "bad", label: "ก้องมาก ควรเพิ่มแผ่นซับเสียง" },
      ],
    },
    rows: [
      { label: "ปริมาตรห้อง", value: `${fmt(vol, 1)} ลบ.ม.` },
      { label: "เวลาก้อง", value: `${fmt(rt, 2)} วินาที`, emphasize: true },
      { label: "แผ่นซับเพิ่ม", value: need ? `ประมาณ ${panels} ตร.ม.` : "ยังไม่จำเป็น" },
    ],
    tip: "บ้าน/ออฟฟิศเป้าไม่เกิน 0.8 วินาที ห้องประชุมยาวเกินนี้คุยแล้วก้อง",
    explain: {
      risk: "B",
      updatedAt: "2026-08-21",
      summary: "เวลาก้อง (Reverberation Time, RT60) ประมาณจากสมการ Sabine: RT60 = 0.161×ปริมาตรห้อง ÷ พื้นที่ดูดซับเสียงสมมูล ยิ่งพื้นผิวดูดซับมาก (α สูง) เวลาก้องยิ่งสั้น เสียงพูดชัดขึ้น",
      steps: [
        { label: "ปริมาตรห้อง", expr: "พื้นที่ × สูง", subst: `${fmt(a, 2)} × ${fmt(h, 1)} = ${fmt(vol, 1)} ลบ.ม.` },
        {
          label: "พื้นที่ดูดซับเสียงสมมูล",
          expr: "A = พื้น+ฝ้า×2×α + ผนังรอบ×สูง×0.05",
          subst: `${fmt(a, 2)}×2×${fmt(alpha, 2)} + 2×(${fmt(num(v, "w"))}+${fmt(num(v, "l"))})×${fmt(h, 1)}×0.05 = ${fmt(A, 2)}`,
        },
        { label: "สมการ Sabine", expr: "RT60 = 0.161 × ปริมาตร ÷ A", subst: `0.161 × ${fmt(vol, 1)} ÷ ${fmt(A, 2)} = ${fmt(rt, 2)} วินาที` },
      ],
      constants: [{ value: 0.161, unit: "-", label: "ค่าคงที่สมการ Sabine", source: "Sabine Reverberation Time Formula (หน่วยเมตริก)" }],
      assumptions: ["ค่าดูดซับ α ของพื้น/ฝ้าใส่เป็นค่าเฉลี่ยเดียว ผนังคิดค่าดูดซับต่ำ 0.05 (ผนังปูนเรียบทั่วไป)", "ห้องรูปทรงปกติ ไม่มีพื้นผิวสะท้อนเสียงเฉพาะจุดรุนแรง (เช่น กระจกใหญ่หรือผนังโค้ง)"],
      caveats: [
        "ห้องประชุม/ห้องเรียน/สตูดิโอบันทึกเสียงมีเกณฑ์ RT60 เฉพาะทางที่ต่างจากบ้านพักอาศัย ควรปรึกษาผู้เชี่ยวชาญด้านอะคูสติกสำหรับพื้นที่ใช้งานพิเศษ",
        "ค่านี้เป็นการประมาณคร่าว ๆ ด้วยสมการ Sabine ซึ่งแม่นยำน้อยลงเมื่อพื้นที่ดูดซับเสียงมีการกระจายไม่สม่ำเสมอ",
      ],
      refs: [{ label: "Sabine's Reverberation Time Formula — หลักอะคูสติกสถาปัตยกรรมพื้นฐาน" }],
    },
  });
}

export function calcInsulation(v: Values) {
  const a = area(v);
  const thick = num(v, "thick", 50);
  const kind = str(v, "kind", "glass");
  const k = kind === "rock" ? 0.036 : kind === "pe" ? 0.035 : 0.04;
  const R = thick / 1000 / k;
  const need = a / 7.2;
  const packs = ceil(need);
  const lastUsed = need - Math.floor(need) || 1;

  return resultX({
    title: "ฉนวนกันร้อน-เสียง",
    headline: `R ≈ ${fmt(R, 1)} ม²·K/W`,
    chart: {
      kind: "packs",
      unitLabel: "แพ็ก 7.2 ตร.ม.",
      count: packs,
      lastUsed,
      note: `หนา ${fmt(thick)} มม. ชนิด${kind === "rock" ? "ร็อกวูล" : kind === "pe" ? "PE โฟม" : "ใยแก้ว"} บนพื้นที่ ${fmt(a, 2)} ตร.ม.`,
    },
    rows: [
      { label: "ชนิด", value: kind === "rock" ? "ร็อกวูล" : kind === "pe" ? "PE โฟม" : "ใยแก้ว" },
      { label: "ค่า R", value: `${fmt(R, 1)}`, emphasize: true },
      { label: "ม้วน/แพ็กประมาณ", value: `${packs} แพ็ก (คิด 7.2 ตร.ม./แพ็ก)` },
    ],
    tip: "ฝ้าชั้นบนบ้านไทย 50 มม. ใยแก้วพอเริ่ม ร้อนจัดจัด 75–100 มม.",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "ค่าความต้านทานความร้อน R = ความหนา ÷ ค่าสัมประสิทธิ์การนำความร้อน (k) ของวัสดุ ยิ่งหนาและ k ต่ำ ยิ่งกันร้อนได้ดี ปริมาณที่ต้องซื้อคิดจากพื้นที่ ÷ พื้นที่ต่อแพ็ก",
      steps: [
        { label: "ค่า R ของฉนวน", expr: "R = หนา(ม.) ÷ k", subst: `${fmt(thick / 1000, 3)} ÷ ${k} = ${fmt(R, 1)} ม²·K/W` },
        { label: "จำนวนแพ็ก", expr: "ปัดขึ้น(พื้นที่ ÷ 7.2)", subst: `${fmt(a, 2)} ÷ 7.2 = ${packs} แพ็ก` },
      ],
      constants: [
        {
          value: k,
          unit: "W/m·K",
          label: `ค่า k ของ${kind === "rock" ? "ร็อกวูล" : kind === "pe" ? "PE โฟม" : "ใยแก้ว"}`,
          source: "ค่าเฉลี่ยผลิตภัณฑ์ฉนวนแต่ละชนิดในตลาด",
        },
      ],
      assumptions: ["ติดตั้งฉนวนแบบผืนเดียวสม่ำเสมอไม่มีช่องว่าง (ถ้ามีช่องว่าง/รอยต่อไม่แน่น ค่า R จริงจะต่ำกว่าที่คำนวณ)"],
      caveats: [
        "หลังคาไทยที่โดนแดดจัดทั้งวัน แนะนำหนา 75–100 มม. ขึ้นไปเพื่อลดความร้อนสะสมในฝ้าอย่างมีประสิทธิภาพ",
        "ฉนวนที่โดนความชื้น/รั่วซึมจะเสียคุณสมบัติกันร้อนและเป็นแหล่งเชื้อรา ควรตรวจสอบหลังคาไม่รั่วก่อนติดตั้ง",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "ค่าสัมประสิทธิ์การนำความร้อน (Thermal Conductivity) ของฉนวนกันความร้อนตามผลิตภัณฑ์" }],
    },
  });
}

export function calcHardware(v: Values) {
  const a = area(v);
  const boards = ceil(a / 2.88);
  const screws = boards * 18;
  const tape = ceil((boards * 2.4 * 2) / 90);
  const mud = round(a * 0.5, 1);

  return resultX({
    title: "สกรู + ฉาบรอยต่อ",
    headline: `สกรูประมาณ ${fmt(screws)} ตัว`,
    chart: {
      kind: "stack",
      parts: [
        { label: "เทปผ้ารอยต่อ", value: tape, display: `${tape} ม้วน`, tone: "accent" },
        { label: "ปูนฉาบรอยต่อ (สัดส่วน กก.)", value: mud, display: `${fmt(mud, 1)} กก.`, tone: "mute" },
      ],
      totalLabel: "สกรูยิปซัมรวม",
      totalDisplay: `${fmt(screws)} ตัว`,
    },
    rows: [
      { label: "สกรูยิปซัม", value: `${fmt(screws)} ตัว`, emphasize: true },
      { label: "เทปผ้า", value: `${tape} ม้วน` },
      { label: "ปูนฉาบรอยต่อ", value: `${fmt(mud, 1)} กก.` },
    ],
    tip: "สกรูทุก 20–30 ซม. ฉาบ 3 เที่ยวถ้าจะทาสีเรียบ",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "อุปกรณ์เก็บผิวฝ้ายิปซัมคิดตามจำนวนแผ่น: สกรูประมาณ 18 ตัว/แผ่น เทปผ้าตามความยาวรอยต่อรวม และปูนฉาบรอยต่อประมาณ 0.5 กก./ตร.ม.",
      steps: [
        { label: "จำนวนสกรู", expr: "จำนวนแผ่น × 18 ตัว/แผ่น", subst: `${boards} × 18 = ${fmt(screws)} ตัว` },
        { label: "เทปผ้ารอยต่อ", expr: "ปัดขึ้น(รอยต่อรวม ÷ 90 ม./ม้วน)", subst: `${boards}×2.4×2 ÷ 90 ≈ ${tape} ม้วน` },
        { label: "ปูนฉาบรอยต่อ", expr: "พื้นที่ × 0.5 กก./ตร.ม.", subst: `${fmt(a, 2)} × 0.5 = ${fmt(mud, 1)} กก.` },
      ],
      assumptions: ["สกรูระยะห่างมาตรฐาน 20–30 ซม. ตามแนวโครง แผ่นมาตรฐาน 1.2×2.4 ม.", "ฉาบรอยต่อ 0.5 กก./ตร.ม. เป็นค่าเฉลี่ยสำหรับฉาบ 2–3 เที่ยว"],
      caveats: ["ถ้าต้องการผิวเรียบสำหรับทาสีเนียน ควรฉาบ 3 เที่ยวและขัดละเอียด ปริมาณปูนฉาบอาจสูงกว่าค่าประมาณนี้", DISCLAIMER_AB],
      refs: [{ label: "แนวปฏิบัติงานเก็บผิวฝ้ายิปซัม (Gypsum Board Finishing — Screw, Tape & Joint Compound)" }],
    },
  });
}

const room = [
  { type: "number" as const, key: "w", label: "กว้าง", unit: "ม.", default: 4, min: 1, step: 0.1 },
  { type: "number" as const, key: "l", label: "ยาว", unit: "ม.", default: 5, min: 1, step: 0.1 },
];

export const ceilingTools: ToolDef[] = [
  { id: "gypsum", name: "ฝ้ายิปซัมฉาบเรียบ", blurb: "แผ่น + โครง + แขวน", fields: [...room, { type: "number" as const, key: "waste", label: "เผื่อเสีย", unit: "%", default: 10, min: 0, max: 25 }], calc: calcGypsum },
  {
    id: "tbar",
    name: "ฝ้าทีบาร์",
    blurb: "60×60 / 60×120",
    fields: [
      ...room,
      {
        type: "select",
        key: "tile",
        label: "แผ่น",
        default: "60",
        options: [
          { value: "60", label: "60×60" },
          { value: "120", label: "60×120" },
        ],
      },
    ],
    calc: calcTbar,
  },
  {
    id: "acoustic",
    name: "RT60 อะคูสติก",
    blurb: "เวลาก้อง + แผ่นซับ",
    fields: [
      ...room,
      { type: "number", key: "h", label: "สูงห้อง", unit: "ม.", default: 2.8, min: 2, step: 0.1 },
      { type: "number", key: "alpha", label: "ค่าดูดซับเฉลี่ย", default: 0.15, min: 0.05, max: 0.8, step: 0.05 },
    ],
    calc: calcRt60,
  },
  {
    id: "insulation",
    name: "ฉนวนกันร้อน-เสียง",
    blurb: "ใยแก้ว ร็อกวูล PE",
    fields: [
      ...room,
      { type: "number", key: "thick", label: "หนา", unit: "มม.", default: 50, min: 10 },
      {
        type: "select",
        key: "kind",
        label: "ชนิด",
        default: "glass",
        options: [
          { value: "glass", label: "ใยแก้ว" },
          { value: "rock", label: "ร็อกวูล" },
          { value: "pe", label: "PE โฟม" },
        ],
      },
    ],
    calc: calcInsulation,
  },
  { id: "hardware", name: "สกรู + ฉาบรอยต่อ", blurb: "ของเก็บผิวฝ้า", fields: room, calc: calcHardware },
];

export const ceilingJob: JobDef = {
  name: "คิดทั้งงานฝ้า",
  blurb: "ห้องครั้งเดียว ได้แผ่นโครงสกรู",
  fields: [
    ...room,
    {
      type: "select",
      key: "sys",
      label: "ระบบฝ้า",
      default: "gyp",
      options: [
        { value: "gyp", label: "ยิปซัมฉาบเรียบ" },
        { value: "tbar", label: "ทีบาร์ 60×60" },
      ],
    },
    { type: "number", key: "thick", label: "ฉนวน (0 ถ้าไม่ใส่)", unit: "มม.", default: 50, min: 0 },
  ],
  calc: (v) => {
    const main = str(v, "sys") === "tbar" ? calcTbar({ ...v, tile: "60" }) : calcGypsum(v);
    const hw = calcHardware(v);
    const ins = num(v, "thick") > 0 ? calcInsulation({ ...v, kind: "glass" }) : null;
    return jobFromParts({
      title: "งานฝ้าทั้งห้อง",
      headline: main.headline ?? "งานฝ้า",
      rows: [
        ...main.rows.filter((r) => r.emphasize || r.label.includes("โครง") || r.label.includes("ชุด")),
        ...hw.rows.filter((r) => r.emphasize),
        ...(ins ? ins.rows.filter((r) => r.label.includes("แพ็ก")) : []),
      ],
      tip: "งานฝ้าบ้านทั่วไป ยังไม่รวมไฟดาวน์ไลท์และวงกบฝ้า",
      parts: [main, hw, ...(ins ? [ins] : [])],
    });
  },
};
