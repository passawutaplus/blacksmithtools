import type { JobDef, ToolDef, Values } from "../types";
import { blockedResult, ceil, fmt, guardInputs, guardTool, jobFromParts, num, resultX, round, str, withDefaults } from "../math";
import { BRICKS, DISCLAIMER_AB, DISCLAIMER_C, LINTEL, MASONRY, MASONRY_BAGS, MIX, STEEL_FORMULA } from "../constants";

const guard = (id: string, v: Values) => guardTool(masonryTools, id, v) ?? wallGuard(v);

/** หักช่องเปิดจนไม่เหลือผนัง = กรอกผิด ต้องบอก ไม่ใช่ตอบ 0 ก้อนเงียบ ๆ */
function wallGuard(v: Values) {
  if (v.w === undefined && v.h === undefined) return null;
  const gross = num(v, "w", 4) * num(v, "h", 3);
  const open = num(v, "open", 0);
  if (open < gross) return null;
  return blockedResult({
    headline: `หักช่องเปิด ${fmt(open, 2)} ตร.ม. มากกว่าพื้นที่ผนัง ${fmt(gross, 2)} ตร.ม. — ไม่เหลือผนังให้คิด`,
    tip: "เช็กขนาดผนังและพื้นที่ประตู-หน้าต่างที่หักออกอีกครั้ง",
  });
}

function brickOf(v: Values) {
  const kind = str(v, "kind", "clayTis77");
  return BRICKS[kind] ?? BRICKS.clayTis77;
}

/** ความหนาปูนก่อ (มม.) — "auto" ใช้ค่าที่เหมาะกับชนิดอิฐ */
function jointOf(v: Values, brick: { joint: number }) {
  const pick = str(v, "joint", "auto");
  if (pick === "auto") return brick.joint;
  const mm = Number(pick);
  return Number.isFinite(mm) && mm > 0 ? mm : brick.joint;
}

/** ขนาดถุงที่ผู้ใช้เลือก (กก.) — ไม่ส่งมาใช้ 50 กก. */
function bagOf(v: Values) {
  return (MASONRY_BAGS[str(v, "bag", "50")] ?? MASONRY.bag).value;
}

function wallM2(v: Values) {
  return Math.max(0, num(v, "w", 4) * num(v, "h", 3) - num(v, "open", 0));
}

/** จำนวนก้อนต่อ 1 ตร.ม. คิดจากเรขาคณิตของหน้าอิฐ + ความหนาปูน */
export function bricksPerM2(faceL: number, faceH: number, joint: number) {
  return 1_000_000 / ((faceL + joint) * (faceH + joint));
}

export function calcBrick(v: Values) {
  const bad = guard("brick", v);
  if (bad) return bad;
  const net = wallM2(v);
  const b = brickOf(v);
  const joint = jointOf(v, b);
  const perM2 = bricksPerM2(b.faceL, b.faceH, joint);
  const raw = net * perM2;
  const qty = ceil(raw * (1 + b.waste / 100));

  const brickShare = (b.faceL * b.faceH) / ((b.faceL + joint) * (b.faceH + joint));

  return resultX({
    title: "จำนวนอิฐ",
    headline: `${fmt(qty)} ก้อน`,
    chart: {
      kind: "stack",
      parts: [
        {
          label: "เนื้ออิฐ",
          value: brickShare,
          display: `${fmt(brickShare * 100, 1)}%`,
          tone: "accent",
        },
        {
          label: `แนวปูนก่อ ${fmt(joint)} มม.`,
          value: 1 - brickShare,
          display: `${fmt((1 - brickShare) * 100, 1)}%`,
          tone: "mute",
        },
      ],
      totalLabel: "ผนัง 1 ตร.ม. ใช้อิฐ",
      totalDisplay: `${fmt(perM2, 1)} ก้อน`,
    },
    rows: [
      { label: "พื้นที่สุทธิ", value: `${fmt(net, 2)} ตร.ม.` },
      { label: "ชนิดอิฐ", value: b.name },
      { label: "หน้าอิฐที่เห็น", value: `${fmt(b.faceL)} × ${fmt(b.faceH)} มม.` },
      { label: "ความหนาปูนก่อ", value: `${fmt(joint)} มม.` },
      { label: "ก้อนต่อ ตร.ม.", value: `${fmt(perM2, 1)} ก้อน` },
      { label: "เผื่อแตกหัก", value: `${fmt(b.waste)}%` },
      { label: "จำนวนที่ต้องใช้", value: `${fmt(qty)} ก้อน`, emphasize: true },
    ],
    tip: "อิฐมอญต่างเตาสีต่างกัน ดู Lot ให้ตรง มวลเบายอมคลาดได้ ±2 มม.",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "ก้อน/ตร.ม. = 1,000,000 ÷ ((ยาวหน้าอิฐ + ปูน) × (สูงหน้าอิฐ + ปูน))  หน่วยเป็น มม.",
      steps: [
        {
          label: "พื้นที่ผนังสุทธิ",
          expr: "A = กว้าง × สูง − ช่องเปิด",
          subst: `A = ${fmt(num(v, "w", 4), 2)} × ${fmt(num(v, "h", 3), 2)} − ${fmt(num(v, "open", 0), 2)} = ${fmt(net, 2)} ตร.ม.`,
        },
        {
          label: "พื้นที่ที่อิฐ 1 ก้อนกินบนผนัง",
          expr: "(ยาว + ปูน) × (สูง + ปูน)",
          subst: `(${fmt(b.faceL)} + ${fmt(joint)}) × (${fmt(b.faceH)} + ${fmt(joint)}) = ${fmt((b.faceL + joint) * (b.faceH + joint))} ตร.มม.`,
          note: "นับแนวปูนรวมไปกับก้อน เพราะก่อจริงมีปูนคั่นทุกก้อน",
        },
        {
          label: "จำนวนก้อนต่อตารางเมตร",
          expr: "n = 1,000,000 ÷ พื้นที่ต่อก้อน",
          subst: `n = 1,000,000 ÷ ${fmt((b.faceL + joint) * (b.faceH + joint))} = ${fmt(perM2, 1)} ก้อน/ตร.ม.`,
        },
        {
          label: "คิดทั้งผนัง + เผื่อแตกหัก",
          expr: "จำนวน = A × n × (1 + เผื่อ) ปัดขึ้น",
          subst: `${fmt(net, 2)} × ${fmt(perM2, 1)} × ${fmt(1 + b.waste / 100, 2)} = ${fmt(raw * (1 + b.waste / 100), 1)} → ${fmt(qty)} ก้อน`,
        },
      ],
      assumptions: [
        `ก่อผนังชั้นเดียว ผนังหนา ${fmt(b.wallT)} มม. (${b.name})`,
        "แนวปูนสม่ำเสมอตามค่าที่เลือก",
      ],
      caveats: [
        "อิฐมอญขนาดไม่นิ่ง ต่างเตาต่างขนาดได้ 2–3 มม. ทำให้จำนวนจริงต่างจากนี้",
        "ผนังที่มีเสาเอ็น-ทับหลังเยอะ ต้องหักพื้นที่ส่วนนั้นออกก่อน",
        DISCLAIMER_AB,
      ],
      refs: [{ label: b.source }, { label: "มอก. 77 อิฐก่อสร้างสามัญ · มอก. 1505 อิฐมวลเบา" }],
    },
  });
}

export function calcMortar(v: Values) {
  const bad = guard("mortar", v);
  if (bad) return bad;
  const net = wallM2(v);
  const b = brickOf(v);
  const joint = jointOf(v, b);
  const bag = bagOf(v);
  const wastePct = num(v, "mwaste", 0);
  const wasteText = wastePct > 0 ? ` (รวมเผื่อ ${fmt(wastePct)}%)` : "";

  if (b.thinBed) {
    const kg = net * MASONRY.thinBedPerM2.value * (1 + wastePct / 100);
    const bags = ceil(kg / bag);
    const coverage = bag / MASONRY.thinBedPerM2.value;
    return resultX({
      title: "ปูนก่อ",
      headline: `ปูนกาวก่อมวลเบา ${bags} ถุง`,
      chart:
        bags > 0
          ? {
              kind: "packs",
              unitLabel: `ถุง ${bag} กก.`,
              count: bags,
              lastUsed: (kg - (bags - 1) * bag) / bag,
              note: `ถุงละก่อได้ประมาณ ${fmt(coverage, 1)} ตร.ม.`,
            }
          : undefined,
      rows: [
        { label: "พื้นที่สุทธิ", value: `${fmt(net, 2)} ตร.ม.` },
        { label: "อัตราใช้", value: `${MASONRY.thinBedPerM2.value} กก./ตร.ม.` },
        { label: "ปูนกาวก่อ", value: `${fmt(kg, 1)} กก.${wasteText}` },
        { label: `ปูนกาวก่อ (ถุง ${bag} กก.)`, value: `${bags} ถุง`, emphasize: true },
        { label: "ถุงละได้ประมาณ", value: `${fmt(coverage, 1)} ตร.ม.` },
      ],
      tip: "มวลเบาต้องใช้ปูนกาวของระบบเดียวกัน ห้ามใช้ปูนก่อมอญแทน กำลังยึดไม่ถึง",
      explain: {
        risk: "B",
        updatedAt: "2026-08-21",
        summary: "ปูนกาวก่อ (กก.) = พื้นที่ผนัง × อัตราใช้ต่อตารางเมตร",
        steps: [
          {
            label: "พื้นที่ผนังสุทธิ",
            expr: "A = กว้าง × สูง − ช่องเปิด",
            subst: `A = ${fmt(net, 2)} ตร.ม.`,
          },
          {
            label: "น้ำหนักปูนกาว",
            expr: "kg = A × อัตราใช้ × (1 + เผื่อ)",
            subst: `kg = ${fmt(net, 2)} × ${MASONRY.thinBedPerM2.value} × ${fmt(1 + wastePct / 100, 2)} = ${fmt(kg, 1)} กก.`,
            note: `รอยต่อบาง ${fmt(joint)} มม. ตามระบบมวลเบา`,
          },
          {
            label: "แปลงเป็นถุง",
            expr: `ถุง = kg ÷ ${bag} ปัดขึ้น`,
            subst: `${fmt(kg, 1)} ÷ ${bag} = ${bags} ถุง`,
          },
        ],
        constants: [MASONRY.thinBedPerM2, MASONRY_BAGS[String(bag)] ?? MASONRY.bag],
        assumptions: ["ก่อด้วยเกรียงหวีของระบบมวลเบา รอยต่อ 2–3 มม.", "ผนังชั้นเดียว ก่อเรียบไม่ต้องปรับระดับหนา"],
        caveats: [
          "อัตราใช้ต่างกันตามยี่ห้อ ถุง 50 กก. ก่อได้ 25–40 ตร.ม. ให้ยึด TDS ของถุงที่ซื้อ",
          "ถ้าอิฐไม่เรียบต้องปูปูนหนาขึ้น จะกินปูนมากกว่านี้",
          DISCLAIMER_AB,
        ],
        refs: [{ label: "TDS ปูนก่อมวลเบา (อัตราการใช้ต่อถุง 50 กก.)" }],
      },
    });
  }

  const fraction = 1 - (b.faceL * b.faceH) / ((b.faceL + joint) * (b.faceH + joint));
  const m3 = net * (b.wallT / 1000) * fraction * (1 + wastePct / 100);
  const cementKg = m3 * MASONRY.cementPerM3Mortar.value;
  const cementBags = ceil(cementKg / bag);
  const sand = round(m3 * MASONRY.sandPerM3Mortar.value, 2);
  // อัตราปูนก่อสำเร็จในทะเบียนเป็น "ต่อถุง 50 กก." จึงเทียบสัดส่วนตามขนาดถุงที่เลือก
  const readyCoverage = (MASONRY.readyMortarCoverage.value * bag) / MASONRY.bag.value;
  const readyBags = ceil((net * (1 + wastePct / 100)) / readyCoverage);

  return resultX({
    title: "ปูนก่อ",
    headline: `ปูนซีเมนต์ ${cementBags} ถุง + ทราย ${fmt(sand, 2)} คิว`,
    chart:
      cementBags > 0
        ? {
            kind: "packs",
            unitLabel: `ถุงปูน ${bag} กก.`,
            count: cementBags,
            lastUsed: (cementKg - (cementBags - 1) * bag) / bag,
            note: `ผสมกับทราย ${fmt(sand, 2)} คิว · หรือใช้ปูนก่อสำเร็จ ${readyBags} ถุงแทน`,
          }
        : undefined,
    rows: [
      { label: "พื้นที่สุทธิ", value: `${fmt(net, 2)} ตร.ม.` },
      { label: "สัดส่วนปูนในผนัง", value: `${fmt(fraction * 100, 1)}% ของหน้าผนัง` },
      { label: "ปริมาตรมอร์ตาร์", value: `${fmt(m3, 3)} ลบ.ม.${wasteText}` },
      { label: `ปูนซีเมนต์งานก่อ (ถุง ${bag} กก.)`, value: `${cementBags} ถุง`, emphasize: true },
      { label: "ทรายงานก่อ", value: `${fmt(sand, 2)} ลบ.ม. (คิว)`, emphasize: true },
      { label: `ถ้าใช้ปูนก่อสำเร็จแทน (ถุง ${bag} กก.)`, value: `${readyBags} ถุง` },
    ],
    tip:
      wastePct > 0
        ? "ผสมเองใช้ 1:3 ถ้าอยากเร็วใช้ปูนก่อสำเร็จ ถุง 50 กก. ก่อได้ประมาณ 1.4 ตร.ม."
        : "ตัวเลขนี้เป็นปูนในแนวก่อล้วน ๆ ยังไม่เผื่อปูนตกหล่น ใส่ % เผื่อได้ในช่อง “เผื่อปูนตกหล่น”",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "ปริมาตรปูน = พื้นที่ผนัง × ความหนาผนัง × สัดส่วนที่เป็นแนวปูน",
      steps: [
        {
          label: "สัดส่วนที่เป็นแนวปูน",
          expr: "f = 1 − (ยาว × สูง) ÷ ((ยาว + ปูน) × (สูง + ปูน))",
          subst: `f = 1 − (${fmt(b.faceL)} × ${fmt(b.faceH)}) ÷ (${fmt(b.faceL + joint)} × ${fmt(b.faceH + joint)}) = ${fmt(fraction, 3)}`,
          note: "คือเนื้อที่หน้าผนังที่ไม่ใช่ตัวอิฐ",
        },
        {
          label: "ปริมาตรมอร์ตาร์",
          expr: "V = A × ความหนาผนัง × f × (1 + เผื่อ)",
          subst: `V = ${fmt(net, 2)} × ${fmt(b.wallT / 1000, 3)} × ${fmt(fraction, 3)} × ${fmt(1 + wastePct / 100, 2)} = ${fmt(m3, 3)} ลบ.ม.`,
        },
        {
          label: "แยกเป็นปูนกับทราย (1:3)",
          expr: "ปูน = V × 450 กก./ลบ.ม. · ทราย = V × 1.05",
          subst: `ปูน = ${fmt(cementKg, 1)} กก. → ${cementBags} ถุง · ทราย = ${fmt(sand, 2)} ลบ.ม.`,
        },
        {
          label: "ทางเลือกปูนก่อสำเร็จ",
          expr: `ถุง = A × (1 + เผื่อ) ÷ ${fmt(readyCoverage, 2)} ตร.ม./ถุง ${bag} กก.`,
          subst: `${fmt(net * (1 + wastePct / 100), 2)} ÷ ${fmt(readyCoverage, 2)} = ${readyBags} ถุง`,
        },
      ],
      constants: [MASONRY.cementPerM3Mortar, MASONRY.sandPerM3Mortar, MASONRY.readyMortarCoverage, MASONRY_BAGS[String(bag)] ?? MASONRY.bag],
      assumptions: ["ก่อผนังชั้นเดียว แนวปูนเต็มทั้งแนวนอนและแนวตั้ง", "มอร์ตาร์ผสม 1:3 ตามงานก่อทั่วไป"],
      caveats: [
        wastePct > 0
          ? `รวมเผื่อปูนตกหล่น ${fmt(wastePct)}% ตามที่กรอกแล้ว`
          : "ยังไม่เผื่อปูนตกหล่น — หน้างานจริงใช้มากกว่าปริมาตรแนวปูนตามทฤษฎี ใส่ % เผื่อเองได้",
        "อัตราส่วนปูนซีเมนต์ต่อลูกบาศก์เมตรเป็นค่าประมาณราคางานก่อสร้าง ไม่ใช่มาตรฐานบังคับ",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวปฏิบัติงานประมาณราคางานก่ออิฐ (มอร์ตาร์ 1:3)" }, { label: "TDS ปูนก่อสำเร็จรูป" }],
    },
  });
}

export function calcPlaster(v: Values) {
  const bad = guard("plaster", v);
  if (bad) return bad;
  const net = wallM2(v);
  const kind = str(v, "pkind", "normal");
  const sides = Math.max(1, Math.round(num(v, "sides", 1)));
  const thickRef =
    kind === "thin"
      ? MASONRY.plasterThickThin
      : kind === "skim"
        ? MASONRY.plasterThickSkim
        : MASONRY.plasterThickNormal;
  const custom = num(v, "thick", 0);
  const thick = custom > 0 ? custom : thickRef.value;
  const thickNote = custom > 0 ? "กำหนดเอง" : thickRef.label;
  const bag = bagOf(v);
  const name = kind === "skim" ? "สกิมโค้ท" : kind === "thin" ? "ปูนฉาบบาง" : "ปูนฉาบ";
  const area = net * sides;
  const kg = area * thick * MASONRY.plasterPerM2PerMm.value;
  const bags = ceil(kg / bag);
  const coverage = bag / (thick * MASONRY.plasterPerM2PerMm.value);

  return resultX({
    title: "ปูนฉาบ",
    headline: `${name} ${bags} ถุง (ถุง ${bag} กก.)`,
    chart:
      bags > 0
        ? {
            kind: "packs",
            unitLabel: `ถุง ${bag} กก.`,
            count: bags,
            lastUsed: (kg - (bags - 1) * bag) / bag,
            note: `ถุงละฉาบได้ประมาณ ${fmt(coverage, 2)} ตร.ม. ที่ความหนา ${fmt(thick)} มม.`,
          }
        : undefined,
    rows: [
      { label: "พื้นที่ผนัง", value: `${fmt(net, 2)} ตร.ม. × ${sides} ด้าน` },
      { label: "พื้นที่ฉาบรวม", value: `${fmt(area, 2)} ตร.ม.` },
      { label: "ความหนาฉาบ", value: `${fmt(thick)} มม. (${thickNote})` },
      { label: `${name} รวม`, value: `${fmt(kg, 1)} กก.` },
      { label: `${name} (ถุง ${bag} กก.)`, value: `${bags} ถุง`, emphasize: true },
      { label: "ถุงละได้ประมาณ", value: `${fmt(coverage, 2)} ตร.ม.` },
    ],
    tip:
      kind === "thin" && custom <= 0
        ? "ฉาบบาง 5 มม. คือผนังมวลเบาที่ก่อได้ระนาบ ถ้าหน้างานฉาบหนากว่านี้ ใส่ความหนาจริงในช่อง “หนาฉาบจริง”"
        : "ฉาบ 15 มม. คืองานบ้านทั่วไป มวลเบาใช้ระบบฉาบบางของยี่ห้อเดียวกัน เลือกขนาดถุงให้ตรงกับที่ซื้อ",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "ปูนฉาบ (กก.) = พื้นที่ฉาบ × ความหนา (มม.) × อัตราใช้ต่อ มม.",
      steps: [
        {
          label: "พื้นที่ฉาบรวม",
          expr: "A = (กว้าง × สูง − ช่องเปิด) × จำนวนด้าน",
          subst: `A = ${fmt(net, 2)} × ${sides} = ${fmt(area, 2)} ตร.ม.`,
        },
        {
          label: "น้ำหนักปูนฉาบ",
          expr: `kg = A × ความหนา × ${MASONRY.plasterPerM2PerMm.value}`,
          subst: `kg = ${fmt(area, 2)} × ${fmt(thick)} × ${MASONRY.plasterPerM2PerMm.value} = ${fmt(kg, 1)} กก.`,
          note: "อัตรานี้ถอดมาจาก TDS: ถุง 50 กก. ฉาบหนา 10 มม. ได้ 2.2–2.8 ตร.ม.",
        },
        {
          label: "แปลงเป็นถุง",
          expr: `ถุง = kg ÷ ${bag} ปัดขึ้น`,
          subst: `${fmt(kg, 1)} ÷ ${bag} = ${bags} ถุง`,
        },
      ],
      constants: [thickRef, MASONRY.plasterPerM2PerMm, MASONRY_BAGS[String(bag)] ?? MASONRY.bag],
      assumptions: ["ผนังได้ระนาบพอควร ไม่ต้องฉาบปรับหนาเป็นพิเศษ", "ยังไม่รวมปูนฉาบเก็บมุมและจับเซี้ยม"],
      caveats: [
        "ผนังไม่ตรงหรือต้องปรับระดับมาก กินปูนมากกว่านี้หลายเท่า",
        "อัตราการใช้ต่างกันตามยี่ห้อ ให้ยึด TDS ของถุงที่ซื้อจริง",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "TDS ปูนฉาบสำเร็จรูป (อัตราการใช้ต่อถุง 50 กก. ที่ความหนา 10 มม.)" }],
    },
  });
}

export function calcLintel(v: Values) {
  const bad = guardTool(masonryTools, "lintel", v);
  if (bad) return bad;
  const n = num(v, "n", 2);
  const width = num(v, "width", 1);
  if (width > LINTEL.maxSpan.value) {
    return blockedResult({
      headline: `ช่องเปิดกว้าง ${fmt(width, 2)} ม. เกิน ${fmt(LINTEL.maxSpan.value)} ม. — ต้องให้วิศวกรออกแบบคานทับหลัง`,
      tip: "ทับหลัง 10×10 ซม. เหล็ก RB6 ใช้ได้กับช่องเปิดไม่เกิน 2 ม. กว้างกว่านี้ต้องเป็นคานคอนกรีตเสริมเหล็กหรือคานเหล็กที่วิศวกรกำหนดหน้าตัดและเหล็กเสริม เครื่องมือนี้จึงไม่ให้ตัวเลขเหล็ก",
    });
  }
  const bearing = MASONRY.lintelBearing.value;
  const len = width + bearing * 2;
  const conc = n * len * 0.1 * 0.1;
  const nStirrup = Math.ceil(len / LINTEL.stirrupSpacing.value) + 1;
  const longBars = LINTEL.bars.value * len;
  const stirrups = nStirrup * LINTEL.stirrupLen.value;
  const rb6 = n * (longBars + stirrups);
  const rb6Bars = ceil(rb6 / STEEL_FORMULA.rebarStock.value);

  return resultX({
    title: "ทับหลังช่องเปิด",
    headline: `ทับหลัง ${fmt(n)} ชุด`,
    chart: {
      kind: "stack",
      parts: [
        { label: "กว้างช่องเปิด", value: width, display: `${fmt(width, 2)} ม.`, tone: "accent" },
        { label: `ฝังเข้าผนัง ×2`, value: bearing * 2, display: `${fmt(bearing * 2, 2)} ม.`, tone: "mute" },
      ],
      totalLabel: "ยาวทับหลัง/ชุด",
      totalDisplay: `${fmt(len, 2)} ม.`,
    },
    rows: [
      { label: "ความยาว/ชุด", value: `${fmt(len, 2)} ม. (ฝังเข้าผนัง ${fmt(bearing * 100)} ซม./ข้าง)` },
      { label: "คอนกรีต 10×10", value: `${fmt(conc, 3)} ลบ.ม.` },
      {
        label: "เหล็ก RB6 ประมาณ",
        value: `${fmt(rb6, 1)} ม. = ${fmt(rb6Bars)} เส้น (เส้นละ ${fmt(STEEL_FORMULA.rebarStock.value)} ม.)`,
        emphasize: true,
      },
    ],
    tip: "ช่องเปิดทุกบานควรมีทับหลัง อย่าให้อิฐรับเอง เหล็กเส้นคิดเป็นเส้น 10 ม. ยังไม่เผื่อระยะทาบ",
    explain: {
      risk: "C",
      updatedAt: "2026-11-25",
      summary: "ทับหลังต้องยาวกว่าช่องเปิด โดยฝังเข้าผนังทั้งสองข้างเพื่อถ่ายน้ำหนักอิฐด้านบนลงเสา/ผนังข้างช่อง",
      steps: [
        {
          label: "ความยาวทับหลังต่อชุด",
          expr: "ยาว = กว้างช่องเปิด + ระยะฝัง×2",
          subst: `${fmt(width, 2)} + ${fmt(bearing, 2)}×2 = ${fmt(len, 2)} ม.`,
        },
        {
          label: "ปริมาตรคอนกรีตหน้าตัด 10×10 ซม.",
          expr: "V = จำนวน × ยาว × 0.1 × 0.1",
          subst: `${fmt(n)} × ${fmt(len, 2)} × 0.01 = ${fmt(conc, 3)} ลบ.ม.`,
        },
        {
          label: "เหล็กเสริม RB6 ประมาณ",
          expr: `เหล็กยืน ${LINTEL.bars.value} เส้น + ปลอกทุก ${LINTEL.stirrupSpacing.value * 100} ซม. (ยาวปลอก ${LINTEL.stirrupLen.value} ม.)`,
          subst: `${fmt(n)} ชุด × (${fmt(LINTEL.bars.value)}×${fmt(len, 2)} + ${nStirrup} ปลอก × ${LINTEL.stirrupLen.value}) = ${fmt(rb6, 1)} ม.`,
        },
      ],
      assumptions: ["ทับหลังหน้าตัดคอนกรีตเสริมเหล็ก 10×10 ซม. รับช่องเปิดผนังก่ออิฐ/บล็อกทั่วไป", "ไม่ใช่ทับหลังรับผนังสูงพิเศษหรือรับคานพาดต่อ"],
      caveats: [
        "ช่องเปิดกว้างเกิน 2 ม. หรือมีน้ำหนักพิเศษกดทับ (เช่น คานพาดหรือชั้นบนกดตรงช่วงนี้) ต้องให้วิศวกรออกแบบหน้าตัดและเหล็กเสริมเอง",
        "ระยะฝังทับหลังเข้าผนังน้อยกว่า 15 ซม. เสี่ยงทับหลังหลุดหรือแตกร้าวที่ปลาย",
        DISCLAIMER_C,
      ],
      refs: [{ label: "แนวปฏิบัติงานโครงสร้างบ้านพักอาศัย (ทับหลังคอนกรีตเสริมเหล็ก)" }],
    },
  });
}

export function calcMix(v: Values) {
  const bad = guardTool(masonryTools, "mix", v);
  if (bad) return bad;
  const m3 = num(v, "m3", 0.3);
  const ratio = str(v, "ratio", "124");
  const parts = ratio === "112" ? [1, 1, 2] : ratio === "136" ? [1, 3, 6] : [1, 2, 4];
  const sum = parts[0] + parts[1] + parts[2];
  // ปูน ทราย หิน ตวงแบบหลวมรวมกันต้องมากกว่าปริมาตรคอนกรีตที่เทได้ เพราะเนื้อเล็กเข้าไปอุดช่องว่างเนื้อใหญ่
  const dryFactor = MIX.dryVolume.value;
  const bag = bagOf(v);
  const dryM3 = m3 * dryFactor;
  const cementM3 = (dryM3 * parts[0]) / sum;
  const cementKg = cementM3 * MASONRY.cementBulkDensity.value;
  const bagsExact = cementKg / bag;
  const bags = ceil(bagsExact);
  const sand = round((dryM3 * parts[1]) / sum, 2);
  const rock = round((dryM3 * parts[2]) / sum, 2);
  const water = round(cementKg * (MASONRY.waterPerBag.value / MASONRY.bag.value), 0);

  return resultX({
    title: "สัดส่วนผสม",
    headline: `ปูน ${bags} ถุง · ทราย ${fmt(sand, 2)} คิว · หิน ${fmt(rock, 2)} คิว`,
    chart: {
      kind: "stack",
      parts: [
        { label: "ปูนซีเมนต์", value: parts[0], display: `${bags} ถุง`, tone: "accent" },
        { label: "ทราย", value: parts[1], display: `${fmt(sand, 2)} คิว`, tone: "warn" },
        { label: "หิน", value: parts[2], display: `${fmt(rock, 2)} คิว`, tone: "mute" },
      ],
      totalLabel: "สัดส่วนโดยปริมาตร",
      totalDisplay: parts.join(" : "),
    },
    rows: [
      { label: "งานคอนกรีต", value: `${fmt(m3, 2)} ลบ.ม. (คิว)` },
      { label: `ปูนซีเมนต์ (ถุง ${bag} กก.)`, value: `${bags} ถุง (คิดได้ ${fmt(bagsExact, 1)} ถุง)`, emphasize: true },
      { label: "ทราย", value: `${fmt(sand, 2)} ลบ.ม. (คิว)` },
      { label: "หิน", value: `${fmt(rock, 2)} ลบ.ม. (คิว)` },
      { label: "น้ำประมาณ", value: `${fmt(water)} ลิตร` },
    ],
    tip: "1:2:4 งานบ้านทั่วไป อย่าใส่น้ำจนไหล กำลังอัดจะตกลงเยอะกว่าที่คิด",
    explain: {
      risk: "C",
      updatedAt: "2026-11-25",
      summary: `ปริมาตรวัสดุแห้ง = ปริมาตรคอนกรีต × ${dryFactor} แล้วแบ่งตามสัดส่วน ปูน:ทราย:หิน และแปลงส่วนของปูนเป็นถุง`,
      steps: [
        {
          label: "ปริมาตรวัสดุแห้งรวม",
          expr: `V_แห้ง = ปริมาตรคอนกรีต × ${dryFactor}`,
          subst: `V_แห้ง = ${fmt(m3, 2)} × ${dryFactor} = ${fmt(dryM3, 3)} ลบ.ม.`,
          note: "ปูน ทราย หิน ตอนตวงยังหลวมและมีช่องว่าง พอผสมน้ำแล้วยุบลง จึงต้องใช้วัสดุแห้งมากกว่าปริมาตรที่เทได้ราว 1.5 เท่า",
        },
        {
          label: "ส่วนของปูนซีเมนต์",
          expr: "V_ปูน = V_แห้ง × ส่วนปูน ÷ ผลรวมส่วน",
          subst: `V_ปูน = ${fmt(dryM3, 3)} × ${parts[0]} ÷ ${sum} = ${fmt(cementM3, 3)} ลบ.ม.`,
        },
        {
          label: "แปลงเป็นถุง",
          expr: `ถุง = V_ปูน × ${MASONRY.cementBulkDensity.value} ÷ ${bag} ปัดขึ้น`,
          subst: `${fmt(cementKg, 1)} กก. ÷ ${bag} = ${fmt(bagsExact, 2)} → ${bags} ถุง`,
        },
        {
          label: "ทรายและหิน",
          expr: "V_แห้ง × ส่วนของตัวเอง ÷ ผลรวมส่วน",
          subst: `ทราย ${fmt(dryM3, 3)} × ${parts[1]} ÷ ${sum} = ${fmt(sand, 2)} ลบ.ม. · หิน ${fmt(dryM3, 3)} × ${parts[2]} ÷ ${sum} = ${fmt(rock, 2)} ลบ.ม.`,
        },
        {
          label: "น้ำที่ใช้ผสม",
          expr: `น้ำ = กก.ปูนก่อนปัดถุง × ${MASONRY.waterPerBag.value / MASONRY.bag.value} (w/c ≈ 0.5)`,
          subst: `${fmt(cementKg, 1)} × ${MASONRY.waterPerBag.value / MASONRY.bag.value} = ${fmt(water)} ลิตร`,
          note: "เติมน้ำทีละน้อย ให้ได้ความข้นที่เทได้พอดี",
        },
      ],
      constants: [MIX.dryVolume, MASONRY.cementBulkDensity, MASONRY.waterPerBag, MASONRY_BAGS[String(bag)] ?? MASONRY.bag],
      assumptions: [
        "ผสมตามสัดส่วนปริมาตรแบบหน้างาน ไม่ใช่การออกแบบส่วนผสมตามกำลังอัดที่ต้องการ",
        "วัสดุแห้งพอสมควร ทรายไม่อุ้มน้ำเกินปกติ",
        "ทรายและหินเป็นปริมาตรตวงหลวม ยังไม่บวกเผื่อหกหล่น — ทรายชื้นพองตัวได้อีก 15–30% สั่งเผื่อตามสภาพกอง",
      ],
      caveats: [
        "สัดส่วนปริมาตรให้กำลังอัดไม่แน่นอนเท่าการออกแบบส่วนผสมโดยห้องปฏิบัติการ",
        "งานโครงสร้างรับน้ำหนัก (เสา คาน ฐานราก พื้น) ต้องใช้กำลังอัดที่วิศวกรกำหนด หรือสั่งคอนกรีตผสมเสร็จตามชั้นคุณภาพ",
        "น้ำเกินคือสาเหตุอันดับหนึ่งที่ทำให้คอนกรีตกำลังตก แม้สัดส่วนของแข็งถูกต้อง",
        DISCLAIMER_C,
      ],
      refs: [
        { label: "มอก. 213 คอนกรีตผสมเสร็จ · มอก. 15 ปูนซีเมนต์ปอร์ตแลนด์" },
        { label: "ACI 211.1 แนวทางการออกแบบส่วนผสมคอนกรีต" },
      ],
    },
  });
}

const wall = [
  { type: "number" as const, key: "w", label: "กว้างผนัง", unit: "ม.", default: 4, min: 0.5, max: 100, step: 0.1 },
  { type: "number" as const, key: "h", label: "สูงผนัง", unit: "ม.", default: 3, min: 0.5, max: 20, step: 0.1 },
  { type: "number" as const, key: "open", label: "หักประตู/หน้าต่าง", unit: "ตร.ม.", default: 0, min: 0, max: 2000, step: 0.1 },
];

const brickKind = {
  type: "select" as const,
  key: "kind",
  label: "ชนิดอิฐ",
  default: "clayTis77",
  options: Object.entries(BRICKS).map(([value, b]) => ({ value, label: b.name })),
};

const bagField = {
  type: "select" as const,
  key: "bag",
  label: "ขนาดถุงที่ซื้อ",
  default: "50",
  options: [
    { value: "50", label: "ถุง 50 กก." },
    { value: "40", label: "ถุง 40 กก." },
    { value: "20", label: "ถุง 20 กก. (สกิม/ปูนกาวบางยี่ห้อ)" },
  ],
};

const mortarWasteField = {
  type: "number" as const,
  key: "mwaste",
  label: "เผื่อปูนตกหล่น",
  unit: "%",
  default: 0,
  min: 0,
  max: 30,
};

const thickField = {
  type: "number" as const,
  key: "thick",
  label: "หนาฉาบจริง (0 = ตามชนิด)",
  unit: "มม.",
  default: 0,
  min: 0,
  max: 40,
};

const jointField = {
  type: "select" as const,
  key: "joint",
  label: "ความหนาปูนก่อ",
  default: "auto",
  options: [
    { value: "auto", label: "ตามชนิดอิฐ (แนะนำ)" },
    { value: "3", label: "3 มม. (ก่อบาง)" },
    { value: "10", label: "10 มม." },
    { value: "15", label: "15 มม." },
    { value: "20", label: "20 มม." },
  ],
};

export const masonryTools: ToolDef[] = [
  {
    id: "brick",
    name: "จำนวนอิฐ",
    blurb: "มอญ / บล็อก / มวลเบา คิดจากขนาดก้อนจริง",
    fields: [...wall, brickKind, jointField],
    calc: calcBrick,
  },
  {
    id: "mortar",
    name: "ปูนก่อ",
    blurb: "ปูน ทราย หรือปูนกาวมวลเบา",
    fields: [...wall, brickKind, jointField, bagField, mortarWasteField],
    calc: calcMortar,
  },
  {
    id: "plaster",
    name: "ปูนฉาบ",
    blurb: "ฉาบ 15 มม. / ฉาบบาง / สกิม",
    fields: [
      ...wall,
      {
        type: "select",
        key: "pkind",
        label: "ชนิดฉาบ",
        default: "normal",
        options: [
          { value: "normal", label: "ฉาบทั่วไป 15 มม." },
          { value: "thin", label: "ฉาบบางมวลเบา 5 มม." },
          { value: "skim", label: "สกิมผิวเรียบ 2 มม." },
        ],
      },
      { type: "number", key: "sides", label: "ฉาบกี่ด้าน", unit: "ด้าน", default: 1, min: 1, max: 2 },
      thickField,
      bagField,
    ],
    calc: calcPlaster,
  },
  {
    id: "lintel",
    name: "ทับหลังช่องเปิด",
    blurb: "RB6 หน้าตัด 10×10 ช่องเปิดไม่เกิน 2 ม. — ยังไม่รวมเสาเอ็น",
    fields: [
      { type: "number", key: "n", label: "จำนวนช่องเปิด", unit: "ช่อง", default: 2, min: 0, max: 100 },
      { type: "number", key: "width", label: "กว้างช่องเฉลี่ย", unit: "ม.", default: 1, min: 0.4, max: 6, step: 0.1 },
    ],
    calc: calcLintel,
  },
  {
    id: "mix",
    name: "สัดส่วนผสม + น้ำ",
    blurb: "ปูน ทราย หิน ตามปริมาตร",
    fields: [
      { type: "number", key: "m3", label: "คอนกรีตที่ต้องการ", unit: "ลบ.ม.", default: 0.3, min: 0.05, max: 100, step: 0.05 },
      {
        type: "select",
        key: "ratio",
        label: "สัดส่วน",
        default: "124",
        options: [
          { value: "124", label: "1:2:4 งานบ้าน" },
          { value: "112", label: "1:1:2 งานเข้ม" },
          { value: "136", label: "1:3:6 งานไม่รับแรง" },
        ],
      },
      {
        type: "select",
        key: "bag",
        label: "ขนาดถุงปูนซีเมนต์",
        default: "50",
        options: [
          { value: "50", label: "ถุง 50 กก." },
          { value: "40", label: "ถุง 40 กก." },
        ],
      },
    ],
    calc: calcMix,
  },
];

export const masonryJob: JobDef = {
  name: "คิดทั้งงานก่อฉาบผนัง",
  blurb: "ผนังครั้งเดียว ได้อิฐ ปูนก่อ ปูนฉาบ",
  fields: [
    ...wall,
    brickKind,
    jointField,
    { type: "number", key: "sides", label: "ฉาบกี่ด้าน", unit: "ด้าน", default: 2, min: 1, max: 2 },
    { ...thickField, label: "หนาฉาบจริง (0 = ตามชนิดอิฐ)" },
    bagField,
    mortarWasteField,
    { type: "number", key: "n", label: "ช่องเปิด (ทับหลัง)", unit: "ช่อง", default: 1, min: 0, max: 100 },
    { type: "number", key: "width", label: "กว้างช่องเฉลี่ย", unit: "ม.", default: 1, min: 0.4, max: 6, step: 0.1 },
  ],
  calc: (input) => {
    const bad = guardInputs(masonryJob.fields, input);
    if (bad) return bad;
    const v = withDefaults(masonryJob.fields, input);
    const brick = calcBrick(v);
    const mortar = calcMortar(v);
    const plaster = calcPlaster({ ...v, pkind: brickOf(v).thinBed ? "thin" : "normal" });
    const lintel = num(v, "n", 1) > 0 ? calcLintel(v) : null;
    const parts = [brick, mortar, plaster, ...(lintel ? [lintel] : [])];
    return jobFromParts({
      title: "งานก่อฉาบผนัง",
      headline: brick.headline ?? "งานก่อฉาบผนัง",
      rows: [
        ...brick.rows.filter((r) => r.emphasize),
        ...mortar.rows.filter((r) => r.emphasize),
        ...plaster.rows.filter((r) => r.emphasize),
        ...(lintel ? lintel.rows.filter((r) => r.emphasize) : []),
      ],
      tip: "ผนังยาวควรมีเสาเอ็นทุก 3–4 ม. รายการนี้ยังไม่รวมเสาเอ็นแนวตั้ง — ทับหลังเป็นงานโครงสร้างต้องให้ผู้มีใบอนุญาตตรวจ",
      parts,
      chart: brick.chart,
    });
  },
};
