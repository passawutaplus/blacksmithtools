import type { JobDef, ToolDef, Values } from "../types";
import { blockedResult, ceil, fmt, guardInputs, guardTool, jobFromParts, num, resultX, round, stepTable, str, withDefaults } from "../math";
import {
  BREAKER_SIZES,
  CABLE_METHODS,
  CABLE_TABLE_5_20,
  CABLE_TABLE_SOURCE,
  DISCLAIMER_AB,
  DISCLAIMER_C,
  AC,
  ELEC,
  GROUND_WIRE_TABLE,
  KG_CIRCUITS,
  KG_CIRCUITS_BANDS,
  KG_CIRCUITS_MAX,
  KG_SOURCE,
  KT_AIR_PVC,
  KT_SOURCE,
  PUMP,
  SOLAR,
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
  const vd = (k * len * il * rho) / Math.max(mm2, 0.5);
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
  const area = n * SOLAR.panelArea.value;
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
      { label: "พื้นที่หลังคา", value: `${fmt(area, 1)} ตร.ม.` },
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
      constants: [SOLAR.derate, SOLAR.panelArea, SOLAR.pricePerKwp],
      assumptions: [
        "ระบบ on-grid ผลิตไฟใช้เองทั้งหมดในเวลากลางวัน ไม่ได้คิดการขายไฟคืนหรือมิเตอร์สุทธิ",
        `ราคาติดตั้ง ${fmt(pricePerKwp)} บาท/kWp (ค่าตั้งต้น ${fmt(SOLAR.pricePerKwp.value)} = กลางช่วงตลาด ${SOLAR.pricePerKwp.range} บาท/kWp ปี 2568–2569)`,
        "ทิศทางและมุมติดตั้งแผงเหมาะสม ไม่มีเงาบังช่วงกลางวัน ไม่คิดค่าล้างแผง ค่าเสื่อมแผง และการขึ้นค่าไฟ",
      ],
      caveats: [
        "บ้านที่กลางวันใช้ไฟน้อยจะใช้ไฟโซลาร์เองได้แค่บางส่วน ระยะคืนทุนจริงยาวกว่าตัวเลขนี้",
        "ชั่วโมงแดดเทียบเท่า (peak sun hours) แต่ละพื้นที่และฤดูต่างกัน ค่าไฟจริงที่ประหยัดได้อาจสูง/ต่ำกว่านี้",
        "ยังไม่รวมค่าใช้จ่ายขออนุญาตเชื่อมต่อกับการไฟฟ้า (PEA/MEA) และเงื่อนไขมิเตอร์ที่เปลี่ยนได้ตามนโยบาย",
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

  return resultX({
    title: "ขนาดแบตเตอรี่",
    headline: `แบตประมาณ ${fmt(kwh, 2)} kWh (${fmt(ceil(ah))} Ah ที่ ${fmt(volt)}V)`,
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
      { label: "ความจุ", value: `${fmt(ceil(ah))} Ah @ ${fmt(volt)} V` },
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
          subst: `${fmt(kwh, 2)} × 1000 ÷ ${fmt(volt)} = ${fmt(ah, 0)} Ah`,
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
      { type: "number", key: "volt", label: "แรงดันชุด", unit: "V", default: 24, min: 6, max: 1000 },
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
    const mm2 = Number(String(cable.rows.find((r) => r.label === "ขนาดสายแนะนำ")?.value).replace(/[^\d.]/g, "")) || 2.5;
    const drop = calcVdrop({ ...v, mm2: Number.isFinite(mm2) && mm2 > 0 ? mm2 : 2.5 });
    return jobFromParts({
      title: "งานไฟบ้าน",
      headline: cable.headline ?? "งานไฟบ้าน",
      rows: [...cable.rows, ...drop.rows.filter((r) => r.emphasize || r.label === "สรุป")],
      tip: "งานเมนเข้าบ้าน สามเฟสโรงงาน หรืองานที่ต้องขออนุญาต ให้วิศวกรไฟฟ้าเซ็นก่อน",
      parts: [cable, drop],
      chart: cable.chart,
    });
  },
};
