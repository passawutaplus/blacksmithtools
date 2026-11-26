import type { CalcResult, Field, ToolDef, Values } from "../types";
import { blockedResult, ceil, fmt, fmtTrim, guardTool, num, resultX, str } from "../math";
import { DISCLAIMER_AB, LABOUR, LABOUR_RATES, TAX } from "../constants";

const guard = (id: string, v: Values) => guardTool(estimateTools, id, v);
const UPDATED = "2026-11-26";
const SATANG = TAX.satangPerBaht.value;

/* ─────────── เงิน: คิดเป็นสตางค์จำนวนเต็ม ปัดครึ่งขึ้น ─────────── */

/**
 * ปัดครึ่งขึ้นเป็นจำนวนเต็ม (ใช้กับค่าที่อยู่ในหน่วยสตางค์แล้ว และไม่ติดลบ)
 * toPrecision(15) ล้างเศษทศนิยมฐานสองก่อนปัด — 104.775 × 100 ในเครื่องคือ 10477.4999… ต้องได้ 10478 ไม่ใช่ 10477
 */
export function roundHalfUp(x: number): number {
  return Math.round(Number(x.toPrecision(15)));
}

/** บาท → สตางค์ (จำนวนเต็ม ปัดครึ่งขึ้นที่ทศนิยม 2 ตำแหน่ง) */
export function toSatang(baht: number): number {
  return roundHalfUp(baht * SATANG);
}

/** พิมพ์สตางค์เป็นบาท 2 ตำแหน่ง */
export function baht(satang: number): string {
  return `${fmt(satang / SATANG, 2)} บาท`;
}

/** ภาษีจากฐาน (สตางค์) ตามอัตรา % ปัดครึ่งขึ้นเป็นสตางค์ */
function pctOf(satang: number, pct: number): number {
  return roundHalfUp((satang * pct) / 100);
}

/** แยกฐานก่อน VAT จากยอดที่รวม VAT แล้ว — VAT คือส่วนต่าง ให้ฐาน + VAT เท่ายอดเดิมพอดี */
export function splitVatIncluded(grossSatang: number, vatPct = TAX.vat.value) {
  const base = roundHalfUp((grossSatang * 100) / (100 + vatPct));
  return { base, vat: grossSatang - base };
}

const WHT_RATES: Record<string, { label: string; ref?: typeof TAX.whtService }> = {
  "0": { label: "ไม่หัก" },
  "1": { label: "1% ค่าขนส่ง", ref: TAX.whtTransport },
  "2": { label: "2% ค่าโฆษณา", ref: TAX.whtAdvert },
  "3": { label: "3% ค่าจ้างทำของ/ค่าบริการ", ref: TAX.whtService },
  "5": { label: "5% ค่าเช่า", ref: TAX.whtRent },
};

/** ยอดจ่ายครั้งนี้ต่ำกว่าเกณฑ์ที่ปกติต้องหัก ณ ที่จ่าย */
function whtBelowMin(baseSatang: number, rate: number): boolean {
  return rate > 0 && baseSatang < TAX.whtMinPayment.value * SATANG;
}

function whtNote(baseSatang: number, rate: number) {
  return whtBelowMin(baseSatang, rate)
    ? [{ label: "หมายเหตุหัก ณ ที่จ่าย", value: `ยอดต่ำกว่า ${fmt(TAX.whtMinPayment.value)} บาท ปกติไม่ต้องหัก (เว้นแต่จ่ายตามสัญญาที่รวมแล้วถึง)` }]
    : [];
}

/* ─────────── ใบเสนอราคาเร็ว ─────────── */

const MAX_LINES = 8;
const LINE_DEFAULTS: Array<{ d: string; q: number; p: number }> = [
  { d: "กระเบื้อง 60×60 (ตร.ม.)", q: 20, p: 350 },
  { d: "ปูนกาว (ถุง)", q: 10, p: 185.5 },
  { d: "ยาแนว (ถุง)", q: 4, p: 95.25 },
];

function lineDefault(i: number) {
  return LINE_DEFAULTS[i - 1] ?? { d: "", q: 1, p: 0 };
}

/** ตัวคูณราคาขายจากทุน: บวกจากทุน (markup) = 1 + % · กำไรต่อราคาขาย (margin) = 1 ÷ (1 − %) */
export function priceFactor(kind: string, pct: number): number {
  return kind === "margin" ? 1 / (1 - pct / 100) : 1 + pct / 100;
}

export function calcQuote(v: Values): CalcResult {
  const bad = guard("quote", v);
  if (bad) return bad;
  const n = Number(str(v, "lines", "3"));
  const kind = str(v, "kind", "markup");
  const pct = num(v, "pct", 10);
  const f = priceFactor(kind, pct);
  const vatMode = str(v, "vat", "excl");
  const whtMode = str(v, "wht", "none");
  const vatPct = num(v, "vatRate", TAX.vat.value);
  const whtPct = TAX.whtService.value;

  const lines: Array<{ i: number; d: string; q: number; sellUnit: number; total: number; cost: number }> = [];
  for (let i = 1; i <= n; i++) {
    const def = lineDefault(i);
    const d = str(v, `d${i}`, def.d).trim();
    const q = num(v, `q${i}`, def.q);
    const p = num(v, `p${i}`, def.p);
    const costUnit = toSatang(p);
    const sellUnit = roundHalfUp(costUnit * f);
    lines.push({ i, d: d || `รายการ ${i}`, q, sellUnit, total: roundHalfUp(q * sellUnit), cost: roundHalfUp(q * costUnit) });
  }
  const labourCost = toSatang(num(v, "labour", 8000));
  const labour = roundHalfUp(labourCost * f);
  const sub = lines.reduce((s, l) => s + l.total, 0) + labour;
  const costSum = lines.reduce((s, l) => s + l.cost, 0) + labourCost;
  if (sub <= 0) {
    return blockedResult({ headline: "ยังไม่มีราคาสักรายการ — ใส่จำนวนและราคาอย่างน้อย 1 รายการ", tip: "ใส่ราคาต่อหน่วยหรือค่าแรง" });
  }
  const profit = sub - costSum;
  let base: number;
  let vat: number;
  let gross: number;
  if (vatMode === "excl") {
    base = sub;
    vat = pctOf(sub, vatPct);
    gross = sub + vat;
  } else if (vatMode === "incl") {
    ({ base, vat } = splitVatIncluded(sub, vatPct));
    gross = sub;
  } else {
    base = sub;
    vat = 0;
    gross = sub;
  }
  const whtBase = whtMode === "all" ? base : whtMode === "labour" ? (vatMode === "incl" ? splitVatIncluded(labour, vatPct).base : labour) : 0;
  const wht = whtMode === "none" ? 0 : pctOf(whtBase, whtPct);
  const net = gross - wht;
  const whtSmall = whtMode !== "none" && whtBelowMin(whtBase, whtPct);
  const vatText = fmtTrim(vatPct, 2);
  const kindText = kind === "margin" ? `กำไร ${fmtTrim(pct, 2)}% ของราคาขาย` : `บวก ${fmtTrim(pct, 2)}% จากทุน`;

  return resultX({
    title: "ใบเสนอราคา",
    headline: whtSmall
      ? `ยอดรวมทั้งสิ้น ${baht(gross)} · ฐานหักต่ำกว่า ${fmt(TAX.whtMinPayment.value)} บาท ปกติไม่ต้องหัก ณ ที่จ่าย (ถ้าหัก รับจริง ${baht(net)})`
      : `ยอดรวมทั้งสิ้น ${baht(gross)}${wht > 0 ? ` · รับเงินจริง ${baht(net)}` : ""}`,
    chart:
      vat > 0
        ? {
            kind: "stack",
            parts: [
              { label: "ราคาก่อน VAT", value: base / SATANG, display: baht(base), tone: "accent" },
              { label: `VAT ${vatText}%`, value: vat / SATANG, display: baht(vat), tone: "mute" },
            ],
            totalLabel: "ยอดรวมทั้งสิ้น",
            totalDisplay: baht(gross),
          }
        : undefined,
    rows: [
      ...lines.map((l) => ({ label: `${l.i}. ${l.d}`, value: `${fmtTrim(l.q, 3)} × ${baht(l.sellUnit)} = ${baht(l.total)}` })),
      { label: `${n + 1}. ค่าแรง`, value: baht(labour) },
      { label: vatMode === "incl" ? "รวมเป็นเงิน (รวม VAT แล้ว)" : "รวมเป็นเงิน", value: baht(sub) },
      ...(vatMode === "excl" ? [{ label: `ภาษีมูลค่าเพิ่ม ${vatText}%`, value: baht(vat) }] : []),
      ...(vatMode === "incl" ? [{ label: "ราคาก่อน VAT", value: baht(base) }, { label: `ภาษีมูลค่าเพิ่ม ${vatText}% (อยู่ในราคา)`, value: baht(vat) }] : []),
      { label: "ยอดรวมทั้งสิ้น", value: baht(gross), emphasize: true },
      ...(whtMode !== "none"
        ? [
            { label: `หัก ณ ที่จ่าย ${whtPct}% (${whtMode === "all" ? "ทั้งใบ ก่อน VAT" : "เฉพาะค่าแรง ก่อน VAT"})`, value: `${baht(wht)} จากฐาน ${baht(whtBase)}` },
            { label: "รับเงินจริง", value: baht(net), emphasize: true },
            ...whtNote(whtBase, whtPct),
          ]
        : []),
    ],
    tip: "ราคาต่อหน่วยในใบนี้รวมกำไรแล้ว คัดลอกส่งลูกค้าได้เลย — ต้นทุนกับกำไรอยู่ในบล็อกสูตร ไม่ติดไปกับข้อความที่ส่ง",
    explain: {
      risk: "A",
      updatedAt: UPDATED,
      summary: `ราคาต่อหน่วย = ทุน × ตัวคูณกำไร ปัดเป็นสตางค์ · บรรทัด = จำนวน × ราคาต่อหน่วย ปัดสตางค์ · VAT ${vatText}% คิดจากยอดรวม · หัก ณ ที่จ่าย ${whtPct}% คิดจากยอดก่อน VAT`,
      steps: [
        { label: "ตัวคูณกำไร", expr: kind === "margin" ? "1 ÷ (1 − กำไร%)" : "1 + บวก%", subst: `${fmtTrim(f, 6)}` },
        ...lines.map((l) => ({
          label: `บรรทัด ${l.i}`,
          expr: "จำนวน × ปัดสตางค์(ราคาทุน × ตัวคูณ)",
          subst: `${fmtTrim(l.q, 3)} × ${fmt(l.sellUnit / SATANG, 2)} = ${fmt(l.total / SATANG, 2)} บาท`,
        })),
        { label: "ค่าแรง", expr: "ค่าแรงทุน × ตัวคูณ", subst: `${fmt(labourCost / SATANG, 2)} × ${fmtTrim(f, 6)} = ${fmt(labour / SATANG, 2)} บาท` },
        { label: "กำไรที่บวกเข้าไป (ของเราเอง)", expr: `รวมเป็นเงิน − ต้นทุนที่กรอก (${kindText})`, subst: `${fmt(sub / SATANG, 2)} − ${fmt(costSum / SATANG, 2)} = ${fmt(profit / SATANG, 2)} บาท` },
        vatMode === "excl"
          ? { label: "VAT", expr: `รวม × ${vatText}% ปัดครึ่งขึ้น`, subst: `${fmt(sub / SATANG, 2)} × ${vatText}% = ${fmt(vat / SATANG, 2)} บาท` }
          : vatMode === "incl"
            ? { label: "VAT ในราคา", expr: `ฐาน = รวม × 100 ÷ ${fmtTrim(100 + vatPct, 2)} · VAT = รวม − ฐาน`, subst: `${fmt(sub / SATANG, 2)} × 100 ÷ ${fmtTrim(100 + vatPct, 2)} = ${fmt(base / SATANG, 2)} · VAT ${fmt(vat / SATANG, 2)} บาท` }
            : { label: "VAT", expr: "ไม่จดทะเบียน VAT ไม่คิดภาษี", subst: "0 บาท" },
        ...(whtMode !== "none"
          ? [{ label: "หัก ณ ที่จ่าย", expr: `ฐานก่อน VAT × ${whtPct}% · รับจริง = ยอดรวม − หัก`, subst: `${fmt(whtBase / SATANG, 2)} × ${whtPct}% = ${fmt(wht / SATANG, 2)} · ${fmt(gross / SATANG, 2)} − ${fmt(wht / SATANG, 2)} = ${fmt(net / SATANG, 2)} บาท` }]
          : []),
      ],
      constants: [TAX.vat, ...(whtMode !== "none" ? [TAX.whtService, TAX.whtMinPayment] : []), TAX.satangPerBaht],
      assumptions: [
        "กำไรบวกเข้าไปในราคาต่อหน่วยทุกบรรทัดรวมค่าแรง (ลูกค้าไม่เห็นแถวกำไร)",
        "ปัดเป็นสตางค์แบบครึ่งขึ้น (0.005 ขึ้นเป็น 0.01) ทีละบรรทัด ยอดรวม = ผลบวกของบรรทัดที่ปัดแล้ว",
      ],
      caveats: [
        "อัตรา VAT ในช่องเป็นค่าเริ่มต้น 7% — ตรวจพระราชกฤษฎีกาลดอัตรา VAT ฉบับที่ใช้อยู่ ณ วันออกใบกำกับ",
        "ออกใบกำกับภาษีได้เฉพาะผู้จดทะเบียน VAT",
        "หัก ณ ที่จ่ายเฉพาะค่าแรงได้เมื่อสัญญาแยกค่าของกับค่าแรงชัด — ยึดตามที่ฝ่ายบัญชีผู้ว่าจ้างกำหนด",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "ประมวลรัษฎากร ม.80 (VAT)" }, { label: "คำสั่งกรมสรรพากร ท.ป.4/2528 (หัก ณ ที่จ่าย)" }],
    },
  });
}

/* ─────────── บวกกำไร markup ↔ margin ─────────── */

export function calcMarkup(v: Values): CalcResult {
  const bad = guard("markup", v);
  if (bad) return bad;
  const cost = num(v, "cost", 1000);
  const kind = str(v, "kind", "markup");
  const pct = kind === "margin" ? num(v, "mg", 25) : num(v, "mu", 25);
  const costS = toSatang(cost);
  const priceS = roundHalfUp(costS * priceFactor(kind, pct));
  const profitS = priceS - costS;
  // อีกเปอร์เซ็นต์คิดจากนิยามตรง ๆ (ไม่ใช้ราคาที่ปัดสตางค์แล้ว): margin = mu ÷ (1 + mu) · markup = mg ÷ (1 − mg)
  const other = kind === "margin" ? (pct / (100 - pct)) * 100 : (pct / (100 + pct)) * 100;
  const altKind = kind === "margin" ? "markup" : "margin";
  const altPriceS = altKind === "margin" && pct >= 100 ? undefined : roundHalfUp(costS * priceFactor(altKind, pct));

  return resultX({
    title: "บวกกำไร markup ↔ margin",
    headline: `ขาย ${baht(priceS)} · กำไร ${baht(profitS)} · ${kind === "margin" ? `เท่ากับบวกจากทุน ${fmt(other, 2)}%` : `กำไรต่อราคาขาย ${fmt(other, 2)}%`}`,
    chart: {
      kind: "stack",
      parts: [
        { label: "ทุน", value: costS / SATANG, display: baht(costS), tone: "mute" },
        { label: "กำไร", value: profitS / SATANG, display: baht(profitS), tone: "good" },
      ],
      totalLabel: "ราคาขาย",
      totalDisplay: baht(priceS),
    },
    rows: [
      { label: "ทุน", value: baht(costS) },
      { label: kind === "margin" ? `กำไร ${fmtTrim(pct, 2)}% ของราคาขาย (margin)` : `บวก ${fmtTrim(pct, 2)}% จากทุน (markup)`, value: `ราคาขาย ${baht(priceS)}`, emphasize: true },
      { label: "กำไร", value: baht(profitS), emphasize: true },
      { label: kind === "margin" ? "เท่ากับบวกจากทุน (markup)" : "กำไรต่อราคาขาย (margin)", value: `${fmt(other, 2)}%` },
      {
        label: `ถ้าเอา ${fmtTrim(pct, 2)}% ไปคิดแบบ${altKind === "margin" ? "กำไรต่อราคาขาย" : "บวกจากทุน"}`,
        value: altPriceS === undefined ? "คิดไม่ได้ (กำไรต่อราคาขายต้องต่ำกว่า 100%)" : `ราคาขาย ${baht(altPriceS)}`,
      },
    ],
    tip: "บวก 30% จากทุน ได้กำไรแค่ 23% ของราคาขาย — ตกลงกับหุ้นส่วน/ลูกค้าให้ชัดว่าพูดถึงแบบไหน",
    explain: {
      risk: "A",
      updatedAt: UPDATED,
      summary: "markup: ขาย = ทุน × (1 + %) · margin: ขาย = ทุน ÷ (1 − %) · margin = markup ÷ (1 + markup) · markup = margin ÷ (1 − margin)",
      steps: [
        {
          label: "ราคาขาย",
          expr: kind === "margin" ? "ทุน ÷ (1 − กำไร%)" : "ทุน × (1 + บวก%)",
          subst: `${fmt(cost, 2)} ${kind === "margin" ? `÷ ${fmtTrim(1 - pct / 100, 4)}` : `× ${fmtTrim(1 + pct / 100, 4)}`} = ${fmt(priceS / SATANG, 2)} บาท`,
        },
        { label: "กำไร", expr: "ขาย − ทุน", subst: `${fmt(priceS / SATANG, 2)} − ${fmt(costS / SATANG, 2)} = ${fmt(profitS / SATANG, 2)} บาท` },
        {
          label: kind === "margin" ? "markup" : "margin",
          expr: kind === "margin" ? "margin ÷ (100 − margin) × 100" : "markup ÷ (100 + markup) × 100",
          subst: `${fmtTrim(pct, 2)} ÷ ${fmtTrim(kind === "margin" ? 100 - pct : 100 + pct, 2)} × 100 = ${fmt(other, 2)}%`,
        },
      ],
      constants: [TAX.satangPerBaht],
      assumptions: ["ทุนและราคาเป็นฐานเดียวกัน (ก่อน VAT ทั้งคู่ หรือรวม VAT ทั้งคู่)", "ราคาขายปัดเป็นสตางค์แบบครึ่งขึ้น"],
      caveats: [DISCLAIMER_AB],
      refs: [{ label: "นิยาม markup / gross margin ทางบัญชีต้นทุน" }],
    },
  });
}

/* ─────────── VAT / หัก ณ ที่จ่าย ─────────── */

export function calcVatWht(v: Values): CalcResult {
  const bad = guard("vat", v);
  if (bad) return bad;
  const amt = toSatang(num(v, "amt", 10000));
  const mode = str(v, "mode", "excl");
  const rateKey = str(v, "wht", "3");
  const rate = Number(rateKey);
  const vatPct = num(v, "vatRate", TAX.vat.value);
  const vatText = fmtTrim(vatPct, 2);
  let base: number;
  let vat: number;
  let total: number;
  if (mode === "excl") {
    base = amt;
    vat = pctOf(amt, vatPct);
    total = amt + vat;
  } else if (mode === "incl") {
    ({ base, vat } = splitVatIncluded(amt, vatPct));
    total = amt;
  } else {
    base = amt;
    vat = 0;
    total = amt;
  }
  const wht = pctOf(base, rate);
  const net = total - wht;
  const r = WHT_RATES[rateKey];
  const whtSmall = whtBelowMin(base, rate);

  return resultX({
    title: "VAT / หัก ณ ที่จ่าย",
    headline: whtSmall
      ? `ยอดรวม ${baht(total)} · ต่ำกว่า ${fmt(TAX.whtMinPayment.value)} บาท ปกติไม่ต้องหัก ณ ที่จ่าย (ถ้าหัก ${rate}% รับจริง ${baht(net)})`
      : `ยอดรวม ${baht(total)}${rate > 0 ? ` · หัก ${rate}% ${baht(wht)} · รับจริง ${baht(net)}` : ""}`,
    chart:
      rate > 0
        ? {
            kind: "stack",
            parts: [
              { label: "รับเงินสด", value: net / SATANG, display: baht(net), tone: "good" },
              { label: `หัก ณ ที่จ่าย ${rate}%`, value: wht / SATANG, display: baht(wht), tone: "warn" },
            ],
            totalLabel: "ยอดรวมในใบ",
            totalDisplay: baht(total),
          }
        : undefined,
    rows: [
      { label: "ราคาก่อน VAT (ฐานภาษี)", value: baht(base), emphasize: true },
      { label: mode === "none" ? "VAT" : `VAT ${vatText}%`, value: mode === "none" ? "ไม่คิด (ไม่จด VAT)" : baht(vat) },
      { label: "ยอดรวมในใบ", value: baht(total), emphasize: true },
      { label: `หัก ณ ที่จ่าย (${r.label})`, value: rate > 0 ? `${baht(wht)} จากฐานก่อน VAT` : "ไม่หัก" },
      { label: "รับเงินจริง", value: baht(net), emphasize: true },
      ...whtNote(base, rate),
    ],
    tip: "หัก ณ ที่จ่ายคิดจากราคาก่อน VAT เสมอ ไม่ใช่จากยอดรวม — เก็บหนังสือรับรอง (50 ทวิ) ไว้ใช้ลดภาษีปลายปี",
    explain: {
      risk: "A",
      updatedAt: UPDATED,
      summary: `แยก VAT: ฐาน = รวม × 100 ÷ ${fmtTrim(100 + vatPct, 2)} · บวก VAT: VAT = ฐาน × ${vatText}% · หัก ณ ที่จ่าย = ฐานก่อน VAT × อัตรา · รับจริง = ยอดรวม − หัก`,
      steps: [
        mode === "excl"
          ? { label: "VAT", expr: `ฐาน × ${vatText}%`, subst: `${fmt(base / SATANG, 2)} × ${vatText}% = ${fmt(vat / SATANG, 2)} บาท` }
          : mode === "incl"
            ? { label: "แยก VAT", expr: `ฐาน = รวม × 100 ÷ ${fmtTrim(100 + vatPct, 2)} · VAT = รวม − ฐาน`, subst: `${fmt(amt / SATANG, 2)} × 100 ÷ ${fmtTrim(100 + vatPct, 2)} = ${fmt(base / SATANG, 2)} · VAT ${fmt(vat / SATANG, 2)} บาท` }
            : { label: "VAT", expr: "ไม่จด VAT", subst: "0 บาท" },
        { label: "หัก ณ ที่จ่าย", expr: "ฐานก่อน VAT × อัตรา", subst: `${fmt(base / SATANG, 2)} × ${rate}% = ${fmt(wht / SATANG, 2)} บาท` },
        { label: "รับจริง", expr: "ยอดรวม − หัก ณ ที่จ่าย", subst: `${fmt(total / SATANG, 2)} − ${fmt(wht / SATANG, 2)} = ${fmt(net / SATANG, 2)} บาท` },
      ],
      constants: [TAX.vat, ...(r.ref ? [r.ref, TAX.whtMinPayment] : []), TAX.satangPerBaht],
      assumptions: ["ปัดเป็นสตางค์แบบครึ่งขึ้น", "ผู้จ่ายเป็นนิติบุคคล (บุคคลธรรมดาทั่วไปไม่มีหน้าที่หัก ณ ที่จ่ายค่าจ้าง)"],
      caveats: ["อัตรา VAT ในช่องเป็นค่าเริ่มต้น 7% (อัตราลดที่ต่ออายุเป็นช่วง) — ตรวจพระราชกฤษฎีกาลดอัตรา VAT ฉบับที่ใช้อยู่ ณ วันออกใบกำกับ", "อัตราหัก ณ ที่จ่ายขึ้นกับประเภทเงินได้ ถามฝ่ายบัญชีผู้จ่ายถ้าไม่แน่ใจ", DISCLAIMER_AB],
      refs: [{ label: "ประมวลรัษฎากร ม.80 (VAT)" }, { label: "คำสั่งกรมสรรพากร ท.ป.4/2528 (อัตราหัก ณ ที่จ่าย)" }],
    },
  });
}

/* ─────────── งวดงาน / มัดจำ ─────────── */

/** อ่านรายการ % ที่พิมพ์ เช่น "40, 30" หรือ "40% 30%" — ตัวที่อ่านไม่ได้คืนใน bad */
export function parsePctList(raw: string): { values: number[]; bad: string[] } {
  const values: number[] = [];
  const bad: string[] = [];
  for (const token of raw.split(/[\s,;]+/).filter(Boolean)) {
    const n = Number(token.replace(/%$/, ""));
    if (Number.isFinite(n) && n > 0) values.push(n);
    else bad.push(token);
  }
  return { values, bad };
}

/**
 * แบ่งยอด (สตางค์) ตามน้ำหนัก ปัดครึ่งขึ้นทุกก้อนยกเว้นก้อนสุดท้าย ซึ่งรับเศษให้ผลรวมเท่ายอดพอดี
 */
export function allocate(totalSatang: number, weights: number[]): number[] {
  const sumW = weights.reduce((s, w) => s + w, 0);
  const out = weights.slice(0, -1).map((w) => roundHalfUp((totalSatang * w) / sumW));
  out.push(totalSatang - out.reduce((s, x) => s + x, 0));
  return out;
}

const MAX_INSTALMENTS = 24;

export function calcInstalments(v: Values): CalcResult {
  const bad = guard("instalment", v);
  if (bad) return bad;
  const totalS = toSatang(num(v, "total", 250000));
  const depPct = num(v, "dep", 30);
  const mode = str(v, "mode", "equal");
  const retPct = num(v, "ret", 5);
  const depS = pctOf(totalS, depPct);
  const remS = totalS - depS;

  let weights: number[];
  let pctLabels: string[] | undefined;
  if (mode === "equal") {
    const n = num(v, "n", 3);
    if (!Number.isInteger(n)) {
      return blockedResult({ headline: "จำนวนงวดต้องเป็นจำนวนเต็ม", tip: "ใส่จำนวนงวดเป็นเลขเต็ม เช่น 3" });
    }
    weights = Array.from({ length: n }, () => 1);
  } else {
    const { values, bad: junk } = parsePctList(str(v, "list", "40, 30"));
    if (junk.length || values.length === 0 || values.length > MAX_INSTALMENTS) {
      return blockedResult({
        headline: junk.length ? `อ่านค่า "${junk.join(" ")}" ไม่ได้ — พิมพ์เป็นตัวเลข % คั่นด้วยจุลภาค` : values.length === 0 ? "ยังไม่ได้ใส่ % ของงวด" : `งวดมากเกิน ${MAX_INSTALMENTS} งวด`,
        tip: "ตัวอย่าง: 40, 30 (มัดจำ 30% + งวด 40% + งวด 30% = 100%)",
      });
    }
    const sum = values.reduce((s, x) => s + x, 0) + depPct;
    if (Math.abs(sum - 100) > 1e-6) {
      return blockedResult({
        headline: `มัดจำ + ทุกงวดรวมได้ ${fmtTrim(sum, 2)}% ต้องเท่ากับ 100%`,
        rows: [{ label: "ขาด/เกิน", value: `${sum < 100 ? "ขาด" : "เกิน"} ${fmtTrim(Math.abs(100 - sum), 2)}%` }],
        tip: "แก้ % ของงวดหรือมัดจำให้รวมได้ 100% พอดี",
      });
    }
    weights = values;
    pctLabels = values.map((x) => `${fmtTrim(x, 2)}%`);
  }
  const inst = allocate(remS, weights);
  const retTotal = pctOf(remS, retPct);
  const rets = allocate(retTotal, inst);
  const nets = inst.map((x, k) => x - rets[k]);
  const netSum = nets.reduce((s, x) => s + x, 0);

  return resultX({
    title: "งวดงาน / มัดจำ",
    headline: `มัดจำ ${baht(depS)} · ${fmt(inst.length)} งวด${retPct > 0 ? ` · กันประกันผลงาน ${baht(retTotal)}` : ""}`,
    chart: {
      kind: "stack",
      parts: [
        { label: "มัดจำ", value: depS / SATANG, display: baht(depS), tone: "accent" },
        { label: "ค่างวดที่จ่ายจริง", value: netSum / SATANG, display: baht(netSum), tone: "good" },
        { label: "เงินประกันผลงาน", value: retTotal / SATANG, display: baht(retTotal), tone: "warn" },
      ],
      totalLabel: "ค่าจ้างตามสัญญา",
      totalDisplay: baht(totalS),
    },
    rows: [
      { label: `มัดจำ ${fmtTrim(depPct, 2)}%`, value: baht(depS), emphasize: true },
      ...inst.map((x, k) => ({
        label: `งวดที่ ${k + 1}${pctLabels ? ` (${pctLabels[k]})` : ""}`,
        value: retPct > 0 ? `${baht(x)} · หักประกัน ${baht(rets[k])} · จ่ายจริง ${baht(nets[k])}` : baht(x),
        emphasize: true,
      })),
      ...(retPct > 0 ? [{ label: `เงินประกันผลงาน ${fmtTrim(retPct, 2)}% (คืนเมื่อหมดประกัน)`, value: baht(retTotal), emphasize: true }] : []),
      { label: "ตรวจยอด", value: `มัดจำ + ทุกงวด = ${baht(depS + inst.reduce((s, x) => s + x, 0))} เท่าสัญญาพอดี` },
    ],
    tip: "เขียนในสัญญาว่าแต่ละงวดจ่ายเมื่องานถึงขั้นไหน (เช่น ฉาบเสร็จ ปูกระเบื้องเสร็จ) ไม่ใช่ตามวันที่อย่างเดียว",
    explain: {
      risk: "A",
      updatedAt: UPDATED,
      summary: "มัดจำ = สัญญา × % · ที่เหลือแบ่งเป็นงวด ปัดสตางค์ทุกงวดแล้วงวดสุดท้ายรับเศษ · เงินประกันผลงานหักจากค่างวด (ไม่หักจากมัดจำ) แบ่งแบบเดียวกัน",
      steps: [
        { label: "มัดจำ", expr: "สัญญา × มัดจำ%", subst: `${fmt(totalS / SATANG, 2)} × ${fmtTrim(depPct, 2)}% = ${fmt(depS / SATANG, 2)} บาท` },
        {
          label: "แบ่งงวด",
          expr: mode === "equal" ? "ที่เหลือ ÷ จำนวนงวด · งวดสุดท้าย = ที่เหลือ − งวดก่อนหน้า" : "สัญญา × % ของงวด · งวดสุดท้าย = ที่เหลือ − งวดก่อนหน้า",
          subst: `${fmt(remS / SATANG, 2)} → ${inst.map((x) => fmt(x / SATANG, 2)).join(" + ")} บาท`,
        },
        ...(retPct > 0
          ? [{ label: "เงินประกันผลงาน", expr: "ค่างวดรวม × ประกัน% แบ่งตามสัดส่วนงวด", subst: `${fmt(remS / SATANG, 2)} × ${fmtTrim(retPct, 2)}% = ${fmt(retTotal / SATANG, 2)} บาท` }]
          : []),
      ],
      constants: [TAX.satangPerBaht],
      assumptions: [
        mode === "custom" ? "% ของแต่ละงวดคิดจากยอดสัญญาเต็ม และมัดจำ + ทุกงวดต้องรวมได้ 100%" : "งวดเท่ากันทุกงวด",
        "เงินประกันผลงานหักจากค่างวด ไม่หักจากมัดจำ",
        "ยอดสัญญาเป็นฐานเดียวกับที่ตกลง (รวมหรือไม่รวม VAT ตามสัญญา)",
      ],
      caveats: ["มีหัก ณ ที่จ่ายด้วย ให้คิดแยกต่อในเครื่องมือ VAT / หัก ณ ที่จ่าย ทีละงวด", DISCLAIMER_AB],
      refs: [{ label: "แนวปฏิบัติสัญญาจ้างเหมาก่อสร้าง (มัดจำ งวดงาน เงินประกันผลงาน)" }],
    },
  });
}

/* ─────────── ค่าแรงตามพื้นที่ / ตามวัน ─────────── */

export function calcLabour(v: Values): CalcResult {
  const bad = guard("labour", v);
  if (bad) return bad;
  const area = num(v, "area", 60);
  const job = str(v, "job", "tileFloor");
  const custom = job === "custom";
  const rate = custom ? num(v, "rate", 15) : LABOUR_RATES[job].rate.value;
  const crew = num(v, "crew", LABOUR.crew.value);
  const teams = num(v, "teams", 1);
  const wage = num(v, "wage", LABOUR.wage.value);
  const rounding = str(v, "round", "full");
  const rawDays = area / (rate * teams);
  const step = LABOUR.halfDay.value;
  const days = rounding === "full" ? ceil(rawDays) : rounding === "half" ? ceil(rawDays / step) * step : rawDays;
  const manDays = days * crew * teams;
  const costS = toSatang(manDays * wage);
  const perM2 = costS / SATANG / area;
  const jobName = custom ? "อัตรากรอกเอง" : `${LABOUR_RATES[job].label} (ค่าทั่วไป)`;

  return resultX({
    title: "ค่าแรงตามพื้นที่ / ตามวัน",
    headline: `${fmtTrim(days, 2)} วัน · ค่าแรง ${baht(costS)} · ตก ${fmt(perM2, 2)} บาท/ตร.ม.`,
    rows: [
      { label: "งาน", value: `${jobName} ${fmtTrim(rate, 2)} ตร.ม./วัน/ทีม` },
      { label: "วันทำงาน (ไม่ปัด)", value: `${fmt(area, 2)} ÷ (${fmtTrim(rate, 2)} × ${fmt(teams)} ทีม) = ${fmt(rawDays, 2)} วัน` },
      { label: rounding === "none" ? "คิดวันตามจริง" : rounding === "half" ? "ปัดขึ้นทีละครึ่งวัน" : "ปัดขึ้นเป็นวันเต็ม", value: `${fmtTrim(days, 2)} วัน`, emphasize: true },
      { label: "แรงงานรวม", value: `${fmtTrim(manDays, 2)} แรง (${fmt(crew)} คน × ${fmt(teams)} ทีม × ${fmtTrim(days, 2)} วัน)` },
      { label: `ค่าแรง (${fmt(wage, 2)} บาท/คน/วัน)`, value: baht(costS), emphasize: true },
      { label: "ตกต่อตารางเมตร", value: `${fmt(perM2, 2)} บาท/ตร.ม.`, emphasize: true },
    ],
    tip: "อัตรางานต่อวันใช้ของทีมตัวเองดีที่สุด — จดไว้ทุกงานแล้วกลับมาแก้ช่องกรอกเอง ตัวเลขจะแม่นขึ้นเรื่อย ๆ",
    explain: {
      risk: "A",
      updatedAt: UPDATED,
      summary: "วัน = พื้นที่ ÷ (อัตรางานต่อทีม × จำนวนทีม) แล้วปัดตามที่เลือก · ค่าแรง = วัน × คนต่อทีม × ทีม × ค่าแรงต่อคน · ต่อ ตร.ม. = ค่าแรง ÷ พื้นที่",
      steps: [
        { label: "วันทำงาน", expr: "พื้นที่ ÷ (อัตรา × ทีม)", subst: `${fmt(area, 2)} ÷ (${fmtTrim(rate, 2)} × ${fmt(teams)}) = ${fmt(rawDays, 3)} → ${fmtTrim(days, 2)} วัน` },
        { label: "ค่าแรง", expr: "วัน × คน × ทีม × ค่าแรง", subst: `${fmtTrim(days, 2)} × ${fmt(crew)} × ${fmt(teams)} × ${fmt(wage, 2)} = ${fmt(costS / SATANG, 2)} บาท` },
        { label: "ต่อ ตร.ม.", expr: "ค่าแรง ÷ พื้นที่", subst: `${fmt(costS / SATANG, 2)} ÷ ${fmt(area, 2)} = ${fmt(perM2, 2)} บาท/ตร.ม.` },
      ],
      constants: [...(custom ? [] : [LABOUR_RATES[job].rate]), LABOUR.wage, ...(rounding === "half" ? [LABOUR.halfDay] : [])],
      assumptions: ["อัตรางานคงที่ทุกวัน ไม่รวมวันเตรียมพื้นผิว รอแห้ง หรือเก็บงาน", "ทุกทีมทำได้เท่ากัน"],
      caveats: [
        "อัตรางานที่ตั้งไว้เป็นค่าทั่วไป ผันแปรมากตามขนาดวัสดุ ความยากหน้างาน และฝีมือ",
        "ยังไม่รวมค่าเดินทาง ค่าอาหาร ค่าเครื่องมือ และวันฝนตก",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "อัตรางานของทีม (ควรจดจากงานจริง)" }],
    },
  });
}

/* ─────────── ฟอร์ม ─────────── */

function quoteLineFields(): Field[] {
  const out: Field[] = [];
  for (let i = 1; i <= MAX_LINES; i++) {
    const def = lineDefault(i);
    const when = { key: "lines", is: Array.from({ length: MAX_LINES - i + 1 }, (_, k) => String(i + k)) };
    out.push(
      { type: "text", key: `d${i}`, label: `รายการ ${i} (ไม่ใส่ก็ได้)`, placeholder: "เช่น กระเบื้อง 60×60 (ตร.ม.)", default: def.d, when },
      { type: "number", key: `q${i}`, label: `จำนวน ${i}`, default: def.q, min: 0, max: 100000, step: 0.01, when },
      { type: "number", key: `p${i}`, label: `ราคาทุนต่อหน่วย ${i}`, unit: "บาท", default: def.p, min: 0, max: 1000000, step: 0.01, when },
    );
  }
  return out;
}

const kindField: Field = {
  type: "select",
  key: "kind",
  label: "คิดกำไรแบบ",
  default: "markup",
  options: [
    { value: "markup", label: "บวกจากทุน (markup)" },
    { value: "margin", label: "กำไรต่อราคาขาย (margin)" },
  ],
};

const vatModeOptions = [
  { value: "excl", label: "ราคายังไม่รวม VAT (บวก VAT)" },
  { value: "incl", label: "ราคารวม VAT แล้ว (แยก VAT ออก)" },
  { value: "none", label: "ไม่จด VAT" },
];

/** อัตรา VAT แก้ได้ — ค่าเริ่มต้น 7% เป็นอัตราลดตามพระราชกฤษฎีกาที่ต่ออายุเป็นช่วง ไม่ใช่ค่าตายตัว */
function vatRateField(modeKey: string): Field {
  return {
    type: "number",
    key: "vatRate",
    label: "อัตรา VAT (ตรวจพระราชกฤษฎีกาลดอัตรา VAT ฉบับที่ใช้อยู่)",
    unit: "%",
    default: TAX.vat.value,
    min: 1,
    max: 10,
    step: 0.01,
    when: { key: modeKey, is: ["excl", "incl"] },
  };
}

export const estimateTools: ToolDef[] = [
  {
    id: "quote",
    name: "ใบเสนอราคาเร็ว",
    blurb: "รายการ ค่าแรง กำไร VAT หัก ณ ที่จ่าย 3%",
    keywords: ["ใบเสนอราคา", "quotation", "ใบเสนอ", "vat", "หัก ณ ที่จ่าย", "ราคางาน"],
    fields: [
      {
        type: "select",
        key: "lines",
        label: "จำนวนรายการ",
        default: "3",
        options: Array.from({ length: MAX_LINES }, (_, k) => ({ value: String(k + 1), label: `${k + 1} รายการ` })),
      },
      ...quoteLineFields(),
      { type: "number", key: "labour", label: "ค่าแรงรวม (ทุน)", unit: "บาท", default: 8000, min: 0, max: 100000000, step: 0.01 },
      kindField,
      { type: "number", key: "pct", label: "กำไร", unit: "%", default: 10, min: 0, max: 90, step: 0.1 },
      { type: "select", key: "vat", label: "VAT", default: "excl", options: vatModeOptions },
      vatRateField("vat"),
      {
        type: "select",
        key: "wht",
        label: "ลูกค้าหัก ณ ที่จ่าย 3%",
        default: "none",
        options: [
          { value: "none", label: "ไม่หัก (ลูกค้าบุคคลทั่วไป)" },
          { value: "all", label: "หักทั้งใบ" },
          { value: "labour", label: "หักเฉพาะค่าแรง (สัญญาแยกค่าของ)" },
        ],
      },
    ],
    calc: calcQuote,
  },
  {
    id: "markup",
    name: "บวกกำไร markup ↔ margin",
    blurb: "ทุน + % → ราคาขาย กำไร อีกแบบกี่ %",
    keywords: ["บวกกำไร", "markup", "margin", "กำไร", "ราคาขาย", "ต้นทุน"],
    fields: [
      { type: "number", key: "cost", label: "ทุน", unit: "บาท", default: 1000, min: 0.01, max: 1000000000, step: 0.01 },
      kindField,
      { type: "number", key: "mu", label: "บวกจากทุน", unit: "%", default: 25, min: 0, max: 1000, step: 0.1, when: { key: "kind", is: "markup" } },
      { type: "number", key: "mg", label: "กำไรต่อราคาขาย", unit: "%", default: 25, min: 0, max: 95, step: 0.1, when: { key: "kind", is: "margin" } },
    ],
    calc: calcMarkup,
  },
  {
    id: "vat",
    name: "VAT / หัก ณ ที่จ่าย",
    blurb: "รวม-แยก VAT หัก 1/2/3/5% รับจริง",
    keywords: ["vat", "ภาษีมูลค่าเพิ่ม", "7%", "หัก ณ ที่จ่าย", "50 ทวิ", "ถอด vat"],
    fields: [
      { type: "number", key: "amt", label: "จำนวนเงิน", unit: "บาท", default: 10000, min: 0.01, max: 1000000000, step: 0.01 },
      { type: "select", key: "mode", label: "จำนวนเงินนี้", default: "excl", options: vatModeOptions },
      vatRateField("mode"),
      { type: "select", key: "wht", label: "หัก ณ ที่จ่าย", default: "3", options: Object.entries(WHT_RATES).map(([value, r]) => ({ value, label: r.label })) },
    ],
    calc: calcVatWht,
  },
  {
    id: "instalment",
    name: "งวดงาน / มัดจำ",
    blurb: "มัดจำ แบ่งงวด เงินประกันผลงาน รวมเท่าสัญญาพอดี",
    keywords: ["งวดงาน", "มัดจำ", "แบ่งงวด", "เงินประกันผลงาน", "retention", "งวดเงิน"],
    fields: [
      { type: "number", key: "total", label: "ค่าจ้างตามสัญญา", unit: "บาท", default: 250000, min: 1000, max: 1000000000, step: 0.01 },
      { type: "number", key: "dep", label: "มัดจำ", unit: "%", default: 30, min: 0, max: 90, step: 0.5 },
      {
        type: "select",
        key: "mode",
        label: "แบ่งงวด",
        default: "equal",
        options: [
          { value: "equal", label: "เท่ากันทุกงวด" },
          { value: "custom", label: "กำหนด % เอง" },
        ],
      },
      { type: "number", integer: true, key: "n", label: "จำนวนงวด (ไม่นับมัดจำ)", unit: "งวด", default: 3, min: 1, max: 12, when: { key: "mode", is: "equal" } },
      { type: "text", key: "list", label: "% ของสัญญาแต่ละงวด (มัดจำ + ทุกงวด = 100)", placeholder: "40, 30", default: "40, 30", when: { key: "mode", is: "custom" } },
      { type: "number", key: "ret", label: "เงินประกันผลงาน (หักจากค่างวด)", unit: "%", default: 5, min: 0, max: 20, step: 0.5 },
    ],
    calc: calcInstalments,
  },
  {
    id: "labour",
    name: "ค่าแรงตามพื้นที่ / ตามวัน",
    blurb: "ตร.ม. อัตรางาน ทีม ค่าแรง → วัน บาท/ตร.ม.",
    keywords: ["ค่าแรง", "ค่าช่าง", "แรงงาน", "รายวัน", "เหมา", "ต่อตารางเมตร"],
    fields: [
      { type: "number", key: "area", label: "พื้นที่งาน", unit: "ตร.ม.", default: 60, min: 0.1, max: 100000, step: 0.1 },
      {
        type: "select",
        key: "job",
        label: "งาน (อัตรางานต่อวันต่อทีม)",
        default: "tileFloor",
        options: [
          ...Object.entries(LABOUR_RATES).map(([value, r]) => ({ value, label: `${r.label} ~${fmtTrim(r.rate.value, 1)} ตร.ม./วัน (ค่าทั่วไป)` })),
          { value: "custom", label: "กรอกอัตราของทีมเอง" },
        ],
      },
      { type: "number", key: "rate", label: "อัตรางานต่อทีม", unit: "ตร.ม./วัน", default: 15, min: 0.5, max: 1000, step: 0.5, when: { key: "job", is: "custom" } },
      { type: "number", integer: true, key: "crew", label: "คนต่อทีม", unit: "คน", default: LABOUR.crew.value, min: 1, max: 50 },
      { type: "number", integer: true, key: "teams", label: "จำนวนทีม", unit: "ทีม", default: 1, min: 1, max: 20 },
      { type: "number", key: "wage", label: "ค่าแรงต่อคนต่อวัน", unit: "บาท", default: LABOUR.wage.value, min: 100, max: 10000 },
      {
        type: "select",
        key: "round",
        label: "ปัดวัน",
        default: "full",
        options: [
          { value: "full", label: "ปัดขึ้นเป็นวันเต็ม" },
          { value: "half", label: "ปัดขึ้นทีละครึ่งวัน" },
          { value: "none", label: "คิดตามจริง ไม่ปัด" },
        ],
      },
    ],
    calc: calcLabour,
  },
];
