import type { JobDef, ToolDef, Values } from "../types";
import { ceil, fmt, jobFromParts, num, resultX, round, str } from "../math";
import { ADHESIVE_PER_TROWEL, DISCLAIMER_AB, GROUT_DENSITY, TILE, TILE_WASTE } from "../constants";

const TILES: Record<string, { w: number; h: number }> = {
  "20": { w: 0.2, h: 0.2 },
  "30": { w: 0.3, h: 0.3 },
  "3060": { w: 0.3, h: 0.6 },
  "40": { w: 0.4, h: 0.4 },
  "60": { w: 0.6, h: 0.6 },
  "60120": { w: 0.6, h: 1.2 },
  "80": { w: 0.8, h: 0.8 },
};

export function tileArea(v: Values) {
  const w = num(v, "w", 4);
  const l = num(v, "l", 5);
  const deduct = num(v, "deduct", 0);
  return Math.max(0, w * l - deduct);
}

export function calcTileQty(v: Values) {
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
  const sheets = ceil(withWaste);
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
      { label: "จำนวนแผ่น", value: `${fmt(sheets)} แผ่น`, emphasize: true },
      { label: "จำนวนกล่อง", value: `${fmt(boxes)} กล่อง`, emphasize: true },
      { label: "เหลือเก็บซ่อม", value: `${fmt(Math.max(0, leftover))} แผ่น` },
    ],
    tip: "เก็บกล่องสุดท้ายกับรหัส Lot ไว้ สั่ง Lot เดิมทีหลังสีเพี้ยนบ่อย",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "จำนวนแผ่น = พื้นที่สุทธิ ÷ พื้นที่ต่อแผ่น × (1 + เผื่อเสีย) แล้วปัดขึ้นเป็นกล่อง",
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

export function calcGrout(v: Values) {
  const net = tileArea(v);
  const size = str(v, "size", "60");
  const joint = num(v, "joint", 2);
  const thick = num(v, "thick", 9);
  const kind = str(v, "grout", "cement");
  const density = GROUT_DENSITY[kind as keyof typeof GROUT_DENSITY] ?? GROUT_DENSITY.cement;
  const t = TILES[size] ?? TILES["60"];
  const L = t.w * 1000;
  const W = t.h * 1000;
  const kgM2 = ((L + W) / (L * W)) * thick * joint * density.value;
  const waste = 1 + TILE.groutWaste.value / 100;
  const kg = kgM2 * net * waste;
  const bags = ceil(kg / TILE.groutBag.value);
  const inLastBag = bags > 0 ? kg - (bags - 1) * TILE.groutBag.value : 0;

  return resultX({
    title: "ปริมาณยาแนว",
    headline: `ยาแนวประมาณ ${fmt(kg, 1)} กก.`,
    chart:
      bags > 0
        ? {
            kind: "packs",
            unitLabel: `ถุง ${TILE.groutBag.value} กก.`,
            count: bags,
            lastUsed: inLastBag / TILE.groutBag.value,
            note: `ถุงสุดท้ายใช้ประมาณ ${fmt(inLastBag, 1)} จาก ${TILE.groutBag.value} กก.`,
          }
        : undefined,
    rows: [
      { label: "พื้นที่", value: `${fmt(net, 2)} ตร.ม.` },
      { label: "ร่องยาแนว", value: `${fmt(joint)} มม. × ลึก ${fmt(thick)} มม.` },
      { label: "ชนิดยาแนว", value: `${density.label} (${density.value} กก./ล.)` },
      { label: "อัตราใช้", value: `${fmt(kgM2, 2)} กก./ตร.ม.` },
      { label: "ยาแนว", value: `${fmt(kg, 1)} กก.`, emphasize: true },
      { label: `ถุง ${TILE.groutBag.value} กก.`, value: `${bags} ถุง`, emphasize: true },
    ],
    tip: "ร่องกว้างหรือแผ่นเล็กกินยาแนวเยอะขึ้นเป็นเท่าตัว เผื่อไว้ดีกว่าขาดกลางงาน",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "อัตราใช้ (กก./ตร.ม.) = (L + W) ÷ (L × W) × ลึกร่อง × กว้างร่อง × ความหนาแน่นยาแนว",
      steps: [
        {
          label: "ความยาวร่องใน 1 ตร.ม.",
          expr: "(L + W) ÷ (L × W)  โดย L, W เป็น มม.",
          subst: `(${fmt(L)} + ${fmt(W)}) ÷ (${fmt(L)} × ${fmt(W)}) = ${fmt((L + W) / (L * W), 5)} ม./ตร.มม.`,
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
          expr: "อัตราใช้ = ความยาวร่อง × หน้าตัดร่อง × ความหนาแน่น",
          subst: `= ${fmt(kgM2, 2)} กก./ตร.ม.`,
        },
        {
          label: "คิดทั้งพื้นที่ + เผื่อ",
          expr: `น้ำหนักรวม = อัตราใช้ × A × (1 + ${TILE.groutWaste.value}%)`,
          subst: `${fmt(kgM2, 2)} × ${fmt(net, 2)} × ${fmt(waste, 2)} = ${fmt(kg, 1)} กก.`,
        },
        {
          label: "แปลงเป็นถุง",
          expr: `ถุง = น้ำหนักรวม ÷ ${TILE.groutBag.value} กก. ปัดขึ้น`,
          subst: `${fmt(kg, 1)} ÷ ${TILE.groutBag.value} = ${bags} ถุง`,
        },
      ],
      constants: [density, TILE.groutWaste, TILE.groutBag],
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

export function calcLeveling(v: Values) {
  const net = tileArea(v);
  const size = str(v, "size", "60");
  const t = TILES[size] ?? TILES["60"];
  const tiles = ceil(net / (t.w * t.h));
  const per = t.w >= 0.6 ? 8 : 4;
  const clips = tiles * per;
  const bagSize = 100;
  const bags = ceil(clips / bagSize);

  return resultX({
    title: "ตัวปรับระดับ",
    headline: `คลิปประมาณ ${fmt(clips)} ตัว`,
    chart:
      bags > 0
        ? {
            kind: "packs",
            unitLabel: `ถุง ${bagSize} ชุด`,
            count: bags,
            lastUsed: (clips - (bags - 1) * bagSize) / bagSize,
            note: `แผ่นละ ${per} ตัว จาก ${fmt(tiles)} แผ่น`,
          }
        : undefined,
    rows: [
      { label: "แผ่นประมาณ", value: `${fmt(tiles)} แผ่น` },
      { label: "คลิป/แผ่น", value: `${per} ตัว` },
      { label: "คลิป + ลิ่ม", value: `${fmt(clips)} ชุด`, emphasize: true },
    ],
    tip: "แผ่น 60 ขึ้นไปใช้ระบบปรับระดับ งานจะเรียบและลูกค้าไม่มาเอาเรื่องขอบ",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "จำนวนคลิป = จำนวนแผ่น × จำนวนคลิปต่อแผ่น (แผ่นใหญ่ตั้งแต่ 60 ซม. ขึ้นไปใช้ 8 ตัว/แผ่น แผ่นเล็กใช้ 4 ตัว/แผ่น)",
      steps: [
        {
          label: "จำนวนแผ่นโดยประมาณ",
          expr: "แผ่น = พื้นที่ ÷ พื้นที่ต่อแผ่น",
          subst: `${fmt(net, 2)} ÷ ${fmt(t.w * t.h, 3)} = ${fmt(tiles)} แผ่น`,
        },
        {
          label: "จำนวนคลิปรวม",
          expr: "คลิป = แผ่น × คลิป/แผ่น",
          subst: `${fmt(tiles)} × ${per} = ${fmt(clips)} ชุด`,
          note: "แผ่นด้านยาวตั้งแต่ 60 ซม. ขึ้นไปต้องใช้คลิปที่ขอบมากกว่าแผ่นเล็ก เพื่อคุมระดับตลอดแนว",
        },
      ],
      assumptions: ["ปูเรียงลายตรง/สลับครึ่งทั่วไป ไม่ใช่ลายก้างปลาที่ต้องใช้คลิปเพิ่มตามมุมตัด"],
      caveats: ["ระบบปรับระดับแต่ละยี่ห้อคลิป/ลิ่มใช้คู่กันคนละแบบ อย่าผสมยี่ห้อ", DISCLAIMER_AB],
      refs: [{ label: "คู่มือระบบปรับระดับกระเบื้อง (Tile Leveling System)" }],
    },
  });
}

export function calcTrim(v: Values) {
  const w = num(v, "w", 4);
  const l = num(v, "l", 5);
  const doors = num(v, "doors", 1);
  const peri = Math.max(0, 2 * (w + l) - doors * 0.9);
  const barLen = 2.5;
  const bars = ceil(peri / barLen);
  const blades = peri > 20 ? 2 : 1;

  return resultX({
    title: "คิ้ว + ใบตัด",
    headline: `คิ้วประมาณ ${fmt(round(peri, 1), 1)} ม.`,
    chart:
      bars > 0
        ? {
            kind: "packs",
            unitLabel: `เส้น ${barLen} ม.`,
            count: bars,
            lastUsed: (peri - (bars - 1) * barLen) / barLen,
            note: "เผื่อเส้นพลาดจากการตัด 45° ที่มุมห้องอีก 1 เส้น",
          }
        : undefined,
    rows: [
      { label: "เส้นคิ้ว", value: `${fmt(peri, 1)} ม.`, emphasize: true },
      { label: "เส้น 2.5 ม.", value: `${bars} เส้น` },
      { label: "ใบตัดเพชร", value: `${blades} ใบ (เผื่อตัด 45°)` },
    ],
    tip: "มุมห้องตัด 45 เผื่อเส้นพลาดอีก 1 เส้น ดีกว่าวิ่งซื้อกลางวัน",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "เส้นคิ้ว = เส้นรอบห้อง หักช่องประตู แล้วแปลงเป็นจำนวนเส้นมาตรฐาน 2.5 ม.",
      steps: [
        {
          label: "เส้นรอบห้องที่ต้องติดคิ้ว",
          expr: "peri = 2×(กว้าง+ยาว) − ประตู×0.9",
          subst: `2×(${fmt(w, 1)}+${fmt(l, 1)}) − ${fmt(doors)}×0.9 = ${fmt(peri, 1)} ม.`,
        },
        {
          label: "แปลงเป็นจำนวนเส้น",
          expr: `เส้น = peri ÷ ${barLen} ปัดขึ้น`,
          subst: `${fmt(peri, 1)} ÷ ${barLen} = ${bars} เส้น`,
        },
      ],
      assumptions: ["คิ้วยาวมาตรฐาน 2.5 ม./เส้น", "หักความกว้างประตูเฉลี่ย 0.9 ม. ต่อบาน (ไม่ติดคิ้วที่ช่องประตู)"],
      caveats: ["มุมภายในที่ตัด 45° เสียเศษมากกว่าคิ้วเส้นตรง ควรเผื่อเส้นสำรองไว้เสมอ", DISCLAIMER_AB],
      refs: [{ label: "แนวปฏิบัติงานติดตั้งคิ้วปิดขอบกระเบื้อง" }],
    },
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

const roomFields = [
  { type: "number" as const, key: "w", label: "กว้างห้อง", unit: "ม.", default: 4, min: 0.5, step: 0.1 },
  { type: "number" as const, key: "l", label: "ยาวห้อง", unit: "ม.", default: 5, min: 0.5, step: 0.1 },
  { type: "number" as const, key: "deduct", label: "หักที่ไม่ปู", unit: "ตร.ม.", default: 0, min: 0, step: 0.1 },
];

export const tileTools: ToolDef[] = [
  {
    id: "qty",
    name: "จำนวนกระเบื้อง",
    blurb: "แผ่นและกล่องตามลายปู",
    fields: [
      ...roomFields,
      { type: "select", key: "size", label: "ขนาดกระเบื้อง", default: "60", options: sizeOptions },
      { type: "number", key: "perBox", label: "แผ่น/กล่อง", unit: "แผ่น", default: 4, min: 1 },
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
      { type: "number", key: "waste", label: "เผื่อเสียเอง (ถ้าเลือกกำหนดเอง)", unit: "%", default: 10, min: 0 },
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
      { type: "number", key: "joint", label: "ร่องยาแนว", unit: "มม.", default: 2, min: 1, step: 0.5 },
      { type: "number", key: "thick", label: "หนาแผ่น", unit: "มม.", default: 9, min: 5 },
      { type: "select", key: "grout", label: "ชนิดยาแนว", default: "cement", options: groutOptions },
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
    blurb: "คลิปและลิ่มแผ่นใหญ่",
    fields: [...roomFields, { type: "select", key: "size", label: "ขนาดกระเบื้อง", default: "60", options: sizeOptions }],
    calc: calcLeveling,
  },
  {
    id: "trim",
    name: "คิ้ว + ใบตัด",
    blurb: "เส้นคิ้วและใบเพชร",
    fields: [
      { type: "number", key: "w", label: "กว้างห้อง", unit: "ม.", default: 4, min: 0.5, step: 0.1 },
      { type: "number", key: "l", label: "ยาวห้อง", unit: "ม.", default: 5, min: 0.5, step: 0.1 },
      { type: "number", key: "doors", label: "จำนวนประตู", unit: "บาน", default: 1, min: 0 },
    ],
    calc: calcTrim,
  },
];

export const tileJob: JobDef = {
  name: "คิดทั้งงานปูกระเบื้อง",
  blurb: "ห้องครั้งเดียว ได้แผ่น ยาแนว ปูนกาว คิ้ว",
  fields: [
    ...roomFields,
    { type: "select", key: "size", label: "ขนาดกระเบื้อง", default: "60", options: sizeOptions },
    { type: "number", key: "perBox", label: "แผ่น/กล่อง", unit: "แผ่น", default: 4, min: 1 },
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
    { type: "number", key: "joint", label: "ร่องยาแนว", unit: "มม.", default: 2, min: 1, step: 0.5 },
    { type: "number", key: "thick", label: "หนาแผ่น", unit: "มม.", default: 9, min: 5 },
    { type: "select", key: "grout", label: "ชนิดยาแนว", default: "cement", options: groutOptions },
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
    { type: "number", key: "doors", label: "จำนวนประตู", unit: "บาน", default: 1, min: 0 },
  ],
  calc: (v) => {
    const qty = calcTileQty(v);
    const grout = calcGrout(v);
    const adh = calcAdhesive(v);
    const lev = calcLeveling(v);
    const trim = calcTrim(v);
    return jobFromParts({
      title: "งานปูกระเบื้องทั้งห้อง",
      headline: `ของปูทั้งห้อง · ${qty.rows.find((r) => r.label === "จำนวนกล่อง")?.value}`,
      rows: [
        ...qty.rows.filter((r) => r.emphasize || r.label === "เหลือเก็บซ่อม"),
        ...grout.rows.filter((r) => r.emphasize || r.label.includes("ถุง")),
        ...adh.rows.filter((r) => r.emphasize),
        ...lev.rows.filter((r) => r.emphasize),
        ...trim.rows.filter((r) => r.emphasize || r.label.includes("ใบ")),
      ],
      tip: "รายการนี้ส่งไลน์ลูกค้าได้เลย ยังไม่รวมค่าปู เก็บ Lot กระเบื้องไว้ด้วย",
      parts: [qty, grout, adh, lev, trim],
      chart: qty.chart,
    });
  },
};
