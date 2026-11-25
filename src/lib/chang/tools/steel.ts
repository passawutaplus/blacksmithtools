import type { JobDef, ToolDef, Values } from "../types";
import {
  blockedResult,
  ceil,
  fmt,
  fmtTrim,
  guardInputs,
  guardTool,
  invalidResult,
  jobFromParts,
  num,
  parseLengthList,
  resultX,
  round,
  str,
  withDefaults,
} from "../math";
import {
  DISCLAIMER_AB,
  DISCLAIMER_C,
  MATERIAL,
  REBAR_SIZES,
  STEEL_CHANNEL,
  STEEL_FORMULA,
  STEEL_H_BEAM,
  STEEL_SECTION_SOURCE,
  STEEL_W_BEAM,
  UNIT,
  WELD,
} from "../constants";

const guard = (id: string, v: Values) => guardTool(steelTools, id, v);

type Section = { kgm: number; note: string; expr: string; subst: string; fromTable: boolean; cornerNote?: string };

/** น้ำหนักต่อเมตรของหน้าตัดที่เลือก — คืน CalcResult เมื่อขนาดที่กรอกเป็นไปไม่ได้ */
function steelSection(v: Values): Section | ReturnType<typeof blockedResult> {
  const shape = str(v, "shape", "box");
  const density = MATERIAL.steelDensity.value;
  const k = STEEL_FORMULA.kgPerMm2.value;

  if (shape === "box") {
    const a = num(v, "ba", 50);
    const b = num(v, "bb", 50);
    const t = num(v, "bt", 2.3);
    if (t >= Math.min(a, b) / 2) {
      return blockedResult({
        headline: `กล่องหนา ${fmtTrim(t)} มม. ไม่ได้ — ต้องน้อยกว่าครึ่งของด้านแคบ (${fmtTrim(Math.min(a, b) / 2)} มม.)`,
        tip: "ตรวจความหนากับขนาดกล่องอีกครั้ง เช่น กล่อง 2 นิ้ว หนา 2.3 มม. = 50 × 50 × 2.3",
      });
    }
    const kgm = (2 * (a + b) - 4 * t) * t * k;
    return {
      kgm,
      note: `กล่อง ${fmtTrim(a)} × ${fmtTrim(b)} × ${fmtTrim(t)} มม.`,
      expr: "กก./ม. = [2 × (กว้าง + สูง) − 4 × หนา] × หนา × 0.00785",
      subst: `[2 × (${fmtTrim(a)} + ${fmtTrim(b)}) − 4 × ${fmtTrim(t)}] × ${fmtTrim(t)} × 0.00785 = ${fmt(kgm, 2)} กก./ม.`,
      fromTable: false,
      cornerNote: "สูตรคิดมุมเหลี่ยม ของจริงมุมมน น้ำหนักจริงมักเบากว่านี้ราว 2–4% และเหล็กเบา (ไม่เต็ม) จะเบากว่าอีก — ชั่งหรือดูป้ายร้านก่อนคิดเงิน",
    };
  }
  if (shape === "angle") {
    const a = num(v, "la", 50);
    const b = num(v, "lb", 50);
    const t = num(v, "lt", 4);
    if (t >= Math.min(a, b)) {
      return blockedResult({
        headline: `ฉากหนา ${fmtTrim(t)} มม. ไม่ได้ — ต้องบางกว่าขาด้านสั้น (${fmtTrim(Math.min(a, b))} มม.)`,
        tip: "ตรวจความหนากับขนาดขาฉากอีกครั้ง เช่น ฉาก 2 นิ้ว หนา 4 มม. = 50 × 50 × 4",
      });
    }
    const kgm = (a + b - t) * t * k;
    return {
      kgm,
      note: `ฉาก ${fmtTrim(a)} × ${fmtTrim(b)} × ${fmtTrim(t)} มม.`,
      expr: "กก./ม. = (ขา A + ขา B − หนา) × หนา × 0.00785",
      subst: `(${fmtTrim(a)} + ${fmtTrim(b)} − ${fmtTrim(t)}) × ${fmtTrim(t)} × 0.00785 = ${fmt(kgm, 2)} กก./ม.`,
      fromTable: false,
      cornerNote: "สูตรไม่รวมเนื้อโคนมุมและไม่หักมุมมนปลายขา ฉากรีดร้อนตามตารางจะหนักกว่านี้ได้ราว 1–2%",
    };
  }
  if (shape === "lipc") {
    const h = num(v, "ch", 100);
    const b = num(v, "cb", 50);
    const lip = num(v, "cl", 20);
    const t = num(v, "ct", 2.3);
    const ri = STEEL_FORMULA.coldBendInnerR.value * t;
    const outer = ri + t;
    if (h < 2 * outer || b < 2 * outer || lip < outer) {
      return blockedResult({
        headline: `ตัวซี ${fmtTrim(h)} × ${fmtTrim(b)} × ${fmtTrim(lip)} หนา ${fmtTrim(t)} มม. พับไม่ได้ — ขนาดเล็กเกินไปสำหรับความหนานี้`,
        tip: "ตรวจขนาดอีกครั้ง ลำดับคือ สูง × ปีก × ขอบพับ × หนา เช่น 100 × 50 × 20 × 2.3",
      });
    }
    // ความยาวแนวกึ่งกลางแผ่น: มุมเหลี่ยม (H + 2B + 2C − 4t) หักส่วนที่มุมมน 4 มุมสั้นลง
    const rc = ri + t / 2;
    const centre = h + 2 * b + 2 * lip - 4 * t - 4 * (2 - Math.PI / 2) * rc;
    const kgm = centre * t * k;
    return {
      kgm,
      note: `ตัวซี (เหล็กพับเย็น) ${fmtTrim(h)} × ${fmtTrim(b)} × ${fmtTrim(lip)} × ${fmtTrim(t)} มม.`,
      expr: "กก./ม. = ความยาวแนวกึ่งกลางแผ่น × หนา × 0.00785 · แนวกึ่งกลาง = H + 2B + 2C − 4t − 4 × (2 − π/2) × 1.5t",
      subst: `${fmt(centre, 1)} × ${fmtTrim(t)} × 0.00785 = ${fmt(kgm, 2)} กก./ม.`,
      fromTable: false,
      cornerNote: "คิดรัศมีพับด้านในเท่าความหนาแผ่น ตัวซีต่างโรงงานรัศมีต่างกันเล็กน้อย และเหล็กเบาจะเบากว่านี้ — เทียบป้ายร้านก่อนสั่ง",
    };
  }
  if (shape === "rebar") {
    const key = str(v, "rebar", "DB12");
    const sec = REBAR_SIZES[key];
    if (!sec) return invalidResult(`ไม่มีเหล็กเส้น ${key} ในรายการ — เลือกขนาดจากรายการ`);
    const kgm = MATERIAL.rebarFactor.value * sec.d * sec.d;
    return {
      kgm,
      note: `เหล็กเส้น ${key} (Ø ${fmt(sec.d)} มม.)`,
      expr: "กก./ม. = 0.006165 × Ø²  (ช่างจำง่าย ๆ ว่า Ø² ÷ 162)",
      subst: `0.006165 × ${fmt(sec.d)}² = ${fmt(kgm, 3)} กก./ม.`,
      fromTable: false,
    };
  }
  if (shape === "plate") {
    const w = num(v, "w", 1200) / 1000;
    const t = num(v, "t", 6) / 1000;
    const kgm = w * t * density;
    return {
      kgm,
      note: `แผ่น ${fmtTrim(w * 1000)} × ${fmtTrim(t * 1000)} มม.`,
      expr: "กก./ม. = กว้าง(ม.) × หนา(ม.) × ความหนาแน่น",
      subst: `${fmt(w, 3)} × ${fmt(t, 4)} × ${fmt(density)} = ${fmt(kgm, 2)} กก./ม.`,
      fromTable: false,
    };
  }
  if (shape === "round") {
    const d = num(v, "d", 12);
    const kgm = MATERIAL.rebarFactor.value * d * d;
    return {
      kgm,
      note: `กลมตัน Ø ${fmtTrim(d)} มม.`,
      expr: "กก./ม. = 0.006165 × Ø²  (มาจาก π/4 × 7,850 ÷ 10⁶)",
      subst: `0.006165 × ${fmtTrim(d)}² = ${fmt(kgm, 3)} กก./ม.`,
      fromTable: false,
    };
  }
  if (shape === "pipe") {
    const od = num(v, "od", 48.3);
    const t = num(v, "t", 3.2);
    if (t >= od / 2) {
      return blockedResult({
        headline: `ท่อหนา ${fmt(t, 1)} มม. ไม่ได้ — ต้องน้อยกว่าครึ่งของ Ø นอก (${fmt(od / 2, 1)} มม.)`,
        tip: "ความหนาผนังท่อต้องน้อยกว่ารัศมีนอก ถ้าเป็นเหล็กตันให้เลือกรูปพรรณ “กลมตัน”",
      });
    }
    const kgm = ((od - t) * t * Math.PI * (density / 1000)) / 1000;
    return {
      kgm,
      note: `ท่อ Ø ${fmtTrim(od)} × ${fmtTrim(t)} มม.`,
      expr: "กก./ม. = (Ø − หนา) × หนา × π × 7.85 ÷ 1,000",
      subst: `(${fmt(od, 1)} − ${fmt(t, 1)}) × ${fmt(t, 1)} × π × 7.85 ÷ 1,000 = ${fmt(kgm, 2)} กก./ม.`,
      fromTable: false,
    };
  }
  if (shape === "h") {
    const key = str(v, "hsize", "200x100");
    const sec = STEEL_H_BEAM[key];
    if (!sec) return invalidResult(`ไม่มี H ${key} ในตาราง — เลือกขนาดจากรายการ`);
    return {
      kgm: sec.kgm,
      note: `H ${key}×${sec.t1}×${sec.t2}`,
      expr: "เปิดตารางน้ำหนักหน้าตัดมาตรฐาน",
      subst: `H ${key} → ${fmt(sec.kgm, 2)} กก./ม.`,
      fromTable: true,
    };
  }
  if (shape === "w") {
    const key = str(v, "wsize", "150x150");
    const sec = STEEL_W_BEAM[key];
    if (!sec) return invalidResult(`ไม่มี W ${key} ในตาราง — เลือกขนาดจากรายการ`);
    return {
      kgm: sec.kgm,
      note: `W ${key}×${sec.t1}×${sec.t2}`,
      expr: "เปิดตารางน้ำหนักหน้าตัดมาตรฐาน",
      subst: `W ${key} → ${fmt(sec.kgm, 2)} กก./ม.`,
      fromTable: true,
    };
  }
  const key = str(v, "csize", "100");
  const sec = STEEL_CHANNEL[key];
  if (!sec) return invalidResult(`ไม่มีรางน้ำ ${key} ในตาราง — เลือกขนาดจากรายการ`);
  return {
    kgm: sec.kgm,
    note: `รางน้ำรีดร้อน ${sec.h}×${sec.b}×${sec.t1}×${sec.t2}`,
    expr: "เปิดตารางน้ำหนักหน้าตัดมาตรฐาน",
    subst: `รางน้ำ ${key} → ${fmt(sec.kgm, 2)} กก./ม.`,
    fromTable: true,
  };
}

export function calcSteelWeight(v: Values) {
  const bad = guard("weight", v);
  if (bad) return bad;
  const shape = str(v, "shape", "box");
  const len = num(v, "len", 6);
  const qty = num(v, "qty", 1);
  const price = num(v, "price", 0);
  const sec = steelSection(v);
  if ("rows" in sec) return sec;
  const { kgm, note, expr, subst, fromTable } = sec;

  const total = kgm * len * qty;
  const cost = total * price;
  const rebarBars = shape === "rebar" ? ceil((len * qty) / STEEL_FORMULA.rebarStock.value) : 0;
  return resultX({
    title: "น้ำหนักเหล็ก",
    headline: price > 0 ? `${fmt(total, 1)} กก. · ประมาณ ${fmt(cost)} บาท` : `${fmt(total, 1)} กก.`,
    rows: [
      { label: "หน้าตัด", value: note },
      { label: "กก./ม.", value: `${fmt(kgm, 2)} กก./ม.` },
      { label: "ยาว × จำนวน", value: `${fmt(len, 2)} ม. × ${fmt(qty)}` },
      { label: "น้ำหนักรวม", value: `${fmt(total, 1)} กก.`, emphasize: true },
      ...(shape === "rebar"
        ? [
            {
              label: "เทียบเป็นเส้นที่ขาย",
              value: `ยาวรวม ${fmt(len * qty, 1)} ม. = ${fmt(rebarBars)} เส้น (เส้นละ ${fmt(STEEL_FORMULA.rebarStock.value)} ม.)`,
            },
          ]
        : []),
      ...(price > 0
        ? [{ label: "ราคาประมาณ", value: `${fmt(cost)} บาท (${fmtTrim(price, 2)} บาท/กก.)`, emphasize: true }]
        : []),
    ],
    tip:
      shape === "c"
        ? "ตัวนี้คือรางน้ำรีดร้อน (Channel) หนาและหนัก ถ้าหมายถึงตัวซีทำแปหลังคา ให้เลือก “ตัวซี (เหล็กพับเย็น)”"
        : price > 0
          ? "ราคาเหล็กขึ้นลงรายวัน ใส่ราคาต่อกิโลจากร้านวันนี้ แล้วเผื่อค่าขนส่ง ค่าตัด แยกต่างหาก"
          : "ใช้เช็กน้ำหนักก่อนสั่งของและคิดค่าขนส่ง ใส่ราคาต่อกิโลได้ถ้าอยากรู้ยอดเงิน",
    explain: {
      risk: "A",
      updatedAt: "2026-11-25",
      summary: "น้ำหนักรวม = น้ำหนักต่อเมตร × ความยาว × จำนวนเส้น",
      steps: [
        { label: "น้ำหนักต่อเมตร", expr, subst },
        {
          label: "น้ำหนักรวม",
          expr: "รวม = กก./ม. × ยาว × จำนวน",
          subst: `${fmt(kgm, 2)} × ${fmt(len, 2)} × ${fmt(qty)} = ${fmt(total, 1)} กก.`,
        },
        ...(price > 0
          ? [
              {
                label: "ราคาประมาณ",
                expr: "บาท = น้ำหนักรวม × ราคาต่อกิโล",
                subst: `${fmt(total, 1)} × ${fmtTrim(price, 2)} = ${fmt(cost)} บาท`,
              },
            ]
          : []),
      ],
      constants: fromTable
        ? []
        : shape === "rebar" || shape === "round"
          ? [MATERIAL.steelDensity, MATERIAL.rebarFactor, ...(shape === "rebar" ? [STEEL_FORMULA.rebarStock] : [])]
          : shape === "box" || shape === "angle"
            ? [STEEL_FORMULA.kgPerMm2]
            : shape === "lipc"
              ? [STEEL_FORMULA.kgPerMm2, STEEL_FORMULA.coldBendInnerR]
              : [MATERIAL.steelDensity],
      assumptions: [
        "เหล็กกล้าคาร์บอนความหนาแน่น 7,850 กก./ลบ.ม.",
        fromTable ? "ใช้น้ำหนักตามตารางหน้าตัดมาตรฐาน JIS G3192 / มอก. 1227 (รางน้ำคือรางรีดร้อน ไม่ใช่ตัวซีพับเย็น)" : "คิดจากปริมาตรหน้าตัดจริง",
        ...(sec.cornerNote ? [sec.cornerNote] : []),
      ],
      caveats: [
        "เหล็กที่ขายจริงมีค่าคลาดเคลื่อนน้ำหนักได้ตามเกรด (เหล็กเบา/เหล็กเต็ม) ต่างกันได้หลายเปอร์เซ็นต์",
        "สแตนเลส (≈7,930) อลูมิเนียม (≈2,700) ใช้ตัวเลขนี้ไม่ได้",
        ...(price > 0 ? ["ราคาเป็นค่าที่กรอกเอง ยังไม่รวมค่าตัด ค่าขนส่ง และภาษี"] : []),
        DISCLAIMER_AB,
      ],
      refs: [
        { label: STEEL_SECTION_SOURCE },
        { label: "มอก. 20 / 24 เหล็กเส้นเสริมคอนกรีต (น้ำหนักต่อเมตรตามเส้นผ่านศูนย์กลาง)" },
      ],
    },
  });
}

export function calcWeld(v: Values) {
  const bad = guard("weld", v);
  if (bad) return bad;
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

/**
 * จัดชิ้นลงเส้นแบบ Best Fit Decreasing
 * n ชิ้นในเส้นเดียวมีรอยตัดคั่นกัน n−1 รอย จึงคิดเป็น "เส้นยาว stock + kerf" แล้วให้ทุกชิ้นกิน (ยาว + kerf)
 * — ชิ้น 6000 ลงเส้น 6000 ได้พอดี · เศษที่รายงานหักรอยตัดสุดท้าย (รอยที่แยกชิ้นสุดท้ายออกจากเศษ) แล้ว
 */
export function packBfd(stock: number, kerf: number, parts: number[]) {
  const EPS = 1e-9;
  const sorted = [...parts].sort((a, b) => b - a);
  const bars: number[][] = [];
  const room: number[] = [];
  for (const p of sorted) {
    const need = p + kerf;
    let best = -1;
    let bestLeft = Infinity;
    for (let i = 0; i < room.length; i++) {
      if (room[i] + EPS >= need && room[i] - need < bestLeft) {
        best = i;
        bestLeft = room[i] - need;
      }
    }
    if (best >= 0) {
      bars[best].push(p);
      room[best] -= need;
    } else {
      bars.push([p]);
      room.push(stock + kerf - need);
    }
  }
  const remain = room.map((r) => Math.max(0, r - kerf));
  return { bars, remain };
}

/** ย่อรายการชิ้นให้อ่านง่าย: 1500 ×20 · 800 */
function summarizeParts(parts: number[]): string {
  const count = new Map<number, number>();
  for (const p of parts) count.set(p, (count.get(p) ?? 0) + 1);
  return [...count.entries()].map(([len, n]) => (n > 1 ? `${fmtTrim(len)} ×${n}` : fmtTrim(len))).join(" · ");
}

const CUT_MAX_PARTS = 2000;

export function calcCut(v: Values) {
  const bad = guard("cut", v);
  if (bad) return bad;
  const stock = num(v, "stock", 6000);
  const kerf = num(v, "kerf", 3);
  const { values: parts, dropped } = parseLengthList(str(v, "parts", "1200, 1200, 800, 2500, 900"), stock);
  if (parts.length === 0) {
    return invalidResult("ใส่ความยาวชิ้นงานก่อน คั่นด้วยจุลภาค เช่น 1200, 800, 2500 หรือ 1500x20 (ยาว × จำนวน)");
  }
  if (parts.length > CUT_MAX_PARTS) {
    return blockedResult({
      headline: `รายการมี ${fmt(parts.length)} ชิ้น มากเกินไป — แบ่งคิดทีละไม่เกิน ${fmt(CUT_MAX_PARTS)} ชิ้น`,
      tip: "แบ่งรายการตามหน้าตัดหรือตามโซนงาน แล้วคิดทีละชุด",
    });
  }
  const minPiece = STEEL_FORMULA.cutMinPieceMm.value;
  const tooShort = parts.filter((p) => p < minPiece);
  if (tooShort.length) {
    return blockedResult({
      headline: `มีชิ้นสั้นกว่า ${fmt(minPiece)} มม. — ช่องนี้ใส่เป็น มม. (1.5 ม. พิมพ์ 1500)`,
      tip: "ความยาวชิ้นงานใส่เป็นมิลลิเมตร ถ้าวัดมาเป็นเมตรให้คูณ 1,000 ก่อน เช่น 1.5 ม. = 1500",
      rows: [
        { label: "ชิ้นที่สั้นเกินไป", value: `${[...new Set(tooShort)].map((x) => fmtTrim(x, 2)).join(" · ")} มม.`, emphasize: true },
      ],
    });
  }
  const tooLong = parts.filter((p) => p > stock);
  if (tooLong.length) {
    return blockedResult({
      headline: `มี ${tooLong.length} ชิ้นยาวกว่าเส้นวัตถุดิบ ${fmt(stock)} มม. — ตัดไม่ได้`,
      tip: "แก้ความยาวชิ้นงาน เปลี่ยนเป็นเส้นวัตถุดิบที่ยาวขึ้น หรือแบ่งชิ้นนั้นแล้วต่อเชื่อม ถ้าพิมพ์เลขหลักพันด้วยจุลภาค (เช่น 1,200) ให้เว้นวรรคระหว่างชิ้น",
      rows: [
        { label: "ชิ้นที่ยาวเกินเส้น", value: `${tooLong.map((x) => fmt(x)).join(" · ")} มม.`, emphasize: true },
        { label: "อ่านรายการได้", value: `${parts.map((x) => fmt(x)).join(" · ")} มม.` },
      ],
    });
  }
  const { bars, remain } = packBfd(stock, kerf, parts);
  const used = bars.length;
  const scrap = remain.reduce((a, b) => a + b, 0);
  const totalNeed = parts.reduce((a, b) => a + b, 0);
  const pct = (scrap / (used * stock)) * 100;
  const lastRemain = remain[remain.length - 1] ?? 0;

  // คำใบ้ประหยัดเส้น: ลองลดทุกชิ้นลงทีละ 1 มม. (ไม่เกินเพดาน) ว่าจำนวนเส้นลดลงไหม
  let hint: { k: number; bars: number } | null = null;
  const shortest = Math.min(...parts);
  for (let k = 1; k <= STEEL_FORMULA.cutHintMaxMm.value && shortest - k >= minPiece; k++) {
    const trial = packBfd(stock, kerf, parts.map((p) => p - k)).bars.length;
    if (trial < used) {
      hint = { k, bars: trial };
      break;
    }
  }

  // รวมเส้นที่ตัดเหมือนกันเป็นแถวเดียว ให้อ่านเป็นใบสั่งตัดได้
  const groups: { from: number; to: number; pattern: string; left: number }[] = [];
  bars.forEach((b, i) => {
    const pattern = summarizeParts(b);
    const last = groups[groups.length - 1];
    if (last && last.pattern === pattern && last.left === remain[i]) last.to = i + 1;
    else groups.push({ from: i + 1, to: i + 1, pattern, left: remain[i] });
  });

  return resultX({
    title: "วางแผนตัดเหล็ก",
    headline: dropped.length
      ? `ใช้ ${used} เส้น · เศษ ${fmt(pct, 1)}% — ข้าม ${dropped.length} รายการที่อ่านไม่ออก`
      : `ใช้ ${used} เส้น · เศษ ${fmt(pct, 1)}%`,
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
      ...(hint
        ? [
            {
              label: "ทางประหยัด",
              value: `ลดชิ้นละ ${hint.k} มม. จะเหลือ ${hint.bars} เส้น (จาก ${used})`,
              emphasize: true,
            },
          ]
        : []),
      { label: "อ่านรายการได้", value: `${summarizeParts(parts)} มม.` },
      ...(dropped.length ? [{ label: "อ่านไม่ออก (ข้ามไป)", value: dropped.join(" · "), emphasize: true }] : []),
      ...groups.map((g) => ({
        label: g.from === g.to ? `เส้นที่ ${g.from}` : `เส้นที่ ${g.from}–${g.to} (${g.to - g.from + 1} เส้น)`,
        value: `${g.pattern} · เหลือ ${fmt(g.left)} มม.`,
      })),
    ],
    tip: hint
      ? `ชิ้นงานเกือบลงพอดีเส้น ถ้าแบบยอมให้สั้นลงชิ้นละ ${hint.k} มม. จะประหยัดได้ ${used - hint.bars} เส้น — ถามเจ้าของงานก่อนลด`
      : "พิมพ์ 1500x20 ได้ถ้าชิ้นเท่ากันหลายชิ้น จัดแบบ Best Fit Decreasing เผื่อรอยตัดระหว่างชิ้นให้แล้ว",
    explain: {
      risk: "A",
      updatedAt: "2026-11-25",
      summary: "จัดเรียงชิ้นงานจากยาวไปสั้น (Best Fit Decreasing) ใส่ลงเส้นวัตถุดิบให้เศษเหลือน้อยที่สุดในแต่ละเส้น เผื่อรอยตัด (kerf) ระหว่างชิ้นทุกรอย",
      steps: [
        { label: "จำนวนชิ้นงานที่ต้องตัด", expr: "รวมความยาวที่ต้องการ", subst: `${parts.length} ชิ้น = ${fmt(totalNeed)} มม.` },
        {
          label: "เงื่อนไขลงเส้น",
          expr: "ผลรวมชิ้น + รอยตัด × (จำนวนชิ้น − 1) ≤ ยาวเส้น",
          subst: `รอยตัด ${fmtTrim(kerf)} มม. · n ชิ้นมี n − 1 รอยคั่น (ชิ้นยาวเท่าเส้นพอดีจึงลงได้)`,
        },
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
      constants: [STEEL_FORMULA.cutHintMaxMm, STEEL_FORMULA.cutMinPieceMm],
      assumptions: [
        `เผื่อ kerf (ความหนาใบตัด) ${fmtTrim(kerf)} มม. ต่อรอยตัด — เศษที่รายงานหักรอยตัดแยกชิ้นสุดท้ายแล้ว`,
        "อัลกอริทึมเป็นแบบประมาณ (heuristic) ไม่ใช่คำตอบที่เศษน้อยที่สุดเสมอไป",
      ],
      caveats: [
        "เหล็กหน้างานอาจมีความยาวจริงคลาดเคลื่อนจากสเปก ±20–50 มม. ควรเผื่อวัดจริงก่อนตัด",
        "เลขที่พิมพ์แบบมีจุลภาคหลักพัน (1,200) จะอ่านเป็น 1200 เมื่อไม่เกินความยาวเส้น — ดูแถว “อ่านรายการได้” ว่าตรงกับที่ตั้งใจ",
        dropped.length ? `มี ${dropped.length} รายการที่อ่านเป็นความยาวไม่ได้และไม่ถูกนับ: ${dropped.join(" · ")}` : "",
        DISCLAIMER_AB,
      ].filter(Boolean),
      refs: [{ label: "อัลกอริทึม Cutting Stock / Best Fit Decreasing (การตัดวัสดุให้เศษน้อยที่สุด)" }],
    },
  });
}

export function calcDeflection(v: Values) {
  const bad = guard("deflection", v);
  if (bad) return bad;
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
  const bad = guard("thermal", v);
  if (bad) return bad;
  const L = num(v, "L", 12);
  const dT = num(v, "dT", 40);
  const alpha = MATERIAL.steelAlpha.value;
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

/** ช่องเลือกหน้าตัด ใช้ร่วมกันระหว่างเครื่องมือน้ำหนักเหล็กกับหน้าคิดทั้งงาน */
const SHAPE_OPTIONS = [
  { value: "box", label: "เหล็กกล่อง (เหลี่ยม / แบน)" },
  { value: "angle", label: "เหล็กฉาก" },
  { value: "lipc", label: "ตัวซี (เหล็กพับเย็น มีขอบพับ)" },
  { value: "rebar", label: "เหล็กเส้น RB / DB" },
  { value: "pipe", label: "ท่อกลม (แป๊บ)" },
  { value: "plate", label: "แผ่น / เหล็กแบน" },
  { value: "round", label: "กลมตัน" },
  { value: "h", label: "H-Beam" },
  { value: "w", label: "W / เสา" },
  { value: "c", label: "รางน้ำรีดร้อน (Channel — ไม่ใช่ตัวซี)" },
];

const SECTION_FIELDS: ToolDef["fields"] = [
  { type: "number", key: "ba", label: "กล่อง ด้านกว้าง", unit: "มม.", default: 50, min: 10, max: 500, step: 0.1, when: { key: "shape", is: "box" } },
  { type: "number", key: "bb", label: "กล่อง ด้านสูง", unit: "มม.", default: 50, min: 10, max: 500, step: 0.1, when: { key: "shape", is: "box" } },
  { type: "number", key: "bt", label: "กล่อง หนา", unit: "มม.", default: 2.3, min: 0.6, max: 16, step: 0.1, when: { key: "shape", is: "box" } },
  { type: "number", key: "la", label: "ฉาก ขา A", unit: "มม.", default: 50, min: 20, max: 250, step: 0.1, when: { key: "shape", is: "angle" } },
  { type: "number", key: "lb", label: "ฉาก ขา B", unit: "มม.", default: 50, min: 20, max: 250, step: 0.1, when: { key: "shape", is: "angle" } },
  { type: "number", key: "lt", label: "ฉาก หนา", unit: "มม.", default: 4, min: 1.5, max: 19, step: 0.1, when: { key: "shape", is: "angle" } },
  { type: "number", key: "ch", label: "ตัวซี สูง (H)", unit: "มม.", default: 100, min: 50, max: 400, step: 0.1, when: { key: "shape", is: "lipc" } },
  { type: "number", key: "cb", label: "ตัวซี ปีก (B)", unit: "มม.", default: 50, min: 30, max: 150, step: 0.1, when: { key: "shape", is: "lipc" } },
  { type: "number", key: "cl", label: "ตัวซี ขอบพับ (C)", unit: "มม.", default: 20, min: 10, max: 50, step: 0.1, when: { key: "shape", is: "lipc" } },
  { type: "number", key: "ct", label: "ตัวซี หนา", unit: "มม.", default: 2.3, min: 1.2, max: 4.5, step: 0.1, when: { key: "shape", is: "lipc" } },
  {
    type: "select",
    key: "rebar",
    label: "ขนาดเหล็กเส้น",
    default: "DB12",
    when: { key: "shape", is: "rebar" },
    options: Object.entries(REBAR_SIZES).map(([k, r]) => ({ value: k, label: r.label })),
  },
  { type: "number", key: "w", label: "กว้างแผ่น", unit: "มม.", default: 1200, min: 10, max: 3000, when: { key: "shape", is: "plate" } },
  { type: "number", key: "t", label: "หนาแผ่น/ท่อ", unit: "มม.", default: 6, min: 0.5, max: 100, step: 0.1, when: { key: "shape", is: ["plate", "pipe"] } },
  { type: "number", key: "d", label: "Ø เหล็กกลม", unit: "มม.", default: 12, min: 6, max: 300, when: { key: "shape", is: "round" } },
  { type: "number", key: "od", label: "Ø นอกท่อ", unit: "มม.", default: 48.3, min: 10, max: 1000, step: 0.1, when: { key: "shape", is: "pipe" } },
  {
    type: "select",
    key: "hsize",
    label: "ขนาด H",
    default: "200x100",
    when: { key: "shape", is: "h" },
    options: Object.keys(STEEL_H_BEAM).map((k) => ({ value: k, label: `H ${k}` })),
  },
  {
    type: "select",
    key: "wsize",
    label: "ขนาด W",
    default: "150x150",
    when: { key: "shape", is: "w" },
    options: Object.keys(STEEL_W_BEAM).map((k) => ({ value: k, label: `W ${k}` })),
  },
  {
    type: "select",
    key: "csize",
    label: "ขนาดรางน้ำ",
    default: "100",
    when: { key: "shape", is: "c" },
    options: Object.entries(STEEL_CHANNEL).map(([k, c]) => ({ value: k, label: `รางน้ำ ${c.h}×${c.b}` })),
  },
  { type: "number", key: "price", label: "ราคาเหล็ก (ไม่ใส่ก็ได้)", unit: "บาท/กก.", default: 0, min: 0, max: 1000, step: 0.5 },
];

export const steelTools: ToolDef[] = [
  {
    id: "weight",
    name: "น้ำหนักเหล็ก (กล่อง ฉาก ตัวซี เหล็กเส้น)",
    blurb: "กล่อง ฉาก ตัวซี เหล็กเส้น ท่อ แผ่น H — กก. และราคา",
    keywords: ["เหล็กกล่อง", "กล่อง", "เหล็กฉาก", "ฉาก", "ตัวซี", "เหล็กเส้น", "ข้ออ้อย", "แป๊บ", "ราคาเหล็ก"],
    fields: [
      { type: "select", key: "shape", label: "รูปพรรณ", default: "box", options: SHAPE_OPTIONS },
      { type: "number", key: "len", label: "ยาว", unit: "ม.", default: 6, min: 0.1, max: 24, step: 0.1 },
      { type: "number", key: "qty", label: "จำนวน", unit: "เส้น", default: 1, min: 1, max: 10000 },
      ...SECTION_FIELDS,
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
      { type: "number", key: "z", label: "ขาเชื่อม / ลึก", unit: "มม.", default: 6, min: 3, max: 40 },
      { type: "number", key: "len", label: "ยาวแนว", unit: "ม.", default: 4, min: 0.1, max: 1000, step: 0.1 },
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
    blurb: "กี่เส้นพอ เศษเหลือเท่าไร",
    fields: [
      { type: "number", key: "stock", label: "ยาววัตถุดิบ", unit: "มม.", default: 6000, min: 500, max: 12000 },
      { type: "number", key: "kerf", label: "เผื่อตัด (ความหนาใบตัด)", unit: "มม.", default: 3, min: 0, max: 10, step: 0.5 },
      {
        type: "text",
        key: "parts",
        label: "ชิ้นงาน (มม. คั่นด้วยจุลภาค · 1500x20 = 20 ชิ้น)",
        default: "1200, 1200, 800, 2500, 900",
        placeholder: "1200, 800, 1500x20",
      },
    ],
    calc: calcCut,
  },
  {
    id: "deflection",
    name: "ระยะโก่งคาน",
    blurb: "เทียบ L/360 · L/240",
    fields: [
      { type: "number", key: "L", label: "ช่วงคาน", unit: "ม.", default: 4, min: 0.5, max: 20, step: 0.1 },
      { type: "number", key: "w", label: "โหลดกระจาย", unit: "กก./ม.", default: 400, min: 10, max: 20000 },
      { type: "number", key: "I", label: "โมเมนต์ความเฉื่อย I", unit: "ซม.⁴", default: 2140, min: 10, max: 1000000 },
    ],
    calc: calcDeflection,
  },
  {
    id: "thermal",
    name: "การขยายตัวจากความร้อน",
    blurb: "ΔL = L·α·ΔT",
    fields: [
      { type: "number", key: "L", label: "ยาวชิ้น", unit: "ม.", default: 12, min: 0.5, max: 500, step: 0.1 },
      { type: "number", key: "dT", label: "ต่างอุณหภูมิ", unit: "°C", default: 40, min: 1, max: 200 },
    ],
    calc: calcThermal,
  },
];

export const steelJob: JobDef = {
  name: "คิดทั้งงานเหล็กเส้นนี้",
  blurb: "ใส่รายการตัด ได้จำนวนเส้น น้ำหนัก ราคา",
  fields: [
    { type: "select", key: "shape", label: "รูปพรรณ", default: "box", options: SHAPE_OPTIONS },
    ...SECTION_FIELDS.filter((f) => f.key !== "price"),
    { type: "text", key: "parts", label: "ตัดเป็นชิ้น (มม. · 1500x20 = 20 ชิ้น)", default: "1500, 1500, 1200, 900", placeholder: "1200, 800, 1500x20" },
    { type: "number", key: "stock", label: "ยาววัตถุดิบ", unit: "มม.", default: 6000, min: 500, max: 12000 },
    { type: "number", key: "kerf", label: "เผื่อตัด (ความหนาใบตัด)", unit: "มม.", default: 3, min: 0, max: 10, step: 0.5 },
    { type: "number", key: "price", label: "ราคาเหล็ก (ไม่ใส่ก็ได้)", unit: "บาท/กก.", default: 0, min: 0, max: 1000, step: 0.5 },
  ],
  calc: (input) => {
    const bad = guardInputs(steelJob.fields, input);
    if (bad) return bad;
    const v = withDefaults(steelJob.fields, input);
    const cut = calcCut(v);
    if (cut.invalid) return jobFromParts({ title: "งานเหล็ก", headline: "", rows: [], tip: "", parts: [cut] });
    // จำนวนเส้นมาจากแผนตัด แล้วน้ำหนัก/ราคาคิดจากเส้นเต็มที่ต้องซื้อจริง
    const stock = num(v, "stock", 6000);
    const bars = cut.chart?.kind === "packs" ? cut.chart.count : 0;
    const wt = calcSteelWeight({ ...v, len: stock / 1000, qty: bars });
    if (wt.invalid) return jobFromParts({ title: "งานเหล็ก", headline: "", rows: [], tip: "", parts: [wt] });
    const price = num(v, "price", 0);
    const pick = (r: typeof wt, label: string) => r.rows.find((x) => x.label === label);
    const total = pick(wt, "น้ำหนักรวม");
    const cost = pick(wt, "ราคาประมาณ");
    const hint = pick(cut, "ทางประหยัด");
    return jobFromParts({
      title: "งานเหล็ก",
      headline: `ซื้อ ${bars} เส้น · ${total?.value ?? ""}${price > 0 && cost ? ` · ${cost.value.split(" (")[0]}` : ""}`,
      rows: [
        ...wt.rows.filter((r) => r.label === "หน้าตัด" || r.label === "กก./ม."),
        ...cut.rows.filter((r) => r.label === "เส้นวัตถุดิบ"),
        ...(total ? [{ label: "น้ำหนักที่ต้องซื้อ", value: `${total.value} (${bars} เส้นเต็ม)`, emphasize: true }] : []),
        ...(cost ? [cost] : []),
        ...cut.rows.filter((r) => r.label === "เศษรวม"),
        ...(hint ? [hint] : []),
        ...cut.rows.filter((r) => r.label.startsWith("เส้นที่")),
      ],
      tip: "จำนวนเส้นมาจากแผนตัด น้ำหนักคิดจากเส้นเต็มที่ต้องซื้อ งานรับแรงให้วิศวกรโยธาดูหน้าตัด",
      parts: [cut, wt],
    });
  },
};
