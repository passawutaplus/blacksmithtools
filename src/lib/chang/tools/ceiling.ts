import type { CalcResult, JobDef, ToolDef, Values } from "../types";
import { blockedResult, ceil, fmt, fmtTrim, guardInputs, guardTool, jobFromParts, num, resultX, round, stockPieces, str, withDefaults } from "../math";
import { CEILING, DISCLAIMER_AB, GYP_FINISH, PARTITION, WASTE_DEFAULT } from "../constants";

const guard = (id: string, v: Values) => guardTool(ceilingTools, id, v);

/** สกรูต่อแผ่นยิปซัม 1.2×2.4 ม.: จำนวนแนวโครงใต้แผ่น × จำนวนสกรูต่อแนว (ตามระยะโครงและระยะสกรูในค่าคงที่) */
export function screwsPerBoard(): number {
  const lines = Math.round(CEILING.boardL.value / CEILING.furringSpacing.value) + 1;
  const perLine = Math.ceil(CEILING.boardW.value / CEILING.screwSpacing.value - 1e-9) + 1;
  return lines * perLine;
}

function area(v: Values) {
  return num(v, "w", 4) * num(v, "l", 5);
}

/** ความยาวโครงที่ร้านขายเป็นเส้น (ผู้ใช้แก้ได้ — ค่าเริ่มต้น 4 ม.) */
function stockLen(v: Values) {
  return num(v, "stock", CEILING.frameStock.value);
}

/** "53 ม. ≈ 14 เส้น (เส้นละ 4 ม.)" — ช่างสั่งโครงเป็นเส้น ไม่ได้สั่งเป็นเมตร */
function sticks(totalM: number, stock: number) {
  return `${fmt(totalM, 0)} ม. ≈ ${stockPieces(totalM, stock).text}`;
}

export function calcGypsum(v: Values) {
  const bad = guard("gypsum", v);
  if (bad) return bad;
  const a = area(v);
  const wastePct = num(v, "waste", WASTE_DEFAULT.value);
  const need = (a / CEILING.boardArea.value) * (1 + wastePct / 100);
  const boards = ceil(need);
  const hangers = ceil(a / (1.2 * 0.9));
  const cline = ceil((a / CEILING.furringSpacing.value) * 1.05);
  const mainRunner = ceil((a / CEILING.mainSpacing.value) * 1.05);
  const wallAngle = ceil(2 * (num(v, "w", 4) + num(v, "l", 5)));
  const stock = stockLen(v);
  const lastUsed = need - Math.floor(need) || 1;

  return resultX({
    title: "ฝ้ายิปซัมฉาบเรียบ",
    headline: `ยิปซัม ${boards} แผ่น`,
    chart: {
      kind: "packs",
      unitLabel: "แผ่น 1.2×2.4 ม.",
      count: boards,
      lastUsed,
      note: `พื้นที่ ${fmt(a, 2)} ตร.ม. + เผื่อเสีย ${fmt(wastePct)}%`,
    },
    rows: [
      { label: "พื้นที่", value: `${fmt(a, 2)} ตร.ม.` },
      { label: "แผ่น 1.2×2.4", value: `${boards} แผ่น`, emphasize: true },
      { label: "ชุดแขวน", value: `${hangers} ชุด` },
      { label: "โครง C-Line ล่าง (ซอย) ประมาณ", value: sticks(cline, stock) },
      { label: "โครง C-Line บน (โครงหลัก) ประมาณ", value: sticks(mainRunner, stock) },
      { label: "ฉากริมผนัง", value: sticks(wallAngle, stock) },
    ],
    tip: "ระยะแขวนไม่เกิน 1.2 ม. โครงล่างทุก 40 ซม. โครงบนทุก 1.2 ม.",
    explain: {
      risk: "A",
      updatedAt: "2026-11-25",
      summary: "จำนวนแผ่นยิปซัม = พื้นที่ฝ้า ÷ พื้นที่แผ่น (1.2×2.4=2.88 ตร.ม.) เผื่อเสียจากการตัดเข้ามุม/ท่อ โครง C-Line ล่างคิดที่ระยะ 40 ซม. โครงบน 1.2 ม. และชุดแขวนคิดจากระยะ 1.2×0.9 ม.",
      steps: [
        { label: "จำนวนแผ่นยิปซัม", expr: "ปัดขึ้น(พื้นที่ ÷ 2.88 × (1+เผื่อเสีย))", subst: `${fmt(a, 2)} ÷ 2.88 × ${fmt(1 + wastePct / 100, 2)} = ${boards} แผ่น` },
        { label: "จำนวนชุดแขวน", expr: "พื้นที่ ÷ (1.2×0.9)", subst: `${fmt(a, 2)} ÷ 1.08 = ${hangers} ชุด` },
        { label: "โครง C-Line ล่าง (ซอย)", expr: "(พื้นที่ ÷ 0.4) × 1.05", subst: `${fmt(a, 2)} ÷ 0.4 × 1.05 ≈ ${fmt(cline, 0)} ม.` },
        { label: "โครง C-Line บน (โครงหลัก)", expr: "(พื้นที่ ÷ 1.2) × 1.05", subst: `${fmt(a, 2)} ÷ 1.2 × 1.05 ≈ ${fmt(mainRunner, 0)} ม.` },
        { label: "ฉากริมผนัง", expr: "2 × (กว้าง + ยาว)", subst: `2 × (${fmt(num(v, "w", 4), 1)} + ${fmt(num(v, "l", 5), 1)}) ≈ ${fmt(wallAngle, 0)} ม.` },
        {
          label: "แปลงเป็นจำนวนเส้น",
          expr: "ปัดขึ้น(ความยาวรวม ÷ ความยาวเส้น)",
          subst: `${fmt(cline, 0)} ÷ ${fmtTrim(stock, 2)} = ${stockPieces(cline, stock).count} เส้น (โครงล่าง)`,
          note: "ปัดขึ้นแยกแต่ละชนิด เพราะซื้อแยกกัน",
        },
      ],
      constants: [CEILING.boardArea, CEILING.furringSpacing, CEILING.mainSpacing, CEILING.frameStock],
      assumptions: ["ระยะแขวนโครงเพดานมาตรฐาน 1.2×0.9 ม. ตามระบบฝ้าฉาบเรียบทั่วไป", "จำนวนเส้นคิดจากความยาวรวม ยังไม่หักเศษที่ต่อไม่ได้ ถ้าห้องยาวไม่ลงตัวกับความยาวเส้นให้เผื่อเพิ่ม"],
      caveats: [
        "ห้องที่มีคานหรือท่องานระบบพาดผ่านต้องเพิ่มจุดแขวนเสริมเฉพาะจุด ไม่ใช่คิดจากระยะห่างมาตรฐานอย่างเดียว",
        "ฝ้าที่ต้องรับดาวน์ไลท์/แอร์ฝังต้องเสริมโครงรับเฉพาะจุดก่อนติดแผ่น",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวปฏิบัติงานติดตั้งฝ้ายิปซัมฉาบเรียบ (Gypsum Board Ceiling System)" }],
    },
  });
}

export function calcTbar(v: Values) {
  const bad = guard("tbar", v);
  if (bad) return bad;
  const a = area(v);
  const w = num(v, "w", 4);
  const l = num(v, "l", 5);
  const big = str(v, "tile", "60") === "120";
  const tileSize = big ? 0.72 : 0.36;
  const need = (a / tileSize) * 1.05;
  const tiles = ceil(need);
  // กริดทีบาร์: Main tee ทุก 1.2 ม. · Cross tee 1.2 ม. ทุก 0.6 ม. · แผ่น 60×60 ต้องมี Cross tee 0.6 ม. ซอยกลางช่องอีกชุด
  const mainRaw = (w / 1.2) * l;
  const crossRaw = (l / 0.6) * w;
  const shortRaw = big ? 0 : (w / 1.2) * l;
  const main = ceil(mainRaw);
  const cross = ceil(crossRaw);
  const short = ceil(shortRaw);
  const total = ceil(mainRaw + crossRaw + shortRaw);
  const wallAngle = ceil(2 * (w + l));
  const stock = stockLen(v);
  // Cross tee ขายเป็นท่อนสำเร็จ 1.2 ม. / 0.6 ม. จึงนับเป็นท่อนได้ตรง ๆ
  const crossPcs = ceil(crossRaw / 1.2);
  const shortPcs = ceil(shortRaw / 0.6);
  // ลวดแขวนตามแนว Main tee ทุก ๆ ระยะแขวน
  const hangerPts = ceil(mainRaw / CEILING.tbarHangerSpacing.value);
  const lastUsed = need - Math.floor(need) || 1;

  return resultX({
    title: "ฝ้าทีบาร์",
    headline: `แผ่นทีบาร์ ${tiles} แผ่น`,
    chart: {
      kind: "packs",
      unitLabel: `แผ่น ${big ? "60×120" : "60×60"} ซม.`,
      count: tiles,
      lastUsed,
      note: `พื้นที่ ${fmt(a, 2)} ตร.ม. + เผื่อมุมห้อง 5%`,
    },
    rows: [
      { label: "แผ่นฝ้า", value: `${tiles} แผ่น`, emphasize: true },
      { label: "Main tee ประมาณ", value: sticks(main, stock) },
      { label: "Cross tee 1.2 ม. ประมาณ", value: `${fmt(cross)} ม. ≈ ${fmt(crossPcs)} ท่อน` },
      ...(big ? [] : [{ label: "Cross tee 0.6 ม. ประมาณ", value: `${fmt(short)} ม. ≈ ${fmt(shortPcs)} ท่อน` }]),
      { label: "โครงทีบาร์รวมประมาณ", value: `${fmt(total)} ม.` },
      { label: "ฉากริมผนัง", value: sticks(wallAngle, stock) },
      { label: "ลวดแขวน + พุก", value: `${fmt(hangerPts)} จุด (ทุก ${fmtTrim(CEILING.tbarHangerSpacing.value, 2)} ม. ตามแนว Main tee)` },
    ],
    tip: "เผื่อแผ่นมุมห้อง 5% ตรวจระดับก่อนใส่แผ่นสุดท้าย",
    explain: {
      risk: "A",
      updatedAt: "2026-11-25",
      summary:
        "จำนวนแผ่นฝ้าทีบาร์ = พื้นที่ห้อง ÷ พื้นที่แผ่น เผื่อมุมห้อง 5% ส่วนโครงคิดจากกริดมาตรฐาน: Main tee ทุก 1.2 ม. Cross tee 1.2 ม. ทุก 0.6 ม. และแผ่น 60×60 เพิ่ม Cross tee 0.6 ม.",
      steps: [
        { label: "จำนวนแผ่นฝ้า", expr: "ปัดขึ้น(พื้นที่ ÷ ขนาดแผ่น × 1.05)", subst: `${fmt(a, 2)} ÷ ${tileSize} × 1.05 = ${tiles} แผ่น` },
        { label: "Main tee ประมาณ", expr: "(กว้าง ÷ 1.2) × ยาว", subst: `(${fmt(w, 1)} ÷ 1.2) × ${fmt(l, 1)} ≈ ${fmt(main)} ม.` },
        { label: "Cross tee 1.2 ม. ประมาณ", expr: "(ยาว ÷ 0.6) × กว้าง", subst: `(${fmt(l, 1)} ÷ 0.6) × ${fmt(w, 1)} ≈ ${fmt(cross)} ม.` },
        ...(big
          ? []
          : [
              {
                label: "Cross tee 0.6 ม. (เฉพาะแผ่น 60×60)",
                expr: "(กว้าง ÷ 1.2) × ยาว",
                subst: `(${fmt(w, 1)} ÷ 1.2) × ${fmt(l, 1)} ≈ ${fmt(short)} ม.`,
              },
            ]),
        { label: "ฉากริมผนัง", expr: "2 × (กว้าง + ยาว)", subst: `2 × (${fmt(w, 1)} + ${fmt(l, 1)}) ≈ ${fmt(wallAngle)} ม.` },
        {
          label: "จุดแขวนลวด",
          expr: "ปัดขึ้น(ความยาว Main tee ÷ ระยะแขวน)",
          subst: `${fmt(mainRaw, 1)} ÷ ${fmtTrim(CEILING.tbarHangerSpacing.value, 2)} = ${fmt(hangerPts)} จุด`,
        },
      ],
      constants: [CEILING.frameStock, CEILING.tbarHangerSpacing],
      assumptions: [
        "โครงกริดทีบาร์มาตรฐาน Main tee ระยะ 1.2 ม. Cross tee 1.2 ม. ระยะ 0.6 ม. แผ่น 60×60 ซอย Cross tee 0.6 ม. กลางช่อง",
        "Main tee และฉากริมแปลงเป็นเส้นตามความยาวเส้นที่กรอก ส่วน Cross tee นับเป็นท่อนสำเร็จ 1.2 ม. / 0.6 ม.",
      ],
      caveats: [
        "ห้องที่ไม่ได้สี่เหลี่ยมจตุรัส/มีเสาโผล่กลางห้องต้องตัดแผ่นเพิ่ม เผื่อมากกว่า 5% ตามความซับซ้อนจริง",
        "ความยาวลวดแขวนต่อจุดขึ้นกับระยะหิ้วจากท้องพื้น/โครงหลังคา ให้วัดหน้างานแล้วคูณจำนวนจุด",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "แนวปฏิบัติงานติดตั้งฝ้าทีบาร์ (Exposed Grid T-bar Ceiling)" }],
    },
  });
}

export function calcRt60(v: Values) {
  const bad = guard("acoustic", v);
  if (bad) return bad;
  const a = area(v);
  const h = num(v, "h", 2.8);
  const vol = a * h;
  const alpha = num(v, "alpha", 0.15);
  const A = a * 2 * alpha + 2 * (num(v, "w", 4) + num(v, "l", 5)) * h * 0.05;
  const rt = (0.161 * vol) / Math.max(A, 0.1);
  const need = rt > 0.8;
  const panels = need ? ceil(((0.161 * vol) / 0.8 - A) / 0.8) : 0;
  const chartMax = Math.max(rt * 1.3, 1.6);

  return resultX({
    title: "RT60 อะคูสติก",
    headline: `RT60 ≈ ${fmt(rt, 2)} วินาที`,
    chart: {
      kind: "threshold",
      unit: "วินาที",
      value: round(rt, 2),
      max: chartMax,
      zones: [
        { upTo: 0.8, tone: "good", label: "ก้องน้อย เหมาะบ้าน/ออฟฟิศ/ห้องประชุม" },
        { upTo: 1.2, tone: "warn", label: "ก้องพอสังเกตได้ ฟังเสียงพูดยากขึ้น" },
        { upTo: chartMax, tone: "bad", label: "ก้องมาก ควรเพิ่มแผ่นซับเสียง" },
      ],
    },
    rows: [
      { label: "ปริมาตรห้อง", value: `${fmt(vol, 1)} ลบ.ม.` },
      { label: "เวลาก้อง", value: `${fmt(rt, 2)} วินาที`, emphasize: true },
      { label: "แผ่นซับเพิ่ม", value: need ? `ประมาณ ${panels} ตร.ม.` : "ยังไม่จำเป็น" },
    ],
    tip: "บ้าน/ออฟฟิศเป้าไม่เกิน 0.8 วินาที ห้องประชุมยาวเกินนี้คุยแล้วก้อง",
    explain: {
      risk: "B",
      updatedAt: "2026-08-21",
      summary: "เวลาก้อง (Reverberation Time, RT60) ประมาณจากสมการ Sabine: RT60 = 0.161×ปริมาตรห้อง ÷ พื้นที่ดูดซับเสียงสมมูล ยิ่งพื้นผิวดูดซับมาก (α สูง) เวลาก้องยิ่งสั้น เสียงพูดชัดขึ้น",
      steps: [
        { label: "ปริมาตรห้อง", expr: "พื้นที่ × สูง", subst: `${fmt(a, 2)} × ${fmt(h, 1)} = ${fmt(vol, 1)} ลบ.ม.` },
        {
          label: "พื้นที่ดูดซับเสียงสมมูล",
          expr: "A = พื้น+ฝ้า×2×α + ผนังรอบ×สูง×0.05",
          subst: `${fmt(a, 2)}×2×${fmt(alpha, 2)} + 2×(${fmt(num(v, "w", 4), 1)}+${fmt(num(v, "l", 5), 1)})×${fmt(h, 1)}×0.05 = ${fmt(A, 2)}`,
        },
        { label: "สมการ Sabine", expr: "RT60 = 0.161 × ปริมาตร ÷ A", subst: `0.161 × ${fmt(vol, 1)} ÷ ${fmt(A, 2)} = ${fmt(rt, 2)} วินาที` },
      ],
      constants: [{ value: 0.161, unit: "-", label: "ค่าคงที่สมการ Sabine", source: "Sabine Reverberation Time Formula (หน่วยเมตริก)" }],
      assumptions: ["ค่าดูดซับ α ของพื้น/ฝ้าใส่เป็นค่าเฉลี่ยเดียว ผนังคิดค่าดูดซับต่ำ 0.05 (ผนังปูนเรียบทั่วไป)", "ห้องรูปทรงปกติ ไม่มีพื้นผิวสะท้อนเสียงเฉพาะจุดรุนแรง (เช่น กระจกใหญ่หรือผนังโค้ง)"],
      caveats: [
        "ห้องประชุม/ห้องเรียน/สตูดิโอบันทึกเสียงมีเกณฑ์ RT60 เฉพาะทางที่ต่างจากบ้านพักอาศัย ควรปรึกษาผู้เชี่ยวชาญด้านอะคูสติกสำหรับพื้นที่ใช้งานพิเศษ",
        "ค่านี้เป็นการประมาณคร่าว ๆ ด้วยสมการ Sabine ซึ่งแม่นยำน้อยลงเมื่อพื้นที่ดูดซับเสียงมีการกระจายไม่สม่ำเสมอ",
      ],
      refs: [{ label: "Sabine's Reverberation Time Formula — หลักอะคูสติกสถาปัตยกรรมพื้นฐาน" }],
    },
  });
}

export function calcInsulation(v: Values) {
  const bad = guard("insulation", v);
  if (bad) return bad;
  const a = area(v);
  const thick = num(v, "thick", 50);
  const kind = str(v, "kind", "glass");
  const k = kind === "rock" ? 0.036 : kind === "pe" ? 0.035 : 0.04;
  const R = thick / 1000 / k;
  const need = a / 7.2;
  const packs = ceil(need);
  const lastUsed = need - Math.floor(need) || 1;

  return resultX({
    title: "ฉนวนกันร้อน-เสียง",
    headline: `R ≈ ${fmt(R, 1)} ม²·K/W`,
    chart: {
      kind: "packs",
      unitLabel: "แพ็ก 7.2 ตร.ม.",
      count: packs,
      lastUsed,
      note: `หนา ${fmt(thick)} มม. ชนิด${kind === "rock" ? "ร็อกวูล" : kind === "pe" ? "PE โฟม" : "ใยแก้ว"} บนพื้นที่ ${fmt(a, 2)} ตร.ม.`,
    },
    rows: [
      { label: "ชนิด", value: kind === "rock" ? "ร็อกวูล" : kind === "pe" ? "PE โฟม" : "ใยแก้ว" },
      { label: "ค่า R", value: `${fmt(R, 1)}`, emphasize: true },
      { label: "ม้วน/แพ็กประมาณ", value: `${packs} แพ็ก (คิด 7.2 ตร.ม./แพ็ก)` },
    ],
    tip: "ฝ้าชั้นบนบ้านไทย 50 มม. ใยแก้วพอเริ่ม ร้อนจัดใช้ 75–100 มม.",
    explain: {
      risk: "A",
      updatedAt: "2026-08-21",
      summary: "ค่าความต้านทานความร้อน R = ความหนา ÷ ค่าสัมประสิทธิ์การนำความร้อน (k) ของวัสดุ ยิ่งหนาและ k ต่ำ ยิ่งกันร้อนได้ดี ปริมาณที่ต้องซื้อคิดจากพื้นที่ ÷ พื้นที่ต่อแพ็ก",
      steps: [
        { label: "ค่า R ของฉนวน", expr: "R = หนา(ม.) ÷ k", subst: `${fmt(thick / 1000, 3)} ÷ ${k} = ${fmt(R, 1)} ม²·K/W` },
        { label: "จำนวนแพ็ก", expr: "ปัดขึ้น(พื้นที่ ÷ 7.2)", subst: `${fmt(a, 2)} ÷ 7.2 = ${packs} แพ็ก` },
      ],
      constants: [
        {
          value: k,
          unit: "W/m·K",
          label: `ค่า k ของ${kind === "rock" ? "ร็อกวูล" : kind === "pe" ? "PE โฟม" : "ใยแก้ว"}`,
          source: "ค่าเฉลี่ยผลิตภัณฑ์ฉนวนแต่ละชนิดในตลาด",
        },
      ],
      assumptions: ["ติดตั้งฉนวนแบบผืนเดียวสม่ำเสมอไม่มีช่องว่าง (ถ้ามีช่องว่าง/รอยต่อไม่แน่น ค่า R จริงจะต่ำกว่าที่คำนวณ)"],
      caveats: [
        "หลังคาไทยที่โดนแดดจัดทั้งวัน แนะนำหนา 75–100 มม. ขึ้นไปเพื่อลดความร้อนสะสมในฝ้าอย่างมีประสิทธิภาพ",
        "ฉนวนที่โดนความชื้น/รั่วซึมจะเสียคุณสมบัติกันร้อนและเป็นแหล่งเชื้อรา ควรตรวจสอบหลังคาไม่รั่วก่อนติดตั้ง",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "ค่าสัมประสิทธิ์การนำความร้อน (Thermal Conductivity) ของฉนวนกันความร้อนตามผลิตภัณฑ์" }],
    },
  });
}

export function calcHardware(v: Values) {
  const bad = guard("hardware", v);
  if (bad) return bad;
  const a = area(v);
  const boards = ceil(a / CEILING.boardArea.value);
  const perBoard = screwsPerBoard();
  const screws = boards * perBoard;
  const tape = ceil((boards * 2.4 * 2) / 90);
  const mud = round(a * 0.5, 1);

  return resultX({
    title: "สกรู + ฉาบรอยต่อ",
    headline: `สกรูประมาณ ${fmt(screws)} ตัว`,
    chart: {
      kind: "stack",
      parts: [
        { label: "เทปผ้ารอยต่อ", value: tape, display: `${tape} ม้วน`, tone: "accent" },
        { label: "ปูนฉาบรอยต่อ (สัดส่วน กก.)", value: mud, display: `${fmt(mud, 1)} กก.`, tone: "mute" },
      ],
      totalLabel: "สกรูยิปซัมรวม",
      totalDisplay: `${fmt(screws)} ตัว`,
    },
    rows: [
      { label: "สกรูยิปซัม", value: `${fmt(screws)} ตัว`, emphasize: true },
      { label: "เทปผ้า", value: `${tape} ม้วน` },
      { label: "ปูนฉาบรอยต่อ", value: `${fmt(mud, 1)} กก.` },
    ],
    tip: "สกรูทุก 25 ซม. ตามแนวโครงทุกเส้น ฉาบ 3 เที่ยวถ้าจะทาสีเรียบ",
    explain: {
      risk: "A",
      updatedAt: "2026-11-25",
      summary: `อุปกรณ์เก็บผิวฝ้ายิปซัมคิดตามจำนวนแผ่น: สกรูประมาณ ${perBoard} ตัว/แผ่น (โครงทุก 40 ซม. สกรูทุก 25 ซม.) เทปผ้าตามความยาวรอยต่อรวม และปูนฉาบรอยต่อประมาณ 0.5 กก./ตร.ม.`,
      steps: [
        {
          label: "จำนวนสกรู",
          expr: "จำนวนแผ่น × (แนวโครงใต้แผ่น × สกรูต่อแนว)",
          subst: `${boards} × ${perBoard} = ${fmt(screws)} ตัว`,
          note: "แผ่น 2.4 ม. พาดโครง 7 แนว (ทุก 40 ซม.) แนวละ 6 ตัว (ทุก 25 ซม. บนความกว้าง 1.2 ม.)",
        },
        { label: "เทปผ้ารอยต่อ", expr: "ปัดขึ้น(รอยต่อรวม ÷ 90 ม./ม้วน)", subst: `${boards}×2.4×2 ÷ 90 ≈ ${tape} ม้วน` },
        { label: "ปูนฉาบรอยต่อ", expr: "พื้นที่ × 0.5 กก./ตร.ม.", subst: `${fmt(a, 2)} × 0.5 = ${fmt(mud, 1)} กก.` },
      ],
      constants: [CEILING.furringSpacing, CEILING.screwSpacing],
      assumptions: ["สกรูทุก 25 ซม. ตามแนวโครงล่างที่ระยะ 40 ซม. แผ่นมาตรฐาน 1.2×2.4 ม. ไม่รวมเผื่อสกรูเสีย", "ฉาบรอยต่อ 0.5 กก./ตร.ม. เป็นค่าเฉลี่ยสำหรับฉาบ 2–3 เที่ยว"],
      caveats: ["ถ้าต้องการผิวเรียบสำหรับทาสีเนียน ควรฉาบ 3 เที่ยวและขัดละเอียด ปริมาณปูนฉาบอาจสูงกว่าค่าประมาณนี้", DISCLAIMER_AB],
      refs: [{ label: "แนวปฏิบัติงานเก็บผิวฝ้ายิปซัม (Gypsum Board Finishing — Screw, Tape & Joint Compound)" }],
    },
  });
}

/* ─────────── ผนังเบา C-stud / U-track ─────────── */

/** สกรูต่อแผ่นผนังเบา 1.2×2.4 ม. (แผ่นตั้ง): แนวโครงใต้แผ่นตามระยะ C-stud × สกรูต่อแนวตามระยะสกรู */
export function wallScrewsPerBoard(spacing: number): number {
  const lines = Math.round(CEILING.boardW.value / spacing) + 1;
  const perLine = Math.ceil(CEILING.boardL.value / CEILING.screwSpacing.value - 1e-9) + 1;
  return lines * perLine;
}

/** โครงหนึ่งแนวต้องใช้กี่เส้น: สูงไม่เกินเส้นใช้เส้นเดียว สูงกว่านั้นต่อทับกันตามระยะทับต่อ */
export function studsPerLine(h: number, stock: number): number {
  if (h <= stock + 1e-9) return 1;
  return 1 + ceil((h - stock) / (stock - PARTITION.spliceLap.value));
}

export function calcPartition(v: Values): CalcResult {
  const bad = guard("partition", v);
  if (bad) return bad;
  const L = num(v, "l", 4);
  const H = num(v, "h", 2.6);
  const spacing = num(v, "spacing", 60) / 100;
  const layers = num(v, "layers", 1);
  const sides = num(v, "sides", 2);
  const doors = num(v, "doors", 1);
  const stock = num(v, "stock", PARTITION.stock.value);
  const wastePct = num(v, "waste", WASTE_DEFAULT.value);
  const doorW = PARTITION.doorW.value;
  if (doors * doorW >= L - 1e-9) {
    return blockedResult({
      headline: `ช่องประตูรวม ${fmtTrim(doors * doorW, 2)} ม. กว้างเท่าหรือเกินผนัง (${fmtTrim(L, 2)} ม.) — ตรวจความยาวผนังกับจำนวนประตู`,
      tip: "ลดจำนวนประตู หรือตรวจความยาวผนังอีกครั้ง",
    });
  }
  const lines = ceil(L / spacing) + 1 + doors * 2;
  const perLine = studsPerLine(H, stock);
  const studSticks = lines * perLine;
  const trackM = 2 * L;
  const trackSticks = ceil(trackM / stock);
  const doorArea = doors * doorW * Math.min(PARTITION.doorH.value, H);
  const faceArea = L * H - doorArea;
  const boardNeed = (faceArea * sides * layers * (1 + wastePct / 100)) / CEILING.boardArea.value;
  const boards = ceil(boardNeed);
  const perBoard = wallScrewsPerBoard(spacing);
  const screws = boards * perBoard;
  const screwBoxes = ceil(screws / PARTITION.screwBox.value);
  const frameScrews = lines * PARTITION.frameScrews.value;
  const fixings = 2 * (ceil(L / PARTITION.trackFix.value) + 1);
  // เทปปิดรอยต่อเฉพาะแผ่นชั้นนอก: รอยต่อตั้งทุกความกว้างแผ่น + รอยต่อนอนเมื่อผนังสูงกว่าแผ่น
  const vJoints = Math.max(0, ceil(L / CEILING.boardW.value) - 1) * H;
  const hJoints = H > CEILING.boardL.value + 1e-9 ? L * (ceil(H / CEILING.boardL.value) - 1) : 0;
  const tapeM = sides * (vJoints + hJoints);
  const tapeRolls = ceil(tapeM / GYP_FINISH.tapeRoll.value);
  const compoundKg = faceArea * sides * GYP_FINISH.compound.value;
  const compoundBags = ceil(compoundKg / GYP_FINISH.compoundBag.value);
  const tall = H > PARTITION.heightCheck.value + 1e-9;

  return resultX({
    title: "ผนังเบา C-stud / U-track",
    headline: `C-stud ${fmt(studSticks)} เส้น · U-track ${fmt(trackSticks)} เส้น · ยิปซัม ${fmt(boards)} แผ่น`,
    chart: {
      kind: "packs",
      unitLabel: "แผ่น 1.2×2.4 ม.",
      count: boards,
      lastUsed: boardNeed - Math.floor(boardNeed) || 1,
      note: `ผิวผนัง ${fmt(faceArea, 2)} ตร.ม. × ${fmt(sides)} ด้าน × ${fmt(layers)} ชั้น + เผื่อ ${fmt(wastePct)}%`,
    },
    rows: [
      { label: "ผนัง", value: `ยาว ${fmtTrim(L, 2)} × สูง ${fmtTrim(H, 2)} ม. · ประตู ${fmt(doors)} ช่อง` },
      { label: `C-stud (ระยะ ${fmt(spacing * 100)} ซม.)`, value: `${fmt(lines)} แนว × ${fmt(perLine)} = ${fmt(studSticks)} เส้น (เส้นละ ${fmtTrim(stock, 2)} ม.)`, emphasize: true },
      { label: "U-track บน + ล่าง", value: `${fmt(trackM, 1)} ม. = ${fmt(trackSticks)} เส้น`, emphasize: true },
      { label: `แผ่นยิปซัม ${fmt(sides)} ด้าน ${layers === 2 ? "2 ชั้น" : "ชั้นเดียว"}`, value: `${fmt(boards)} แผ่น`, emphasize: true },
      { label: "สกรูยิงแผ่น", value: `${fmt(screws)} ตัว ≈ ${fmt(screwBoxes)} กล่อง (${fmt(perBoard)} ตัว/แผ่น)` },
      { label: "สกรูยึดโครง", value: `${fmt(frameScrews)} ตัว` },
      { label: "พุก/ตะปูยิงยึดราง", value: `${fmt(fixings)} ตัว (ทุก ${fmtTrim(PARTITION.trackFix.value, 2)} ม.)` },
      { label: "เทปปิดรอยต่อ", value: tapeM > 0 ? `${fmt(tapeM, 1)} ม. = ${fmt(tapeRolls)} ม้วน` : "ไม่มีรอยต่อกลางผนัง" },
      { label: "ปูนฉาบรอยต่อ", value: `${fmt(compoundKg, 1)} กก. = ${fmt(compoundBags)} ถุง` },
      ...(tall ? [{ label: "ผนังสูง", value: `เกิน ${fmtTrim(PARTITION.heightCheck.value, 2)} ม. เช็กตารางผู้ผลิตว่าใช้ C-stud ขนาดไหน ระยะเท่าไร`, emphasize: true }] : []),
    ],
    tip: tall
      ? "ผนังสูงใช้ C-stud ตัวใหญ่ขึ้นหรือถี่ขึ้น ดูตารางผู้ผลิต อย่าใช้ระยะเดียวกับผนังสูงปกติ"
      : "แขวนตู้/ทีวีบนผนังเบา ฝังไม้หรือเหล็กเสริมในโครงก่อนปิดแผ่น ประตูเสริมโครงคู่ข้างวงกบ",
    explain: {
      risk: "B",
      updatedAt: "2026-11-25",
      summary: "C-stud = (ยาว ÷ ระยะโครง + 1 + ข้างประตูข้างละ 1) แนว · U-track = บน + ล่าง · แผ่น = ผิวผนังหักประตู × ด้าน × ชั้น ÷ 2.88 ตร.ม.",
      steps: [
        {
          label: "แนว C-stud",
          expr: "ปัดขึ้น(ยาว ÷ ระยะ) + 1 + ประตู × 2",
          subst: `ปัดขึ้น(${fmtTrim(L, 2)} ÷ ${fmtTrim(spacing, 2)}) + 1 + ${fmt(doors)} × 2 = ${fmt(lines)} แนว`,
        },
        {
          label: "เส้นต่อแนว",
          expr: `สูง ≤ ยาวเส้น → 1 เส้น · สูงกว่า → ต่อทับกัน ${PARTITION.spliceLap.value} ม.`,
          subst: `สูง ${fmtTrim(H, 2)} ม. เส้น ${fmtTrim(stock, 2)} ม. → ${fmt(perLine)} เส้น/แนว → ${fmt(studSticks)} เส้น`,
        },
        { label: "U-track", expr: "2 × ยาว ÷ ยาวเส้น ปัดขึ้น", subst: `2 × ${fmtTrim(L, 2)} ÷ ${fmtTrim(stock, 2)} = ${fmt(trackSticks)} เส้น`, note: "รางล่างที่ตัดออกตรงประตูเอาไปทำทับหลังประตู" },
        {
          label: "แผ่นยิปซัม",
          expr: `(ยาว × สูง − ประตู × ${doorW} × ${PARTITION.doorH.value}) × ด้าน × ชั้น × (1 + เผื่อ) ÷ ${CEILING.boardArea.value}`,
          subst: `${fmt(faceArea, 2)} × ${fmt(sides)} × ${fmt(layers)} × ${fmtTrim(1 + wastePct / 100, 2)} ÷ ${CEILING.boardArea.value} = ${fmt(boardNeed, 2)} → ${fmt(boards)} แผ่น`,
        },
        { label: "สกรูยิงแผ่น", expr: "แผ่น × (แนวโครงใต้แผ่น × สกรูต่อแนว)", subst: `${fmt(boards)} × ${fmt(perBoard)} = ${fmt(screws)} ตัว` },
        {
          label: "เทปรอยต่อ",
          expr: "ด้าน × (รอยต่อตั้ง × สูง + รอยต่อนอน × ยาว)",
          subst: `${fmt(sides)} × (${fmt(vJoints, 2)} + ${fmt(hJoints, 2)}) = ${fmt(tapeM, 1)} ม. → ${fmt(tapeRolls)} ม้วน`,
        },
        { label: "ปูนฉาบรอยต่อ", expr: `ผิวผนัง × ด้าน × ${GYP_FINISH.compound.value} กก./ตร.ม.`, subst: `${fmt(faceArea, 2)} × ${fmt(sides)} × ${GYP_FINISH.compound.value} = ${fmt(compoundKg, 1)} กก.` },
      ],
      constants: [
        CEILING.boardArea,
        CEILING.screwSpacing,
        PARTITION.stock,
        PARTITION.spliceLap,
        PARTITION.doorW,
        PARTITION.doorH,
        PARTITION.trackFix,
        PARTITION.frameScrews,
        PARTITION.screwBox,
        PARTITION.heightCheck,
        GYP_FINISH.tapeRoll,
        GYP_FINISH.compound,
        GYP_FINISH.compoundBag,
      ],
      assumptions: [
        "ผนังตรงช่วงเดียว แผ่นยิปซัม 1.2×2.4 ม. ติดแนวตั้ง",
        "แผ่น 2 ชั้นใช้สกรูต่อแผ่นเท่ากับชั้นเดียว (ชั้นในบางระบบยิงห่างกว่า ใช้น้อยกว่านี้)",
        "C-stud ช่วงเหนือประตูใช้เศษจากเส้นเต็ม ไม่ได้นับเพิ่ม",
      ],
      caveats: [
        "ระยะโครงและขนาด C-stud ต้องตรงกับตารางความสูงผนังของผู้ผลิตโครง ผนังสูงหรือบุกระเบื้องต้องถี่ขึ้น",
        "ของหนักบนผนังเบาต้องเสริมโครงเฉพาะจุด ห้ามยึดแผ่นยิปซัมอย่างเดียว",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "คู่มือระบบผนังเบาของผู้ผลิตแผ่นยิปซัม/โครงเหล็กชุบ (ระยะโครง ความสูงสูงสุด)" }],
    },
  });
}

const room = [
  { type: "number" as const, key: "w", label: "กว้าง", unit: "ม.", default: 4, min: 1, max: 100, step: 0.1 },
  { type: "number" as const, key: "l", label: "ยาว", unit: "ม.", default: 5, min: 1, max: 100, step: 0.1 },
];

const stockField = {
  type: "number" as const,
  key: "stock",
  label: "โครงยาวเส้นละ",
  unit: "ม.",
  default: CEILING.frameStock.value,
  min: 2,
  max: 6,
  step: 0.1,
};

export const ceilingTools: ToolDef[] = [
  { id: "gypsum", name: "ฝ้ายิปซัมฉาบเรียบ", blurb: "แผ่น + โครง + แขวน", fields: [...room, { type: "number" as const, key: "waste", label: "เผื่อเสีย", unit: "%", default: 10, min: 0, max: 25 }, stockField], calc: calcGypsum },
  {
    id: "tbar",
    name: "ฝ้าทีบาร์",
    blurb: "60×60 / 60×120",
    fields: [
      ...room,
      {
        type: "select",
        key: "tile",
        label: "แผ่น",
        default: "60",
        options: [
          { value: "60", label: "60×60" },
          { value: "120", label: "60×120" },
        ],
      },
      stockField,
    ],
    calc: calcTbar,
  },
  {
    id: "acoustic",
    name: "RT60 อะคูสติก",
    blurb: "เวลาก้อง + แผ่นซับ",
    fields: [
      ...room,
      { type: "number", key: "h", label: "สูงห้อง", unit: "ม.", default: 2.8, min: 2, max: 15, step: 0.1 },
      { type: "number", key: "alpha", label: "ค่าดูดซับเฉลี่ย", default: 0.15, min: 0.05, max: 0.8, step: 0.05 },
    ],
    calc: calcRt60,
  },
  {
    id: "insulation",
    name: "ฉนวนกันร้อน-เสียง",
    blurb: "ใยแก้ว ร็อกวูล PE",
    fields: [
      ...room,
      { type: "number", key: "thick", label: "หนา", unit: "มม.", default: 50, min: 10, max: 300 },
      {
        type: "select",
        key: "kind",
        label: "ชนิด",
        default: "glass",
        options: [
          { value: "glass", label: "ใยแก้ว" },
          { value: "rock", label: "ร็อกวูล" },
          { value: "pe", label: "PE โฟม" },
        ],
      },
    ],
    calc: calcInsulation,
  },
  { id: "hardware", name: "สกรู + ฉาบรอยต่อ", blurb: "ของเก็บผิวฝ้า", fields: room, calc: calcHardware },
  {
    id: "partition",
    name: "ผนังเบา C-stud / U-track",
    blurb: "โครง แผ่น สกรู เทป ปูนฉาบ",
    keywords: ["ผนังเบา", "c-stud", "u-track", "ผนังยิปซัม", "กั้นห้อง"],
    fields: [
      { type: "number", key: "l", label: "ยาวผนัง", unit: "ม.", default: 4, min: 1, max: 100, step: 0.1 },
      { type: "number", key: "h", label: "สูงผนัง", unit: "ม.", default: 2.6, min: 1, max: 6, step: 0.05 },
      {
        type: "select",
        key: "spacing",
        label: "ระยะ C-stud",
        default: "60",
        options: [
          { value: "60", label: "60 ซม. (ผนังทั่วไป)" },
          { value: "40", label: "40 ซม. (บุกระเบื้อง / แข็งแรงขึ้น)" },
        ],
      },
      {
        type: "select",
        key: "layers",
        label: "แผ่นต่อด้าน",
        default: "1",
        options: [
          { value: "1", label: "ชั้นเดียว" },
          { value: "2", label: "2 ชั้น (กันเสียง/กันไฟ)" },
        ],
      },
      {
        type: "select",
        key: "sides",
        label: "ปิดแผ่น",
        default: "2",
        options: [
          { value: "2", label: "สองด้าน" },
          { value: "1", label: "ด้านเดียว" },
        ],
      },
      { type: "number", key: "doors", label: "ช่องประตู", unit: "ช่อง", default: 1, min: 0, max: 4 },
      { type: "number", key: "stock", label: "โครงยาวเส้นละ", unit: "ม.", default: PARTITION.stock.value, min: 2, max: 6, step: 0.1 },
      { type: "number", key: "waste", label: "เผื่อเสียแผ่น", unit: "%", default: WASTE_DEFAULT.value, min: 0, max: 25 },
    ],
    calc: calcPartition,
  },
];

export const ceilingJob: JobDef = {
  name: "คิดทั้งงานฝ้า",
  blurb: "ห้องครั้งเดียว ได้ใบสั่งของครบ",
  fields: [
    ...room,
    {
      type: "select",
      key: "sys",
      label: "ระบบฝ้า",
      default: "gyp",
      options: [
        { value: "gyp", label: "ยิปซัมฉาบเรียบ" },
        { value: "tbar", label: "ทีบาร์ 60×60" },
        { value: "tbar120", label: "ทีบาร์ 60×120" },
      ],
    },
    stockField,
    { type: "number", key: "thick", label: "ฉนวน (0 ถ้าไม่ใส่)", unit: "มม.", default: 50, min: 0, max: 300 },
  ],
  calc: (input) => {
    const bad = guardInputs(ceilingJob.fields, input);
    if (bad) return bad;
    const v = withDefaults(ceilingJob.fields, input);
    const sys = str(v, "sys");
    const isTbar = sys === "tbar" || sys === "tbar120";
    const main = isTbar ? calcTbar({ ...v, tile: sys === "tbar120" ? "120" : "60" }) : calcGypsum(v);
    // สกรู/เทป/ปูนฉาบรอยต่อเป็นของฝ้าฉาบเรียบเท่านั้น ฝ้าทีบาร์วางแผ่นบนโครง ไม่ยิงสกรู
    const hw = isTbar ? null : calcHardware(v);
    const ins = num(v, "thick", 50) > 0 ? calcInsulation({ ...v, kind: "glass" }) : null;
    return jobFromParts({
      title: "งานฝ้าทั้งห้อง",
      headline: main.headline ?? "งานฝ้า",
      rows: [
        ...main.rows.filter((r) => r.label !== "พื้นที่" && r.label !== "โครงทีบาร์รวมประมาณ"),
        ...(hw ? hw.rows : []),
        ...(ins ? ins.rows.filter((r) => r.label.includes("แพ็ก")).map((r) => ({ ...r, label: "ฉนวนใยแก้ว" })) : []),
      ],
      tip: isTbar
        ? "ฝ้าทีบาร์ ยังไม่รวมไฟและหัวจ่ายแอร์ วัดระยะหิ้วหน้างานเพื่อคิดความยาวลวดแขวน"
        : "งานฝ้าบ้านทั่วไป ยังไม่รวมไฟดาวน์ไลท์และวงกบฝ้า",
      parts: [main, ...(hw ? [hw] : []), ...(ins ? [ins] : [])],
    });
  },
};
