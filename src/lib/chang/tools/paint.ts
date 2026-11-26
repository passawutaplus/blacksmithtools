import type { CalcResult, JobDef, ToolDef, Values } from "../types";
import { blockedResult, bool, ceil, fmt, fmtTrim, guardInputs, guardTool, jobFromParts, num, resultX, str, withDefaults } from "../math";
import { DISCLAIMER_AB, PAINT_COVER, PAINT_PACKS, PAINT_QUARTER, PAINT_SURFACES, UNIT, WALLPAPER } from "../constants";

function wallBreakdown(v: Values) {
  const l = num(v, "l", 5);
  const w = num(v, "w", 4);
  const h = num(v, "h", 2.6);
  const doors = num(v, "doors", 1);
  const windows = num(v, "windows", 1);
  const factor = str(v, "surf", "smooth") === "rough" ? 1.15 : str(v, "surf", "smooth") === "tex" ? 1.25 : 1;
  const gross = 2 * (l + w) * h;
  const openings = doors * 1.8 + windows * 1.2;
  const net = Math.max(0, (gross - openings) * factor);
  return { gross, openings, factor, net };
}

/** พื้นที่ฝ้า (ถ้าติ๊ก "ทาฝ้าด้วย") — ไม่ใช้เมื่อกรอกพื้นที่เอง เพราะถือว่าเลขที่กรอกคือพื้นที่ทาทั้งหมดแล้ว */
function ceilingArea(v: Values) {
  if (num(v, "area", 0) > 0 || !bool(v, "ceil", false)) return 0;
  return num(v, "l", 5) * num(v, "w", 4);
}

/** พื้นที่ที่ใช้คิดวัสดุ: ถ้าส่ง `area` (ตร.ม.) มาตรง ๆ และเป็นค่าบวกให้ใช้ค่านั้น ไม่งั้นคิดจากขนาดห้อง (+ ฝ้าถ้าเลือก) */
function wallNet(v: Values) {
  const given = num(v, "area", 0);
  return given > 0 ? given : wallBreakdown(v).net + ceilingArea(v);
}

/**
 * จัดสีเป็นขนาดถังที่ร้านขาย: เลือกชุดที่ "ปริมาตรรวมน้อยสุดที่ยังพอ" ก่อน ถ้าเท่ากันเอาจำนวนถังน้อยสุด
 * sizes = ขนาดถังเป็นแกลลอน เรียงมากไปน้อย (ตัวสุดท้ายคือ 1 แกลลอน)
 */
export function paintPacks(gals: number, sizes: readonly number[]): { counts: number[]; totalGal: number; text: string } {
  const need = Math.max(0, gals);
  const big = sizes[0];
  // ถังใหญ่เกินกว่านี้ไม่มีทางดีกว่า จึงไล่แค่ช่วงที่เป็นไปได้
  const maxBig = Math.ceil(need / big - 1e-9);
  let best: { counts: number[]; totalGal: number; packs: number } | null = null;
  const walk = (i: number, counts: number[], total: number, packs: number) => {
    if (i === sizes.length - 1) {
      const rest = Math.max(0, Math.ceil((need - total) / sizes[i] - 1e-9));
      const t = total + rest * sizes[i];
      const n = packs + rest;
      if (!best || t < best.totalGal - 1e-9 || (Math.abs(t - best.totalGal) < 1e-9 && n < best.packs)) {
        best = { counts: [...counts, rest], totalGal: t, packs: n };
      }
      return;
    }
    const cap = i === 0 ? maxBig : Math.ceil(Math.max(0, need - total) / sizes[i] - 1e-9);
    for (let k = 0; k <= cap; k += 1) walk(i + 1, [...counts, k], total + k * sizes[i], packs + k);
  };
  walk(0, [], 0, 0);
  const found = best as { counts: number[]; totalGal: number; packs: number } | null;
  const counts = found ? found.counts : sizes.map(() => 0);
  const totalGal = found ? found.totalGal : 0;
  const parts: string[] = [];
  sizes.forEach((size, i) => {
    const n = counts[i];
    if (n <= 0) return;
    if (size === UNIT.paintPail.value) parts.push(`${n} ถังใหญ่`);
    else if (size === 1) parts.push(`${n} แกลลอน`);
    else parts.push(`${n} ถัง ${fmtTrim(size, 2)} แกลลอน`);
  });
  return { counts, totalGal, text: parts.length > 0 ? parts.join(" + ") : "0 แกลลอน" };
}

/** ด่านตรวจของสายงานสี: ช่องกรอกอยู่ในช่วง และหักช่องเปิดแล้วต้องเหลือผนังให้ทา */
function guard(id: string, v: Values) {
  const bad = guardTool(paintTools, id, v);
  if (bad) return bad;
  if (num(v, "area", 0) > 0) return null;
  const { gross, openings } = wallBreakdown(v);
  if (openings < gross) return null;
  return blockedResult({
    headline: `ประตู-หน้าต่างรวม ${fmt(openings, 1)} ตร.ม. มากกว่าผนังทั้งห้อง (${fmt(gross, 1)} ตร.ม.) — ตรวจจำนวนบานกับขนาดห้อง`,
    rows: [
      { label: "พื้นที่รอบห้อง", value: `${fmt(gross, 2)} ตร.ม.` },
      { label: "ช่องเปิดที่หัก", value: `${fmt(openings, 2)} ตร.ม. (ประตู 1.8 · หน้าต่าง 1.2 ตร.ม./บาน)` },
    ],
    tip: "ลดจำนวนประตู-หน้าต่าง หรือตรวจขนาดห้องอีกครั้ง",
  });
}

export function calcWallArea(v: Values) {
  const bad = guard("area", v);
  if (bad) return bad;
  const { gross, openings, factor, net } = wallBreakdown(v);
  const netBeforeFactor = Math.max(0, gross - openings);

  return resultX({
    title: "พื้นที่ผนังสุทธิ",
    rows: [{ label: "พื้นที่ผนังสุทธิ", value: `${fmt(net, 2)} ตร.ม.`, emphasize: true }],
    chart: {
      kind: "stack",
      parts: [
        { label: "ผนังสุทธิ (หักช่องเปิด)", value: netBeforeFactor, display: `${fmt(netBeforeFactor, 2)} ตร.ม.`, tone: "accent" },
        { label: "ประตู-หน้าต่าง (หักออก)", value: openings, display: `${fmt(openings, 2)} ตร.ม.`, tone: "mute" },
      ],
      totalLabel: factor > 1 ? `พื้นที่คิดสี (×${factor} ผิวขรุขระ)` : "พื้นที่รอบห้อง",
      totalDisplay: `${fmt(factor > 1 ? net : gross, 2)} ตร.ม.`,
    },
    tip: "หักประตู-หน้าต่างแล้ว ผนังเปลือยฉาบไม่เรียบใช้ตัวคูณผิวขรุขระ",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "พื้นที่ผนังสุทธิ = พื้นที่รอบห้อง (เส้นรอบ × สูง) หักพื้นที่ประตู-หน้าต่าง แล้วคูณตัวคูณผิวผนังถ้าไม่เรียบ",
      steps: [
        {
          label: "พื้นที่รอบห้อง",
          expr: "gross = 2×(ยาว+กว้าง) × สูง",
          subst: `2×(${fmt(num(v, "l", 5), 1)}+${fmt(num(v, "w", 4), 1)}) × ${fmt(num(v, "h", 2.6), 1)} = ${fmt(gross, 2)} ตร.ม.`,
        },
        {
          label: "หักช่องเปิด",
          expr: "openings = ประตู×1.8 + หน้าต่าง×1.2",
          subst: `${fmt(num(v, "doors", 1))}×1.8 + ${fmt(num(v, "windows", 1))}×1.2 = ${fmt(openings, 2)} ตร.ม.`,
        },
        ...(factor > 1
          ? [
              {
                label: "คูณตัวคูณผิวผนัง",
                expr: `net = (gross − openings) × ${factor}`,
                subst: `${fmt(netBeforeFactor, 2)} × ${factor} = ${fmt(net, 2)} ตร.ม.`,
                note: "ผิวหยาบหรือลายผิวดูดสีมากกว่าผิวเรียบ จึงคิดพื้นที่เสมือนมากขึ้น",
              },
            ]
          : []),
      ],
      assumptions: ["ประตูมาตรฐานกว้างเฉลี่ย 0.9×2 ม. (1.8 ตร.ม.) หน้าต่างเฉลี่ย 1.2 ตร.ม./บาน ถ้าขนาดจริงต่างมากควรกรอกพื้นที่เอง"],
      caveats: ["ผนังที่มีคานหรือเสาโผล่จะมีพื้นที่จริงมากกว่าที่คิดจากเส้นรอบตรง ๆ", DISCLAIMER_AB],
      refs: [{ label: "แนวปฏิบัติงานประมาณราคางานทาสี" }],
    },
  });
}

export function calcPaintQty(v: Values) {
  const bad = guard("qty", v);
  if (bad) return bad;
  const net = wallNet(v);
  const covP = Math.max(num(v, "covP", 30), 1);
  const coatsP = num(v, "coatsP", 1);
  const covT = Math.max(num(v, "covT", 32), 1);
  const coatsT = num(v, "coatsT", 2);
  const primerGal = (net * coatsP) / covP;
  const topGal = (net * coatsT) / covT;
  const packKey = str(v, "packs", "std");
  const sizes = PAINT_PACKS[packKey as keyof typeof PAINT_PACKS] ?? PAINT_PACKS.std;
  // จัดเป็นถังที่ร้านมี: ปริมาตรรวมน้อยสุดที่ยังพอ — กัน "1 ถังใหญ่ + 0 แกลลอน" และ "+ 5 แกลลอน" (ซึ่งคือถังใหญ่อีกใบ)
  const pack = (gals: number) => paintPacks(gals, sizes).text;
  const packL = (gals: number) => {
    const plan = paintPacks(gals, sizes);
    return `${plan.text} (${fmt(plan.totalGal * UNIT.gallon.value, 1)} ล.)`;
  };
  const ceilA = ceilingArea(v);
  return resultX({
    title: "ปริมาณสี",
    headline: `สีทับหน้าประมาณ ${pack(topGal)}`,
    chart: {
      kind: "stack",
      parts: [
        {
          label: `รองพื้น ${fmt(coatsP)} เที่ยว`,
          value: primerGal,
          display: `${fmt(primerGal, 2)} แกลลอน`,
          tone: "mute",
        },
        {
          label: `ทับหน้า ${fmt(coatsT)} เที่ยว`,
          value: topGal,
          display: `${fmt(topGal, 2)} แกลลอน`,
          tone: "accent",
        },
      ],
      totalLabel: "รวมเนื้อสีที่ใช้จริง",
      totalDisplay: `${fmt(primerGal + topGal, 2)} แกลลอน`,
    },
    rows: [
      { label: "พื้นที่คิดสี", value: `${fmt(net, 2)} ตร.ม.${ceilA > 0 ? ` (รวมฝ้า ${fmt(ceilA, 2)} ตร.ม.)` : ""}` },
      { label: "รองพื้น", value: `${fmt(primerGal, 2)} แกลลอน (${fmt(primerGal * UNIT.gallon.value, 1)} ล.)` },
      { label: "สั่งรองพื้น", value: pack(primerGal), emphasize: true },
      { label: "ทับหน้า", value: `${fmt(topGal, 2)} แกลลอน (${fmt(topGal * UNIT.gallon.value, 1)} ล.)` },
      { label: "สั่งทับหน้า", value: pack(topGal), emphasize: true },
      { label: "ของที่สั่งคิดเป็นลิตร", value: `รองพื้น ${packL(primerGal)} · ทับหน้า ${packL(topGal)}` },
    ],
    tip:
      packKey === "mid"
        ? "1 แกลลอน = 3.785 ลิตร · ถัง 2.5 แกลลอน ≈ 9.5 ลิตร · ถังใหญ่ 5 แกลลอน สั่ง Lot เดียวกันสีไม่เพี้ยน"
        : "1 แกลลอน = 3.785 ลิตร · 1 ถังใหญ่ = 5 แกลลอน ถ้าร้านมีถัง 2.5 แกลลอน เปลี่ยนช่อง “ขนาดถังที่ร้านมี” ได้",
    explain: {
      risk: "A",
      updatedAt: "2026-11-25",
      summary: "ปริมาณสี = พื้นที่ทาสี × จำนวนเที่ยว ÷ ความครอบคลุมต่อแกลลอน",
      steps: [
        {
          label: "พื้นที่ผนังสุทธิ",
          expr: "A = รอบห้อง × สูง − ช่องเปิด แล้วคูณตัวคูณผิวผนัง",
          subst: `A = ${fmt(net, 2)} ตร.ม.`,
          note: "ผิวหยาบหรืออิฐโชว์ดูดสีมากกว่าผิวเรียบ จึงมีตัวคูณเพิ่ม",
        },
        {
          label: "สีรองพื้น",
          expr: "แกลลอน = A × เที่ยว ÷ ความครอบคลุม",
          subst: `${fmt(net, 2)} × ${fmt(coatsP)} ÷ ${fmt(covP)} = ${fmt(primerGal, 2)} แกลลอน`,
        },
        {
          label: "สีทับหน้า",
          expr: "แกลลอน = A × เที่ยว ÷ ความครอบคลุม",
          subst: `${fmt(net, 2)} × ${fmt(coatsT)} ÷ ${fmt(covT)} = ${fmt(topGal, 2)} แกลลอน`,
        },
        {
          label: "จัดเป็นขนาดบรรจุที่ขาย",
          expr: `เลือกชุดถัง (${sizes.map((x) => fmtTrim(x, 2)).join(" / ")} แกลลอน) ที่ปริมาตรรวมน้อยสุดแต่ยังพอ`,
          subst: `รองพื้น ${pack(primerGal)} · ทับหน้า ${pack(topGal)}`,
        },
      ],
      constants: [UNIT.gallon, UNIT.paintPail],
      assumptions: [
        "ความครอบคลุมต่อแกลลอนใช้ค่าที่ผู้ใช้กรอก ค่าตั้งต้นเป็นค่ากลางของสีอิมัลชันในไทย",
        "ทาด้วยลูกกลิ้งบนผนังฉาบเรียบ",
        "จัดถังแบบปริมาตรรวมน้อยสุดที่ยังพอ ไม่ได้เทียบราคา — ถ้าถังใหญ่ถูกกว่าต่อแกลลอนให้เทียบราคาที่ร้านอีกที",
      ],
      caveats: [
        "ค่าความครอบคลุมบนกระป๋องคือค่าในห้องแล็บ หน้างานจริงมักได้น้อยกว่า 10–20%",
        "ผนังฉาบใหม่หรือสีเข้มทับสีอ่อน ต้องเพิ่มเที่ยวหรือเผื่อสีมากขึ้น",
        DISCLAIMER_AB,
      ],
      refs: [
        { label: "TDS สีอิมัลชัน (ค่าความครอบคลุมต่อแกลลอน)" },
        { label: "ISO 2808 การวัดความหนาฟิล์มสี" },
      ],
    },
  });
}

export function calcSkim(v: Values) {
  const bad = guard("skim", v);
  if (bad) return bad;
  const net = wallNet(v);
  const rate = 1.8;
  const coats = 2;
  const bagSize = 20;
  const kg = net * rate * coats;
  const bags = ceil(kg / bagSize);

  return resultX({
    title: "ฉาบบาง + พุตตี้",
    headline: `ฉาบบางประมาณ ${bags} ถุง`,
    chart:
      bags > 0
        ? {
            kind: "packs",
            unitLabel: `ถุง ${bagSize} กก.`,
            count: bags,
            lastUsed: (kg - (bags - 1) * bagSize) / bagSize,
            note: `${coats} เที่ยว ที่อัตรา ${rate} กก./ตร.ม./เที่ยว`,
          }
        : undefined,
    rows: [
      { label: "พื้นที่", value: `${fmt(net, 2)} ตร.ม.` },
      { label: "สกิม/พุตตี้ 2 เที่ยว", value: `${fmt(kg, 1)} กก.` },
      { label: "สกิมโค้ท (ถุง 20 กก.)", value: `${bags} ถุง`, emphasize: true },
    ],
    tip: "ใช้กับผนังปูนใหม่/มวลเบา/ยิปซัม ฉาบ 2 เที่ยวก่อนทารองพื้น งานทาทับสีเดิมที่ผิวดีอยู่แล้วไม่ต้องฉาบ",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "น้ำหนักสกิม/พุตตี้ = พื้นที่ × อัตราใช้ต่อเที่ยว × จำนวนเที่ยว",
      steps: [
        {
          label: "น้ำหนักรวม",
          expr: `kg = พื้นที่ × ${rate} × ${coats} เที่ยว`,
          subst: `${fmt(net, 2)} × ${rate} × ${coats} = ${fmt(kg, 1)} กก.`,
        },
        {
          label: "แปลงเป็นถุง",
          expr: `ถุง = kg ÷ ${bagSize} ปัดขึ้น`,
          subst: `${fmt(kg, 1)} ÷ ${bagSize} = ${bags} ถุง`,
        },
      ],
      assumptions: ["ผนังมวลเบา/ยิปซัมที่ต้องฉาบบางปิดรอยต่อและเรียบผิวก่อนทาสี ไม่ใช่ผนังปูนที่เรียบอยู่แล้ว"],
      caveats: ["ผนังไม่เรียบมากอาจต้องฉาบเพิ่มเที่ยวหรือหนาขึ้นเฉพาะจุด ทำให้ใช้มากกว่านี้", DISCLAIMER_AB],
      refs: [{ label: "TDS สกิม/พุตตี้สำเร็จรูป (อัตราการใช้ต่อตารางเมตรต่อเที่ยว)" }],
    },
  });
}

/** แนวผนังที่ต้องติดวอลเปเปอร์ = รอบห้อง − ความกว้างประตู (เหนือประตูใช้เศษแถบ) */
function wallpaperRun(v: Values) {
  const perimeter = 2 * (num(v, "l", 5) + num(v, "w", 4));
  return { perimeter, run: perimeter - num(v, "doors", 1) * WALLPAPER.doorWidth.value };
}

export function calcWallpaper(v: Values) {
  const bad = guardTool(paintTools, "wallpaper", v);
  if (bad) return bad;
  const h = num(v, "h", 2.6);
  const rollW = num(v, "rollW", WALLPAPER.rollW.value);
  const rollL = num(v, "rollL", WALLPAPER.rollL.value);
  const repeat = num(v, "repeat", 0) / 100;
  const { perimeter, run } = wallpaperRun(v);
  if (run <= 0) {
    return blockedResult({
      headline: `ประตูรวมกว้าง ${fmt(perimeter - run, 1)} ม. มากกว่ารอบห้อง (${fmt(perimeter, 1)} ม.) — ตรวจจำนวนประตูกับขนาดห้อง`,
      tip: "ลดจำนวนประตู หรือตรวจขนาดห้องอีกครั้ง",
    });
  }
  // แถบหนึ่งยาว = สูงผนัง + เผื่อตัดหัวท้าย แล้วปัดขึ้นให้ลงจังหวะลายซ้ำ
  const rawDrop = h + WALLPAPER.trim.value;
  const dropLen = repeat > 0 ? Math.ceil(rawDrop / repeat - 1e-9) * repeat : rawDrop;
  const perRoll = Math.floor(rollL / dropLen + 1e-9);
  if (perRoll < 1) {
    return blockedResult({
      headline: `ม้วนยาว ${fmtTrim(rollL, 2)} ม. สั้นกว่าแถบที่ต้องตัด (${fmtTrim(dropLen, 2)} ม.) — ต้องใช้ม้วนที่ยาวกว่านี้`,
      rows: [{ label: "แถบละ", value: `${fmtTrim(dropLen, 2)} ม. (สูง ${fmtTrim(h, 2)} + เผื่อตัด ${fmtTrim(WALLPAPER.trim.value * 100, 0)} ซม.)` }],
      tip: "ตรวจความยาวม้วนบนฉลาก หรือความสูงผนัง",
    });
  }
  const drops = ceil(run / rollW);
  const rolls = ceil(drops / perRoll);
  const usedInLast = drops - (rolls - 1) * perRoll;

  return resultX({
    title: "วอลเปเปอร์",
    headline: `${rolls} ม้วน (${drops} แถบ)`,
    chart: {
      kind: "packs",
      unitLabel: `ม้วน ${fmtTrim(rollW, 2)}×${fmtTrim(rollL, 2)} ม.`,
      count: rolls,
      lastUsed: usedInLast / perRoll,
      note: `ม้วนละ ${perRoll} แถบ · ต้องใช้ ${drops} แถบ`,
    },
    rows: [
      { label: "แนวผนังที่ติด", value: `${fmt(run, 2)} ม. (รอบห้อง ${fmt(perimeter, 2)} ม. หักประตู)` },
      { label: "จำนวนแถบ", value: `${drops} แถบ (กว้างแถบละ ${fmtTrim(rollW * 100, 1)} ซม.)` },
      { label: "แถบละ", value: `${fmtTrim(dropLen, 2)} ม.${repeat > 0 ? ` (ลงจังหวะลายซ้ำ ${fmtTrim(repeat * 100, 1)} ซม.)` : ""}` },
      { label: "ม้วนหนึ่งตัดได้", value: `${perRoll} แถบ` },
      { label: "จำนวนม้วน", value: `${rolls} ม้วน`, emphasize: true },
    ],
    tip: "นับเป็นแถบ ไม่ใช่พื้นที่ — เศษปลายม้วนที่สั้นกว่าความสูงผนังใช้ไม่ได้ เก็บม้วน Lot เดียวกัน",
    explain: {
      risk: "A",
      updatedAt: "2026-11-25",
      summary: "วอลเปเปอร์ติดเป็นแถบเต็มความสูงผนัง จึงนับจำนวนแถบจากแนวผนัง ÷ หน้ากว้างม้วน แล้วดูว่าม้วนหนึ่งตัดได้กี่แถบ (เศษปลายม้วนที่สั้นกว่าแถบใช้ไม่ได้)",
      steps: [
        { label: "แนวผนังที่ติด", expr: "รอบห้อง − ประตู × 0.9 ม.", subst: `${fmt(perimeter, 2)} − ${fmt(num(v, "doors", 1))} × ${WALLPAPER.doorWidth.value} = ${fmt(run, 2)} ม.` },
        { label: "จำนวนแถบ", expr: "ปัดขึ้น(แนวผนัง ÷ หน้ากว้างม้วน)", subst: `${fmt(run, 2)} ÷ ${fmtTrim(rollW, 2)} = ${drops} แถบ` },
        {
          label: "ความยาวต่อแถบ",
          expr: repeat > 0 ? "ปัดขึ้น((สูง + เผื่อตัด) ÷ ลายซ้ำ) × ลายซ้ำ" : "สูง + เผื่อตัดหัวท้าย",
          subst: `${fmtTrim(h, 2)} + ${WALLPAPER.trim.value} → ${fmtTrim(dropLen, 2)} ม.`,
        },
        { label: "แถบต่อม้วน", expr: "ปัดลง(ยาวม้วน ÷ ยาวแถบ)", subst: `${fmtTrim(rollL, 2)} ÷ ${fmtTrim(dropLen, 2)} = ${perRoll} แถบ` },
        { label: "จำนวนม้วน", expr: "ปัดขึ้น(จำนวนแถบ ÷ แถบต่อม้วน)", subst: `${drops} ÷ ${perRoll} = ${rolls} ม้วน` },
      ],
      constants: [WALLPAPER.rollW, WALLPAPER.rollL, WALLPAPER.trim, WALLPAPER.doorWidth],
      assumptions: [
        "ไม่หักหน้าต่าง เพราะยังต้องติดแถบเหนือ-ใต้หน้าต่าง ส่วนเหนือประตูใช้เศษแถบ",
        "ขนาดม้วนตั้งต้น 0.53×10 ม. ให้แก้ตามฉลากม้วนที่ซื้อจริง",
      ],
      caveats: ["ผนังไม่ได้ดิ่ง/มุมห้องไม่ฉากต้องเผื่อแถบเพิ่ม", "ลายซ้ำแบบเยื้อง (drop match) เสียเศษมากกว่าลายตรง ควรเผื่ออีก 1 ม้วน", DISCLAIMER_AB],
      refs: [{ label: "แนวปฏิบัติงานติดตั้งวอลเปเปอร์ (นับแถบ + ลายซ้ำ)" }],
    },
  });
}

export function calcConsumables(v: Values) {
  const bad = guard("consumables", v);
  if (bad) return bad;
  const net = wallNet(v);
  const tape = ceil(net / 20);
  const roller = Math.max(1, ceil(net / 40));
  const brush = 2;
  const sheet = ceil(net / 30);

  return resultX({
    title: "วัสดุสิ้นเปลือง",
    headline: "ชุดสิ้นเปลืองงานสี",
    chart: {
      kind: "stack",
      parts: [
        { label: "เทปย่น", value: tape, display: `${tape} ม้วน`, tone: "accent" },
        { label: "ลูกกลิ้ง", value: roller, display: `${roller} อัน`, tone: "mute" },
        { label: "ผ้าคลุม", value: sheet, display: `${sheet} ผืน`, tone: "warn" },
      ],
      totalLabel: "พื้นที่งาน",
      totalDisplay: `${fmt(net, 2)} ตร.ม.`,
    },
    rows: [
      { label: "เทปย่น", value: `${tape} ม้วน`, emphasize: true },
      { label: "ลูกกลิ้ง", value: `${roller} อัน` },
      { label: "แปรง", value: `${brush} ด้าม` },
      { label: "ผ้าคลุม", value: `${sheet} ผืน` },
    ],
    tip: "อย่าลืมกระดาษทราย 180/240 และถาดสี",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "ประมาณจำนวนวัสดุสิ้นเปลืองตามพื้นที่งาน — เทปย่นทุก 20 ตร.ม. ลูกกลิ้งทุก 40 ตร.ม. ผ้าคลุมทุก 30 ตร.ม.",
      steps: [
        {
          label: "เทปย่นและผ้าคลุม",
          expr: "เทป = พื้นที่ ÷ 20 · ผ้าคลุม = พื้นที่ ÷ 30",
          subst: `${fmt(net, 2)} ÷ 20 = ${tape} ม้วน · ${fmt(net, 2)} ÷ 30 = ${sheet} ผืน`,
        },
        {
          label: "ลูกกลิ้ง",
          expr: "ลูกกลิ้ง = พื้นที่ ÷ 40 (อย่างน้อย 1 อัน)",
          subst: `${fmt(net, 2)} ÷ 40 = ${roller} อัน`,
        },
      ],
      assumptions: ["ตัวเลขนี้เป็นค่าประมาณเผื่อของหน้างานทั่วไป ไม่ได้คิดจากอัตราสิ้นเปลืองที่วัดจริง"],
      caveats: ["งานที่มีมุมหรือขอบซับซ้อนมากใช้เทปย่นมากกว่านี้", DISCLAIMER_AB],
      refs: [{ label: "แนวปฏิบัติหน้างานทาสี (ประมาณของสิ้นเปลืองตามพื้นที่)" }],
    },
  });
}

/* ─────────── ระบบสีตามผิว ─────────── */

/**
 * สีสูตรน้ำมันขายเป็นแกลลอนกับกระป๋อง 1/4 แกลลอน: แกลลอนเต็มก่อน เศษปัดขึ้นเป็นกระป๋อง 1/4
 * ถ้าเศษต้องใช้ 3 กระป๋องขึ้นไป ซื้อแกลลอนเดียวแทน (ปริมาณใกล้กัน ราคาต่อลิตรถูกกว่า)
 */
export function solventPacks(gals: number): { totalGal: number; text: string } {
  const q = PAINT_QUARTER.value;
  let full = Math.floor(Math.max(0, gals) + 1e-9);
  let quarters = ceil((Math.max(0, gals) - full) / q);
  if (quarters >= 3) {
    full += 1;
    quarters = 0;
  }
  const parts = [...(full > 0 ? [`${full} แกลลอน`] : []), ...(quarters > 0 ? [`${quarters} กระป๋อง 1/4 แกลลอน`] : [])];
  return { totalGal: full + quarters * q, text: parts.length ? parts.join(" + ") : "0 แกลลอน" };
}

export function calcPaintSystem(v: Values): CalcResult {
  const bad = guardTool(paintTools, "system", v);
  if (bad) return bad;
  const area = num(v, "area", 30);
  const surfKey = str(v, "surface", "new");
  const sys = PAINT_SURFACES[surfKey] ?? PAINT_SURFACES.new;
  const outside = str(v, "loc", "in") === "out";
  const topOverride = num(v, "topCoats", 0);
  const topCoats = topOverride > 0 ? topOverride : sys.topCoats;
  const primerRef = PAINT_COVER[sys.primer];
  const topRef = PAINT_COVER[sys.top];
  const primerL = (area * sys.primerCoats) / primerRef.value;
  const topL = (area * topCoats) / topRef.value;
  const gal = UNIT.gallon.value;
  const waterSizes = PAINT_PACKS[str(v, "packs", "std") as keyof typeof PAINT_PACKS] ?? PAINT_PACKS.std;
  // รองพื้นไม้/เหล็ก และสีน้ำมัน ขายเป็นแกลลอนกับกระป๋อง 1/4 ไม่มีถังใหญ่
  const pack = (gals: number) => (sys.solvent ? solventPacks(gals) : paintPacks(gals, waterSizes));
  const sizes = sys.solvent ? [1, PAINT_QUARTER.value] : waterSizes;
  const primerPack = pack(primerL / gal);
  const topPack = pack(topL / gal);
  const topName =
    sys.top === "enamel"
      ? "สีน้ำมันเคลือบเงา"
      : outside
        ? "สีน้ำอะคริลิกภายนอก"
        : "สีน้ำอะคริลิกภายใน";
  const primerName = primerRef.label;

  return resultX({
    title: "ระบบสีตามผิว",
    headline: `${sys.label}: ${primerName} ${sys.primerCoats} เที่ยว + ${topName} ${topCoats} เที่ยว`,
    chart: {
      kind: "stack",
      parts: [
        { label: `${primerName} ${sys.primerCoats} เที่ยว`, value: primerL, display: `${fmt(primerL, 1)} ล.`, tone: "mute" },
        { label: `${topName} ${topCoats} เที่ยว`, value: topL, display: `${fmt(topL, 1)} ล.`, tone: "accent" },
      ],
      totalLabel: "เนื้อสีที่ใช้จริง",
      totalDisplay: `${fmt(primerL + topL, 1)} ล.`,
    },
    rows: [
      { label: "ผิวที่ทา", value: `${sys.label} · ${outside ? "ภายนอก" : "ภายใน"} · ${fmt(area, 2)} ตร.ม.` },
      { label: "เตรียมผิว", value: sys.prep },
      { label: `รองพื้น: ${primerName}`, value: `${sys.primerCoats} เที่ยว · ${fmt(primerL, 1)} ล.` },
      { label: "สั่งรองพื้น", value: `${primerPack.text} (${fmt(primerPack.totalGal * gal, 1)} ล.)`, emphasize: true },
      { label: `ทับหน้า: ${topName}`, value: `${topCoats} เที่ยว · ${fmt(topL, 1)} ล.` },
      { label: "สั่งทับหน้า", value: `${topPack.text} (${fmt(topPack.totalGal * gal, 1)} ล.)`, emphasize: true },
    ],
    tip: sys.solvent
      ? "สีน้ำมันผสมทินเนอร์ตามฉลาก ใช้ยี่ห้อเดียวกันทั้งรองพื้นและทับหน้า กันสีย่น"
      : surfKey === "damp"
        ? "ผนังชื้นทาไปก็ร่อน ต้องแก้น้ำซึมก่อน แล้วรอผนังแห้งตามที่ฉลากรองพื้นกำหนด"
        : "รองพื้นกับทับหน้าใช้ระบบเดียวกันของยี่ห้อเดียว สั่ง Lot เดียวกันสีไม่เพี้ยน",
    explain: {
      risk: "B",
      updatedAt: "2026-11-25",
      summary: "เลือกรองพื้นและสีทับหน้าตามชนิดผิว แล้วคิดลิตร = พื้นที่ × เที่ยว ÷ ความครอบคลุมต่อลิตร จัดเป็นขนาดบรรจุที่ร้านขาย",
      steps: [
        { label: "ระบบสีของผิวนี้", expr: "ผิว → รองพื้น + เที่ยว · ทับหน้า + เที่ยว", subst: `${sys.label} → ${primerName} ${sys.primerCoats} + ${topName} ${topCoats}${topOverride > 0 ? " (กำหนดเที่ยวเอง)" : ""}` },
        {
          label: "รองพื้น",
          expr: "ลิตร = พื้นที่ × เที่ยว ÷ ครอบคลุม (ตร.ม./ล.)",
          subst: `${fmt(area, 2)} × ${sys.primerCoats} ÷ ${fmtTrim(primerRef.value, 1)} = ${fmt(primerL, 2)} ล. → ${primerPack.text}`,
        },
        {
          label: "ทับหน้า",
          expr: "ลิตร = พื้นที่ × เที่ยว ÷ ครอบคลุม (ตร.ม./ล.)",
          subst: `${fmt(area, 2)} × ${topCoats} ÷ ${fmtTrim(topRef.value, 1)} = ${fmt(topL, 2)} ล. → ${topPack.text}`,
        },
        {
          label: "จัดเป็นขนาดบรรจุ",
          expr: `เลือกชุด (${sizes.map((x) => fmtTrim(x, 2)).join(" / ")} แกลลอน × ${gal} ล.) ที่ปริมาตรรวมน้อยสุดแต่ยังพอ`,
          subst: `รองพื้น ${primerPack.text} · ทับหน้า ${topPack.text}`,
        },
      ],
      constants: [primerRef, topRef, UNIT.gallon, ...(sys.solvent ? [PAINT_QUARTER] : [UNIT.paintPail])],
      assumptions: [
        "ระบบสีพื้นฐานตามแนวปฏิบัติผู้ผลิตสีในไทย ไม่ใช่สเปกของยี่ห้อใด",
        "ความครอบคลุมเป็นค่ากลางบนผิวเรียบ ทาด้วยลูกกลิ้ง/แปรง",
      ],
      caveats: [
        ...(surfKey === "galv" ? ["เหล็กชุบกัลวาไนซ์ห้ามทากันสนิมเรดออกไซด์หรือสีน้ำมันทั่วไปตรง ๆ สีจะลอกเป็นแผ่น"] : []),
        ...(surfKey === "damp" ? ["รองพื้นกันชื้นช่วยได้เฉพาะความชื้นที่ฉลากรับได้ ถ้าน้ำยังซึมเข้าผนังอยู่ สีจะพองทุกระบบ"] : []),
        "ค่าความครอบคลุมบนฉลากเป็นค่าห้องแล็บ หน้างานมักได้น้อยกว่า 10–20%",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "TDS สีรองพื้น/สีทับหน้า (ความครอบคลุมต่อลิตร จำนวนเที่ยว)" }, { label: "ISO 2808 การวัดความหนาฟิล์มสี" }],
    },
  });
}

const sizeOnly = [
  { type: "number" as const, key: "l", label: "ยาวห้อง", unit: "ม.", default: 5, min: 1, max: 100, step: 0.1 },
  { type: "number" as const, key: "w", label: "กว้างห้อง", unit: "ม.", default: 4, min: 1, max: 100, step: 0.1 },
  { type: "number" as const, key: "h", label: "สูงห้อง", unit: "ม.", default: 2.6, min: 2, max: 15, step: 0.1 },
  { type: "number" as const, key: "doors", label: "ประตู", unit: "บาน", default: 1, min: 0, max: 10 },
];

/** ช่องเสริมของเครื่องมือที่คิดจากพื้นที่ทา: รู้พื้นที่อยู่แล้วกรอกตรง ๆ ได้ / ทาฝ้าด้วย */
const areaExtras = [
  { type: "bool" as const, key: "ceil", label: "ทาฝ้าด้วย", default: false },
  { type: "number" as const, key: "area", label: "รู้พื้นที่ทาอยู่แล้ว (0 = คิดจากห้อง)", unit: "ตร.ม.", default: 0, min: 0, max: 10000, step: 0.5 },
];

const packField = {
  type: "select" as const,
  key: "packs",
  label: "ขนาดถังที่ร้านมี",
  default: "std",
  options: [
    { value: "std", label: "แกลลอน + ถังใหญ่ 5 แกลลอน" },
    { value: "mid", label: "มีถัง 2.5 แกลลอนด้วย" },
  ],
};

const room = [
  { type: "number" as const, key: "l", label: "ยาวห้อง", unit: "ม.", default: 5, min: 1, max: 100, step: 0.1 },
  { type: "number" as const, key: "w", label: "กว้างห้อง", unit: "ม.", default: 4, min: 1, max: 100, step: 0.1 },
  { type: "number" as const, key: "h", label: "สูงห้อง", unit: "ม.", default: 2.6, min: 2, max: 15, step: 0.1 },
  { type: "number" as const, key: "doors", label: "ประตู", unit: "บาน", default: 1, min: 0, max: 10 },
  { type: "number" as const, key: "windows", label: "หน้าต่าง", unit: "บาน", default: 1, min: 0, max: 20 },
  {
    type: "select" as const,
    key: "surf",
    label: "ผิวผนัง",
    default: "smooth",
    options: [
      { value: "smooth", label: "เรียบ" },
      { value: "rough", label: "ฉาบหยาบ" },
      { value: "tex", label: "ลายผิว / อิฐโชว์" },
    ],
  },
];

export const paintTools: ToolDef[] = [
  { id: "area", name: "พื้นที่ผนังสุทธิ", blurb: "หักประตูหน้าต่าง", fields: room, calc: calcWallArea },
  {
    id: "qty",
    name: "ปริมาณสี",
    blurb: "รองพื้น + ทับหน้า เป็นแกลลอน",
    fields: [
      ...room,
      ...areaExtras,
      { type: "number", key: "covP", label: "รองพื้นครอบคลุม", unit: "ตร.ม./แกลลอน", default: 30, min: 10, max: 60 },
      { type: "number", key: "coatsP", label: "เที่ยวรองพื้น", unit: "เที่ยว", default: 1, min: 0, max: 3 },
      { type: "number", key: "covT", label: "ทับหน้าครอบคลุม", unit: "ตร.ม./แกลลอน", default: 32, min: 10, max: 60 },
      { type: "number", key: "coatsT", label: "เที่ยวทับหน้า", unit: "เที่ยว", default: 2, min: 1, max: 5 },
      packField,
    ],
    calc: calcPaintQty,
  },
  { id: "skim", name: "สกิมโค้ท / โป๊วผนัง", blurb: "ฉาบบางก่อนทาสี", keywords: ["ฉาบบาง", "พุตตี้", "สกิมโค้ท", "โป๊ว"], fields: [...room, ...areaExtras], calc: calcSkim },
  {
    id: "wallpaper",
    name: "วอลเปเปอร์",
    blurb: "นับเป็นแถบ + ลายซ้ำ",
    fields: [
      ...sizeOnly,
      { type: "number", key: "rollW", label: "หน้ากว้างม้วน", unit: "ม.", default: WALLPAPER.rollW.value, min: 0.4, max: 1.4, step: 0.01 },
      { type: "number", key: "rollL", label: "ยาวม้วน", unit: "ม.", default: WALLPAPER.rollL.value, min: 5, max: 50, step: 0.1 },
      { type: "number", key: "repeat", label: "ลายซ้ำ (0 = ลายเรียบ)", unit: "ซม.", default: 0, min: 0, max: 100 },
    ],
    calc: calcWallpaper,
  },
  { id: "consumables", name: "วัสดุสิ้นเปลือง", blurb: "เทป ลูกกลิ้ง ผ้าคลุม", fields: [...room, ...areaExtras], calc: calcConsumables },
  {
    id: "system",
    name: "ระบบสีตามผิว",
    blurb: "รองพื้นอะไร กี่เที่ยว กี่ลิตร",
    keywords: ["รองพื้น", "กันสนิม", "สีน้ำมัน", "กัลวาไนซ์", "ปูนชื้น", "ด่าง", "สีไม้", "สีเหล็ก"],
    fields: [
      { type: "number", key: "area", label: "พื้นที่ทา", unit: "ตร.ม.", default: 30, min: 0.5, max: 10000, step: 0.5 },
      {
        type: "select",
        key: "surface",
        label: "ผิวที่ทา",
        default: "new",
        options: Object.entries(PAINT_SURFACES).map(([value, s]) => ({ value, label: s.label })),
      },
      {
        type: "select",
        key: "loc",
        label: "ทาที่",
        default: "in",
        options: [
          { value: "in", label: "ภายใน" },
          { value: "out", label: "ภายนอก" },
        ],
      },
      { type: "number", key: "topCoats", label: "เที่ยวทับหน้า (0 = ตามระบบ)", unit: "เที่ยว", default: 0, min: 0, max: 4 },
      packField,
    ],
    calc: calcPaintSystem,
  },
];

const COND_LABEL: Record<string, string> = {
  repaint: "ทาทับสีเดิม",
  new: "ผนังปูนใหม่",
  gyp: "ผนัง/ฝ้ายิปซัม",
};

export const paintJob: JobDef = {
  name: "คิดทั้งงานทาสีห้อง",
  blurb: "ห้องครั้งเดียว ได้สี สกิมโค้ท ของสิ้นเปลือง",
  fields: [
    ...room,
    {
      type: "select",
      key: "cond",
      label: "สภาพผนัง",
      default: "repaint",
      options: [
        { value: "repaint", label: "ทาทับสีเดิม (ไม่ฉาบ)" },
        { value: "new", label: "ผนังปูนใหม่ (ฉาบสกิมโค้ท)" },
        { value: "gyp", label: "ผนัง/ฝ้ายิปซัม (ฉาบสกิมโค้ท)" },
      ],
    },
    ...areaExtras,
    { type: "number", key: "covP", label: "รองพื้น ตร.ม./แกลลอน", default: 30, min: 10, max: 60 },
    { type: "number", key: "coatsP", label: "เที่ยวรองพื้น", default: 1, min: 0, max: 3 },
    { type: "number", key: "covT", label: "ทับหน้า ตร.ม./แกลลอน", default: 32, min: 10, max: 60 },
    { type: "number", key: "coatsT", label: "เที่ยวทับหน้า", default: 2, min: 1, max: 5 },
    packField,
  ],
  calc: (input) => {
    const bad = guardInputs(paintJob.fields, input);
    if (bad) return bad;
    const v = withDefaults(paintJob.fields, input);
    const cond = str(v, "cond", "repaint");
    const given = num(v, "area", 0);
    const area = calcWallArea(v);
    const paint = calcPaintQty(v);
    // สกิมโค้ทซื้อเฉพาะผนังปูนใหม่/ยิปซัม งานทาทับสีเดิมไม่มีใครฉาบทั้งห้อง
    const skim = cond === "repaint" ? null : calcSkim(v);
    const con = calcConsumables(v);
    const ceilA = ceilingArea(v);
    const total = wallNet(v);
    const areaRows =
      given > 0
        ? [{ label: "พื้นที่ทา (กรอกเอง)", value: `${fmt(given, 2)} ตร.ม.`, emphasize: true }]
        : [
            ...area.rows,
            ...(ceilA > 0
              ? [
                  { label: "พื้นที่ฝ้า", value: `${fmt(ceilA, 2)} ตร.ม.` },
                  { label: "พื้นที่ทารวม", value: `${fmt(total, 2)} ตร.ม.`, emphasize: true },
                ]
              : []),
          ];
    return jobFromParts({
      title: "งานทาสีทั้งห้อง",
      headline: paint.headline ?? "งานทาสี",
      rows: [
        ...areaRows,
        ...paint.rows.filter((r) => r.label.startsWith("สั่ง") || r.label.includes("ลิตร")),
        ...(skim
          ? skim.rows.filter((r) => r.emphasize)
          : [{ label: "สกิมโค้ท", value: `ไม่ต้องซื้อ (${COND_LABEL[cond] ?? cond})` }]),
        ...con.rows.filter((r) => r.emphasize || r.label === "ลูกกลิ้ง"),
      ],
      tip:
        cond === "repaint"
          ? "ทาทับสีเดิม: ขูดสีที่ร่อน โป๊วเฉพาะจุดก่อนทา ยังไม่รวมค่าแรง"
          : "ยังไม่รวมค่าแรง นี่คือของที่ต้องซื้อก่อนขึ้นนั่งร้าน",
      parts: [area, paint, ...(skim ? [skim] : []), con],
    });
  },
};
