import type { CalcResult, Field, JobDef, ToolDef, Values } from "../types";
import {
  blockedResult,
  bool,
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
import { DISCLAIMER_AB, DISCLAIMER_C, FORMWORK, MATERIAL, MEMBERS, READYMIX, REBAR_SIZES, REBAR_WORK, SLAB, STEEL_FORMULA, WIRE_MESH } from "../constants";
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
  { type: "number", integer: true, key: "count", label: "จำนวน", unit: "ตัว", default: 4, min: 1, max: 500, when: { key: "mode", is: "beam" } },
  { type: "number", integer: true, key: "nbar", label: "เหล็กยืนต่อตัว", unit: "เส้น", default: 4, min: 2, max: 24, when: { key: "mode", is: "beam" } },
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

/* ═══════════════ รอบ 4 (2026-11-26): ปริมาตรเสา-คาน-ฐานราก · ไม้แบบ / ไม้อัด ═══════════════ */

type MemberKind = "col" | "beam" | "ftg" | "ped";

export type MemberPart = {
  kind: MemberKind;
  name: string;
  /** หน่วยนับ เช่น ต้น ตัว ฐาน */
  unit: string;
  count: number;
  /** ขนาดแบบอ่านง่าย เช่น "20×20 ซม. สูง 3 ม." */
  size: string;
  /** ปริมาตรต่อชิ้น (ลบ.ม.) */
  volEach: number;
  vol: number;
  /** พื้นที่ไม้แบบที่สัมผัสคอนกรีต (ตร.ม.) */
  form: number;
  volExpr: string;
  formExpr: string;
};

/**
 * แยกชิ้นส่วนจากช่องกรอก — คิดเรขาคณิตล้วน ไม่ได้ออกแบบขนาด
 * เสา/ตอม่อ: หน้าตัด ก×ข × สูง · ไม้แบบ 4 ด้าน
 * คาน: หน้าตัด กว้าง×ลึก × ยาว · ไม้แบบ 2 ข้าง (+ ท้องคานถ้าเลือก)
 * ฐานแผ่: กว้าง×ยาว×หนา · ไม้แบบเฉพาะขอบ 4 ด้าน (ก้นวางบนคอนกรีตหยาบ)
 */
export function memberParts(v: Values, beamBottom = true): MemberPart[] {
  const parts: MemberPart[] = [];
  const colN = num(v, "colN", 8);
  if (colN > 0) {
    const b = num(v, "colB", 20) / 100;
    const d = num(v, "colD", 20) / 100;
    const h = num(v, "colH", 3);
    parts.push({
      kind: "col",
      unit: "ต้น",
      name: "เสา",
      count: colN,
      size: `${fmtTrim(b * 100, 1)}×${fmtTrim(d * 100, 1)} ซม. สูง ${fmtTrim(h, 2)} ม.`,
      volEach: b * d * h,
      vol: b * d * h * colN,
      form: 2 * (b + d) * h * colN,
      volExpr: `${fmtTrim(b, 3)} × ${fmtTrim(d, 3)} × ${fmtTrim(h, 2)} × ${fmt(colN)}`,
      formExpr: `2 × (${fmtTrim(b, 3)} + ${fmtTrim(d, 3)}) × ${fmtTrim(h, 2)} × ${fmt(colN)}`,
    });
  }
  const beamN = num(v, "beamN", 10);
  if (beamN > 0) {
    const b = num(v, "beamB", 20) / 100;
    const d = num(v, "beamD", 40) / 100;
    const len = num(v, "beamL", 4);
    const girth = 2 * d + (beamBottom ? b : 0);
    parts.push({
      kind: "beam",
      unit: "ตัว",
      name: "คาน",
      count: beamN,
      size: `${fmtTrim(b * 100, 1)}×${fmtTrim(d * 100, 1)} ซม. ยาว ${fmtTrim(len, 2)} ม.`,
      volEach: b * d * len,
      vol: b * d * len * beamN,
      form: girth * len * beamN,
      volExpr: `${fmtTrim(b, 3)} × ${fmtTrim(d, 3)} × ${fmtTrim(len, 2)} × ${fmt(beamN)}`,
      formExpr: beamBottom
        ? `(2 × ${fmtTrim(d, 3)} + ${fmtTrim(b, 3)}) × ${fmtTrim(len, 2)} × ${fmt(beamN)}`
        : `2 × ${fmtTrim(d, 3)} × ${fmtTrim(len, 2)} × ${fmt(beamN)}`,
    });
  }
  const ftgN = num(v, "ftgN", 8);
  if (ftgN > 0) {
    const w = num(v, "ftgW", 1);
    const l = num(v, "ftgL", 1);
    const t = num(v, "ftgT", 30) / 100;
    parts.push({
      kind: "ftg",
      unit: "ฐาน",
      name: "ฐานแผ่",
      count: ftgN,
      size: `${fmtTrim(w, 2)}×${fmtTrim(l, 2)} ม. หนา ${fmtTrim(t * 100, 1)} ซม.`,
      volEach: w * l * t,
      vol: w * l * t * ftgN,
      form: 2 * (w + l) * t * ftgN,
      volExpr: `${fmtTrim(w, 2)} × ${fmtTrim(l, 2)} × ${fmtTrim(t, 3)} × ${fmt(ftgN)}`,
      formExpr: `2 × (${fmtTrim(w, 2)} + ${fmtTrim(l, 2)}) × ${fmtTrim(t, 3)} × ${fmt(ftgN)}`,
    });
  }
  const pedN = num(v, "pedN", 8);
  if (pedN > 0) {
    const b = num(v, "pedB", 20) / 100;
    const d = num(v, "pedD", 20) / 100;
    const h = num(v, "pedH", 1.2);
    parts.push({
      kind: "ped",
      unit: "ต้น",
      name: "ตอม่อ",
      count: pedN,
      size: `${fmtTrim(b * 100, 1)}×${fmtTrim(d * 100, 1)} ซม. สูง ${fmtTrim(h, 2)} ม.`,
      volEach: b * d * h,
      vol: b * d * h * pedN,
      form: 2 * (b + d) * h * pedN,
      volExpr: `${fmtTrim(b, 3)} × ${fmtTrim(d, 3)} × ${fmtTrim(h, 2)} × ${fmt(pedN)}`,
      formExpr: `2 × (${fmtTrim(b, 3)} + ${fmtTrim(d, 3)}) × ${fmtTrim(h, 2)} × ${fmt(pedN)}`,
    });
  }
  return parts;
}

const MEMBER_NOTE = "ขนาดหน้าตัด ความลึกฐาน และจำนวนชิ้น ต้องเอาจากแบบวิศวกร — เครื่องมือนี้คิดปริมาตร/พื้นที่จากขนาดที่กรอก ไม่ได้ออกแบบโครงสร้าง";

const NO_MEMBERS = {
  headline: "ยังไม่มีชิ้นส่วนให้คิด — ใส่จำนวนเสา คาน ฐานแผ่ หรือตอม่อ อย่างน้อย 1 ชิ้น",
  tip: "จำนวน 0 = ไม่มีชิ้นส่วนนั้น",
};

export function calcMembers(v: Values): CalcResult {
  const bad = guard("members", v);
  if (bad) return bad;
  const parts = memberParts(v);
  if (parts.length === 0) return blockedResult(NO_MEMBERS);
  const waste = num(v, "waste", MEMBERS.wastePct.value);
  const truck = num(v, "truck", READYMIX.truckM3.value);
  const net = parts.reduce((s, p) => s + p.vol, 0);
  const need = net * (1 + waste / 100);
  const step = READYMIX.orderStep.value;
  const order = ceil(need / step) * step;
  const trucks = ceil(order / truck);
  const lastLoad = order - (trucks - 1) * truck;
  return resultX({
    title: "ปริมาตรเสา-คาน-ฐานราก",
    headline: `คอนกรีต ${fmt(need, 2)} คิว (รวมเผื่อ) · สั่ง ${fmtTrim(order, 2)} คิว รถโม่ ${fmt(trucks)} เที่ยว`,
    chart:
      parts.length > 1
        ? {
            kind: "stack",
            parts: parts.map((p) => ({ label: p.name, value: p.vol, display: `${fmt(p.vol, 2)} คิว` })),
            totalLabel: "คอนกรีตสุทธิ",
            totalDisplay: `${fmt(net, 2)} คิว`,
          }
        : undefined,
    rows: [
      ...parts.map((p) => ({ label: `${p.name} ${fmt(p.count)} ${p.unit} (${p.size})`, value: `${fmt(p.vol, 3)} คิว (ชิ้นละ ${fmt(p.volEach, 3)})` })),
      { label: "คอนกรีตสุทธิ", value: `${fmt(net, 3)} คิว` },
      { label: `รวมเผื่อ ${fmtTrim(waste, 1)}%`, value: `${fmt(need, 2)} คิว`, emphasize: true },
      { label: "สั่งคอนกรีตผสมเสร็จ", value: `${fmtTrim(order, 2)} คิว (สั่งทีละ ${fmtTrim(step, 2)} คิว)`, emphasize: true },
      {
        label: `รถโม่ ${fmtTrim(truck, 1)} คิว`,
        value: trucks === 1 ? `1 เที่ยว` : `${fmt(trucks)} เที่ยว (เที่ยวสุดท้าย ${fmtTrim(lastLoad, 2)} คิว)`,
      },
    ],
    tip: "วัดชิ้นส่วนไม่ให้ทับกัน: คานวัดช่วงระหว่างหน้าเสา เสาวัดถึงท้องคาน ไม่งั้นนับคอนกรีตตรงจุดต่อซ้ำ",
    explain: {
      risk: "A",
      updatedAt: "2026-11-26",
      summary: "ปริมาตรแต่ละชิ้น = หน้าตัด × ความยาว/ความสูง × จำนวน (ฐานแผ่ = กว้าง × ยาว × หนา) รวมกันแล้วบวกเผื่อ ปัดขึ้นเป็นขั้นที่โรงรับสั่ง",
      steps: [
        ...parts.map((p) => ({ label: p.name, expr: p.kind === "ftg" ? "คิว = กว้าง × ยาว × หนา × จำนวน" : p.kind === "beam" ? "คิว = กว้าง × ลึก × ยาว × จำนวน" : "คิว = กว้าง × ลึก × สูง × จำนวน", subst: `${p.volExpr} = ${fmt(p.vol, 3)} คิว` })),
        { label: "รวมเผื่อ", expr: "ที่ต้องใช้ = สุทธิ × (1 + เผื่อ%)", subst: `${fmt(net, 3)} × ${fmtTrim(1 + waste / 100, 3)} = ${fmt(need, 3)} คิว` },
        { label: "ปัดเป็นขั้นที่โรงรับสั่ง", expr: `สั่ง = ปัดขึ้น(ที่ต้องใช้ ÷ ${fmtTrim(step, 2)}) × ${fmtTrim(step, 2)}`, subst: `${fmt(need, 3)} → ${fmtTrim(order, 2)} คิว · ${fmt(trucks)} เที่ยว` },
      ],
      constants: [MEMBERS.wastePct, READYMIX.orderStep, READYMIX.truckM3],
      assumptions: ["ชิ้นส่วนเป็นทรงสี่เหลี่ยมตัน ขนาดตามที่กรอก", "ฐานแผ่ไม่รวมคอนกรีตหยาบรองก้นฐาน"],
      caveats: [MEMBER_NOTE, "เทเสา-คานทีละน้อยด้วยถัง สั่งรถโม่อาจไม่คุ้ม ถามโรงเรื่องขั้นต่ำก่อน", DISCLAIMER_AB],
      refs: [{ label: "เรขาคณิตปริมาตรทรงสี่เหลี่ยม" }, { label: "แนวปฏิบัติประมาณราคางานคอนกรีตโครงสร้าง" }],
    },
  });
}

export function calcFormwork(v: Values): CalcResult {
  const bad = guard("formwork", v);
  if (bad) return bad;
  const parts = memberParts(v, bool(v, "beamBottom", true));
  if (parts.length === 0) return blockedResult(NO_MEMBERS);
  const reuse = num(v, "reuse", FORMWORK.reuse.value);
  const waste = num(v, "waste", FORMWORK.wastePct.value);
  const rate = num(v, "batten", FORMWORK.battenPerM2.value);
  const stock = num(v, "stock", FORMWORK.battenStock.value);
  const area = parts.reduce((s, p) => s + p.form, 0);
  const gross = area * (1 + waste / 100);
  const perCycle = gross / reuse;
  const sheetM2 = FORMWORK.plyW.value * FORMWORK.plyL.value;
  const sheets = ceil(perCycle / sheetM2);
  const battenM = perCycle * rate;
  const battenPcs = battenM > 0 ? ceil(battenM / stock) : 0;
  return resultX({
    title: "ไม้แบบ / ไม้อัด",
    headline: `ไม้แบบ ${fmt(area, 1)} ตร.ม. · ไม้อัด 4×8 ฟุต ${fmt(sheets)} แผ่น${battenPcs > 0 ? ` · ไม้เคร่า ${fmt(battenPcs)} ท่อน` : ""}`,
    chart: {
      kind: "packs",
      unitLabel: `ไม้อัด ${fmtTrim(FORMWORK.plyW.value, 2)}×${fmtTrim(FORMWORK.plyL.value, 2)} ม.`,
      count: sheets,
      lastUsed: (perCycle - (sheets - 1) * sheetM2) / sheetM2,
      note: `ใช้ซ้ำ ${fmt(reuse)} ครั้ง`,
    },
    rows: [
      ...parts.map((p) => ({ label: `${p.name} ${fmt(p.count)} ${p.unit} (${p.size})`, value: `${fmt(p.form, 2)} ตร.ม.` })),
      { label: "พื้นที่ไม้แบบสัมผัสคอนกรีต", value: `${fmt(area, 2)} ตร.ม.` },
      { label: `รวมเผื่อตัด ${fmtTrim(waste, 1)}%`, value: `${fmt(gross, 2)} ตร.ม.` },
      { label: `ใช้ซ้ำ ${fmt(reuse)} ครั้ง ต้องมีไม้แบบจริง`, value: `${fmt(perCycle, 2)} ตร.ม.` },
      { label: `ไม้อัด 4×8 ฟุต (${fmtTrim(sheetM2, 4)} ตร.ม./แผ่น)`, value: `${fmt(sheets)} แผ่น`, emphasize: true },
      ...(battenM > 0
        ? [{ label: `ไม้เคร่า (${fmtTrim(rate, 2)} ม./ตร.ม.)`, value: `${fmt(battenM, 1)} ม. = ${fmt(battenPcs)} ท่อน (ท่อนละ ${fmtTrim(stock, 2)} ม.)`, emphasize: true }]
        : []),
    ],
    tip: "ใช้ซ้ำได้จริงต้องแบ่งเทเป็นรอบ ถอดแบบรอบแรกมาใช้รอบถัดไป ถ้าเทพร้อมกันหมดให้ใส่ใช้ซ้ำ 1 ครั้ง",
    explain: {
      risk: "A",
      updatedAt: "2026-11-26",
      summary: "พื้นที่ไม้แบบ = ผิวคอนกรีตที่ต้องมีแบบกั้น (เสา/ตอม่อ 4 ด้าน คาน 2 ข้าง + ท้อง ฐานแผ่เฉพาะขอบ) บวกเผื่อตัด หารจำนวนครั้งที่ใช้ซ้ำ แล้วหารพื้นที่ไม้อัด 1 แผ่น",
      steps: [
        ...parts.map((p) => ({
          label: p.name,
          expr: p.kind === "ftg" ? "ตร.ม. = รอบฐาน × หนา × จำนวน" : p.kind === "beam" ? "ตร.ม. = (2 × ลึก + ท้อง) × ยาว × จำนวน" : "ตร.ม. = รอบหน้าตัด × สูง × จำนวน",
          subst: `${p.formExpr} = ${fmt(p.form, 2)} ตร.ม.`,
        })),
        { label: "ไม้แบบที่ต้องมีจริง", expr: "ตร.ม. × (1 + เผื่อ%) ÷ ใช้ซ้ำ", subst: `${fmt(area, 2)} × ${fmtTrim(1 + waste / 100, 3)} ÷ ${fmt(reuse)} = ${fmt(perCycle, 3)} ตร.ม.` },
        {
          label: "ไม้อัด",
          expr: `แผ่น = ปัดขึ้น(ตร.ม. ÷ (${FORMWORK.plyW.value} × ${FORMWORK.plyL.value}))`,
          subst: `${fmt(perCycle, 3)} ÷ ${fmtTrim(sheetM2, 4)} = ${fmt(perCycle / sheetM2, 2)} → ${fmt(sheets)} แผ่น`,
        },
        {
          label: "ไม้เคร่า",
          expr: "ม. = ไม้แบบที่ต้องมี × ม./ตร.ม. · ท่อน = ปัดขึ้น(ม. ÷ ยาวท่อน)",
          subst: `${fmt(perCycle, 3)} × ${fmtTrim(rate, 2)} = ${fmt(battenM, 2)} ม. → ${fmt(battenPcs)} ท่อน`,
        },
      ],
      constants: [FORMWORK.plyW, FORMWORK.plyL, FORMWORK.reuse, FORMWORK.wastePct, FORMWORK.battenPerM2, FORMWORK.battenStock],
      assumptions: [
        bool(v, "beamBottom", true) ? "คานตั้งแบบท้องคานด้วย" : "คานวางบนดิน/คอนกรีตหยาบ ไม่ต้องมีแบบท้องคาน",
        "ฐานแผ่ตั้งแบบเฉพาะขอบ ก้นฐานวางบนคอนกรีตหยาบ",
        "เทแบ่งรอบ ไม้แบบถอดมาใช้ซ้ำได้ตามจำนวนครั้งที่กรอก",
      ],
      caveats: [
        "ยังไม่รวมไม้ค้ำยัน เสาค้ำท้องคาน ตะปู และน้ำมันทาแบบ — ค้ำยันรับน้ำหนักคอนกรีตเปียก ต้องให้ผู้ควบคุมงานตรวจก่อนเท",
        MEMBER_NOTE,
        DISCLAIMER_AB,
      ],
      refs: [{ label: "ขนาดไม้อัด 4 × 8 ฟุต (1.22 × 2.44 ม.)" }, { label: "แนวปฏิบัติประมาณราคางานไม้แบบ" }],
    },
  });
}

const MEMBER_FIELDS: Field[] = [
  { type: "number", integer: true, key: "colN", label: "เสา: จำนวน (0 = ไม่มี)", unit: "ต้น", default: 8, min: 0, max: 500 },
  { type: "number", key: "colB", label: "เสา: กว้าง", unit: "ซม.", default: 20, min: 10, max: 200, step: 0.5 },
  { type: "number", key: "colD", label: "เสา: ลึก", unit: "ซม.", default: 20, min: 10, max: 200, step: 0.5 },
  { type: "number", key: "colH", label: "เสา: สูง", unit: "ม.", default: 3, min: 0.3, max: 20, step: 0.05 },
  { type: "number", integer: true, key: "beamN", label: "คาน: จำนวน (0 = ไม่มี)", unit: "ตัว", default: 10, min: 0, max: 500 },
  { type: "number", key: "beamB", label: "คาน: กว้าง", unit: "ซม.", default: 20, min: 10, max: 200, step: 0.5 },
  { type: "number", key: "beamD", label: "คาน: ลึก", unit: "ซม.", default: 40, min: 10, max: 300, step: 0.5 },
  { type: "number", key: "beamL", label: "คาน: ยาว (ระหว่างหน้าเสา)", unit: "ม.", default: 4, min: 0.3, max: 30, step: 0.05 },
  { type: "number", integer: true, key: "ftgN", label: "ฐานแผ่: จำนวน (0 = ไม่มี)", unit: "ฐาน", default: 8, min: 0, max: 500 },
  { type: "number", key: "ftgW", label: "ฐานแผ่: กว้าง", unit: "ม.", default: 1, min: 0.3, max: 10, step: 0.05 },
  { type: "number", key: "ftgL", label: "ฐานแผ่: ยาว", unit: "ม.", default: 1, min: 0.3, max: 10, step: 0.05 },
  { type: "number", key: "ftgT", label: "ฐานแผ่: หนา", unit: "ซม.", default: 30, min: 10, max: 200, step: 0.5 },
  { type: "number", integer: true, key: "pedN", label: "ตอม่อ: จำนวน (0 = ไม่มี)", unit: "ต้น", default: 8, min: 0, max: 500 },
  { type: "number", key: "pedB", label: "ตอม่อ: กว้าง", unit: "ซม.", default: 20, min: 10, max: 200, step: 0.5 },
  { type: "number", key: "pedD", label: "ตอม่อ: ลึก", unit: "ซม.", default: 20, min: 10, max: 200, step: 0.5 },
  { type: "number", key: "pedH", label: "ตอม่อ: สูง", unit: "ม.", default: 1.2, min: 0.1, max: 10, step: 0.05 },
];

const round4Tools: ToolDef[] = [
  {
    id: "members",
    name: "ปริมาตรเสา-คาน-ฐานราก",
    blurb: "เสา คาน ฐานแผ่ ตอม่อ → กี่คิว รวมเผื่อ รถโม่กี่เที่ยว",
    keywords: ["เสา", "คาน", "ฐานราก", "ฐานแผ่", "ตอม่อ", "คิว", "ปริมาตรคอนกรีต", "เทเสา", "เทคาน"],
    fields: [
      ...MEMBER_FIELDS,
      { type: "number", key: "waste", label: "เผื่อเสีย", unit: "%", default: MEMBERS.wastePct.value, min: 0, max: 30, step: 0.5 },
      { type: "number", key: "truck", label: "รถโม่คันละ", unit: "คิว", default: READYMIX.truckM3.value, min: 1, max: 12, step: 0.5 },
    ],
    calc: calcMembers,
  },
  {
    id: "formwork",
    name: "ไม้แบบ / ไม้อัด",
    blurb: "เสา คาน ฐาน → พื้นที่ไม้แบบ ไม้อัด 4×8 กี่แผ่น ไม้เคร่ากี่ท่อน",
    keywords: ["ไม้แบบ", "ไม้อัด", "แบบหล่อ", "ไม้เคร่า", "ตั้งแบบ", "ไม้อัดยาง", "4x8"],
    fields: [
      ...MEMBER_FIELDS,
      { type: "bool", key: "beamBottom", label: "คานมีแบบท้องคาน (ไม่ได้วางบนดิน)", default: true },
      { type: "number", integer: true, key: "reuse", label: "ใช้ไม้แบบซ้ำ", unit: "ครั้ง", default: FORMWORK.reuse.value, min: 1, max: 20 },
      { type: "number", key: "waste", label: "เผื่อตัด", unit: "%", default: FORMWORK.wastePct.value, min: 0, max: 30, step: 0.5 },
      { type: "number", key: "batten", label: "ไม้เคร่าต่อพื้นที่แบบ (0 = ไม่คิด)", unit: "ม./ตร.ม.", default: FORMWORK.battenPerM2.value, min: 0, max: 10, step: 0.1 },
      { type: "number", key: "stock", label: "ไม้เคร่ายาวท่อนละ", unit: "ม.", default: FORMWORK.battenStock.value, min: 1, max: 6, step: 0.5 },
    ],
    calc: calcFormwork,
  },
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
  ...round4Tools,
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
