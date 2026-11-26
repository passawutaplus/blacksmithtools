import type { CalcResult, JobDef, ToolDef, Values } from "../types";
import { blockedResult, bool, ceil, fmt, fmtTrim, guardInputs, guardTool, jobFromParts, num, resultX, round, str, withDefaults } from "../math";
import { ADHESIVE_PER_TROWEL, BATHROOM, DISCLAIMER_AB, GROUT_BAGS, GROUT_DENSITY, TILE, TILE_LAYOUT, TILE_WASTE, WATERPROOF } from "../constants";
import { calcWpBathroom, WP_BATH_DEFAULTS } from "./waterproof";

const TILES: Record<string, { w: number; h: number }> = {
  "20": { w: 0.2, h: 0.2 },
  "30": { w: 0.3, h: 0.3 },
  "3060": { w: 0.3, h: 0.6 },
  "40": { w: 0.4, h: 0.4 },
  "60": { w: 0.6, h: 0.6 },
  "60120": { w: 0.6, h: 1.2 },
  "80": { w: 0.8, h: 0.8 },
};

/** ด่านตรวจของสายกระเบื้อง: ช่องกรอกอยู่ในช่วง และหักส่วนที่ไม่ปูแล้วต้องเหลือพื้นที่ */
function guard(id: string, v: Values) {
  const bad = guardTool(tileTools, id, v);
  if (bad) return bad;
  const gross = num(v, "w", 4) * num(v, "l", 5);
  const deduct = num(v, "deduct", 0);
  if (deduct < gross) return null;
  return blockedResult({
    headline: `หักที่ไม่ปู ${fmt(deduct, 1)} ตร.ม. มากกว่าพื้นที่ห้อง (${fmt(gross, 1)} ตร.ม.) — ไม่เหลือพื้นที่ให้ปู`,
    rows: [
      { label: "พื้นที่ห้อง", value: `${fmt(gross, 2)} ตร.ม.` },
      { label: "หักที่ไม่ปู", value: `${fmt(deduct, 2)} ตร.ม.` },
    ],
    tip: "ตรวจขนาดห้องกับพื้นที่ที่หักอีกครั้ง",
  });
}

export function tileArea(v: Values) {
  const w = num(v, "w", 4);
  const l = num(v, "l", 5);
  const deduct = num(v, "deduct", 0);
  return Math.max(0, w * l - deduct);
}

type Axis = { full: number; rem: number; perTile: number };

/** แนวเดียว: ลงเต็มกี่แผ่น เหลือเศษริมเท่าไร และแผ่นเต็ม 1 แผ่นตัดเศษริมได้กี่ชิ้น */
function axis(room: number, tile: number): Axis {
  const full = Math.floor(room / tile + 1e-9);
  const raw = room - full * tile;
  const rem = raw < 1e-6 ? 0 : raw;
  // เศษริมไม่เกินครึ่งแผ่น ตัดได้ 2 ชิ้นจากแผ่นเดียว (แต่ละชิ้นยังมีขอบโรงงานหนึ่งด้าน) เกินครึ่งแผ่นได้ชิ้นเดียว
  return { full, rem, perTile: rem > tile / 2 + 1e-9 ? 1 : 2 };
}

/**
 * นับแผ่นแบบวางแถวจริง (ลายตรง ห้องสี่เหลี่ยม เริ่มชนผนังด้านหนึ่ง)
 * = แผ่นเต็ม + แผ่นที่ต้องตัดทำแถวริมสองด้าน — วิธีพื้นที่ + เผื่อ 5% ขาดเมื่อเศษริมเกินครึ่งแผ่น
 */
export function tileLayout(roomW: number, roomL: number, tw: number, th: number) {
  const one = (a: number, b: number) => {
    const x = axis(roomW, a);
    const y = axis(roomL, b);
    const edgeCol = x.rem > 0 ? ceil((y.full + (y.rem > 0 ? 1 : 0)) / x.perTile) : 0;
    const edgeRow = y.rem > 0 ? ceil(x.full / y.perTile) : 0;
    return { count: x.full * y.full + edgeCol + edgeRow, x, y, alongW: a, alongL: b };
  };
  const a = one(tw, th);
  if (tw === th) return a;
  const b = one(th, tw);
  return b.count < a.count ? b : a;
}

function edgeText(rem: number, tile: number): string {
  if (rem === 0) return "ลงพอดีแผ่น";
  return `${fmt(rem * 100, 1)} ซม.${rem < tile / 3 ? " (เล็กกว่า 1/3 แผ่น)" : ""}`;
}

export function calcTileQty(v: Values) {
  const bad = guard("qty", v);
  if (bad) return bad;
  const net = tileArea(v);
  const size = str(v, "size", "60");
  const perBox = num(v, "perBox", 4);
  const pattern = str(v, "pattern", "straight");
  const wasteRef =
    pattern === "custom"
      ? {
          value: num(v, "waste", 10),
          unit: "%",
          label: "เผื่อเสียที่กำหนดเอง",
          source: "ค่าที่ผู้ใช้กรอกเอง",
        }
      : (TILE_WASTE[pattern] ?? TILE_WASTE.straight);
  const waste = wasteRef.value / 100;
  const t = TILES[size] ?? TILES["60"];
  const each = t.w * t.h;
  const raw = net / each;
  const withWaste = raw * (1 + waste);
  const byArea = ceil(withWaste);
  // นับแบบวางแถวได้เฉพาะลายตรงในห้องสี่เหลี่ยมเต็ม (ไม่มีส่วนที่หักออก)
  const roomW = num(v, "w", 4);
  const roomL = num(v, "l", 5);
  const layout = pattern === "straight" && num(v, "deduct", 0) === 0 ? tileLayout(roomW, roomL, t.w, t.h) : null;
  const sheets = layout ? Math.max(byArea, layout.count) : byArea;
  const layoutWins = layout !== null && layout.count > byArea;
  const smallEdge = layout !== null && ((layout.x.rem > 0 && layout.x.rem < layout.alongW / 3) || (layout.y.rem > 0 && layout.y.rem < layout.alongL / 3));
  const defaultBox = perBox === 4 && size !== "60";
  const boxes = ceil(sheets / Math.max(perBox, 1));
  const leftover = boxes * perBox - sheets;
  const inLastBox = boxes > 0 ? sheets - (boxes - 1) * Math.max(perBox, 1) : 0;

  return resultX({
    title: "จำนวนกระเบื้อง",
    headline: `${fmt(sheets)} แผ่น · ${fmt(boxes)} กล่อง`,
    chart:
      boxes > 0
        ? {
            kind: "packs",
            unitLabel: "กล่อง",
            count: boxes,
            lastUsed: inLastBox / Math.max(perBox, 1),
            note: `กล่องสุดท้ายใช้ ${fmt(inLastBox)} จาก ${fmt(perBox)} แผ่น · เหลือเก็บซ่อม ${fmt(Math.max(0, leftover))} แผ่น`,
          }
        : undefined,
    rows: [
      { label: "พื้นที่สุทธิ", value: `${fmt(net, 2)} ตร.ม.` },
      { label: "พื้นที่ต่อแผ่น", value: `${fmt(each, 3)} ตร.ม.` },
      { label: "เผื่อเสีย", value: `${fmt(wasteRef.value)}%` },
      { label: "นับแบบพื้นที่ + เผื่อ", value: `${fmt(byArea)} แผ่น` },
      ...(layout
        ? [
            {
              label: "นับแบบวางแถว",
              value: `${fmt(layout.count)} แผ่น (เต็ม ${fmt(layout.x.full)} × ${fmt(layout.y.full)} แผ่น + แถวริมที่ต้องตัด)`,
            },
            {
              label: "เศษริมที่ต้องตัด",
              value: `ด้านกว้างห้อง ${edgeText(layout.x.rem, layout.alongW)} · ด้านยาวห้อง ${edgeText(layout.y.rem, layout.alongL)}`,
            },
          ]
        : []),
      { label: "จำนวนแผ่น", value: `${fmt(sheets)} แผ่น`, emphasize: true },
      { label: "จำนวนกล่อง", value: `${fmt(boxes)} กล่อง`, emphasize: true },
      {
        label: "แผ่น/กล่องที่ใช้คิด",
        value: defaultBox ? `${fmt(perBox)} แผ่น — ค่าตั้งต้น ดูข้างกล่องจริงแล้วแก้` : `${fmt(perBox)} แผ่น`,
        emphasize: defaultBox,
      },
      { label: "เหลือเก็บซ่อม", value: `${fmt(Math.max(0, leftover))} แผ่น` },
    ],
    tip: layoutWins
      ? "เศษริมเกินครึ่งแผ่น ตัดแล้วเศษใช้ต่อไม่ได้ จึงนับตามแถวจริงซึ่งมากกว่าวิธีพื้นที่ ยังไม่รวมแผ่นแตก เผื่อเพิ่มเองได้"
      : smallEdge
        ? "เศษริมเล็กกว่า 1/3 แผ่น ลองเลื่อนศูนย์ปูให้เศษสองฝั่งเท่ากันจะสวยกว่า (ตัวเลขนี้นับแบบเริ่มชนผนังด้านเดียว)"
        : "เก็บกล่องสุดท้ายกับรหัส Lot ไว้ สั่ง Lot เดิมทีหลังสีเพี้ยนบ่อย",
    explain: {
      risk: "A",
      updatedAt: "2026-11-25",
      summary: "จำนวนแผ่น = ค่าที่มากกว่าระหว่าง (พื้นที่สุทธิ ÷ พื้นที่ต่อแผ่น × (1 + เผื่อเสีย)) กับการนับแบบวางแถวจริง แล้วปัดขึ้นเป็นกล่อง",
      steps: [
        {
          label: "พื้นที่ที่ต้องปู",
          expr: "A = กว้าง × ยาว − พื้นที่ที่ไม่ปู",
          subst: `A = ${fmt(num(v, "w", 4), 2)} × ${fmt(num(v, "l", 5), 2)} − ${fmt(num(v, "deduct", 0), 2)} = ${fmt(net, 2)} ตร.ม.`,
        },
        {
          label: "พื้นที่ต่อแผ่น",
          expr: "a = ด้านกว้าง × ด้านยาว",
          subst: `a = ${fmt(t.w, 2)} × ${fmt(t.h, 2)} = ${fmt(each, 3)} ตร.ม.`,
        },
        {
          label: "จำนวนแผ่นก่อนเผื่อ",
          expr: "N₀ = A ÷ a",
          subst: `N₀ = ${fmt(net, 2)} ÷ ${fmt(each, 3)} = ${fmt(raw, 1)} แผ่น`,
        },
        {
          label: "เผื่อเสียตามลายปู",
          expr: "N = N₀ × (1 + เผื่อเสีย) ปัดขึ้น",
          subst: `N = ${fmt(raw, 1)} × ${fmt(1 + waste, 2)} = ${fmt(withWaste, 1)} → ${fmt(sheets)} แผ่น`,
          note: "ลายที่ต้องตัดมุมมากกินเศษมากกว่า",
        },
        ...(layout
          ? [
              {
                label: "นับแบบวางแถว (ลายตรง)",
                expr: "แผ่นเต็ม + แผ่นที่ตัดทำแถวริม · เศษริมไม่เกินครึ่งแผ่นตัดได้ 2 ชิ้น/แผ่น เกินครึ่งได้ 1 ชิ้น/แผ่น",
                subst: `เต็ม ${fmt(layout.x.full)} × ${fmt(layout.y.full)} = ${fmt(layout.x.full * layout.y.full)} + แถวริม ${fmt(layout.count - layout.x.full * layout.y.full)} = ${fmt(layout.count)} แผ่น → ใช้ค่ามากกว่า = ${fmt(sheets)} แผ่น`,
                note: "ไม่คิดความกว้างร่องยาแนว และนับแบบเริ่มปูชนผนังด้านหนึ่ง",
              },
            ]
          : []),
        {
          label: "แปลงเป็นกล่อง",
          expr: "กล่อง = N ÷ แผ่นต่อกล่อง ปัดขึ้น",
          subst: `${fmt(sheets)} ÷ ${fmt(perBox)} = ${fmt(boxes)} กล่อง (เหลือ ${fmt(Math.max(0, leftover))} แผ่น)`,
        },
      ],
      constants: [wasteRef],
      assumptions: [
        "กระเบื้องขนาดเต็มแผ่นตามที่เลือก ไม่รวมแผ่นลายพิเศษหรือคิ้วมุม",
        "พื้นที่สุทธิหักส่วนที่ไม่ปูออกแล้ว",
        "การนับแบบวางแถวใช้กับลายตรงในห้องสี่เหลี่ยมที่ไม่มีส่วนหักออก ลายอื่นหรือห้องที่หักพื้นที่ใช้วิธีพื้นที่ + เผื่อเสีย",
        "จำนวนแผ่นต่อกล่องต่างกันตามขนาดและยี่ห้อ ค่าตั้งต้น 4 แผ่นเป็นของ 60×60 ซม. ทั่วไป ขนาดอื่นให้ดูข้างกล่อง",
      ],
      caveats: [
        "ห้องแคบยาวหรือมีเสา-มุมเยอะ เศษเยอะกว่านี้ ปรับเผื่อเสียขึ้นได้",
        "เผื่อเสียเป็นแนวปฏิบัติหน้างาน ไม่ใช่ค่ามาตรฐาน",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวปฏิบัติงานปูกระเบื้อง (เผื่อเสียตามลายปู)" }],
    },
  });
}

/** อัตราใช้ยาแนว (กก./ตร.ม.) ตามสูตร TDS/ISO 13007: (L + W) ÷ (L × W) × ลึก × กว้าง × ความหนาแน่น — L, W เป็น มม. */
export function groutKgPerM2(t: { w: number; h: number }, jointMm: number, depthMm: number, density: number): number {
  const L = t.w * 1000;
  const W = t.h * 1000;
  return ((L + W) / (L * W)) * depthMm * jointMm * density;
}

export function calcGrout(v: Values) {
  const bad = guard("grout", v);
  if (bad) return bad;
  const net = tileArea(v);
  const size = str(v, "size", "60");
  const joint = num(v, "joint", 2);
  const thick = num(v, "thick", 9);
  const kind = str(v, "grout", "cement");
  const density = GROUT_DENSITY[kind as keyof typeof GROUT_DENSITY] ?? GROUT_DENSITY.cement;
  const t = TILES[size] ?? TILES["60"];
  const L = t.w * 1000;
  const W = t.h * 1000;
  const kgM2 = groutKgPerM2(t, joint, thick, density.value);
  const waste = 1 + TILE.groutWaste.value / 100;
  const kg = kgM2 * net * waste;
  const bagKey = str(v, "groutBag", "5");
  const bagRef = GROUT_BAGS[bagKey] ?? TILE.groutBag;
  const bagKg = bagRef.value;
  const bags = ceil(kg / bagKg);
  const inLastBag = bags > 0 ? kg - (bags - 1) * bagKg : 0;
  const altKey = bagKey === "1" ? "5" : "1";
  const altKg = GROUT_BAGS[altKey].value;

  return resultX({
    title: "ปริมาณยาแนว",
    headline: `ยาแนวประมาณ ${fmt(kg, 1)} กก.`,
    chart:
      bags > 0
        ? {
            kind: "packs",
            unitLabel: `ถุง ${bagKg} กก.`,
            count: bags,
            lastUsed: inLastBag / bagKg,
            note: `ถุงสุดท้ายใช้ประมาณ ${fmt(inLastBag, 1)} จาก ${bagKg} กก.`,
          }
        : undefined,
    rows: [
      { label: "พื้นที่", value: `${fmt(net, 2)} ตร.ม.` },
      { label: "ร่องยาแนว", value: `${fmt(joint)} มม. × ลึก ${fmt(thick)} มม.` },
      { label: "ชนิดยาแนว", value: `${density.label} (${density.value} กก./ล.)` },
      { label: "อัตราใช้", value: `${fmt(kgM2, 2)} กก./ตร.ม.` },
      { label: "ยาแนว", value: `${fmt(kg, 1)} กก.`, emphasize: true },
      { label: `ยาแนว (ถุง ${bagKg} กก.)`, value: `${bags} ถุง`, emphasize: true },
      { label: `ถ้าซื้อถุง ${altKg} กก.`, value: `${ceil(kg / altKg)} ถุง` },
    ],
    tip:
      bagKg > kg * 2
        ? `ใช้จริงแค่ ${fmt(kg, 1)} กก. ถ้าร้านมีถุงเล็ก 1 กก. ซื้อ ${ceil(kg / GROUT_BAGS["1"].value)} ถุงพอ ไม่ต้องเหลือทิ้ง`
        : "ร่องกว้างหรือแผ่นเล็กกินยาแนวเยอะขึ้นเป็นเท่าตัว เผื่อไว้ดีกว่าขาดกลางงาน",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "อัตราใช้ (กก./ตร.ม.) = (L + W) ÷ (L × W) × ลึกร่อง × กว้างร่อง × ความหนาแน่นยาแนว",
      steps: [
        {
          label: "ความยาวร่องใน 1 ตร.ม.",
          expr: "(L + W) ÷ (L × W) × 1,000  โดย L, W เป็น มม.",
          subst: `(${fmt(L)} + ${fmt(W)}) ÷ (${fmt(L)} × ${fmt(W)}) × 1,000 = ${fmt(((L + W) / (L * W)) * 1000, 2)} ม./ตร.ม.`,
          note: "กระเบื้องแผ่นเล็กมีร่องต่อพื้นที่มากกว่า จึงกินยาแนวมากกว่า",
        },
        {
          label: "หน้าตัดร่อง",
          expr: "กว้างร่อง × ลึกร่อง",
          subst: `${fmt(joint)} × ${fmt(thick)} = ${fmt(joint * thick)} ตร.มม.`,
          note: "ถ้าไม่รู้ความลึกร่อง ให้ใช้ความหนาแผ่นตามที่ TDS แนะนำ",
        },
        {
          label: "แปลงปริมาตรเป็นน้ำหนัก",
          expr: "อัตราใช้ = ความยาวร่อง (ม./ตร.ม.) × หน้าตัดร่อง (ตร.มม.) × ความหนาแน่น (กก./ล.) ÷ 1,000",
          subst: `= ${fmt(kgM2, 2)} กก./ตร.ม.`,
        },
        {
          label: "คิดทั้งพื้นที่ + เผื่อ",
          expr: `น้ำหนักรวม = อัตราใช้ × A × (1 + ${TILE.groutWaste.value}%)`,
          subst: `${fmt(kgM2, 2)} × ${fmt(net, 2)} × ${fmt(waste, 2)} = ${fmt(kg, 1)} กก.`,
        },
        {
          label: "แปลงเป็นถุง",
          expr: `ถุง = น้ำหนักรวม ÷ ${bagKg} กก. ปัดขึ้น`,
          subst: `${fmt(kg, 1)} ÷ ${bagKg} = ${bags} ถุง`,
        },
      ],
      constants: [density, TILE.groutWaste, bagRef],
      assumptions: [
        "ร่องถูกยาแนวเต็มความลึกที่กรอก",
        "กระเบื้องปูเป็นตารางสี่เหลี่ยม (ลายตรงหรือสลับครึ่ง)",
      ],
      caveats: [
        "ความหนาแน่นต่างกันตามชนิดและยี่ห้อ ให้ยึดค่าใน TDS ของถุงที่ซื้อจริง",
        "TDS ผู้ผลิตระบุความคลาดเคลื่อนของอัตราใช้ได้ถึง ±15%",
        DISCLAIMER_AB,
      ],
      refs: [
        { label: "ISO 13007-3 การจำแนกวัสดุยาแนวกระเบื้อง" },
        { label: "TDS ผู้ผลิตยาแนว (สูตรอัตราการใช้และค่าความหนาแน่นเปียก)" },
      ],
    },
  });
}

export function calcAdhesive(v: Values) {
  const bad = guard("adhesive", v);
  if (bad) return bad;
  const net = tileArea(v);
  const trowel = str(v, "trowel", "10");
  const rate = ADHESIVE_PER_TROWEL[trowel] ?? ADHESIVE_PER_TROWEL["10"];
  const bagSize = TILE.adhesiveBag.value;
  const waste = TILE.adhesiveWaste.value;
  const raw = net * rate.value;
  const kg = raw * (1 + waste / 100);
  const bags = ceil(kg / bagSize);
  const coverage = round(bagSize / rate.value, 1);
  const inLast = bags > 0 ? kg - (bags - 1) * bagSize : 0;

  return resultX({
    title: "ปูนกาว + เกรียงหวี",
    headline: `ปูนกาว ${fmt(bags)} ถุง (${bagSize} กก.)`,
    chart:
      bags > 0
        ? {
            kind: "packs",
            unitLabel: `ถุง ${bagSize} กก.`,
            count: bags,
            lastUsed: inLast / bagSize,
            note: `ถุงละปูได้ประมาณ ${fmt(coverage, 1)} ตร.ม. ที่เกรียงหวี ${trowel} มม.`,
          }
        : undefined,
    rows: [
      { label: "พื้นที่", value: `${fmt(net, 2)} ตร.ม.` },
      { label: "เกรียงหวี", value: `${trowel} มม.` },
      { label: "อัตราใช้", value: `${fmt(rate.value, 1)} กก./ตร.ม.` },
      { label: "ปูนกาว", value: `${fmt(kg, 1)} กก.`, emphasize: true },
      { label: `ถุง ${bagSize} กก.`, value: `${bags} ถุง`, emphasize: true },
      { label: "ถุงละปูได้", value: `${fmt(coverage, 1)} ตร.ม.` },
    ],
    tip: "แผ่นใหญ่หรือปูผนังใช้ปูนกาว C2 + เกรียงใหญ่ ปูนบางไปแผ่นหลุดภายหลัง",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "ปูนกาว = พื้นที่ × อัตราใช้ตามเบอร์เกรียงหวี แล้วเผื่อสูญเสีย",
      steps: [
        {
          label: "เนื้อปูนกาวตามเบอร์เกรียง",
          expr: "ปูนกาว = พื้นที่ × อัตราใช้",
          subst: `${fmt(net, 2)} × ${fmt(rate.value, 1)} = ${fmt(raw, 1)} กก.`,
          note: "เบอร์เกรียงยิ่งใหญ่ ร่องปูนยิ่งลึก กินปูนมากขึ้นตามตรง",
        },
        {
          label: `เผื่อสูญเสีย ${waste}%`,
          expr: `รวมเผื่อ = ปูนกาว × ${1 + waste / 100}`,
          subst: `${fmt(raw, 1)} × ${1 + waste / 100} = ${fmt(kg, 1)} กก.`,
        },
        {
          label: "แปลงเป็นถุง",
          expr: `ถุง = รวมเผื่อ ÷ ${bagSize} ปัดขึ้น`,
          subst: `${fmt(kg, 1)} ÷ ${bagSize} = ${bags} ถุง`,
        },
      ],
      constants: [rate, TILE.adhesiveWaste, TILE.adhesiveBag],
      assumptions: [
        "ปูนกาวด้านเดียว (ปูนบนพื้นหรือผนังเท่านั้น)",
        "พื้นผิวเรียบพอสมควร ไม่ต้องปรับระดับด้วยปูนกาว",
      ],
      caveats: [
        "ถ้าปูแบบปูนสองด้าน (back-buttering) ซึ่งจำเป็นสำหรับแผ่นใหญ่กว่า 60×60 ซม. ให้เพิ่มปูนกาวประมาณ 1.5 เท่า",
        "พื้นไม่เรียบต้องปรับระดับด้วยปูนปรับระดับก่อน ไม่ใช่ถมด้วยปูนกาว",
        DISCLAIMER_AB,
      ],
      refs: [
        { label: "ISO 13007-1 การจำแนกปูนกาวซีเมนต์ (C1/C2/S1/S2)" },
        { label: "TDS ผู้ผลิตปูนกาว (อัตราการใช้ต่อเบอร์เกรียงหวี)" },
      ],
    },
  });
}

/** คลิปต่อแผ่น: คลิปเรียงตามขอบทุก ~30 ซม. และคลิปหนึ่งตัวคร่อมสองแผ่น จึงนับครึ่งหนึ่งของคลิปรอบแผ่น */
export function clipsPerTile(tw: number, th: number): number {
  const perSide = (side: number) => Math.max(1, Math.round(side / TILE.clipSpacing.value));
  return perSide(tw) + perSide(th);
}

export function calcLeveling(v: Values) {
  const bad = guard("leveling", v);
  if (bad) return bad;
  const net = tileArea(v);
  const size = str(v, "size", "60");
  const t = TILES[size] ?? TILES["60"];
  const tiles = ceil(net / (t.w * t.h));
  const longSide = Math.max(t.w, t.h);
  const sizeText = `${fmt(t.w * 100)}×${fmt(t.h * 100)} ซม.`;
  const explainBase = {
    risk: "A" as const,
    updatedAt: "2026-11-25",
    constants: [TILE.clipSpacing, TILE.levelingMinSide, TILE.clipBag],
    assumptions: [
      "ปูเรียงลายตรง/สลับครึ่งทั่วไป ไม่ใช่ลายก้างปลาที่ต้องใช้คลิปเพิ่มตามมุมตัด",
      `คลิปเรียงตามขอบแผ่นทุกประมาณ ${fmt(TILE.clipSpacing.value * 100)} ซม. และคลิปหนึ่งตัวคร่อมรอยต่อของสองแผ่น`,
    ],
    caveats: ["ระบบปรับระดับแต่ละยี่ห้อคลิป/ลิ่มใช้คู่กันคนละแบบ อย่าผสมยี่ห้อ และดูระยะคลิปตามคู่มือยี่ห้อนั้น", DISCLAIMER_AB],
    refs: [{ label: "คู่มือระบบปรับระดับกระเบื้อง (Tile Leveling System)" }],
  };
  if (longSide < TILE.levelingMinSide.value - 1e-9) {
    return resultX({
      title: "ตัวปรับระดับ",
      headline: `แผ่น ${sizeText} ไม่ต้องใช้คลิปปรับระดับ`,
      rows: [
        { label: "ขนาดแผ่น", value: sizeText },
        { label: "คลิป + ลิ่ม", value: `ไม่ต้องซื้อ — ใช้กับแผ่นที่ด้านยาวตั้งแต่ ${fmt(TILE.levelingMinSide.value * 100)} ซม. ขึ้นไป`, emphasize: true },
      ],
      tip: "แผ่นเล็กปรับระดับด้วยมือกับไม้สามเหลี่ยมได้ ใช้กากบาทคุมร่องยาแนวแทน",
      explain: {
        ...explainBase,
        summary: `ระบบปรับระดับใช้กับแผ่นที่ด้านยาวตั้งแต่ ${fmt(TILE.levelingMinSide.value * 100)} ซม. ขึ้นไป แผ่นเล็กกว่านี้ไม่คิดคลิป`,
        steps: [{ label: "เช็กขนาดแผ่น", expr: "ด้านยาวแผ่น ≥ 60 ซม. จึงใช้คลิป", subst: `ด้านยาว ${fmt(longSide * 100)} ซม. → ไม่ใช้` }],
      },
    });
  }
  const per = clipsPerTile(t.w, t.h);
  const clips = tiles * per;
  const bagSize = TILE.clipBag.value;
  const bags = ceil(clips / bagSize);

  return resultX({
    title: "ตัวปรับระดับ",
    headline: `คลิปประมาณ ${fmt(clips)} ตัว (${fmt(bags)} ถุง)`,
    chart:
      bags > 0
        ? {
            kind: "packs",
            unitLabel: `ถุง ${bagSize} ตัว`,
            count: bags,
            lastUsed: (clips - (bags - 1) * bagSize) / bagSize,
            note: `แผ่นละ ${per} ตัว จาก ${fmt(tiles)} แผ่น`,
          }
        : undefined,
    rows: [
      { label: "แผ่นประมาณ", value: `${fmt(tiles)} แผ่น` },
      { label: "คลิป/แผ่น", value: `${per} ตัว (แผ่น ${sizeText})` },
      { label: "คลิปปรับระดับ (ใช้แล้วหักทิ้ง)", value: `${fmt(clips)} ตัว = ${fmt(bags)} ถุง (ถุง ${bagSize})`, emphasize: true },
      { label: "ลิ่ม (ใช้ซ้ำได้)", value: "ไม่ต้องซื้อเท่าคลิป เตรียมเท่าที่ปูได้ต่อวันแล้ววนใช้" },
    ],
    tip: "คลิปหักทิ้งทุกตัว ลิ่มเก็บใช้ซ้ำได้ งานจะเรียบและลูกค้าไม่มาเอาเรื่องขอบ",
    explain: {
      ...explainBase,
      summary: "จำนวนคลิป = จำนวนแผ่น × คลิปต่อแผ่น โดยคลิปต่อแผ่น = (คลิปตามด้านกว้าง + คลิปตามด้านยาว) เพราะคลิปหนึ่งตัวใช้ร่วมกันสองแผ่น",
      steps: [
        {
          label: "จำนวนแผ่นโดยประมาณ",
          expr: "แผ่น = พื้นที่ ÷ พื้นที่ต่อแผ่น",
          subst: `${fmt(net, 2)} ÷ ${fmt(t.w * t.h, 3)} = ${fmt(tiles)} แผ่น`,
        },
        {
          label: "คลิปต่อแผ่น",
          expr: `คลิปต่อด้าน = ด้าน ÷ ${TILE.clipSpacing.value} ม. (ปัด, อย่างน้อย 1) · ต่อแผ่น = (2 × ด้านกว้าง + 2 × ด้านยาว) ÷ 2`,
          subst: `แผ่น ${sizeText} → ${per} ตัว/แผ่น`,
          note: "ของเดิมนับคลิปรอบแผ่นเต็ม ๆ โดยไม่หารสอง จึงได้ 8 ตัว/แผ่นสำหรับ 60×60 ซึ่งมากเกินจริงเท่าตัว",
        },
        {
          label: "จำนวนคลิปรวม",
          expr: "คลิป = แผ่น × คลิป/แผ่น",
          subst: `${fmt(tiles)} × ${per} = ${fmt(clips)} ตัว → ${fmt(bags)} ถุง`,
        },
      ],
    },
  });
}

export function calcTrim(v: Values) {
  const bad = guardTool(tileTools, "trim", v);
  if (bad) return bad;
  const w = num(v, "w", 4);
  const l = num(v, "l", 5);
  const doors = num(v, "doors", 1);
  const doorW = TILE.doorWidth.value;
  const peri = Math.max(0, 2 * (w + l) - doors * doorW);
  const barLen = num(v, "barLen", TILE.skirtingBar.value);
  const bars = ceil(peri / barLen);
  const blades = peri > 20 ? 2 : 1;

  return resultX({
    title: "บัวเชิงผนัง + ใบตัด",
    headline: `บัวเชิงผนัง ${fmt(round(peri, 1), 1)} ม. = ${fmt(bars)} เส้น`,
    chart:
      bars > 0
        ? {
            kind: "packs",
            unitLabel: `เส้น ${fmtTrim(barLen, 2)} ม.`,
            count: bars,
            lastUsed: (peri - (bars - 1) * barLen) / barLen,
            note: "เผื่อเส้นพลาดจากการตัด 45° ที่มุมห้องอีก 1 เส้น",
          }
        : undefined,
    rows: [
      { label: "บัวเชิงผนัง", value: `${fmt(peri, 1)} ม.`, emphasize: true },
      { label: `บัวเชิงผนัง (เส้นละ ${fmtTrim(barLen, 2)} ม.)`, value: `${bars} เส้น`, emphasize: true },
      { label: "ใบตัดเพชร", value: `${blades} ใบ (เผื่อตัด 45°)` },
    ],
    tip: "ตัวเลขนี้คือบัวเชิงผนังรอบห้อง คิ้วมุมนอก/คิ้วจบขอบวัดตามความยาวมุมจริงแยกต่างหาก",
    explain: {
      risk: "A",
      updatedAt: "2026-11-25",
      summary: "บัวเชิงผนัง = เส้นรอบห้อง หักช่องประตู แล้วแปลงเป็นจำนวนเส้นตามความยาวที่ขาย",
      steps: [
        {
          label: "เส้นรอบห้องที่ต้องติดบัว",
          expr: `peri = 2×(กว้าง+ยาว) − ประตู×${doorW}`,
          subst: `2×(${fmt(w, 1)}+${fmt(l, 1)}) − ${fmt(doors)}×${doorW} = ${fmt(peri, 1)} ม.`,
        },
        {
          label: "แปลงเป็นจำนวนเส้น",
          expr: `เส้น = peri ÷ ${fmtTrim(barLen, 2)} ปัดขึ้น`,
          subst: `${fmt(peri, 1)} ÷ ${fmtTrim(barLen, 2)} = ${bars} เส้น`,
        },
      ],
      constants: [TILE.skirtingBar, TILE.doorWidth],
      assumptions: [
        `บัวยาว ${fmtTrim(barLen, 2)} ม./เส้น ตามที่กรอก (บัวกระเบื้องเป็นแผ่นสั้น ให้ใส่ความยาวต่อแผ่น)`,
        `หักความกว้างประตูเฉลี่ย ${doorW} ม. ต่อบาน (ไม่ติดบัวที่ช่องประตู)`,
      ],
      caveats: [
        "มุมภายในที่ตัด 45° เสียเศษมากกว่าเส้นตรง ควรเผื่อเส้นสำรองไว้เสมอ",
        "ยังไม่รวมคิ้วมุมนอก คิ้วจบขอบ และธรณีประตู ซึ่งต้องวัดตามจุดที่ใช้จริง",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวปฏิบัติงานติดตั้งบัวเชิงผนังและคิ้วปิดขอบกระเบื้อง" }],
    },
  });
}

/* ─────────── แบ่งแผ่น / หาศูนย์เริ่มปู ─────────── */

/** เศษริมที่แคบกว่านี้ (ม.) ถือว่าลงพอดี — ค่าความคลาดเคลื่อนของการคิด ไม่ใช่ค่าหน้างาน */
const CUT_TOL = 0.0005;

export type LayoutMode = "tile" | "joint" | "wall";

/**
 * วางแผ่นแนวเดียว: คืนจำนวนแผ่นเต็มและความกว้างเศษริมแต่ละชิ้น (ม.)
 * tile = กึ่งกลางแผ่นทับเส้นกลางห้อง · joint = ร่องยาแนวทับเส้นกลางห้อง · wall = เริ่มชนผนังด้านหนึ่ง
 * เศษริม = ที่เหลือหลังแผ่นเต็มแผ่นสุดท้ายหักร่องอีกหนึ่งร่อง (ไม่รวมระยะเว้นชิดผนัง)
 */
export function centreLayout(len: number, t: number, j: number, mode: LayoutMode): { full: number; cuts: number[] } {
  const mod = t + j;
  const piece = (r: number) => r - j;
  if (mode === "wall") {
    const n = Math.floor((len + j) / mod + 1e-9);
    if (n === 0) return { full: 0, cuts: [len] };
    const c = piece(len + j - n * mod);
    return { full: n, cuts: c > CUT_TOL ? [c] : [] };
  }
  const half = len / 2;
  if (mode === "tile") {
    const s = half - t / 2;
    // ห้องแคบกว่าแผ่น: แผ่นกลางต้องตัดเหลือเท่าห้อง
    if (s < -1e-9) return { full: 0, cuts: [len] };
    const n = Math.floor(s / mod + 1e-9);
    const c = piece(s - n * mod);
    return { full: 2 * n + 1, cuts: c > CUT_TOL ? [c, c] : [] };
  }
  const s = half + j / 2;
  const n = Math.floor(s / mod + 1e-9);
  const c = piece(s - n * mod);
  return { full: 2 * n, cuts: c > CUT_TOL ? [c, c] : [] };
}

const MODE_LABEL: Record<LayoutMode, string> = {
  tile: "กลางแผ่นทับเส้นกลางห้อง",
  joint: "ร่องยาแนวทับเส้นกลางห้อง",
  wall: "เริ่มชนผนังด้านหนึ่ง",
};

function planText(p: { full: number; cuts: number[] }): string {
  if (p.cuts.length === 0) return `เต็ม ${fmt(p.full)} แผ่น ลงพอดีไม่มีเศษ`;
  if (p.full === 0) return `ห้องแคบกว่าแผ่น ตัดแผ่นเดียวเหลือ ${fmt(p.cuts[0] * 100, 1)} ซม.`;
  const each = p.cuts.length === 2 ? `เศษริมข้างละ ${fmt(p.cuts[0] * 100, 1)} ซม.` : `เศษริมด้านเดียว ${fmt(p.cuts[0] * 100, 1)} ซม.`;
  return `เต็ม ${fmt(p.full)} แผ่น + ${each}`;
}

/** เศษเล็กสุดของแผน (ไม่มีเศษ = เท่าแผ่นเต็ม) */
function smallest(p: { cuts: number[] }, t: number): number {
  return p.cuts.length ? Math.min(...p.cuts) : t;
}

export function calcLayout(v: Values): CalcResult {
  const bad = guardTool(tileTools, "layout", v);
  if (bad) return bad;
  const len = num(v, "len", 3.2);
  const t = num(v, "tile", 60) / 100;
  const j = num(v, "joint", 2) / 1000;
  const gap = num(v, "gap", 0) / 1000;
  const mode = (str(v, "mode", "tile") === "joint" ? "joint" : "tile") as LayoutMode;
  const other: LayoutMode = mode === "tile" ? "joint" : "tile";
  const eff = len - 2 * gap;
  const minCut = t * TILE_LAYOUT.minCut.value;
  const plan = centreLayout(eff, t, j, mode);
  const alt = centreLayout(eff, t, j, other);
  const wall = centreLayout(eff, t, j, "wall");
  const small = smallest(plan, t) < minCut - 1e-9;
  const altBetter = smallest(alt, t) > smallest(plan, t) + 1e-9;
  const cutsTotal = plan.cuts.reduce((s, c) => s + c, 0);
  const tilesSpan = eff - cutsTotal;

  const parts = [
    ...(plan.cuts.length === 2 ? [{ label: "เศษริมซ้าย", value: plan.cuts[0], display: `${fmt(plan.cuts[0] * 100, 1)} ซม.`, tone: (small ? "bad" : "mute") as "bad" | "mute" }] : []),
    { label: `แผ่นเต็ม ${fmt(plan.full)} แผ่น + ร่อง`, value: Math.max(0, tilesSpan), display: `${fmt(Math.max(0, tilesSpan) * 100, 1)} ซม.`, tone: "accent" as const },
    ...(plan.cuts.length === 2 ? [{ label: "เศษริมขวา", value: plan.cuts[1], display: `${fmt(plan.cuts[1] * 100, 1)} ซม.`, tone: (small ? "bad" : "mute") as "bad" | "mute" }] : []),
  ];

  return resultX({
    title: "แบ่งแผ่น / หาศูนย์เริ่มปู",
    headline: small && altBetter ? `เศษริมเล็กไป — เปลี่ยนเป็น${MODE_LABEL[other]}` : `${MODE_LABEL[mode]}: ${planText(plan)}`,
    chart: parts.length > 1 && plan.full > 0 ? { kind: "stack", parts, totalLabel: "ระยะปูจริง", totalDisplay: `${fmt(eff * 100, 1)} ซม.` } : undefined,
    rows: [
      { label: "ระยะปูจริง", value: `${fmt(eff * 100, 1)} ซม.${gap > 0 ? ` (หักเว้นชิดผนังข้างละ ${fmt(gap * 1000)} มม.)` : ""}` },
      { label: "แผ่น + ร่อง", value: `${fmtTrim(t * 100, 1)} ซม. + ${fmtTrim(j * 1000, 1)} มม.` },
      { label: `เริ่ม${MODE_LABEL[mode]}`, value: planText(plan), emphasize: true },
      { label: `ถ้าเริ่ม${MODE_LABEL[other]}`, value: planText(alt), emphasize: small && altBetter },
      { label: `ถ้า${MODE_LABEL.wall}`, value: planText(wall) },
      { label: "เศษริมที่ยอมได้", value: `ไม่เล็กกว่า ${fmt(minCut * 100, 1)} ซม. (1/3 แผ่น)` },
    ],
    tip:
      small && altBetter
        ? `เศษ ${fmt(smallest(plan, t) * 100, 1)} ซม. เล็กกว่า 1/3 แผ่น ตัดยากและหลุดง่าย เปลี่ยนเป็น${MODE_LABEL[other]} เศษจะเหลือ ${fmt(smallest(alt, t) * 100, 1)} ซม.`
        : "ตีเส้นกลางห้องทั้งสองแนวก่อน วางแผ่นแห้งเทียบเศษริมทั้งสองฝั่งให้เท่ากันแล้วค่อยลงปูน",
    explain: {
      risk: "A",
      updatedAt: "2026-11-25",
      summary: "แบ่งครึ่งห้องจากเส้นกลาง แล้วนับว่าครึ่งหนึ่งลงแผ่นเต็มได้กี่แผ่น (แผ่น + ร่อง) ที่เหลือหักอีกหนึ่งร่องคือเศษริมแต่ละข้าง เศษสองฝั่งจึงเท่ากันเสมอ",
      steps: [
        { label: "ระยะปูจริง", expr: "ยาวห้อง − 2 × เว้นชิดผนัง", subst: `${fmtTrim(len, 3)} − 2 × ${fmtTrim(gap, 3)} = ${fmtTrim(eff, 3)} ม.` },
        {
          label: mode === "tile" ? "ครึ่งห้องหักครึ่งแผ่นกลาง" : "ครึ่งห้องบวกครึ่งร่องกลาง",
          expr: mode === "tile" ? "s = ระยะ ÷ 2 − แผ่น ÷ 2" : "s = ระยะ ÷ 2 + ร่อง ÷ 2",
          subst: `s = ${fmtTrim(eff / 2, 4)} ${mode === "tile" ? "−" : "+"} ${fmtTrim(mode === "tile" ? t / 2 : j / 2, 4)} = ${fmtTrim(mode === "tile" ? eff / 2 - t / 2 : eff / 2 + j / 2, 4)} ม.`,
        },
        {
          label: "แผ่นเต็มต่อข้าง",
          expr: "n = ปัดลง(s ÷ (แผ่น + ร่อง)) · เศษริม = s − n × (แผ่น + ร่อง) − ร่อง",
          subst: planText(plan),
        },
        { label: "เทียบกับเกณฑ์", expr: "เศษริม ≥ แผ่น × 1/3", subst: `${fmt(smallest(plan, t) * 100, 1)} ซม. ${small ? "<" : "≥"} ${fmt(minCut * 100, 1)} ซม.` },
      ],
      constants: [TILE_LAYOUT.minCut],
      assumptions: ["คิดทีละแนว (กว้างหรือยาวห้อง) ทำซ้ำอีกแนวด้วยขนาดอีกด้านของแผ่น", "ผนังขนานกัน ห้องได้ฉาก"],
      caveats: ["ผนังไม่ฉากหรือไม่ขนาน เศษสองฝั่งจะไม่เท่ากันจริง วัดสองจุดหัว-ท้ายก่อน", DISCLAIMER_AB],
      refs: [{ label: "แนวปฏิบัติช่างปูกระเบื้อง (ตั้งศูนย์ให้เศษริมสมมาตร)" }],
    },
  });
}

/* ─────────── ห้องน้ำทั้งห้อง (พื้น + ผนัง) ─────────── */

export function calcBathroom(v: Values): CalcResult {
  const bad = guardTool(tileTools, "bathroom", v);
  if (bad) return bad;
  const w = num(v, "w", 2);
  const l = num(v, "l", 2.5);
  const tileH = num(v, "tileH", 2.4);
  const doors = num(v, "doors", 1);
  const deductWall = num(v, "deductWall", 0);
  const doorW = WATERPROOF.doorW.value;
  const perimeter = 2 * (w + l);
  const doorCut = doors * doorW * Math.min(BATHROOM.doorH.value, tileH);
  const wallGross = perimeter * tileH;
  const wallNet = Math.max(0, wallGross - doorCut - deductWall);
  if (tileH > 0 && wallGross - doorCut - deductWall <= 1e-9) {
    return blockedResult({
      headline: `หักประตูและช่องเปิดแล้วไม่เหลือผนังให้ปู — ตรวจความสูงกระเบื้องผนังกับพื้นที่ที่หัก`,
      rows: [
        { label: "ผนังรอบห้อง", value: `${fmt(wallGross, 2)} ตร.ม.` },
        { label: "หักประตู + ช่องอื่น", value: `${fmt(doorCut + deductWall, 2)} ตร.ม.` },
      ],
      tip: "ลดพื้นที่ที่หัก หรือใส่ความสูงปูผนัง 0 ถ้าปูแค่พื้น",
    });
  }
  const floorA = w * l;
  const floorSize = str(v, "floorSize", "30");
  const wallSize = str(v, "wallSize", "3060");
  const ft = TILES[floorSize] ?? TILES["30"];
  const wt = TILES[wallSize] ?? TILES["3060"];
  const wallPerBox = Math.max(1, num(v, "wallPerBox", BATHROOM.wallPerBox.value));
  const wallWaste = num(v, "wallWaste", BATHROOM.wallWaste.value);
  const hasWall = tileH > 0 && wallNet > 0;

  const wp = bool(v, "wp", true) ? calcWpBathroom({ ...WP_BATH_DEFAULTS, w, l, doors }) : null;
  const floor = calcTileQty({ w, l, deduct: 0, size: floorSize, perBox: num(v, "floorPerBox", BATHROOM.floorPerBox.value), pattern: "straight" });

  // กระเบื้องผนัง: นับตามพื้นที่ + เผื่อเสีย (ผนังมีมุม ท่อ ก๊อก จึงเผื่อมากกว่าพื้น)
  const wallEach = wt.w * wt.h;
  const wallRaw = hasWall ? wallNet / wallEach : 0;
  const wallSheets = hasWall ? ceil(wallRaw * (1 + wallWaste / 100)) : 0;
  const wallBoxes = ceil(wallSheets / wallPerBox);

  // ปูนกาว: พื้นกับผนังใช้เกรียงคนละเบอร์
  const rateF = ADHESIVE_PER_TROWEL[str(v, "floorTrowel", "6")] ?? ADHESIVE_PER_TROWEL["6"];
  const rateW = ADHESIVE_PER_TROWEL[str(v, "wallTrowel", "8")] ?? ADHESIVE_PER_TROWEL["8"];
  const adhRaw = floorA * rateF.value + wallNet * rateW.value;
  const adhKg = adhRaw * (1 + TILE.adhesiveWaste.value / 100);
  const adhBags = ceil(adhKg / TILE.adhesiveBag.value);

  // ยาแนว: สูตรเดียวกับตัวคิดยาแนว แยกอัตราตามขนาดแผ่นพื้น/ผนัง
  const joint = num(v, "joint", 2);
  const thick = num(v, "thick", 8);
  const gF = groutKgPerM2(ft, joint, thick, GROUT_DENSITY.cement.value);
  const gW = groutKgPerM2(wt, joint, thick, GROUT_DENSITY.cement.value);
  const groutKg = (floorA * gF + wallNet * gW) * (1 + TILE.groutWaste.value / 100);
  const bagRef = GROUT_BAGS[str(v, "groutBag", "1")] ?? GROUT_BAGS["1"];
  const groutBags = ceil(groutKg / bagRef.value);

  // คิ้วจบขอบบนกระเบื้องผนัง (ถ้าปูไม่ชนฝ้า)
  const trimOn = hasWall && bool(v, "trimTop", true);
  const trimLen = trimOn ? Math.max(0, perimeter - doors * doorW) : 0;
  const trimBars = ceil(trimLen / BATHROOM.trimBar.value);

  // ความลาดพื้นเข้าท่อระบาย: จุดไกลสุดจากท่อ × ความลาด
  const drain = str(v, "drain", "center");
  const dist = drain === "corner" ? Math.hypot(w, l) : Math.hypot(w / 2, l / 2);
  const fallCm = dist * BATHROOM.floorSlope.value; // ม. × % = ซม.

  const sizeText = (t: { w: number; h: number }) => `${fmt(t.w * 100)}×${fmt(t.h * 100)}`;
  const floorRow = (label: string) => floor.rows.find((r) => r.label === label)?.value ?? "";

  const rest = resultX({
    title: "ห้องน้ำ: ผนัง ปูนกาว ยาแนว คิ้ว",
    headline: `กระเบื้องผนัง ${fmt(wallBoxes)} กล่อง`,
    rows: [],
    tip: "",
    explain: {
      risk: "A",
      updatedAt: "2026-11-25",
      summary: "ผนัง = รอบห้อง × สูงปูผนัง − ประตู − ช่องอื่น · ปูนกาว = พื้น × อัตราเกรียงพื้น + ผนัง × อัตราเกรียงผนัง · ยาแนวคิดตามขนาดแผ่นแยกพื้น/ผนัง",
      steps: [
        {
          label: "พื้นที่ผนังที่ปู",
          expr: `รอบห้อง × สูงปู − ประตู × ${doorW} × สูงประตู − ช่องอื่น`,
          subst: `${fmt(perimeter, 2)} × ${fmtTrim(tileH, 2)} − ${fmt(doors)} × ${doorW} × ${fmtTrim(Math.min(BATHROOM.doorH.value, tileH), 2)} − ${fmtTrim(deductWall, 2)} = ${fmt(wallNet, 2)} ตร.ม.`,
        },
        {
          label: "กระเบื้องผนัง",
          expr: "แผ่น = ผนัง ÷ พื้นที่แผ่น × (1 + เผื่อ) ปัดขึ้น · กล่อง = แผ่น ÷ แผ่นต่อกล่อง ปัดขึ้น",
          subst: `${fmt(wallNet, 2)} ÷ ${fmt(wallEach, 3)} × ${fmtTrim(1 + wallWaste / 100, 2)} = ${fmt(wallSheets)} แผ่น → ${fmt(wallBoxes)} กล่อง`,
        },
        {
          label: "ปูนกาว",
          expr: `(พื้น × อัตราเกรียงพื้น + ผนัง × อัตราเกรียงผนัง) × (1 + ${TILE.adhesiveWaste.value}%) ÷ ${TILE.adhesiveBag.value} กก.`,
          subst: `(${fmt(floorA, 2)} × ${fmtTrim(rateF.value, 1)} + ${fmt(wallNet, 2)} × ${fmtTrim(rateW.value, 1)}) × ${fmtTrim(1 + TILE.adhesiveWaste.value / 100, 2)} = ${fmt(adhKg, 1)} กก. → ${fmt(adhBags)} ถุง`,
        },
        {
          label: "ยาแนว",
          expr: `(พื้น × อัตราแผ่นพื้น + ผนัง × อัตราแผ่นผนัง) × (1 + ${TILE.groutWaste.value}%)`,
          subst: `(${fmt(floorA, 2)} × ${fmtTrim(gF, 3)} + ${fmt(wallNet, 2)} × ${fmtTrim(gW, 3)}) × ${fmtTrim(1 + TILE.groutWaste.value / 100, 2)} = ${fmt(groutKg, 2)} กก. → ${fmt(groutBags)} ถุง`,
          note: "อัตราต่อ ตร.ม. = (L + W) ÷ (L × W) × ลึก × กว้างร่อง × ความหนาแน่น",
        },
        ...(trimOn
          ? [{ label: "คิ้วจบขอบบน", expr: `(รอบห้อง − ประตู × ${doorW}) ÷ ${BATHROOM.trimBar.value} ม./เส้น ปัดขึ้น`, subst: `${fmt(trimLen, 2)} ÷ ${BATHROOM.trimBar.value} = ${fmt(trimBars)} เส้น` }]
          : []),
        {
          label: "ต่างระดับพื้นเข้าท่อ",
          expr: `ระยะไกลสุดจากท่อ × ${BATHROOM.floorSlope.value}%`,
          subst: `${fmt(dist, 2)} ม. × ${BATHROOM.floorSlope.value}% = ${fmt(fallCm, 1)} ซม.`,
        },
      ],
      constants: [rateF, rateW, TILE.adhesiveBag, TILE.adhesiveWaste, GROUT_DENSITY.cement, TILE.groutWaste, bagRef, BATHROOM.wallWaste, BATHROOM.doorH, WATERPROOF.doorW, BATHROOM.trimBar, BATHROOM.floorSlope],
      assumptions: [
        "ห้องสี่เหลี่ยม ผนังปูสูงเท่ากันทุกด้าน ประตูสูงไม่เกินแนวปูผนัง",
        "ร่องยาแนวพื้นและผนังกว้าง-ลึกเท่ากัน ใช้ยาแนวซีเมนต์",
        "จำนวนแผ่นต่อกล่องเป็นค่าตั้งต้น ดูข้างกล่องจริงแล้วแก้",
      ],
      caveats: ["ผนังที่มีช่องท่อ ชั้นวาง หรือช่องกระจกเยอะ เผื่อเสียผนังเพิ่ม", DISCLAIMER_AB],
      refs: [{ label: "TDS ปูนกาว/ยาแนว (อัตราใช้ต่อเบอร์เกรียง สูตรยาแนว ISO 13007)" }, { label: "แนวปฏิบัติงานห้องน้ำ (ความลาดพื้นเข้าท่อระบาย)" }],
    },
  });

  const wpPick = (prefix: string) => (wp ? wp.rows.filter((r) => r.emphasize).map((r) => ({ ...r, label: `${prefix}${r.label}` })) : []);

  return jobFromParts({
    title: "ห้องน้ำทั้งห้อง (พื้น + ผนัง)",
    headline: `พื้น ${floorRow("จำนวนกล่อง")}${hasWall ? ` · ผนัง ${fmt(wallBoxes)} กล่อง` : ""} · ปูนกาว ${fmt(adhBags)} ถุง`,
    rows: [
      { label: "พื้นที่พื้น / ผนังที่ปู", value: `${fmt(floorA, 2)} / ${fmt(wallNet, 2)} ตร.ม.` },
      ...(wp ? wpPick("1. กันซึม: ") : [{ label: "1. กันซึม", value: "ไม่คิด (ติ๊กกันซึมถ้าต้องการ)" }]),
      { label: `2. ปูนกาว (ถุง ${TILE.adhesiveBag.value} กก.)`, value: `${fmt(adhBags)} ถุง (${fmt(adhKg, 1)} กก.)`, emphasize: true },
      { label: `3. กระเบื้องพื้น ${sizeText(ft)}`, value: `${floorRow("จำนวนแผ่น")} = ${floorRow("จำนวนกล่อง")}`, emphasize: true },
      hasWall
        ? { label: `4. กระเบื้องผนัง ${sizeText(wt)}`, value: `${fmt(wallSheets)} แผ่น = ${fmt(wallBoxes)} กล่อง (เผื่อ ${fmt(wallWaste)}%)`, emphasize: true }
        : { label: "4. กระเบื้องผนัง", value: "ไม่ปูผนัง" },
      { label: `5. ยาแนว (ถุง ${fmt(bagRef.value)} กก.)`, value: `${fmt(groutBags)} ถุง (${fmt(groutKg, 2)} กก.)`, emphasize: true },
      ...(trimOn ? [{ label: `6. คิ้วจบขอบบน (เส้นละ ${BATHROOM.trimBar.value} ม.)`, value: `${fmt(trimLen, 2)} ม. = ${fmt(trimBars)} เส้น`, emphasize: true }] : []),
      { label: "ความลาดพื้นเข้าท่อ", value: `${BATHROOM.floorSlope.value}% · จุดไกลสุด ${fmt(dist, 2)} ม. สูงกว่าปากท่อ ${fmt(fallCm, 1)} ซม.` },
    ],
    tip: "เทปรับระดับให้ลาดเข้าท่อก่อนทากันซึม อย่าไปถมความลาดด้วยปูนกาว ขังน้ำทดสอบก่อนปูทุกครั้ง",
    parts: [...(wp ? [wp] : []), floor, rest],
    chart: floor.chart,
  });
}

const sizeOptions = [
  { value: "20", label: "20×20 ซม." },
  { value: "30", label: "30×30 ซม." },
  { value: "3060", label: "30×60 ซม." },
  { value: "40", label: "40×40 ซม." },
  { value: "60", label: "60×60 ซม." },
  { value: "60120", label: "60×120 ซม." },
  { value: "80", label: "80×80 ซม." },
];

const groutOptions = [
  { value: "cement", label: "ซีเมนต์ทั่วไป (1.6 กก./ล.)" },
  { value: "ultra", label: "เกรดสูง ultracolor (1.8)" },
  { value: "epoxy", label: "อีพ็อกซี่ (1.45)" },
];

const groutBagField = {
  type: "select" as const,
  key: "groutBag",
  label: "ขนาดถุงยาแนว",
  default: "5",
  options: [
    { value: "5", label: "ถุง 5 กก." },
    { value: "1", label: "ถุง 1 กก." },
  ],
};

const trowelOptions = [
  { value: "6", label: "6 มม. แผ่นเล็ก" },
  { value: "8", label: "8 มม." },
  { value: "10", label: "10 มม. ทั่วไป" },
  { value: "12", label: "12 มม. แผ่นใหญ่" },
];

const barLenField = {
  type: "number" as const,
  key: "barLen",
  label: "ยาวบัว/เส้น",
  unit: "ม.",
  default: TILE.skirtingBar.value,
  min: 0.3,
  max: 4,
  step: 0.05,
};

const perBoxField = {
  type: "number" as const,
  key: "perBox",
  label: "แผ่น/กล่อง (ดูข้างกล่อง)",
  unit: "แผ่น",
  default: 4,
  min: 1,
  max: 100,
};

const roomFields = [
  { type: "number" as const, key: "w", label: "กว้างห้อง", unit: "ม.", default: 4, min: 0.5, max: 100, step: 0.1 },
  { type: "number" as const, key: "l", label: "ยาวห้อง", unit: "ม.", default: 5, min: 0.5, max: 100, step: 0.1 },
  { type: "number" as const, key: "deduct", label: "หักที่ไม่ปู", unit: "ตร.ม.", default: 0, min: 0, max: 10000, step: 0.1 },
];

export const tileTools: ToolDef[] = [
  {
    id: "qty",
    name: "จำนวนกระเบื้อง",
    blurb: "แผ่นและกล่องตามลายปู",
    fields: [
      ...roomFields,
      { type: "select", key: "size", label: "ขนาดกระเบื้อง", default: "60", options: sizeOptions },
      perBoxField,
      {
        type: "select",
        key: "pattern",
        label: "ลายปู",
        default: "straight",
        options: [
          { value: "straight", label: "ลายตรง (+5%)" },
          { value: "brick", label: "สลับครึ่ง (+8%)" },
          { value: "diag", label: "ทะแยง (+10%)" },
          { value: "herring", label: "ก้างปลา (+15%)" },
          { value: "custom", label: "กำหนดเผื่อเสียเอง" },
        ],
      },
      { type: "number", key: "waste", label: "เผื่อเสียเอง (ถ้าเลือกกำหนดเอง)", unit: "%", default: 10, min: 0, max: 30, when: { key: "pattern", is: "custom" } },
    ],
    calc: calcTileQty,
  },
  {
    id: "grout",
    name: "ปริมาณยาแนว",
    blurb: "กิโลยาแนวตามร่อง",
    fields: [
      ...roomFields,
      { type: "select", key: "size", label: "ขนาดกระเบื้อง", default: "60", options: sizeOptions },
      { type: "number", key: "joint", label: "ร่องยาแนว", unit: "มม.", default: 2, min: 1, max: 20, step: 0.5 },
      { type: "number", key: "thick", label: "หนาแผ่น", unit: "มม.", default: 9, min: 5, max: 30 },
      { type: "select", key: "grout", label: "ชนิดยาแนว", default: "cement", options: groutOptions },
      groutBagField,
    ],
    calc: calcGrout,
  },
  {
    id: "adhesive",
    name: "ปูนกาว + เกรียงหวี",
    blurb: "ถุงปูนกาวตามเกรียง",
    fields: [
      ...roomFields,
      {
        type: "select",
        key: "trowel",
        label: "เกรียงหวี",
        default: "10",
        options: [
          { value: "6", label: "6 มม. แผ่นเล็ก" },
          { value: "8", label: "8 มม." },
          { value: "10", label: "10 มม. ทั่วไป" },
          { value: "12", label: "12 มม. แผ่นใหญ่" },
        ],
      },
    ],
    calc: calcAdhesive,
  },
  {
    id: "leveling",
    name: "ตัวปรับระดับ",
    blurb: "คลิปและลิ่มแผ่นใหญ่ 60 ซม. ขึ้นไป",
    fields: [...roomFields, { type: "select", key: "size", label: "ขนาดกระเบื้อง", default: "60", options: sizeOptions }],
    calc: calcLeveling,
  },
  {
    id: "trim",
    name: "บัวเชิงผนัง + ใบตัด",
    blurb: "บัวรอบห้องกี่เส้น และใบเพชร",
    keywords: ["คิ้ว", "บัว", "บัวพื้น", "เชิงผนัง"],
    fields: [
      { type: "number", key: "w", label: "กว้างห้อง", unit: "ม.", default: 4, min: 0.5, max: 100, step: 0.1 },
      { type: "number", key: "l", label: "ยาวห้อง", unit: "ม.", default: 5, min: 0.5, max: 100, step: 0.1 },
      { type: "number", key: "doors", label: "จำนวนประตู", unit: "บาน", default: 1, min: 0, max: 10 },
      barLenField,
    ],
    calc: calcTrim,
  },
  {
    id: "bathroom",
    name: "ห้องน้ำทั้งห้อง (พื้น + ผนัง)",
    blurb: "กันซึม ปูนกาว กระเบื้อง ยาแนว คิ้ว",
    keywords: ["ห้องน้ำ", "ปูห้องน้ำ", "กระเบื้องผนัง", "ปูผนัง"],
    fields: [
      { type: "number", key: "w", label: "กว้างห้อง", unit: "ม.", default: 2, min: 0.8, max: 10, step: 0.05 },
      { type: "number", key: "l", label: "ยาวห้อง", unit: "ม.", default: 2.5, min: 0.8, max: 10, step: 0.05 },
      { type: "number", key: "tileH", label: "ปูผนังสูง (0 = ปูแค่พื้น)", unit: "ม.", default: 2.4, min: 0, max: 4, step: 0.05 },
      { type: "number", key: "doors", label: "ประตู", unit: "บาน", default: 1, min: 0, max: 2 },
      { type: "number", key: "deductWall", label: "หักช่องอื่นบนผนัง (หน้าต่าง ช่องเปิด)", unit: "ตร.ม.", default: 0, min: 0, max: 10, step: 0.1 },
      { type: "select", key: "floorSize", label: "กระเบื้องพื้น", default: "30", options: sizeOptions },
      { type: "number", key: "floorPerBox", label: "พื้น: แผ่น/กล่อง (ดูข้างกล่อง)", unit: "แผ่น", default: BATHROOM.floorPerBox.value, min: 1, max: 100 },
      { type: "select", key: "wallSize", label: "กระเบื้องผนัง", default: "3060", options: sizeOptions },
      { type: "number", key: "wallPerBox", label: "ผนัง: แผ่น/กล่อง (ดูข้างกล่อง)", unit: "แผ่น", default: BATHROOM.wallPerBox.value, min: 1, max: 100 },
      { type: "number", key: "wallWaste", label: "เผื่อเสียผนัง", unit: "%", default: BATHROOM.wallWaste.value, min: 0, max: 30 },
      { type: "select", key: "floorTrowel", label: "เกรียงหวีพื้น", default: "6", options: trowelOptions },
      { type: "select", key: "wallTrowel", label: "เกรียงหวีผนัง", default: "8", options: trowelOptions },
      { type: "number", key: "joint", label: "ร่องยาแนว", unit: "มม.", default: 2, min: 1, max: 10, step: 0.5 },
      { type: "number", key: "thick", label: "หนาแผ่น", unit: "มม.", default: 8, min: 5, max: 20 },
      { ...groutBagField, default: "1" },
      { type: "bool", key: "wp", label: "คิดกันซึมด้วย", default: true },
      { type: "bool", key: "trimTop", label: "คิ้วจบขอบบนกระเบื้องผนัง", default: true },
      {
        type: "select",
        key: "drain",
        label: "ท่อระบายพื้นอยู่",
        default: "center",
        options: [
          { value: "center", label: "กลางห้อง" },
          { value: "corner", label: "มุมห้อง" },
        ],
      },
    ],
    calc: calcBathroom,
  },
  {
    id: "layout",
    name: "แบ่งแผ่น / หาศูนย์เริ่มปู",
    blurb: "เศษริมสองฝั่ง เตือนเศษเล็ก",
    keywords: ["หาศูนย์", "ตั้งศูนย์", "เศษริม", "แบ่งแผ่น"],
    fields: [
      { type: "number", key: "len", label: "ยาวห้องแนวที่จะแบ่ง", unit: "ม.", default: 3.2, min: 0.3, max: 100, step: 0.01 },
      { type: "number", key: "tile", label: "ขนาดแผ่นแนวนี้", unit: "ซม.", default: 60, min: 5, max: 120, step: 0.5 },
      { type: "number", key: "joint", label: "ร่องยาแนว", unit: "มม.", default: 2, min: 0, max: 10, step: 0.5 },
      { type: "number", key: "gap", label: "เว้นชิดผนังข้างละ", unit: "มม.", default: 0, min: 0, max: 20 },
      {
        type: "select",
        key: "mode",
        label: "เริ่มปูจาก",
        default: "tile",
        options: [
          { value: "tile", label: "กลางแผ่นทับเส้นกลางห้อง" },
          { value: "joint", label: "ร่องยาแนวทับเส้นกลางห้อง" },
        ],
      },
    ],
    calc: calcLayout,
  },
];

export const tileJob: JobDef = {
  name: "คิดทั้งงานปูกระเบื้อง",
  blurb: "ห้องครั้งเดียว ได้แผ่น ยาแนว ปูนกาว บัว",
  fields: [
    ...roomFields,
    { type: "select", key: "size", label: "ขนาดกระเบื้อง", default: "60", options: sizeOptions },
    perBoxField,
    {
      type: "select",
      key: "pattern",
      label: "ลายปู",
      default: "straight",
      options: [
        { value: "straight", label: "ลายตรง" },
        { value: "brick", label: "สลับครึ่ง" },
        { value: "diag", label: "ทะแยง" },
        { value: "herring", label: "ก้างปลา" },
      ],
    },
    { type: "number", key: "joint", label: "ร่องยาแนว", unit: "มม.", default: 2, min: 1, max: 20, step: 0.5 },
    { type: "number", key: "thick", label: "หนาแผ่น", unit: "มม.", default: 9, min: 5, max: 30 },
    { type: "select", key: "grout", label: "ชนิดยาแนว", default: "cement", options: groutOptions },
    groutBagField,
    {
      type: "select",
      key: "trowel",
      label: "เกรียงหวี",
      default: "10",
      options: [
        { value: "6", label: "6 มม." },
        { value: "8", label: "8 มม." },
        { value: "10", label: "10 มม." },
        { value: "12", label: "12 มม." },
      ],
    },
    { type: "number", key: "doors", label: "จำนวนประตู", unit: "บาน", default: 1, min: 0, max: 10 },
    barLenField,
  ],
  calc: (input) => {
    const bad = guardInputs(tileJob.fields, input);
    if (bad) return bad;
    const v = withDefaults(tileJob.fields, input);
    const qty = calcTileQty(v);
    const grout = calcGrout(v);
    const adh = calcAdhesive(v);
    const lev = calcLeveling(v);
    const trim = calcTrim(v);
    const tile = TILES[str(v, "size", "60")] ?? TILES["60"];
    const usesClips = Math.max(tile.w, tile.h) >= TILE.levelingMinSide.value - 1e-9;
    return jobFromParts({
      title: "งานปูกระเบื้องทั้งห้อง",
      headline: `ของปูทั้งห้อง · ${qty.rows.find((r) => r.label === "จำนวนกล่อง")?.value}`,
      rows: [
        ...qty.rows.filter((r) => r.emphasize || r.label === "เหลือเก็บซ่อม" || r.label === "เศษริมที่ต้องตัด"),
        ...grout.rows.filter((r) => r.emphasize),
        ...adh.rows.filter((r) => r.emphasize).map((r) => (r.label.startsWith("ถุง") ? { ...r, label: `ปูนกาว (${r.label})` } : r)),
        // คลิปปรับระดับใส่ในใบสั่งของเฉพาะแผ่นที่ด้านยาว 60 ซม. ขึ้นไป แผ่นเล็กไม่ใช้
        ...(usesClips ? lev.rows.filter((r) => r.emphasize || r.label.startsWith("ลิ่ม")) : []),
        ...trim.rows.filter((r) => r.emphasize || r.label.includes("ใบ")),
      ],
      tip: "รายการนี้ส่งไลน์ลูกค้าได้เลย ยังไม่รวมค่าปู เก็บ Lot กระเบื้องไว้ด้วย",
      parts: [qty, grout, adh, lev, trim],
      chart: qty.chart,
    });
  },
};
