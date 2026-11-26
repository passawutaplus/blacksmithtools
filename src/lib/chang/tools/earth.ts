import type { CalcResult, ChartSpec, Field, FormulaStep, ResultRow, ToolDef, Values } from "../types";
import { blockedResult, ceil, fmt, fmtTrim, guardTool, num, resultX, str } from "../math";
import { DIG_SAFE_DEPTH, DIRT_TRUCK, DISCLAIMER_AB, EARTH_FILL, EARTH_SWELL, UNIT } from "../constants";

const guard = (id: string, v: Values) => guardTool(earthTools, id, v);

/* ─────────── รถขนดิน (ใช้ร่วมกันทั้งถมและขุด) ─────────── */

const TRUCK_KEY: Record<string, string> = { six: "cap6", ten: "cap10" };

function truckOf(v: Values, def: string) {
  const key = str(v, "truck", def);
  const t = DIRT_TRUCK[key] ?? DIRT_TRUCK.ten;
  const cap = num(v, TRUCK_KEY[key] ?? "cap10", t.cap.value);
  return { key, label: t.label, cap, ref: t.cap };
}

function trips(loose: number, cap: number) {
  const count = loose > 1e-9 ? ceil(loose / cap) : 0;
  const last = count > 0 ? loose - (count - 1) * cap : 0;
  return { count, last };
}

function tripRows(loose: number, truck: ReturnType<typeof truckOf>, t: ReturnType<typeof trips>, price: number, verb: string): ResultRow[] {
  return [
    {
      label: `${truck.label} (เที่ยวละ ${fmtTrim(truck.cap, 1)} คิว)`,
      value:
        t.count <= 1
          ? `${fmt(t.count)} เที่ยว${t.count === 1 ? ` (${fmtTrim(t.last, 2)} คิว)` : ""}`
          : `${fmt(t.count)} เที่ยว (เต็ม ${fmt(t.count - 1)} เที่ยว + เที่ยวสุดท้าย ${fmtTrim(t.last, 2)} คิว)`,
      emphasize: true,
    },
    ...(price > 0 ? [{ label: `ค่า${verb} (${fmt(price)} บาท/เที่ยว)`, value: `${fmt(t.count * price)} บาท`, emphasize: true }] : []),
  ];
}

function tripStep(loose: number, truck: ReturnType<typeof truckOf>, t: ReturnType<typeof trips>): FormulaStep {
  return { label: "จำนวนเที่ยวรถ", expr: "เที่ยว = ปัดขึ้น(ดินหลวม ÷ คิวต่อเที่ยว)", subst: `${fmt(loose, 2)} ÷ ${fmtTrim(truck.cap, 1)} = ${fmt(t.count)} เที่ยว` };
}

function tripChart(truck: ReturnType<typeof truckOf>, t: ReturnType<typeof trips>): ChartSpec | undefined {
  return t.count > 0
    ? { kind: "packs", unitLabel: `เที่ยว ${truck.label} ${fmtTrim(truck.cap, 1)} คิว`, count: t.count, lastUsed: t.last / truck.cap, note: `เที่ยวสุดท้าย ${fmtTrim(t.last, 2)} คิว` }
    : undefined;
}

/* ─────────── ถมดิน ─────────── */

const FILL_KEY: Record<string, string> = { soil: "fSoil", laterite: "fLaterite", sand: "fSand" };

export function areaFromThai(rai: number, ngan: number, wa: number): number {
  return rai * UNIT.rai.value + ngan * UNIT.ngan.value + wa * UNIT.sqWa.value;
}

export function calcFill(v: Values): CalcResult {
  const bad = guard("fill", v);
  if (bad) return bad;
  const mode = str(v, "areaMode", "m2");
  const rai = num(v, "rai", 0);
  const ngan = num(v, "ngan", 1);
  const wa = num(v, "wa", 0);
  const area = mode === "rai" ? areaFromThai(rai, ngan, wa) : num(v, "area", 200);
  if (area <= 0) {
    return blockedResult({ headline: "พื้นที่เป็นศูนย์ — กรอกไร่ งาน หรือตารางวาอย่างน้อยหนึ่งช่อง", tip: "1 ไร่ = 4 งาน = 400 ตร.วา = 1,600 ตร.ม." });
  }
  const depth = num(v, "depth", 0.5);
  const soilKey = str(v, "soil", "soil");
  const soil = EARTH_FILL[soilKey] ?? EARTH_FILL.soil;
  const factor = num(v, FILL_KEY[soilKey] ?? "fSoil", soil.factor.value);
  const truck = truckOf(v, "ten");
  const price = num(v, "price", 0);

  const compacted = area * depth;
  const loose = compacted * factor;
  const t = trips(loose, truck.cap);
  const areaText =
    mode === "rai"
      ? `${fmt(rai)} ไร่ ${fmt(ngan)} งาน ${fmtTrim(wa, 2)} ตร.วา = ${fmt(area, 2)} ตร.ม.`
      : `${fmt(area, 2)} ตร.ม. (${fmt(area / UNIT.sqWa.value, 2)} ตร.วา)`;

  return resultX({
    title: "ถมดินกี่คิว / กี่เที่ยวรถ",
    headline: `สั่ง${soil.label.split(" ")[0]} ${fmt(loose, 1)} คิว (ดินหลวม) · ${truck.label} ${fmt(t.count)} เที่ยว`,
    chart: tripChart(truck, t),
    rows: [
      { label: "พื้นที่", value: areaText },
      { label: `ถมสูง ${fmtTrim(depth, 2)} ม. (บดอัดแล้ว)`, value: `${fmt(compacted, 2)} คิว` },
      { label: `ตัวคูณดินหลวม ÷ ดินบดอัด · ${soil.label}`, value: `× ${fmtTrim(factor, 2)}` },
      { label: "ดินหลวมที่ต้องสั่ง (คิวรถ)", value: `${fmt(loose, 2)} คิว`, emphasize: true },
      ...tripRows(loose, truck, t, price, "ดิน+ขน"),
    ],
    tip: "ถามผู้ขายให้ชัดว่า 'คิว' ที่ขายคือคิวรถ (ดินหลวม) หรือคิวบดอัด และรถคันละกี่คิว · ถมสูงเกิน 30–50 ซม. ให้บดอัดเป็นชั้น ๆ",
    explain: {
      risk: "A",
      updatedAt: "2026-11-26",
      summary: "ดินบดอัด = พื้นที่ × ความสูงถม · ดินหลวมที่สั่ง = ดินบดอัด × ตัวคูณ · เที่ยว = ปัดขึ้น(ดินหลวม ÷ คิวต่อเที่ยว)",
      steps: [
        ...(mode === "rai"
          ? [
              {
                label: "แปลงไร่-งาน-ตร.วา",
                expr: "ตร.ม. = ไร่ × 1,600 + งาน × 400 + ตร.วา × 4",
                subst: `${fmt(rai)} × 1,600 + ${fmt(ngan)} × 400 + ${fmtTrim(wa, 2)} × 4 = ${fmt(area, 2)} ตร.ม.`,
              },
            ]
          : []),
        { label: "ดินบดอัดแล้ว", expr: "คิว = พื้นที่ × สูงถม", subst: `${fmt(area, 2)} × ${fmtTrim(depth, 2)} = ${fmt(compacted, 2)} คิว` },
        {
          label: "ดินหลวมที่ต้องสั่ง",
          expr: "ดินหลวม = ดินบดอัด × ตัวคูณ (ดินหลวม ÷ ดินบดอัด)",
          subst: `${fmt(compacted, 2)} × ${fmtTrim(factor, 2)} = ${fmt(loose, 2)} คิว`,
          note: "ดินที่มากับรถเป็นดินร่วน บดอัดแล้วยุบลง ต้องสั่งมากกว่าปริมาตรหลุม/ที่ที่จะถม",
        },
        tripStep(loose, truck, t),
      ],
      constants: [soil.factor, truck.ref, ...(mode === "rai" ? [UNIT.rai, UNIT.ngan, UNIT.sqWa] : [])],
      assumptions: [
        `สมมติว่าถมแล้วบดอัดแน่น และดินที่รถขนมาเป็นดินหลวม — ตัวคูณ ${fmtTrim(factor, 2)} แปลว่าดินหลวม ${fmtTrim(factor, 2)} คิว บดอัดเหลือ 1 คิว`,
        "ความสูงถมวัดจากระดับดินเดิมถึงระดับที่ต้องการหลังบดอัด และเท่ากันทั้งแปลง",
        "คิวต่อเที่ยวคือดินหลวมในกระบะตามที่ผู้ขายแจ้ง",
      ],
      caveats: [
        "ดินเปียก ที่ลุ่มน้ำขัง หรือดินเลน ยุบมากกว่าตัวคูณนี้ และยุบต่อได้อีกหลายเดือน — ถมเผื่อหรือรอให้ยุบก่อนสร้าง",
        "ถมดินชิดรั้วหรือผนังบ้าน ดินดันผนังได้ ถ้าถมสูงต้องทำกำแพงกันดินที่วิศวกรออกแบบ",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "หน่วยที่ดินไทย 1 ไร่ = 4 งาน = 400 ตร.วา · 1 ตร.วา = 4 ตร.ม." }, { label: "แนวปฏิบัติงานถมที่และบดอัดดิน" }],
    },
  });
}

/* ─────────── ขุดดิน / ขนทิ้ง ─────────── */

const SWELL_KEY: Record<string, string> = { soil: "sSoil", clay: "sClay", sand: "sSand" };

export function calcDig(v: Values): CalcResult {
  const bad = guard("dig", v);
  if (bad) return bad;
  const shape = str(v, "shape", "trench");
  const count = num(v, "count", 1);
  const soilKey = str(v, "soil", "soil");
  const soil = EARTH_SWELL[soilKey] ?? EARTH_SWELL.soil;
  const swell = num(v, SWELL_KEY[soilKey] ?? "sSoil", soil.factor.value);
  const keepPct = num(v, "keep", 0);
  const truck = truckOf(v, "six");
  const price = num(v, "price", 0);

  let one = 0;
  let depth = 0;
  let dimText = "";
  let dimStep: FormulaStep;
  if (shape === "pit") {
    const pw = num(v, "pw", 1);
    const pl = num(v, "pl", 1);
    depth = num(v, "pd", 1.5);
    one = pw * pl * depth;
    dimText = `หลุม ${fmtTrim(pw, 2)} × ${fmtTrim(pl, 2)} ม. ลึก ${fmtTrim(depth, 2)} ม.`;
    dimStep = { label: "ปริมาตรต่อหลุม", expr: "กว้าง × ยาว × ลึก", subst: `${fmtTrim(pw, 2)} × ${fmtTrim(pl, 2)} × ${fmtTrim(depth, 2)} = ${fmt(one, 3)} คิว` };
  } else if (shape === "round") {
    const d = num(v, "rd", 80) / 100;
    depth = num(v, "rdepth", 1.2);
    one = (Math.PI * d * d * depth) / 4;
    dimText = `หลุมกลม Ø ${fmtTrim(d * 100, 1)} ซม. ลึก ${fmtTrim(depth, 2)} ม.`;
    dimStep = { label: "ปริมาตรต่อหลุม", expr: "π × Ø² ÷ 4 × ลึก", subst: `π × ${fmtTrim(d, 3)}² ÷ 4 × ${fmtTrim(depth, 2)} = ${fmt(one, 3)} คิว` };
  } else {
    const tl = num(v, "tl", 20);
    const tw = num(v, "tw", 40) / 100;
    depth = num(v, "td", 60) / 100;
    one = tl * tw * depth;
    dimText = `ร่องยาว ${fmtTrim(tl, 2)} ม. กว้าง ${fmtTrim(tw * 100, 1)} ซม. ลึก ${fmtTrim(depth * 100, 1)} ซม.`;
    dimStep = { label: "ปริมาตรต่อร่อง", expr: "ยาว × กว้าง × ลึก", subst: `${fmtTrim(tl, 2)} × ${fmtTrim(tw, 3)} × ${fmtTrim(depth, 3)} = ${fmt(one, 3)} คิว` };
  }

  const bank = one * count;
  const haulBank = bank * (1 - keepPct / 100);
  const loose = haulBank * swell;
  const keptLoose = (bank - haulBank) * swell;
  const t = trips(loose, truck.cap);
  const deep = depth > DIG_SAFE_DEPTH.value;

  return resultX({
    title: "ขุดดิน / ขนทิ้ง",
    headline: loose > 1e-9 ? `ดินขุด ${fmt(bank, 2)} คิว → ขนทิ้ง ${fmt(loose, 1)} คิว (ดินหลวม) · ${truck.label} ${fmt(t.count)} เที่ยว` : `ดินขุด ${fmt(bank, 2)} คิว — เก็บไว้ถมกลับทั้งหมด ไม่ต้องขนทิ้ง`,
    chart: tripChart(truck, t),
    rows: [
      { label: "ขนาด", value: `${dimText} × ${fmt(count)}` },
      { label: "ดินเดิมที่ขุดออก", value: `${fmt(bank, 3)} คิว`, emphasize: true },
      { label: `ตัวคูณพองตัว · ${soil.label}`, value: `× ${fmtTrim(swell, 2)}` },
      ...(keepPct > 0 ? [{ label: `เก็บไว้ถมกลับ ${fmtTrim(keepPct, 1)}%`, value: `กองข้างหลุม ${fmt(keptLoose, 2)} คิว (ดินหลวม)` }] : []),
      { label: "ดินหลวมที่ต้องขนทิ้ง", value: `${fmt(loose, 2)} คิว`, emphasize: true },
      ...tripRows(loose, truck, t, price, "ขนทิ้ง"),
    ],
    tip: deep
      ? `ลึกเกิน ${fmtTrim(DIG_SAFE_DEPTH.value, 1)} ม. ห้ามลงไปทำงานในหลุมที่ผนังตั้งตรง ต้องทำลาดหรือค้ำยันกันดินพัง`
      : "ดินที่ขุดขึ้นมาพองตัวกว่าตอนอยู่ในหลุม คิดเที่ยวรถจากดินหลวม ไม่ใช่ขนาดหลุม",
    explain: {
      risk: deep ? "B" : "A",
      updatedAt: "2026-11-26",
      summary: "ดินเดิม = ขนาดหลุม/ร่อง × จำนวน · ดินหลวม = ดินเดิม × ตัวคูณพองตัว · เที่ยว = ปัดขึ้น(ดินหลวม ÷ คิวต่อเที่ยว)",
      steps: [
        dimStep,
        { label: "ดินเดิมรวม", expr: "ต่อหลุม × จำนวน", subst: `${fmt(one, 3)} × ${fmt(count)} = ${fmt(bank, 3)} คิว` },
        {
          label: "ดินหลวมที่ขนทิ้ง",
          expr: "ดินหลวม = ดินเดิม × (1 − เก็บถมกลับ%) × ตัวคูณพองตัว",
          subst: `${fmt(bank, 3)} × ${fmtTrim(1 - keepPct / 100, 3)} × ${fmtTrim(swell, 2)} = ${fmt(loose, 2)} คิว`,
        },
        tripStep(loose, truck, t),
      ],
      constants: [soil.factor, truck.ref, DIG_SAFE_DEPTH],
      assumptions: [
        "หลุม/ร่องผนังตั้งตรง ก้นเรียบ ลึกเท่ากันตลอด (ถ้าขุดผายปากให้ใส่ความกว้างเฉลี่ย)",
        `ตัวคูณพองตัว ${fmtTrim(swell, 2)} แปลว่าดินในหลุม 1 คิว ขุดขึ้นมาเป็นดินหลวม ${fmtTrim(swell, 2)} คิว`,
      ],
      caveats: [
        `ขุดลึกเกิน ${fmtTrim(DIG_SAFE_DEPTH.value, 1)} ม. ต้องทำลาดหรือค้ำยันกันดินพัง และขุดใกล้ฐานรากอาคาร/รั้วเดิมต้องให้วิศวกรดู`,
        "เช็กแนวท่อประปา สายไฟ ท่อแก๊สใต้ดินก่อนขุด",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "ตารางการพองตัวของดิน (คู่มือเครื่องจักรงานดิน)" }, { label: "OSHA 29 CFR 1926.652 การป้องกันดินพังในงานขุด" }],
    },
  });
}

/* ─────────── ฟอร์ม ─────────── */

const truckFields = (def: string): Field[] => [
  {
    type: "select",
    key: "truck",
    label: "รถขน",
    default: def,
    options: Object.entries(DIRT_TRUCK).map(([value, t]) => ({ value, label: t.label })),
  },
  { type: "number", key: "cap6", label: "รถ 6 ล้อ บรรทุก", unit: "คิว/เที่ยว", default: DIRT_TRUCK.six.cap.value, min: 1, max: 10, step: 0.5, when: { key: "truck", is: "six" } },
  { type: "number", key: "cap10", label: "รถ 10 ล้อ บรรทุก", unit: "คิว/เที่ยว", default: DIRT_TRUCK.ten.cap.value, min: 5, max: 30, step: 0.5, when: { key: "truck", is: "ten" } },
];

const factorField = (key: string, soil: string, label: string, ref: { value: number }, is: string): Field => ({
  type: "number",
  key,
  label,
  unit: "เท่า",
  default: ref.value,
  min: 1,
  max: 2,
  step: 0.01,
  when: { key: soil, is },
});

const fillFields: Field[] = [
  {
    type: "select",
    key: "areaMode",
    label: "กรอกพื้นที่เป็น",
    default: "m2",
    options: [
      { value: "m2", label: "ตารางเมตร" },
      { value: "rai", label: "ไร่-งาน-ตารางวา" },
    ],
  },
  { type: "number", key: "area", label: "พื้นที่", unit: "ตร.ม.", default: 200, min: 1, max: 1000000, when: { key: "areaMode", is: "m2" } },
  { type: "number", key: "rai", label: "ไร่", unit: "ไร่", default: 0, min: 0, max: 1000, when: { key: "areaMode", is: "rai" } },
  { type: "number", key: "ngan", label: "งาน", unit: "งาน", default: 1, min: 0, max: 3, when: { key: "areaMode", is: "rai" } },
  { type: "number", key: "wa", label: "ตารางวา", unit: "ตร.วา", default: 0, min: 0, max: 99.99, step: 0.01, when: { key: "areaMode", is: "rai" } },
  { type: "number", key: "depth", label: "ถมสูง (หลังบดอัด)", unit: "ม.", default: 0.5, min: 0.05, max: 5, step: 0.05 },
  {
    type: "select",
    key: "soil",
    label: "ดินที่ถม",
    default: "soil",
    options: Object.entries(EARTH_FILL).map(([value, s]) => ({ value, label: s.label })),
  },
  factorField("fSoil", "soil", "ตัวคูณดินหลวม ÷ บดอัด", EARTH_FILL.soil.factor, "soil"),
  factorField("fLaterite", "soil", "ตัวคูณดินหลวม ÷ บดอัด", EARTH_FILL.laterite.factor, "laterite"),
  factorField("fSand", "soil", "ตัวคูณทรายหลวม ÷ บดอัด", EARTH_FILL.sand.factor, "sand"),
  ...truckFields("ten"),
  { type: "number", key: "price", label: "ราคาต่อเที่ยว (ไม่ใส่ก็ได้)", unit: "บาท", default: 0, min: 0, max: 100000 },
];

const digFields: Field[] = [
  {
    type: "select",
    key: "shape",
    label: "ขุดแบบ",
    default: "trench",
    options: [
      { value: "trench", label: "ร่องยาว (วางท่อ/คานคอดิน)" },
      { value: "pit", label: "หลุมสี่เหลี่ยม" },
      { value: "round", label: "หลุมกลม" },
    ],
  },
  { type: "number", key: "tl", label: "ยาวร่อง", unit: "ม.", default: 20, min: 0.5, max: 2000, step: 0.5, when: { key: "shape", is: "trench" } },
  { type: "number", key: "tw", label: "กว้างร่อง", unit: "ซม.", default: 40, min: 10, max: 300, when: { key: "shape", is: "trench" } },
  { type: "number", key: "td", label: "ลึกร่อง", unit: "ซม.", default: 60, min: 10, max: 500, when: { key: "shape", is: "trench" } },
  { type: "number", key: "pw", label: "กว้างหลุม", unit: "ม.", default: 1, min: 0.2, max: 50, step: 0.05, when: { key: "shape", is: "pit" } },
  { type: "number", key: "pl", label: "ยาวหลุม", unit: "ม.", default: 1, min: 0.2, max: 50, step: 0.05, when: { key: "shape", is: "pit" } },
  { type: "number", key: "pd", label: "ลึกหลุม", unit: "ม.", default: 1.5, min: 0.1, max: 10, step: 0.05, when: { key: "shape", is: "pit" } },
  { type: "number", key: "rd", label: "เส้นผ่านศูนย์กลางหลุม", unit: "ซม.", default: 80, min: 10, max: 300, when: { key: "shape", is: "round" } },
  { type: "number", key: "rdepth", label: "ลึกหลุม", unit: "ม.", default: 1.2, min: 0.1, max: 30, step: 0.05, when: { key: "shape", is: "round" } },
  { type: "number", key: "count", label: "จำนวน", unit: "หลุม/ร่อง", default: 1, min: 1, max: 1000 },
  {
    type: "select",
    key: "soil",
    label: "ชนิดดิน",
    default: "soil",
    options: Object.entries(EARTH_SWELL).map(([value, s]) => ({ value, label: s.label })),
  },
  factorField("sSoil", "soil", "ตัวคูณพองตัว (ขุดหลวม ÷ ดินเดิม)", EARTH_SWELL.soil.factor, "soil"),
  factorField("sClay", "soil", "ตัวคูณพองตัว (ขุดหลวม ÷ ดินเดิม)", EARTH_SWELL.clay.factor, "clay"),
  factorField("sSand", "soil", "ตัวคูณพองตัว (ขุดหลวม ÷ ดินเดิม)", EARTH_SWELL.sand.factor, "sand"),
  { type: "number", key: "keep", label: "เก็บไว้ถมกลับ", unit: "%", default: 0, min: 0, max: 100 },
  ...truckFields("six"),
  { type: "number", key: "price", label: "ค่าขนทิ้งต่อเที่ยว (ไม่ใส่ก็ได้)", unit: "บาท", default: 0, min: 0, max: 100000 },
];

export const earthTools: ToolDef[] = [
  {
    id: "fill",
    name: "ถมดินกี่คิว / กี่เที่ยวรถ",
    blurb: "ไร่-งาน-วา หรือ ตร.ม. → ดินหลวมที่สั่ง เที่ยวรถ",
    keywords: ["ถมดิน", "ถมที่", "ดินถม", "ลูกรัง", "ทรายถม", "คิวดิน", "รถ 10 ล้อ", "รถ 6 ล้อ", "ดินยุบ"],
    fields: fillFields,
    calc: calcFill,
  },
  {
    id: "dig",
    name: "ขุดดิน / ขนทิ้ง",
    blurb: "ร่อง หลุม → ดินขุด ดินพองตัว เที่ยวรถ",
    keywords: ["ขุดดิน", "ขนดินทิ้ง", "ดินพองตัว", "ขุดร่อง", "ขุดหลุม", "ขุดฐานราก"],
    fields: digFields,
    calc: calcDig,
  },
];
