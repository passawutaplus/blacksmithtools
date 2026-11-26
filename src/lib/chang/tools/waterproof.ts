import type { CalcResult, Field, JobDef, ToolDef, Values } from "../types";
import { blockedResult, ceil, fmt, fmtTrim, guardInputs, guardTool, jobFromParts, num, resultX, str, withDefaults } from "../math";
import { DISCLAIMER_AB, MEMBRANE_ROLL, SEALANT, UNIT, WATERPROOF, WATERPROOF_PRODUCTS } from "../constants";

const guard = (id: string, v: Values) => guardTool(waterproofTools, id, v);

const WP_CAVEATS = [
  "อัตราใช้และขนาดบรรจุต่างกันตามยี่ห้อ ให้ยึด TDS/ฉลากของถังที่ซื้อจริง",
  "ทาเที่ยวถัดไปสวนทางกับเที่ยวแรก และรอให้แห้งตามฉลากทุกเที่ยว",
  DISCLAIMER_AB,
];

function product(key: string) {
  return WATERPROOF_PRODUCTS[key] ?? WATERPROOF_PRODUCTS.cement;
}

/**
 * แกนกลางของงานทากันซึม: พื้นที่ → เนื้อกันซึม (กก.) → ชุด/ถัง · ไพรเมอร์ (ลิตร → แกลลอน) · ตาข่าย (ม. → ม้วน)
 * แยกออกมาให้ห้องน้ำ ดาดฟ้า และหน้าห้องน้ำทั้งห้องในสายกระเบื้องใช้สูตรเดียวกัน
 */
export function membraneQty(area: number, productKey: string, coats: number, wastePct: number) {
  const p = product(productKey);
  const kgRaw = area * p.rate.value * coats;
  const kg = kgRaw * (1 + wastePct / 100);
  const packs = ceil(kg / p.pack.value);
  const primerL = p.primer ? area * p.primer.value : 0;
  const primerGal = p.primer ? ceil(primerL / UNIT.gallon.value) : 0;
  return { p, kgRaw, kg, packs, primerL, primerGal, lastUsed: packs > 0 ? (kg - (packs - 1) * p.pack.value) / p.pack.value : 0 };
}

function primerRow(m: ReturnType<typeof membraneQty>) {
  return m.p.primer
    ? { label: `ไพรเมอร์ (แกลลอน ${UNIT.gallon.value} ล.)`, value: `${fmt(m.primerL, 1)} ล. = ${fmt(m.primerGal)} แกลลอน`, emphasize: true }
    : { label: "ไพรเมอร์", value: "ไม่ใช้ — พรมน้ำให้ผิวชื้น (ไม่แฉะ) ก่อนทา" };
}

function primerStep(area: number, m: ReturnType<typeof membraneQty>) {
  return m.p.primer
    ? {
        label: "ไพรเมอร์",
        expr: `ลิตร = พื้นที่ × ${fmtTrim(m.p.primer.value, 2)} ล./ตร.ม. · แกลลอน = ลิตร ÷ ${UNIT.gallon.value} ปัดขึ้น`,
        subst: `${fmt(area, 2)} × ${fmtTrim(m.p.primer.value, 2)} = ${fmt(m.primerL, 1)} ล. → ${fmt(m.primerGal)} แกลลอน`,
      }
    : { label: "ไพรเมอร์", expr: "ซีเมนต์กันซึมไม่ใช้ไพรเมอร์ ใช้น้ำพรมผิวแทน", subst: "0 แกลลอน" };
}

function membraneSteps(area: number, coats: number, wastePct: number, m: ReturnType<typeof membraneQty>) {
  return [
    {
      label: "เนื้อกันซึม",
      expr: "กก. = พื้นที่ × อัตราใช้ต่อเที่ยว × เที่ยว × (1 + เผื่อ)",
      subst: `${fmt(area, 2)} × ${fmtTrim(m.p.rate.value, 2)} × ${fmt(coats)} × ${fmtTrim(1 + wastePct / 100, 2)} = ${fmt(m.kg, 1)} กก.`,
    },
    {
      label: `แปลงเป็น${m.p.packUnit}`,
      expr: `${m.p.packUnit} = กก. ÷ ${fmt(m.p.pack.value)} ปัดขึ้น`,
      subst: `${fmt(m.kg, 1)} ÷ ${fmt(m.p.pack.value)} = ${fmt(m.packs)} ${m.p.packUnit}`,
    },
    primerStep(area, m),
  ];
}

function meshRolls(meters: number) {
  return ceil(meters / WATERPROOF.meshRoll.value);
}

/* ─────────── กันซึมห้องน้ำ ─────────── */

/** ด่านตรวจเพิ่ม: ผนังโซนอาบน้ำต้องไม่ยาวกว่าผนังที่เหลือหลังหักประตู */
function bathGeometry(v: Values) {
  const w = num(v, "w", 2);
  const l = num(v, "l", 2.5);
  const doors = num(v, "doors", 1);
  const up = num(v, "up", WATERPROOF.upturn.value) / 100;
  const showerRun = num(v, "showerRun", WATERPROOF.showerRun.value);
  const showerH = Math.max(num(v, "showerH", WATERPROOF.showerH.value) / 100, up);
  const perimeter = 2 * (w + l);
  const wallRun = perimeter - doors * WATERPROOF.doorW.value;
  return { w, l, doors, up, showerRun, showerH, perimeter, wallRun };
}

export function calcWpBathroom(v: Values): CalcResult {
  const bad = guard("bathroom", v);
  if (bad) return bad;
  const g = bathGeometry(v);
  if (g.wallRun <= 0 || g.showerRun > g.wallRun + 1e-9) {
    return blockedResult({
      headline:
        g.wallRun <= 0
          ? `ประตูกว้างรวม ${fmt(g.doors * WATERPROOF.doorW.value, 1)} ม. เกินรอบห้อง — ตรวจขนาดห้องกับจำนวนประตู`
          : `ผนังโซนอาบน้ำ ${fmtTrim(g.showerRun, 2)} ม. ยาวกว่าผนังที่มี (${fmtTrim(g.wallRun, 2)} ม. หลังหักประตู)`,
      rows: [
        { label: "รอบห้อง", value: `${fmt(g.perimeter, 2)} ม.` },
        { label: "ผนังหลังหักประตู", value: `${fmt(Math.max(0, g.wallRun), 2)} ม.` },
      ],
      tip: "ลดความยาวผนังโซนอาบน้ำ หรือตรวจขนาดห้องอีกครั้ง",
    });
  }
  const floor = g.w * g.l;
  const wallLow = (g.wallRun - g.showerRun) * g.up;
  const wallShower = g.showerRun * g.showerH;
  const area = floor + wallLow + wallShower;
  const coats = num(v, "coats", 2);
  const wastePct = num(v, "waste", WATERPROOF.waste.value);
  const m = membraneQty(area, str(v, "product", "cement"), coats, wastePct);
  const corners = num(v, "corners", 1);
  const pipes = num(v, "pipes", 3);
  // ตาข่าย: แนวพื้นชนผนัง (ไม่รวมช่องประตู) + มุมตั้ง 4 มุมสูงเท่าขอบกันซึม + มุมโซนอาบน้ำส่วนที่สูงขึ้นไป + รอบท่อ
  const meshJoint = g.wallRun;
  const meshCorners = 4 * g.up + corners * Math.max(0, g.showerH - g.up);
  const meshPipes = pipes * WATERPROOF.collarMesh.value;
  const mesh = meshJoint + meshCorners + meshPipes;
  const rolls = meshRolls(mesh);

  return resultX({
    title: "กันซึมห้องน้ำ",
    headline: `${m.p.name} ${fmt(m.packs)} ${m.p.packUnit} (${fmt(m.kg, 1)} กก.)`,
    chart:
      m.packs > 0
        ? {
            kind: "packs",
            unitLabel: `${m.p.packUnit} ${fmt(m.p.pack.value)} กก.`,
            count: m.packs,
            lastUsed: m.lastUsed,
            note: `พื้นที่ทา ${fmt(area, 2)} ตร.ม. × ${fmt(coats)} เที่ยว`,
          }
        : undefined,
    rows: [
      { label: "พื้นห้อง", value: `${fmt(floor, 2)} ตร.ม.` },
      { label: `ขึ้นผนังรอบห้อง ${fmt(g.up * 100)} ซม.`, value: `${fmt(wallLow, 2)} ตร.ม.` },
      { label: `ผนังโซนอาบน้ำ สูง ${fmt(g.showerH * 100)} ซม.`, value: `${fmt(wallShower, 2)} ตร.ม. (ผนังยาว ${fmtTrim(g.showerRun, 2)} ม.)` },
      { label: "พื้นที่ทากันซึมรวม", value: `${fmt(area, 2)} ตร.ม.` },
      { label: `เนื้อกันซึม ${fmt(coats)} เที่ยว`, value: `${fmt(m.kg, 1)} กก. (รวมเผื่อ ${fmt(wastePct)}%)` },
      { label: `${m.p.name} (${m.p.packUnit}ละ ${fmt(m.p.pack.value)} กก.)`, value: `${fmt(m.packs)} ${m.p.packUnit}`, emphasize: true },
      primerRow(m),
      { label: "เทปตาข่ายเสริมมุม", value: `${fmt(mesh, 1)} ม. = ${fmt(rolls)} ม้วน (ม้วนละ ${fmt(WATERPROOF.meshRoll.value)} ม.)`, emphasize: true },
      { label: "ชิ้นเสริมรอบท่อ/รูระบาย", value: `${fmt(pipes)} จุด` },
    ],
    tip: "ทาเสร็จขังน้ำทดสอบ 24–48 ชม. ก่อนปูกระเบื้อง รั่วตอนนี้แก้ง่ายกว่ารื้อกระเบื้อง",
    explain: {
      risk: "B",
      updatedAt: "2026-11-25",
      summary: "พื้นที่ทา = พื้น + ขอบกันซึมรอบห้อง + ผนังโซนอาบน้ำ · เนื้อกันซึม = พื้นที่ × อัตราใช้ × เที่ยว แล้วปัดขึ้นเป็นชุด/ถัง · ตาข่ายเสริมตามแนวมุมและรอบท่อ",
      steps: [
        { label: "พื้นห้อง", expr: "กว้าง × ยาว", subst: `${fmtTrim(g.w, 2)} × ${fmtTrim(g.l, 2)} = ${fmt(floor, 2)} ตร.ม.` },
        {
          label: "ผนังที่ทาขึ้น",
          expr: `(รอบห้อง − ประตู × ${WATERPROOF.doorW.value} − ผนังโซนอาบน้ำ) × ขอบกันซึม + ผนังโซนอาบน้ำ × สูงโซนอาบน้ำ`,
          subst: `(${fmt(g.perimeter, 2)} − ${fmt(g.doors)} × ${WATERPROOF.doorW.value} − ${fmtTrim(g.showerRun, 2)}) × ${fmtTrim(g.up, 2)} + ${fmtTrim(g.showerRun, 2)} × ${fmtTrim(g.showerH, 2)} = ${fmt(wallLow + wallShower, 2)} ตร.ม.`,
        },
        ...membraneSteps(area, coats, wastePct, m),
        {
          label: "เทปตาข่ายเสริมมุม",
          expr: `แนวพื้นชนผนัง + 4 มุม × ขอบกันซึม + มุมโซนอาบน้ำ × (สูงโซน − ขอบ) + ท่อ × ${WATERPROOF.collarMesh.value} ม.`,
          subst: `${fmt(meshJoint, 2)} + ${fmt(4 * g.up, 2)} + ${fmt(corners * Math.max(0, g.showerH - g.up), 2)} + ${fmt(meshPipes, 2)} = ${fmt(mesh, 1)} ม. → ${fmt(rolls)} ม้วน`,
        },
      ],
      constants: [m.p.rate, m.p.pack, ...(m.p.primer ? [m.p.primer] : []), WATERPROOF.upturn, WATERPROOF.showerH, WATERPROOF.doorW, WATERPROOF.collarMesh, WATERPROOF.meshRoll, WATERPROOF.waste],
      assumptions: [
        "ทาเต็มพื้นห้อง ขึ้นผนังรอบห้องเท่าขอบกันซึม และขึ้นสูงเฉพาะผนังโซนอาบน้ำ",
        "ช่องประตูไม่ทาขึ้นผนัง แต่พื้นใต้ธรณีประตูทาต่อเนื่อง",
        "เทพื้นปรับระดับให้ลาดเข้าหาท่อระบายเสร็จแล้วก่อนทากันซึม",
      ],
      caveats: [
        ...(str(v, "product", "cement") === "pu" ? ["PU ใต้กระเบื้อง: เที่ยวสุดท้ายโรยทรายขณะยังเปียก ไม่งั้นปูนกาวไม่เกาะ"] : []),
        ...WP_CAVEATS,
      ],
      refs: [{ label: "TDS ผู้ผลิตวัสดุกันซึม (อัตราใช้ต่อเที่ยว ระยะขึ้นผนัง)" }, { label: "แนวปฏิบัติงานกันซึมห้องน้ำก่อนปูกระเบื้อง" }],
    },
  });
}

/* ─────────── กันซึมดาดฟ้า ─────────── */

export function calcWpRoof(v: Values): CalcResult {
  const bad = guard("roof", v);
  if (bad) return bad;
  const w = num(v, "w", 6);
  const l = num(v, "l", 8);
  const up = num(v, "up", WATERPROOF.parapetUp.value) / 100;
  const drains = num(v, "drains", 2);
  const coats = num(v, "coats", 2);
  const wastePct = num(v, "waste", WATERPROOF.waste.value);
  const productKey = str(v, "product", "pu");
  const meshMode = str(v, "mesh", "corner");
  const floor = w * l;
  const perimeter = 2 * (w + l);
  const upArea = up > 0 ? perimeter * up : 0;
  const area = floor + upArea;
  const m = membraneQty(area, productKey, coats, wastePct);
  const meshM = (up > 0 ? perimeter + 4 * up : 0) + drains * WATERPROOF.collarMesh.value;
  const rolls = meshRolls(meshM);
  const fabricM2 = meshMode === "full" ? area * (1 + WATERPROOF.fabricLap.value / 100) : 0;
  const fabricRolls = meshMode === "full" ? ceil(fabricM2 / WATERPROOF.fabricRoll.value) : 0;

  return resultX({
    title: "กันซึมดาดฟ้า",
    headline: `${m.p.name} ${fmt(m.packs)} ${m.p.packUnit} (${fmt(m.kg, 1)} กก.)`,
    chart:
      m.packs > 0
        ? {
            kind: "packs",
            unitLabel: `${m.p.packUnit} ${fmt(m.p.pack.value)} กก.`,
            count: m.packs,
            lastUsed: m.lastUsed,
            note: `พื้นที่ทา ${fmt(area, 2)} ตร.ม. × ${fmt(coats)} เที่ยว`,
          }
        : undefined,
    rows: [
      { label: "พื้นดาดฟ้า", value: `${fmt(floor, 2)} ตร.ม.` },
      { label: up > 0 ? `ขึ้นขอบผนัง ${fmt(up * 100)} ซม.` : "ขึ้นขอบผนัง", value: up > 0 ? `${fmt(upArea, 2)} ตร.ม.` : "ไม่มีขอบผนัง" },
      { label: "พื้นที่ทารวม", value: `${fmt(area, 2)} ตร.ม.` },
      { label: `เนื้อกันซึม ${fmt(coats)} เที่ยว`, value: `${fmt(m.kg, 1)} กก. (รวมเผื่อ ${fmt(wastePct)}%)` },
      { label: `${m.p.name} (${m.p.packUnit}ละ ${fmt(m.p.pack.value)} กก.)`, value: `${fmt(m.packs)} ${m.p.packUnit}`, emphasize: true },
      primerRow(m),
      ...(meshM > 0
        ? [{ label: "เทปตาข่ายเสริมมุม", value: `${fmt(meshM, 1)} ม. = ${fmt(rolls)} ม้วน (ม้วนละ ${fmt(WATERPROOF.meshRoll.value)} ม.)`, emphasize: true }]
        : []),
      ...(meshMode === "full"
        ? [{ label: "ผ้าใยเสริมแรงปูเต็ม", value: `${fmt(fabricM2, 1)} ตร.ม. = ${fmt(fabricRolls)} ม้วน (ม้วนละ ${fmt(WATERPROOF.fabricRoll.value)} ตร.ม.)`, emphasize: true }]
        : []),
      { label: "ชิ้นเสริมรอบท่อระบาย", value: `${fmt(drains)} จุด` },
    ],
    tip:
      productKey === "cement"
        ? "ซีเมนต์กันซึมบนดาดฟ้าที่โดนแดดตรง ดูฉลากว่าทนแดดได้ไหม ถ้าไม่ได้ต้องปูกระเบื้องหรือเททับ"
        : "ล้างพื้นให้สะอาด อุดรอยร้าวก่อนทา และดูพยากรณ์ฝน ต้องแห้งตามฉลากก่อนโดนน้ำ",
    explain: {
      risk: "B",
      updatedAt: "2026-11-25",
      summary: "พื้นที่ทา = พื้นดาดฟ้า + ขอบผนังที่ทาขึ้น · เนื้อกันซึม = พื้นที่ × อัตราใช้ × เที่ยว แล้วปัดขึ้นเป็นถัง · ตาข่ายเสริมแนวมุมและรอบท่อระบาย",
      steps: [
        { label: "พื้นดาดฟ้า", expr: "กว้าง × ยาว", subst: `${fmtTrim(w, 2)} × ${fmtTrim(l, 2)} = ${fmt(floor, 2)} ตร.ม.` },
        { label: "ขอบผนัง", expr: "รอบดาดฟ้า × ความสูงที่ทาขึ้น", subst: `${fmt(perimeter, 2)} × ${fmtTrim(up, 2)} = ${fmt(upArea, 2)} ตร.ม.` },
        ...membraneSteps(area, coats, wastePct, m),
        {
          label: "เทปตาข่ายเสริมมุม",
          expr: `แนวพื้นชนขอบผนัง + 4 มุม × ความสูงขอบ + ท่อระบาย × ${WATERPROOF.collarMesh.value} ม.`,
          subst: `${fmt(meshM, 1)} ม. → ${fmt(rolls)} ม้วน`,
        },
        ...(meshMode === "full"
          ? [{ label: "ผ้าใยเสริมแรง", expr: `พื้นที่ × (1 + ทับซ้อน ${WATERPROOF.fabricLap.value}%) ÷ ${WATERPROOF.fabricRoll.value} ตร.ม./ม้วน`, subst: `${fmt(area, 2)} × ${fmtTrim(1 + WATERPROOF.fabricLap.value / 100, 2)} = ${fmt(fabricM2, 1)} ตร.ม. → ${fmt(fabricRolls)} ม้วน` }]
          : []),
      ],
      constants: [
        m.p.rate,
        m.p.pack,
        ...(m.p.primer ? [m.p.primer] : []),
        WATERPROOF.parapetUp,
        WATERPROOF.collarMesh,
        WATERPROOF.meshRoll,
        ...(meshMode === "full" ? [WATERPROOF.fabricRoll, WATERPROOF.fabricLap] : []),
        WATERPROOF.waste,
      ],
      assumptions: ["ดาดฟ้าสี่เหลี่ยม มีขอบผนังรอบทุกด้านเท่ากัน (ถ้าใส่ขอบผนัง 0 = ไม่มีขอบ)", "พื้นลาดเข้าท่อระบายแล้ว ไม่มีจุดน้ำขัง"],
      caveats: ["จุดที่น้ำขังนานกันซึมเสื่อมเร็ว ต้องแก้ความลาดก่อนทา", ...WP_CAVEATS],
      refs: [{ label: "TDS ผู้ผลิตวัสดุกันซึม (อัตราใช้ต่อเที่ยว จำนวนเที่ยว)" }, { label: "แนวปฏิบัติงานกันซึมดาดฟ้าคอนกรีต" }],
    },
  });
}

/* ─────────── ซ่อมรอยร้าว ─────────── */

export function calcWpCrack(v: Values): CalcResult {
  const bad = guard("crack", v);
  if (bad) return bad;
  const len = num(v, "len", 5);
  const type = str(v, "type", "groove");
  const productKey = str(v, "product", "pu");
  const grooved = type !== "hair";
  const gw = grooved ? num(v, "gw", 6) : 0;
  const gd = grooved ? num(v, "gd", 6) : 0;
  const tubeMl = num(v, "tube", SEALANT.tube.value);
  // ยาว 1 ม. × ร่อง 1 มม. × ลึก 1 มม. = 1 มล. เหมือนตัวคิดซิลิโคน
  const mlRaw = len * gw * gd;
  const ml = mlRaw * (1 + SEALANT.waste.value / 100);
  const tubes = grooved ? ceil(ml / tubeMl) : 0;
  const backer = grooved && gw > WATERPROOF.backerRodOver.value;
  const rolls = meshRolls(len);
  const band = len * WATERPROOF.crackBand.value;
  const coat = membraneQty(band, productKey, 2, WATERPROOF.waste.value);
  const big = type === "wide";

  return resultX({
    title: "ซ่อมรอยร้าว",
    headline: (big ? "ให้วิศวกรดูก่อน · " : "") + (grooved ? `ยาอุดรอยร้าว ${fmt(tubes)} หลอด · ตาข่าย ${fmt(rolls)} ม้วน` : `ร้าวลายงา: ทากันซึมทับ ${fmt(coat.kg, 1)} กก. · ตาข่าย ${fmt(rolls)} ม้วน`),
    chart:
      tubes > 0
        ? { kind: "packs", unitLabel: `หลอด ${fmt(tubeMl)} มล.`, count: tubes, lastUsed: (ml - (tubes - 1) * tubeMl) / tubeMl, note: `ร่อง ${fmt(gw)} × ${fmt(gd)} มม. ยาว ${fmtTrim(len, 1)} ม.` }
        : undefined,
    rows: [
      { label: "ความยาวรอยร้าว", value: `${fmtTrim(len, 1)} ม.` },
      ...(grooved
        ? [
            { label: "ร่องที่เซาะ", value: `กว้าง ${fmt(gw)} × ลึก ${fmt(gd)} มม.` },
            { label: "ยาอุด (PU/อะคริลิกซีลแลนท์)", value: `${fmt(ml, 0)} มล. รวมเผื่อ ${SEALANT.waste.value}%` },
            { label: `หลอด ${fmt(tubeMl)} มล.`, value: `${fmt(tubes)} หลอด`, emphasize: true },
            ...(backer ? [{ label: "โฟมเส้นรองร่อง (backer rod)", value: `${fmtTrim(len, 1)} ม. — ร่องกว้างเกิน ${WATERPROOF.backerRodOver.value} มม.`, emphasize: true }] : []),
          ]
        : [{ label: "ยาอุด", value: "ไม่ต้องเซาะร่อง ทากันซึมทับพร้อมตาข่าย" }]),
      { label: "เทปตาข่ายทับแนวร้าว", value: `${fmtTrim(len, 1)} ม. = ${fmt(rolls)} ม้วน`, emphasize: true },
      { label: `กันซึมทาทับแนว กว้าง ${fmt(WATERPROOF.crackBand.value * 100)} ซม. 2 เที่ยว (${coat.p.name})`, value: `${fmt(band, 2)} ตร.ม. ≈ ${fmt(coat.kg, 1)} กก.` },
    ],
    tip: big
      ? `ร้าวกว้างเกิน ${WATERPROOF.structuralCrack.value} มม. ร้าวเฉียงตามมุมประตู-หน้าต่าง หรือร้าวทะลุ ให้วิศวกรดูก่อน อุดอย่างเดียวเดี๋ยวร้าวซ้ำ`
      : "เซาะร่องเป็นตัว V ปัดฝุ่นออกให้หมดก่อนยิงยา ไม่งั้นยาไม่เกาะขอบ",
    explain: {
      risk: "B",
      updatedAt: "2026-11-25",
      summary: "ยาอุด (มล.) = ยาวรอยร้าว (ม.) × กว้างร่อง (มม.) × ลึกร่อง (มม.) + เผื่อ แล้วปัดขึ้นเป็นหลอด · ตาข่ายและกันซึมทาทับตามแนวรอยร้าว",
      steps: [
        ...(grooved
          ? [
              {
                label: "เนื้อยาอุดในร่อง",
                expr: `มล. = ยาว × กว้าง × ลึก × (1 + ${SEALANT.waste.value}%)`,
                subst: `${fmtTrim(len, 1)} × ${fmt(gw)} × ${fmt(gd)} × ${fmtTrim(1 + SEALANT.waste.value / 100, 2)} = ${fmt(ml, 0)} มล. → ${fmt(tubes)} หลอด`,
                note: "ยาว 1 ม. ร่อง 1×1 มม. = 1 มล. พอดี",
              },
            ]
          : []),
        { label: "เทปตาข่าย", expr: `ม้วน = ยาว ÷ ${WATERPROOF.meshRoll.value} ปัดขึ้น`, subst: `${fmtTrim(len, 1)} ÷ ${WATERPROOF.meshRoll.value} = ${fmt(rolls)} ม้วน` },
        {
          label: "กันซึมทาทับแนว",
          expr: `ยาว × ${WATERPROOF.crackBand.value} ม. × อัตราใช้ × 2 เที่ยว × (1 + เผื่อ)`,
          subst: `${fmt(band, 2)} × ${fmtTrim(coat.p.rate.value, 2)} × 2 × ${fmtTrim(1 + WATERPROOF.waste.value / 100, 2)} = ${fmt(coat.kg, 1)} กก.`,
        },
      ],
      constants: [SEALANT.waste, SEALANT.tube, WATERPROOF.backerRodOver, WATERPROOF.meshRoll, WATERPROOF.crackBand, coat.p.rate, WATERPROOF.structuralCrack],
      assumptions: ["ร่องเซาะเป็นหน้าตัดสี่เหลี่ยมเต็มความลึกที่กรอก", "ใช้หลอดขนาดที่กรอก (หลอดทั่วไป 280–300 มล. ไส้กรอก 600 มล.)"],
      caveats: [
        `รอยร้าวกว้างเกิน ${WATERPROOF.structuralCrack.value} มม. ร้าวเฉียง หรือร้าวที่ยังขยาย อาจเป็นปัญหาโครงสร้าง ต้องให้วิศวกรตรวจก่อนซ่อมผิว`,
        "กันซึมที่ทาทับเป็นปริมาณน้อย ซื้อขนาดบรรจุเล็กสุดที่ร้านมี",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "ASTM C1193 แนวทางการใช้วัสดุยาแนวรอยต่อ" }, { label: "แนวปฏิบัติซ่อมรอยร้าวผนัง/ดาดฟ้าก่อนทากันซึม" }],
    },
  });
}

/* ─────────── แผ่นกันซึมชนิดม้วน (รอบ 4) ─────────── */

/** พื้นที่ที่ม้วนหนึ่งปูได้จริงหลังหักทับข้างและทับหัวท้าย (ตร.ม.) */
export function rollCoverage(rollW: number, rollL: number, sideLapM: number, endLapM: number): number {
  return (rollW - sideLapM) * (rollL - endLapM);
}

export function calcWpSheet(v: Values): CalcResult {
  const bad = guard("sheet", v);
  if (bad) return bad;
  const w = num(v, "w", 6);
  const l = num(v, "l", 8);
  const up = num(v, "up", WATERPROOF.parapetUp.value) / 100;
  const layers = num(v, "layers", 1);
  const rw = num(v, "rw", MEMBRANE_ROLL.width.value);
  const rl = num(v, "rl", MEMBRANE_ROLL.length.value);
  const side = num(v, "side", MEMBRANE_ROLL.sideLap.value) / 100;
  const end = num(v, "end", MEMBRANE_ROLL.endLap.value) / 100;
  const wastePct = num(v, "waste", MEMBRANE_ROLL.wastePct.value);
  const primerRate = num(v, "primer", MEMBRANE_ROLL.primerLPerM2.value);
  const cov = rollCoverage(rw, rl, side, end);
  if (cov <= 0) {
    return blockedResult({ headline: "ระยะทับกว้างกว่าม้วน — ตรวจขนาดม้วนกับระยะทับ", tip: "ระยะทับใส่เป็น ซม. ขนาดม้วนใส่เป็น ม." });
  }
  const floor = w * l;
  const perimeter = 2 * (w + l);
  const upArea = perimeter * up;
  const area = floor + upArea;
  const need = area * layers * (1 + wastePct / 100);
  const rolls = ceil(need / cov);
  const primerL = area * primerRate;
  const primerGal = primerL > 0 ? ceil(primerL / UNIT.gallon.value) : 0;
  return resultX({
    title: "แผ่นกันซึมชนิดม้วน",
    headline: `แผ่นกันซึม ${fmt(rolls)} ม้วน (${fmtTrim(rw, 2)}×${fmtTrim(rl, 2)} ม.)${primerL > 0 ? ` · ไพรเมอร์ ${fmt(primerL, 1)} ลิตร` : ""}`,
    chart: {
      kind: "packs",
      unitLabel: `ม้วน ${fmtTrim(rw, 2)}×${fmtTrim(rl, 2)} ม.`,
      count: rolls,
      lastUsed: (need - (rolls - 1) * cov) / cov,
      note: `ม้วนละปูได้จริง ${fmt(cov, 2)} ตร.ม.`,
    },
    rows: [
      { label: "พื้น", value: `${fmt(floor, 2)} ตร.ม.` },
      { label: up > 0 ? `ขึ้นขอบผนัง ${fmt(up * 100)} ซม.` : "ขึ้นขอบผนัง", value: up > 0 ? `${fmt(upArea, 2)} ตร.ม. (รอบ ${fmt(perimeter, 1)} ม.)` : "ไม่มี" },
      { label: "พื้นที่ปูรวม", value: `${fmt(area, 2)} ตร.ม.${layers > 1 ? ` × ${fmt(layers)} ชั้น` : ""}` },
      { label: "ม้วนละปูได้จริง", value: `${fmt(cov, 3)} ตร.ม. (หน้าม้วน ${fmt(rw * rl, 2)} ตร.ม. หักทับข้าง ${fmt(side * 100)} ซม. ทับหัวท้าย ${fmt(end * 100)} ซม.)` },
      { label: `แผ่นกันซึม (รวมเผื่อ ${fmtTrim(wastePct, 1)}%)`, value: `${fmt(rolls)} ม้วน`, emphasize: true },
      primerL > 0
        ? { label: `ไพรเมอร์ (${fmtTrim(primerRate, 2)} ล./ตร.ม.)`, value: `${fmt(primerL, 1)} ลิตร ≈ ${fmt(primerGal)} แกลลอน (${UNIT.gallon.value} ล.)`, emphasize: true }
        : { label: "ไพรเมอร์", value: "ไม่คิด" },
    ],
    tip: "ปูจากจุดต่ำ (ท่อระบาย) ขึ้นหาจุดสูง ให้แผ่นบนทับแผ่นล่างตามทางน้ำไหล รอยทับหัวท้ายแถวติดกันอย่าให้ตรงกัน",
    explain: {
      risk: "B",
      updatedAt: "2026-11-26",
      summary: "พื้นที่ปู = พื้น + ขอบผนังที่ปูขึ้น · ม้วนละปูได้ = (กว้างม้วน − ทับข้าง) × (ยาวม้วน − ทับหัวท้าย) · ม้วน = พื้นที่ × ชั้น × (1 + เผื่อ) ÷ ที่ม้วนละปูได้ ปัดขึ้น",
      steps: [
        { label: "พื้น", expr: "กว้าง × ยาว", subst: `${fmtTrim(w, 2)} × ${fmtTrim(l, 2)} = ${fmt(floor, 2)} ตร.ม.` },
        { label: "ขอบผนัง", expr: "2 × (กว้าง + ยาว) × สูงที่ปูขึ้น", subst: `${fmt(perimeter, 2)} × ${fmtTrim(up, 2)} = ${fmt(upArea, 2)} ตร.ม.` },
        {
          label: "ม้วนละปูได้จริง",
          expr: "(กว้างม้วน − ทับข้าง) × (ยาวม้วน − ทับหัวท้าย)",
          subst: `(${fmtTrim(rw, 2)} − ${fmtTrim(side, 2)}) × (${fmtTrim(rl, 2)} − ${fmtTrim(end, 2)}) = ${fmt(cov, 3)} ตร.ม.`,
        },
        {
          label: "จำนวนม้วน",
          expr: "ปัดขึ้น(พื้นที่ × ชั้น × (1 + เผื่อ) ÷ ม้วนละปูได้)",
          subst: `${fmt(area, 2)} × ${fmt(layers)} × ${fmtTrim(1 + wastePct / 100, 3)} ÷ ${fmt(cov, 3)} = ${fmt(need / cov, 2)} → ${fmt(rolls)} ม้วน`,
        },
        { label: "ไพรเมอร์", expr: "ลิตร = พื้นที่ × อัตราใช้ · แกลลอน = ลิตร ÷ 3.785 ปัดขึ้น", subst: `${fmt(area, 2)} × ${fmtTrim(primerRate, 2)} = ${fmt(primerL, 2)} ล. → ${fmt(primerGal)} แกลลอน` },
      ],
      constants: [MEMBRANE_ROLL.width, MEMBRANE_ROLL.length, MEMBRANE_ROLL.sideLap, MEMBRANE_ROLL.endLap, MEMBRANE_ROLL.wastePct, MEMBRANE_ROLL.primerLPerM2, WATERPROOF.parapetUp, UNIT.gallon],
      assumptions: [
        "พื้นสี่เหลี่ยม มีขอบผนังรอบทุกด้านสูงเท่ากัน (ขอบ 0 = ไม่มีขอบ)",
        "คิดระยะทับจากพื้นที่ต่อม้วน ไม่ได้วางผังแผ่นจริง พื้นแคบกว่าหน้าม้วนหรือมีมุมเยอะใช้เศษมากกว่านี้",
        "ไพรเมอร์ทา 1 รอบบนผิวเดิมก่อนปูแผ่นแรก",
      ],
      caveats: ["รอบท่อระบาย มุมผนัง และขอบบนของแผ่นที่ขึ้นผนัง ต้องปิดทับหรือเก็บขอบตามคู่มือผู้ผลิต", ...WP_CAVEATS],
      refs: [{ label: "คู่มือติดตั้งแผ่นกันซึมบิทูเมนชนิดม้วนของผู้ผลิต (ระยะทับข้าง/หัวท้าย)" }],
    },
  });
}

const sheetFields: Field[] = [
  { type: "number", key: "w", label: "กว้างพื้นที่", unit: "ม.", default: 6, min: 0.5, max: 200, step: 0.05 },
  { type: "number", key: "l", label: "ยาวพื้นที่", unit: "ม.", default: 8, min: 0.5, max: 200, step: 0.05 },
  { type: "number", key: "up", label: "ปูขึ้นขอบผนัง (0 = ไม่มีขอบ)", unit: "ซม.", default: WATERPROOF.parapetUp.value, min: 0, max: 100 },
  { type: "number", key: "layers", label: "จำนวนชั้น", unit: "ชั้น", default: 1, min: 1, max: 2 },
  { type: "number", key: "rw", label: "กว้างม้วน", unit: "ม.", default: MEMBRANE_ROLL.width.value, min: 0.5, max: 2, step: 0.01 },
  { type: "number", key: "rl", label: "ยาวม้วน", unit: "ม.", default: MEMBRANE_ROLL.length.value, min: 5, max: 50, step: 0.5 },
  { type: "number", key: "side", label: "ทับด้านข้าง", unit: "ซม.", default: MEMBRANE_ROLL.sideLap.value, min: 5, max: 20 },
  { type: "number", key: "end", label: "ทับหัว-ท้าย", unit: "ซม.", default: MEMBRANE_ROLL.endLap.value, min: 5, max: 30 },
  { type: "number", key: "waste", label: "เผื่อตัดรอบท่อ/มุม", unit: "%", default: MEMBRANE_ROLL.wastePct.value, min: 0, max: 30 },
  { type: "number", key: "primer", label: "ไพรเมอร์ (0 = ไม่คิด)", unit: "ล./ตร.ม.", default: MEMBRANE_ROLL.primerLPerM2.value, min: 0, max: 1, step: 0.01 },
];

/* ─────────── ฟอร์ม ─────────── */

const coatsField: Field = { type: "number", key: "coats", label: "จำนวนเที่ยว", unit: "เที่ยว", default: 2, min: 1, max: 4 };
const wasteField: Field = { type: "number", key: "waste", label: "เผื่อเสีย", unit: "%", default: WATERPROOF.waste.value, min: 0, max: 30 };

function productField(keys: string[], def: string): Field {
  return {
    type: "select",
    key: "product",
    label: "วัสดุกันซึม",
    default: def,
    options: keys.map((k) => ({ value: k, label: WATERPROOF_PRODUCTS[k].name })),
  };
}

export const wpBathroomFields: Field[] = [
  { type: "number", key: "w", label: "กว้างห้อง", unit: "ม.", default: 2, min: 0.8, max: 10, step: 0.05 },
  { type: "number", key: "l", label: "ยาวห้อง", unit: "ม.", default: 2.5, min: 0.8, max: 10, step: 0.05 },
  { type: "number", key: "doors", label: "ประตู", unit: "บาน", default: 1, min: 0, max: 2 },
  { type: "number", key: "up", label: "ขึ้นผนังรอบห้อง", unit: "ซม.", default: WATERPROOF.upturn.value, min: 10, max: 60 },
  { type: "number", key: "showerRun", label: "ผนังโซนอาบน้ำยาวรวม (0 = ไม่มี)", unit: "ม.", default: WATERPROOF.showerRun.value, min: 0, max: 20, step: 0.1 },
  { type: "number", key: "showerH", label: "สูงกันซึมโซนอาบน้ำ", unit: "ซม.", default: WATERPROOF.showerH.value, min: 100, max: 250 },
  { type: "number", key: "corners", label: "มุมผนังในโซนอาบน้ำ", unit: "มุม", default: 1, min: 0, max: 4 },
  { type: "number", key: "pipes", label: "ท่อ/รูระบายที่ทะลุพื้น", unit: "จุด", default: 3, min: 0, max: 20 },
];

const roofFields: Field[] = [
  { type: "number", key: "w", label: "กว้างดาดฟ้า", unit: "ม.", default: 6, min: 1, max: 100, step: 0.1 },
  { type: "number", key: "l", label: "ยาวดาดฟ้า", unit: "ม.", default: 8, min: 1, max: 100, step: 0.1 },
  { type: "number", key: "up", label: "ทาขึ้นขอบผนัง (0 = ไม่มีขอบ)", unit: "ซม.", default: WATERPROOF.parapetUp.value, min: 0, max: 100 },
  productField(["pu", "acrylic", "cement"], "pu"),
  coatsField,
  {
    type: "select",
    key: "mesh",
    label: "ตาข่ายเสริมแรง",
    default: "corner",
    options: [
      { value: "corner", label: "เฉพาะมุมและรอบท่อ" },
      { value: "full", label: "ปูผ้าใยเต็มพื้นที่" },
    ],
  },
  { type: "number", key: "drains", label: "ท่อระบายน้ำ", unit: "จุด", default: 2, min: 0, max: 30 },
  wasteField,
];

const crackFields: Field[] = [
  { type: "number", key: "len", label: "ความยาวรอยร้าวรวม", unit: "ม.", default: 5, min: 0.1, max: 500, step: 0.1 },
  {
    type: "select",
    key: "type",
    label: "ลักษณะรอยร้าว",
    default: "groove",
    options: [
      { value: "hair", label: "ร้าวลายงา เส้นผม" },
      { value: "groove", label: "ร้าวเป็นแนวชัด (เซาะร่องอุด)" },
      { value: "wide", label: `ร้าวกว้างเกิน ${WATERPROOF.structuralCrack.value} มม. / ร้าวเฉียง` },
    ],
  },
  { type: "number", key: "gw", label: "กว้างร่องที่เซาะ", unit: "มม.", default: 6, min: 3, max: 25, when: { key: "type", is: ["groove", "wide"] } },
  { type: "number", key: "gd", label: "ลึกร่อง", unit: "มม.", default: 6, min: 3, max: 25, when: { key: "type", is: ["groove", "wide"] } },
  { type: "number", key: "tube", label: "ขนาดหลอด", unit: "มล.", default: SEALANT.tube.value, min: 100, max: 1000, step: 10, when: { key: "type", is: ["groove", "wide"] } },
  productField(["pu", "acrylic", "cement"], "pu"),
];

export const waterproofTools: ToolDef[] = [
  {
    id: "bathroom",
    name: "กันซึมห้องน้ำ",
    blurb: "พื้น ขอบผนัง โซนอาบน้ำ ตาข่ายมุม",
    keywords: ["ห้องน้ำ", "กันซึมห้องน้ำ", "ห้องน้ำรั่ว", "ซีเมนต์กันซึม"],
    fields: [...wpBathroomFields, productField(["cement", "pu"], "cement"), coatsField, wasteField],
    calc: calcWpBathroom,
  },
  {
    id: "roof",
    name: "กันซึมดาดฟ้า",
    blurb: "พื้น ขอบผนัง ถัง ตาข่าย",
    keywords: ["ดาดฟ้า", "ดาดฟ้ารั่ว", "หลังคาคอนกรีต", "pu", "อะคริลิก"],
    fields: roofFields,
    calc: calcWpRoof,
  },
  {
    id: "crack",
    name: "ซ่อมรอยร้าว",
    blurb: "ยาอุดกี่หลอด ตาข่ายทับแนว",
    keywords: ["รอยร้าว", "ร้าว", "ผนังร้าว", "ซีลแลนท์"],
    fields: crackFields,
    calc: calcWpCrack,
  },
  {
    id: "sheet",
    name: "แผ่นกันซึมชนิดม้วน",
    blurb: "พื้นที่ + ขนาดม้วน + ระยะทับ → กี่ม้วน ไพรเมอร์กี่ลิตร",
    keywords: ["แผ่นกันซึม", "เมมเบรน", "membrane", "บิทูเมน", "ลนไฟ", "torch on", "ม้วนกันซึม"],
    fields: sheetFields,
    calc: calcWpSheet,
  },
];

export const waterproofJob: JobDef = {
  name: "คิดทั้งงานกันซึมดาดฟ้า",
  blurb: "อุดรอยร้าว แล้วทากันซึมทั้งดาดฟ้า",
  fields: [...roofFields, { type: "number", key: "crackLen", label: "รอยร้าวที่ต้องอุด (0 = ไม่มี)", unit: "ม.", default: 0, min: 0, max: 500, step: 0.1 }],
  calc: (input) => {
    const bad = guardInputs(waterproofJob.fields, input);
    if (bad) return bad;
    const v = withDefaults(waterproofJob.fields, input);
    const roof = calcWpRoof(v);
    const crackLen = num(v, "crackLen", 0);
    const crack = crackLen > 0 ? calcWpCrack({ len: crackLen, type: "groove", product: str(v, "product", "pu") }) : null;
    return jobFromParts({
      title: "งานกันซึมดาดฟ้า",
      headline: roof.headline ?? "งานกันซึมดาดฟ้า",
      rows: [
        ...(crack ? crack.rows.filter((r) => r.emphasize).map((r) => ({ ...r, label: `อุดร้าว: ${r.label}` })) : []),
        ...roof.rows.filter((r) => r.emphasize || r.label === "พื้นที่ทารวม"),
      ],
      tip: "ลำดับงาน: ล้างพื้น → เซาะอุดรอยร้าว → ไพรเมอร์ → ตาข่ายมุม → ทากันซึมตามเที่ยว ยังไม่รวมค่าแรง",
      parts: [...(crack ? [crack] : []), roof],
      chart: roof.chart,
    });
  },
};

/** ใช้ในตัวคิดห้องน้ำทั้งห้องของสายกระเบื้อง */
export const WP_BATH_DEFAULTS: Values = Object.fromEntries(
  waterproofTools[0].fields.map((f) => [f.key, f.default]),
);

