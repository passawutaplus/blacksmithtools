import type { CalcResult, JobDef, ToolDef, Values } from "../types";
import {
  blockedResult,
  ceil,
  fmt,
  fmtTrim,
  guardInputs,
  guardTool,
  jobFromParts,
  num,
  resultX,
  str,
  withDefaults,
} from "../math";
import { DISCLAIMER_AB, DISCLAIMER_C, MATERIAL, READYMIX, REBAR_SIZES, REBAR_WORK, SLAB, STEEL_FORMULA, WIRE_MESH } from "../constants";
import { calcMix } from "./masonry";
import { packBfd } from "./steel";

const guard = (id: string, v: Values) => guardTool(concreteTools, id, v);

const ENGINEER_NOTE = "ความหนาพื้น ขนาดเหล็ก ระยะปลอก ระยะทาบ และกำลังคอนกรีต ต้องเอาจากแบบ — เครื่องมือนี้นับของจากแบบ ไม่ได้ออกแบบโครงสร้าง ต้องให้วิศวกร";

/* ─────────────── ไวร์เมช ─────────────── */

/** จำนวนแผ่น/แถบที่ต้องวางเรียงให้คลุมระยะ D เมื่อแต่ละแผ่นกว้าง S ทาบกัน lap */
export function sheetsAcross(D: number, S: number, lap: number): number {
  return D <= S ? 1 : ceil((D - lap) / (S - lap));
}

/** แผ่นไวร์เมช: ลองวางทั้งสองทิศ เลือกทิศที่ใช้น้อยกว่า */
export function meshSheets(w: number, l: number, sw: number, sl: number, lap: number) {
  const a = sheetsAcross(w, sw, lap) * sheetsAcross(l, sl, lap);
  const b = sheetsAcross(w, sl, lap) * sheetsAcross(l, sw, lap);
  return { count: Math.min(a, b), turned: b < a };
}

/**
 * ม้วนไวร์เมช: คลี่ตามด้านยาว เรียงแถบตามด้านกว้าง แถบที่ยาวกว่าม้วนต่อกันโดยทาบ
 * แล้วจัดท่อนลงม้วนแบบเดียวกับแผนตัดเหล็ก (ท่อนที่ตัดเหลือจากม้วนหนึ่งใช้ต่อแถบอื่นได้)
 */
export function meshRolls(w: number, l: number, rw: number, rl: number, lap: number) {
  const long = Math.max(w, l);
  const short = Math.min(w, l);
  const strips = sheetsAcross(short, rw, lap);
  const segs = long <= rl ? 1 : ceil((long - lap) / (rl - lap));
  const last = long - (segs - 1) * (rl - lap);
  const pieces: number[] = [];
  for (let i = 0; i < strips; i++) {
    for (let k = 0; k < segs - 1; k++) pieces.push(rl);
    pieces.push(last);
  }
  const metres = pieces.reduce((a, b) => a + b, 0);
  // ทำงานเป็นเซนติเมตรเต็มเพื่อเลี่ยงเศษทศนิยมตอนจัดลงม้วน
  const rolls = packBfd(Math.round(rl * 100), 0, pieces.map((p) => Math.round(p * 100))).bars.length;
  return { strips, metres, rolls };
}

/* ─────────────── เทพื้นคอนกรีต + ไวร์เมช ─────────────── */

export function calcSlab(v: Values): CalcResult {
  const bad = guard("slab", v);
  if (bad) return bad;
  const w = num(v, "w", 4);
  const l = num(v, "l", 6);
  const tCm = num(v, "t", 10);
  const waste = num(v, "waste", SLAB.wastePct.value);
  const supply = str(v, "supply", "readymix");
  const mesh = str(v, "mesh", "sheet");
  const area = w * l;
  const net = area * (tCm / 100);
  const need = net * (1 + waste / 100);

  // คอนกรีต
  let concreteRows: CalcResult["rows"] = [];
  let concreteSteps: NonNullable<CalcResult["explain"]>["steps"] = [];
  let chart: CalcResult["chart"];
  let mixPart: CalcResult | null = null;
  let headConcrete = "";
  if (supply === "site") {
    if (need > SLAB.siteMixMaxM3.value) {
      return blockedResult({
        headline: `คอนกรีต ${fmt(need, 1)} คิว เกินที่คิดผสมเองได้ (${fmt(SLAB.siteMixMaxM3.value)} คิว) — สั่งคอนกรีตผสมเสร็จ`,
        tip: "งานขนาดนี้ผสมเองไม่ทันและกำลังไม่สม่ำเสมอ เปลี่ยนเป็นรถโม่",
      });
    }
    mixPart = calcMix({ m3: need, ratio: str(v, "ratio", "124"), bag: str(v, "bag", "50") });
    if (mixPart.invalid) return mixPart;
    concreteRows = mixPart.rows.filter((r) => r.label !== "งานคอนกรีต");
    headConcrete = mixPart.headline ?? "";
    chart = mixPart.chart;
  } else {
    const truck = num(v, "truck", READYMIX.truckM3.value);
    const step = READYMIX.orderStep.value;
    const order = ceil(need / step) * step;
    const trucks = ceil(order / truck);
    const lastLoad = order - (trucks - 1) * truck;
    const small = order < READYMIX.smallLoadM3.value;
    headConcrete = `สั่ง ${fmtTrim(order, 2)} คิว · รถโม่ ${fmt(trucks)} เที่ยว`;
    chart = { kind: "packs", unitLabel: `รถโม่ ${fmtTrim(truck, 1)} คิว`, count: trucks, lastUsed: lastLoad / truck, note: `เที่ยวสุดท้าย ${fmtTrim(lastLoad, 2)} คิว` };
    concreteRows = [
      { label: "สั่งคอนกรีตผสมเสร็จ", value: `${fmtTrim(order, 2)} คิว (สั่งทีละ ${fmtTrim(step, 2)} คิว)`, emphasize: true },
      {
        label: "รถโม่",
        value: trucks === 1 ? `1 เที่ยว (${fmtTrim(order, 2)} คิว)` : `${fmt(trucks)} เที่ยว (เต็ม ${fmt(trucks - 1)} เที่ยว + เที่ยวสุดท้าย ${fmtTrim(lastLoad, 2)} คิว)`,
        emphasize: true,
      },
      ...(small ? [{ label: "ข้อควรระวัง", value: `สั่งน้อยกว่า ${fmt(READYMIX.smallLoadM3.value)} คิว หลายโรงคิดค่ารถเพิ่ม — ถามโรงก่อน หรือผสมเอง` }] : []),
    ];
    concreteSteps = [
      {
        label: "ปัดเป็นขั้นที่โรงรับสั่ง",
        expr: `สั่ง = ปัดขึ้น(ที่ต้องใช้ ÷ ${fmtTrim(step, 2)}) × ${fmtTrim(step, 2)}`,
        subst: `${fmt(need, 3)} → ${fmtTrim(order, 2)} คิว`,
      },
      {
        label: "จำนวนเที่ยวรถ",
        expr: "เที่ยว = ปัดขึ้น(สั่ง ÷ คันละ)",
        subst: `${fmtTrim(order, 2)} ÷ ${fmtTrim(truck, 1)} = ${fmt(trucks)} เที่ยว`,
      },
    ];
  }

  // ไวร์เมช
  const lapM = num(v, "lap", WIRE_MESH.lapCm.value) / 100;
  let meshRows: CalcResult["rows"] = [];
  let meshSteps: NonNullable<CalcResult["explain"]>["steps"] = [];
  let headMesh = "";
  if (mesh === "sheet") {
    const sw = num(v, "sw", WIRE_MESH.sheetW.value);
    const sl = num(v, "sl", WIRE_MESH.sheetL.value);
    if (lapM >= Math.min(sw, sl)) {
      return blockedResult({ headline: "ระยะทาบยาวกว่าแผ่นไวร์เมช — ตรวจขนาดแผ่นกับระยะทาบ", tip: "ระยะทาบใส่เป็น ซม. ขนาดแผ่นใส่เป็น ม." });
    }
    const m = meshSheets(w, l, sw, sl, lapM);
    headMesh = `ไวร์เมช ${fmt(m.count)} แผ่น`;
    meshRows = [
      { label: `ไวร์เมชแผ่น ${fmtTrim(sw, 2)}×${fmtTrim(sl, 2)} ม.`, value: `${fmt(m.count)} แผ่น (ทาบ ${fmtTrim(lapM * 100)} ซม.)`, emphasize: true },
    ];
    meshSteps = [
      {
        label: "แผ่นไวร์เมช",
        expr: "แผ่นต่อแนว = ปัดขึ้น((ระยะ − ทาบ) ÷ (ขนาดแผ่น − ทาบ)) · ลองวางสองทิศ เอาทิศที่น้อยกว่า",
        subst: `${fmtTrim(w, 2)}×${fmtTrim(l, 2)} ม. แผ่น ${fmtTrim(sw, 2)}×${fmtTrim(sl, 2)} ม. ทาบ ${fmtTrim(lapM, 2)} ม. → ${fmt(m.count)} แผ่น${m.turned ? " (วางแผ่นตามด้านกว้าง)" : ""}`,
      },
    ];
  } else if (mesh === "roll") {
    const rw = num(v, "rw", WIRE_MESH.rollW.value);
    const rl = num(v, "rl", WIRE_MESH.rollL.value);
    if (lapM >= Math.min(rw, rl)) {
      return blockedResult({ headline: "ระยะทาบยาวกว่าหน้ากว้างม้วนไวร์เมช — ตรวจขนาดม้วนกับระยะทาบ", tip: "ระยะทาบใส่เป็น ซม. ขนาดม้วนใส่เป็น ม." });
    }
    const m = meshRolls(w, l, rw, rl, lapM);
    headMesh = `ไวร์เมช ${fmt(m.rolls)} ม้วน`;
    meshRows = [
      {
        label: `ไวร์เมชม้วน ${fmtTrim(rw, 2)}×${fmtTrim(rl, 1)} ม.`,
        value: `${fmt(m.rolls)} ม้วน (คลี่ ${fmt(m.strips)} แถบ รวม ${fmt(m.metres, 1)} ม. ทาบ ${fmtTrim(lapM * 100)} ซม.)`,
        emphasize: true,
      },
    ];
    meshSteps = [
      {
        label: "ม้วนไวร์เมช",
        expr: "แถบ = ปัดขึ้น((ด้านสั้น − ทาบ) ÷ (กว้างม้วน − ทาบ)) · แต่ละแถบยาวเท่าด้านยาว แล้วจัดลงม้วน",
        subst: `${fmt(m.strips)} แถบ × ${fmtTrim(Math.max(w, l), 2)} ม. = ${fmt(m.metres, 1)} ม. → ${fmt(m.rolls)} ม้วน`,
      },
    ];
  }

  const risk = supply === "site" ? "C" : "B";
  return resultX({
    title: "เทพื้นคอนกรีต",
    headline: [headConcrete, headMesh].filter(Boolean).join(" · "),
    chart,
    rows: [
      { label: "พื้นที่", value: `${fmtTrim(w, 2)} × ${fmtTrim(l, 2)} ม. = ${fmt(area, 2)} ตร.ม. หนา ${fmtTrim(tCm, 1)} ซม.` },
      { label: "คอนกรีตสุทธิ", value: `${fmt(net, 2)} คิว` },
      { label: `รวมเผื่อ ${fmtTrim(waste, 1)}%`, value: `${fmt(need, 2)} คิว` },
      ...concreteRows,
      ...meshRows,
    ],
    tip:
      supply === "site"
        ? "ผสมเองเกิน 2–3 คิวเหนื่อยและกำลังไม่สม่ำเสมอ เทียบราคารถโม่ก่อน · หนุนไวร์เมชด้วยลูกปูนให้อยู่กลางแผ่น อย่าวางติดดิน"
        : "จองรถโม่ล่วงหน้า บอกโรงว่าเทพื้นกี่คิว ทางรถเข้าถึงไหม · หนุนไวร์เมชด้วยลูกปูน อย่าวางติดดิน",
    explain: {
      risk,
      updatedAt: "2026-11-25",
      summary: "คอนกรีต (คิว) = กว้าง × ยาว × หนา แล้วบวกเผื่อ · ไวร์เมชนับแผ่น/ม้วนจากขนาดที่ขาย หักระยะทาบ",
      steps: [
        {
          label: "ปริมาตรคอนกรีต",
          expr: "คิว = กว้าง × ยาว × หนา(ม.)",
          subst: `${fmtTrim(w, 2)} × ${fmtTrim(l, 2)} × ${fmtTrim(tCm / 100, 3)} = ${fmt(net, 3)} คิว`,
        },
        {
          label: "เผื่อเสีย",
          expr: "ที่ต้องใช้ = สุทธิ × (1 + เผื่อ%)",
          subst: `${fmt(net, 3)} × ${fmtTrim(1 + waste / 100, 3)} = ${fmt(need, 3)} คิว`,
        },
        ...concreteSteps,
        ...(mixPart?.explain?.steps ?? []),
        ...meshSteps,
      ],
      constants: [
        SLAB.wastePct,
        ...(supply === "site" ? (mixPart?.explain?.constants ?? []) : [READYMIX.truckM3, READYMIX.orderStep, READYMIX.smallLoadM3]),
        ...(mesh === "sheet" ? [WIRE_MESH.sheetW, WIRE_MESH.sheetL, WIRE_MESH.lapCm] : mesh === "roll" ? [WIRE_MESH.rollW, WIRE_MESH.rollL, WIRE_MESH.lapCm] : []),
      ],
      assumptions: [
        "พื้นสี่เหลี่ยมหนาเท่ากันทั้งแผ่น ไม่รวมคานคอดิน/ขอบหนาที่ต้องเทพร้อมกัน",
        ...(mesh !== "none" ? ["ไวร์เมชคลุมเต็มพื้นที่ ไม่หักระยะหุ้มขอบ (ได้ค่าเผื่อเล็กน้อย)"] : []),
        ...(mixPart?.explain?.assumptions ?? []),
      ],
      caveats: [
        ENGINEER_NOTE,
        "พื้นรับรถ พื้นโรงงาน หรือพื้นชั้นบน (ไม่ได้วางบนดิน) เป็นงานโครงสร้าง ความหนาและเหล็กเสริมต้องให้วิศวกรกำหนด",
        ...(supply === "site" ? (mixPart?.explain?.caveats ?? [DISCLAIMER_C]) : [DISCLAIMER_AB]),
      ],
      refs: [
        { label: "มอก. 213 คอนกรีตผสมเสร็จ · มอก. 737 ลวดเหล็กกล้าเชื่อมติดเป็นตะแกรง (ไวร์เมช)" },
        ...(mixPart?.explain?.refs ?? []),
      ],
    },
  });
}

/* ─────────────── เหล็กเส้น + ปลอก ─────────────── */

function kgmOfBar(key: string): number {
  const d = (REBAR_SIZES[key] ?? REBAR_SIZES.DB12).d;
  return MATERIAL.rebarFactor.value * d * d;
}

/** ท่อนของเหล็กยืนหนึ่งเส้นยาว L เมื่อเส้นที่ขายยาว S ต้องต่อทาบ lap (ม.) */
export function barPieces(L: number, S: number, lap: number): number[] {
  if (L <= S) return [L];
  const k = ceil((L - lap) / (S - lap));
  return [...new Array<number>(k - 1).fill(S), L - (k - 1) * (S - lap)];
}

/** จัดท่อนลงเส้นยาว S (ม.) — คิดเป็นมิลลิเมตรเต็ม ไม่เผื่อรอยตัด (ตัดด้วยกรรไกร/เครื่องตัดเหล็กเส้น) */
function sticksFor(S: number, pieces: number[]): number {
  return pieces.length ? packBfd(Math.round(S * 1000), 0, pieces.map((p) => Math.round(p * 1000))).bars.length : 0;
}

export function calcRebar(v: Values): CalcResult {
  const bad = guard("rebar", v);
  if (bad) return bad;
  const mode = str(v, "mode", "beam");
  const barKey = str(v, "bar", "DB12") in REBAR_SIZES ? str(v, "bar", "DB12") : "DB12";
  const d = REBAR_SIZES[barKey].d;
  const kgm = kgmOfBar(barKey);
  const price = num(v, "price", 0);
  const stocks = [STEEL_FORMULA.rebarStock.value, REBAR_WORK.stock12.value];

  if (mode === "total") {
    const total = num(v, "total", 100);
    const usedKg = total * kgm;
    const buys = stocks.map((S) => {
      const n = ceil(total / S);
      return { S, n, kg: n * S * kgm };
    });
    return resultX({
      title: "เหล็กเส้น",
      headline: `${barKey} ${fmt(buys[0].n)} เส้น (10 ม.) · ${fmt(buys[0].kg, 1)} กก.`,
      rows: [
        { label: "ยาวรวม", value: `${fmt(total, 1)} ม. ${barKey} (${fmt(kgm, 3)} กก./ม.)` },
        ...buys.map((b, i) => ({
          label: `เส้นยาว ${fmt(b.S)} ม.`,
          value: `${fmt(b.n)} เส้น · ${fmt(b.kg, 1)} กก.${price > 0 ? ` · ${fmt(b.kg * price)} บาท` : ""}`,
          emphasize: i === 0,
        })),
        { label: "เนื้อเหล็กที่ใช้จริง", value: `${fmt(usedKg, 1)} กก.` },
      ],
      tip: "ยาวรวมต้องรวมระยะทาบและงอปลายมาแล้ว ถ้าอยากให้คิดทาบ/ปลอกให้ เลือกแบบ \"คาน/เสา × จำนวน\"",
      explain: {
        risk: "B",
        updatedAt: "2026-11-25",
        summary: "เส้นที่ซื้อ = ปัดขึ้น(ยาวรวม ÷ ยาวต่อเส้น) · น้ำหนัก = เส้น × ยาวต่อเส้น × 0.006165 × Ø²",
        steps: [
          { label: "น้ำหนักต่อเมตร", expr: "กก./ม. = 0.006165 × Ø²", subst: `0.006165 × ${fmt(d)}² = ${fmt(kgm, 3)} กก./ม.` },
          ...buys.map((b) => ({
            label: `เส้น ${fmt(b.S)} ม.`,
            expr: `เส้น = ปัดขึ้น(ยาวรวม ÷ ${fmt(b.S)})`,
            subst: `${fmt(total, 1)} ÷ ${fmt(b.S)} → ${fmt(b.n)} เส้น × ${fmt(b.S)} × ${fmt(kgm, 3)} = ${fmt(b.kg, 1)} กก.`,
          })),
        ],
        constants: [MATERIAL.rebarFactor, STEEL_FORMULA.rebarStock, REBAR_WORK.stock12],
        assumptions: ["ยาวรวมที่กรอกรวมระยะทาบ/งอแล้ว · นับแบบต่อเศษได้ (ไม่ได้จัดท่อนตามแบบตัด)"],
        caveats: [ENGINEER_NOTE, "ตัดเป็นท่อนสั้นจริงจะมีเศษ ใช้เครื่องมือวางแผนตัดถ้ารู้ความยาวท่อน", DISCLAIMER_AB],
        refs: [{ label: "มอก. 20 เหล็กเส้นกลม · มอก. 24 เหล็กข้ออ้อย" }],
      },
    });
  }

  // คาน/เสา × จำนวน
  const L = num(v, "L", 4);
  const count = Math.round(num(v, "count", 4));
  const nbar = Math.round(num(v, "nbar", 4));
  const lapD = num(v, "lapD", REBAR_WORK.lapD.value);
  const lap = (lapD * d) / 1000;
  const stirKey = str(v, "stir", "RB6");
  const hasStir = stirKey in REBAR_SIZES;
  const bMm = num(v, "b", 20) * 10;
  const hMm = num(v, "h", 40) * 10;
  const cMm = num(v, "cover", REBAR_WORK.coverCm.value) * 10;
  const sM = num(v, "s", 20) / 100;

  const mainPieces = (S: number) => {
    const one = barPieces(L, S, lap);
    return Array.from({ length: count * nbar }, () => one).flat();
  };

  let stir: { ds: number; kgm: number; len: number; per: number; total: number; hook: number } | null = null;
  if (hasStir) {
    const ds = REBAR_SIZES[stirKey].d;
    const innerB = bMm - 2 * cMm;
    const innerH = hMm - 2 * cMm;
    if (innerB <= 2 * (ds + d) || innerH <= 2 * (ds + d)) {
      return blockedResult({
        headline: `หน้าตัด ${fmtTrim(bMm / 10)}×${fmtTrim(hMm / 10)} ซม. หักระยะหุ้ม ${fmtTrim(cMm / 10)} ซม. แล้วไม่พอใส่ปลอกกับเหล็กยืน`,
        tip: "ตรวจขนาดหน้าตัดกับระยะหุ้มอีกครั้ง หน้าตัดใส่เป็น ซม.",
      });
    }
    const hook = Math.max(REBAR_WORK.hookD.value * ds, REBAR_WORK.hookMinMm.value);
    const len = (2 * (innerB + innerH) + 2 * hook) / 1000;
    const per = ceil(L / sM) + 1;
    stir = { ds, kgm: kgmOfBar(stirKey), len, per, total: per * count, hook };
  }

  const main = stocks.map((S) => {
    const pieces = mainPieces(S);
    const n = sticksFor(S, pieces);
    return { S, n, kg: n * S * kgm, laps: pieces.length - count * nbar };
  });
  const stirBuy = stir
    ? stocks.map((S) => {
        const n = sticksFor(S, new Array<number>(stir.total).fill(stir.len));
        return { S, n, kg: n * S * stir.kgm };
      })
    : [];
  const ties = stir ? stir.total * nbar : 0;
  const tieKg = ties * REBAR_WORK.tieLenM.value * MATERIAL.rebarFactor.value * REBAR_WORK.tieWireD.value ** 2;
  const usedMain = count * nbar * L * kgm;
  const usedStir = stir ? stir.total * stir.len * stir.kgm : 0;
  const buyKg = (i: number) => main[i].kg + (stirBuy[i]?.kg ?? 0);

  return resultX({
    title: "เหล็กเส้น + ปลอก",
    headline: `${barKey} ${fmt(main[0].n)} เส้น${stir ? ` · ${stirKey} ${fmt(stirBuy[0].n)} เส้น (ปลอก ${fmt(stir.total)} ตัว)` : ""} — เส้นละ 10 ม.`,
    chart: stir
      ? {
          kind: "stack",
          parts: [
            { label: `เหล็กยืน ${barKey}`, value: main[0].kg, display: `${fmt(main[0].kg, 1)} กก.`, tone: "accent" },
            { label: `ปลอก ${stirKey}`, value: stirBuy[0].kg, display: `${fmt(stirBuy[0].kg, 1)} กก.`, tone: "mute" },
          ],
          totalLabel: "เหล็กที่ซื้อ (เส้น 10 ม.)",
          totalDisplay: `${fmt(buyKg(0), 1)} กก.`,
        }
      : undefined,
    rows: [
      { label: "งาน", value: `${fmt(count)} ตัว × ยาว ${fmtTrim(L, 2)} ม. · เหล็กยืน ${barKey} ${fmt(nbar)} เส้น/ตัว` },
      ...(main[0].laps > 0 || main[1].laps > 0
        ? [{ label: "ต่อทาบ", value: `ยาวเกินเส้น ต่อทาบ ${fmtTrim(lapD)}Ø = ${fmt(lap * 100)} ซม. ต่อจุด` }]
        : []),
      ...main.map((m, i) => ({
        label: `เหล็กยืน ${barKey} เส้น ${fmt(m.S)} ม.`,
        value: `${fmt(m.n)} เส้น · ${fmt(m.kg, 1)} กก.`,
        emphasize: i === 0,
      })),
      ...(stir
        ? [
            {
              label: `ปลอก ${stirKey}`,
              value: `${fmt(stir.total)} ตัว (ตัวละ ${fmt(stir.per)} ปลอก ทุก ${fmtTrim(sM * 100)} ซม.) · ยาวตัดปลอกละ ${fmt(stir.len * 100, 1)} ซม.`,
              emphasize: true,
            },
            ...stirBuy.map((m, i) => ({ label: `ปลอก ${stirKey} เส้น ${fmt(m.S)} ม.`, value: `${fmt(m.n)} เส้น · ${fmt(m.kg, 1)} กก.`, emphasize: i === 0 })),
            {
              label: "ลวดผูกเหล็ก",
              value: `${fmt(tieKg, 2)} กก. → ซื้อ ${fmt(ceil(tieKg))} กก. (${fmt(ties)} จุดผูก)`,
            },
          ]
        : []),
      {
        label: "น้ำหนักที่ซื้อ",
        value: `เส้น 10 ม. ${fmt(buyKg(0), 1)} กก. · เส้น 12 ม. ${fmt(buyKg(1), 1)} กก. (เนื้อที่ใช้จริง ${fmt(usedMain + usedStir, 1)} กก.)`,
        emphasize: true,
      },
      ...(price > 0 ? [{ label: "ราคาประมาณ", value: `${fmt(buyKg(0) * price)} บาท (เส้น 10 ม. · ${fmtTrim(price, 2)} บาท/กก.)`, emphasize: true }] : []),
    ],
    tip: "เทียบเส้น 10 กับ 12 ม. แล้วเลือกที่เศษน้อย · ปลอกตัดตามความยาวที่บอกแล้วดัดขอ 135° ทั้งสองปลาย",
    explain: {
      risk: "B",
      updatedAt: "2026-11-25",
      summary: "นับท่อนเหล็กยืน (ต่อทาบเมื่อยาวเกินเส้น) และปลอกจากระยะที่กรอก แล้วจัดท่อนลงเส้น 10 ม. และ 12 ม. แบบเศษน้อย (Best Fit Decreasing)",
      steps: [
        { label: "น้ำหนักต่อเมตร", expr: "กก./ม. = 0.006165 × Ø²", subst: `${barKey}: 0.006165 × ${fmt(d)}² = ${fmt(kgm, 3)} กก./ม.` },
        {
          label: "ท่อนเหล็กยืน",
          expr: "ยาวไม่เกินเส้น = 1 ท่อน · ยาวเกิน: ท่อน = ปัดขึ้น((ยาว − ทาบ) ÷ (ยาวเส้น − ทาบ)) · ทาบ = เท่าของ Ø × Ø",
          subst: `${fmt(count * nbar)} เส้น × ยาว ${fmtTrim(L, 2)} ม. · ทาบ ${fmtTrim(lapD)} × ${fmt(d)} มม. = ${fmt(lap, 2)} ม. → เส้น 10 ม. ${fmt(main[0].n)} เส้น · เส้น 12 ม. ${fmt(main[1].n)} เส้น`,
        },
        ...(stir
          ? [
              {
                label: "ความยาวตัดปลอก",
                expr: "ปลอก = 2 × [(กว้าง − 2 × หุ้ม) + (สูง − 2 × หุ้ม)] + 2 × ขอ (ขอ = 6Ø ไม่น้อยกว่า 75 มม.)",
                subst: `2 × [(${fmt(bMm)} − ${fmt(2 * cMm)}) + (${fmt(hMm)} − ${fmt(2 * cMm)})] + 2 × ${fmt(stir.hook)} = ${fmt(stir.len * 1000)} มม.`,
              },
              {
                label: "จำนวนปลอก",
                expr: "ต่อตัว = ปัดขึ้น(ยาว ÷ ระยะปลอก) + 1",
                subst: `ปัดขึ้น(${fmtTrim(L, 2)} ÷ ${fmtTrim(sM, 2)}) + 1 = ${fmt(stir.per)} × ${fmt(count)} ตัว = ${fmt(stir.total)} ปลอก`,
              },
              {
                label: "ลวดผูก",
                expr: `จุดผูก = ปลอก × เหล็กยืน · กก. = จุด × ${REBAR_WORK.tieLenM.value} ม. × 0.006165 × ${REBAR_WORK.tieWireD.value}²`,
                subst: `${fmt(stir.total)} × ${fmt(nbar)} = ${fmt(ties)} จุด → ${fmt(tieKg, 2)} กก.`,
              },
            ]
          : []),
      ],
      constants: [
        MATERIAL.rebarFactor,
        STEEL_FORMULA.rebarStock,
        REBAR_WORK.stock12,
        REBAR_WORK.lapD,
        ...(stir ? [REBAR_WORK.hookD, REBAR_WORK.hookMinMm, REBAR_WORK.coverCm, REBAR_WORK.tieWireD, REBAR_WORK.tieLenM] : []),
      ],
      assumptions: [
        "เหล็กยืนเส้นตรงยาวเท่าคาน/เสา ยังไม่รวมงอปลาย ขอฉาก หรือฝังเข้าเสา/ฐาน — เผื่อเพิ่มตามแบบ",
        "ปลอกสี่เหลี่ยมปิด ขอ 135° สองปลาย ไม่หักระยะดัดโค้ง (ได้ยาวเกินเล็กน้อย)",
        "ตัดด้วยกรรไกร/เครื่องตัดเหล็กเส้น ไม่เผื่อรอยตัด",
        "ผูกทุกจุดที่ปลอกตัดกับเหล็กยืน",
      ],
      caveats: [ENGINEER_NOTE, DISCLAIMER_AB],
      refs: [{ label: "มอก. 20 เหล็กเส้นกลม · มอก. 24 เหล็กข้ออ้อย" }, { label: "ACI 318 ข้อ 25.3.2 ขอปลอก 135°" }],
    },
  });
}

/* ─────────────── ทะเบียนเครื่องมือ ─────────────── */

const SLAB_FIELDS: ToolDef["fields"] = [
  { type: "number", key: "w", label: "กว้าง", unit: "ม.", default: 4, min: 1, max: 100, step: 0.1 },
  { type: "number", key: "l", label: "ยาว", unit: "ม.", default: 6, min: 1, max: 100, step: 0.1 },
  { type: "number", key: "t", label: "หนา", unit: "ซม.", default: 10, min: 5, max: 40, step: 0.5 },
  { type: "number", key: "waste", label: "เผื่อคอนกรีต", unit: "%", default: SLAB.wastePct.value, min: 0, max: 30, step: 1 },
  {
    type: "select",
    key: "supply",
    label: "คอนกรีต",
    default: "readymix",
    options: [
      { value: "readymix", label: "สั่งรถโม่ (ผสมเสร็จ)" },
      { value: "site", label: "ผสมเองหน้างาน" },
    ],
  },
  { type: "number", key: "truck", label: "รถโม่คันละ", unit: "คิว", default: READYMIX.truckM3.value, min: 1, max: 12, step: 0.5, when: { key: "supply", is: "readymix" } },
  {
    type: "select",
    key: "ratio",
    label: "สัดส่วน ปูน:ทราย:หิน",
    default: "124",
    when: { key: "supply", is: "site" },
    options: [
      { value: "124", label: "1:2:4 งานบ้าน" },
      { value: "112", label: "1:1:2 งานเข้ม" },
      { value: "136", label: "1:3:6 งานไม่รับแรง" },
    ],
  },
  {
    type: "select",
    key: "bag",
    label: "ถุงปูนซีเมนต์",
    default: "50",
    when: { key: "supply", is: "site" },
    options: [
      { value: "50", label: "ถุง 50 กก." },
      { value: "40", label: "ถุง 40 กก." },
    ],
  },
  {
    type: "select",
    key: "mesh",
    label: "ไวร์เมช",
    default: "sheet",
    options: [
      { value: "sheet", label: "แบบแผ่น" },
      { value: "roll", label: "แบบม้วน" },
      { value: "none", label: "ไม่ใช้" },
    ],
  },
  { type: "number", key: "sw", label: "แผ่นกว้าง", unit: "ม.", default: WIRE_MESH.sheetW.value, min: 1, max: 3, step: 0.1, when: { key: "mesh", is: "sheet" } },
  { type: "number", key: "sl", label: "แผ่นยาว", unit: "ม.", default: WIRE_MESH.sheetL.value, min: 1, max: 12, step: 0.1, when: { key: "mesh", is: "sheet" } },
  { type: "number", key: "rw", label: "ม้วนกว้าง", unit: "ม.", default: WIRE_MESH.rollW.value, min: 1, max: 3, step: 0.1, when: { key: "mesh", is: "roll" } },
  { type: "number", key: "rl", label: "ม้วนยาว", unit: "ม.", default: WIRE_MESH.rollL.value, min: 5, max: 100, step: 1, when: { key: "mesh", is: "roll" } },
  { type: "number", key: "lap", label: "ระยะทาบไวร์เมช", unit: "ซม.", default: WIRE_MESH.lapCm.value, min: 10, max: 50, step: 1, when: { key: "mesh", is: ["sheet", "roll"] } },
];

const STIR_ON = { key: "mode", is: "beam", and: { key: "stir", is: ["RB6", "RB9", "DB10", "DB12"] } };

const REBAR_FIELDS: ToolDef["fields"] = [
  {
    type: "select",
    key: "mode",
    label: "รู้อะไร",
    default: "beam",
    options: [
      { value: "beam", label: "คาน/เสา × จำนวน" },
      { value: "total", label: "ความยาวรวม" },
    ],
  },
  {
    type: "select",
    key: "bar",
    label: "เหล็กยืน",
    default: "DB12",
    options: Object.entries(REBAR_SIZES).map(([value, r]) => ({ value, label: r.label })),
  },
  { type: "number", key: "total", label: "ยาวรวม (รวมทาบแล้ว)", unit: "ม.", default: 100, min: 1, max: 100000, step: 0.5, when: { key: "mode", is: "total" } },
  { type: "number", key: "L", label: "ยาวคาน/เสา ตัวละ", unit: "ม.", default: 4, min: 0.5, max: 30, step: 0.1, when: { key: "mode", is: "beam" } },
  { type: "number", key: "count", label: "จำนวน", unit: "ตัว", default: 4, min: 1, max: 500, when: { key: "mode", is: "beam" } },
  { type: "number", key: "nbar", label: "เหล็กยืนต่อตัว", unit: "เส้น", default: 4, min: 2, max: 24, when: { key: "mode", is: "beam" } },
  { type: "number", key: "lapD", label: "ระยะทาบ (เท่าของ Ø)", unit: "เท่า", default: REBAR_WORK.lapD.value, min: 20, max: 80, when: { key: "mode", is: "beam" } },
  {
    type: "select",
    key: "stir",
    label: "เหล็กปลอก",
    default: "RB6",
    when: { key: "mode", is: "beam" },
    options: [
      { value: "RB6", label: "RB6 (2 หุน)" },
      { value: "RB9", label: "RB9 (3 หุน)" },
      { value: "DB10", label: "DB10" },
      { value: "DB12", label: "DB12" },
      { value: "none", label: "ไม่คิดปลอก" },
    ],
  },
  { type: "number", key: "s", label: "ปลอกทุก", unit: "ซม.", default: 20, min: 5, max: 40, step: 0.5, when: STIR_ON },
  { type: "number", key: "b", label: "หน้าตัดกว้าง", unit: "ซม.", default: 20, min: 10, max: 100, step: 0.5, when: STIR_ON },
  { type: "number", key: "h", label: "หน้าตัดสูง", unit: "ซม.", default: 40, min: 10, max: 150, step: 0.5, when: STIR_ON },
  { type: "number", key: "cover", label: "คอนกรีตหุ้มเหล็ก", unit: "ซม.", default: REBAR_WORK.coverCm.value, min: 1.5, max: 7.5, step: 0.5, when: STIR_ON },
  { type: "number", key: "price", label: "ราคาเหล็ก (ไม่ใส่ก็ได้)", unit: "บาท/กก.", default: 0, min: 0, max: 1000, step: 0.5 },
];

export const concreteTools: ToolDef[] = [
  {
    id: "slab",
    name: "เทพื้นคอนกรีต + ไวร์เมช",
    blurb: "กี่คิว รถโม่กี่เที่ยว หรือปูน-ทราย-หิน · ไวร์เมชกี่แผ่น",
    keywords: ["เทพื้น", "ไวร์เมช", "wire mesh", "รถโม่", "คอนกรีตผสมเสร็จ", "คิว"],
    fields: SLAB_FIELDS,
    calc: calcSlab,
  },
  {
    id: "rebar",
    name: "เหล็กเส้น + ปลอก",
    blurb: "เส้น 10/12 ม. กก. จำนวนปลอก ลวดผูก",
    keywords: ["เหล็กเส้น", "ปลอก", "เหล็กปลอก", "ลวดผูก", "คานคอดิน", "ข้ออ้อย"],
    fields: REBAR_FIELDS,
    calc: calcRebar,
  },
];

/* ─────────────── คิดทั้งงานเทพื้น ─────────────── */

export const concreteJob: JobDef = {
  name: "คิดทั้งงานเทพื้น",
  blurb: "ทรายรองพื้น ไม้แบบข้าง ไวร์เมช คอนกรีต ในใบเดียว",
  fields: [
    ...SLAB_FIELDS,
    { type: "number", key: "sand", label: "ทรายรองพื้นหนา (0 = ไม่มี)", unit: "ซม.", default: 5, min: 0, max: 30, step: 1 },
  ],
  calc: (input) => {
    const bad = guardInputs(concreteJob.fields, input);
    if (bad) return bad;
    const v = withDefaults(concreteJob.fields, input);
    const slab = calcSlab(v);
    if (slab.invalid) return jobFromParts({ title: "งานเทพื้น", headline: "", rows: [], tip: "", parts: [slab] });
    const w = num(v, "w", 4);
    const l = num(v, "l", 6);
    const tCm = num(v, "t", 10);
    const sandCm = num(v, "sand", 5);
    const perimeter = 2 * (w + l);
    const sandM3 = w * l * (sandCm / 100) * SLAB.sandBedFactor.value;
    const prep = resultX({
      title: "งานเตรียมพื้น",
      rows: [
        ...(sandCm > 0 ? [{ label: `ทรายรองพื้น ${fmtTrim(sandCm)} ซม. (บดอัด)`, value: `${fmt(sandM3, 2)} คิว (ทรายหลวม)`, emphasize: true }] : []),
        { label: "ไม้แบบข้าง", value: `ยาวรอบ ${fmt(perimeter, 1)} ม. สูงไม่น้อยกว่า ${fmtTrim(tCm)} ซม.` },
      ],
      tip: "",
      explain: {
        risk: "A",
        updatedAt: "2026-11-25",
        summary: "ทรายรองพื้น = พื้นที่ × หนา × ตัวคูณยุบตัว · ไม้แบบข้าง = เส้นรอบรูป",
        steps: [
          ...(sandCm > 0
            ? [
                {
                  label: "ทรายรองพื้น",
                  expr: `คิว = กว้าง × ยาว × หนา × ${SLAB.sandBedFactor.value}`,
                  subst: `${fmtTrim(w, 2)} × ${fmtTrim(l, 2)} × ${fmtTrim(sandCm / 100, 2)} × ${SLAB.sandBedFactor.value} = ${fmt(sandM3, 2)} คิว`,
                },
              ]
            : []),
          { label: "ไม้แบบข้าง", expr: "ยาว = 2 × (กว้าง + ยาว)", subst: `2 × (${fmtTrim(w, 2)} + ${fmtTrim(l, 2)}) = ${fmt(perimeter, 1)} ม.` },
        ],
        constants: sandCm > 0 ? [SLAB.sandBedFactor] : [],
        assumptions: ["เทแปลงเดียวสี่เหลี่ยม ตั้งไม้แบบรอบแปลง (ถ้าชนผนัง/คานเดิม หักด้านนั้นออกเอง)"],
        caveats: [DISCLAIMER_AB],
      },
    });
    return jobFromParts({
      title: "งานเทพื้น",
      headline: slab.headline ?? "งานเทพื้น",
      rows: [...prep.rows, ...slab.rows.filter((r) => r.emphasize || r.label === "ข้อควรระวัง")],
      tip: "ลำดับงาน: บดอัดดิน → ทรายรองพื้น → พลาสติกกันชื้น → ไวร์เมชบนลูกปูน → เทคอนกรีต → บ่มน้ำ 7 วัน",
      parts: [slab, prep],
    });
  },
};
