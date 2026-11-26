import type { JobDef, ToolDef, Values } from "../types";
import { blockedResult, ceil, fmt, fmtTrim, guardInputs, guardTool, jobFromParts, num, resultX, round, str, withDefaults } from "../math";
import { ANCHOR, DISCLAIMER_AB, DISCLAIMER_C, LAMINATE, LED, LED_DRIVER_SIZES, STAIR_LAW, WASTE_DEFAULT } from "../constants";

const HINGE_EDGE: Record<string, number> = { full: 4.5, half: 9.5, inset: 16 };

const guard = (id: string, v: Values) => guardTool(handymanTools, id, v);

/** หน้าบานลิ้นชักเตี้ยกว่านี้ (มม.) ถือว่ากรอกผิด — ใส่รางและกล่องลิ้นชักไม่ได้ */
const DRAWER_FRONT_MIN = 50;

export function calcHinge(v: Values) {
  const bad = guard("hinge", v);
  if (bad) return bad;
  const overlay = str(v, "overlay", "full");
  const edge = HINGE_EDGE[overlay] ?? HINGE_EDGE.full;
  const cup = 22.5;
  const top = 100;
  return resultX({
    title: "ระยะเจาะบานพับถ้วย",
    headline: `เจาะถ้วยห่างขอบ ${fmt(edge, 1)} มม.`,
    chart: {
      kind: "steps",
      unit: "มม.",
      items: (["full", "half", "inset"] as const).map((k) => ({
        label: k === "full" ? "ปิดทับเต็ม" : k === "half" ? "ปิดทับครึ่ง" : "ฝังใน",
        value: HINGE_EDGE[k],
        state: k === overlay ? "chosen" : HINGE_EDGE[k] < edge ? "under" : "over",
      })),
    },
    rows: [
      { label: "ระบบ", value: overlay === "full" ? "ปิดทับเต็ม" : overlay === "half" ? "ครึ่ง" : "ฝังใน" },
      { label: "ขอบบาน → ถ้วย", value: `${fmt(edge, 1)} มม.`, emphasize: true },
      { label: "กึ่งกลางถ้วยจากขอบ", value: `${fmt(cup, 1)} มม.` },
      { label: "ตัวบน/ล่าง", value: `${top} มม. จากปลายบาน` },
    ],
    tip: "ถ้วย 35 มม. แนว Blum/Hafele ลองเจาะเศษไม้อัดก่อนเจาะบานจริง",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "ระยะขอบบานถึงถ้วยเปลี่ยนไปตามระบบบานที่เลือก (ปิดทับเต็ม/ครึ่ง/ฝังใน) เป็นค่ามาตรฐานของบานพับถ้วย 35 มม.",
      steps: [
        {
          label: "เลือกระยะตามระบบบาน",
          expr: "ระยะขอบ = ค่ามาตรฐานของระบบที่เลือก",
          subst: `ระบบ${overlay === "full" ? "ปิดทับเต็ม" : overlay === "half" ? "ปิดทับครึ่ง" : "ฝังใน"} → ${fmt(edge, 1)} มม.`,
        },
        {
          label: "ระยะจุดอื่นบนบาน",
          expr: "กึ่งกลางถ้วยและตัวบน-ล่างใช้ค่ามาตรฐานเดียวกันทุกระบบ",
          subst: `กึ่งกลางถ้วย ${fmt(cup, 1)} มม. · ตัวบน/ล่าง ${top} มม.`,
        },
      ],
      assumptions: ["ใช้บานพับถ้วย 35 มม. แนว Blum/Hafele", "บานหนา 16–19 มม. ทั่วไป"],
      caveats: [
        "บานพับยี่ห้ออื่นหรือถ้วยขนาดต่างจาก 35 มม. ระยะอาจต่างจากนี้ ให้ดูคู่มือรุ่นที่ใช้จริง",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "คู่มือระยะเจาะบานพับถ้วย Blum / Hafele" }],
    },
  });
}

export function hingeCount(h: number): number {
  if (h < 900) return 2;
  if (h < 1600) return 3;
  if (h < 2100) return 4;
  return 5;
}

const SLIDE_SIZES = [250, 300, 350, 400, 450, 500, 550] as const;

export function calcHingeQty(v: Values) {
  const bad = guard("hingeqty", v);
  if (bad) return bad;
  const doors = num(v, "doors", 2);
  const dh = num(v, "dh", 720);
  const drawers = num(v, "drawers", 3);
  const depth = num(v, "depth", 450);
  const per = hingeCount(dh);
  const slides = SLIDE_SIZES.reduce((b, s) => (s <= depth - 10 ? s : b), 250);
  const chosenIdx = SLIDE_SIZES.indexOf(slides as (typeof SLIDE_SIZES)[number]);
  const ladder = SLIDE_SIZES.slice(Math.max(0, chosenIdx - 2), chosenIdx + 3);

  return resultX({
    title: "จำนวนบานพับ + ราง",
    headline: `บานพับ ${doors * per} ตัว · ราง ${slides} มม.`,
    chart:
      drawers > 0 && ladder.length > 1
        ? {
            kind: "steps",
            unit: "มม.",
            items: ladder.map((s) => ({
              label: `${s} มม.`,
              value: s,
              state: s === slides ? "chosen" : s < slides ? "under" : "over",
            })),
          }
        : undefined,
    rows: [
      { label: "บานพับ/บาน", value: `${per} ตัว` },
      { label: "บานพับรวม", value: `${doors * per} ตัว`, emphasize: true },
      { label: "รางลิ้นชัก", value: `${slides} มม. × ${drawers} ชุด`, emphasize: true },
    ],
    tip: "บานสูงหรือบานหนักใส่บานพับเพิ่ม รางสั้นกว่าลึกตู้ประมาณ 10 มม.",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "จำนวนบานพับตามสูงบาน (ยิ่งสูงยิ่งใส่มาก) และรางลิ้นชักเลือกจากไซซ์มาตรฐานที่สั้นกว่าความลึกตู้",
      steps: [
        {
          label: "จำนวนบานพับต่อบาน",
          expr: "สูงบาน < 900 → 2 ตัว · < 1600 → 3 ตัว · < 2100 → 4 ตัว · เกิน → 5 ตัว",
          subst: `สูง ${fmt(dh)} มม. → ${per} ตัว/บาน × ${fmt(doors)} บาน = ${doors * per} ตัว`,
        },
        {
          label: "เลือกไซซ์รางลิ้นชัก",
          expr: "ราง = ไซซ์มาตรฐานที่ใหญ่สุดที่ยังสั้นกว่า (ลึกตู้ − 10 มม.)",
          subst: `${fmt(depth)} − 10 = ${fmt(depth - 10)} มม. → ราง ${slides} มม.`,
        },
      ],
      assumptions: ["บานไม้ทั่วไปหนา 16–19 มม. ไม่ใช่บานหนักพิเศษ (กระจก/หิน)", "รางลิ้นชักเป็นระบบลูกปืน (ball-bearing) มาตรฐาน"],
      caveats: [
        "บานสูงเกิน 2,100 มม. หรือบานหนัก (กระจก/บิ้วอินหนา) ควรเพิ่มบานพับอีก 1 ตัวเผื่อความมั่นใจ",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวปฏิบัติงานเฟอร์นิเจอร์บิ้วอิน (จำนวนบานพับตามความสูงบาน)" }],
    },
  });
}

export function calcDrawer(v: Values) {
  const bad = guard("drawer", v);
  if (bad) return bad;
  const opening = num(v, "opening", 720);
  const n = num(v, "n", 4);
  const gap = num(v, "gap", 3);
  const front = (opening - gap * (n - 1)) / n;
  const gaps = gap * (n - 1);
  if (front < DRAWER_FRONT_MIN) {
    return blockedResult({
      headline: `แบ่ง ${fmt(n)} ลิ้นแล้วหน้าบานเหลือ ${fmt(front, 1)} มม. เตี้ยเกินทำลิ้นชัก — ลดจำนวนลิ้นหรือตรวจช่องเปิด`,
      rows: [
        { label: "ช่องเปิด", value: `${fmt(opening)} มม.` },
        { label: "จำนวนลิ้นชัก", value: `${fmt(n)} ลิ้น` },
        { label: "หน้าบานเตี้ยสุดที่คิดให้", value: `${DRAWER_FRONT_MIN} มม.` },
      ],
      tip: "หน้าบานลิ้นชักทั่วไปสูง 100 มม. ขึ้นไป ถึงจะใส่รางและกล่องลิ้นชักได้",
    });
  }

  return resultX({
    title: "แบ่งหน้าบานลิ้นชัก",
    headline: `หน้าบานละ ${fmt(front, 1)} มม.`,
    chart: {
      kind: "stack",
      parts: [
        ...Array.from({ length: Math.min(n, 8) }, (_, i) => ({
          label: `บาน ${i + 1}`,
          value: front,
          display: `${fmt(front, 1)} มม.`,
          tone: i % 2 === 0 ? ("accent" as const) : ("mute" as const),
        })),
        ...(gaps > 0 ? [{ label: "ร่องรวม", value: gaps, display: `${fmt(gaps, 1)} มม.`, tone: "warn" as const }] : []),
      ],
      totalLabel: "ช่องเปิดรวม",
      totalDisplay: `${fmt(opening)} มม.`,
    },
    rows: [
      { label: "ช่องเปิด", value: `${fmt(opening)} มม.` },
      { label: "จำนวนลิ้นชัก", value: `${fmt(n)} ลิ้น` },
      { label: "สูงหน้าบาน", value: `${fmt(front, 1)} มม.`, emphasize: true },
      { label: "ร่องระหว่างบาน", value: `${fmt(gap)} มม.` },
    ],
    tip: "ลิ้นล่างสุดอย่าลืมเผื่อขาตู้ ถ้ามีขาสูง 10 ซม. ให้หักก่อนแบ่ง",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "หน้าบานแต่ละลิ้น = (ช่องเปิด − ร่องรวม) ÷ จำนวนลิ้นชัก แบ่งเท่า ๆ กันทุกบาน",
      steps: [
        {
          label: "ร่องรวมระหว่างบาน",
          expr: "ร่องรวม = ร่อง × (จำนวนลิ้น − 1)",
          subst: `${fmt(gap)} × (${fmt(n)} − 1) = ${fmt(gaps, 1)} มม.`,
        },
        {
          label: "ความสูงหน้าบานแต่ละลิ้น",
          expr: "หน้าบาน = (ช่องเปิด − ร่องรวม) ÷ จำนวนลิ้น",
          subst: `(${fmt(opening)} − ${fmt(gaps, 1)}) ÷ ${fmt(n)} = ${fmt(front, 1)} มม.`,
        },
      ],
      assumptions: ["แบ่งหน้าบานเท่ากันทุกลิ้น ไม่ได้เผื่อลิ้นล่างสุดให้สูงกว่าเพื่อซ่อนขาตู้"],
      caveats: [
        "ถ้าอยากให้ลิ้นล่างสุดสูงกว่าลิ้นอื่น (นิยมทำเผื่อขาตู้/ความแข็งแรง) ให้หักความสูงนั้นออกจากช่องเปิดก่อนคำนวณ",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวปฏิบัติงานเฟอร์นิเจอร์บิ้วอิน (แบ่งหน้าบานลิ้นชัก)" }],
    },
  });
}

export function calcLaminate(v: Values) {
  const bad = guard("laminate", v);
  if (bad) return bad;
  const w = num(v, "w", 1.2);
  const h = num(v, "h", 2.4);
  const qty = num(v, "qty", 4);
  const wastePct = num(v, "waste", WASTE_DEFAULT.value);
  const raw = w * h * qty;
  const area = raw * (1 + wastePct / 100);
  const glue = area * 0.15;
  const edge = 2 * (w + h) * qty;
  // ร้านขายเป็นแผ่น 4×8 ฟุต (1.22×2.44 ม.): ถ้าชิ้นงานลงแผ่นได้ให้นับว่าแผ่นหนึ่งตัดได้กี่ชิ้น ไม่งั้นนับตามพื้นที่
  const sw = LAMINATE.sheetW.value;
  const sl = LAMINATE.sheetL.value;
  const fit = (a: number, b: number) => Math.floor(sw / a + 1e-9) * Math.floor(sl / b + 1e-9);
  const perSheet = Math.max(fit(w, h), fit(h, w));
  const byArea = ceil(area / (sw * sl));
  const sheets = perSheet >= 1 ? ceil(qty / perSheet) : byArea;
  const sheetLabel = `แผ่น ${fmtTrim(sw, 2)}×${fmtTrim(sl, 2)} ม. (4×8 ฟุต)`;

  return resultX({
    title: "ลามิเนต + กาว + ขอบ",
    headline: `ลามิเนต ${fmt(sheets)} แผ่น (${fmt(area, 2)} ตร.ม.)`,
    chart: {
      kind: "stack",
      parts: [
        { label: "พื้นที่แผ่นจริง", value: raw, display: `${fmt(raw, 2)} ตร.ม.`, tone: "accent" },
        { label: `เผื่อเสีย ${fmt(wastePct)}%`, value: area - raw, display: `${fmt(area - raw, 2)} ตร.ม.`, tone: "mute" },
      ],
      totalLabel: "ลามิเนตที่ต้องสั่ง",
      totalDisplay: `${fmt(area, 2)} ตร.ม.`,
    },
    rows: [
      { label: `พื้นที่ (เผื่อ ${fmt(wastePct)}%)`, value: `${fmt(area, 2)} ตร.ม.` },
      { label: `สั่งลามิเนต ${sheetLabel}`, value: `${fmt(sheets)} แผ่น`, emphasize: true },
      perSheet >= 1
        ? { label: "วิธีนับ", value: `แผ่นหนึ่งตัดได้ ${fmt(perSheet)} ชิ้น · ${fmt(qty)} ชิ้น ÷ ${fmt(perSheet)} (นับตามพื้นที่+เผื่อได้ ${fmt(byArea)} แผ่น)` }
        : { label: "ชิ้นงานใหญ่กว่าแผ่น", value: `ต้องต่อแผ่น — นับตามพื้นที่+เผื่อ ได้ ${fmt(byArea)} แผ่น วางแนวต่อก่อนสั่ง`, emphasize: true },
      { label: "กาว", value: `${fmt(glue, 1)} กก.` },
      { label: "ขอบ PVC", value: `${fmt(edge, 1)} ม.` },
    ],
    tip: "ลายไม้ต้องวางตามยาวแผ่นทิศเดียวกัน ถ้าชิ้นงานต้องหมุนขวางลาย จำนวนแผ่นจะมากกว่านี้",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "พื้นที่ลามิเนต = พื้นที่แผ่นจริง × เผื่อเสีย 10% แล้วคิดกาวและขอบ PVC ตามพื้นที่และเส้นรอบ",
      steps: [
        {
          label: "พื้นที่แผ่นจริง",
          expr: "A = กว้าง × สูง × จำนวนแผ่น",
          subst: `A = ${fmt(w, 2)} × ${fmt(h, 2)} × ${fmt(qty)} = ${fmt(raw, 2)} ตร.ม.`,
        },
        {
          label: "เผื่อเสียจากการตัด",
          expr: `พื้นที่สั่ง = A × (1 + เผื่อเสีย)`,
          subst: `${fmt(raw, 2)} × ${fmt(1 + wastePct / 100, 2)} = ${fmt(area, 2)} ตร.ม.`,
        },
        perSheet >= 1
          ? {
              label: "แปลงเป็นแผ่นที่ขาย",
              expr: "ปัดขึ้น(จำนวนชิ้น ÷ ชิ้นที่ตัดได้ต่อแผ่น)",
              subst: `${fmt(qty)} ÷ ${fmt(perSheet)} = ${fmt(sheets)} แผ่น`,
              note: "ชิ้นที่ตัดได้ต่อแผ่น = ปัดลง(1.22 ÷ ด้านหนึ่ง) × ปัดลง(2.44 ÷ อีกด้าน) เลือกทิศที่ได้มากกว่า (ยังไม่คิดทิศลาย)",
            }
          : {
              label: "แปลงเป็นแผ่นที่ขาย",
              expr: "ปัดขึ้น(พื้นที่สั่ง ÷ พื้นที่แผ่น)",
              subst: `${fmt(area, 2)} ÷ ${fmt(sw * sl, 2)} = ${fmt(sheets)} แผ่น`,
              note: "ชิ้นงานใหญ่กว่าแผ่น 1.22×2.44 ม. จึงต้องต่อแผ่น",
            },
        {
          label: "กาวและขอบ PVC",
          expr: "กาว = พื้นที่ × 0.15 กก./ตร.ม. · ขอบ = เส้นรอบ × จำนวนแผ่น",
          subst: `กาว ${fmt(glue, 1)} กก. · ขอบ ${fmt(edge, 1)} ม.`,
        },
      ],
      assumptions: ["กาวลามิเนตสัมผัส (contact cement) ทาสองด้าน อัตราประมาณ 0.15 กก./ตร.ม.", "ขอบ PVC หนา 1 มม. ปิดรอบทุกด้านของแต่ละแผ่น"],
      caveats: [
        "ลายไม้ต้องเรียงทิศทางเดียวกัน เผื่อเสียอาจต้องเพิ่มถ้าลายซับซ้อนหรือชิ้นงานมีมุมตัดเยอะ",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวปฏิบัติงานเฟอร์นิเจอร์บิ้วอิน (ลามิเนต + กาวสัมผัส)" }],
    },
  });
}

export function calcLed(v: Values) {
  const bad = guard("led", v);
  if (bad) return bad;
  const meters = num(v, "m", 4);
  const wpm = num(v, "wpm", 12);
  const load = meters * wpm;
  const headroom = 1 + LED.headroom.value / 100;
  const watts = load * headroom;
  const driver = LED_DRIVER_SIZES.find((s) => s >= watts);
  const overTable = driver === undefined;
  const picked = driver ?? ceil(watts / 50) * 50;
  const chosenIdx = LED_DRIVER_SIZES.indexOf(driver as (typeof LED_DRIVER_SIZES)[number]);
  const ladder = chosenIdx < 0 ? [] : LED_DRIVER_SIZES.slice(Math.max(0, chosenIdx - 2), chosenIdx + 3);

  return resultX({
    title: "หม้อแปลง LED",
    headline: overTable ? `เกินไซซ์ร้านทั่วไป — ประมาณ ${picked} W` : `หม้อแปลง ${picked} W`,
    chart:
      ladder.length > 1
        ? {
            kind: "steps",
            unit: "W",
            need: round(watts, 1),
            needLabel: "ต้องจ่ายได้ไม่น้อยกว่า",
            items: ladder.map((s) => ({
              label: `${s} W`,
              value: s,
              state: s === picked ? "chosen" : s < watts ? "under" : "over",
            })),
          }
        : undefined,
    rows: [
      { label: "ไฟเส้น", value: `${fmt(meters, 1)} ม. × ${fmt(wpm)} W/ม.` },
      { label: "โหลดจริง", value: `${fmt(load, 1)} W` },
      { label: `เผื่อ ${LED.headroom.value}%`, value: `${fmt(watts, 1)} W` },
      { label: "ไดร์เวอร์", value: `${picked} W`, emphasize: true },
      { label: "ใช้จริงเทียบพิกัด", value: `${fmt(round((load / picked) * 100, 0))}%` },
    ],
    tip: overTable
      ? "เกิน 300 W ที่ร้านทั่วไปมี — แยกวงจรหรือสั่งหม้อแปลงเฉพาะ"
      : "อย่าใช้หม้อแปลงพอดีพิกัด ไฟจะหรี่ตอนโหลดเต็มและหม้อแปลงร้อนจนอายุสั้น",
    explain: {
      risk: "B",
      updatedAt: "2026-08-21",
      summary: "กำลังหม้อแปลง = ความยาวไฟเส้น × วัตต์ต่อเมตร แล้วเผื่อกำลังสำรอง",
      steps: [
        {
          label: "โหลดจริงของไฟเส้น",
          expr: "โหลด = ความยาว × วัตต์ต่อเมตร",
          subst: `${fmt(meters, 1)} × ${fmt(wpm)} = ${fmt(load, 1)} W`,
        },
        {
          label: `เผื่อกำลังสำรอง ${LED.headroom.value}%`,
          expr: `กำลังที่ต้องการ = โหลด × ${headroom}`,
          subst: `${fmt(load, 1)} × ${headroom} = ${fmt(watts, 1)} W`,
        },
        {
          label: "เลือกพิกัดที่หาซื้อได้",
          expr: "เลือกหม้อแปลงที่พิกัด ≥ กำลังที่ต้องการ",
          subst: `${fmt(watts, 1)} W → ${picked} W`,
        },
      ],
      constants: [LED.headroom],
      assumptions: [
        "วัตต์ต่อเมตรเป็นค่าจากสเปกไฟเส้นที่ใช้จริง ไม่ใช่ค่าที่ร้านโฆษณา",
        "ไฟเส้นทั้งเส้นต่อกับหม้อแปลงตัวเดียว",
      ],
      caveats: [
        ...(overTable ? ["กำลังเกิน 300 W ที่ร้านทั่วไปมี ต้องแยกวงจรหรือสั่งหม้อแปลงเฉพาะ"] : []),
        "ไฟเส้นยาวเกินระยะที่ผู้ผลิตกำหนด (มักประมาณ 5 ม. ต่อการจ่ายไฟหนึ่งจุด) ปลายเส้นจะหรี่ ต้องจ่ายไฟสองหัวหรือแยกวงจร",
        "หม้อแปลงต้องอยู่ในที่ระบายความร้อนได้ ห้ามฝังในฝ้าปิดทึบหรือในกล่องบิ้วอินที่ไม่มีช่องลม",
        "งานติดตั้งในฝ้าต้องต่อผ่านวงจรที่มีเครื่องป้องกันตามมาตรฐานการเดินสายไฟ",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวปฏิบัติการติดตั้งไฟเส้น LED ตามคู่มือผู้ผลิตหม้อแปลง" }],
    },
  });
}

export function calcHandymanTile(v: Values) {
  const bad = guard("tile", v);
  if (bad) return bad;
  const area = num(v, "area", 2);
  const wastePct = num(v, "waste", WASTE_DEFAULT.value);
  const tile = 0.3 * 0.3;
  const raw = area / tile;
  const sheets = ceil(raw * (1 + wastePct / 100));
  const kgM2 = ((300 + 300) / (300 * 300)) * 2 * 9 * 1.6;
  const grout = area * kgM2 * 1.1;

  return resultX({
    title: "กระเบื้อง + ยาแนว",
    headline: `${sheets} แผ่น 30×30`,
    chart: {
      kind: "packs",
      unitLabel: "แผ่น 30×30",
      count: sheets,
      lastUsed: sheets > 0 ? (raw * (1 + wastePct / 100) - (sheets - 1)) : undefined,
      note: `พื้นที่ ${fmt(area, 2)} ตร.ม. เผื่อตัด ${fmt(wastePct)}%`,
    },
    rows: [
      { label: "พื้นที่", value: `${fmt(area, 2)} ตร.ม.` },
      { label: "กระเบื้อง 30×30", value: `${sheets} แผ่น`, emphasize: true },
      { label: "ยาแนว (สูตร ISO 13007)", value: `${fmt(grout, 2)} กก.` },
    ],
    tip: "งานบิ้วอินหลังเคาน์เตอร์ เผื่อตัดรอบอ่าง — งานพื้นห้องใช้เครื่องมือหมวดกระเบื้อง",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "จำนวนแผ่น = พื้นที่ ÷ พื้นที่ต่อแผ่น (30×30 ซม.) แล้วเผื่อเสียจากการตัด 10%",
      steps: [
        {
          label: "จำนวนแผ่นก่อนเผื่อ",
          expr: "N₀ = พื้นที่ ÷ (0.3 × 0.3)",
          subst: `${fmt(area, 2)} ÷ ${fmt(tile, 2)} = ${fmt(raw, 1)} แผ่น`,
        },
        {
          label: "เผื่อเสีย 10% แล้วปัดขึ้น",
          expr: "N = N₀ × 1.10 ปัดขึ้น",
          subst: `${fmt(raw, 1)} × 1.10 = ${fmt(raw * 1.1, 1)} → ${sheets} แผ่น`,
        },
      ],
      assumptions: ["งานชิ้นเล็กหลังเคาน์เตอร์หรือบิ้วอิน ตัดรอบอ่างและมุมเยอะกว่างานพื้นห้องปกติ"],
      caveats: ["งานพื้นที่กว้างขึ้นควรใช้ตัวคิดจำนวนกระเบื้องแบบเลือกลายปูได้ในหมวดกระเบื้อง", DISCLAIMER_AB],
      refs: [{ label: "แนวปฏิบัติงานปูกระเบื้องพื้นที่เล็ก (บิ้วอิน/เคาน์เตอร์)" }],
    },
  });
}

type AnchorWall = "conc" | "brick" | "gyp" | "wood";

/** พิกัดต่อจุดของแต่ละผนัง: `easy` = ใช้พุก/สกรูธรรมดาได้ · `max` = เพดานที่เครื่องมือนี้ยอมตอบ (เกินนี้ไม่ให้ตัวเลข) */
const ANCHOR_LIMITS: Record<AnchorWall, { name: string; easy: number; max: number }> = {
  conc: { name: "คอนกรีต", easy: ANCHOR.concPlasticMax.value, max: ANCHOR.concSteelMax.value },
  brick: { name: "อิฐ", easy: ANCHOR.brickMax.value, max: ANCHOR.brickMax.value },
  gyp: { name: "ยิปซัม", easy: ANCHOR.gypMax.value, max: ANCHOR.gypMax.value },
  wood: { name: "ไม้", easy: ANCHOR.woodScrewMax.value, max: ANCHOR.woodMax.value },
};

export function calcScrew(v: Values) {
  const bad = guard("screw", v);
  if (bad) return bad;
  const wall = str(v, "wall", "conc") as AnchorWall;
  const load = num(v, "load", 15);
  const points = Math.max(1, Math.round(num(v, "points", 2)));
  const perPoint = load / points;
  const lim = ANCHOR_LIMITS[wall] ?? ANCHOR_LIMITS.conc;
  const inputRows = [
    { label: "ผนัง", value: lim.name },
    { label: "น้ำหนักรวม", value: `${fmt(load)} กก.` },
    { label: "จำนวนจุดยึด", value: `${points} จุด` },
    { label: "ต่อจุด", value: `${fmt(perPoint, 1)} กก.` },
  ];

  if (perPoint > lim.max) {
    const why =
      wall === "gyp"
        ? "ยิปซัมแผ่นเดียวรับไม่ไหว — ยึดเข้าโครงหรือยึดทะลุถึงผนังจริง"
        : wall === "brick"
          ? "อิฐรับไม่ไหว — ยึดเข้าเสา/คานคอนกรีต หรือใช้พุกเคมีตามตารางผู้ผลิต"
          : "ต้องให้วิศวกรคิด หรือใช้ตารางรับแรงของผู้ผลิตพุก";
    return blockedResult({
      headline: `${lim.name}จุดละ ${fmt(perPoint, 1)} กก. เกินที่ตอบได้ (${lim.max} กก./จุด) — ${why}`,
      rows: [
        ...inputRows,
        { label: "เพดานที่เครื่องมือนี้ตอบ", value: `${lim.max} กก./จุด (${lim.name})` },
        { label: "ทางแก้", value: `เพิ่มจุดยึดให้เหลือไม่เกิน ${lim.max} กก./จุด หรือ${wall === "gyp" || wall === "brick" ? "ย้ายไปยึดโครง/คอนกรีต" : "ใช้ตารางผู้ผลิต"}` },
      ],
      tip: "ของหนักตกแล้วคนเจ็บ — งานนี้ต้องดูตารางรับแรงของพุกรุ่นที่ใช้จริง หรือให้วิศวกรกำหนด",
    });
  }

  const heavy = perPoint > lim.easy;
  const rec =
    wall === "gyp"
      ? `พุกปีกผีเสื้อ ${points} จุด (ไม่เกิน ${lim.max} กก./จุด)`
      : wall === "brick"
        ? "พุกไนลอน S8 ลึก 50 มม. เจาะให้ถึงเนื้ออิฐ อย่ายึดแค่ปูนฉาบ"
        : wall === "wood"
          ? heavy
            ? "สกรูไม้จุดละ 2 ตัวขึ้นไป + แผ่นรับหลังไม้"
            : 'สกรูไม้ 8×2" ยึดเข้าเนื้อไม้จริง ไม่ต้องพุก'
          : heavy
            ? "พุกเหล็ก M8 / M10 — เช็กพิกัดรุ่นที่ใช้ในตารางผู้ผลิต"
            : "พุกพลาสติก S8 + สกรู 8";
  const chartMax = Math.max(lim.max * 1.2, lim.easy * 1.5);
  const zones =
    lim.easy < lim.max
      ? [
          { upTo: lim.easy, tone: "good" as const, label: wall === "wood" ? "สกรูไม้ตัวเดียว" : "พุกพลาสติก S8" },
          { upTo: lim.max, tone: "warn" as const, label: wall === "wood" ? "หลายตัว + แผ่นรับ" : "พุกเหล็ก M8/M10" },
          { upTo: chartMax, tone: "bad" as const, label: "ต้องใช้ตารางผู้ผลิต/วิศวกร" },
        ]
      : [
          { upTo: lim.max, tone: "good" as const, label: `${lim.name} ≤ ${lim.max} กก.` },
          { upTo: chartMax, tone: "bad" as const, label: wall === "gyp" ? "ต้องหาโครง" : "เกินพิกัดอิฐ" },
        ];

  return resultX({
    title: "เลือกพุก + สกรู",
    headline: rec,
    chart: { kind: "threshold", unit: "กก./จุด", value: perPoint, max: chartMax, zones },
    rows: [...inputRows, { label: "แนะนำ", value: rec, emphasize: true }],
    tip: "ทีวีและตู้แขวนหาโครงก่อนเจาะ เผื่อพิกัดอย่างน้อย 2 เท่า และดูพิกัดบนกล่องพุกที่ซื้อจริง",
    explain: {
      risk: "C",
      updatedAt: "2026-11-25",
      summary: "น้ำหนักต่อจุด = น้ำหนักรวม ÷ จำนวนจุดยึด แล้วเทียบพิกัดคร่าวของพุกตามวัสดุผนัง เกินเพดานจะไม่ให้คำแนะนำ",
      steps: [
        {
          label: "น้ำหนักต่อจุดยึด",
          expr: "ต่อจุด = น้ำหนักรวม ÷ จำนวนจุด",
          subst: `${fmt(load)} ÷ ${points} = ${fmt(perPoint, 1)} กก./จุด`,
        },
        {
          label: "เทียบพิกัดวัสดุผนัง",
          expr: `ยิปซัม ≤ ${ANCHOR.gypMax.value} · อิฐ ≤ ${ANCHOR.brickMax.value} · คอนกรีต พุกพลาสติก ≤ ${ANCHOR.concPlasticMax.value} / พุกเหล็ก ≤ ${ANCHOR.concSteelMax.value} · ไม้ สกรูตัวเดียว ≤ ${ANCHOR.woodScrewMax.value} / หลายตัว ≤ ${ANCHOR.woodMax.value} กก./จุด`,
          subst: rec,
        },
      ],
      constants: [
        ANCHOR.gypMax,
        ANCHOR.brickMax,
        ANCHOR.concPlasticMax,
        ANCHOR.concSteelMax,
        ANCHOR.woodScrewMax,
        ANCHOR.woodMax,
      ],
      assumptions: [
        "น้ำหนักกระจายเท่ากันทุกจุดยึด และเป็นแรงเฉือนลงล่าง (ของแขวนชิดผนัง) ไม่ใช่แรงดึงออกจากผนัง",
        "คอนกรีต/อิฐ/ไม้เนื้อดี ไม่ร้าว ไม่ผุ ระยะห่างจากขอบพอ",
      ],
      caveats: [
        "ของยื่นจากผนัง (ชั้นลอย แขนทีวี) เกิดแรงดึงที่จุดบนมากกว่าน้ำหนักหารจำนวนจุด ต้องเผื่อเพิ่ม",
        "พิกัดจริงขึ้นกับรุ่นพุก ความลึกฝัง และสภาพผนัง ให้ดูตารางรับแรงของผู้ผลิตก่อนแขวนของหนัก",
        DISCLAIMER_C,
      ],
      refs: [{ label: "ตารางรับแรงพุกของผู้ผลิต (เช่น Fischer / Hilti) — ใช้รุ่นที่ซื้อจริง" }],
    },
  });
}

export function calcStair(v: Values) {
  const bad = guard("stair", v);
  if (bad) return bad;
  const H = num(v, "H", 3);
  const rTarget = num(v, "r", 17);
  const n = Math.max(2, round((H * 100) / rTarget, 0));
  const R = (H * 100) / n;
  const T = STAIR_LAW.blondel.value - 2 * R;
  const comfortable = T >= 22 && T <= 30 && R >= 15 && R <= 19;
  const legal = R <= STAIR_LAW.riseMax.value && T >= STAIR_LAW.goingMin.value;
  const sum = round(2 * R + T, 1);
  const treads = n - 1;
  const headline = !legal
    ? "ยังไม่ผ่านเกณฑ์กฎหมายเบื้องต้น"
    : comfortable
      ? "เดินสบาย และผ่านเกณฑ์เบื้องต้น"
      : "ผ่านเกณฑ์เบื้องต้น แต่เดินยังไม่สบาย";

  return resultX({
    title: "บันได ลูกตั้ง-ลูกนอน",
    headline,
    chart: {
      kind: "stack",
      parts: [
        { label: "ลูกตั้ง R (×2)", value: 2 * R, display: `${fmt(2 * R, 1)} ซม.`, tone: "accent" },
        { label: "ลูกนอน T", value: Math.max(T, 0), display: `${fmt(T, 1)} ซม.`, tone: T < 0 ? "bad" : "mute" },
      ],
      totalLabel: `2R + T (เป้า ${STAIR_LAW.blondel.value} ซม.)`,
      totalDisplay: `${fmt(sum, 1)} ซม.`,
    },
    rows: [
      { label: "จำนวนลูกตั้ง", value: `${n} ลูก` },
      { label: "จำนวนลูกนอน (ชานพักไม่นับ)", value: `${treads} ลูก` },
      { label: "ลูกตั้ง R", value: `${fmt(R, 1)} ซม.`, emphasize: true },
      { label: "ลูกนอน T", value: `${fmt(T, 1)} ซม.`, emphasize: true },
      { label: "2R + T (Blondel)", value: `${fmt(sum, 1)} ซม. (เป้า ${STAIR_LAW.blondel.value})` },
      { label: "เกณฑ์กฎหมายเบื้องต้น", value: legal ? `ผ่าน (R ≤ ${STAIR_LAW.riseMax.value} ซม., T ≥ ${STAIR_LAW.goingMin.value} ซม.)` : "ยังไม่ผ่าน" },
    ],
    tip: "สูตร Blondel ใช้ดูว่าเดินสบาย แบบก่อสร้างจริงต้องให้สถาปนิก/วิศวะตามกฎกระทรวง",
    explain: {
      risk: "C",
      updatedAt: "2026-08-21",
      summary: "แบ่งความสูงรวมเป็นลูกตั้ง (R) ให้ใกล้ค่าที่ต้องการ แล้วหาลูกนอน (T) จากสูตรก้าวเดินสบาย 2R + T ≈ 63 ซม.",
      steps: [
        {
          label: "จำนวนลูกตั้ง",
          expr: "n = ปัดเศษ(สูงรวม ÷ ลูกตั้งเป้า)",
          subst: `${fmt(H * 100)} ÷ ${fmt(rTarget)} ≈ ${n} ลูก`,
        },
        {
          label: "ลูกตั้งจริงต่อขั้น",
          expr: "R = สูงรวม ÷ จำนวนลูกตั้ง",
          subst: `${fmt(H * 100)} ÷ ${n} = ${fmt(R, 1)} ซม.`,
        },
        {
          label: "ลูกนอนจากสูตรก้าวเดิน",
          expr: `T = ${STAIR_LAW.blondel.value} − 2R`,
          subst: `${STAIR_LAW.blondel.value} − 2×${fmt(R, 1)} = ${fmt(T, 1)} ซม.`,
          note: `${STAIR_LAW.blondel.value} ซม. คือเป้าสูตร Blondel สำหรับก้าวเดินสบาย ไม่ใช่ขนาดในแบบก่อสร้าง`,
        },
      ],
      assumptions: ["บันไดตรงช่วงเดียว ไม่มีชานพักกลาง", "ผู้ใช้เป็นผู้ใหญ่ทั่วไป ไม่ได้ออกแบบเผื่อผู้พิการ/รถเข็น"],
      caveats: [
        `กฎกระทรวงควบคุมอาคาร: ลูกตั้งไม่เกิน ${STAIR_LAW.riseMax.value} ซม. ลูกนอนไม่น้อยกว่า ${STAIR_LAW.goingMin.value} ซม. (อาคารพักอาศัยทั่วไป)`,
        "จำนวนลูกนอน = จำนวนลูกตั้ง − 1 เพราะพื้นบนทำหน้าที่เป็นลูกนอนสุดท้าย",
        "บ้านที่มีผู้สูงอายุควรใช้ลูกตั้งไม่เกิน 17–18 ซม. และมีราวจับทั้งสองข้าง",
        DISCLAIMER_C,
      ],
      refs: [
        { label: "กฎกระทรวงควบคุมอาคาร (ลูกตั้ง-ลูกนอนอาคารพักอาศัย)" },
        { label: "สูตรก้าวเดิน Blondel 2R+T ≈ 63 ซม." },
      ],
    },
  });
}

export const handymanTools: ToolDef[] = [
  {
    id: "hinge",
    name: "ระยะเจาะบานพับถ้วย",
    blurb: "Full overlay แนว Hafele/Blum",
    fields: [
      {
        type: "select",
        key: "overlay",
        label: "ระบบบาน",
        default: "full",
        options: [
          { value: "full", label: "ปิดทับเต็ม" },
          { value: "half", label: "ปิดทับครึ่ง" },
          { value: "inset", label: "บานฝังใน" },
        ],
      },
    ],
    calc: calcHinge,
  },
  {
    id: "hingeqty",
    name: "จำนวนบานพับ + ราง",
    blurb: "ตามสูงบานและลึกตู้",
    fields: [
      { type: "number", key: "doors", label: "จำนวนบาน", unit: "บาน", default: 2, min: 0, max: 50 },
      { type: "number", key: "dh", label: "สูงบาน", unit: "มม.", default: 720, min: 300, max: 2700 },
      { type: "number", key: "drawers", label: "ลิ้นชัก", unit: "ลิ้น", default: 3, min: 0, max: 50 },
      { type: "number", key: "depth", label: "ลึกตู้", unit: "มม.", default: 450, min: 250, max: 1200 },
    ],
    calc: calcHingeQty,
  },
  {
    id: "drawer",
    name: "แบ่งหน้าบานลิ้นชัก",
    blurb: "สูงหน้าบานเท่า ๆ กัน",
    fields: [
      { type: "number", key: "opening", label: "สูงช่องเปิด", unit: "มม.", default: 720, min: 200, max: 3000 },
      { type: "number", key: "n", label: "จำนวนลิ้นชัก", unit: "ลิ้น", default: 4, min: 2, max: 12 },
      { type: "number", key: "gap", label: "ร่องระหว่างบาน", unit: "มม.", default: 3, min: 1, max: 10 },
    ],
    calc: calcDrawer,
  },
  {
    id: "laminate",
    name: "ลามิเนต + กาว + ขอบ",
    blurb: "กี่แผ่น 4×8 ฟุต กาว ขอบ PVC",
    keywords: ["ลามิเนต", "ไม้อัด", "แผ่น 4x8", "ขอบ PVC", "กาวยาง"],
    fields: [
      { type: "number", key: "w", label: "กว้างชิ้นงาน", unit: "ม.", default: 1.2, min: 0.2, max: 5, step: 0.01 },
      { type: "number", key: "h", label: "ยาวชิ้นงาน", unit: "ม.", default: 2.4, min: 0.2, max: 5, step: 0.01 },
      { type: "number", key: "qty", label: "จำนวนชิ้น", unit: "ชิ้น", default: 4, min: 1, max: 1000 },
      { type: "number", key: "waste", label: "เผื่อเสีย", unit: "%", default: 10, min: 0, max: 30 },
    ],
    calc: calcLaminate,
  },
  {
    id: "led",
    name: "หม้อแปลง LED",
    blurb: "ไฟเส้นในตู้",
    fields: [
      { type: "number", key: "m", label: "ความยาวไฟเส้น", unit: "ม.", default: 4, min: 0.1, max: 100, step: 0.1 },
      { type: "number", key: "wpm", label: "วัตต์ต่อเมตร", unit: "W/ม.", default: 12, min: 2, max: 30 },
    ],
    calc: calcLed,
  },
  {
    id: "tile",
    name: "กระเบื้อง + ยาแนว",
    blurb: "งานบิ้วอินชิ้นเล็ก",
    fields: [
      { type: "number", key: "area", label: "พื้นที่", unit: "ตร.ม.", default: 2, min: 0.2, max: 100, step: 0.1 },
      { type: "number", key: "waste", label: "เผื่อเสีย", unit: "%", default: 10, min: 0, max: 30 },
    ],
    calc: calcHandymanTile,
  },
  {
    id: "screw",
    name: "เลือกพุก + สกรู",
    blurb: "ตามชนิดผนัง",
    fields: [
      {
        type: "select",
        key: "wall",
        label: "ผนัง",
        default: "conc",
        options: [
          { value: "conc", label: "คอนกรีต" },
          { value: "brick", label: "อิฐ" },
          { value: "gyp", label: "ยิปซัม" },
          { value: "wood", label: "ไม้" },
        ],
      },
      { type: "number", key: "load", label: "น้ำหนักโดยประมาณ", unit: "กก.", default: 15, min: 1, max: 2000 },
      { type: "number", key: "points", label: "จำนวนจุดยึด", unit: "จุด", default: 2, min: 1, max: 50 },
    ],
    calc: calcScrew,
  },
  {
    id: "stair",
    name: "บันได ลูกตั้ง-ลูกนอน",
    blurb: "เดินสบาย 2R+T ≈ 63",
    fields: [
      { type: "number", key: "H", label: "สูงพื้นถึงพื้น", unit: "ม.", default: 3, min: 1, max: 6, step: 0.01 },
      { type: "number", key: "r", label: "ลูกตั้งเป้า", unit: "ซม.", default: 17, min: 15, max: 22, step: 0.5 },
    ],
    calc: calcStair,
  },
];

export const handymanJob: JobDef = {
  name: "คิดทั้งงานตู้บิ้วอิน",
  blurb: "บานลิ้นชักไฟเส้น ได้ฮาร์ดแวร์คร่าว ๆ",
  fields: [
    { type: "number", key: "doors", label: "บานประตู", unit: "บาน", default: 2, min: 0, max: 50 },
    { type: "number", key: "dh", label: "สูงบาน", unit: "มม.", default: 1800, min: 300, max: 2700 },
    { type: "number", key: "drawers", label: "ลิ้นชัก", unit: "ลิ้น", default: 3, min: 0, max: 50 },
    { type: "number", key: "depth", label: "ลึกตู้", unit: "มม.", default: 500, min: 250, max: 1200 },
    { type: "number", key: "m", label: "ไฟเส้น", unit: "ม.", default: 3, min: 0, max: 100, step: 0.1 },
    { type: "number", key: "wpm", label: "วัตต์/เมตร", default: 12, min: 2, max: 30 },
    {
      type: "select",
      key: "overlay",
      label: "ระบบบาน",
      default: "full",
      options: [
        { value: "full", label: "ปิดทับเต็ม" },
        { value: "half", label: "ครึ่ง" },
        { value: "inset", label: "ฝังใน" },
      ],
    },
  ],
  calc: (input) => {
    const bad = guardInputs(handymanJob.fields, input);
    if (bad) return bad;
    const v = withDefaults(handymanJob.fields, input);
    const hinge = calcHinge(v);
    const qty = calcHingeQty(v);
    const led = num(v, "m", 3) > 0 ? calcLed(v) : null;
    return jobFromParts({
      title: "งานตู้บิ้วอิน",
      headline: "ฮาร์ดแวร์ตู้บิ้วอิน",
      rows: [
        ...hinge.rows.filter((r) => r.emphasize),
        ...qty.rows.filter((r) => r.emphasize),
        ...(led ? led.rows.filter((r) => r.emphasize) : []),
      ],
      tip: "ยังไม่รวมแผ่นปาร์ติเกิลและขอบ ใช้ตัวคิดลามิเนตต่อได้",
      parts: [hinge, qty, ...(led ? [led] : [])],
    });
  },
};
