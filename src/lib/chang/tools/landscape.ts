import type { CalcResult, ChartSpec, Field, ToolDef, Values } from "../types";
import { ceil, fmt, fmtTrim, guardTool, num, resultX, str } from "../math";
import { DISCLAIMER_AB, PAVER, RAIN, RAIN_ROOF, SLAB, SOD, SPRINKLER, TANK_SIZES } from "../constants";

const guard = (id: string, v: Values) => guardTool(landscapeTools, id, v);

/** ทรายรอง: ปริมาตรหลังเกลี่ย/บดอัด และทรายหลวมที่สั่ง (ตัวคูณเดียวกับทรายรองพื้นงานเทพื้น) */
function sandBed(area: number, cm: number) {
  const bed = area * (cm / 100);
  return { bed, loose: bed * SLAB.sandBedFactor.value };
}

/* ─────────── ปูหญ้า ─────────── */

export function calcSod(v: Values): CalcResult {
  const bad = guard("sod", v);
  if (bad) return bad;
  const area = num(v, "area", 50);
  const pw = num(v, "pw", SOD.pieceW.value) / 100;
  const pl = num(v, "pl", SOD.pieceL.value) / 100;
  const gap = num(v, "gap", 0) / 100;
  const waste = num(v, "waste", SOD.waste.value);
  const sandCm = num(v, "sand", SOD.sandCm.value);

  const cell = (pw + gap) * (pl + gap);
  const perM2 = 1 / cell;
  const exact = area / cell;
  const buy = ceil(exact * (1 + waste / 100));
  const sodM2 = buy * pw * pl;
  const sand = sandBed(area, sandCm);

  return resultX({
    title: "ปูหญ้า",
    headline: `หญ้าแผ่น ${fmt(buy)} แผ่น` + (sandCm > 0 ? ` · ทราย ${fmt(sand.loose, 2)} คิว` : ""),
    rows: [
      { label: "พื้นที่", value: `${fmt(area, 2)} ตร.ม.` },
      { label: `แผ่น ${fmtTrim(pw * 100, 1)} × ${fmtTrim(pl * 100, 1)} ซม.${gap > 0 ? ` เว้นร่อง ${fmtTrim(gap * 100, 1)} ซม.` : " ปูชิด"}`, value: `${fmt(perM2, 2)} แผ่น/ตร.ม.` },
      { label: "แผ่นตามพื้นที่", value: `${fmt(exact, 1)} แผ่น` },
      { label: `หญ้าที่ซื้อ รวมเผื่อ ${fmtTrim(waste, 1)}%`, value: `${fmt(buy)} แผ่น`, emphasize: true },
      { label: "ถ้าร้านขายเป็นตร.ม.", value: `${fmt(sodM2, 2)} ตร.ม. ของหญ้า` },
      ...(sandCm > 0
        ? [
            { label: `ทรายรองหนา ${fmtTrim(sandCm, 1)} ซม.`, value: `${fmt(sand.bed, 2)} คิว หลังเกลี่ยรดน้ำ` },
            { label: `สั่งทรายหลวม (× ${fmtTrim(SLAB.sandBedFactor.value, 2)})`, value: `${fmt(sand.loose, 2)} คิว`, emphasize: true },
          ]
        : []),
    ],
    tip: gap > 0 ? "ปูเว้นร่องประหยัดหญ้า หญ้าเลื้อยปิดร่องเองใน 1–2 เดือนถ้ารดน้ำสม่ำเสมอ" : "ปูให้รอยต่อสลับแบบก่ออิฐ ตบให้แนบทราย แล้วรดน้ำชุ่มทันที",
    explain: {
      risk: "A",
      updatedAt: "2026-11-26",
      summary: "แผ่น = พื้นที่ ÷ ((กว้างแผ่น + ร่อง) × (ยาวแผ่น + ร่อง)) แล้วบวกเผื่อปัดขึ้น · ทราย = พื้นที่ × หนา",
      steps: [
        {
          label: "พื้นที่ที่แผ่นหนึ่งคลุม",
          expr: "(กว้าง + ร่อง) × (ยาว + ร่อง)",
          subst: `(${fmtTrim(pw, 3)} + ${fmtTrim(gap, 3)}) × (${fmtTrim(pl, 3)} + ${fmtTrim(gap, 3)}) = ${fmtTrim(cell, 4)} ตร.ม.`,
        },
        { label: "แผ่นตามพื้นที่", expr: "พื้นที่ ÷ พื้นที่ต่อแผ่น", subst: `${fmt(area, 2)} ÷ ${fmtTrim(cell, 4)} = ${fmt(exact, 1)} แผ่น` },
        { label: "เผื่อเสีย", expr: "ซื้อ = ปัดขึ้น(แผ่น × (1 + เผื่อ%))", subst: `${fmt(exact, 1)} × ${fmtTrim(1 + waste / 100, 3)} = ${fmt(buy)} แผ่น` },
        ...(sandCm > 0
          ? [
              {
                label: "ทรายรอง",
                expr: `คิว = พื้นที่ × หนา(ม.) · สั่ง = × ${fmtTrim(SLAB.sandBedFactor.value, 2)} (ทรายหลวมยุบเมื่อรดน้ำ/บดอัด)`,
                subst: `${fmt(area, 2)} × ${fmtTrim(sandCm / 100, 3)} = ${fmt(sand.bed, 2)} คิว → ${fmt(sand.loose, 2)} คิว`,
              },
            ]
          : []),
      ],
      constants: [SOD.pieceW, SOD.pieceL, SOD.waste, ...(sandCm > 0 ? [SOD.sandCm, SLAB.sandBedFactor] : [])],
      assumptions: ["พื้นที่เป็นพื้นที่สุทธิที่ปูหญ้า (หักทางเดิน/แปลงต้นไม้แล้ว)", "ดินเดิมปรับระดับและบดอัดแล้วก่อนเกลี่ยทราย"],
      caveats: ["ขนาดแผ่นต่างกันตามฟาร์ม บางเจ้าขายเป็น ตร.ม. — ถามขนาดจริงก่อนสั่ง", "หญ้าแผ่นเป็นของสด สั่งให้มาส่งวันที่ปู ทิ้งไว้ม้วนเกิน 1–2 วันหญ้าเหลือง", DISCLAIMER_AB],
      refs: [{ label: "แนวปฏิบัติงานจัดสวน ปูหญ้าแผ่นบนทรายรอง" }],
    },
  });
}

/* ─────────── บล็อกปูพื้น / อิฐตัวหนอน ─────────── */

export function calcPaver(v: Values): CalcResult {
  const bad = guard("paver", v);
  if (bad) return bad;
  const area = num(v, "area", 20);
  const block = str(v, "block", "worm");
  const waste = num(v, "waste", PAVER.waste.value);
  const sandCm = num(v, "sand", PAVER.sandCm.value);
  const edge = num(v, "edge", 18);
  const kerbLen = num(v, "kerbLen", PAVER.kerbLen.value);

  const rect = block === "rect";
  const bw = num(v, "bw", PAVER.rectW.value) / 100;
  const bl = num(v, "bl", PAVER.rectL.value) / 100;
  const j = num(v, "joint", 0) / 1000;
  const perM2 = rect ? 1 / ((bw + j) * (bl + j)) : num(v, "ppm", PAVER.wormPerM2.value);
  const exact = area * perM2;
  const buy = ceil(exact * (1 + waste / 100));
  const sand = sandBed(area, sandCm);
  const kerbs = edge > 0 ? ceil(edge / kerbLen) : 0;
  const blockName = rect ? `บล็อก ${fmtTrim(bw * 100, 1)} × ${fmtTrim(bl * 100, 1)} ซม.` : "อิฐตัวหนอน";

  return resultX({
    title: "บล็อกปูพื้น / อิฐตัวหนอน",
    headline: `${blockName} ${fmt(buy)} ก้อน` + (sandCm > 0 ? ` · ทราย ${fmt(sand.loose, 2)} คิว` : "") + (kerbs > 0 ? ` · ขอบ ${fmt(kerbs)} ชิ้น` : ""),
    rows: [
      { label: "พื้นที่", value: `${fmt(area, 2)} ตร.ม.` },
      { label: rect ? `ก้อนต่อ ตร.ม. (ร่อง ${fmtTrim(j * 1000, 1)} มม.)` : "ก้อนต่อ ตร.ม. (ตามผู้ผลิต)", value: `${fmtTrim(perM2, 2)} ก้อน` },
      { label: "ก้อนตามพื้นที่", value: `${fmt(exact, 1)} ก้อน` },
      { label: `${blockName} รวมเผื่อ ${fmtTrim(waste, 1)}%`, value: `${fmt(buy)} ก้อน`, emphasize: true },
      ...(sandCm > 0
        ? [
            { label: `ทรายรองหนา ${fmtTrim(sandCm, 1)} ซม. (บดอัด)`, value: `${fmt(sand.bed, 2)} คิว` },
            { label: `สั่งทรายหลวม (× ${fmtTrim(SLAB.sandBedFactor.value, 2)})`, value: `${fmt(sand.loose, 2)} คิว`, emphasize: true },
          ]
        : []),
      ...(edge > 0 ? [{ label: `บล็อกขอบ/คันหิน (ชิ้นละ ${fmtTrim(kerbLen, 2)} ม.)`, value: `${fmt(edge, 1)} ม. = ${fmt(kerbs)} ชิ้น`, emphasize: true }] : []),
    ],
    tip: "ต้องมีขอบกั้นยึดปูนรอบแปลงก่อนปู ไม่งั้นบล็อกเลื่อนออก · ปูเสร็จกวาดทรายละเอียดลงร่องแล้วบดอัดซ้ำ",
    explain: {
      risk: "A",
      updatedAt: "2026-11-26",
      summary: rect
        ? "ก้อน/ตร.ม. = 1 ÷ ((กว้าง + ร่อง) × (ยาว + ร่อง)) · ก้อน = พื้นที่ × ก้อน/ตร.ม. + เผื่อ · ทราย = พื้นที่ × หนา · ขอบ = ยาวขอบ ÷ ยาวชิ้น"
        : "ก้อน = พื้นที่ × ก้อน/ตร.ม. ตามผู้ผลิต + เผื่อ · ทราย = พื้นที่ × หนา · ขอบ = ยาวขอบ ÷ ยาวชิ้น",
      steps: [
        ...(rect
          ? [
              {
                label: "ก้อนต่อ ตร.ม.",
                expr: "1 ÷ ((กว้าง + ร่อง) × (ยาว + ร่อง))",
                subst: `1 ÷ ((${fmtTrim(bw, 3)} + ${fmtTrim(j, 4)}) × (${fmtTrim(bl, 3)} + ${fmtTrim(j, 4)})) = ${fmt(perM2, 2)} ก้อน`,
              },
            ]
          : []),
        { label: "ก้อนตามพื้นที่", expr: "พื้นที่ × ก้อนต่อ ตร.ม.", subst: `${fmt(area, 2)} × ${fmtTrim(perM2, 4)} = ${fmt(exact, 1)} ก้อน` },
        { label: "เผื่อเสีย", expr: "ซื้อ = ปัดขึ้น(ก้อน × (1 + เผื่อ%))", subst: `${fmt(exact, 1)} × ${fmtTrim(1 + waste / 100, 3)} = ${fmt(buy)} ก้อน` },
        ...(sandCm > 0
          ? [
              {
                label: "ทรายรอง",
                expr: `คิว = พื้นที่ × หนา(ม.) · สั่ง = × ${fmtTrim(SLAB.sandBedFactor.value, 2)}`,
                subst: `${fmt(area, 2)} × ${fmtTrim(sandCm / 100, 3)} = ${fmt(sand.bed, 2)} คิว → ${fmt(sand.loose, 2)} คิว`,
              },
            ]
          : []),
        ...(edge > 0 ? [{ label: "บล็อกขอบ", expr: "ชิ้น = ปัดขึ้น(ยาวขอบ ÷ ยาวชิ้น)", subst: `${fmt(edge, 1)} ÷ ${fmtTrim(kerbLen, 2)} = ${fmt(kerbs)} ชิ้น` }] : []),
      ],
      constants: [
        ...(rect ? [PAVER.rectW, PAVER.rectL] : [PAVER.wormPerM2]),
        PAVER.waste,
        ...(sandCm > 0 ? [PAVER.sandCm, SLAB.sandBedFactor] : []),
        ...(edge > 0 ? [PAVER.kerbLen] : []),
      ],
      assumptions: ["พื้นที่ไม่รวมแนวบล็อกขอบ", "ชั้นดิน/หินคลุกใต้ทรายบดอัดแน่นแล้ว (ไม่รวมในตัวเลขนี้)"],
      caveats: [
        "ทางรถวิ่งต้องใช้บล็อกหนา 8 ซม. ขึ้นไป บนหินคลุกบดอัด ทางเดินคนใช้ 6 ซม. ได้ — ดูคำแนะนำผู้ผลิต",
        "ทำพื้นลาดให้น้ำไหลออก 1–2% ไม่ให้น้ำขังใต้บล็อก",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "เอกสารผู้ผลิตบล็อกปูพื้นคอนกรีต (ก้อน/ตร.ม. ความหนาตามการใช้งาน)" }],
    },
  });
}

/* ─────────── สปริงเกอร์ ─────────── */

export function calcSprinkler(v: Values): CalcResult {
  const bad = guard("sprinkler", v);
  if (bad) return bad;
  const W = num(v, "W", 8);
  const L = num(v, "L", 10);
  const R = num(v, "R", SPRINKLER.radius.value);
  const pct = num(v, "pct", 100);
  const q = num(v, "q", SPRINKLER.flow.value);
  const depth = num(v, "depth", SPRINKLER.depthMm.value);

  const S = (R * pct) / 100;
  const nW = ceil(W / S) + 1;
  const nL = ceil(L / S) + 1;
  const heads = nW * nL;
  const corners = 4;
  const edges = 2 * (nW - 2) + 2 * (nL - 2);
  const inner = (nW - 2) * (nL - 2);
  const fullEq = corners / 4 + edges / 2 + inner;
  const flow = q * fullEq;
  const area = W * L;
  const rate = (flow * 60) / area;
  const minutes = (depth / rate) * 60;
  // ด้านสนามสั้นกว่ารัศมีพ่น: หัวมุม/ขอบพ่นเลยขอบสนามไปมาก น้ำส่วนใหญ่ตกนอกพื้นที่ อัตราน้ำลงสนามที่คิดได้จึงสูงเกินจริง
  const narrow = Math.min(W, L) < R - 1e-9;

  return resultX({
    title: "สปริงเกอร์",
    headline: `หัวสปริงเกอร์ ${fmt(heads)} หัว · น้ำรวม ${fmt(flow, 1)} ล./นาที`,
    rows: [
      { label: "พื้นที่", value: `${fmtTrim(W, 2)} × ${fmtTrim(L, 2)} ม. = ${fmt(area, 2)} ตร.ม.` },
      { label: `ระยะหัวไม่เกิน (${fmtTrim(pct, 1)}% ของรัศมี ${fmtTrim(R, 2)} ม.)`, value: `${fmtTrim(S, 2)} ม.` },
      { label: "แถวหัว", value: `${fmt(nW)} × ${fmt(nL)} (ห่างจริง ${fmtTrim(W / (nW - 1), 2)} × ${fmtTrim(L / (nL - 1), 2)} ม.)` },
      { label: "หัวทั้งหมด", value: `${fmt(heads)} หัว`, emphasize: true },
      { label: "แยกตามมุมพ่น", value: `มุม 90° ${fmt(corners)} · ขอบ 180° ${fmt(edges)} · กลาง 360° ${fmt(inner)}` },
      { label: `น้ำรวมเมื่อเปิดพร้อมกัน (หัวเต็มวง ${fmtTrim(q, 1)} ล./นาที)`, value: `${fmt(flow, 1)} ล./นาที`, emphasize: true },
      { label: "อัตราน้ำลงสนาม", value: `${fmt(rate, 1)} มม./ชม.` },
      { label: `รดให้ได้ ${fmtTrim(depth, 1)} มม.`, value: `เปิดราว ${fmtTrim(minutes, 1)} นาที` },
      ...(narrow
        ? [
            {
              label: "ข้อควรระวัง",
              value: `ด้านสั้น ${fmtTrim(Math.min(W, L), 2)} ม. แคบกว่ารัศมีพ่น ${fmtTrim(R, 2)} ม. — น้ำส่วนใหญ่ตกนอกสนาม อัตราน้ำและเวลาเปิดข้างบนใช้ไม่ได้ ใช้หัวพ่นแถบแคบ (strip) หรือสายน้ำหยดแทน`,
              emphasize: true,
            },
          ]
        : []),
    ],
    tip: narrow
      ? "พื้นที่แคบกว่ารัศมีหัว: เลือกหัวรัศมีสั้นลงให้ไม่เกินด้านแคบ หรือหัวพ่นแถบแคบ/สายน้ำหยด"
      : "ถ้าน้ำรวมเกินที่ปั๊ม/ท่อจ่ายได้ ให้แบ่งโซนเปิดทีละชุด · ใช้หัวรุ่นเดียวกันทั้งโซนให้น้ำลงเท่ากัน",
    explain: {
      risk: "B",
      updatedAt: "2026-11-26",
      summary: "วางหัวสี่เหลี่ยมหัวถึงหัว: แถว = ปัดขึ้น(ด้าน ÷ ระยะหัว) + 1 · น้ำรวม = น้ำหัวเต็มวง × (มุม ÷ 4 + ขอบ ÷ 2 + กลาง)",
      steps: [
        { label: "ระยะหัว", expr: "ระยะ = รัศมี × %", subst: `${fmtTrim(R, 2)} × ${fmtTrim(pct / 100, 2)} = ${fmtTrim(S, 2)} ม.`, note: "100% = หัวถึงหัว น้ำจากหัวหนึ่งพ่นถึงหัวถัดไปพอดี" },
        {
          label: "จำนวนหัว",
          expr: "(ปัดขึ้น(กว้าง ÷ ระยะ) + 1) × (ปัดขึ้น(ยาว ÷ ระยะ) + 1)",
          subst: `(ปัดขึ้น(${fmtTrim(W, 2)} ÷ ${fmtTrim(S, 2)}) + 1) × (ปัดขึ้น(${fmtTrim(L, 2)} ÷ ${fmtTrim(S, 2)}) + 1) = ${fmt(nW)} × ${fmt(nL)} = ${fmt(heads)} หัว`,
        },
        {
          label: "น้ำรวม",
          expr: "น้ำหัวเต็มวง × (มุม ÷ 4 + ขอบ ÷ 2 + กลาง)",
          subst: `${fmtTrim(q, 1)} × (${fmt(corners)} ÷ 4 + ${fmt(edges)} ÷ 2 + ${fmt(inner)}) = ${fmt(flow, 1)} ล./นาที`,
          note: "หัวมุมพ่น 1/4 วง หัวขอบ 1/2 วง ใช้น้ำตามสัดส่วนเมื่อใช้หัวแบบปรับน้ำตามมุม",
        },
        { label: "อัตราน้ำลงสนาม", expr: "มม./ชม. = ล./นาที × 60 ÷ พื้นที่", subst: `${fmt(flow, 1)} × 60 ÷ ${fmt(area, 2)} = ${fmt(rate, 1)} มม./ชม.`, note: "น้ำ 1 ลิตรบน 1 ตร.ม. = 1 มม." },
        { label: "เวลาเปิด", expr: "นาที = มม.ที่ต้องการ ÷ มม./ชม. × 60", subst: `${fmtTrim(depth, 1)} ÷ ${fmt(rate, 1)} × 60 = ${fmt(minutes, 1)} นาที` },
      ],
      constants: [SPRINKLER.radius, SPRINKLER.flow, SPRINKLER.depthMm, RAIN.mmToLitre],
      assumptions: [
        "สนามสี่เหลี่ยม วางหัวเป็นตารางสี่เหลี่ยม หัวมุมพ่น 90° หัวขอบ 180° หัวกลาง 360°",
        "หัวปรับน้ำตามมุมพ่น (matched precipitation) — ถ้าหัวทุกตัวใช้น้ำเท่ากัน น้ำรวม = หัว × น้ำต่อหัว",
      ],
      caveats: [
        "รัศมีและน้ำต่อหัวขึ้นกับแรงดันน้ำจริง ดูตารางของรุ่นที่ใช้ที่แรงดันหน้างาน",
        "พื้นที่แคบหรือรูปทรงไม่สี่เหลี่ยมต้องวางหัวเอง — ตัวเลขนี้นับจากกรอบสี่เหลี่ยม",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวปฏิบัติออกแบบระบบรดน้ำสนาม (วางหัวถึงหัว, matched precipitation)" }],
    },
  });
}

/* ─────────── เก็บน้ำฝนจากหลังคา ─────────── */

const ROOF_KEY: Record<string, string> = { metal: "cMetal", tile: "cTile", slab: "cSlab" };

export function pickTank(litres: number): { size: number; count: number } {
  const fit = TANK_SIZES.find((s) => s >= litres - 1e-9);
  if (fit !== undefined) return { size: fit, count: 1 };
  const big = TANK_SIZES[TANK_SIZES.length - 1];
  return { size: big, count: ceil(litres / big) };
}

export function calcRain(v: Values): CalcResult {
  const bad = guard("rain", v);
  if (bad) return bad;
  const area = num(v, "area", 100);
  const period = str(v, "period", "event");
  const mm = period === "month" ? num(v, "rainMonth", RAIN.monthMm.value) : num(v, "rainEvent", RAIN.eventMm.value);
  const roofKey = str(v, "roof", "metal");
  const roof = RAIN_ROOF[roofKey] ?? RAIN_ROOF.metal;
  const coef = num(v, ROOF_KEY[roofKey] ?? "cMetal", roof.coef.value);
  const daily = num(v, "daily", 200);
  const days = num(v, "days", 7);

  const litres = area * mm * coef * RAIN.mmToLitre.value;
  const covers = litres / daily;
  const need = daily * days;
  const target = Math.min(litres, need);
  const tank = pickTank(target);
  const per = period === "month" ? "ต่อเดือน" : "ต่อครั้ง";
  const chart: ChartSpec | undefined =
    tank.count === 1
      ? {
          kind: "steps",
          unit: "ลิตร",
          need: target,
          needLabel: "ต้องเก็บ",
          items: TANK_SIZES.map((s) => ({ label: `${fmt(s)} ล.`, value: s, state: s < tank.size ? "under" : s === tank.size ? "chosen" : "over" })),
        }
      : undefined;

  return resultX({
    title: "เก็บน้ำฝนจากหลังคา",
    headline: `น้ำฝน ${fmt(litres)} ลิตร${per} · ถังแนะนำ ${tank.count > 1 ? `${fmt(tank.count)} ใบ × ` : ""}${fmt(tank.size)} ลิตร`,
    chart,
    rows: [
      { label: "พื้นที่หลังคา (มองจากบน)", value: `${fmt(area, 2)} ตร.ม.` },
      { label: `ฝน${per}`, value: `${fmtTrim(mm, 1)} มม.` },
      { label: `น้ำไหลลงราง (${roof.label})`, value: `× ${fmtTrim(coef, 2)}` },
      { label: `น้ำที่เก็บได้${per}`, value: `${fmt(litres)} ลิตร (${fmt(litres / 1000, 2)} ลบ.ม.)`, emphasize: true },
      { label: `ใช้วันละ ${fmt(daily)} ลิตร`, value: `น้ำก้อนนี้พอใช้ ${fmt(covers, 1)} วัน` },
      { label: `อยากสำรอง ${fmt(days)} วัน`, value: `${fmt(need)} ลิตร` },
      {
        label: "ขนาดถังที่ควรเก็บ",
        value: `${fmt(target)} ลิตร (${litres < need ? "เท่าน้ำที่เก็บได้" : "เท่าน้ำที่อยากสำรอง"})`,
      },
      { label: "ถังแนะนำ", value: tank.count > 1 ? `${fmt(tank.count)} ใบ × ${fmt(tank.size)} ลิตร` : `${fmt(tank.size)} ลิตร`, emphasize: true },
    ],
    tip: "ติดชุดทิ้งน้ำแรก (first flush) ให้น้ำล้างหลังคาช่วงแรกไหลทิ้งก่อนเข้าถัง · น้ำฝนใช้รดน้ำ ล้างรถ ชักโครก ถ้าจะดื่มต้องกรองและฆ่าเชื้อ",
    explain: {
      risk: "A",
      updatedAt: "2026-11-26",
      summary: "ลิตร = พื้นที่หลังคามองจากบน (ตร.ม.) × ฝน (มม.) × สัมประสิทธิ์น้ำไหลออก · ถัง = ขนาดถังที่ขายที่เล็กสุดที่จุน้อยกว่าระหว่างน้ำที่เก็บได้กับน้ำที่อยากสำรอง",
      steps: [
        {
          label: "น้ำที่เก็บได้",
          expr: "ลิตร = พื้นที่ × มม. × สัมประสิทธิ์",
          subst: `${fmt(area, 2)} × ${fmtTrim(mm, 1)} × ${fmtTrim(coef, 2)} = ${fmt(litres)} ลิตร`,
          note: "ฝน 1 มม. ตกบน 1 ตร.ม. = 1 ลิตร พอดี",
        },
        { label: "พอใช้กี่วัน", expr: "วัน = ลิตร ÷ ใช้ต่อวัน", subst: `${fmt(litres)} ÷ ${fmt(daily)} = ${fmt(covers, 1)} วัน` },
        { label: "น้ำที่อยากสำรอง", expr: "ใช้ต่อวัน × วัน", subst: `${fmt(daily)} × ${fmt(days)} = ${fmt(need)} ลิตร` },
        {
          label: "ขนาดถัง",
          expr: "เก็บ = น้อยกว่าระหว่าง (น้ำที่เก็บได้, น้ำที่อยากสำรอง) แล้วเลือกถังที่ขายขนาดถัดขึ้นไป",
          subst: `min(${fmt(litres)}, ${fmt(need)}) = ${fmt(target)} ลิตร → ${tank.count > 1 ? `${fmt(tank.count)} × ` : ""}${fmt(tank.size)} ลิตร`,
        },
      ],
      constants: [RAIN.mmToLitre, roof.coef, period === "month" ? RAIN.monthMm : RAIN.eventMm],
      assumptions: [
        "พื้นที่หลังคาคิดแบบมองจากด้านบน (ฝนตกแนวดิ่ง) ไม่ใช่พื้นที่ตามความลาด",
        "สัมประสิทธิ์รวมน้ำที่ระเหย กระเซ็น และค้างบนหลังคาแล้ว ยังไม่หักน้ำแรกที่ทิ้ง",
        "ขนาดถังเลือกจากขนาดที่ขายทั่วไปในไทย",
      ],
      caveats: [
        "ฝนแต่ละเดือนต่างกันมาก หน้าแล้งแทบไม่มีฝน — ใช้ค่าเฉลี่ยรายเดือนของจังหวัดจากกรมอุตุนิยมวิทยา",
        "ถังใหญ่ตั้งบนแท่นหนักมาก (1,000 ลิตร ≈ 1 ตัน) ฐานรองต้องรับน้ำหนักได้",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "Texas Manual on Rainwater Harvesting (TWDB) — สูตรน้ำฝนจากหลังคาและสัมประสิทธิ์" }, { label: "กรมอุตุนิยมวิทยา — ปริมาณฝนเฉลี่ยรายเดือน" }],
    },
  });
}

/* ─────────── ฟอร์ม ─────────── */

const sodFields: Field[] = [
  { type: "number", key: "area", label: "พื้นที่ปูหญ้า", unit: "ตร.ม.", default: 50, min: 1, max: 100000 },
  { type: "number", key: "pw", label: "กว้างแผ่น", unit: "ซม.", default: SOD.pieceW.value, min: 10, max: 100 },
  { type: "number", key: "pl", label: "ยาวแผ่น", unit: "ซม.", default: SOD.pieceL.value, min: 10, max: 200 },
  { type: "number", key: "gap", label: "เว้นร่อง (0 = ปูชิด)", unit: "ซม.", default: 0, min: 0, max: 30, step: 0.5 },
  { type: "number", key: "waste", label: "เผื่อเสีย", unit: "%", default: SOD.waste.value, min: 0, max: 30 },
  { type: "number", key: "sand", label: "ทรายรองหนา (0 = ไม่รอง)", unit: "ซม.", default: SOD.sandCm.value, min: 0, max: 10, step: 0.5 },
];

const paverFields: Field[] = [
  { type: "number", key: "area", label: "พื้นที่ปู", unit: "ตร.ม.", default: 20, min: 0.5, max: 100000, step: 0.5 },
  {
    type: "select",
    key: "block",
    label: "บล็อก",
    default: "worm",
    options: [
      { value: "worm", label: "อิฐตัวหนอน" },
      { value: "rect", label: "บล็อกสี่เหลี่ยม (กรอกขนาด)" },
    ],
  },
  { type: "number", key: "ppm", label: "ก้อนต่อ ตร.ม. (ดูฉลาก)", unit: "ก้อน", default: PAVER.wormPerM2.value, min: 10, max: 100, step: 0.5, when: { key: "block", is: "worm" } },
  { type: "number", key: "bw", label: "กว้างก้อน", unit: "ซม.", default: PAVER.rectW.value, min: 5, max: 60, step: 0.5, when: { key: "block", is: "rect" } },
  { type: "number", key: "bl", label: "ยาวก้อน", unit: "ซม.", default: PAVER.rectL.value, min: 5, max: 60, step: 0.5, when: { key: "block", is: "rect" } },
  { type: "number", key: "joint", label: "ร่อง (0 = ปูชิด)", unit: "มม.", default: 0, min: 0, max: 10, step: 0.5, when: { key: "block", is: "rect" } },
  { type: "number", key: "waste", label: "เผื่อเสีย", unit: "%", default: PAVER.waste.value, min: 0, max: 30 },
  { type: "number", key: "sand", label: "ทรายรองหนา (0 = ไม่รอง)", unit: "ซม.", default: PAVER.sandCm.value, min: 0, max: 15, step: 0.5 },
  { type: "number", key: "edge", label: "ความยาวขอบ (0 = ไม่มี)", unit: "ม.", default: 18, min: 0, max: 10000, step: 0.5 },
  { type: "number", key: "kerbLen", label: "ยาวบล็อกขอบต่อชิ้น", unit: "ม.", default: PAVER.kerbLen.value, min: 0.2, max: 2, step: 0.05 },
];

const sprinklerFields: Field[] = [
  { type: "number", key: "W", label: "กว้างสนาม", unit: "ม.", default: 8, min: 1, max: 200, step: 0.5 },
  { type: "number", key: "L", label: "ยาวสนาม", unit: "ม.", default: 10, min: 1, max: 200, step: 0.5 },
  { type: "number", key: "R", label: "รัศมีพ่นของหัว", unit: "ม.", default: SPRINKLER.radius.value, min: 1, max: 25, step: 0.5 },
  { type: "number", key: "pct", label: "ระยะหัว % ของรัศมี (100 = หัวถึงหัว)", unit: "%", default: 100, min: 50, max: 100 },
  { type: "number", key: "q", label: "น้ำต่อหัวเต็มวง 360°", unit: "ล./นาที", default: SPRINKLER.flow.value, min: 1, max: 200, step: 0.5 },
  { type: "number", key: "depth", label: "อยากรดน้ำให้ได้", unit: "มม.", default: SPRINKLER.depthMm.value, min: 1, max: 50, step: 0.5 },
];

const coefField = (key: string, is: string): Field => ({
  type: "number",
  key,
  label: "สัดส่วนน้ำที่ไหลลงราง (0–1)",
  default: RAIN_ROOF[is].coef.value,
  min: 0.1,
  max: 1,
  step: 0.01,
  when: { key: "roof", is },
});

const rainFields: Field[] = [
  { type: "number", key: "area", label: "พื้นที่หลังคามองจากบน", unit: "ตร.ม.", default: 100, min: 1, max: 100000 },
  {
    type: "select",
    key: "period",
    label: "ฝนที่กรอก",
    default: "event",
    options: [
      { value: "event", label: "ต่อครั้ง (ฝนหนึ่งห่า)" },
      { value: "month", label: "ทั้งเดือน" },
    ],
  },
  { type: "number", key: "rainEvent", label: "ฝนต่อครั้ง", unit: "มม.", default: RAIN.eventMm.value, min: 1, max: 500, when: { key: "period", is: "event" } },
  { type: "number", key: "rainMonth", label: "ฝนทั้งเดือน", unit: "มม.", default: RAIN.monthMm.value, min: 1, max: 2000, when: { key: "period", is: "month" } },
  {
    type: "select",
    key: "roof",
    label: "หลังคา",
    default: "metal",
    options: Object.entries(RAIN_ROOF).map(([value, r]) => ({ value, label: r.label })),
  },
  coefField("cMetal", "metal"),
  coefField("cTile", "tile"),
  coefField("cSlab", "slab"),
  { type: "number", key: "daily", label: "ใช้น้ำฝนวันละ", unit: "ลิตร", default: 200, min: 1, max: 100000 },
  { type: "number", key: "days", label: "อยากมีน้ำสำรอง", unit: "วัน", default: 7, min: 1, max: 365 },
];

export const landscapeTools: ToolDef[] = [
  {
    id: "sod",
    name: "ปูหญ้า",
    blurb: "หญ้าแผ่นกี่แผ่น ทรายรองกี่คิว",
    keywords: ["หญ้า", "หญ้าแผ่น", "ปูหญ้า", "หญ้ามาเลเซีย", "หญ้านวลน้อย", "สนามหญ้า"],
    fields: sodFields,
    calc: calcSod,
  },
  {
    id: "paver",
    name: "บล็อกปูพื้น / อิฐตัวหนอน",
    blurb: "ก้อน ทรายรอง บล็อกขอบ",
    keywords: ["ตัวหนอน", "อิฐตัวหนอน", "บล็อกปูพื้น", "แผ่นทางเท้า", "คันหิน", "บล็อกขอบ", "ปูลานจอดรถ"],
    fields: paverFields,
    calc: calcPaver,
  },
  {
    id: "sprinkler",
    name: "สปริงเกอร์",
    blurb: "หัวกี่หัว น้ำรวม เปิดกี่นาที",
    keywords: ["สปริงเกอร์", "sprinkler", "รดน้ำสนาม", "หัวพ่นน้ำ", "ระบบรดน้ำ"],
    fields: sprinklerFields,
    calc: calcSprinkler,
  },
  {
    id: "rain",
    name: "เก็บน้ำฝนจากหลังคา",
    blurb: "ฝน มม. → ลิตร ถังกี่ลิตร",
    keywords: ["น้ำฝน", "เก็บน้ำฝน", "ถังเก็บน้ำฝน", "rainwater", "รางน้ำฝน"],
    fields: rainFields,
    calc: calcRain,
  },
];
