import type { JobDef, ToolDef, Values } from "../types";
import { ceil, fmt, invalidResult, jobFromParts, num, parseList, resultX, round, str } from "../math";
import { DISCLAIMER_AB, DISCLAIMER_C, MATERIAL, UNIT, WELD } from "../constants";

const H_BEAM: Record<string, number> = {
  "150x75": 14.0,
  "200x100": 21.3,
  "250x125": 29.6,
  "300x150": 36.7,
  "350x175": 49.6,
  "400x200": 56.6,
};
const W_BEAM: Record<string, number> = {
  "100x100": 16.9,
  "125x125": 23.8,
  "150x150": 31.5,
  "200x200": 49.9,
  "250x250": 72.4,
  "300x300": 94.0,
};
const C_CH: Record<string, number> = {
  "75": 6.92,
  "100": 8.92,
  "125": 12.3,
  "150": 16.6,
  "200": 22.4,
};

export function calcSteelWeight(v: Values) {
  const shape = str(v, "shape", "plate");
  const len = num(v, "len", 6);
  const qty = num(v, "qty", 1);
  const density = MATERIAL.steelDensity.value;
  let kgm = 0;
  let note = "";
  let expr = "";
  let subst = "";
  const fromTable = shape === "h" || shape === "w" || shape === "c";

  if (shape === "plate") {
    const w = num(v, "w", 1200) / 1000;
    const t = num(v, "t", 6) / 1000;
    kgm = w * t * density;
    note = `แผ่น ${fmt(num(v, "w"))}×${fmt(t * 1000)} มม.`;
    expr = "กก./ม. = กว้าง(ม.) × หนา(ม.) × ความหนาแน่น";
    subst = `${fmt(w, 3)} × ${fmt(t, 4)} × ${fmt(density)} = ${fmt(kgm, 2)} กก./ม.`;
  } else if (shape === "round") {
    const d = num(v, "d", 12);
    kgm = MATERIAL.rebarFactor.value * d * d;
    note = `กลม Ø ${fmt(d)} มม.`;
    expr = "กก./ม. = 0.006165 × Ø²  (มาจาก π/4 × 7,850 ÷ 10⁶)";
    subst = `0.006165 × ${fmt(d)}² = ${fmt(kgm, 3)} กก./ม.`;
  } else if (shape === "pipe") {
    const od = num(v, "od", 48.3);
    const t = num(v, "t", 3.2);
    kgm = ((od - t) * t * Math.PI * (density / 1000)) / 1000;
    note = `ท่อ Ø ${fmt(od)} × ${fmt(t)} มม.`;
    expr = "กก./ม. = (Ø − หนา) × หนา × π × 7.85 ÷ 1,000";
    subst = `(${fmt(od, 1)} − ${fmt(t, 1)}) × ${fmt(t, 1)} × π × 7.85 ÷ 1,000 = ${fmt(kgm, 2)} กก./ม.`;
  } else if (shape === "h") {
    const key = str(v, "hsize", "200x100");
    kgm = H_BEAM[key] ?? 21.3;
    note = `H ${key}`;
    expr = "เปิดตารางน้ำหนักหน้าตัดมาตรฐาน";
    subst = `H ${key} → ${fmt(kgm, 2)} กก./ม.`;
  } else if (shape === "w") {
    const key = str(v, "wsize", "150x150");
    kgm = W_BEAM[key] ?? 31.5;
    note = `W ${key}`;
    expr = "เปิดตารางน้ำหนักหน้าตัดมาตรฐาน";
    subst = `W ${key} → ${fmt(kgm, 2)} กก./ม.`;
  } else {
    const key = str(v, "csize", "100");
    kgm = C_CH[key] ?? 8.92;
    note = `C ${key}`;
    expr = "เปิดตารางน้ำหนักหน้าตัดมาตรฐาน";
    subst = `C ${key} → ${fmt(kgm, 2)} กก./ม.`;
  }

  const total = kgm * len * qty;
  return resultX({
    title: "น้ำหนักเหล็กรูปพรรณ",
    headline: `${fmt(total, 1)} กก.`,
    rows: [
      { label: "หน้าตัด", value: note },
      { label: "กก./ม.", value: `${fmt(kgm, 2)}` },
      { label: "ยาว × จำนวน", value: `${fmt(len, 2)} ม. × ${fmt(qty)}` },
      { label: "น้ำหนักรวม", value: `${fmt(total, 1)} กก.`, emphasize: true },
    ],
    tip: "ใช้เช็กน้ำหนักก่อนสั่งของและคิดค่าขนส่ง เหล็กชุบหรือสแตนเลสคนละตัวเลข",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "น้ำหนักรวม = น้ำหนักต่อเมตร × ความยาว × จำนวนเส้น",
      steps: [
        { label: "น้ำหนักต่อเมตร", expr, subst },
        {
          label: "น้ำหนักรวม",
          expr: "รวม = กก./ม. × ยาว × จำนวน",
          subst: `${fmt(kgm, 2)} × ${fmt(len, 2)} × ${fmt(qty)} = ${fmt(total, 1)} กก.`,
        },
      ],
      constants: fromTable ? [] : [MATERIAL.steelDensity, ...(shape === "round" ? [MATERIAL.rebarFactor] : [])],
      assumptions: [
        "เหล็กกล้าคาร์บอนความหนาแน่น 7,850 กก./ลบ.ม.",
        fromTable ? "ใช้น้ำหนักตามตารางหน้าตัดมาตรฐานที่ผู้ผลิตไทยใช้" : "คิดจากปริมาตรหน้าตัดจริง",
      ],
      caveats: [
        "เหล็กที่ขายจริงมีค่าคลาดเคลื่อนน้ำหนักได้ตามเกรด (เหล็กเบา/เหล็กเต็ม) ต่างกันได้หลายเปอร์เซ็นต์",
        "สแตนเลส (≈7,930) อลูมิเนียม (≈2,700) ใช้ตัวเลขนี้ไม่ได้",
        DISCLAIMER_AB,
      ],
      refs: [
        { label: "มอก. 1227 เหล็กโครงสร้างรูปพรรณรีดร้อน / JIS G3101" },
        { label: "มอก. 20 / 24 เหล็กเส้นเสริมคอนกรีต (น้ำหนักต่อเมตรตามเส้นผ่านศูนย์กลาง)" },
      ],
    },
  });
}

export function calcWeld(v: Values) {
  const kind = str(v, "kind", "fillet");
  const z = num(v, "z", 6);
  const len = num(v, "len", 4);
  const process = str(v, "process", "smaw");
  const zM = z / 1000;
  const volFactor =
    kind === "v"
      ? Math.tan(Math.PI / 6) * zM * zM
      : kind === "sq"
        ? (WELD.squareGap.value / 1000) * zM
        : 0.5 * zM * zM;
  const kg = volFactor * len * MATERIAL.steelDensity.value * WELD.reinforcement.value;
  const dep = process === "tig" ? WELD.depTig.value : process === "mig" ? WELD.depMig.value : WELD.depSmaw.value;
  const wire = kg / dep;
  const lossWire = wire - kg;

  return resultX({
    title: "ปริมาณลวดเชื่อม",
    headline: `ลวดประมาณ ${fmt(wire, 2)} กก.`,
    chart: {
      kind: "stack",
      parts: [
        { label: "โลหะในแนวเชื่อม", value: kg, display: `${fmt(kg, 2)} กก.`, tone: "accent" },
        { label: "สูญเสียจากกระบวนการ", value: lossWire, display: `${fmt(lossWire, 2)} กก.`, tone: "mute" },
      ],
      totalLabel: "ลวดเชื่อมที่ต้องสั่ง",
      totalDisplay: `${fmt(wire, 2)} กก.`,
    },
    rows: [
      { label: "แนว", value: kind === "v" ? "V-groove" : kind === "sq" ? "Square" : "Fillet" },
      { label: "ขนาด z / ขา", value: `${fmt(z)} มม.` },
      { label: "ความยาวแนว", value: `${fmt(len, 1)} ม.` },
      { label: "โลหะแนว", value: `${fmt(kg, 2)} กก.` },
      { label: "ลวด+เผื่อ", value: `${fmt(wire, 2)} กก.`, emphasize: true },
    ],
    tip: "SMAW เผื่อสลากมาก MIG น้อยกว่า ค่านี้ประมาณหน้างาน ไม่ใช่ WPS",
    explain: {
      risk: "B",
      updatedAt: "2026-08-21",
      summary: "น้ำหนักโลหะในแนวเชื่อมคิดจากหน้าตัดสามเหลี่ยม × ความยาวแนว × ความหนาแน่นเหล็ก แล้วหารด้วยประสิทธิภาพการหลอมละลาย (deposition efficiency) ของแต่ละกระบวนการ",
      steps: [
        {
          label: "ปริมาตรโลหะในแนวเชื่อม",
          expr:
            kind === "v"
              ? "V-groove 60°: พื้นที่ = z² × tan(30°) × ยาว × เผื่อนูน"
              : kind === "sq"
                ? `Square: พื้นที่ = ช่องว่าง ${WELD.squareGap.value} มม. × หนา × ยาว × เผื่อนูน`
                : "Fillet: พื้นที่ = 0.5 × z² × ยาว × เผื่อนูน",
          subst: `${fmt(volFactor, 6)} × ${fmt(len, 1)} × ${fmt(MATERIAL.steelDensity.value)} × ${WELD.reinforcement.value} = ${fmt(kg, 2)} กก.`,
        },
        {
          label: "น้ำหนักโลหะแนวเชื่อม",
          expr: "kg = V × 7,850 กก./ลบ.ม.",
          subst: `= ${fmt(kg, 2)} กก.`,
        },
        {
          label: "ลวดเชื่อมที่ต้องใช้จริง",
          expr: "ลวด = โลหะแนวเชื่อม ÷ ประสิทธิภาพการหลอมละลาย",
          subst: `${fmt(kg, 2)} ÷ ${dep} = ${fmt(wire, 2)} กก.`,
          note: `${process === "tig" ? "TIG" : process === "mig" ? "MIG/FCAW" : "SMAW (ธูป)"} มีประสิทธิภาพประมาณ ${dep * 100}% ส่วนที่เหลือสูญเสียเป็นสแลกและกระเด็น`,
        },
      ],
      assumptions: [
        kind === "v"
          ? "แนว V-groove มุมรวม 60° ความลึกเท่าค่าที่กรอก ไม่มีหน้าแยกราก"
          : kind === "sq"
            ? `แนว Square ช่องว่าง ${WELD.squareGap.value} มม. × ความหนาที่กรอก`
            : "แนว Fillet หน้าตัดสามเหลี่ยมหน้าขาเท่ากัน",
        `เผื่อนูน ${WELD.reinforcement.value} เท่าของหน้าตัดทฤษฎี`,
        "ไม่ได้คิดแนวหลายผ่าน (multi-pass) แยกเป็นชั้น ๆ",
      ],
      caveats: [
        "งานเชื่อมโครงสร้างรับแรงต้องมี WPS (Welding Procedure Specification) และช่างเชื่อมมีใบเซอร์ตามที่งานกำหนด ตัวเลขนี้ใช้ประมาณของหน้างานเท่านั้น",
        "SMAW เผื่อสลากเสียหัว-ท้ายและเศษสแลกมาก ควรเผื่อลวดเพิ่มอีก 10–15% จากตัวเลขนี้",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวปฏิบัติงานประมาณลวดเชื่อม (Deposition Efficiency ตามกระบวนการเชื่อม)" }],
    },
  });
}

export function packBfd(stock: number, kerf: number, parts: number[]) {
  const sorted = [...parts].sort((a, b) => b - a);
  const bars: number[][] = [];
  const remain: number[] = [];
  for (const p of sorted) {
    const need = p + kerf;
    let best = -1;
    let bestLeft = Infinity;
    for (let i = 0; i < remain.length; i++) {
      if (remain[i] >= need && remain[i] - need < bestLeft) {
        best = i;
        bestLeft = remain[i] - need;
      }
    }
    if (best >= 0) {
      bars[best].push(p);
      remain[best] -= need;
    } else {
      bars.push([p]);
      remain.push(Math.max(0, stock - need));
    }
  }
  return { bars, remain };
}

export function calcCut(v: Values) {
  const stock = num(v, "stock", 6000);
  const kerf = num(v, "kerf", 3);
  const parts = parseList(str(v, "parts", "1200, 1200, 800, 2500, 900"));
  if (parts.length === 0) {
    return invalidResult("ใส่ความยาวชิ้นงานก่อน คั่นด้วยจุลภาค เช่น 1200, 800, 2500");
  }
  const tooLong = parts.filter((p) => p + kerf > stock);
  const { bars, remain } = packBfd(stock, kerf, parts);
  const used = bars.length;
  const scrap = remain.reduce((a, b) => a + b, 0);
  const totalNeed = parts.reduce((a, b) => a + b, 0);
  const pct = (scrap / (used * stock)) * 100;
  const lastRemain = remain[remain.length - 1] ?? 0;

  return resultX({
    title: "วางแผนตัดเหล็ก",
    headline: `ใช้ ${used} เส้น · เศษ ${fmt(pct, 1)}%`,
    chart: {
      kind: "packs",
      unitLabel: `เส้น ${fmt(stock)} มม.`,
      count: used,
      lastUsed: 1 - lastRemain / stock,
      note: `เศษรวมทุกเส้น ${fmt(scrap)} มม. (${fmt(pct, 1)}% ของวัตถุดิบที่ใช้)`,
    },
    rows: [
      { label: "ชิ้นงาน", value: `${parts.length} ชิ้น รวม ${fmt(totalNeed)} มม.` },
      { label: "เส้นวัตถุดิบ", value: `${used} เส้น × ${fmt(stock)} มม.`, emphasize: true },
      { label: "เศษรวม", value: `${fmt(scrap)} มม. (${fmt(pct, 1)}%)` },
      ...(tooLong.length ? [{ label: "ชิ้นยาวเกินเส้น", value: tooLong.map((x) => `${x}`).join(", ") }] : []),
      ...bars.map((b, i) => ({
        label: `เส้นที่ ${i + 1}`,
        value: `${b.join(" + ")} · เหลือ ${fmt(remain[i])} มม.`,
      })),
    ],
    tip: "จัดแบบ Best Fit Decreasing เผื่อ kerf เลื่อย งานจริงเผื่อหน้าตัดอีกนิด",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "จัดเรียงชิ้นงานจากยาวไปสั้น (Best Fit Decreasing) ใส่ลงเส้นวัตถุดิบให้เศษเหลือน้อยที่สุดในแต่ละเส้น รวมเผื่อ kerf ของใบเลื่อย/จานตัดทุกรอยตัด",
      steps: [
        { label: "จำนวนชิ้นงานที่ต้องตัด", expr: "รวมความยาวที่ต้องการ", subst: `${parts.length} ชิ้น = ${fmt(totalNeed)} มม.` },
        {
          label: "จัดเรียงแบบ Best Fit Decreasing",
          expr: "เรียงยาว→สั้น แล้ววางลงเส้นที่เหลือพอดีที่สุด",
          subst: `ใช้ ${used} เส้น × ${fmt(stock)} มม.`,
        },
        {
          label: "เศษเหลือรวม",
          expr: "เศษ% = เศษรวม ÷ (จำนวนเส้น × ยาวเส้น) × 100",
          subst: `${fmt(scrap)} ÷ (${used} × ${fmt(stock)}) × 100 = ${fmt(pct, 1)}%`,
        },
      ],
      assumptions: [`เผื่อ kerf (ความหนาใบตัด) ${fmt(kerf)} มม. ต่อรอยตัด`, "อัลกอริทึมเป็นแบบประมาณ (heuristic) ไม่ใช่คำตอบที่เศษน้อยที่สุดเสมอไป"],
      caveats: [
        "เหล็กหน้างานอาจมีความยาวจริงคลาดเคลื่อนจากสเปก ±20–50 มม. ควรเผื่อวัดจริงก่อนตัด",
        tooLong.length ? "มีชิ้นงานที่ยาวเกินเส้นวัตถุดิบ ต้องต่อแนวเชื่อมหรือสั่งเส้นยาวพิเศษ" : "",
        DISCLAIMER_AB,
      ].filter(Boolean),
      refs: [{ label: "อัลกอริทึม Cutting Stock / Best Fit Decreasing (การตัดวัสดุให้เศษน้อยที่สุด)" }],
    },
  });
}

export function calcDeflection(v: Values) {
  const L = num(v, "L", 4);
  const w = num(v, "w", 400);
  const I = num(v, "I", 2140);
  const E = MATERIAL.steelE.value;
  const mmL = L * 1000;
  const Nmm = (w * UNIT.gravity.value) / 1000;
  const delta = (5 * Nmm * mmL ** 4) / (384 * E * I * 10000);
  const lim360 = mmL / 360;
  const lim240 = mmL / 240;
  const ok = delta <= lim360;
  const chartMax = Math.max(lim240 * 1.3, delta * 1.15);

  return resultX({
    title: "ระยะโก่งคาน",
    headline: ok ? `โก่ง ${fmt(delta, 1)} มม. ผ่าน L/360` : `โก่ง ${fmt(delta, 1)} มม. เกิน L/360`,
    chart: {
      kind: "threshold",
      unit: "มม.",
      value: round(delta, 1),
      max: chartMax,
      zones: [
        { upTo: lim360, tone: "good", label: `ผ่าน L/360 (≤ ${fmt(lim360, 1)} มม.)` },
        { upTo: lim240, tone: "warn", label: `พอรับได้แบบไม่กระด้าง (≤ L/240)` },
        { upTo: chartMax, tone: "bad", label: "โก่งเกินเกณฑ์ ต้องเพิ่มหน้าตัด" },
      ],
    },
    rows: [
      { label: "ช่วงคาน", value: `${fmt(L, 2)} ม.` },
      { label: "โก่งกลางคาน", value: `${fmt(delta, 1)} มม.`, emphasize: true },
      { label: "เกณฑ์ L/360", value: `${fmt(lim360, 1)} มม.` },
      { label: "เกณฑ์ L/240", value: `${fmt(lim240, 1)} มม.` },
    ],
    tip: "คิดคานช่วงเดียวรับโหลดกระจาย เหล็ก E=200 GPa ค่าประมาณเลือกหน้าตัด ไม่ใช่แบบคำนวณเซ็นต์",
    explain: {
      risk: "C",
      updatedAt: "2026-08-21",
      summary: "ระยะโก่งกลางคานช่วงเดียวรับโหลดกระจายสม่ำเสมอ คำนวณจากสมการยืดหยุ่นเชิงเส้น δ = 5wL⁴ ÷ (384EI) แล้วเทียบกับเกณฑ์ L/360 (พื้น/คานทั่วไป) และ L/240 (หลังคา/ไม่รับผิวเปราะ)",
      steps: [
        {
          label: "แรงกระจายต่อหน่วยยาว (แปลง กก./ม. → N/มม.)",
          expr: `w(N/mm) = w(กก./ม.) × ${UNIT.gravity.value} ÷ 1000`,
          subst: `${fmt(w)} × ${UNIT.gravity.value} ÷ 1000 = ${fmt(Nmm, 4)} N/มม.`,
        },
        {
          label: "ระยะโก่งกลางคาน",
          expr: "δ = 5wL⁴ ÷ (384EI)",
          subst: `5 × ${fmt(Nmm, 4)} × ${fmt(mmL, 0)}⁴ ÷ (384 × ${fmt(E)} × ${fmt(I)}×10⁴) = ${fmt(delta, 1)} มม.`,
        },
        {
          label: "เทียบเกณฑ์การใช้งาน",
          expr: "L/360 (พื้น/คานทั่วไป) และ L/240 (หลังคา)",
          subst: `${fmt(mmL, 0)} ÷ 360 = ${fmt(lim360, 1)} มม. · ÷240 = ${fmt(lim240, 1)} มม.`,
        },
      ],
      constants: [{ value: E, unit: "MPa", label: "โมดูลัสยืดหยุ่นเหล็ก E", source: "ค่ามาตรฐานเหล็กกล้าคาร์บอน" }],
      assumptions: ["คานช่วงเดียว (simply supported) รับโหลดกระจายสม่ำเสมอเท่านั้น ไม่รวมโหลดจุดหรือคานยื่น", "ไม่ได้คิดผลจากแรงเฉือนหรือการโก่งเนื่องจากแรงตามแนวแกน"],
      caveats: [
        "นี่เป็นการตรวจสอบความแข็งแรงเชิงการใช้งาน (serviceability) เท่านั้น ไม่ใช่การตรวจสอบกำลังรับแรง (strength/ULS) ที่ต้องใช้วิศวกรออกแบบ",
        "งานพื้น/คานที่รับผนังก่ออิฐหรือวัสดุเปราะควรใช้เกณฑ์เข้มกว่า L/360 เพื่อลดรอยแตกร้าว",
        DISCLAIMER_C,
      ],
      refs: [{ label: "มยผ. 1301/1302 มาตรฐานออกแบบอาคารเหล็กโครงสร้างรูปพรรณ · AISC Steel Construction Manual (Deflection Limits)" }],
    },
  });
}

export function calcThermal(v: Values) {
  const L = num(v, "L", 12);
  const dT = num(v, "dT", 40);
  const alpha = 12e-6;
  const dL = L * 1000 * alpha * dT;
  const joint = dL < 8 ? 10 : ceil(dL + 4);

  return resultX({
    title: "การขยายตัวจากความร้อน",
    headline: `ยืด ${fmt(dL, 1)} มม.`,
    chart: {
      kind: "stack",
      parts: [
        { label: "การขยายตัวที่คำนวณได้", value: dL, display: `${fmt(dL, 1)} มม.`, tone: "accent" },
        { label: "เผื่อเพิ่มเป็นร่องกันชน", value: Math.max(0, joint - dL), display: `${fmt(Math.max(0, joint - dL), 1)} มม.`, tone: "mute" },
      ],
      totalLabel: "ร่อง expansion แนะนำ",
      totalDisplay: `${joint} มม.`,
    },
    rows: [
      { label: "ยาวชิ้น", value: `${fmt(L, 2)} ม.` },
      { label: "ΔT", value: `${fmt(dT)} °C` },
      { label: "การขยายตัว", value: `${fmt(dL, 1)} มม.`, emphasize: true },
      { label: "ร่อง expansion แนะนำ", value: `${joint} มม.` },
    ],
    tip: "เหล็ก α ≈ 12×10⁻⁶ /°C รางยาวกลางแดดต้องเผื่อร่อง",
    explain: {
      risk: "B",
      updatedAt: "2026-08-21",
      summary: "เหล็กขยายตัวเป็นเส้นตรงตามสัมประสิทธิ์การขยายตัวทางความร้อน (α) เมื่ออุณหภูมิเปลี่ยน ยิ่งชิ้นยาวและ ΔT สูง ยิ่งขยายมาก ต้องเผื่อร่อง expansion joint ไม่ให้โครงสร้างดันกัน",
      steps: [
        {
          label: "การขยายตัวตามยาว",
          expr: "ΔL = L × α × ΔT",
          subst: `${fmt(L * 1000, 0)} มม. × 12×10⁻⁶ × ${fmt(dT)} = ${fmt(dL, 1)} มม.`,
        },
        {
          label: "ร่อง expansion แนะนำ",
          expr: "ร่อง = ΔL + เผื่อขยับ 4 มม. (อย่างน้อย 10 มม.)",
          subst: `${fmt(dL, 1)} + 4 = ${joint} มม.`,
        },
      ],
      constants: [{ value: alpha, unit: "/°C", label: "สัมประสิทธิ์การขยายตัวเหล็กกล้า α (12×10⁻⁶)", source: "ค่ามาตรฐานวัสดุเหล็กกล้าคาร์บอน" }],
      assumptions: ["ΔT คือผลต่างอุณหภูมิสูงสุด-ต่ำสุดที่ชิ้นงานเจอจริง (เช่น ตากแดดเทียบกลางคืน) ไม่ใช่แค่อุณหภูมิห้อง", "คิดการขยายตัวทิศทางเดียว (แนวยาว) ไม่รวมการบิดหรือโก่งจากความร้อนไม่สม่ำเสมอ"],
      caveats: [
        "โครงหลังคาเหล็ก/รางเลื่อนยาวที่ตากแดดโดยตรง ΔT จริงอาจสูงถึง 50–60°C ระหว่างกลางวัน-กลางคืน ควรวัดหรือประมาณให้เผื่อจริง",
        "จุดยึดที่ไม่ให้ขยับ (fixed point) ต้องออกแบบให้รับแรงจากการขยายตัวที่ถูกยึดตายได้",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "ค่าสัมประสิทธิ์การขยายตัวทางความร้อนของวัสดุ (Coefficient of Thermal Expansion) มาตรฐานวิศวกรรม" }],
    },
  });
}

export const steelTools: ToolDef[] = [
  {
    id: "weight",
    name: "น้ำหนักเหล็กรูปพรรณ",
    blurb: "แผ่น ท่อ H W ฉาก C",
    fields: [
      {
        type: "select",
        key: "shape",
        label: "รูปพรรณ",
        default: "h",
        options: [
          { value: "plate", label: "แผ่น" },
          { value: "round", label: "กลมตัน" },
          { value: "pipe", label: "ท่อกลม" },
          { value: "h", label: "H-Beam" },
          { value: "w", label: "W / เสา" },
          { value: "c", label: "C-Channel" },
        ],
      },
      { type: "number", key: "len", label: "ยาว", unit: "ม.", default: 6, min: 0.1, step: 0.1 },
      { type: "number", key: "qty", label: "จำนวน", unit: "เส้น", default: 1, min: 1 },
      { type: "number", key: "w", label: "กว้างแผ่น", unit: "มม.", default: 1200, min: 10, when: { key: "shape", is: "plate" } },
      { type: "number", key: "t", label: "หนาแผ่น/ท่อ", unit: "มม.", default: 6, min: 0.5, step: 0.1, when: { key: "shape", is: ["plate", "pipe"] } },
      { type: "number", key: "d", label: "Ø เหล็กกลม", unit: "มม.", default: 12, min: 6, when: { key: "shape", is: "round" } },
      { type: "number", key: "od", label: "Ø นอกท่อ", unit: "มม.", default: 48.3, min: 10, step: 0.1, when: { key: "shape", is: "pipe" } },
      {
        type: "select",
        key: "hsize",
        label: "ขนาด H",
        default: "200x100",
        when: { key: "shape", is: "h" },
        options: Object.keys(H_BEAM).map((k) => ({ value: k, label: `H ${k}` })),
      },
      {
        type: "select",
        key: "wsize",
        label: "ขนาด W",
        default: "150x150",
        when: { key: "shape", is: "w" },
        options: Object.keys(W_BEAM).map((k) => ({ value: k, label: `W ${k}` })),
      },
      {
        type: "select",
        key: "csize",
        label: "ขนาด C",
        default: "100",
        when: { key: "shape", is: "c" },
        options: Object.keys(C_CH).map((k) => ({ value: k, label: `C ${k}` })),
      },
    ],
    calc: calcSteelWeight,
  },
  {
    id: "weld",
    name: "ปริมาณลวดเชื่อม",
    blurb: "Fillet / V / square",
    fields: [
      {
        type: "select",
        key: "kind",
        label: "ชนิดแนว",
        default: "fillet",
        options: [
          { value: "fillet", label: "Fillet" },
          { value: "v", label: "V-groove" },
          { value: "sq", label: "Square" },
        ],
      },
      { type: "number", key: "z", label: "ขาเชื่อม / ลึก", unit: "มม.", default: 6, min: 3 },
      { type: "number", key: "len", label: "ยาวแนว", unit: "ม.", default: 4, min: 0.1, step: 0.1 },
      {
        type: "select",
        key: "process",
        label: "กระบวนการ",
        default: "smaw",
        options: [
          { value: "smaw", label: "SMAW (ธูป)" },
          { value: "mig", label: "MIG / FCAW" },
          { value: "tig", label: "TIG" },
        ],
      },
    ],
    calc: calcWeld,
  },
  {
    id: "cut",
    name: "วางแผนตัดเหล็ก",
    blurb: "ลดเศษแบบ Best Fit",
    fields: [
      { type: "number", key: "stock", label: "ยาววัตถุดิบ", unit: "มม.", default: 6000, min: 500 },
      { type: "number", key: "kerf", label: "เผื่อตัด (ความหนาใบตัด)", unit: "มม.", default: 3, min: 0, step: 0.5 },
      {
        type: "text",
        key: "parts",
        label: "ชิ้นงาน (มม. คั่นด้วยจุลภาค)",
        default: "1200, 1200, 800, 2500, 900",
        placeholder: "1200, 800, 2500",
      },
    ],
    calc: calcCut,
  },
  {
    id: "deflection",
    name: "ระยะโก่งคาน",
    blurb: "เทียบ L/360 · L/240",
    fields: [
      { type: "number", key: "L", label: "ช่วงคาน", unit: "ม.", default: 4, min: 0.5, step: 0.1 },
      { type: "number", key: "w", label: "โหลดกระจาย", unit: "กก./ม.", default: 400, min: 10 },
      { type: "number", key: "I", label: "โมเมนต์ความเฉื่อย I", unit: "ซม.⁴", default: 2140, min: 50 },
    ],
    calc: calcDeflection,
  },
  {
    id: "thermal",
    name: "การขยายตัวจากความร้อน",
    blurb: "ΔL = L·α·ΔT",
    fields: [
      { type: "number", key: "L", label: "ยาวชิ้น", unit: "ม.", default: 12, min: 0.5, step: 0.1 },
      { type: "number", key: "dT", label: "ต่างอุณหภูมิ", unit: "°C", default: 40, min: 1 },
    ],
    calc: calcThermal,
  },
];

export const steelJob: JobDef = {
  name: "คิดทั้งงานเหล็กเส้นนี้",
  blurb: "เลือกหน้าตัด ได้หนัก + แผนตัด",
  fields: [
    {
      type: "select",
      key: "shape",
      label: "รูปพรรณ",
      default: "h",
      options: [
        { value: "h", label: "H-Beam" },
        { value: "w", label: "W / เสา" },
        { value: "c", label: "C-Channel" },
        { value: "pipe", label: "ท่อกลม" },
        { value: "plate", label: "แผ่น" },
      ],
    },
    { type: "number", key: "len", label: "ยาว/เส้น", unit: "ม.", default: 6, min: 0.1, step: 0.1 },
    { type: "number", key: "qty", label: "จำนวนเส้น", default: 4, min: 1 },
    {
      type: "select",
      key: "hsize",
      label: "ขนาด H",
      default: "200x100",
      when: { key: "shape", is: "h" },
      options: Object.keys(H_BEAM).map((k) => ({ value: k, label: `H ${k}` })),
    },
    {
      type: "select",
      key: "wsize",
      label: "ขนาด W",
      default: "150x150",
      when: { key: "shape", is: "w" },
      options: Object.keys(W_BEAM).map((k) => ({ value: k, label: `W ${k}` })),
    },
    {
      type: "select",
      key: "csize",
      label: "ขนาด C",
      default: "100",
      when: { key: "shape", is: "c" },
      options: Object.keys(C_CH).map((k) => ({ value: k, label: `C ${k}` })),
    },
    { type: "number", key: "od", label: "Ø นอกท่อ", unit: "มม.", default: 48.3, step: 0.1, when: { key: "shape", is: "pipe" } },
    { type: "number", key: "t", label: "หนา", unit: "มม.", default: 3.2, step: 0.1, when: { key: "shape", is: ["pipe", "plate"] } },
    { type: "number", key: "w", label: "กว้างแผ่น", unit: "มม.", default: 1200, when: { key: "shape", is: "plate" } },
    { type: "text", key: "parts", label: "ตัดเป็นชิ้น (มม.)", default: "1500, 1500, 1200, 900" },
    { type: "number", key: "stock", label: "ยาววัตถุดิบ", unit: "มม.", default: 6000 },
    { type: "number", key: "kerf", label: "kerf", unit: "มม.", default: 3 },
  ],
  calc: (v) => {
    const wt = calcSteelWeight(v);
    const cut = calcCut(v);
    return jobFromParts({
      title: "งานเหล็ก",
      headline: wt.headline ?? "งานเหล็ก",
      rows: [
        ...wt.rows.filter((r) => r.emphasize || r.label === "กก./ม."),
        ...cut.rows.filter((r) => r.emphasize || r.label === "เศษรวม"),
      ],
      tip: "น้ำหนักใช้สั่งของ แผนตัดใช้ลดเศษ งานรับแรงให้วิศวะโยธาดูหน้าตัด",
      parts: [wt, cut],
    });
  },
};
