import type { CalcResult, ChartSpec, ConstRef, Field, JobDef, ToolDef, Values } from "../types";
import { blockedResult, ceil, fmt, fmtTrim, guardInputs, guardTool, jobFromParts, num, resultX, round, stepTable, str, withDefaults } from "../math";
import {
  BREAKER_SIZES,
  CABLE_METHODS,
  CABLE_TABLE_5_20,
  CABLE_TABLE_SOURCE,
  CONDUIT_FILL,
  CONDUIT_SIZE_SOURCE,
  CONDUIT_SIZES,
  DISCLAIMER_AB,
  DISCLAIMER_C,
  AC,
  ELEC,
  EV,
  EV_CHARGERS,
  GROUND_WIRE_TABLE,
  KG_CIRCUITS,
  KG_CIRCUITS_BANDS,
  KG_CIRCUITS_MAX,
  KG_SOURCE,
  KT_AIR_PVC,
  KT_SOURCE,
  LIGHTING,
  LUX_PRESETS,
  NOMINAL_V,
  POWER_BILL,
  PUMP,
  SOLAR,
  THW_OD,
  THW_OD_SOURCE,
  WATER_HEAT,
  WATER_HEATER_KW,
} from "../constants";

const guard = (id: string, v: Values) => guardTool(electricalTools, id, v);

type CableColumn = "g1c2" | "g1c3" | "g2c2" | "g2c3";

/** ตัวคูณกลุ่มวงจร — เกิน 9 วงจรใช้ค่าของจุดตารางถัดไป (12/16/20) เกิน 20 วงจรไม่มีค่า คืน null */
export function groupingFactor(circuits: number): number | null {
  const exact = KG_CIRCUITS[circuits];
  if (exact !== undefined) return exact;
  if (circuits > KG_CIRCUITS_MAX || circuits < 1) return null;
  return KG_CIRCUITS_BANDS.find(([upTo]) => circuits <= upTo)?.[1] ?? null;
}

function cableColumn(method: string, phase: string): CableColumn {
  const group = method === "embed" ? CABLE_METHODS.embed.group : CABLE_METHODS.surface.group;
  const conductors = phase === "3" ? "c3" : "c2";
  return `${group}${conductors}` as CableColumn;
}

/** เลือกสายเส้นเล็กสุดที่พิกัดในตารางไม่น้อยกว่ากระแสที่ต้องการ — ถ้าเกินตารางคืนแถวสุดท้ายพร้อม over */
export function pickCable(needed: number, column: CableColumn = "g2c2") {
  const row = CABLE_TABLE_5_20.find((r) => r[column] >= needed);
  if (row) return { row, over: false };
  return { row: CABLE_TABLE_5_20[CABLE_TABLE_5_20.length - 1], over: true };
}

function pickBreaker(design: number): { amp: number; over: boolean } {
  const amp = BREAKER_SIZES.find((a) => a >= design);
  if (amp !== undefined) return { amp, over: false };
  return { amp: BREAKER_SIZES[BREAKER_SIZES.length - 1], over: true };
}

function pickGround(breaker: number): number {
  return stepTable(breaker, GROUND_WIRE_TABLE, 70);
}

export function calcCable(v: Values) {
  const bad = guard("cable", v);
  if (bad) return bad;
  const mode = str(v, "mode", "amp");
  const volts = num(v, "volts", 220);
  const watts = num(v, "watts", 2200);
  const phase = str(v, "phase", "1");
  const pf = Math.min(Math.max(num(v, "pf", 1), 0.1), 1);
  const method = str(v, "method", "surface");
  const temp = num(v, "temp", 40);
  const circ = Math.max(1, Math.round(num(v, "circ", 1)));

  const divisor = phase === "3" ? ELEC.sqrt3.value * volts * pf : volts * pf;
  const il = mode === "watt" ? watts / Math.max(divisor, 1) : num(v, "il", 15);

  const design = il * ELEC.continuousFactor.value;
  const pickedBreaker = pickBreaker(design);
  const breaker = pickedBreaker.amp;

  const kt = stepTable(temp, KT_AIR_PVC, KT_AIR_PVC[KT_AIR_PVC.length - 1][1]);
  const kgHit = groupingFactor(circ);
  if (kgHit === null) {
    return blockedResult({
      headline: `${fmt(circ)} วงจรในท่อเดียวเกินตารางตัวคูณ (สูงสุด ${KG_CIRCUITS_MAX} วงจร) — แยกท่อ`,
      tip: "สายอัดแน่นในท่อเดียวระบายความร้อนไม่ได้ แยกเป็นหลายท่อหรือใช้รางเดินสาย แล้วคิดใหม่ตามจำนวนวงจรต่อท่อ",
    });
  }
  const kg = kgHit;
  const needed = breaker / (kt * kg);

  const column = cableColumn(method, phase);
  const pickedCable = pickCable(needed, column);
  const cable = pickedCable.row;
  const overRange = pickedBreaker.over || pickedCable.over;
  const tableAmp = cable[column];
  const usable = tableAmp * kt * kg;
  const ground = pickGround(breaker);
  const methodLabel = method === "embed" ? CABLE_METHODS.embed.label : CABLE_METHODS.surface.label;
  const conductorLabel = phase === "3" ? "3 เฟส (ตัวนำ 3 เส้น)" : "1 เฟส (ตัวนำ 2 เส้น)";

  const caveats = [
    "ตารางนี้ใช้กับสายทองแดงหุ้มฉนวนพีวีซี (THW / IEC 01) เดินในท่อ ถ้าเป็น XLPE, สายฝังดิน หรือวางบนรางเคเบิล ต้องเปิดตารางอื่น",
    "เมนเข้าบ้าน มิเตอร์ และงานสามเฟสโรงงาน ต้องให้วิศวกรไฟฟ้าออกแบบและเซ็นรับรอง",
    "เดินสายไกลต้องเช็กแรงดันตกด้วย ขนาดสายที่ทนกระแสได้อาจยังตกแรงดันเกินเกณฑ์",
  ];
  if (overRange) {
    caveats.unshift("โหลดเกินช่วงตาราง วสท. 5-20 / เบรกเกอร์สูงสุด 250 A — ห้ามใช้สายหรือเบรกเกอร์แถวสุดท้ายโดยเดา ต้องให้วิศวกรไฟฟ้าออกแบบ");
  }
  if (temp > 60) {
    caveats.unshift(`อุณหภูมิ ${fmt(temp)} °C เกินช่วงตารางตัวคูณ (สูงสุด 60 °C) — ผลลัพธ์ใช้ค่าต่ำสุดของตาราง ให้ปรึกษาวิศวกร`);
  }
  if (circ > 9) {
    caveats.unshift(`มี ${fmt(circ)} วงจรในท่อเดียวกัน — ใช้ตัวคูณ ${kg} ของช่วง 10–20 วงจร (IEC B.52.17) สายจะใหญ่ขึ้นมาก ควรแยกท่อ`);
  }
  if (cable.mm2 >= 50) {
    caveats.unshift("ขนาดนี้เป็นงานเมน/สายป้อน ไม่ใช่วงจรย่อยในบ้าน ต้องมีวิศวกรออกแบบ");
  }

  const chosenIdx = CABLE_TABLE_5_20.findIndex((row) => row.mm2 === cable.mm2);
  const ladder = CABLE_TABLE_5_20.slice(Math.max(0, chosenIdx - 3), chosenIdx + 2);

  return {
    ...resultX({
    title: "เลือกขนาดสายไฟ",
    headline: overRange
      ? "เกินช่วงตาราง ต้องให้วิศวกรไฟฟ้าออกแบบ"
      : `สาย ${cable.mm2} ตร.มม. · เบรกเกอร์ ${breaker} A`,
    chart: overRange
      ? undefined
      : {
          kind: "steps",
          unit: "A",
          need: Math.round(needed * 10) / 10,
          needLabel: "สายต้องทนได้ไม่น้อยกว่า",
          items: ladder.map((row) => ({
            label: `${row.mm2} ตร.มม.`,
            value: row[column],
            state: row.mm2 === cable.mm2 ? "chosen" : row[column] < needed ? "under" : "over",
          })),
        },
    rows: [
      { label: "กระแสโหลด IL", value: `${fmt(il, 1)} A` },
      { label: "คิดโหลดต่อเนื่อง 125%", value: `${fmt(design, 1)} A` },
      { label: "เบรกเกอร์", value: `${breaker} A`, emphasize: true },
      { label: "ตัวคูณอุณหภูมิ Kt", value: `${fmt(kt, 2)} (ที่ ${fmt(temp)} °C)` },
      { label: "ตัวคูณกลุ่มวงจร Kg", value: `${fmt(kg, 2)} (${fmt(circ)} วงจร)` },
      { label: "พิกัดในตารางที่ต้องมี", value: `${fmt(needed, 1)} A` },
      { label: "ขนาดสายแนะนำ", value: overRange ? "เกินตาราง" : `${cable.mm2} ตร.มม.`, emphasize: true },
      { label: "พิกัดตาราง / ใช้งานจริง", value: `${tableAmp} A → ${fmt(usable, 1)} A` },
      { label: "สายดินบริภัณฑ์", value: `${ground} ตร.มม.`, emphasize: true },
      { label: "วิธีติดตั้งที่คิด", value: methodLabel },
    ],
    tip: overRange
      ? "อย่าใช้สายหรือเบรกเกอร์แถวสุดท้ายในตารางนี้ — โหลดเกินช่วงออกแบบของเครื่องมือ"
      : "สายทองแดง THW ในท่อ ตามแนวตาราง วสท. — เดินไกลให้เช็กแรงดันตกต่อ",
    explain: {
      risk: "C",
      updatedAt: "2026-11-25",
      summary: "IL → ×1.25 → เลือกเบรกเกอร์ → It = เบรกเกอร์ ÷ (Kt × Kg) → เลือกสายจากตาราง วสท. 5-20",
      steps: [
        {
          label: "กระแสโหลด",
          expr: phase === "3" ? "IL = P ÷ (√3 × V × PF)" : "IL = P ÷ (V × PF)",
          subst:
            mode === "watt"
              ? `IL = ${fmt(watts)} ÷ (${phase === "3" ? "1.732 × " : ""}${fmt(volts)} × ${fmt(pf, 2)}) = ${fmt(il, 1)} A`
              : `IL = ${fmt(il, 1)} A (กรอกเป็นแอมป์โดยตรง)`,
        },
        {
          label: "เผื่อโหลดต่อเนื่อง 125%",
          expr: "I_design = IL × 1.25",
          subst: `I_design = ${fmt(il, 1)} × 1.25 = ${fmt(design, 1)} A`,
          note: "วสท. กำหนดให้วงจรย่อยมีพิกัดไม่น้อยกว่า 125% ของโหลดต่อเนื่อง",
        },
        {
          label: "เลือกเบรกเกอร์",
          expr: "เบรกเกอร์ = พิกัดมาตรฐานตัวถัดไปที่ ≥ I_design",
          subst: `${fmt(design, 1)} A → เบรกเกอร์ ${breaker} A`,
        },
        {
          label: "ปรับค่าตามหน้างาน",
          expr: "It = เบรกเกอร์ ÷ (Kt × Kg)",
          subst: `It = ${breaker} ÷ (${fmt(kt, 2)} × ${fmt(kg, 2)}) = ${fmt(needed, 1)} A`,
          note: "สายต้องทนกระแสได้ไม่น้อยกว่าพิกัดเบรกเกอร์ที่ป้องกันมันอยู่",
        },
        {
          label: "เปิดตารางเลือกสาย",
          expr: `พิกัดในตาราง (${conductorLabel}, ${methodLabel}) ≥ It`,
          subst: `${tableAmp} A ≥ ${fmt(needed, 1)} A → สาย ${cable.mm2} ตร.มม.`,
        },
        {
          label: "สายดินบริภัณฑ์",
          expr: "เปิดตามพิกัดเบรกเกอร์ (วสท. ตารางที่ 4-1)",
          subst: `เบรกเกอร์ ${breaker} A → สายดิน ${ground} ตร.มม.`,
        },
      ],
      constants: [ELEC.continuousFactor],
      assumptions: [
        "สายทองแดงหุ้มฉนวนพีวีซี ตัวนำ 70 °C ตาม มอก. 11-2553 เดินในท่อ",
        "อุณหภูมิโดยรอบอ้างอิงของตารางคือ 40 °C (ไม่ใช่ 30 °C แบบมาตรฐานเก่า)",
        "1 วงจร 1 เฟส นับตัวนำกระแส 2 เส้น · 3 เฟส นับ 3 เส้น",
        "ท่อฝังในผนังอิฐ-ปูนหรือคอนกรีต ระบายความร้อนได้ใกล้เคียงท่อเกาะผนัง จึงอยู่กลุ่ม 2 · กลุ่ม 1 ใช้เมื่อท่ออยู่ในฝ้า/ผนังที่มีฉนวนกันความร้อนหุ้ม",
      ],
      caveats: [...caveats, DISCLAIMER_C],
      refs: [
        { label: CABLE_TABLE_SOURCE },
        { label: KT_SOURCE },
        { label: KG_SOURCE },
        { label: "วสท. ตารางที่ 4-1 ขนาดต่ำสุดสายดินบริภัณฑ์" },
        { label: "มอก. 11-2553 สายไฟฟ้าทองแดงหุ้มฉนวนพีวีซี" },
      ],
    },
  }),
    invalid: overRange,
  };
}

/** แรงดันตก (V) ของสายทองแดง: ตัวคูณ 2 (1 เฟส ไป-กลับ) หรือ √3 (3 เฟส) × L × I × ρ ÷ A */
export function vdropVolts(il: number, len: number, mm2: number, phase: string): number {
  const k = phase === "3" ? ELEC.sqrt3.value : 2;
  return (k * len * il * ELEC.rhoCopper70.value) / Math.max(mm2, 0.5);
}

export function calcVdrop(v: Values) {
  const bad = guard("vdrop", v);
  if (bad) return bad;
  const il = num(v, "il", 15);
  const len = num(v, "len", 30);
  const mm2 = num(v, "mm2", 2.5);
  const volts = num(v, "volts", 220);
  const phase = str(v, "phase", "1");
  const k = phase === "3" ? ELEC.sqrt3.value : 2;
  const rho = ELEC.rhoCopper70.value;
  const vd = vdropVolts(il, len, mm2, phase);
  const pct = (vd / Math.max(volts, 1)) * 100;
  const branchLimit = ELEC.vdBranchLimit.value;
  const totalLimit = ELEC.vdTotalLimit.value;
  const okBranch = pct <= branchLimit;
  const okTotal = pct <= totalLimit;
  if (pct > ELEC.vdModelMax.value) {
    // สายเล็ก/ไกลจนแรงดันตกเกินครึ่ง: สูตรเส้นตรงให้ "แรงดันปลายทางติดลบ" ได้ ซึ่งไม่มีจริง — ไม่ตอบตัวเลข
    return blockedResult({
      headline: `แรงดันตกเกิน ${ELEC.vdModelMax.value}% — สาย ${fmt(mm2, 1)} ตร.มม. เล็กเกินไปสำหรับระยะ ${fmt(len)} ม. ที่ ${fmt(il, 1)} A`,
      rows: [
        { label: "เกณฑ์วงจรย่อย", value: `ไม่เกิน ${branchLimit}%` },
        { label: "เกณฑ์รวมทั้งระบบ", value: `ไม่เกิน ${totalLimit}%` },
        { label: "สรุป", value: "ใช้สายนี้ไม่ได้ — ขยายสายหรือย่อระยะแล้วคิดใหม่" },
      ],
      tip: "ขยับขนาดสายขึ้นหลายไซซ์ หรือย้ายตู้ไฟให้ใกล้โหลด แล้วคิดใหม่ ถ้าระยะไกลมากให้วิศวกรไฟฟ้าออกแบบ",
    });
  }

  const chartMax = Math.max(totalLimit + 1, Math.ceil(pct * 1.25));

  return resultX({
    title: "แรงดันตก",
    chart: {
      kind: "threshold",
      unit: "%",
      value: Math.round(pct * 100) / 100,
      max: chartMax,
      zones: [
        { upTo: branchLimit, tone: "good", label: `วงจรย่อย ${branchLimit}%` },
        { upTo: totalLimit, tone: "warn", label: `รวม ${totalLimit}%` },
        { upTo: chartMax, tone: "bad" },
      ],
    },
    headline: okBranch
      ? `แรงดันตก ${fmt(pct, 2)}% ผ่านเกณฑ์วงจรย่อย`
      : okTotal
        ? `แรงดันตก ${fmt(pct, 2)}% เกิน ${branchLimit}% ของวงจรย่อย`
        : `แรงดันตก ${fmt(pct, 2)}% เกินเกณฑ์รวม ${totalLimit}%`,
    rows: [
      { label: "แรงดันตก", value: `${fmt(vd, 2)} V` },
      { label: "คิดเป็น", value: `${fmt(pct, 2)} %`, emphasize: true },
      { label: "แรงดันปลายทาง", value: `${fmt(volts - vd, 1)} V` },
      { label: "เกณฑ์วงจรย่อย", value: `ไม่เกิน ${branchLimit}%` },
      { label: "เกณฑ์รวมทั้งระบบ", value: `ไม่เกิน ${totalLimit}%` },
      { label: "สรุป", value: okBranch ? "ใช้สายนี้ได้" : "ขยายสายหรือย่อระยะ" },
    ],
    tip: okBranch
      ? "อยู่ในเกณฑ์วงจรย่อยของ วสท."
      : "ขยับสายขึ้นหนึ่งไซซ์แล้วคิดใหม่ หรือย้ายตู้ไฟให้ใกล้โหลดขึ้น",
    explain: {
      risk: "B",
      updatedAt: "2026-11-25",
      summary:
        phase === "3"
          ? "VD = √3 × L × I × ρ ÷ A  แล้วเทียบเป็น % ของแรงดันระบบ"
          : "VD = 2 × L × I × ρ ÷ A  แล้วเทียบเป็น % ของแรงดันระบบ",
      steps: [
        {
          label: "ความยาวเส้นทางกระแส",
          expr: phase === "3" ? "ตัวคูณ = √3 (สามเฟส)" : "ตัวคูณ = 2 (ไปและกลับ)",
          subst: `ตัวคูณ = ${fmt(k, 3)}`,
          note: "ระบบ 1 เฟส กระแสวิ่งไปกลับ 2 เส้น จึงคูณ 2",
        },
        {
          label: "แรงดันที่ตกไป",
          expr: "VD = ตัวคูณ × L × I × ρ ÷ A",
          subst: `VD = ${fmt(k, 3)} × ${fmt(len)} × ${fmt(il, 1)} × ${rho} ÷ ${fmt(mm2, 1)} = ${fmt(vd, 2)} V`,
        },
        {
          label: "คิดเป็นเปอร์เซ็นต์",
          expr: "%VD = VD ÷ V × 100",
          subst: `%VD = ${fmt(vd, 2)} ÷ ${fmt(volts)} × 100 = ${fmt(pct, 2)} %`,
        },
        {
          label: "เทียบเกณฑ์",
          expr: `วงจรย่อย ≤ ${branchLimit}% · รวมทั้งระบบ ≤ ${totalLimit}%`,
          subst: `${fmt(pct, 2)}% → ${okBranch ? "ผ่าน" : "ไม่ผ่าน"}`,
        },
      ],
      constants: [ELEC.rhoCopper70, ELEC.vdBranchLimit, ELEC.vdTotalLimit],
      assumptions: [
        "ตัวนำทองแดง คิดความต้านทานที่อุณหภูมิใช้งาน 70 °C ตามที่มาตรฐานกำหนด",
        "คิดเฉพาะความต้านทาน ไม่รวมรีแอกแตนซ์ ซึ่งพอใช้กับสายขนาดไม่เกิน 95 ตร.มม.",
      ],
      caveats: [
        "ถ้าคิดที่ 20 °C (ρ = 0.0178) จะได้ค่าต่ำกว่านี้ประมาณ 20% ซึ่งไม่ใช่วิธีที่มาตรฐานใช้",
        "สายใหญ่กว่า 95 ตร.มม. หรือระบบที่มีฮาร์มอนิก ต้องคิดอิมพีแดนซ์เต็มรูปแบบ",
      ],
      refs: [
        { label: "วสท. มาตรฐานการติดตั้งทางไฟฟ้าสำหรับประเทศไทย — เกณฑ์แรงดันตก 3% / 5%" },
        { label: "IEC 60364-5-52 ภาคผนวก G (คิดแรงดันตกที่อุณหภูมิตัวนำใช้งาน)" },
      ],
    },
  });
}

export function calcSolar(v: Values) {
  const bad = guard("solar", v);
  if (bad) return bad;
  const kwh = num(v, "kwh", 400);
  const sun = num(v, "sun", 4.5);
  const panel = num(v, "panel", 450);
  const rate = num(v, "rate", 4.2);
  const pricePerKwp = num(v, "pricePerKwp", SOLAR.pricePerKwp.value);
  const derate = SOLAR.derate.value;
  const needKw = kwh / (sun * 30 * derate);
  const needW = needKw * 1000;
  const n = ceil(needKw / (panel / 1000));
  const installKw = (n * panel) / 1000;
  // พื้นที่แผงคิดตามกำลังแผง (แผงวัตต์สูงใหญ่ขึ้น) ไม่ใช่ 2.3 ตร.ม. ตายตัวทุกขนาด
  const panelM2 = panel / SOLAR.panelWm2.value;
  const area = n * panelM2;
  const bigForSinglePhase = installKw > SOLAR.singlePhaseCheckKw.value;
  const price = installKw * pricePerKwp;
  const monthSave = Math.min(kwh, installKw * sun * 30 * derate) * rate;
  // เซฟเป็น 0 (ค่าไฟ 0 บาท) = ไม่มีวันคืนทุน ห้ามตอบ "0 เดือน"
  const paybackMonths = monthSave > 0 ? price / monthSave : null;
  const paybackText =
    paybackMonths === null ? "ไม่คืนทุนในเงื่อนไขนี้" : `${fmt(paybackMonths / 12, 1)} ปี (${fmt(ceil(paybackMonths))} เดือน)`;
  const chosenW = n * panel;
  const ladder = [n - 2, n - 1, n, n + 1, n + 2].filter((x) => x > 0).map((x) => x * panel);

  return resultX({
    title: "คืนทุนโซลาร์",
    headline:
      paybackMonths === null
        ? `ประมาณ ${fmt(n)} แผง · ไม่คืนทุนในเงื่อนไขนี้`
        : `ประมาณ ${fmt(n)} แผง · คืนทุนราว ${fmt(paybackMonths / 12, 1)} ปี`,
    chart:
      ladder.length > 1
        ? {
            kind: "steps",
            unit: "W",
            need: round(needW, 0),
            needLabel: "กำลังที่ต้องใช้",
            items: ladder.map((w) => ({
              label: `${Math.round(w / panel)} แผง`,
              value: w,
              state: w === chosenW ? "chosen" : w < needW ? "under" : "over",
            })),
          }
        : undefined,
    rows: [
      { label: "กำลังที่ต้องใช้", value: `${fmt(needKw, 2)} kWp` },
      { label: "จำนวนแผง", value: `${fmt(n)} แผง × ${fmt(panel)} W = ${fmt(installKw, 2)} kWp`, emphasize: true },
      { label: "พื้นที่หลังคา", value: `${fmt(area, 1)} ตร.ม. (แผงละ ≈ ${fmt(panelM2, 2)} ตร.ม.)` },
      ...(bigForSinglePhase
        ? [
            {
              label: "ตรวจเงื่อนไขการไฟฟ้า",
              value: `ระบบ ${fmt(installKw, 2)} kWp ใหญ่สำหรับบ้านไฟ 1 เฟส — ถามการไฟฟ้า/ผู้ติดตั้งก่อนว่ามิเตอร์ที่มีขนานได้ขนาดเท่าไร อาจต้องลดขนาดหรือเปลี่ยนเป็น 3 เฟส`,
              emphasize: true,
            },
          ]
        : []),
      { label: "ราคาชุดโดยประมาณ", value: `${fmt(price)} บาท (${fmt(pricePerKwp)} บาท/kWp)` },
      { label: "เซฟค่าไฟ/เดือน", value: `${fmt(ceil(monthSave))} บาท` },
      { label: "คืนทุนคร่าว", value: paybackText, emphasize: true },
    ],
    tip: "ราคาต่อ kWp เป็นค่าประมาณตลาด แก้เป็นราคาจากใบเสนอราคาจริงได้ · คิดว่าไฟที่ผลิตถูกใช้เองทั้งหมด บ้านที่กลางวันไม่มีคนอยู่จะคืนทุนช้ากว่านี้",
    explain: {
      risk: "A",
      updatedAt: "2026-11-25",
      summary:
        "กำลังแผงที่ต้องติด = หน่วยไฟต่อเดือน ÷ (ชั่วโมงแดดเทียบเท่า × 30 × ประสิทธิภาพระบบ) → จำนวนแผง → ราคาชุด = kWp ที่ติด × ราคาต่อ kWp → คืนทุน = ราคาชุด ÷ ค่าไฟที่เซฟต่อเดือน",
      steps: [
        {
          label: "กำลังติดตั้งที่ต้องการ",
          expr: "kWp = หน่วยไฟ/เดือน ÷ (ชั่วโมงแดด × 30 × ประสิทธิภาพระบบ)",
          subst: `${fmt(kwh)} ÷ (${fmt(sun, 1)} × 30 × ${derate}) = ${fmt(needKw, 2)} kWp`,
          note: `ประสิทธิภาพระบบ ${derate} คิดรวมการสูญเสียจากอินเวอร์เตอร์ สายไฟ และฝุ่น/อุณหภูมิแผง`,
        },
        {
          label: "จำนวนแผง",
          expr: "n = kWp ÷ (กำลังแผง ÷ 1000) ปัดขึ้น",
          subst: `${fmt(needKw, 2)} ÷ ${fmt(panel / 1000, 2)} = ${fmt(n)} แผง (ติดจริง ${fmt(installKw, 2)} kWp)`,
        },
        {
          label: "ราคาชุดโดยประมาณ",
          expr: "ราคา = kWp ที่ติดจริง × ราคาต่อ kWp",
          subst: `${fmt(installKw, 2)} × ${fmt(pricePerKwp)} = ${fmt(price)} บาท`,
          note: "ราคาต่อ kWp เป็นสมมติฐานที่แก้ได้ ไม่ใช่ราคากลาง",
        },
        {
          label: "ค่าไฟที่ประหยัดได้และระยะคืนทุน",
          expr: "เซฟ/เดือน = min(ไฟที่ใช้, ไฟที่ผลิต) × ค่าไฟ/หน่วย · คืนทุน = ราคาชุด ÷ เซฟ/เดือน",
          subst:
            paybackMonths === null
              ? `เซฟ ${fmt(ceil(monthSave))} บาท/เดือน → ไม่คืนทุน`
              : `${fmt(price)} ÷ ${fmt(ceil(monthSave))} = ${fmt(ceil(paybackMonths))} เดือน ≈ ${fmt(paybackMonths / 12, 1)} ปี`,
        },
      ],
      constants: [SOLAR.derate, SOLAR.panelWm2, SOLAR.pricePerKwp],
      assumptions: [
        "ระบบ on-grid ผลิตไฟใช้เองทั้งหมดในเวลากลางวัน ไม่ได้คิดการขายไฟคืนหรือมิเตอร์สุทธิ",
        `ราคาติดตั้ง ${fmt(pricePerKwp)} บาท/kWp (ค่าตั้งต้น ${fmt(SOLAR.pricePerKwp.value)} = กลางช่วงตลาด ${SOLAR.pricePerKwp.range} บาท/kWp ปี 2568–2569)`,
        "ทิศทางและมุมติดตั้งแผงเหมาะสม ไม่มีเงาบังช่วงกลางวัน ไม่คิดค่าล้างแผง ค่าเสื่อมแผง และการขึ้นค่าไฟ",
      ],
      caveats: [
        "บ้านที่กลางวันใช้ไฟน้อยจะใช้ไฟโซลาร์เองได้แค่บางส่วน ระยะคืนทุนจริงยาวกว่าตัวเลขนี้",
        "ชั่วโมงแดดเทียบเท่า (peak sun hours) แต่ละพื้นที่และฤดูต่างกัน ค่าไฟจริงที่ประหยัดได้อาจสูง/ต่ำกว่านี้",
        "ยังไม่รวมค่าใช้จ่ายขออนุญาตเชื่อมต่อกับการไฟฟ้า (PEA/MEA) และเงื่อนไขมิเตอร์ที่เปลี่ยนได้ตามนโยบาย",
        "ขนาดระบบสูงสุดที่ขนานกับมิเตอร์ 1 เฟส/3 เฟสได้เป็นเงื่อนไขของการไฟฟ้า เครื่องมือนี้เตือนให้ไปตรวจ ไม่ได้ยืนยันตัวเลขตามระเบียบ",
        `พื้นที่แผงประมาณจาก ${SOLAR.panelWm2.value} W/ตร.ม. แผงรุ่นใหม่ประสิทธิภาพสูงกว่านี้ใช้พื้นที่น้อยลง ดูขนาดจริงในสเปกแผง`,
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวปฏิบัติงานประเมินระบบโซลาร์เซลล์ on-grid บ้านพักอาศัย" }, { label: SOLAR.pricePerKwp.source }],
    },
  });
}

export function calcString(v: Values) {
  const bad = guard("string", v);
  if (bad) return bad;
  const voc = num(v, "voc", 49.5);
  const vmp = num(v, "vmp", 41.5);
  const n = num(v, "n", 10);
  const vmin = num(v, "vmin", 200);
  const vmax = num(v, "vmax", 500);
  const cold = voc * n * SOLAR.vocCold.value;
  const vmpS = vmp * n;
  const okMax = cold <= vmax;
  const okMpp = vmpS >= vmin && vmpS <= vmax * 0.9;
  const chartMax = Math.max(vmax * 1.1, cold * 1.1);

  return resultX({
    title: "จัดสตริงโซลาร์",
    headline: okMax && okMpp ? "สตริงนี้เข้าอินเวอร์เตอร์ได้" : "สตริงยังไม่เข้าเกณฑ์ — ห้ามติดตั้งจนกว่าจะผ่าน",
    chart: {
      kind: "threshold",
      unit: "V",
      value: round(cold, 1),
      max: chartMax,
      zones: [
        { upTo: vmax, tone: "good", label: `ไม่เกินพิกัดเครื่อง (${fmt(vmax)} V)` },
        { upTo: chartMax, tone: "bad", label: "เกินพิกัด — ลดแผงต่อสตริง" },
      ],
    },
    rows: [
      { label: "Vmp รวม", value: `${fmt(vmpS, 1)} V` },
      { label: "Voc เย็น (×1.15)", value: `${fmt(cold, 1)} V`, emphasize: true },
      { label: "ช่วง MPPT", value: `${fmt(vmin)}–${fmt(vmax)} V` },
      { label: "Voc ไม่เกินเครื่อง", value: okMax ? "ผ่าน" : "เกิน — ลดแผง" },
      { label: "Vmp ในช่วง", value: okMpp ? "ผ่าน" : "ไม่ผ่าน — ปรับจำนวนแผง" },
    ],
    tip: "ตัวคูณ 1.15 เผื่อเช้าหนาว เช็กสเปกรุ่นอินเวอร์เตอร์อีกครั้งก่อนสั่งของ",
    explain: {
      risk: "C",
      updatedAt: "2026-08-21",
      summary: "Voc รวมของสตริงตอนอากาศเย็น (คูณเผื่อ 1.15) ต้องไม่เกินพิกัดแรงดันสูงสุดของอินเวอร์เตอร์ และ Vmp รวมต้องอยู่ในช่วง MPPT",
      steps: [
        {
          label: "Voc รวมตอนอากาศเย็น",
          expr: `Voc เย็น = Voc/แผง × จำนวนแผง × ${SOLAR.vocCold.value}`,
          subst: `${fmt(voc, 1)} × ${fmt(n)} × ${SOLAR.vocCold.value} = ${fmt(cold, 1)} V`,
          note: "แผงโซลาร์ให้แรงดันสูงขึ้นเมื่ออุณหภูมิต่ำ ตัวคูณ 1.15 เผื่อเช้าหนาวหรือฤดูหนาว",
        },
        {
          label: "Vmp รวม (จุดทำงานจริง)",
          expr: "Vmp รวม = Vmp/แผง × จำนวนแผง",
          subst: `${fmt(vmp, 1)} × ${fmt(n)} = ${fmt(vmpS, 1)} V`,
        },
        {
          label: "เทียบกับพิกัดอินเวอร์เตอร์",
          expr: `Voc เย็น ≤ ${fmt(vmax)} V (พิกัดสูงสุด) และ Vmp รวม อยู่ในช่วง MPPT ${fmt(vmin)}–${fmt(vmax)} V`,
          subst: `${fmt(cold, 1)} V → ${okMax ? "ผ่าน" : "เกิน"} · ${fmt(vmpS, 1)} V → ${okMpp ? "ผ่าน" : "ไม่ผ่าน"}`,
        },
      ],
      assumptions: ["แผงโซลาร์รุ่นเดียวกันทุกแผงในสตริง ต่อกันแบบอนุกรม (series) ทั้งหมด"],
      caveats: [
        "อุณหภูมิเย็นจัด (ต่ำกว่า 0°C) แรงดัน Voc อาจสูงกว่าตัวคูณ 1.15 ให้เช็ก temperature coefficient ของแผงจริง",
        "แรงดันเกินพิกัดอินเวอร์เตอร์เสี่ยงอุปกรณ์เสียหายและอันตรายทางไฟฟ้า ต้องผ่านทั้งสองเกณฑ์ก่อนติดตั้งจริง",
        DISCLAIMER_C,
      ],
      refs: [{ label: "คู่มือออกแบบระบบโซลาร์เซลล์ (String Sizing) ตามสเปกอินเวอร์เตอร์" }],
    },
  });
}

export function calcBattery(v: Values) {
  const bad = guard("battery", v);
  if (bad) return bad;
  const wh = num(v, "wh", 2000);
  const days = num(v, "days", 1);
  const dod = num(v, "dod", 80) / 100;
  const eff = num(v, "eff", 90) / 100;
  const volt = num(v, "volt", 24);
  const usedKwh = (wh * days) / 1000;
  const kwh = usedKwh / (dod * eff);
  const ah = (kwh * 1000) / volt;
  const reserve = kwh - usedKwh;
  // แบตซื้อเป็นลูก/โมดูลเต็ม: ปัดขึ้นตามความจุต่อโมดูลที่กรอก
  const modAh = num(v, "modAh", 100);
  const modules = ceil(ah / modAh - 1e-9);
  const packAh = modules * modAh;
  const packKwh = (packAh * volt) / 1000;
  const voltText = fmtTrim(volt, 1);

  return resultX({
    title: "ขนาดแบตเตอรี่",
    headline: `แบต ${fmt(modules)} โมดูล × ${fmt(modAh)} Ah ที่ ${voltText}V (ต้องการ ${fmt(kwh, 2)} kWh · ${fmt(ceil(ah))} Ah)`,
    chart: {
      kind: "stack",
      parts: [
        { label: "พลังงานที่ใช้จริง", value: usedKwh, display: `${fmt(usedKwh, 2)} kWh`, tone: "accent" },
        { label: "กันสำรอง (DoD + สูญเสีย)", value: reserve, display: `${fmt(reserve, 2)} kWh`, tone: "mute" },
      ],
      totalLabel: "ความจุแบตเตอรี่นามผล",
      totalDisplay: `${fmt(kwh, 2)} kWh`,
    },
    rows: [
      { label: "พลังงานที่ต้องเก็บ", value: `${fmt(kwh, 2)} kWh`, emphasize: true },
      { label: "ความจุ", value: `${fmt(ceil(ah))} Ah @ ${voltText} V` },
      { label: "ซื้อเป็นโมดูล", value: `${fmt(modules)} โมดูล × ${fmt(modAh)} Ah = ${fmt(packAh)} Ah (${fmt(packKwh, 2)} kWh)`, emphasize: true },
      { label: "DoD ที่ใช้คิด", value: `${fmt(dod * 100)}%` },
    ],
    tip: "ลิเธียมใช้ DoD 80% ได้ ถ้าเป็นแบตตะกั่วกรดให้ใส่ 50 ในช่อง DoD เพราะลากลึกกว่านั้นแบตเสื่อมเร็ว",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "ความจุแบตนามผล = พลังงานที่ใช้จริง ÷ (DoD × ประสิทธิภาพ) เพราะดึงแบตได้ไม่เต็ม 100% และมีสูญเสียจากการแปลงพลังงาน",
      steps: [
        {
          label: "พลังงานที่ใช้จริงต่อรอบสำรอง",
          expr: "ใช้จริง = Wh/วัน × วันสำรอง",
          subst: `${fmt(wh)} × ${fmt(days, 1)} ÷ 1000 = ${fmt(usedKwh, 2)} kWh`,
        },
        {
          label: "ความจุนามผลที่ต้องมี",
          expr: "kWh = ใช้จริง ÷ (DoD × ประสิทธิภาพ)",
          subst: `${fmt(usedKwh, 2)} ÷ (${fmt(dod, 2)} × ${fmt(eff, 2)}) = ${fmt(kwh, 2)} kWh`,
        },
        {
          label: "แปลงเป็น Ah ที่แรงดันชุด",
          expr: "Ah = kWh × 1000 ÷ V",
          subst: `${fmt(kwh, 2)} × 1000 ÷ ${voltText} = ${fmt(ah, 0)} Ah`,
        },
        {
          label: "ปัดเป็นโมดูลที่ซื้อได้",
          expr: "โมดูล = ปัดขึ้น(Ah ÷ Ah ต่อโมดูล)",
          subst: `${fmt(ah, 0)} ÷ ${fmt(modAh)} = ${fmt(modules)} โมดูล (${fmt(packAh)} Ah)`,
          note: "โมดูลนับที่แรงดันชุด ถ้าใช้แบต 12 V ต่ออนุกรม จำนวนลูก = โมดูล × (แรงดันชุด ÷ 12)",
        },
      ],
      assumptions: ["โหลดคงที่ตลอดวัน ไม่ได้คิดกำลังสูงสุด (peak) ที่อาจต้องใช้อินเวอร์เตอร์กำลังสูงกว่าค่าเฉลี่ย"],
      caveats: [
        "แบตเตอรี่ลิเธียม (LiFePO4) ลาก DoD 80–90% ได้โดยไม่เสียอายุการใช้งานเร็ว ส่วนตะกั่วกรดควรลากไม่เกิน 50%",
        "ประสิทธิภาพ 90% เป็นค่ารวมอินเวอร์เตอร์/ชาร์จเจอร์ ระบบจริงอาจสูญเสียมากกว่านี้ถ้าสายไฟหรืออุปกรณ์ไม่เหมาะกับกำลัง",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวปฏิบัติงานออกแบบระบบแบตเตอรี่สำรองไฟ (Off-grid/Hybrid)" }],
    },
  });
}

export function calcElecUnit(v: Values) {
  const bad = guard("unit", v);
  if (bad) return bad;
  const from = str(v, "from", "w");
  const x = num(v, "x", 1000);
  const volts = num(v, "volts", 220);
  const pf = num(v, "pf", 1);
  let w = x;
  if (from === "a") w = x * volts * pf;
  const wPerHp = PUMP.hpPerKw.value * 1000;
  const btuPerW = AC.wattToBtu.value;
  if (from === "hp") w = x * wPerHp;
  if (from === "btu") w = x / btuPerW;
  const amp = w / (volts * Math.max(pf, 0.1));
  const hp = w / wPerHp;
  const btu = w * btuPerW;
  const designAmp = amp * ELEC.continuousFactor.value;
  const chosenIdx = BREAKER_SIZES.findIndex((b) => b >= designAmp);
  const chosenBreaker = chosenIdx < 0 ? undefined : BREAKER_SIZES[chosenIdx];
  const ladder = chosenIdx < 0 ? [] : BREAKER_SIZES.slice(Math.max(0, chosenIdx - 2), chosenIdx + 3);

  return resultX({
    title: "แปลงหน่วยไฟฟ้า",
    rows: [
      { label: "วัตต์", value: `${fmt(w, 1)} W`, emphasize: true },
      { label: "แอมป์ @ PF", value: `${fmt(amp, 2)} A` },
      { label: "แรงม้า", value: `${fmt(hp, 2)} HP` },
      { label: "BTU/ชม.", value: `${fmt(btu, 0)} BTU` },
    ],
    chart:
      ladder.length > 1
        ? {
            kind: "steps",
            unit: "A",
            need: round(designAmp, 1),
            needLabel: "เผื่อโหลดต่อเนื่อง 125% แล้วต้องมีเบรกเกอร์ไม่น้อยกว่า",
            items: ladder.map((a) => ({
              label: `${a} A`,
              value: a,
              state: a === chosenBreaker ? "chosen" : a < designAmp ? "under" : "over",
            })),
          }
        : undefined,
    tip: "คิดกำลังไฟฟ้าคร่าว ๆ ของมอเตอร์ให้คูณ PF จริง",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "แปลงกำลังไฟฟ้าไปมาระหว่างวัตต์ แอมป์ แรงม้า และ BTU/ชม. ด้วยความสัมพันธ์นิยามหน่วยมาตรฐาน",
      steps: [
        {
          label: "แปลงค่าที่กรอกเป็นวัตต์",
          expr: from === "a" ? "W = A × V × PF" : from === "hp" ? "W = HP × 746" : from === "btu" ? "W = BTU ÷ 3.412" : "W = ค่าที่กรอก",
          subst: `${fmt(x)} → ${fmt(w, 1)} W`,
        },
        {
          label: "แปลงเป็นหน่วยอื่น",
          expr: "A = W ÷ (V × PF) · HP = W ÷ 746 · BTU = W × 3.412",
          subst: `${fmt(amp, 2)} A · ${fmt(hp, 2)} HP · ${fmt(btu, 0)} BTU`,
        },
      ],
      assumptions: ["PF (Power Factor) ตามที่กรอก มอเตอร์ทั่วไป PF อยู่ที่ 0.8–0.95 ไม่ใช่ 1 เสมอ"],
      caveats: ["มอเตอร์ตอนสตาร์ทดึงกระแสสูงกว่าตอนทำงานปกติ 3–7 เท่า ถ้าเลือกเบรกเกอร์ต้องเผื่อกระแสสตาร์ทด้วย", DISCLAIMER_AB],
      refs: [{ label: "นิยามหน่วยกำลังไฟฟ้า (W, HP, BTU/ชม.) และวสท. ตัวคูณโหลดต่อเนื่อง 125%" }],
    },
  });
}

/* ─────────── จำนวนสายในท่อ ─────────── */

type ConduitKind = "emt" | "imc" | "custom";

const CONDUIT_KIND_NAME: Record<ConduitKind, string> = {
  emt: "ท่อเหล็กบาง EMT",
  imc: "ท่อเหล็กหนา IMC",
  custom: "ท่อที่วัดขนาดในเอง",
};

/** เกณฑ์พื้นที่สายในท่อตามจำนวนเส้นทั้งหมดในท่อ: 1 เส้น 53% · 2 เส้น 31% · 3 เส้นขึ้นไป 40% */
export function conduitFillLimit(count: number): ConstRef {
  if (count <= 1) return CONDUIT_FILL.one;
  if (count === 2) return CONDUIT_FILL.two;
  return CONDUIT_FILL.many;
}

function circleArea(d: number): number {
  return (Math.PI / 4) * d * d;
}

/** พื้นที่หน้าตัดรวมฉนวนของสาย THW หนึ่งเส้น (ตร.มม.) จาก OD ในตาราง */
export function thwArea(mm2: number): { od: number; area: number } {
  const row = THW_OD.find((r) => r.mm2 === mm2) ?? THW_OD[1];
  return { od: row.od, area: circleArea(row.od) };
}

/** สายขนาดเดียวกันใส่ท่อได้กี่เส้น — ลองเกณฑ์ 40% ก่อน ถ้าได้ไม่ถึง 3 เส้นถอยไปเช็ก 2 เส้น (31%) และ 1 เส้น (53%) */
export function maxWiresIn(conduitArea: number, wireArea: number): number {
  const fits = (n: number) => n * wireArea <= (conduitArea * conduitFillLimit(n).value) / 100 + 1e-9;
  const many = Math.floor((conduitArea * CONDUIT_FILL.many.value) / 100 / wireArea + 1e-9);
  if (many >= 3) return many;
  if (fits(2)) return 2;
  if (fits(1)) return 1;
  return 0;
}

/** ท่อที่เลือกได้ตามชนิด — ท่อเหล็กมี 4 ขนาด · ท่อวัดเองมีขนาดเดียวตามที่กรอก */
function conduitCandidates(kind: ConduitKind, idMm: number) {
  if (kind === "custom") {
    const name = `ขนาดใน ${fmtTrim(idMm, 1)} มม.`;
    return [{ key: "custom", name, short: name, id: idMm }];
  }
  return CONDUIT_SIZES.map((s) => ({ key: s.key as string, name: s.label as string, short: s.short as string, id: kind === "imc" ? s.imc : s.emt }));
}

/** แถวเตือนลดพิกัดสายเมื่อมีหลายวงจรในท่อเดียว (ใช้ตารางกลุ่มวงจรเดียวกับเครื่องมือเลือกสาย) */
function groupingRow(currentWires: number) {
  const circuits = Math.floor(currentWires / 2);
  if (circuits <= 1) return { label: "ลดพิกัดสาย", value: "วงจรเดียวในท่อ ไม่ต้องลด" };
  const kg = groupingFactor(circuits);
  return {
    label: "ลดพิกัดสาย (ถ้าเป็นวงจร 1 เฟส)",
    value:
      kg === null
        ? `${circuits} วงจรในท่อเดียว เกินตาราง (${KG_CIRCUITS_MAX} วงจร) — แยกท่อ`
        : `${circuits} วงจร → สายทนกระแสได้ ${fmt(kg * 100)}% (ตัวคูณ ${fmtTrim(kg, 2)}) คิดต่อในเครื่องมือเลือกขนาดสายไฟ`,
  };
}

export function calcConduit(v: Values) {
  const bad = guard("conduit", v);
  if (bad) return bad;
  const mode = str(v, "mode", "max");
  const kindRaw = str(v, "kind", "emt");
  const kind: ConduitKind = kindRaw === "imc" || kindRaw === "custom" ? kindRaw : "emt";
  const idMm = num(v, "idMm", 16);
  const mm2 = Number(str(v, "wire", "2.5"));
  const wire = thwArea(mm2);
  const candidates = conduitCandidates(kind, idMm);
  const kindName = CONDUIT_KIND_NAME[kind];

  const common = {
    assumptions: [
      `สาย THW (60227 IEC 01) แกนเดียว คิด OD สูงสุดตาม IEC 60227-3 (สาย ${fmtTrim(mm2, 1)} ตร.มม. = Ø ${fmtTrim(wire.od, 1)} มม.)`,
      kind === "custom" ? "ขนาดในท่อตามที่วัดและกรอกเอง" : `ขนาดใน${kindName}ตาม NEC Chapter 9 Table 4 (มิติ ANSI ที่ มอก. 770 อิง)`,
      "พื้นที่สายรวมไม่เกิน 53% (1 เส้น) · 31% (2 เส้น) · 40% (3 เส้นขึ้นไป) ของพื้นที่ในท่อ",
    ],
    caveats: [
      "ตรวจกับ วสท. ฉบับจริงก่อนใช้เป็นข้อกำหนด — เกณฑ์และขนาดท่อในเครื่องมือนี้ยังไม่ได้เทียบเล่มจริง",
      "ท่อยาวหรือโค้งรวมเกิน 360° ระหว่างกล่องดึงสาย ร้อยยากกว่าที่คิดได้ ให้เผื่อกล่องดึงสายหรือใช้ท่อใหญ่ขึ้น",
      "หลายวงจรในท่อเดียว สายร้อนขึ้น ต้องลดพิกัดสาย (ดูแถวลดพิกัด) ไม่ใช่แค่ใส่ได้ก็พอ",
      "สายยี่ห้อจริงมักเล็กกว่า OD ที่ใช้คิดเล็กน้อย ผลจึงเอียงไปทางใส่ได้น้อยกว่าจริง",
      DISCLAIMER_AB,
    ],
    refs: [{ label: CONDUIT_SIZE_SOURCE }, { label: THW_OD_SOURCE }, { label: "NEC Chapter 9 Table 1 / วสท. — เกณฑ์พื้นที่สายในท่อ 53/31/40%" }],
  };

  if (mode !== "min") {
    const sizeKey = str(v, "size", "0.5");
    const conduit = candidates.find((c) => c.key === sizeKey) ?? candidates[0];
    const conduitArea = circleArea(conduit.id);
    const n = maxWiresIn(conduitArea, wire.area);
    if (n === 0) {
      return blockedResult({
        headline: `สาย ${fmtTrim(mm2, 1)} ตร.มม. ใหญ่เกินท่อ ${conduit.name} — ใส่ไม่ได้สักเส้น`,
        rows: [
          { label: "พื้นที่ในท่อ", value: `${fmt(conduitArea, 1)} ตร.มม.` },
          { label: "พื้นที่สาย 1 เส้น", value: `${fmt(wire.area, 1)} ตร.มม. (ได้ไม่เกิน ${fmt((conduitArea * CONDUIT_FILL.one.value) / 100, 1)} ตร.มม.)` },
        ],
        tip: "ใช้ท่อใหญ่ขึ้น หรือตรวจขนาดในท่อที่กรอกอีกครั้ง (กรอกเป็นมิลลิเมตร)",
      });
    }
    const limit = conduitFillLimit(n);
    const fill = ((n * wire.area) / conduitArea) * 100;
    const chart: ChartSpec = {
      kind: "threshold",
      unit: "%",
      value: round(fill, 1),
      max: 100,
      zones: [
        { upTo: limit.value, tone: "good", label: `ไม่เกิน ${fmt(limit.value)}%` },
        { upTo: 100, tone: "bad", label: "แน่นเกิน ร้อยไม่เข้า/สายร้อน" },
      ],
    };
    return resultX({
      title: "จำนวนสายในท่อ",
      headline: `ท่อ ${conduit.name} ใส่สาย ${fmtTrim(mm2, 1)} ตร.มม. ได้ ${fmt(n)} เส้น`,
      chart,
      rows: [
        { label: "ท่อ", value: `${kindName} ${conduit.name}` },
        { label: "ขนาดในท่อ", value: `${fmtTrim(conduit.id, 2)} มม. (พื้นที่ ${fmt(conduitArea, 1)} ตร.มม.)` },
        { label: "สาย THW (IEC 01)", value: `${fmtTrim(mm2, 1)} ตร.มม. · Ø นอก ${fmtTrim(wire.od, 1)} มม. (${fmt(wire.area, 1)} ตร.มม./เส้น)` },
        { label: "ใส่ได้สูงสุด", value: `${fmt(n)} เส้น`, emphasize: true },
        { label: "สายเต็มท่อ", value: `${fmt(fill, 1)}% (เกณฑ์ ${fmt(limit.value)}% สำหรับ ${n >= 3 ? "3 เส้นขึ้นไป" : `${n} เส้น`})` },
        groupingRow(n),
      ],
      tip: "นับสายดินด้วยทุกเส้น · ใส่ได้ไม่ได้แปลว่าสายไม่ร้อน หลายวงจรในท่อเดียวต้องลดพิกัดสาย",
      explain: {
        risk: "B",
        updatedAt: "2026-11-25",
        summary: "จำนวนสาย = ปัดลง(พื้นที่ในท่อ × 40% ÷ พื้นที่สาย 1 เส้น) — ถ้าได้ไม่ถึง 3 เส้น เช็กเกณฑ์ 2 เส้น 31% และ 1 เส้น 53% แทน",
        steps: [
          { label: "พื้นที่ในท่อ", expr: "π/4 × ขนาดใน²", subst: `π/4 × ${fmtTrim(conduit.id, 2)}² = ${fmt(conduitArea, 1)} ตร.มม.` },
          { label: "พื้นที่สาย 1 เส้น (รวมฉนวน)", expr: "π/4 × Ø นอก²", subst: `π/4 × ${fmtTrim(wire.od, 1)}² = ${fmt(wire.area, 2)} ตร.มม.` },
          {
            label: "จำนวนเส้นที่ใส่ได้",
            expr: "ปัดลง(พื้นที่ท่อ × เกณฑ์ ÷ พื้นที่สาย)",
            subst: `${fmt(conduitArea, 1)} × ${fmt(limit.value)}% ÷ ${fmt(wire.area, 2)} → ${fmt(n)} เส้น (เต็ม ${fmt(fill, 1)}%)`,
          },
        ],
        constants: [CONDUIT_FILL.one, CONDUIT_FILL.two, CONDUIT_FILL.many],
        ...common,
      },
    });
  }

  // โหมดย้อนกลับ: มีสายเท่านี้ ต้องใช้ท่อเล็กสุดขนาดไหน
  const n1 = num(v, "n", 6);
  const mm2b = Number(str(v, "wire2", "2.5"));
  const n2 = num(v, "n2", 0);
  const wire2 = thwArea(mm2b);
  const count = n1 + n2;
  const wiresArea = n1 * wire.area + n2 * wire2.area;
  const limit = conduitFillLimit(count);
  const allowed = (id: number) => (circleArea(id) * limit.value) / 100;
  const pick = candidates.find((c) => wiresArea <= allowed(c.id) + 1e-9);
  const wireText = `${fmt(n1)} × ${fmtTrim(mm2, 1)}${n2 > 0 ? ` + ${fmt(n2)} × ${fmtTrim(mm2b, 1)}` : ""} ตร.มม.`;
  if (!pick) {
    const biggest = candidates[candidates.length - 1];
    return blockedResult({
      headline:
        kind === "custom"
          ? `สาย ${wireText} ใส่ท่อ ${biggest.name} ไม่ได้ — แน่นเกินเกณฑ์ ${fmt(limit.value)}%`
          : `สาย ${wireText} เกินท่อ ${biggest.name} — แบ่งเป็นหลายท่อ หรือใช้รางเดินสาย`,
      rows: [
        { label: "พื้นที่สายรวม", value: `${fmt(wiresArea, 1)} ตร.มม.` },
        { label: `ท่อ ${biggest.name} รับได้`, value: `${fmt(allowed(biggest.id), 1)} ตร.มม. (${fmt(limit.value)}% ของพื้นที่ใน)` },
      ],
      tip: "แยกวงจรลงหลายท่อ จะได้ไม่ต้องลดพิกัดสายมากด้วย",
    });
  }
  const pickArea = circleArea(pick.id);
  const fill = (wiresArea / pickArea) * 100;
  const chart: ChartSpec =
    candidates.length > 1
      ? {
          kind: "steps",
          unit: "ตร.มม.",
          need: round(wiresArea, 1),
          needLabel: "พื้นที่สายรวม",
          items: candidates.map((c) => ({
            label: c.short,
            value: round(allowed(c.id), 1),
            state: c.key === pick.key ? "chosen" : allowed(c.id) < wiresArea ? "under" : "over",
          })),
        }
      : {
          kind: "threshold",
          unit: "%",
          value: round(fill, 1),
          max: 100,
          zones: [
            { upTo: limit.value, tone: "good", label: `ไม่เกิน ${fmt(limit.value)}%` },
            { upTo: 100, tone: "bad", label: "แน่นเกิน" },
          ],
        };
  return resultX({
    title: "ขนาดท่อร้อยสาย",
    headline: kind === "custom" ? `ใส่ได้ — สายเต็มท่อ ${fmt(fill, 1)}%` : `ใช้ท่อ ${pick.name} ขึ้นไป`,
    chart,
    rows: [
      { label: "สายในท่อ", value: `${wireText} รวม ${fmt(count)} เส้น` },
      { label: "พื้นที่สายรวม", value: `${fmt(wiresArea, 1)} ตร.มม.` },
      { label: "เกณฑ์", value: `ไม่เกิน ${fmt(limit.value)}% ของพื้นที่ในท่อ` },
      { label: kind === "custom" ? "ท่อที่กรอก" : "ท่อเล็กสุดที่ใส่ได้", value: `${kindName} ${pick.name}`, emphasize: true },
      { label: "สายเต็มท่อ", value: `${fmt(fill, 1)}%` },
      groupingRow(n1),
    ],
    tip: "เดินโค้งเยอะหรือท่อยาว ขยับขึ้นอีกขนาดจะร้อยง่ายกว่า · หลายวงจรในท่อเดียวต้องลดพิกัดสาย",
    explain: {
      risk: "B",
      updatedAt: "2026-11-25",
      summary: "พื้นที่สายรวม (รวมฉนวน) ต้องไม่เกินเกณฑ์ของพื้นที่ในท่อ — เลือกท่อเล็กสุดที่ผ่าน",
      steps: [
        {
          label: "พื้นที่สายรวม",
          expr: "Σ จำนวน × π/4 × Ø นอก²",
          subst: `${fmt(n1)} × ${fmt(wire.area, 2)}${n2 > 0 ? ` + ${fmt(n2)} × ${fmt(wire2.area, 2)}` : ""} = ${fmt(wiresArea, 1)} ตร.มม.`,
        },
        { label: "เกณฑ์ตามจำนวนเส้น", expr: "1 เส้น 53% · 2 เส้น 31% · 3 เส้นขึ้นไป 40%", subst: `${fmt(count)} เส้น → ${fmt(limit.value)}%` },
        {
          label: "เลือกท่อ",
          expr: "ท่อเล็กสุดที่ π/4 × ขนาดใน² × เกณฑ์ ≥ พื้นที่สายรวม",
          subst: `${pick.name}: ${fmt(allowed(pick.id), 1)} ≥ ${fmt(wiresArea, 1)} ตร.มม. (เต็ม ${fmt(fill, 1)}%)`,
        },
      ],
      constants: [limit],
      ...common,
    },
  });
}

/* ═══════════════ รอบ 4 (2026-11-26): ค่าไฟเครื่องใช้ไฟฟ้า · โคมตามความสว่าง · เครื่องทำน้ำอุ่น · ชาร์จรถ EV ═══════════════ */

/** ชั่วโมงทศนิยม → "5 ชม. 24 นาที" (ปัดเป็นนาทีเต็มครั้งเดียวตอนแสดงผล) */
export function hoursText(h: number): string {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total - hh * 60;
  if (hh === 0) return `${fmt(mm)} นาที`;
  return mm === 0 ? `${fmt(hh)} ชม.` : `${fmt(hh)} ชม. ${fmt(mm)} นาที`;
}

/* ─────────── ค่าไฟเครื่องใช้ไฟฟ้า ─────────── */

const APPLIANCE_MAX = 6;
const APPLIANCE_DEFAULTS: Array<{ name: string; w: number; h: number; q: number }> = [
  { name: "หลอด LED", w: 9, h: 6, q: 8 },
  { name: "ทีวี", w: 100, h: 5, q: 1 },
  { name: "พัดลม", w: 60, h: 8, q: 2 },
  { name: "หม้อหุงข้าว", w: 700, h: 1, q: 1 },
  { name: "เตารีด", w: 1000, h: 0.5, q: 1 },
  { name: "คอมพิวเตอร์", w: 200, h: 4, q: 1 },
];

export type ApplianceLine = { name: string; w: number; h: number; q: number; kwh: number; baht: number };

/** หน่วยไฟ/เดือน = วัตต์ × ชม./วัน × จำนวน × วัน ÷ 1000 · ค่าไฟ = หน่วย × ค่าไฟต่อหน่วย */
export function applianceLine(w: number, h: number, q: number, days: number, rate: number) {
  const kwh = (w * h * q * days) / 1000;
  return { kwh, baht: kwh * rate };
}

export function calcAppliance(v: Values): CalcResult {
  const bad = guard("appliance", v);
  if (bad) return bad;
  const n = Number(str(v, "n", "3"));
  const days = num(v, "days", POWER_BILL.daysPerMonth.value);
  const rate = num(v, "rate", POWER_BILL.rate.value);
  const ft = num(v, "ft", 0);
  const unitPrice = rate + ft;
  const lines: ApplianceLine[] = [];
  for (let i = 1; i <= n; i++) {
    const d = APPLIANCE_DEFAULTS[i - 1];
    const name = str(v, `name${i}`, d.name).trim() || `เครื่องที่ ${i}`;
    const w = num(v, `w${i}`, d.w);
    const h = num(v, `h${i}`, d.h);
    const q = num(v, `q${i}`, d.q);
    lines.push({ name, w, h, q, ...applianceLine(w, h, q, days, unitPrice) });
  }
  const kwh = lines.reduce((s, x) => s + x.kwh, 0);
  const baht = kwh * unitPrice;
  const top = lines.reduce((a, b) => (b.baht > a.baht ? b : a), lines[0]);
  return resultX({
    title: "ค่าไฟเครื่องใช้ไฟฟ้า",
    headline: `ค่าไฟราว ${fmt(baht)} บาท/เดือน (${fmt(kwh, 1)} หน่วย)`,
    chart:
      lines.length > 1 && baht > 0
        ? {
            kind: "stack",
            parts: lines.map((x) => ({ label: x.name, value: x.baht, display: `${fmt(x.baht)} บาท` })),
            totalLabel: "รวมต่อเดือน",
            totalDisplay: `${fmt(baht)} บาท`,
          }
        : undefined,
    rows: [
      ...lines.map((x) => ({
        label: `${x.name} (${fmtTrim(x.w, 1)} W × ${fmtTrim(x.h, 2)} ชม. × ${fmt(x.q)})`,
        value: `${fmt(x.kwh, 1)} หน่วย · ${fmt(x.baht)} บาท`,
      })),
      { label: "รวมหน่วยไฟต่อเดือน", value: `${fmt(kwh, 1)} หน่วย (kWh)` },
      { label: `ค่าไฟต่อเดือน (${fmtTrim(unitPrice, 2)} บาท/หน่วย)`, value: `${fmt(baht)} บาท`, emphasize: true },
      { label: "ค่าไฟต่อปี", value: `${fmt(baht * 12)} บาท` },
      ...(lines.length > 1 && baht > 0 ? [{ label: "กินไฟมากสุด", value: `${top.name} ${fmt((top.baht / baht) * 100)}% ของทั้งหมด` }] : []),
    ],
    tip: "ตู้เย็นกับแอร์ คอมเพรสเซอร์ตัด-ต่อเป็นช่วง ใส่ชั่วโมงที่คอมเพรสเซอร์ทำงานจริง (ตู้เย็นราว 8–12 ชม./วัน) ไม่ใช่ 24 ชม.",
    explain: {
      risk: "A",
      updatedAt: "2026-11-26",
      summary: "หน่วยไฟ (kWh) = วัตต์ × ชั่วโมงต่อวัน × จำนวนเครื่อง × วันต่อเดือน ÷ 1,000 แล้วคูณค่าไฟต่อหน่วย",
      steps: [
        ...lines.map((x) => ({
          label: x.name,
          expr: "หน่วย = W × ชม./วัน × จำนวน × วัน ÷ 1000",
          subst: `${fmtTrim(x.w, 1)} × ${fmtTrim(x.h, 2)} × ${fmt(x.q)} × ${fmt(days)} ÷ 1000 = ${fmt(x.kwh, 2)} หน่วย`,
        })),
        {
          label: "ค่าไฟ",
          expr: "บาท = หน่วยรวม × (ค่าไฟต่อหน่วย + Ft ที่บวกเพิ่ม)",
          subst: `${fmt(kwh, 2)} × ${fmtTrim(unitPrice, 2)} = ${fmt(baht, 2)} บาท`,
        },
      ],
      constants: [POWER_BILL.rate, POWER_BILL.daysPerMonth],
      assumptions: [
        "วัตต์ที่ใส่คือกำลังขณะทำงานจริง (ป้ายเครื่องมักเป็นค่าสูงสุด ใช้จริงต่ำกว่า)",
        "ค่าไฟเป็นอัตราเฉลี่ยเดียวทุกหน่วย ไม่ได้คิดแบบขั้นบันได",
      ],
      caveats: [
        "อัตราไฟบ้านจริงเป็นขั้นบันได ยิ่งใช้มากหน่วยท้าย ๆ ยิ่งแพง และมีค่าบริการรายเดือน — เอาค่าไฟทั้งบิล ÷ หน่วยในบิลมาใส่จะใกล้ที่สุด",
        "ค่า Ft ปรับทุก 4 เดือน ถ้าอัตราที่ใส่ยังไม่รวม Ft ให้ใส่ในช่อง Ft",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "นิยามหน่วยไฟฟ้า 1 หน่วย = 1 kWh" }, { label: "อัตราค่าไฟฟ้าบ้านอยู่อาศัย กฟน./กฟภ. (ประเภท 1) และค่า Ft ของ กกพ." }],
    },
  });
}

function applianceFields(): Field[] {
  const out: Field[] = [];
  for (let i = 1; i <= APPLIANCE_MAX; i++) {
    const d = APPLIANCE_DEFAULTS[i - 1];
    const shown = Array.from({ length: APPLIANCE_MAX - i + 1 }, (_, k) => String(i + k));
    const when = i === 1 ? undefined : { key: "n", is: shown };
    out.push(
      { type: "text", key: `name${i}`, label: `เครื่องที่ ${i}: ชื่อ`, default: d.name, placeholder: "เช่น ตู้เย็น", ...(when ? { when } : {}) },
      { type: "number", key: `w${i}`, label: `เครื่องที่ ${i}: กำลังไฟ`, unit: "W", default: d.w, min: 0.5, max: 20000, step: 0.5, ...(when ? { when } : {}) },
      { type: "number", key: `h${i}`, label: `เครื่องที่ ${i}: ใช้วันละ`, unit: "ชม.", default: d.h, min: 0, max: 24, step: 0.25, ...(when ? { when } : {}) },
      { type: "number", key: `q${i}`, label: `เครื่องที่ ${i}: จำนวน`, unit: "เครื่อง", default: d.q, min: 1, max: 500, ...(when ? { when } : {}) },
    );
  }
  return out;
}

/* ─────────── จำนวนโคมตามความสว่าง (วิธีลูเมน) ─────────── */

/** จำนวนโคม = E × A ÷ (Φ × UF × MF) */
export function fixturesNeeded(lux: number, area: number, lumens: number, uf: number, mf: number): number {
  return (lux * area) / (lumens * uf * mf);
}

/**
 * จัดผังโคมเป็นตาราง แถว × ดวง ให้ระยะสองทิศใกล้กันที่สุด
 * ลองทุกจำนวนแถว r (ตามด้านกว้าง) ดวงต่อแถว c = ปัดขึ้น(N ÷ r)
 * เลือกผังที่ระยะสองทิศต่างกันไม่เกินเกณฑ์และใช้โคมน้อยสุด ถ้าไม่มีผังไหนผ่านเกณฑ์ เอาผังที่ระยะใกล้กันที่สุด
 */
export function fixtureGrid(n: number, w: number, l: number) {
  type Grid = { rows: number; cols: number; total: number; ratio: number };
  let best: Grid | null = null;
  let closest: Grid | null = null;
  const limit = LIGHTING.maxSpacingRatio.value;
  for (let r = 1; r <= n; r++) {
    const c = ceil(n / r);
    const sw = w / r;
    const sl = l / c;
    const ratio = Math.max(sw, sl) / Math.min(sw, sl);
    const cand = { rows: r, cols: c, total: r * c, ratio };
    if (ratio <= limit + 1e-9 && (!best || cand.total < best.total || (cand.total === best.total && ratio < best.ratio))) best = cand;
    if (!closest || ratio < closest.ratio - 1e-9 || (Math.abs(ratio - closest.ratio) <= 1e-9 && cand.total < closest.total)) closest = cand;
  }
  const g = best ?? closest ?? { rows: 1, cols: 1, total: 1, ratio: 1 };
  return { ...g, spacingW: w / g.rows, spacingL: l / g.cols };
}

export function calcLux(v: Values): CalcResult {
  const bad = guard("lux", v);
  if (bad) return bad;
  const w = num(v, "w", 4);
  const l = num(v, "l", 5);
  const room = str(v, "room", "living");
  const preset = LUX_PRESETS[room];
  const lux = preset ? preset.lux.value : num(v, "lux", 300);
  const lm = num(v, "lm", LIGHTING.lumens.value);
  const uf = num(v, "uf", LIGHTING.uf.value);
  const mf = num(v, "mf", LIGHTING.mf.value);
  const area = w * l;
  const raw = fixturesNeeded(lux, area, lm, uf, mf);
  const n = Math.max(1, ceil(raw));
  if (n > LIGHTING.maxFixtures.value) {
    return blockedResult({
      headline: `ต้องใช้โคมราว ${fmt(n)} ดวง เกินที่จัดผังให้ (${fmt(LIGHTING.maxFixtures.value)} ดวง) — แบ่งพื้นที่เป็นโซนแล้วคิดทีละโซน`,
      tip: "ตรวจหน่วยแสงต่อโคม (ลูเมน ไม่ใช่วัตต์) และขนาดห้องอีกครั้ง",
    });
  }
  const g = fixtureGrid(n, w, l);
  const got = (g.total * lm * uf * mf) / area;
  const name = preset ? preset.label : "กำหนดเอง";
  return resultX({
    title: "จำนวนโคมตามความสว่าง",
    headline: `โคม ${fmt(g.total)} ดวง · จัด ${fmt(g.rows)} แถว × ${fmt(g.cols)} ดวง`,
    rows: [
      { label: "พื้นที่ห้อง", value: `${fmtTrim(w, 2)} × ${fmtTrim(l, 2)} ม. = ${fmt(area, 2)} ตร.ม.` },
      { label: `ความสว่างเป้าหมาย (${name})`, value: `${fmt(lux)} lux` },
      { label: "คิดได้", value: `${fmt(raw, 2)} ดวง → ปัดขึ้น ${fmt(n)} ดวง` },
      {
        label: "จัดผัง",
        value: `ตามด้านกว้าง ${fmt(g.rows)} แถว × ตามด้านยาว ${fmt(g.cols)} ดวง = ${fmt(g.total)} ดวง${g.total > n ? ` (เพิ่ม ${fmt(g.total - n)} ดวงให้ลงตาราง)` : ""}`,
        emphasize: true,
      },
      {
        label: "ระยะห่างโคม",
        value: `${fmt(g.spacingW, 2)} ม. × ${fmt(g.spacingL, 2)} ม. · ห่างผนัง ${fmt(g.spacingW / 2, 2)} / ${fmt(g.spacingL / 2, 2)} ม.`,
        emphasize: true,
      },
      { label: "ความสว่างเฉลี่ยที่ได้", value: `ราว ${fmt(got)} lux` },
    ],
    tip: "ระยะห่างโคมไม่ควรเกินที่ผู้ผลิตกำหนด (มักราว 1–1.5 เท่าของความสูงโคมเหนือโต๊ะ) ไม่งั้นแสงเป็นดวง ๆ",
    explain: {
      risk: "B",
      updatedAt: "2026-11-26",
      summary: "วิธีลูเมน: จำนวนโคม = ความสว่าง (lux) × พื้นที่ ÷ (แสงต่อโคม × UF × MF) ปัดขึ้น แล้วจัดเป็นตารางให้ระยะสองทิศใกล้กัน",
      steps: [
        { label: "พื้นที่", expr: "A = กว้าง × ยาว", subst: `${fmtTrim(w, 2)} × ${fmtTrim(l, 2)} = ${fmt(area, 2)} ตร.ม.` },
        {
          label: "จำนวนโคม",
          expr: "N = E × A ÷ (Φ × UF × MF)",
          subst: `${fmt(lux)} × ${fmt(area, 2)} ÷ (${fmt(lm)} × ${fmtTrim(uf, 2)} × ${fmtTrim(mf, 2)}) = ${fmt(raw, 2)} → ${fmt(n)} ดวง`,
          note: "1 lux = 1 ลูเมนต่อตารางเมตร",
        },
        {
          label: "จัดผัง",
          expr: "ลองแถว r = 1, 2, … · ดวงต่อแถว = ปัดขึ้น(N ÷ r) · เลือกผังที่ระยะ กว้าง÷r กับ ยาว÷ดวง ต่างกันไม่เกิน 1.5 เท่า ใช้โคมน้อยสุด",
          subst: `${fmt(g.rows)} × ${fmt(g.cols)} = ${fmt(g.total)} ดวง · ระยะ ${fmt(g.spacingW, 2)} × ${fmt(g.spacingL, 2)} ม.`,
        },
        { label: "ความสว่างที่ได้", expr: "E = จำนวนโคม × Φ × UF × MF ÷ A", subst: `${fmt(g.total)} × ${fmt(lm)} × ${fmtTrim(uf, 2)} × ${fmtTrim(mf, 2)} ÷ ${fmt(area, 2)} = ${fmt(got, 1)} lux` },
      ],
      constants: [...(preset ? [preset.lux] : []), LIGHTING.lumens, LIGHTING.uf, LIGHTING.mf, LIGHTING.maxSpacingRatio],
      assumptions: ["ห้องสี่เหลี่ยม โคมรุ่นเดียวกันทั้งห้อง แสงกระจายทั่วห้อง (ไม่ใช่ไฟส่องเฉพาะจุด)", "UF และ MF ใช้ค่าเดียวทั้งห้องตามที่กรอก"],
      caveats: [
        "ความสว่างตามชนิดห้องเป็นค่าอ้างอิงทั่วไป ไม่ใช่ข้อบังคับ งานอาคารที่มีข้อกำหนด (สำนักงาน โรงงาน) ต้องตรวจกับมาตรฐานที่ใช้จริง",
        "UF ขึ้นกับรูปห้อง ความสูงติดตั้ง และสีผนัง-เพดาน ค่าที่แม่นต้องเปิดตาราง UF ของโคมรุ่นนั้น",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "วิธีลูเมน (Lumen method) — คู่มือออกแบบแสงสว่าง" }, { label: "EN 12464-1 ความส่องสว่างสถานที่ทำงานภายในอาคาร" }, { label: "CIE 97 ตัวประกอบการบำรุงรักษา" }],
    },
  });
}

/* ─────────── เครื่องทำน้ำอุ่นกี่ kW ─────────── */

/** kW = (ลิตร/นาที ÷ 60) × ความหนาแน่น × cp × ΔT */
export function heaterKw(lpm: number, dT: number): number {
  return (lpm / 60) * WATER_HEAT.density.value * WATER_HEAT.cp.value * dT;
}

export function calcHeater(v: Values): CalcResult {
  const bad = guard("heater", v);
  if (bad) return bad;
  const lpm = num(v, "lpm", 4);
  const tin = num(v, "tin", 28);
  const tout = num(v, "tout", 40);
  const dT = tout - tin;
  if (dT <= 0) {
    return blockedResult({
      headline: `อุณหภูมิที่ต้องการ (${fmtTrim(tout, 1)} °C) ต้องสูงกว่าน้ำเข้า (${fmtTrim(tin, 1)} °C)`,
      tip: "น้ำเข้าที่อุ่นกว่าน้ำที่ต้องการแล้ว ไม่ต้องใช้เครื่องทำน้ำอุ่น",
    });
  }
  const kw = heaterKw(lpm, dT);
  const size = WATER_HEATER_KW.find((s) => s >= kw - 1e-9);
  const amps = ((size ?? kw) * 1000) / NOMINAL_V.phase.value;
  const flowAt = (p: number) => (p / (WATER_HEAT.density.value * WATER_HEAT.cp.value * dT)) * 60;
  const maxSize = WATER_HEATER_KW[WATER_HEATER_KW.length - 1];
  return resultX({
    title: "เครื่องทำน้ำอุ่นกี่ kW",
    headline: size
      ? `ต้องการ ${fmt(kw, 2)} kW → เครื่อง ${fmtTrim(size, 1)} kW`
      : `ต้องการ ${fmt(kw, 2)} kW เกินเครื่องทำน้ำอุ่นตัวเดียวที่ขายทั่วไป (${fmtTrim(maxSize, 1)} kW)`,
    chart: size
      ? {
          kind: "steps",
          unit: "kW",
          need: kw,
          needLabel: "ต้องการ",
          items: WATER_HEATER_KW.map((s) => ({ label: `${fmtTrim(s, 1)} kW`, value: s, state: s === size ? "chosen" : s < size ? "under" : "over" })),
        }
        : undefined,
    rows: [
      { label: "น้ำร้อนขึ้น", value: `${fmtTrim(tin, 1)} → ${fmtTrim(tout, 1)} °C (ΔT ${fmtTrim(dT, 1)} °C)` },
      { label: "กำลังที่ต้องใช้", value: `${fmt(kw, 2)} kW` },
      size
        ? { label: "เลือกเครื่อง", value: `${fmtTrim(size, 1)} kW (ขั้นแรกที่ไม่น้อยกว่าที่ต้องการ)`, emphasize: true }
        : { label: "เลือกเครื่อง", value: "ใช้เครื่องทำน้ำร้อนแบบมีถังเก็บ หรือแยกจุดใช้น้ำ", emphasize: true },
      ...(size ? [{ label: `เครื่อง ${fmtTrim(size, 1)} kW ปล่อยน้ำได้`, value: `ราว ${fmt(flowAt(size), 1)} ลิตร/นาที ที่ ${fmtTrim(tout, 1)} °C` }] : []),
      { label: `กระแสโดยประมาณ (${fmt(NOMINAL_V.phase.value)} V)`, value: `${fmt(amps, 1)} A` },
      { label: "เบรกเกอร์ / สายไฟ / สายดิน", value: "ให้ช่างไฟเลือกตามป้ายเครื่องและตาราง วสท. — ใช้เครื่องมือ \"เลือกขนาดสายไฟ\" ต่อได้" },
    ],
    tip: "ฝักบัวน้ำอุ่นทั่วไปไหลราว 3–5 ลิตร/นาที ถ้าอยากเปิดแรงกว่านี้ต้องเพิ่ม kW ตาม",
    explain: {
      risk: "C",
      updatedAt: "2026-11-26",
      summary: "พลังงานที่ทำให้น้ำร้อนขึ้น: kW = อัตราไหล (กก./วินาที) × ความจุความร้อนน้ำ × อุณหภูมิที่เพิ่ม แล้วเลือกเครื่องขั้นที่ไม่น้อยกว่านั้น",
      steps: [
        {
          label: "อัตราไหลเป็น กก./วินาที",
          expr: "ṁ = ลิตร/นาที ÷ 60 × 1 กก./ลิตร",
          subst: `${fmtTrim(lpm, 2)} ÷ 60 = ${fmt(lpm / 60, 4)} กก./วินาที`,
        },
        {
          label: "กำลังที่ต้องใช้",
          expr: `P = ṁ × ${WATER_HEAT.cp.value} × ΔT`,
          subst: `${fmt(lpm / 60, 4)} × ${WATER_HEAT.cp.value} × ${fmtTrim(dT, 1)} = ${fmt(kw, 3)} kW`,
          note: "kJ/วินาที = kW",
        },
        ...(size
          ? [
              {
                label: "น้ำที่เครื่องที่เลือกทำได้",
                expr: "ลิตร/นาที = kW ÷ (4.186 × ΔT) × 60",
                subst: `${fmtTrim(size, 1)} ÷ (${WATER_HEAT.cp.value} × ${fmtTrim(dT, 1)}) × 60 = ${fmt(flowAt(size), 2)} ลิตร/นาที`,
              },
            ]
          : []),
        { label: "กระแส", expr: `I = W ÷ ${NOMINAL_V.phase.value} V`, subst: `${fmt((size ?? kw) * 1000)} ÷ ${NOMINAL_V.phase.value} = ${fmt(amps, 2)} A` },
      ],
      constants: [WATER_HEAT.cp, WATER_HEAT.density, NOMINAL_V.phase],
      assumptions: ["เครื่องทำน้ำอุ่นแบบทันที ความร้อนจากขดลวดเข้าน้ำเกือบทั้งหมด", `ขนาดเครื่องที่ขายทั่วไป ${WATER_HEATER_KW.map((s) => fmtTrim(s, 1)).join(" / ")} kW ⚠️ ยังไม่ยืนยันรุ่นจริง`],
      caveats: [
        "เครื่องทำน้ำอุ่นใช้ไฟมากและอยู่ใกล้น้ำ ต้องมีสายดินและเครื่องตัดไฟรั่ว ขนาดเบรกเกอร์และสายไฟต้องให้ช่างไฟเลือกตามตาราง วสท. และป้ายเครื่อง",
        `กระแส ${fmt(amps, 1)} A ที่แสดงคิดจากแรงดัน ${NOMINAL_V.phase.value} V เป็นค่าประกอบเท่านั้น ไม่ใช่ขนาดเบรกเกอร์`,
        DISCLAIMER_C,
      ],
      refs: [{ label: "สมการพลังงานความร้อน Q = ṁ·cp·ΔT" }, { label: "วสท. มาตรฐานการติดตั้งทางไฟฟ้าสำหรับประเทศไทย" }],
    },
  });
}

/* ─────────── ชาร์จรถ EV ─────────── */

export function calcEv(v: Values): CalcResult {
  const bad = guard("ev", v);
  if (bad) return bad;
  const cap = num(v, "cap", 60);
  const from = num(v, "from", 20);
  const to = num(v, "to", 80);
  const chargerKey = str(v, "charger", "7.4");
  const preset = EV_CHARGERS[chargerKey];
  const chargerKw = preset ? preset.kw : num(v, "kw", 7.4);
  const carKw = num(v, "car", 11);
  const eff = num(v, "eff", EV.efficiency.value);
  const rate = num(v, "rate", POWER_BILL.rate.value);
  if (to <= from) {
    return blockedResult({
      headline: `ชาร์จถึง (${fmtTrim(to, 1)}%) ต้องมากกว่าแบตที่เหลือ (${fmtTrim(from, 1)}%)`,
      tip: "ใส่ % แบตตอนเริ่มชาร์จ กับ % ที่อยากชาร์จถึง",
    });
  }
  const powerKw = Math.min(chargerKw, carKw);
  const battKwh = (cap * (to - from)) / 100;
  const gridKwh = battKwh / (eff / 100);
  const hours = gridKwh / powerKw;
  const baht = gridKwh * rate;
  const threePhase = chargerKw > EV.onePhaseMaxKw.value + 1e-9;
  const carLimited = carKw < chargerKw - 1e-9;
  return resultX({
    title: "ชาร์จรถ EV",
    headline: `ชาร์จ ${fmtTrim(from, 1)}→${fmtTrim(to, 1)}% ราว ${hoursText(hours)} · ${fmt(baht)} บาท`,
    rows: [
      { label: "ไฟเข้าแบต", value: `${fmt(battKwh, 2)} kWh (${fmtTrim(to - from, 1)}% ของ ${fmtTrim(cap, 1)} kWh)` },
      { label: `ไฟจากมิเตอร์ (ประสิทธิภาพ ${fmtTrim(eff, 1)}%)`, value: `${fmt(gridKwh, 2)} หน่วย (kWh)` },
      {
        label: "กำลังชาร์จจริง",
        value: carLimited ? `${fmtTrim(powerKw, 2)} kW (รถรับได้แค่นี้ แม้หัวชาร์จ ${fmtTrim(chargerKw, 2)} kW)` : `${fmtTrim(powerKw, 2)} kW`,
      },
      { label: "เวลาชาร์จ", value: hoursText(hours), emphasize: true },
      { label: `ค่าไฟ (${fmtTrim(rate, 2)} บาท/หน่วย)`, value: `${fmt(baht)} บาท`, emphasize: true },
      ...(threePhase ? [{ label: "ไฟที่บ้าน", value: `หัวชาร์จเกิน ${fmtTrim(EV.onePhaseMaxKw.value, 1)} kW ต้องใช้ไฟ 3 เฟส` }] : []),
    ],
    tip:
      to > EV.taperFrom.value
        ? `ชาร์จเกิน ${fmt(EV.taperFrom.value)}% รถจะค่อย ๆ ลดกำลังชาร์จ เวลาจริงนานกว่านี้ — ถ้ามีมิเตอร์ TOU ใส่ค่าไฟช่วงกลางคืน`
        : "ถ้ามีมิเตอร์ TOU ชาร์จช่วงกลางคืน ใส่ค่าไฟ off-peak จะได้ค่าไฟใกล้จริง",
    explain: {
      risk: "B",
      updatedAt: "2026-11-26",
      summary: "ไฟเข้าแบต = ความจุ × (% ถึง − % เริ่ม) · ไฟจากมิเตอร์ = ไฟเข้าแบต ÷ ประสิทธิภาพ · เวลา = ไฟจากมิเตอร์ ÷ กำลังชาร์จ (ค่าน้อยกว่าระหว่างหัวชาร์จกับที่รถรับได้)",
      steps: [
        { label: "ไฟเข้าแบต", expr: "kWh = ความจุ × (ถึง − เริ่ม) ÷ 100", subst: `${fmtTrim(cap, 1)} × (${fmtTrim(to, 1)} − ${fmtTrim(from, 1)}) ÷ 100 = ${fmt(battKwh, 2)} kWh` },
        { label: "ไฟจากมิเตอร์", expr: "หน่วย = ไฟเข้าแบต ÷ ประสิทธิภาพ", subst: `${fmt(battKwh, 2)} ÷ ${fmtTrim(eff / 100, 3)} = ${fmt(gridKwh, 2)} หน่วย` },
        { label: "กำลังชาร์จ", expr: "kW = ค่าน้อยกว่า(หัวชาร์จ, รถรับได้)", subst: `min(${fmtTrim(chargerKw, 2)}, ${fmtTrim(carKw, 2)}) = ${fmtTrim(powerKw, 2)} kW` },
        { label: "เวลา", expr: "ชม. = หน่วยจากมิเตอร์ ÷ kW", subst: `${fmt(gridKwh, 2)} ÷ ${fmtTrim(powerKw, 2)} = ${fmt(hours, 2)} ชม. = ${hoursText(hours)}` },
        { label: "ค่าไฟ", expr: "บาท = หน่วยจากมิเตอร์ × ค่าไฟต่อหน่วย", subst: `${fmt(gridKwh, 2)} × ${fmtTrim(rate, 2)} = ${fmt(baht, 2)} บาท` },
      ],
      constants: [EV.efficiency, EV.onePhaseMaxKw, EV.taperFrom, POWER_BILL.rate],
      assumptions: ["กำลังชาร์จคงที่ตลอด (ช่วงท้ายเกินราว 80% รถลดกำลังลง เวลาจริงนานขึ้น)", "ความจุแบตคือความจุใช้งานได้ (usable) ตามสเปกรถ"],
      caveats: [
        "ติดตั้งเครื่องชาร์จที่บ้านต้องเดินวงจรแยก มีเครื่องตัดไฟรั่ว และมิเตอร์ต้องรับกระแสได้ — ให้ช่างไฟและการไฟฟ้าตรวจกับมาตรฐานก่อนติดตั้ง",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "IEC 61851 ระบบชาร์จรถไฟฟ้าแบบนำไฟฟ้า (โหมด 3)" }, { label: "สเปกรถ: ความจุแบตใช้งานได้ และกำลังชาร์จ AC สูงสุด" }],
    },
  });
}

const round4Tools: ToolDef[] = [
  {
    id: "appliance",
    name: "ค่าไฟเครื่องใช้ไฟฟ้า",
    blurb: "วัตต์ × ชั่วโมง × จำนวน → หน่วยและบาทต่อเดือน สูงสุด 6 รายการ",
    keywords: ["ค่าไฟ", "หน่วยไฟ", "kwh", "กินไฟ", "ตู้เย็น", "เครื่องใช้ไฟฟ้า", "บิลค่าไฟ"],
    fields: [
      {
        type: "select",
        key: "n",
        label: "จำนวนรายการ",
        default: "3",
        options: Array.from({ length: APPLIANCE_MAX }, (_, k) => ({ value: String(k + 1), label: `${k + 1} รายการ` })),
      },
      ...applianceFields(),
      { type: "number", key: "days", label: "ใช้ต่อเดือน", unit: "วัน", default: POWER_BILL.daysPerMonth.value, min: 1, max: 31 },
      { type: "number", key: "rate", label: "ค่าไฟเฉลี่ย (รวม Ft/VAT)", unit: "บาท/หน่วย", default: POWER_BILL.rate.value, min: 0.5, max: 20, step: 0.01 },
      { type: "number", key: "ft", label: "Ft บวกเพิ่ม (ถ้าอัตราข้างบนยังไม่รวม)", unit: "บาท/หน่วย", default: 0, min: 0, max: 5, step: 0.0001 },
    ],
    calc: calcAppliance,
  },
  {
    id: "lux",
    name: "จำนวนโคมไฟตามความสว่าง",
    blurb: "ห้อง + lux + ลูเมนต่อโคม → กี่ดวง จัดกี่แถว ห่างกันเท่าไหร่",
    keywords: ["lux", "ลักซ์", "ความสว่าง", "โคมไฟ", "ดาวน์ไลท์", "ลูเมน", "lumen", "ผังไฟ"],
    fields: [
      { type: "number", key: "w", label: "กว้างห้อง", unit: "ม.", default: 4, min: 0.5, max: 200, step: 0.05 },
      { type: "number", key: "l", label: "ยาวห้อง", unit: "ม.", default: 5, min: 0.5, max: 200, step: 0.05 },
      {
        type: "select",
        key: "room",
        label: "ชนิดห้อง (ค่าอ้างอิง)",
        default: "living",
        options: [
          ...Object.entries(LUX_PRESETS).map(([value, p]) => ({ value, label: `${p.label} ${fmt(p.lux.value)} lux` })),
          { value: "custom", label: "กำหนดเอง" },
        ],
      },
      { type: "number", key: "lux", label: "ความสว่างที่ต้องการ", unit: "lux", default: 300, min: 20, max: 2000, when: { key: "room", is: "custom" } },
      { type: "number", key: "lm", label: "แสงต่อโคม (ดูกล่อง)", unit: "lm", default: LIGHTING.lumens.value, min: 100, max: 100000 },
      { type: "number", key: "uf", label: "UF ตัวประกอบการใช้ประโยชน์", default: LIGHTING.uf.value, min: 0.2, max: 1, step: 0.01 },
      { type: "number", key: "mf", label: "MF ตัวประกอบการบำรุงรักษา", default: LIGHTING.mf.value, min: 0.4, max: 1, step: 0.01 },
    ],
    calc: calcLux,
  },
  {
    id: "heater",
    name: "เครื่องทำน้ำอุ่นกี่ kW",
    blurb: "อัตราไหล + อุณหภูมิน้ำเข้า-ที่ต้องการ → kW และขนาดเครื่อง",
    keywords: ["เครื่องทำน้ำอุ่น", "น้ำอุ่น", "ฮีตเตอร์", "kw", "ฝักบัว", "น้ำร้อน"],
    fields: [
      { type: "number", key: "lpm", label: "อัตราไหลที่ต้องการ", unit: "ลิตร/นาที", default: 4, min: 0.5, max: 20, step: 0.1 },
      { type: "number", key: "tin", label: "อุณหภูมิน้ำเข้า", unit: "°C", default: 28, min: 5, max: 35, step: 0.5 },
      { type: "number", key: "tout", label: "อุณหภูมิที่ต้องการ", unit: "°C", default: 40, min: 36, max: 60, step: 0.5 },
    ],
    calc: calcHeater,
  },
  {
    id: "ev",
    name: "ชาร์จรถ EV",
    blurb: "แบตกี่ kWh ชาร์จจาก-ถึงกี่ % → กี่ชั่วโมง กี่บาท",
    keywords: ["ev", "รถไฟฟ้า", "ชาร์จรถ", "wallbox", "หัวชาร์จ", "ค่าชาร์จ"],
    fields: [
      { type: "number", key: "cap", label: "ความจุแบต (ใช้งานได้)", unit: "kWh", default: 60, min: 5, max: 250, step: 0.1 },
      { type: "number", key: "from", label: "แบตเหลือ", unit: "%", default: 20, min: 0, max: 99, step: 1 },
      { type: "number", key: "to", label: "ชาร์จถึง", unit: "%", default: 80, min: 1, max: 100, step: 1 },
      {
        type: "select",
        key: "charger",
        label: "หัวชาร์จ AC",
        default: "7.4",
        options: [...Object.entries(EV_CHARGERS).map(([value, ch]) => ({ value, label: ch.label })), { value: "custom", label: "กำหนดเอง" }],
      },
      { type: "number", key: "kw", label: "กำลังหัวชาร์จ", unit: "kW", default: 7.4, min: 1, max: 22, step: 0.1, when: { key: "charger", is: "custom" } },
      { type: "number", key: "car", label: "รถรับไฟ AC ได้สูงสุด (ดูสเปกรถ)", unit: "kW", default: 11, min: 1, max: 22, step: 0.1 },
      { type: "number", key: "eff", label: "ประสิทธิภาพการชาร์จ", unit: "%", default: EV.efficiency.value, min: 50, max: 100, step: 1 },
      { type: "number", key: "rate", label: "ค่าไฟ", unit: "บาท/หน่วย", default: POWER_BILL.rate.value, min: 0.5, max: 20, step: 0.01 },
    ],
    calc: calcEv,
  },
];

export const electricalTools: ToolDef[] = [
  {
    id: "cable",
    name: "เลือกขนาดสายไฟ",
    blurb: "สาย + เบรกเกอร์ + สายดิน แนว วสท.",
    fields: [
      {
        type: "select",
        key: "mode",
        label: "กรอกเป็น",
        default: "amp",
        options: [
          { value: "amp", label: "แอมป์" },
          { value: "watt", label: "วัตต์" },
        ],
      },
      { type: "number", key: "il", label: "กระแสโหลด", unit: "A", default: 15, min: 0.1, max: 400, step: 0.1, when: { key: "mode", is: "amp" } },
      { type: "number", key: "watts", label: "กำลัง (ถ้าคิดจากวัตต์)", unit: "W", default: 2200, min: 1, max: 200000, when: { key: "mode", is: "watt" } },
      { type: "number", key: "volts", label: "แรงดัน", unit: "V", default: 220, min: 100, max: 1000 },
      {
        type: "select",
        key: "phase",
        label: "ระบบ",
        default: "1",
        options: [
          { value: "1", label: "1 เฟส (ตัวนำ 2 เส้น)" },
          { value: "3", label: "3 เฟส (ตัวนำ 3 เส้น)" },
        ],
      },
      { type: "number", key: "pf", label: "เพาเวอร์แฟกเตอร์ (PF)", default: 1, min: 0.1, max: 1, step: 0.05 },
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
      { type: "number", key: "temp", label: "อุณหภูมิรอบ", unit: "°C", default: 40, min: 15, max: 60 },
      { type: "number", key: "circ", label: "จำนวนวงจรในท่อเดียวกัน", unit: "วงจร", default: 1, min: 1, max: 20 },
    ],
    calc: calcCable,
  },
  {
    id: "vdrop",
    name: "แรงดันตก",
    blurb: "เช็กไม่เกิน 5% ตอนเดินไกล",
    fields: [
      { type: "number", key: "il", label: "กระแส", unit: "A", default: 15, min: 0.1, max: 400, step: 0.1 },
      { type: "number", key: "len", label: "ระยะสาย", unit: "ม.", default: 30, min: 1, max: 1000 },
      { type: "number", key: "mm2", label: "ขนาดสาย", unit: "ตร.มม.", default: 2.5, min: 1, max: 400, step: 0.5 },
      { type: "number", key: "volts", label: "แรงดัน", unit: "V", default: 220, min: 12, max: 1000 },
      {
        type: "select",
        key: "phase",
        label: "ระบบ",
        default: "1",
        options: [
          { value: "1", label: "1 เฟส" },
          { value: "3", label: "3 เฟส" },
        ],
      },
    ],
    calc: calcVdrop,
  },
  {
    id: "conduit",
    name: "จำนวนสายในท่อ",
    blurb: "ท่อ 4 หุน / 6 หุน / 1 นิ้ว ใส่สายได้กี่เส้น",
    fields: [
      {
        type: "select",
        key: "mode",
        label: "อยากรู้",
        default: "max",
        options: [
          { value: "max", label: "ท่อนี้ใส่สายได้กี่เส้น" },
          { value: "min", label: "มีสายเท่านี้ ใช้ท่อขนาดไหน" },
        ],
      },
      {
        type: "select",
        key: "kind",
        label: "ชนิดท่อ",
        default: "emt",
        options: [
          { value: "emt", label: "ท่อเหล็กบาง EMT" },
          { value: "imc", label: "ท่อเหล็กหนา IMC" },
          { value: "custom", label: "ท่อ PVC / อื่น ๆ (วัดขนาดในเอง)" },
        ],
      },
      {
        type: "select",
        key: "size",
        label: "ขนาดท่อ (ท่อเหล็ก)",
        default: "0.5",
        options: CONDUIT_SIZES.map((s) => ({ value: s.key, label: s.label })),
        when: { key: "mode", is: "max" },
      },
      { type: "number", key: "idMm", label: "ขนาดในท่อ (วัดจริง)", unit: "มม.", default: 16, min: 8, max: 100, step: 0.1, when: { key: "kind", is: "custom" } },
      {
        type: "select",
        key: "wire",
        label: "ขนาดสาย THW (IEC 01)",
        default: "2.5",
        options: THW_OD.map((w) => ({ value: String(w.mm2), label: `${w.mm2} ตร.มม.` })),
      },
      { type: "number", key: "n", label: "จำนวนสายขนาดนี้", unit: "เส้น", default: 6, min: 1, max: 60, when: { key: "mode", is: "min" } },
      {
        type: "select",
        key: "wire2",
        label: "สายอีกขนาด (เช่น สายดิน)",
        default: "2.5",
        options: THW_OD.map((w) => ({ value: String(w.mm2), label: `${w.mm2} ตร.มม.` })),
        when: { key: "mode", is: "min" },
      },
      { type: "number", key: "n2", label: "จำนวนสายอีกขนาด", unit: "เส้น", default: 0, min: 0, max: 60, when: { key: "mode", is: "min" } },
    ],
    calc: calcConduit,
  },
  {
    id: "solar",
    name: "คืนทุนโซลาร์",
    blurb: "จำนวนแผง พื้นที่หลังคา คืนทุนคร่าว",
    fields: [
      { type: "number", key: "kwh", label: "ใช้ไฟ/เดือน", unit: "หน่วย", default: 400, min: 50, max: 10000 },
      { type: "number", key: "sun", label: "ชั่วโมงแดด", unit: "ชม.", default: 4.5, min: 2.5, max: 7, step: 0.1 },
      { type: "number", key: "panel", label: "แผง", unit: "W", default: 450, min: 300, max: 800 },
      { type: "number", key: "rate", label: "ค่าไฟ", unit: "บาท/หน่วย", default: 4.2, min: 1, max: 20, step: 0.1 },
      {
        type: "number",
        key: "pricePerKwp",
        label: "ราคาติดตั้งต่อ kWp (ค่าประมาณ แก้ได้)",
        unit: "บาท/kWp",
        default: SOLAR.pricePerKwp.value,
        min: 10000,
        max: 100000,
        step: 500,
      },
    ],
    calc: calcSolar,
  },
  {
    id: "string",
    name: "จัดสตริงโซลาร์",
    blurb: "ให้เข้าอินเวอร์เตอร์",
    fields: [
      { type: "number", key: "voc", label: "Voc แผง", unit: "V", default: 49.5, min: 5, max: 100, step: 0.1 },
      { type: "number", key: "vmp", label: "Vmp แผง", unit: "V", default: 41.5, min: 5, max: 100, step: 0.1 },
      { type: "number", key: "n", label: "แผงต่อสตริง", unit: "แผง", default: 10, min: 1, max: 40 },
      { type: "number", key: "vmin", label: "แรงดัน MPPT ต่ำสุด", unit: "V", default: 200, min: 50, max: 1000 },
      { type: "number", key: "vmax", label: "แรงดันสูงสุดเครื่อง", unit: "V", default: 500, min: 100, max: 1500 },
    ],
    calc: calcString,
  },
  {
    id: "battery",
    name: "ขนาดแบตเตอรี่",
    blurb: "Off-grid / hybrid คร่าว ๆ",
    fields: [
      { type: "number", key: "wh", label: "ใช้ไฟ/วัน", unit: "Wh", default: 2000, min: 100, max: 200000 },
      { type: "number", key: "days", label: "สำรอง", unit: "วัน", default: 1, min: 0.5, max: 7, step: 0.5 },
      { type: "number", key: "dod", label: "ความลึกการคายประจุ (DoD)", unit: "%", default: 80, min: 30, max: 100 },
      { type: "number", key: "eff", label: "ประสิทธิภาพ", unit: "%", default: 90, min: 70, max: 100 },
      {
        type: "select",
        key: "volt",
        label: "แรงดันชุด",
        default: "24",
        options: [
          { value: "12", label: "12 V" },
          { value: "24", label: "24 V" },
          { value: "48", label: "48 V" },
          { value: "51.2", label: "51.2 V (ลิเธียม 16 เซลล์)" },
        ],
      },
      { type: "number", key: "modAh", label: "ความจุต่อโมดูล/ลูก", unit: "Ah", default: 100, min: 10, max: 1000 },
    ],
    calc: calcBattery,
  },
  {
    id: "unit",
    name: "แปลงหน่วยไฟฟ้า",
    blurb: "วัตต์ แอมป์ แรงม้า BTU",
    fields: [
      {
        type: "select",
        key: "from",
        label: "มีค่า",
        default: "w",
        options: [
          { value: "w", label: "วัตต์" },
          { value: "a", label: "แอมป์" },
          { value: "hp", label: "แรงม้า" },
          { value: "btu", label: "BTU/ชม." },
        ],
      },
      { type: "number", key: "x", label: "ตัวเลข", default: 1000, min: 0, max: 1000000, step: 0.1 },
      { type: "number", key: "volts", label: "แรงดัน", unit: "V", default: 220, min: 12, max: 1000 },
      { type: "number", key: "pf", label: "เพาเวอร์แฟกเตอร์ (PF)", default: 1, min: 0.1, max: 1, step: 0.05 },
    ],
    calc: calcElecUnit,
  },
  ...round4Tools,
];

export const electricalJob: JobDef = {
  name: "คิดทั้งงานไฟบ้าน",
  blurb: "โหลดครั้งเดียว ได้สาย เบรกเกอร์ และแรงดันตก",
  fields: [
    { type: "number", key: "il", label: "กระแสโหลด", unit: "A", default: 15, min: 0.1, max: 400, step: 0.1 },
    { type: "number", key: "temp", label: "อุณหภูมิรอบ", unit: "°C", default: 40, min: 15, max: 60 },
    { type: "number", key: "circ", label: "วงจรในท่อ", unit: "วงจร", default: 1, min: 1, max: 20 },
    { type: "number", key: "len", label: "ระยะเดินสาย", unit: "ม.", default: 25, min: 1, max: 1000 },
    { type: "number", key: "volts", label: "แรงดัน", unit: "V", default: 220, min: 100, max: 1000 },
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
    {
      type: "select",
      key: "phase",
      label: "ระบบ",
      default: "1",
      options: [
        { value: "1", label: "1 เฟส" },
        { value: "3", label: "3 เฟส" },
      ],
    },
  ],
  calc: (input) => {
    const bad = guardInputs(electricalJob.fields, input);
    if (bad) return bad;
    const v = withDefaults(electricalJob.fields, input);
    const cable = calcCable(v);
    // parseFloat อ่านเลขนำหน้าของ "10 ตร.มม." ได้ตรง (ของเดิมลบตัวอักษรแล้วเหลือ "10.." กลายเป็น NaN จึงคิดแรงดันตกที่สาย 2.5 เสมอ)
    const parsed = Number.parseFloat(String(cable.rows.find((r) => r.label === "ขนาดสายแนะนำ")?.value ?? ""));
    const base = Number.isFinite(parsed) && parsed > 0 ? parsed : 2.5;
    // แรงดันตกเกินเกณฑ์วงจรย่อย → ขยับสายขึ้นทีละขั้นในตารางจนผ่าน แล้วให้หัวผลลัพธ์กับแถวพูดเรื่องเดียวกัน
    const il = num(v, "il", 15);
    const len = num(v, "len", 25);
    const volts = num(v, "volts", 220);
    const phase = str(v, "phase", "1");
    const limit = ELEC.vdBranchLimit.value;
    const sizes = CABLE_TABLE_5_20.map((r) => r.mm2 as number).filter((x) => x >= base);
    const fit = sizes.find((x) => (vdropVolts(il, len, x, phase) / volts) * 100 <= limit);
    const chosen = fit ?? sizes[sizes.length - 1] ?? base;
    const stepped = !cable.invalid && fit !== undefined && chosen > base;
    const noFit = !cable.invalid && fit === undefined;
    if (noFit) {
      const pctBig = (vdropVolts(il, len, chosen, phase) / volts) * 100;
      return blockedResult({
        headline: `ระยะ ${fmt(len)} ม. ไกลเกิน — สายใหญ่สุดในตาราง (${fmtTrim(chosen, 1)} ตร.มม.) ยังแรงดันตก ${fmt(pctBig, 1)}% เกิน ${limit}%`,
        rows: [
          ...cable.rows.filter((r) => r.label === "เบรกเกอร์" || r.label === "ขนาดสายแนะนำ").map((r) => (r.label === "ขนาดสายแนะนำ" ? { label: "ขนาดสายตามกระแส", value: r.value } : r)),
          { label: "สรุป", value: "ย่อระยะ ย้ายตู้ไฟให้ใกล้โหลด หรือให้วิศวกรไฟฟ้าออกแบบสายป้อน" },
        ],
        tip: "ระยะไกลระดับนี้ไม่ใช่วงจรย่อยในบ้านแล้ว ต้องออกแบบสายป้อนและแรงดันตกเต็มรูปแบบ",
      });
    }
    const drop = calcVdrop({ ...v, mm2: chosen });
    const breakerText = cable.rows.find((r) => r.label === "เบรกเกอร์")?.value ?? "";
    const cableRows = stepped
      ? cable.rows.flatMap((r) =>
          r.label === "ขนาดสายแนะนำ"
            ? [
                { label: "ขนาดสายตามกระแส", value: r.value },
                {
                  label: "ขนาดสายแนะนำ",
                  value: `${fmtTrim(chosen, 1)} ตร.มม. (ขยับจาก ${fmtTrim(base, 1)} เพราะระยะ ${fmt(len)} ม. แรงดันตกเกิน ${limit}%)`,
                  emphasize: true,
                },
              ]
            : r.label === "พิกัดตาราง / ใช้งานจริง"
              ? [{ ...r, label: "พิกัดของสายตามกระแส (ตาราง / ใช้งานจริง)" }]
              : [r],
        )
      : cable.rows;
    const dropRows = drop.rows
      .filter((r) => r.emphasize || r.label === "สรุป")
      .map((r) => (r.label === "คิดเป็น" ? { ...r, label: `แรงดันตก (สาย ${fmtTrim(chosen, 1)} ตร.มม.)` } : r));
    return jobFromParts({
      title: "งานไฟบ้าน",
      headline: stepped
        ? `สาย ${fmtTrim(chosen, 1)} ตร.มม. · เบรกเกอร์ ${breakerText} (ขยับสายกันแรงดันตก)`
        : (cable.headline ?? "งานไฟบ้าน"),
      rows: [...cableRows, ...dropRows],
      tip: stepped
        ? "สายใหญ่ขึ้นเพราะระยะไกล ไม่ใช่เพราะกระแส เบรกเกอร์คงเดิม · งานเมนเข้าบ้าน สามเฟสโรงงาน หรืองานที่ต้องขออนุญาต ให้วิศวกรไฟฟ้าเซ็นก่อน"
        : "งานเมนเข้าบ้าน สามเฟสโรงงาน หรืองานที่ต้องขออนุญาต ให้วิศวกรไฟฟ้าเซ็นก่อน",
      parts: [cable, drop],
      chart: stepped ? drop.chart : cable.chart,
    });
  },
};
