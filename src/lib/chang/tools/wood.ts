import type { CalcResult, Field, FormulaStep, ToolDef, Values } from "../types";
import { blockedResult, ceil, fmt, fmtTrim, guardTool, num, resultX, str } from "../math";
import { CLADDING, DECK, DISCLAIMER_AB, DISCLAIMER_C, STEEL_STICK, TAX, UNIT, WOOD } from "../constants";
import { baht, toSatang } from "./estimate";

const guard = (id: string, v: Values) => guardTool(woodTools, id, v);

/* ─────────── ตัดแผ่น/เส้นจากความยาวที่ขาย ─────────── */

/**
 * นับแผ่น/เส้นที่ต้องซื้อ เมื่อต้องวาง `lines` แถว แต่ละแถวยาว `run` ม. และของขายยาว `stock` ม.
 * - แถวยาวกว่าแผ่น: ใช้แผ่นเต็ม k แผ่นต่อแถว + ท่อนเศษ r (r = run − k × stock)
 * - ท่อนเศษ (หรือทั้งแถวเมื่อแถวสั้นกว่าแผ่น) ตัดจากแผ่นใหม่ได้ floor(stock ÷ r) ท่อนต่อแผ่น
 * ไม่เอาเศษจากแถวหนึ่งไปต่อแถวอื่น และไม่หักรอยเลื่อย — เป็นวิธีนับที่ช่างทำได้จริงหน้างาน
 */
export function cutStock(lines: number, run: number, stock: number) {
  const k = Math.floor(run / stock + 1e-9);
  const rest = run - k * stock;
  const r = rest > 1e-9 ? rest : 0;
  const perStock = r > 0 ? Math.floor(stock / r + 1e-9) : 0;
  const restStock = r > 0 ? ceil(lines / perStock) : 0;
  return { k, r, perStock, full: lines * k, restStock, count: lines * k + restStock };
}

function cutStep(label: string, lines: number, run: number, stock: number, cut: ReturnType<typeof cutStock>, unit: string): FormulaStep {
  if (cut.k === 0) {
    return {
      label,
      expr: `แถวสั้นกว่า${unit}: 1 ${unit}ตัดได้ ปัดลง(ยาว${unit} ÷ ยาวแถว) ท่อน · ${unit} = ปัดขึ้น(แถว ÷ ท่อนต่อ${unit})`,
      subst: `ปัดลง(${fmtTrim(stock, 2)} ÷ ${fmtTrim(run, 2)}) = ${fmt(cut.perStock)} ท่อน → ปัดขึ้น(${fmt(lines)} ÷ ${fmt(cut.perStock)}) = ${fmt(cut.count)} ${unit}`,
    };
  }
  if (cut.r === 0) {
    return {
      label,
      expr: `แถวละ ยาวแถว ÷ ยาว${unit} ${unit}เต็ม`,
      subst: `${fmt(lines)} แถว × (${fmtTrim(run, 2)} ÷ ${fmtTrim(stock, 2)} = ${fmt(cut.k)}) = ${fmt(cut.count)} ${unit}`,
    };
  }
  return {
    label,
    expr: `แถวละ ${unit}เต็ม k ${unit} + ท่อนเศษ r · ท่อนเศษตัดจาก${unit}ใหม่ ปัดลง(ยาว${unit} ÷ r) ท่อนต่อ${unit}`,
    subst: `k = ${fmt(cut.k)}, r = ${fmtTrim(run, 2)} − ${fmt(cut.k)} × ${fmtTrim(stock, 2)} = ${fmtTrim(cut.r, 3)} ม. → ${fmt(lines)} × ${fmt(cut.k)} + ปัดขึ้น(${fmt(lines)} ÷ ${fmt(cut.perStock)}) = ${fmt(cut.full)} + ${fmt(cut.restStock)} = ${fmt(cut.count)} ${unit}`,
  };
}

/** จำนวนแถวแผ่นที่วางเรียงคลุมระยะ S เมื่อแผ่นกว้าง bw และร่อง g (g ติดลบ = ทับซ้อน) — หน่วย ม. */
export function boardRows(S: number, bw: number, g: number): number {
  return ceil((S + g) / (bw + g));
}

/** คลิปซ่อนต้องมีร่องให้ลิ้นคลิปเสียบ — ร่องแคบกว่าที่ผู้ผลิตกำหนดใส่คลิปไม่ได้ (g เป็นเมตร) */
function clipTooTight(fixing: string, g: number): boolean {
  return fixing === "clip" && g < DECK.clipMinGapCm.value / 100 - 1e-9;
}

function clipGapWarning(what: string) {
  return {
    label: "ข้อควรระวัง",
    value: `ร่องแคบกว่า ${fmtTrim(DECK.clipMinGapCm.value * 10, 1)} มม. ใส่คลิปซ่อนไม่ได้ — เปลี่ยนเป็นยิงสกรูหรือเว้นร่อง${what}ตามคู่มือ`,
    emphasize: true,
  };
}

/* ─────────── ไม้กี่ลูกบาศก์ฟุต ─────────── */

export function calcTimber(v: Values): CalcResult {
  const bad = guard("timber", v);
  if (bad) return bad;
  const t = num(v, "t", 2);
  const w = num(v, "w", 4);
  const len = num(v, "len", 4);
  const pcs = num(v, "pcs", 10);
  const price = num(v, "price", 0);
  const shopFt = num(v, "shopFt", WOOD.shopFtPerM.value);

  const lenFt = len / UNIT.foot.value;
  const perPiece = ((t * w) / WOOD.sqInPerSqFt.value) * lenFt;
  const cuft = perPiece * pcs;
  const m3 = cuft * WOOD.cuFtM3.value;
  const shopCuft = ((t * w) / WOOD.sqInPerSqFt.value) * len * shopFt * pcs;
  const diff = shopCuft - cuft;
  const diffPct = (diff / cuft) * 100;
  // เงินคิดเป็นสตางค์จำนวนเต็ม (ปัดครึ่งขึ้น) เหมือนเครื่องมือประมาณราคา — ราคา 0.5 บาท/ลบ.ฟ. ต้องไม่กลายเป็น "1 บาท"
  const cost = toSatang(cuft * price);
  const shopCost = toSatang(shopCuft * price);
  const moneyDiff = shopCost - cost;
  const size = `${fmtTrim(t, 2)}" × ${fmtTrim(w, 2)}"`;
  // เท่ากันเมื่อต่างกันแค่ระดับเศษทศนิยมของเครื่อง (เทียบสัดส่วน ไม่ใช่ค่าตายตัว 0.0005 ลบ.ฟ. ที่ผิดเมื่อไม้น้อย/มาก)
  const same = Math.abs(diff) <= 1e-9 * cuft;
  const diffAbsText = Math.abs(diff) < 0.0005 ? "ไม่ถึง 0.001" : fmt(Math.abs(diff), 3);
  const diffText = same
    ? "เท่ากับคิดเป๊ะ"
    : `${diff > 0 ? "มากกว่า" : "น้อยกว่า"}คิดเป๊ะ ${diffAbsText} ลบ.ฟ. (${fmtTrim(Math.abs(diffPct), 2)}%)`;
  const priceText = `${fmtTrim(price, 2)} บาท/ลบ.ฟ.`;

  return resultX({
    title: "ไม้กี่ลูกบาศก์ฟุต",
    headline: `ไม้ ${size} ยาว ${fmtTrim(len, 2)} ม. × ${fmt(pcs)} ท่อน = ${fmt(cuft, 2)} ลบ.ฟ.` + (price > 0 ? ` · ${baht(cost)}` : ""),
    rows: [
      { label: "ยาวเป็นฟุต", value: `${fmtTrim(len, 2)} ÷ ${UNIT.foot.value} = ${fmt(lenFt, 3)} ฟุต` },
      { label: "ต่อท่อน", value: `${fmt(perPiece, 3)} ลบ.ฟ.` },
      { label: "รวม (คิดเป๊ะ)", value: `${fmt(cuft, 3)} ลบ.ฟ. = ${fmt(m3, 4)} ลบ.ม.`, emphasize: true },
      { label: `ร้านคิด 1 ม. = ${fmtTrim(shopFt, 2)} ฟุต`, value: `${fmt(shopCuft, 3)} ลบ.ฟ. · ${diffText}` },
      ...(price > 0
        ? [
            { label: `ค่าไม้ (${priceText})`, value: baht(cost), emphasize: true },
            {
              label: "ถ้าร้านคิดแบบทางลัด",
              value: moneyDiff === 0 ? `${baht(shopCost)} (เท่ากัน)` : `${baht(shopCost)} · ${moneyDiff > 0 ? "แพงกว่า" : "ถูกกว่า"} ${baht(Math.abs(moneyDiff))}`,
            },
          ]
        : []),
    ],
    tip: "ร้านคิดเงินตามขนาดเรียก (ไม้ 2×4 จริงอาจบางกว่า) — ถามร้านว่าไม้ไสหรือไม้ดิบ และยาวจริงเท่าไหร่",
    explain: {
      risk: "A",
      updatedAt: "2026-11-26",
      summary: "ลบ.ฟ. = หนา(นิ้ว) × กว้าง(นิ้ว) ÷ 144 × ยาว(ฟุต) × จำนวน · ยาว(ฟุต) = ยาว(ม.) ÷ 0.3048",
      steps: [
        { label: "แปลงความยาว", expr: "ยาว(ฟุต) = ยาว(ม.) ÷ 0.3048", subst: `${fmtTrim(len, 2)} ÷ ${UNIT.foot.value} = ${fmt(lenFt, 4)} ฟุต` },
        {
          label: "ปริมาตรต่อท่อน",
          expr: "ลบ.ฟ. = หนา × กว้าง ÷ 144 × ยาว(ฟุต)",
          subst: `${fmtTrim(t, 2)} × ${fmtTrim(w, 2)} ÷ 144 × ${fmt(lenFt, 4)} = ${fmt(perPiece, 4)} ลบ.ฟ.`,
          note: "หน้าตัด 144 ตร.นิ้ว (12 × 12) ยาว 1 ฟุต = 1 ลบ.ฟ.",
        },
        { label: "รวมทุกท่อน", expr: "ต่อท่อน × จำนวน", subst: `${fmt(perPiece, 4)} × ${fmt(pcs)} = ${fmt(cuft, 3)} ลบ.ฟ.` },
        { label: "เป็น ลบ.ม.", expr: "ลบ.ฟ. × 0.3048³", subst: `${fmt(cuft, 3)} × ${fmtTrim(WOOD.cuFtM3.value, 6)} = ${fmt(m3, 4)} ลบ.ม.` },
        {
          label: "ทางลัดร้านไม้",
          expr: `ลบ.ฟ. = หนา × กว้าง × ยาว(ม.) × ${fmtTrim(shopFt, 2)} ÷ 144 × จำนวน`,
          subst: `${fmtTrim(t, 2)} × ${fmtTrim(w, 2)} × ${fmtTrim(len, 2)} × ${fmtTrim(shopFt, 2)} ÷ 144 × ${fmt(pcs)} = ${fmt(shopCuft, 3)} ลบ.ฟ.`,
          note: "ค่าจริง 1 ม. = 3.2808 ฟุต ทางลัด 3.28 ต่างกันไม่ถึง 0.03%",
        },
        ...(price > 0
          ? [{ label: "ค่าไม้", expr: "ลบ.ฟ. × ราคา ปัดเป็นสตางค์", subst: `${fmt(cuft, 4)} × ${fmtTrim(price, 2)} = ${baht(cost)}`, note: "คิดจาก ลบ.ฟ. เต็มความละเอียด แล้วปัดสตางค์ครั้งเดียวตอนท้าย" }]
          : []),
      ],
      constants: [UNIT.foot, WOOD.sqInPerSqFt, WOOD.cuFtM3, WOOD.shopFtPerM, ...(price > 0 ? [TAX.satangPerBaht] : [])],
      assumptions: ["คิดจากขนาดเรียก (ขนาดที่ร้านใช้คิดเงิน) ไม่ใช่ขนาดหลังไส", "ทุกท่อนขนาดและความยาวเท่ากัน — ไม้หลายขนาดให้คิดทีละขนาดแล้วรวม"],
      caveats: ["ราคาต่อ ลบ.ฟ. ต่างกันมากตามชนิดไม้ เกรด และไม้ไส/ไม้ดิบ ใส่ราคาที่ร้านแจ้ง", DISCLAIMER_AB],
      refs: [{ label: "นิยามหน่วย 1 นิ้ว = 25.4 มม. · 1 ฟุต = 12 นิ้ว = 0.3048 ม. (ISO 80000)" }],
    },
  });
}

/* ─────────── ระแนง / ไม้ฝา / WPC ─────────── */

export function calcCladding(v: Values): CalcResult {
  const bad = guard("cladding", v);
  if (bad) return bad;
  const mode = str(v, "mode", "slat");
  const dir = str(v, "dir", "horizontal");
  const W = num(v, "W", 4);
  const H = num(v, "H", 2);
  const bw = (mode === "lap" ? num(v, "bwLap", CLADDING.lapBoardW.value) : num(v, "bw", CLADDING.boardW.value)) / 100;
  const g = mode === "lap" ? -num(v, "lap", CLADDING.lap.value) / 100 : num(v, "gap", CLADDING.gap.value) / 100;
  const len = num(v, "len", CLADDING.boardLen.value);
  const bsp = num(v, "bsp", CLADDING.battenSpacing.value) / 100;
  const bstock = num(v, "bstock", STEEL_STICK.value);
  const waste = num(v, "waste", CLADDING.waste.value);
  const fixing = mode === "slat" ? str(v, "fixing", "screw") : "screw";
  const perCross = mode === "lap" ? num(v, "spcLap", CLADDING.screwsLap.value) : num(v, "spc", CLADDING.screwsSlat.value);

  if (bw + g <= 1e-9) {
    return blockedResult({
      headline: `ทับซ้อน ${fmtTrim(-g * 100, 1)} ซม. เท่ากับหรือกว้างกว่าหน้าไม้ฝา ${fmtTrim(bw * 100, 1)} ซม. — ตรวจขนาดอีกครั้ง`,
      tip: "ไม้ฝาซ้อนเกล็ดต้องเหลือหน้าโชว์ (กว้าง − ทับซ้อน) มากกว่าศูนย์",
    });
  }

  const horizontal = dir === "horizontal";
  // แผ่นวางเรียงกันตามระยะ S แต่ละแถววิ่งยาว run · โครงเคร่าวางขวางแผ่น ตั้งระยะไปตาม run
  const S = horizontal ? H : W;
  const run = horizontal ? W : H;
  const n = boardRows(S, bw, g);
  const covered = n * bw + (n - 1) * g;
  const boards = cutStock(n, run, len);
  const buy = ceil(boards.count * (1 + waste / 100));
  const lines = ceil(run / bsp) + 1;
  const battens = cutStock(lines, S, bstock);
  const crossings = n * lines;
  const clips = (n + 1) * lines;
  const screws = crossings * perCross;
  const what = mode === "lap" ? "ไม้ฝา" : "ระแนง";
  const sLabel = horizontal ? "สูง" : "ยาว";
  const tightClip = clipTooTight(fixing, g);

  return resultX({
    title: "ระแนง / ไม้ฝา / WPC",
    headline: `${what} ${fmt(buy)} แผ่น (ยาว ${fmtTrim(len, 2)} ม.) · โครง ${fmt(battens.count)} เส้น · ${fixing === "clip" ? `คลิป ${fmt(clips)} ตัว` : `สกรู ${fmt(screws)} ตัว`}`,
    rows: [
      { label: "พื้นที่", value: `${fmtTrim(W, 2)} × ${fmtTrim(H, 2)} ม. = ${fmt(W * H, 2)} ตร.ม. วาง${horizontal ? "แนวนอน" : "แนวตั้ง"}` },
      {
        label: `จำนวนแถว (หน้า ${fmtTrim(bw * 100, 1)} ซม. ${g >= 0 ? `ร่อง ${fmtTrim(g * 100, 1)} ซม.` : `ทับ ${fmtTrim(-g * 100, 1)} ซม.`})`,
        value: `${fmt(n)} แถว คลุมได้ ${fmt(covered, 3)} ม. (ต้องการ ${fmtTrim(S, 2)} ม.)`,
      },
      { label: "แผ่นตามแบบ", value: `${fmt(boards.count)} แผ่น (แถวยาว ${fmtTrim(run, 2)} ม.)` },
      { label: `${what}ที่ซื้อ รวมเผื่อ ${fmtTrim(waste, 1)}%`, value: `${fmt(buy)} แผ่น`, emphasize: true },
      { label: `โครงเคร่าทุก ${fmtTrim(bsp * 100, 1)} ซม.`, value: `${fmt(lines)} แนว × ${fmtTrim(S, 2)} ม. = ${fmt(lines * S, 1)} ม.` },
      { label: `โครงเคร่า (เส้นละ ${fmtTrim(bstock, 2)} ม.)`, value: `${fmt(battens.count)} เส้น`, emphasize: true },
      fixing === "clip"
        ? { label: "คลิปซ่อน (แถว + 1) × แนวโครง", value: `${fmt(clips)} ตัว`, emphasize: true }
        : { label: `สกรู ${fmt(perCross)} ตัว/จุด × ${fmt(crossings)} จุด`, value: `${fmt(screws)} ตัว`, emphasize: true },
      ...(tightClip ? [clipGapWarning("ระแนง")] : []),
    ],
    tip:
      mode === "lap"
        ? "ไม้ฝาเริ่มติดจากแถวล่างขึ้นบน ยึดใต้แนวทับซ้อนให้แผ่นบนปิดหัวสกรู · รอยต่อหัวไม้ต้องตกบนโครง"
        : "รอยต่อหัวแผ่นต้องตกบนโครงเคร่า สลับรอยต่อแต่ละแถว ไม่ให้ต่อแนวเดียวกัน",
    explain: {
      risk: "A",
      updatedAt: "2026-11-26",
      summary: "แถว = ปัดขึ้น((ระยะคลุม + ร่อง) ÷ (หน้ากว้าง + ร่อง)) · แผ่นนับตามความยาวที่ขาย · โครงเคร่า = ปัดขึ้น(ยาวแถว ÷ ระยะ) + 1 แนว",
      steps: [
        {
          label: "จำนวนแถว",
          expr: mode === "lap" ? "แถว = ปัดขึ้น((ระยะ − ทับซ้อน) ÷ (หน้ากว้าง − ทับซ้อน))" : "แถว = ปัดขึ้น((ระยะ + ร่อง) ÷ (หน้ากว้าง + ร่อง))",
          subst: `ปัดขึ้น((${fmtTrim(S, 2)} ${g >= 0 ? "+" : "−"} ${fmtTrim(Math.abs(g), 3)}) ÷ (${fmtTrim(bw, 3)} ${g >= 0 ? "+" : "−"} ${fmtTrim(Math.abs(g), 3)})) = ${fmt(n)} แถว`,
          note: `แถวจำนวน n คลุมได้ n × หน้ากว้าง ${g >= 0 ? "+ (n − 1) × ร่อง" : "− (n − 1) × ทับซ้อน"} ต้องไม่น้อยกว่าระยะ${sLabel}`,
        },
        cutStep("แผ่นตามความยาวที่ขาย", n, run, len, boards, "แผ่น"),
        { label: "เผื่อเสีย", expr: "ซื้อ = ปัดขึ้น(แผ่น × (1 + เผื่อ%))", subst: `${fmt(boards.count)} × ${fmtTrim(1 + waste / 100, 3)} = ${fmt(buy)} แผ่น` },
        { label: "แนวโครงเคร่า", expr: "แนว = ปัดขึ้น(ยาวแถว ÷ ระยะโครง) + 1", subst: `ปัดขึ้น(${fmtTrim(run, 2)} ÷ ${fmtTrim(bsp, 2)}) + 1 = ${fmt(lines)} แนว` },
        cutStep("เส้นโครงเคร่า", lines, S, bstock, battens, "เส้น"),
        fixing === "clip"
          ? { label: "คลิปซ่อน", expr: "คลิป = (แถว + 1) × แนวโครง (ทุกร่อง + ขอบสองข้าง)", subst: `(${fmt(n)} + 1) × ${fmt(lines)} = ${fmt(clips)} ตัว` }
          : { label: "สกรู", expr: "สกรู = แถว × แนวโครง × ตัวต่อจุด", subst: `${fmt(n)} × ${fmt(lines)} × ${fmt(perCross)} = ${fmt(screws)} ตัว` },
      ],
      constants: [
        mode === "lap" ? CLADDING.lapBoardW : CLADDING.boardW,
        mode === "lap" ? CLADDING.lap : CLADDING.gap,
        ...(fixing === "clip" ? [DECK.clipMinGapCm] : []),
        CLADDING.boardLen,
        CLADDING.battenSpacing,
        STEEL_STICK,
        mode === "lap" ? CLADDING.screwsLap : CLADDING.screwsSlat,
        CLADDING.waste,
      ],
      assumptions: [
        "ผนัง/รั้วสี่เหลี่ยม ไม่หักช่องเปิด (มีหน้าต่าง/ประตูให้คิดแยกส่วน)",
        "ท่อนเศษของแต่ละแถวตัดจากแผ่นใหม่ ไม่เอาเศษข้ามแถว · ไม่หักรอยเลื่อย",
        "สกรู/คลิปนับเฉพาะจุดที่แผ่นพาดโครง ยังไม่รวมเผื่อหล่น และจุดเพิ่มที่รอยต่อหัวแผ่น",
      ],
      caveats: [
        "ระยะโครงเคร่าและจำนวนสกรูต่อจุดให้ยึดคู่มือผู้ผลิตของรุ่นที่ใช้ — WPC ต้องเว้นช่องขยายตัวที่หัวแผ่นด้วย",
        "รั้วสูงหรือผนังรับลมแรง โครงเหล็กและการยึดเสาเป็นงานโครงสร้าง ต้องตรวจกับวิศวกร",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "คู่มือติดตั้งผู้ผลิตไม้ฝาไฟเบอร์ซีเมนต์ / ระแนง WPC (ระยะโครง ระยะทับซ้อน การยึด)" }],
    },
  });
}

/* ─────────── พื้นเดคระเบียง ─────────── */

export function calcDeck(v: Values): CalcResult {
  const bad = guard("deck", v);
  if (bad) return bad;
  const W = num(v, "W", 3);
  const L = num(v, "L", 4);
  const dir = str(v, "dir", "alongL");
  const bw = num(v, "bw", DECK.boardW.value) / 100;
  const g = num(v, "gap", DECK.gap.value) / 100;
  const len = num(v, "len", DECK.boardLen.value);
  const js = num(v, "js", DECK.joistSpacing.value) / 100;
  const jstock = num(v, "jstock", STEEL_STICK.value);
  const ss = num(v, "ss", DECK.supportSpacing.value) / 100;
  const fixing = str(v, "fixing", "clip");
  const perCross = num(v, "spc", DECK.screws.value);
  const waste = num(v, "waste", CLADDING.waste.value);
  const raised = str(v, "height", "ground") === "raised";

  const alongL = dir === "alongL";
  // ไม้พื้นวิ่งยาว run เรียงคลุมระยะ S · ตงวางขวางไม้พื้น (ยาว S) ตั้งระยะไปตาม run
  const run = alongL ? L : W;
  const S = alongL ? W : L;
  const n = boardRows(S, bw, g);
  const covered = n * bw + (n - 1) * g;
  const boards = cutStock(n, run, len);
  const buy = ceil(boards.count * (1 + waste / 100));
  const lines = ceil(run / js) + 1;
  const joists = cutStock(lines, S, jstock);
  const perJoist = ceil(S / ss) + 1;
  const supports = lines * perJoist;
  const crossings = n * lines;
  const clips = (n + 1) * lines;
  const screws = crossings * perCross;
  const tightClip = clipTooTight(fixing, g);

  return resultX({
    title: "พื้นเดคระเบียง",
    headline:
      (raised ? "โครงสร้างต้องให้วิศวกร · " : "") +
      `ไม้พื้น ${fmt(buy)} แผ่น · ตง ${fmt(joists.count)} เส้น · จุดรอง ${fmt(supports)} จุด`,
    rows: [
      { label: "พื้นที่เดค", value: `${fmtTrim(W, 2)} × ${fmtTrim(L, 2)} ม. = ${fmt(W * L, 2)} ตร.ม.` },
      { label: `ไม้พื้น (หน้า ${fmtTrim(bw * 100, 1)} ซม. ร่อง ${fmtTrim(g * 100, 1)} ซม.)`, value: `${fmt(n)} แถว ยาว ${fmtTrim(run, 2)} ม. คลุม ${fmt(covered, 3)} ม.` },
      { label: "แผ่นตามแบบ", value: `${fmt(boards.count)} แผ่น (ยาว ${fmtTrim(len, 2)} ม.)` },
      { label: `ไม้พื้นที่ซื้อ รวมเผื่อ ${fmtTrim(waste, 1)}%`, value: `${fmt(buy)} แผ่น`, emphasize: true },
      { label: `ตงทุก ${fmtTrim(js * 100, 1)} ซม.`, value: `${fmt(lines)} ตัว × ${fmtTrim(S, 2)} ม. = ${fmt(lines * S, 1)} ม.` },
      { label: `ตง (เส้นละ ${fmtTrim(jstock, 2)} ม.)`, value: `${fmt(joists.count)} เส้น`, emphasize: true },
      {
        label: raised ? `เสา/จุดรองใต้ตงทุก ${fmtTrim(ss * 100, 1)} ซม. (ระยะตามที่กรอก)` : `ขารอง/ตอม่อใต้ตงทุก ${fmtTrim(ss * 100, 1)} ซม.`,
        value: `${fmt(perJoist)} จุด/ตง × ${fmt(lines)} ตง = ${fmt(supports)} จุด`,
        emphasize: true,
      },
      fixing === "clip"
        ? { label: "คลิปซ่อน (แถว + 1) × ตง", value: `${fmt(clips)} ตัว`, emphasize: true }
        : { label: `สกรู ${fmt(perCross)} ตัว/จุด × ${fmt(crossings)} จุด`, value: `${fmt(screws)} ตัว`, emphasize: true },
      ...(tightClip ? [clipGapWarning("")] : []),
    ],
    tip: raised
      ? "เดคยกสูงต้องให้วิศวกรกำหนดขนาดตง คาน เสา และฐานราก ตัวเลขนี้ใช้นับของเตรียมงานเท่านั้น"
      : "รอยต่อหัวไม้พื้นต้องตกบนตง (ใช้ตงคู่ตรงรอยต่อ) และสลับรอยต่อแต่ละแถว · ทำพื้นเอียงเล็กน้อยให้น้ำไหลออก",
    explain: {
      risk: raised ? "C" : "B",
      updatedAt: "2026-11-26",
      summary: "แถวไม้พื้น = ปัดขึ้น((กว้างที่ต้องคลุม + ร่อง) ÷ (หน้าไม้ + ร่อง)) · ตง = ปัดขึ้น(ยาวแถว ÷ ระยะตง) + 1 · จุดรอง = ตง × (ปัดขึ้น(ยาวตง ÷ ระยะรอง) + 1)",
      steps: [
        {
          label: "จำนวนแถวไม้พื้น",
          expr: "แถว = ปัดขึ้น((ระยะคลุม + ร่อง) ÷ (หน้าไม้ + ร่อง))",
          subst: `ปัดขึ้น((${fmtTrim(S, 2)} + ${fmtTrim(g, 3)}) ÷ (${fmtTrim(bw, 3)} + ${fmtTrim(g, 3)})) = ${fmt(n)} แถว`,
        },
        cutStep("แผ่นตามความยาวที่ขาย", n, run, len, boards, "แผ่น"),
        { label: "เผื่อเสีย", expr: "ซื้อ = ปัดขึ้น(แผ่น × (1 + เผื่อ%))", subst: `${fmt(boards.count)} × ${fmtTrim(1 + waste / 100, 3)} = ${fmt(buy)} แผ่น` },
        { label: "จำนวนตง", expr: "ตง = ปัดขึ้น(ยาวแถว ÷ ระยะตง) + 1", subst: `ปัดขึ้น(${fmtTrim(run, 2)} ÷ ${fmtTrim(js, 2)}) + 1 = ${fmt(lines)} ตัว` },
        cutStep("เส้นตง", lines, S, jstock, joists, "เส้น"),
        {
          label: "จุดรองใต้ตง",
          expr: "จุด = ตง × (ปัดขึ้น(ยาวตง ÷ ระยะรอง) + 1)",
          subst: `${fmt(lines)} × (ปัดขึ้น(${fmtTrim(S, 2)} ÷ ${fmtTrim(ss, 2)}) + 1) = ${fmt(lines)} × ${fmt(perJoist)} = ${fmt(supports)} จุด`,
        },
        fixing === "clip"
          ? { label: "คลิปซ่อน", expr: "คลิป = (แถว + 1) × ตง", subst: `(${fmt(n)} + 1) × ${fmt(lines)} = ${fmt(clips)} ตัว` }
          : { label: "สกรู", expr: "สกรู = แถว × ตง × ตัวต่อจุด", subst: `${fmt(n)} × ${fmt(lines)} × ${fmt(perCross)} = ${fmt(screws)} ตัว` },
      ],
      constants: [DECK.boardW, DECK.gap, DECK.boardLen, DECK.joistSpacing, STEEL_STICK, DECK.supportSpacing, ...(fixing === "screw" ? [DECK.screws] : []), CLADDING.waste],
      assumptions: [
        "เดคสี่เหลี่ยม ตงวางขวางไม้พื้นทุกระยะเท่ากัน มีตงที่ขอบทั้งสองฝั่ง",
        "จุดรองนับใต้ตงทุกตัวตามระยะที่กรอก (เดคติดพื้นบนขารอง/ตอม่อ) — ยังไม่รวมตงคู่ที่รอยต่อหัวไม้",
        "ท่อนเศษของแต่ละแถวตัดจากแผ่นใหม่ ไม่เอาเศษข้ามแถว",
      ],
      caveats: [
        ...(raised
          ? [
              "เดคยกสูง (มีเสา คาน ฐานราก) เป็นงานโครงสร้าง ขนาดหน้าตัด ระยะเสา และฐานราก ต้องให้วิศวกรกำหนด จำนวนจุดรองตรงนี้เป็นแค่การนับตามระยะที่กรอก",
              DISCLAIMER_C,
            ]
          : [DISCLAIMER_AB]),
        "ระยะตงและร่องต้องตามคู่มือผู้ผลิตไม้พื้นรุ่นที่ใช้ — WPC ห่างตงเกินกำหนดจะแอ่นและเสียประกัน",
      ],
      refs: [{ label: "คู่มือติดตั้งผู้ผลิตไม้พื้น WPC / ไม้จริง (ระยะตง ร่อง คลิป)" }],
    },
  });
}

/* ─────────── ฟอร์ม ─────────── */

const timberFields: Field[] = [
  { type: "number", key: "t", label: "หนา", unit: "นิ้ว", default: 2, min: 0.25, max: 24, step: 0.25 },
  { type: "number", key: "w", label: "กว้าง", unit: "นิ้ว", default: 4, min: 0.5, max: 24, step: 0.25 },
  { type: "number", key: "len", label: "ยาว", unit: "ม.", default: 4, min: 0.3, max: 12, step: 0.05 },
  { type: "number", integer: true, key: "pcs", label: "จำนวน", unit: "ท่อน", default: 10, min: 1, max: 10000 },
  { type: "number", key: "price", label: "ราคา (ไม่ใส่ก็ได้)", unit: "บาท/ลบ.ฟ.", default: 0, min: 0, max: 100000, step: 0.01 },
  { type: "number", key: "shopFt", label: "ร้านคิด 1 ม. เท่ากับ", unit: "ฟุต", default: WOOD.shopFtPerM.value, min: 3, max: 3.5, step: 0.01 },
];

const claddingFields: Field[] = [
  {
    type: "select",
    key: "mode",
    label: "แบบงาน",
    default: "slat",
    options: [
      { value: "slat", label: "ระแนงเว้นร่อง (ไม้/WPC)" },
      { value: "lap", label: "ไม้ฝาซ้อนเกล็ด" },
    ],
  },
  {
    type: "select",
    key: "dir",
    label: "แนวแผ่น",
    default: "horizontal",
    options: [
      { value: "horizontal", label: "แนวนอน (โครงตั้ง)" },
      { value: "vertical", label: "แนวตั้ง (โครงนอน)" },
    ],
  },
  { type: "number", key: "W", label: "ยาวผนัง/รั้ว", unit: "ม.", default: 4, min: 0.3, max: 200, step: 0.05 },
  { type: "number", key: "H", label: "สูง", unit: "ม.", default: 2, min: 0.3, max: 20, step: 0.05 },
  { type: "number", key: "bw", label: "หน้ากว้างแผ่น", unit: "ซม.", default: CLADDING.boardW.value, min: 2, max: 30, step: 0.5, when: { key: "mode", is: "slat" } },
  { type: "number", key: "bwLap", label: "หน้ากว้างไม้ฝา", unit: "ซม.", default: CLADDING.lapBoardW.value, min: 5, max: 30, step: 0.5, when: { key: "mode", is: "lap" } },
  { type: "number", key: "gap", label: "ร่องเว้น (0 = ชิด)", unit: "ซม.", default: CLADDING.gap.value, min: 0, max: 10, step: 0.1, when: { key: "mode", is: "slat" } },
  { type: "number", key: "lap", label: "ทับซ้อน", unit: "ซม.", default: CLADDING.lap.value, min: 1, max: 6, step: 0.5, when: { key: "mode", is: "lap" } },
  { type: "number", key: "len", label: "ยาวต่อแผ่น", unit: "ม.", default: CLADDING.boardLen.value, min: 0.5, max: 6, step: 0.1 },
  { type: "number", key: "bsp", label: "ระยะโครงเคร่า", unit: "ซม.", default: CLADDING.battenSpacing.value, min: 20, max: 120, step: 5 },
  { type: "number", key: "bstock", label: "ยาวโครงต่อเส้น", unit: "ม.", default: STEEL_STICK.value, min: 1, max: 12, step: 0.5 },
  {
    type: "select",
    key: "fixing",
    label: "ยึดด้วย",
    default: "screw",
    options: [
      { value: "screw", label: "สกรูยิงหน้า" },
      { value: "clip", label: "คลิปซ่อน (WPC)" },
    ],
    when: { key: "mode", is: "slat" },
  },
  { type: "number", integer: true, key: "spc", label: "สกรูต่อจุดที่พาดโครง", unit: "ตัว", default: CLADDING.screwsSlat.value, min: 1, max: 4, when: { key: "mode", is: "slat", and: { key: "fixing", is: "screw" } } },
  { type: "number", integer: true, key: "spcLap", label: "ตะปู/สกรูต่อจุดที่พาดโครง", unit: "ตัว", default: CLADDING.screwsLap.value, min: 1, max: 3, when: { key: "mode", is: "lap" } },
  { type: "number", key: "waste", label: "เผื่อเสีย", unit: "%", default: CLADDING.waste.value, min: 0, max: 30 },
];

const deckFields: Field[] = [
  { type: "number", key: "W", label: "กว้างเดค", unit: "ม.", default: 3, min: 0.5, max: 30, step: 0.05 },
  { type: "number", key: "L", label: "ยาวเดค", unit: "ม.", default: 4, min: 0.5, max: 30, step: 0.05 },
  {
    type: "select",
    key: "dir",
    label: "ไม้พื้นวิ่งตาม",
    default: "alongL",
    options: [
      { value: "alongL", label: "ด้านยาว (ตงขวางด้านกว้าง)" },
      { value: "alongW", label: "ด้านกว้าง (ตงขวางด้านยาว)" },
    ],
  },
  { type: "number", key: "bw", label: "หน้ากว้างไม้พื้น", unit: "ซม.", default: DECK.boardW.value, min: 5, max: 30, step: 0.5 },
  { type: "number", key: "gap", label: "ร่อง", unit: "ซม.", default: DECK.gap.value, min: 0, max: 2, step: 0.1 },
  { type: "number", key: "len", label: "ยาวไม้พื้นต่อแผ่น", unit: "ม.", default: DECK.boardLen.value, min: 0.5, max: 6, step: 0.1 },
  { type: "number", key: "js", label: "ระยะตง", unit: "ซม.", default: DECK.joistSpacing.value, min: 20, max: 80, step: 5 },
  { type: "number", key: "jstock", label: "ยาวตงต่อเส้น", unit: "ม.", default: STEEL_STICK.value, min: 1, max: 12, step: 0.5 },
  { type: "number", key: "ss", label: "ระยะจุดรองใต้ตง", unit: "ซม.", default: DECK.supportSpacing.value, min: 30, max: 300, step: 10 },
  {
    type: "select",
    key: "fixing",
    label: "ยึดไม้พื้นด้วย",
    default: "clip",
    options: [
      { value: "clip", label: "คลิปซ่อน" },
      { value: "screw", label: "สกรูยิงหน้า" },
    ],
  },
  { type: "number", integer: true, key: "spc", label: "สกรูต่อจุดที่พาดตง", unit: "ตัว", default: DECK.screws.value, min: 1, max: 4, when: { key: "fixing", is: "screw" } },
  {
    type: "select",
    key: "height",
    label: "ความสูงเดค",
    default: "ground",
    options: [
      { value: "ground", label: "ติดพื้น (บนขารอง/พื้นคอนกรีต)" },
      { value: "raised", label: "ยกสูง มีเสา-คาน" },
    ],
  },
  { type: "number", key: "waste", label: "เผื่อเสีย", unit: "%", default: CLADDING.waste.value, min: 0, max: 30 },
];

export const woodTools: ToolDef[] = [
  {
    id: "timber",
    name: "ไม้กี่ลูกบาศก์ฟุต + ราคา",
    blurb: "หน้าตัดนิ้ว × ยาวเมตร → ลบ.ฟ. เทียบทางลัดร้าน",
    keywords: ["ลูกบาศก์ฟุต", "ลบ.ฟ.", "คิวไม้", "ไม้แปรรูป", "ราคาไม้", "ไม้ 2x4", "board foot"],
    fields: timberFields,
    calc: calcTimber,
  },
  {
    id: "cladding",
    name: "ระแนง / ไม้ฝา / ไม้เทียม WPC",
    blurb: "แผ่น โครงเคร่า สกรู คลิป",
    keywords: ["ระแนง", "ไม้ฝา", "wpc", "ไม้เทียม", "ไม้ฝาซ้อนเกล็ด", "รั้วระแนง", "ผนังระแนง", "โครงเคร่า"],
    fields: claddingFields,
    calc: calcCladding,
  },
  {
    id: "deck",
    name: "พื้นเดคระเบียง",
    blurb: "ไม้พื้น ตง ขารอง คลิป/สกรู",
    keywords: ["เดค", "deck", "พื้นไม้ระเบียง", "ตง", "ไม้พื้น wpc", "พื้นระเบียง", "คลิปเดค"],
    fields: deckFields,
    calc: calcDeck,
  },
];
