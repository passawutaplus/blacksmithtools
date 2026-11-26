import type { CalcResult, Field, ToolDef, Values } from "../types";
import { blockedResult, ceil, fmt, fmtTrim, guardTool, num, resultX, str } from "../math";
import { BLIND, CURTAIN, DISCLAIMER_AB } from "../constants";

const guard = (id: string, v: Values) => guardTool(curtainTools, id, v);
const UPDATED = "2026-11-26";

const FULLNESS: Record<string, typeof CURTAIN.fullness2> = {
  "2": CURTAIN.fullness2,
  "2.5": CURTAIN.fullness25,
  "3": CURTAIN.fullness3,
};

const STYLE_NAME: Record<string, string> = { pleat: "ม่านจีบ", eyelet: "ม่านตาไก่", wave: "ม่านลอน" };

/* ─────────── ผ้าม่านกี่เมตร / กี่หลา ─────────── */

export function calcCurtainFabric(v: Values): CalcResult {
  const bad = guard("fabric", v);
  if (bad) return bad;
  const w = num(v, "w", 2);
  const ext = num(v, "ext", CURTAIN.extend.value) / 100;
  const h = num(v, "h", 2.4);
  const style = str(v, "style", "pleat");
  const fullKey = str(v, "full", "2.5");
  const fullness = fullKey === "custom" ? num(v, "fullC", 2.5) : FULLNESS[fullKey].value;
  const panels = Number(str(v, "split", "2"));
  const cut = str(v, "cut", "narrow");
  const top = num(v, "top", CURTAIN.topHem.value) / 100;
  const bot = num(v, "bot", CURTAIN.bottomHem.value) / 100;
  const side = num(v, "side", CURTAIN.sideHem.value) / 100;

  const rail = w + 2 * ext;
  const sideTotal = panels * 2 * side;
  const flat = rail * fullness + sideTotal;
  const drop = h + top + bot;
  const yard = CURTAIN.yard.value;

  let metres: number;
  let widths = 0;
  let roll: number;
  let cutDrop = drop;
  let repeat = 0;
  if (cut === "narrow") {
    roll = num(v, "roll", CURTAIN.narrowRoll.value);
    repeat = num(v, "repeat", 0) / 100;
    cutDrop = repeat > 0 ? ceil(drop / repeat) * repeat : drop;
    widths = ceil(flat / roll);
    metres = widths * cutDrop;
  } else {
    roll = num(v, "wroll", CURTAIN.wideRoll.value);
    if (drop > roll + 1e-9) {
      return blockedResult({
        headline: `ม่านสูงรวมเผื่อ ${fmt(drop, 2)} ม. เกินหน้าผ้า ${fmtTrim(roll, 2)} ม. — ใช้ผ้าหน้ากว้างแบบนี้ไม่ได้`,
        rows: [{ label: "สูงสำเร็จ + เผื่อหัว + เผื่อชาย", value: `${fmtTrim(h, 2)} + ${fmtTrim(top, 2)} + ${fmtTrim(bot, 2)} = ${fmt(drop, 2)} ม.` }],
        tip: "เลือกผ้าหน้าแคบต่อผืนตามแนวตั้ง หรือหาผ้าหน้ากว้างกว่านี้",
      });
    }
    metres = flat;
  }
  const yards = metres / yard;
  const buyYards = ceil(yards);
  const actualFullness = cut === "narrow" ? (widths * roll - sideTotal) / rail : fullness;
  const panelW = rail / panels;
  const eyelet = style === "eyelet";
  const spacing = (eyelet ? num(v, "ring", CURTAIN.ringSpacing.value) : num(v, "hook", CURTAIN.hookSpacing.value)) / 100;
  let perPanel: number;
  if (eyelet) {
    const raw = ceil((panelW * fullness) / spacing);
    perPanel = raw % 2 === 0 ? raw : raw + 1;
  } else {
    perPanel = ceil(panelW / spacing) + 1;
  }
  const hooks = perPanel * panels;
  const brackets = ceil(rail / CURTAIN.bracketSpacing.value) + 1;
  const lastUsed = widths > 0 ? (flat - (widths - 1) * roll) / roll : undefined;

  return resultX({
    title: "ผ้าม่านกี่เมตร / กี่หลา",
    headline: `ผ้า ${fmt(metres, 2)} ม. = ${fmt(yards, 2)} หลา (สั่ง ${fmt(buyYards)} หลา)${cut === "narrow" ? ` · ${fmt(widths)} หน้าผ้า` : ""}`,
    chart:
      cut === "narrow"
        ? { kind: "packs", unitLabel: `หน้าผ้า ${fmtTrim(roll, 2)} ม.`, count: widths, lastUsed, note: `ผ้าแผ่รวม ${fmt(flat, 2)} ม. ตัดยาวผืนละ ${fmt(cutDrop, 2)} ม.` }
        : undefined,
    rows: [
      { label: "ความยาวราง", value: `${fmtTrim(w, 2)} + 2 × ${fmtTrim(ext, 2)} = ${fmt(rail, 2)} ม.`, emphasize: true },
      { label: `${STYLE_NAME[style]} ความฟู ${fmtTrim(fullness, 2)} เท่า`, value: `ผ้าแผ่ ${fmt(rail * fullness, 2)} ม. + พับริม ${fmt(sideTotal, 2)} ม. = ${fmt(flat, 2)} ม.` },
      { label: "ความยาวตัดต่อผืน", value: `${fmtTrim(h, 2)} + หัว ${fmtTrim(top, 2)} + ชาย ${fmtTrim(bot, 2)} = ${fmt(drop, 2)} ม.${repeat > 0 ? ` → ปัดตามลาย ${fmtTrim(repeat * 100, 1)} ซม. = ${fmt(cutDrop, 2)} ม.` : ""}` },
      ...(cut === "narrow"
        ? [
            { label: `หน้าผ้า ${fmtTrim(roll, 2)} ม. ต่อผืนตามแนวตั้ง`, value: `${fmt(widths)} หน้าผ้า × ${fmt(cutDrop, 2)} ม.` },
            { label: "ความฟูที่ได้จริง (หักพับริม)", value: `${fmt(actualFullness, 2)} เท่า` },
          ]
        : [{ label: `ผ้าหน้ากว้าง ${fmtTrim(roll, 2)} ม. (ใช้หน้าผ้าเป็นความสูง)`, value: "ไม่มีตะเข็บต่อ ยาวเท่าผ้าแผ่" }]),
      { label: "ผ้าที่ต้องซื้อ", value: `${fmt(metres, 2)} ม. = ${fmt(yards, 2)} หลา → สั่ง ${fmt(buyYards)} หลา`, emphasize: true },
      {
        label: eyelet ? "ห่วงตาไก่" : style === "wave" ? "รันเนอร์/ตัวล็อกเทปลอน" : "ตะขอ + รันเนอร์",
        value: `${fmt(hooks)} ตัว (${panels === 2 ? `ผืนละ ${fmt(perPanel)}` : "ผืนเดียว"})`,
        emphasize: true,
      },
      { label: eyelet ? "ขาจับราว" : "ขาจับราง", value: `${fmt(brackets)} ตัว (ห่างไม่เกิน ${fmtTrim(CURTAIN.bracketSpacing.value, 2)} ม.)` },
    ],
    tip: "วัดความสูงจากใต้รางถึงพื้นจริงทุกจุด พื้นไม่ได้ระดับให้ใช้ค่าน้อยสุด แล้วลบระยะลอยพื้น 1–2 ซม.",
    explain: {
      risk: "A",
      updatedAt: UPDATED,
      summary: "ราง = กว้างหน้าต่าง + ยื่นสองข้าง · ผ้าแผ่ = ราง × ความฟู + พับริม · หน้าผ้า = ⌈ผ้าแผ่ ÷ หน้าผ้า⌉ · เมตร = หน้าผ้า × ความยาวตัด · หลา = เมตร ÷ 0.9144",
      steps: [
        { label: "ราง", expr: "กว้าง + 2 × ยื่นต่อข้าง", subst: `${fmtTrim(w, 2)} + 2 × ${fmtTrim(ext, 2)} = ${fmt(rail, 2)} ม.` },
        { label: "ผ้าแผ่", expr: "ราง × ความฟู + ผืน × 2 ริม × พับริม", subst: `${fmt(rail, 2)} × ${fmtTrim(fullness, 2)} + ${panels} × 2 × ${fmtTrim(side, 2)} = ${fmt(flat, 2)} ม.` },
        {
          label: "ความยาวตัด",
          expr: repeat > 0 ? "⌈(สูง + หัว + ชาย) ÷ ลาย⌉ × ลาย" : "สูง + เผื่อหัว + เผื่อชาย",
          subst: `${fmtTrim(h, 2)} + ${fmtTrim(top, 2)} + ${fmtTrim(bot, 2)} = ${fmt(drop, 2)} ม.${repeat > 0 ? ` → ${fmt(cutDrop, 2)} ม.` : ""}`,
        },
        cut === "narrow"
          ? {
              label: "หน้าผ้าและเมตร",
              expr: "⌈ผ้าแผ่ ÷ หน้าผ้า⌉ × ความยาวตัด",
              subst: `⌈${fmt(flat, 2)} ÷ ${fmtTrim(roll, 2)}⌉ = ${fmt(widths)} × ${fmt(cutDrop, 2)} = ${fmt(metres, 2)} ม.`,
            }
          : { label: "เมตร", expr: "ผ้าหน้ากว้าง: ยาวเท่าผ้าแผ่", subst: `${fmt(metres, 2)} ม.` },
        { label: "หลา", expr: `เมตร ÷ ${yard}`, subst: `${fmt(metres, 2)} ÷ ${yard} = ${fmt(yards, 2)} หลา → ${fmt(buyYards)} หลา` },
        eyelet
          ? { label: "ห่วงตาไก่", expr: "⌈ผ้าแผ่ต่อผืน ÷ ระยะห่วง⌉ ปัดเป็นเลขคู่", subst: `⌈${fmt(panelW * fullness, 2)} ÷ ${fmtTrim(spacing, 2)}⌉ → ${fmt(perPanel)} × ${panels} = ${fmt(hooks)} ห่วง`, note: "เลขคู่ให้ริมผ้าทั้งสองข้างพับเข้าหาผนัง" }
          : { label: "ตะขอ", expr: "⌈รางต่อผืน ÷ ระยะตะขอ⌉ + 1", subst: `⌈${fmt(panelW, 2)} ÷ ${fmtTrim(spacing, 2)}⌉ + 1 = ${fmt(perPanel)} × ${panels} = ${fmt(hooks)} ตัว` },
        { label: "ขาจับราง", expr: `⌈ราง ÷ ${CURTAIN.bracketSpacing.value}⌉ + 1`, subst: `⌈${fmt(rail, 2)} ÷ ${CURTAIN.bracketSpacing.value}⌉ + 1 = ${fmt(brackets)} ตัว` },
      ],
      constants: [
        CURTAIN.yard,
        ...(fullKey === "custom" ? [] : [FULLNESS[fullKey]]),
        CURTAIN.extend,
        cut === "narrow" ? CURTAIN.narrowRoll : CURTAIN.wideRoll,
        CURTAIN.topHem,
        CURTAIN.bottomHem,
        CURTAIN.sideHem,
        eyelet ? CURTAIN.ringSpacing : CURTAIN.hookSpacing,
        CURTAIN.bracketSpacing,
      ],
      assumptions: [
        "หน้าผ้าแบ่งครึ่งตามยาวใช้ได้ (ผืนซ้าย-ขวาใช้หน้าผ้าครึ่งได้)",
        "ไม่หักเนื้อผ้าที่เสียไปในตะเข็บต่อหน้าผ้า — ความฟูจริงจะลดลงเล็กน้อย",
        "ลายผ้าต่อกันทุกหน้าผ้าเมื่อใส่ระยะลาย",
      ],
      caveats: ["เผื่อหัว/ชาย/ริม และความฟูแต่ละร้านคิดต่างกัน ถามร้านที่เย็บก่อนสั่งผ้า", "ผ้ามีลายทิศทางหรือผ้ากำมะหยี่ ใช้ผ้าหน้ากว้างแบบหมุนข้างไม่ได้", DISCLAIMER_AB],
      refs: [{ label: "นิยามหลาสากล 0.9144 ม." }, { label: "แนวปฏิบัติร้านม่าน (ความฟู เผื่อหัว-ชาย ระยะตะขอ)" }],
    },
  });
}

/* ─────────── ม่านม้วน / มู่ลี่ ขนาดสั่ง ─────────── */

export function calcBlind(v: Values): CalcResult {
  const bad = guard("blind", v);
  if (bad) return bad;
  const mount = str(v, "mount", "inside");
  const w = num(v, "w", 120);
  const h = num(v, "h", 150);
  const inside = mount === "inside";
  const ow = inside ? w - num(v, "inW", BLIND.insideW.value) : w + 2 * num(v, "outSide", BLIND.outsideSide.value);
  const oh = inside ? h - num(v, "inH", BLIND.insideH.value) : h + num(v, "outTop", BLIND.outsideTop.value) + num(v, "outBot", BLIND.outsideBottom.value);
  const qty = num(v, "qty", 1);
  const unit = str(v, "unit", "m2");
  const price = num(v, "price", BLIND.pricePerM2.value);
  const minArea = num(v, "minArea", BLIND.minArea.value);
  const area = (ow / 100) * (oh / 100);
  const billM2 = Math.max(area, minArea);
  const minApplied = area < minArea - 1e-9;
  const perUnit = unit === "yd2" ? CURTAIN.sqYard.value : 1;
  const billUnits = (billM2 / perUnit) * qty;
  const unitName = unit === "yd2" ? "ตร.หลา" : "ตร.ม.";
  const total = billUnits * price;

  return resultX({
    title: "ม่านม้วน / มู่ลี่ ขนาดสั่ง",
    headline: `สั่ง ${fmtTrim(ow, 1)} × ${fmtTrim(oh, 1)} ซม. × ${fmt(qty)} ผืน · ${fmt(total, 2)} บาท`,
    rows: [
      { label: inside ? "ติดในวงกบ (หักให้ไม่ชนขอบ)" : "ติดนอกวงกบ (ทับขอบกันแสงลอด)", value: `ช่องวัดได้ ${fmtTrim(w, 1)} × ${fmtTrim(h, 1)} ซม.` },
      { label: "ขนาดสั่ง กว้าง × สูง", value: `${fmtTrim(ow, 1)} × ${fmtTrim(oh, 1)} ซม.`, emphasize: true },
      { label: "พื้นที่ต่อผืน", value: `${fmt(area, 3)} ตร.ม.${unit === "yd2" ? ` = ${fmt(area / perUnit, 3)} ตร.หลา` : ""}` },
      { label: "คิดเงินต่อผืน", value: minApplied ? `${fmt(billM2, 3)} ตร.ม. (ขั้นต่ำของร้าน)` : `${fmt(billM2, 3)} ตร.ม.` },
      { label: `รวม ${fmt(qty)} ผืน`, value: `${fmt(billUnits, 3)} ${unitName}` },
      { label: `ราคา ${fmt(price, 2)} บาท/${unitName}`, value: `${fmt(total, 2)} บาท`, emphasize: true },
    ],
    tip: inside ? "ติดในวงกบ: วัดกว้าง 3 จุด (บน กลาง ล่าง) ใช้ค่าน้อยสุด" : "ติดนอกวงกบ: เช็กว่ามือจับ/กลอนหน้าต่างไม่ติดม่าน และมีเนื้อผนังให้ยึดขา",
    explain: {
      risk: "A",
      updatedAt: UPDATED,
      summary: "ในวงกบ: สั่ง = ช่อง − ระยะหัก · นอกวงกบ: สั่ง = ช่อง + ทับขอบ · ราคา = max(พื้นที่, ขั้นต่ำ) × จำนวน × ราคาต่อหน่วย",
      steps: [
        inside
          ? { label: "ขนาดสั่ง", expr: "กว้าง − หักกว้าง · สูง − หักสูง", subst: `${fmtTrim(w, 1)} − ${fmtTrim(w - ow, 1)} = ${fmtTrim(ow, 1)} ซม. · ${fmtTrim(h, 1)} − ${fmtTrim(h - oh, 1)} = ${fmtTrim(oh, 1)} ซม.` }
          : { label: "ขนาดสั่ง", expr: "กว้าง + 2 × ทับข้าง · สูง + บน + ล่าง", subst: `${fmtTrim(w, 1)} + ${fmtTrim(ow - w, 1)} = ${fmtTrim(ow, 1)} ซม. · ${fmtTrim(h, 1)} + ${fmtTrim(oh - h, 1)} = ${fmtTrim(oh, 1)} ซม.` },
        { label: "พื้นที่", expr: "กว้าง (ม.) × สูง (ม.)", subst: `${fmtTrim(ow / 100, 3)} × ${fmtTrim(oh / 100, 3)} = ${fmt(area, 4)} ตร.ม.` },
        {
          label: "ราคา",
          expr: unit === "yd2" ? `max(พื้นที่, ขั้นต่ำ) ÷ ${CURTAIN.sqYard.value} × จำนวน × ราคา` : "max(พื้นที่, ขั้นต่ำ) × จำนวน × ราคา",
          subst: `${fmt(billM2, 4)}${unit === "yd2" ? ` ÷ ${CURTAIN.sqYard.value}` : ""} × ${fmt(qty)} × ${fmt(price, 2)} = ${fmt(total, 2)} บาท`,
        },
      ],
      constants: [
        ...(inside ? [BLIND.insideW, BLIND.insideH] : [BLIND.outsideSide, BLIND.outsideTop, BLIND.outsideBottom]),
        BLIND.minArea,
        ...(unit === "yd2" ? [CURTAIN.sqYard] : []),
      ],
      assumptions: ["ราคาต่อพื้นที่ไม่รวมค่าติดตั้ง/ค่าขนส่ง", "ไม่ปัดขนาดขึ้นเป็นขั้น 10 ซม. (บางร้านปัด ทำให้ราคาขึ้นอีกเล็กน้อย)"],
      caveats: ["ระยะหัก/ทับขอบ และพื้นที่ขั้นต่ำแต่ละร้านไม่เท่ากัน ถามร้านก่อนส่งขนาด", "ม่านม้วนกว้างมากเกินหน้าผ้า/แกนของรุ่นนั้นต้องแบ่งผืน", DISCLAIMER_AB],
      refs: [{ label: "นิยามตารางหลา 0.83612736 ตร.ม." }, { label: "แนวปฏิบัติร้านม่านม้วน/มู่ลี่ (ระยะหักในวงกบ ทับขอบนอกวงกบ)" }],
    },
  });
}

/* ─────────── ฟอร์ม ─────────── */

const fabricFields: Field[] = [
  { type: "number", key: "w", label: "กว้างหน้าต่าง/ช่องที่จะบัง", unit: "ม.", default: 2, min: 0.3, max: 20, step: 0.01 },
  { type: "number", key: "ext", label: "รางยื่นเลยขอบต่อข้าง", unit: "ซม.", default: CURTAIN.extend.value, min: 0, max: 100 },
  { type: "number", key: "h", label: "สูงม่านสำเร็จ (ใต้รางถึงชาย)", unit: "ม.", default: 2.4, min: 0.3, max: 6, step: 0.01 },
  {
    type: "select",
    key: "style",
    label: "แบบม่าน",
    default: "pleat",
    options: [
      { value: "pleat", label: "ม่านจีบ" },
      { value: "eyelet", label: "ม่านตาไก่" },
      { value: "wave", label: "ม่านลอน" },
    ],
  },
  {
    type: "select",
    key: "full",
    label: "ความฟู (ผ้าแผ่ ÷ ราง)",
    default: "2.5",
    options: [
      { value: "2", label: "2 เท่า (ตาไก่ ลอนประหยัด)" },
      { value: "2.5", label: "2.5 เท่า (จีบ ลอนมาตรฐาน)" },
      { value: "3", label: "3 เท่า (จีบแน่น ผ้าบาง)" },
      { value: "custom", label: "กรอกเอง" },
    ],
  },
  { type: "number", key: "fullC", label: "ความฟู", unit: "เท่า", default: 2.5, min: 1, max: 4, step: 0.1, when: { key: "full", is: "custom" } },
  {
    type: "select",
    key: "split",
    label: "เปิด-ปิด",
    default: "2",
    options: [
      { value: "2", label: "แยกกลาง 2 ผืน" },
      { value: "1", label: "ผืนเดียวรูดข้าง" },
    ],
  },
  {
    type: "select",
    key: "cut",
    label: "ชนิดผ้า",
    default: "narrow",
    options: [
      { value: "narrow", label: "ผ้าหน้าแคบ ต่อผืนตามแนวตั้ง" },
      { value: "wide", label: "ผ้าหน้ากว้าง ใช้หน้าผ้าเป็นความสูง" },
    ],
  },
  { type: "number", key: "roll", label: "หน้าผ้า", unit: "ม.", default: CURTAIN.narrowRoll.value, min: 0.9, max: 3.2, step: 0.01, when: { key: "cut", is: "narrow" } },
  { type: "number", key: "wroll", label: "หน้าผ้า (ความสูงที่ได้)", unit: "ม.", default: CURTAIN.wideRoll.value, min: 1.5, max: 3.5, step: 0.01, when: { key: "cut", is: "wide" } },
  { type: "number", key: "top", label: "เผื่อหัวม่าน", unit: "ซม.", default: CURTAIN.topHem.value, min: 0, max: 40 },
  { type: "number", key: "bot", label: "เผื่อชายม่าน", unit: "ซม.", default: CURTAIN.bottomHem.value, min: 0, max: 40 },
  { type: "number", key: "side", label: "พับริมข้างต่อริม", unit: "ซม.", default: CURTAIN.sideHem.value, min: 0, max: 20 },
  { type: "number", key: "repeat", label: "ระยะลายผ้า (0 = ไม่มีลาย)", unit: "ซม.", default: 0, min: 0, max: 150, when: { key: "cut", is: "narrow" } },
  { type: "number", key: "hook", label: "ระยะตะขอ/รันเนอร์", unit: "ซม.", default: CURTAIN.hookSpacing.value, min: 4, max: 30, when: { key: "style", is: ["pleat", "wave"] } },
  { type: "number", key: "ring", label: "ระยะห่วงตาไก่ (บนผ้าแผ่)", unit: "ซม.", default: CURTAIN.ringSpacing.value, min: 10, max: 30, when: { key: "style", is: "eyelet" } },
];

const blindFields: Field[] = [
  {
    type: "select",
    key: "mount",
    label: "ติดตั้ง",
    default: "inside",
    options: [
      { value: "inside", label: "ในวงกบ" },
      { value: "outside", label: "นอกวงกบ (ทับขอบ)" },
    ],
  },
  { type: "number", key: "w", label: "กว้างช่องที่วัดได้", unit: "ซม.", default: 120, min: 20, max: 600, step: 0.1 },
  { type: "number", key: "h", label: "สูงช่องที่วัดได้", unit: "ซม.", default: 150, min: 20, max: 600, step: 0.1 },
  { type: "number", key: "inW", label: "หักความกว้างรวม", unit: "ซม.", default: BLIND.insideW.value, min: 0, max: 5, step: 0.1, when: { key: "mount", is: "inside" } },
  { type: "number", key: "inH", label: "หักความสูง", unit: "ซม.", default: BLIND.insideH.value, min: 0, max: 5, step: 0.1, when: { key: "mount", is: "inside" } },
  { type: "number", key: "outSide", label: "ทับขอบต่อข้าง", unit: "ซม.", default: BLIND.outsideSide.value, min: 0, max: 30, when: { key: "mount", is: "outside" } },
  { type: "number", key: "outTop", label: "เผื่อด้านบน", unit: "ซม.", default: BLIND.outsideTop.value, min: 0, max: 30, when: { key: "mount", is: "outside" } },
  { type: "number", key: "outBot", label: "เลยขอบล่าง", unit: "ซม.", default: BLIND.outsideBottom.value, min: 0, max: 30, when: { key: "mount", is: "outside" } },
  { type: "number", integer: true, key: "qty", label: "จำนวนผืน (ขนาดเดียวกัน)", unit: "ผืน", default: 1, min: 1, max: 100 },
  {
    type: "select",
    key: "unit",
    label: "ร้านคิดราคาต่อ",
    default: "m2",
    options: [
      { value: "m2", label: "ตารางเมตร" },
      { value: "yd2", label: "ตารางหลา" },
    ],
  },
  { type: "number", key: "price", label: "ราคาต่อหน่วยพื้นที่", unit: "บาท", default: BLIND.pricePerM2.value, min: 0, max: 100000 },
  { type: "number", key: "minArea", label: "พื้นที่ขั้นต่ำที่ร้านคิดต่อผืน", unit: "ตร.ม.", default: BLIND.minArea.value, min: 0, max: 5, step: 0.1 },
];

export const curtainTools: ToolDef[] = [
  {
    id: "fabric",
    name: "ผ้าม่านกี่เมตร / กี่หลา",
    blurb: "ความฟู หน้าผ้า ลายผ้า ตะขอ ราง",
    keywords: ["ผ้าม่าน", "ม่านจีบ", "ม่านตาไก่", "ม่านลอน", "หลา", "ความฟู", "ราง"],
    fields: fabricFields,
    calc: calcCurtainFabric,
  },
  {
    id: "blind",
    name: "ม่านม้วน / มู่ลี่ ขนาดสั่ง",
    blurb: "ในวงกบ นอกวงกบ ตร.ม. ราคา",
    keywords: ["ม่านม้วน", "มู่ลี่", "roller", "blind", "ม่านปรับแสง", "ตร.หลา"],
    fields: blindFields,
    calc: calcBlind,
  },
];
