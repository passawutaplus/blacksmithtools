import type { CalcResult, ChartSpec, ConstRef, Field, ToolDef, Values } from "../types";
import { blockedResult, ceil, fmt, fmtTrim, guardTool, num, resultX, round, str } from "../math";
import {
  CCTV_BITRATES,
  CCTV_HDD_TB,
  CCTV_PPM,
  CCTV_SENSORS,
  CCTV_STORAGE,
  DATA_UNIT,
  DISCLAIMER_AB,
  LAN,
  POE,
  POE_CLASS0,
  POE_CLASS_SOURCE,
  POE_CLASSES,
  POE_TYPES,
} from "../constants";

const guard = (id: string, v: Values) => guardTool(lowvoltTools, id, v);
const UPDATED = "2026-11-26";

/* ─────────── ฮาร์ดดิสก์กล้องวงจรปิด ─────────── */

/** GB ต่อวันของกล้อง 1 ตัว: Mbps × 10^6 ÷ 8 บิต × 3,600 วินาที × ชั่วโมง × สัดส่วนเวลาที่อัด ÷ 10^9 */
export function gbPerCamDay(mbps: number, hours: number, recordPct: number): number {
  const bytesPerSec = (mbps * DATA_UNIT.bitsPerMbit.value) / DATA_UNIT.bitsPerByte.value;
  return (bytesPerSec * DATA_UNIT.secPerHour.value * hours * (recordPct / 100)) / DATA_UNIT.bytesPerGB.value;
}

/** ดิสก์ใบเล็กสุดที่ขายซึ่งจุได้ไม่น้อยกว่า need (TB) — เกินใบใหญ่สุดคืน undefined */
export function pickHdd(needTb: number): number | undefined {
  return CCTV_HDD_TB.find((s) => s >= needTb - 1e-9);
}

function hddChart(needPerDrive: number, chosen: number): ChartSpec {
  const i = CCTV_HDD_TB.indexOf(chosen as (typeof CCTV_HDD_TB)[number]);
  const from = Math.max(0, i - 2);
  const sizes = CCTV_HDD_TB.slice(from, Math.min(CCTV_HDD_TB.length, i + 3));
  return {
    kind: "steps",
    unit: "TB",
    need: needPerDrive,
    needLabel: `ต้องการต่อลูก ${fmt(needPerDrive, 2)} TB`,
    items: sizes.map((s) => ({ label: `${s} TB`, value: s, state: s === chosen ? "chosen" : s < chosen ? "under" : "over" })),
  };
}

export function calcHdd(v: Values): CalcResult {
  const bad = guard("hdd", v);
  if (bad) return bad;
  const cams = num(v, "cams", 8);
  const preset = str(v, "preset", "4mp-h265");
  const custom = preset === "custom";
  const mbps = custom ? num(v, "mbps", 4) : CCTV_BITRATES[preset].mbps.value;
  const hours = num(v, "hours", 24);
  const recordPct = num(v, "record", 100);
  const days = num(v, "days", 30);
  const headroom = num(v, "headroom", CCTV_STORAGE.headroomPct.value);
  const bays = num(v, "bays", 1);

  const perCam = gbPerCamDay(mbps, hours, recordPct);
  const gbDay = perCam * cams;
  const tbRaw = (gbDay * days) / DATA_UNIT.gbPerTB.value;
  const needTb = tbRaw * (1 + headroom / 100);
  const largest = CCTV_HDD_TB[CCTV_HDD_TB.length - 1];
  // ซื้อดิสก์น้อยลูกที่สุดที่จุพอ: ลูกเดียวไม่พอค่อยเพิ่มลูก (ไม่เกินจำนวนช่องที่มี) — ห้ามเติมทุกช่องด้วยใบเล็ก
  const drives = Math.max(1, ceil(needTb / largest));
  const fits = drives <= bays;
  const perDriveNeed = needTb / drives;
  const fitSize = fits ? pickHdd(perDriveNeed) : undefined;
  // ใส่ไม่พอในจำนวนช่องที่มี: ใช้ใบใหญ่สุดหลายลูก แล้วบอกว่าต้องมีช่องเท่าไหร่ (ไม่หนีบเงียบ)
  const size = fitSize ?? largest;
  const totalTb = size * drives;
  const tbPerDay = gbDay / DATA_UNIT.gbPerTB.value;
  const daysHeld = totalTb / tbPerDay;
  const shownTib = size / DATA_UNIT.tbPerTiB.value;
  const label = custom ? `${fmtTrim(mbps, 2)} Mbps (กรอกเอง)` : `${CCTV_BITRATES[preset].label} ≈ ${fmtTrim(mbps, 2)} Mbps`;

  return resultX({
    title: "ฮาร์ดดิสก์กล้องวงจรปิด",
    headline:
      fitSize !== undefined
        ? `ใช้ฮาร์ดดิสก์ ${size} TB × ${fmt(drives)} ลูก · เก็บได้ราว ${fmt(daysHeld, 1)} วัน`
        : `ต้องใช้ ${size} TB × ${fmt(drives)} ลูก — NVR ${fmt(bays)} ช่องใส่ไม่พอ`,
    chart: fitSize !== undefined ? hddChart(perDriveNeed, size) : undefined,
    rows: [
      { label: "บิตเรตต่อกล้อง", value: label },
      { label: "ต่อกล้อง 1 ตัว", value: `${fmt(perCam, 1)} GB/วัน` },
      { label: `กล้อง ${fmt(cams)} ตัว`, value: `${fmt(gbDay, 1)} GB/วัน` },
      { label: `เก็บย้อนหลัง ${fmt(days)} วัน`, value: `${fmt(tbRaw, 2)} TB` },
      { label: `รวมเผื่อ ${fmtTrim(headroom, 1)}%`, value: `${fmt(needTb, 2)} TB` },
      { label: "ฮาร์ดดิสก์ที่ต้องซื้อ", value: `${size} TB × ${fmt(drives)} ลูก (รวม ${fmt(totalTb)} TB)`, emphasize: true },
      ...(fitSize === undefined
        ? [{ label: "ช่องใส่ดิสก์", value: `NVR ต้องมีอย่างน้อย ${fmt(drives)} ช่อง (ตอนนี้ ${fmt(bays)} ช่อง)`, emphasize: true }]
        : bays > drives
          ? [{ label: "ช่องใส่ดิสก์", value: `ใช้ ${fmt(drives)} จาก ${fmt(bays)} ช่อง — ช่องที่เหลือไว้เพิ่มดิสก์ทีหลัง` }]
          : []),
      { label: "เก็บได้จริงกับดิสก์ที่ซื้อ", value: `ราว ${fmt(daysHeld, 1)} วัน`, emphasize: true },
      { label: "NVR จะแสดงความจุต่อลูก", value: `ราว ${fmt(shownTib, 2)} TB (หน่วย TiB)` },
    ],
    tip:
      recordPct < 100
        ? "อัดเฉพาะมีความเคลื่อนไหว: ตัวเลขนี้ขึ้นกับสัดส่วนเวลาที่กรอก หน้าบ้านติดถนนอาจอัดเกือบทั้งวัน"
        : "ดูบิตเรตจริงในหน้าตั้งค่ากล้อง (Kbps ÷ 1,000 = Mbps) ตัวเลขนี้เปลี่ยนตามค่านั้นตรง ๆ",
    explain: {
      risk: "A",
      updatedAt: UPDATED,
      summary: "GB/วัน = Mbps × 0.45 × ชั่วโมงที่อัด (1 Mbps 1 ชั่วโมง = 3,600 Mbit = 450 MB) · TB = GB/วัน × วัน ÷ 1,000 แล้วเผื่อ และปัดขึ้นเป็นขนาดดิสก์ที่ขาย",
      steps: [
        {
          label: "ต่อกล้อง 1 ตัว",
          expr: "GB/วัน = Mbps × 10^6 ÷ 8 × 3,600 × ชั่วโมง × สัดส่วนที่อัด ÷ 10^9",
          subst: `${fmtTrim(mbps, 2)} × 10^6 ÷ 8 × 3,600 × ${fmtTrim(hours, 1)} × ${fmtTrim(recordPct / 100, 2)} ÷ 10^9 = ${fmt(perCam, 2)} GB/วัน`,
        },
        { label: "ทุกกล้อง", expr: "GB/วัน × จำนวนกล้อง", subst: `${fmt(perCam, 2)} × ${fmt(cams)} = ${fmt(gbDay, 1)} GB/วัน` },
        {
          label: "ทั้งช่วงที่เก็บ",
          expr: "TB = GB/วัน × วัน ÷ 1,000 × (1 + เผื่อ)",
          subst: `${fmt(gbDay, 1)} × ${fmt(days)} ÷ 1,000 × ${fmtTrim(1 + headroom / 100, 3)} = ${fmt(needTb, 2)} TB`,
        },
        {
          label: "เลือกดิสก์",
          expr: `ลูก = ปัดขึ้น(TB ÷ ใบใหญ่สุด ${largest} TB) · ต่อลูก = TB ÷ ลูก แล้วปัดขึ้นเป็นขนาดที่ขาย`,
          subst:
            fitSize !== undefined
              ? `ปัดขึ้น(${fmt(needTb, 2)} ÷ ${largest}) = ${fmt(drives)} ลูก · ${fmt(needTb, 2)} ÷ ${fmt(drives)} = ${fmt(perDriveNeed, 2)} TB → ${size} TB`
              : `ปัดขึ้น(${fmt(needTb, 2)} ÷ ${largest}) = ${fmt(drives)} ลูก เกินช่องที่มี ${fmt(bays)} ช่อง`,
          note: "ซื้อลูกน้อยที่สุดที่จุพอ ไม่เกินจำนวนช่องของ NVR",
        },
        { label: "เก็บได้จริง", expr: "วัน = TB ที่ซื้อ ÷ TB/วัน", subst: `${fmt(totalTb)} ÷ ${fmt(tbPerDay, 4)} = ${fmt(daysHeld, 1)} วัน`, note: "ยังไม่หักส่วนเผื่อ — NVR จะเขียนทับของเก่าเองเมื่อเต็ม" },
      ],
      constants: [
        ...(custom ? [] : [CCTV_BITRATES[preset].mbps]),
        DATA_UNIT.bitsPerMbit,
        DATA_UNIT.bitsPerByte,
        DATA_UNIT.secPerHour,
        DATA_UNIT.bytesPerGB,
        DATA_UNIT.gbPerTB,
        DATA_UNIT.tbPerTiB,
        CCTV_STORAGE.headroomPct,
      ],
      assumptions: [
        "บิตเรตคงที่ตามที่กรอก (สตรีมหลัก) กล้องทุกตัวตั้งเท่ากัน",
        "TB คิดฐาน 10 แบบเดียวกับฉลากดิสก์ (1 TB = 1,000 GB)",
        "ไม่รวมสตรีมรอง (sub stream) ถ้า NVR อัดสตรีมรองด้วยให้บวกบิตเรตเพิ่ม",
        "เลือกดิสก์ลูกน้อยที่สุดที่จุพอ — ถ้าใบเล็กหลายลูกถูกกว่าใบใหญ่ลูกเดียว ให้เทียบราคาเองได้ (NVR ส่วนมากไม่ทำ RAID ข้อมูลไม่ได้สำรองซ้ำ)",
      ],
      caveats: [
        "บิตเรตแบบ VBR กลางคืน/ฝนตก/ต้นไม้ไหวพุ่งได้เกินค่าที่ตั้ง จึงควรเผื่อ",
        `ขนาดดิสก์: ${CCTV_STORAGE.hddSource}`,
        "NVR แต่ละรุ่นรับความจุต่อช่องไม่เท่ากัน ดูสเปก NVR ก่อนซื้อใบใหญ่",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "นิยามหน่วย SI / IEC 80000-13 (ฐาน 10 และ TiB)" }, { label: "หน้าตั้งค่าบิตเรตของกล้อง/NVR ที่ใช้จริง" }],
    },
  });
}

/* ─────────── งบไฟ PoE ─────────── */

type PoeGroup = { n: number; cls: number; deviceW: number; pse: number; label: string };

/** คลาสที่เลือกเองได้ในฟอร์ม: คลาส 0 (ไม่บอกคลาส) + คลาส 1–8 */
const POE_PICKABLE = [POE_CLASS0, ...POE_CLASSES];

/** คลาสเล็กสุดที่จ่ายถึงอุปกรณ์ได้ไม่น้อยกว่า watts */
export function poeClassFor(watts: number) {
  return POE_CLASSES.find((c) => c.pd >= watts - 1e-9);
}

function poeGroup(v: Values, i: number, fallbackN: number, fallbackW: number): PoeGroup {
  const n = num(v, `n${i}`, fallbackN);
  const spec = str(v, `s${i}`, "w");
  if (spec === "w") {
    const deviceW = num(v, `w${i}`, fallbackW);
    const c = poeClassFor(deviceW) ?? POE_CLASSES[POE_CLASSES.length - 1];
    return { n, cls: c.cls, deviceW, pse: c.pse, label: `${fmtTrim(deviceW, 2)} W (คลาส ${c.cls})` };
  }
  const cls = Number(spec.slice(1));
  const c = POE_PICKABLE.find((x) => x.cls === cls) ?? POE_CLASSES[0];
  const label = c.cls === 0 ? `คลาส 0 ไม่บอกคลาส (จองเท่าคลาส 3 ไม่เกิน ${fmtTrim(c.pd, 2)} W)` : `คลาส ${c.cls} (ไม่เกิน ${fmtTrim(c.pd, 2)} W)`;
  return { n, cls: c.cls, deviceW: c.pd, pse: c.pse, label };
}

export function calcPoe(v: Values): CalcResult {
  const bad = guard("poe", v);
  if (bad) return bad;
  const groups = [poeGroup(v, 1, 8, 6), poeGroup(v, 2, 0, 12), poeGroup(v, 3, 0, 25.5)].filter((g) => g.n > 0);
  const budget = num(v, "budget", 65);
  const ports = num(v, "ports", 8);
  const typeKey = str(v, "type", "at");
  const type = POE_TYPES[typeKey];
  const basis = str(v, "basis", "class");

  const devices = groups.reduce((s, g) => s + g.n, 0);
  const deviceTotal = groups.reduce((s, g) => s + g.n * g.deviceW, 0);
  const classTotal = groups.reduce((s, g) => s + g.n * g.pse, 0);
  const used = basis === "class" ? classTotal : deviceTotal;
  const spare = budget - used;
  const sparePct = (spare / budget) * 100;
  const over = spare < -1e-9;
  const tight = !over && sparePct < POE.headroomPct.value;
  const tooBig = groups.filter((g) => g.cls > type.maxClass);
  const portShort = devices > ports;

  const verdict = over
    ? `เกินงบไฟ ${fmt(-spare, 1)} W`
    : tight
      ? `เหลือ ${fmt(sparePct, 1)}% เฉียดเกินไป`
      : `เหลือ ${fmt(sparePct, 1)}% ผ่าน`;
  const max = Math.max(budget, used) * 1.15;

  return resultX({
    title: "งบไฟ PoE",
    headline: `ใช้ ${fmt(used, 1)} จาก ${fmt(budget, 1)} W · ${verdict}${tooBig.length ? " · มีอุปกรณ์เกินพอร์ต" : ""}${portShort ? " · พอร์ตไม่พอ" : ""}`,
    chart: {
      kind: "threshold",
      unit: "W",
      value: used,
      max,
      zones: [
        { upTo: budget * (1 - POE.headroomPct.value / 100), tone: "good", label: "เหลือพอ" },
        { upTo: budget, tone: "warn", label: "เฉียด" },
        { upTo: max, tone: "bad", label: "เกินงบ" },
      ],
    },
    rows: [
      ...groups.map((g, k) => ({
        label: `กลุ่ม ${k + 1}: ${fmt(g.n)} ตัว × ${g.label}`,
        value: `อุปกรณ์ ${fmt(g.n * g.deviceW, 2)} W · จองตามคลาส ${fmt(g.n * g.pse, 1)} W`,
      })),
      { label: "อุปกรณ์ใช้ไฟรวม (ตามสเปก)", value: `${fmt(deviceTotal, 2)} W` },
      { label: "สวิตช์ต้องจองตามคลาส", value: `${fmt(classTotal, 1)} W` },
      { label: `คิดเทียบงบแบบ${basis === "class" ? "จองตามคลาส" : "ไฟที่อุปกรณ์ใช้"}`, value: `${fmt(used, 1)} / ${fmt(budget, 1)} W`, emphasize: true },
      {
        label: "งบเหลือ",
        value: over ? `เกิน ${fmt(-spare, 1)} W — ใช้สวิตช์งบใหญ่ขึ้นหรือแยกสวิตช์` : `${fmt(spare, 1)} W (${fmt(sparePct, 1)}%)${tight ? ` ต่ำกว่า ${fmt(POE.headroomPct.value)}% ที่ควรเผื่อ` : ""}`,
        emphasize: true,
      },
      {
        label: `ต่อพอร์ต ${type.label}`,
        value: tooBig.length
          ? `ไม่พอ: อุปกรณ์คลาส ${tooBig.map((g) => g.cls).join(", ")} ต้องใช้พอร์ตที่จ่ายถึงตัวอุปกรณ์เกิน ${fmtTrim(type.pd.value, 2)} W`
          : `ผ่าน — ทุกตัวไม่เกิน ${fmtTrim(type.pd.value, 2)} W ที่ตัวอุปกรณ์ (พอร์ตจ่าย ${fmtTrim(type.pse.value, 1)} W)`,
        emphasize: tooBig.length > 0,
      },
      {
        label: "จำนวนพอร์ต PoE",
        value: portShort ? `ไม่พอ: อุปกรณ์ ${fmt(devices)} ตัว มี ${fmt(ports)} พอร์ต` : `อุปกรณ์ ${fmt(devices)} ตัว / ${fmt(ports)} พอร์ต`,
        emphasize: portShort,
      },
    ],
    tip: "ดูวัตต์สูงสุด (Max) ในสเปกกล้อง ไม่ใช่ค่าเฉลี่ย กล้องเปิดไฟ IR กลางคืนกินไฟมากสุด",
    explain: {
      risk: "B",
      updatedAt: UPDATED,
      summary: "รวมไฟของอุปกรณ์ทุกตัวเทียบงบ PoE ของสวิตช์ · คลาสของอุปกรณ์ = คลาสเล็กสุดที่จ่ายถึงตัวอุปกรณ์ได้ไม่น้อยกว่าวัตต์ของมัน · แต่ละตัวต้องไม่เกินที่พอร์ตชนิดนั้นจ่ายถึง",
      steps: [
        ...groups.map((g, k) => ({
          label: `กลุ่ม ${k + 1}`,
          expr: "จำนวน × วัตต์อุปกรณ์ · จำนวน × กำลังจองของคลาส",
          subst: `${fmt(g.n)} × ${fmtTrim(g.deviceW, 2)} = ${fmt(g.n * g.deviceW, 2)} W · ${fmt(g.n)} × ${fmtTrim(g.pse, 1)} = ${fmt(g.n * g.pse, 1)} W`,
        })),
        {
          label: "งบเหลือ",
          expr: "(งบ − ที่ใช้) ÷ งบ × 100",
          subst: `(${fmt(budget, 1)} − ${fmt(used, 1)}) ÷ ${fmt(budget, 1)} × 100 = ${over ? "เกินงบ" : `${fmt(sparePct, 1)}%`}`,
        },
        {
          label: "ต่อพอร์ต",
          expr: "คลาสอุปกรณ์ ≤ คลาสสูงสุดของพอร์ต",
          subst: `พอร์ต ${type.label} จ่ายได้ถึงคลาส ${type.maxClass} (${fmtTrim(type.pse.value, 1)} W ที่พอร์ต / ${fmtTrim(type.pd.value, 2)} W ที่อุปกรณ์)`,
        },
      ],
      constants: [type.pse, type.pd, POE.headroomPct],
      assumptions: [
        "จองตามคลาส = สวิตช์กันไฟไว้เต็มคลาสของพอร์ตนั้น (แบบระมัดระวัง สวิตช์ส่วนมากทำแบบนี้)",
        "คิดตามไฟที่อุปกรณ์ใช้ = รวมวัตต์สูงสุดตามสเปก ยังไม่รวมไฟที่หายในสาย (สาย 100 ม. หายได้ถึงราว 16% ของที่พอร์ตจ่าย)",
        `ตารางคลาส PoE: ${POE_PICKABLE.map((c) => `คลาส ${c.cls} ${fmtTrim(c.pse, 1)}/${fmtTrim(c.pd, 2)} W`).join(" · ")} (คลาส 0 = ไม่บอกคลาส สวิตช์จองเท่าคลาส 3)`,
      ],
      caveats: [
        "สวิตช์ราคาถูกบางรุ่นจ่ายครบงบรวมไม่ได้ทุกพอร์ตพร้อมกัน ดูสเปก PoE budget จริง",
        "กล้อง PTZ/มีฮีตเตอร์ ใช้ไฟตอนเริ่มเครื่องสูงกว่าปกติ เผื่อเพิ่ม",
        DISCLAIMER_AB,
      ],
      refs: [{ label: POE_CLASS_SOURCE }],
    },
  });
}

/* ─────────── สาย LAN กี่กล่อง ─────────── */

export function calcLan(v: Values): CalcResult {
  const bad = guard("lan", v);
  if (bad) return bad;
  const runs = num(v, "runs", 8);
  const avg = num(v, "avg", 30);
  const longest = num(v, "longest", 45);
  const s1 = num(v, "slackA", LAN.slackOutlet.value);
  const s2 = num(v, "slackB", LAN.slackRack.value);
  const ends = str(v, "ends", "both");
  const spare = num(v, "spare", LAN.rj45Spare.value);
  if (longest < avg - 1e-9) {
    return blockedResult({
      headline: `เส้นยาวสุด ${fmtTrim(longest, 1)} ม. สั้นกว่าค่าเฉลี่ย ${fmtTrim(avg, 1)} ม. — ตรวจตัวเลขอีกครั้ง`,
      tip: "เส้นยาวสุดต้องไม่น้อยกว่าความยาวเฉลี่ย",
    });
  }
  const box = LAN.boxM.value;
  const run = avg + s1 + s2;
  const longRun = longest + s1 + s2;
  const total = runs * run;
  const boxesByMetre = ceil(total / box);
  const perBox = Math.floor(box / run + 1e-9);
  const boxes = ceil(runs / perBox);
  const lastRuns = runs - (boxes - 1) * perBox;
  const leftover = boxes * box - total;
  // เศษท้ายกล่องที่น้อยที่สุด: กล่องเต็มตัดได้ perBox เส้น กล่องสุดท้ายตัด lastRuns เส้น
  const fullTail = boxes > 1 ? box - perBox * run : Infinity;
  const lastTail = box - lastRuns * run;
  const tightTail = Math.min(fullTail, lastTail);
  const tailShort = tightTail < LAN.minTail.value - 1e-9;
  const plugsPerRun = ends === "both" ? 2 : 1;
  const plugs = ceil(runs * plugsPerRun * (1 + spare / 100));
  const jacks = ends === "panel" ? runs : 0;
  const bags = ceil(plugs / LAN.rj45Bag.value);
  const overPerm = longRun > LAN.permanentLink.value + 1e-9;
  const overChannel = longRun > LAN.channel.value + 1e-9;

  return resultX({
    title: "สาย LAN กี่กล่อง",
    headline: `สาย LAN ${fmt(boxes)} กล่อง · หัว RJ45 ${fmt(plugs)} ตัว${overChannel ? " · เส้นยาวเกิน 100 ม." : overPerm ? " · เส้นยาวเกิน 90 ม." : ""}${tailShort ? " · เศษท้ายกล่องเหลือน้อย" : ""}`,
    chart: { kind: "packs", unitLabel: `กล่อง ${fmt(LAN.boxFt.value)} ฟุต`, count: boxes, lastUsed: (lastRuns * run) / box, note: `${fmt(runs)} เส้น เส้นละ ${fmtTrim(run, 2)} ม.` },
    rows: [
      { label: "ยาวต่อเส้น (รวมเผื่อปลาย)", value: `${fmtTrim(avg, 1)} + ${fmtTrim(s1, 2)} + ${fmtTrim(s2, 2)} = ${fmt(run, 2)} ม.` },
      { label: `รวม ${fmt(runs)} เส้น`, value: `${fmt(total, 1)} ม.` },
      { label: "กล่องหนึ่งตัดได้", value: `${fmt(perBox)} เส้น (กล่องละ ${fmtTrim(box, 1)} ม.)` },
      { label: "สาย LAN ที่ต้องซื้อ", value: `${fmt(boxes)} กล่อง`, emphasize: true },
      ...(boxes > boxesByMetre
        ? [{ label: "ทำไมไม่ใช่ตามเมตรรวม", value: `เมตรรวมใช้ ${fmt(boxesByMetre)} กล่อง แต่ต่อสายกลางเส้นไม่ได้ เศษปลายกล่องสั้นกว่า 1 เส้น` }]
        : []),
      { label: "เหลือสายโดยรวม", value: `${fmt(leftover, 1)} ม. (เป็นเศษท้ายกล่อง)` },
      ...(tailShort
        ? [
            {
              label: "เศษท้ายกล่องน้อยเกินไป",
              value: `กล่องหนึ่งเหลือแค่ ${fmt(tightTail, 2)} ม. (ควรเหลือ ≥ ${fmtTrim(LAN.minTail.value, 1)} ม.) วัดคลาดนิดเดียวเส้นสุดท้ายไม่พอ — ซื้อเพิ่ม 1 กล่อง หรือลดเผื่อปลาย`,
              emphasize: true,
            },
          ]
        : []),
      {
        label: `หัว RJ45 (เผื่อ ${fmtTrim(spare, 1)}%)`,
        value: `${fmt(plugs)} ตัว ≈ ${fmt(bags)} ถุง (ถุงละ ${fmt(LAN.rj45Bag.value)})`,
        emphasize: true,
      },
      { label: "บูทครอบหัว", value: `${fmt(plugs)} ตัว` },
      ...(jacks > 0 ? [{ label: "keystone/ช่องแพตช์พาเนล", value: `${fmt(jacks)} ช่อง` }] : []),
      {
        label: "เส้นยาวสุด (รวมเผื่อ)",
        value: overChannel
          ? `${fmt(longRun, 1)} ม. เกิน ${fmt(LAN.channel.value)} ม. — สัญญาณไม่ผ่าน ใช้สวิตช์กลางทาง/PoE extender/ไฟเบอร์`
          : overPerm
            ? `${fmt(longRun, 1)} ม. เกินสายเดินถาวร ${fmt(LAN.permanentLink.value)} ม. — สายแพตช์รวมสองปลายต้องไม่เกิน ${fmt(LAN.channel.value - longRun, 1)} ม.`
            : `${fmt(longRun, 1)} ม. ผ่าน (ไม่เกิน ${fmt(LAN.permanentLink.value)} ม.)`,
        emphasize: overPerm,
      },
    ],
    tip: "ดึงสายจากกล่องทีละเส้นแล้วเขียนเลขที่ปลายทั้งสองข้างก่อนตัด เส้นยาวดึงก่อนเพื่อใช้เศษกล่องกับเส้นสั้น",
    explain: {
      risk: "B",
      updatedAt: UPDATED,
      summary: "ยาวต่อเส้น = เฉลี่ย + เผื่อสองปลาย · กล่องหนึ่งตัดได้ ⌊304.8 ÷ ยาวต่อเส้น⌋ เส้น (ต่อกลางเส้นไม่ได้) · กล่อง = ⌈จำนวนเส้น ÷ เส้นต่อกล่อง⌉",
      steps: [
        { label: "ยาวต่อเส้น", expr: "เฉลี่ย + เผื่อฝั่งอุปกรณ์ + เผื่อฝั่งตู้", subst: `${fmtTrim(avg, 1)} + ${fmtTrim(s1, 2)} + ${fmtTrim(s2, 2)} = ${fmt(run, 2)} ม.` },
        { label: "กล่องหนึ่งตัดได้", expr: `⌊${fmtTrim(box, 1)} ÷ ยาวต่อเส้น⌋`, subst: `⌊${fmtTrim(box, 1)} ÷ ${fmt(run, 2)}⌋ = ${fmt(perBox)} เส้น` },
        { label: "จำนวนกล่อง", expr: "⌈เส้น ÷ เส้นต่อกล่อง⌉", subst: `⌈${fmt(runs)} ÷ ${fmt(perBox)}⌉ = ${fmt(boxes)} กล่อง`, note: `ถ้าคิดแค่เมตรรวม ${fmt(total, 1)} ÷ ${fmtTrim(box, 1)} = ${fmt(boxesByMetre)} กล่อง` },
        { label: "หัว RJ45", expr: "เส้น × หัวต่อเส้น × (1 + เผื่อ) ปัดขึ้น", subst: `${fmt(runs)} × ${plugsPerRun} × ${fmtTrim(1 + spare / 100, 3)} = ${fmt(plugs)} ตัว` },
        { label: "เช็กความยาว", expr: `เส้นยาวสุด + เผื่อ ≤ ${LAN.permanentLink.value} ม. (รวมสายแพตช์ ≤ ${LAN.channel.value} ม.)`, subst: `${fmtTrim(longest, 1)} + ${fmtTrim(s1 + s2, 2)} = ${fmt(longRun, 1)} ม.` },
      ],
      constants: [LAN.boxFt, LAN.boxM, LAN.permanentLink, LAN.channel, LAN.slackOutlet, LAN.slackRack, LAN.minTail, LAN.rj45Spare, LAN.rj45Bag],
      assumptions: [
        "ทุกเส้นยาวราวค่าเฉลี่ย — ถ้ายาวต่างกันมาก ให้แยกคิดกลุ่มเส้นยาวกับเส้นสั้น",
        "หนึ่งเส้นต้องมาจากกล่องเดียว ห้ามต่อกลางเส้น",
        ends === "both" ? "เข้าหัว RJ45 ทั้งสองปลาย" : "ปลายฝั่งตู้เข้าแพตช์พาเนล/keystone ปลายอุปกรณ์เข้าหัว RJ45",
      ],
      caveats: [
        "ระยะ 90/100 ม. เป็นของสายทองแดง Cat5e/Cat6 แท้ สายทองแดงผสม (CCA) วิ่งได้สั้นกว่าและจ่าย PoE ได้แย่กว่า",
        "เดินนอกอาคารใช้สายชนิด outdoor และร้อยท่อ",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "ANSI/TIA-568.2-D / ISO/IEC 11801-1 (ความยาว 90/100 ม.)" }, { label: "ANSI/TIA-568.0-D (การเผื่อสายปลายทาง)" }],
    },
  });
}

/* ─────────── มุมกล้อง / ระยะเห็นหน้า ─────────── */

const RAD = Math.PI / 180;

/** ค่าตั้งต้นช่องกรอกความกว้างเซนเซอร์เอง = กว้างภาพ 16:9 ของ 1/2.7" ปัด 2 ตำแหน่ง (ค่าเริ่มกรอก ไม่ใช่ค่าที่ใช้คิดของตัวเลือกในตาราง) */
const CUSTOM_SENSOR_DEFAULT = round(CCTV_SENSORS["1/2.7"].width.value, 2);

/** มุมรับภาพแนวนอน (องศา) จากความกว้างเซนเซอร์และเลนส์ — แบบเลนส์ไม่บิดภาพ */
export function hfovDeg(sensorWmm: number, focalMm: number): number {
  return (2 * Math.atan(sensorWmm / (2 * focalMm))) / RAD;
}

export function calcFov(v: Values): CalcResult {
  const bad = guard("fov", v);
  if (bad) return bad;
  const mode = str(v, "mode", "lens");
  const hres = num(v, "hres", 2560);
  const d = num(v, "d", 5);
  let fov: number;
  let widthFactor: number; // ความกว้างฉาก = ระยะ × widthFactor
  let lensText = "";
  const constants: ConstRef[] = [];
  if (mode === "lens") {
    const f = num(v, "f", 2.8);
    const sensorKey = str(v, "sensor", "1/2.7");
    const sw = sensorKey === "custom" ? num(v, "sw", CUSTOM_SENSOR_DEFAULT) : CCTV_SENSORS[sensorKey].width.value;
    if (sensorKey !== "custom") constants.push(CCTV_SENSORS[sensorKey].width);
    fov = hfovDeg(sw, f);
    widthFactor = sw / f;
    lensText = `เลนส์ ${fmtTrim(f, 2)} มม. · เซนเซอร์กว้าง ${fmtTrim(sw, 2)} มม.`;
  } else {
    fov = num(v, "hfov", 100);
    widthFactor = 2 * Math.tan((fov / 2) * RAD);
    lensText = `มุมจากสเปก ${fmtTrim(fov, 1)}°`;
  }
  const scene = d * widthFactor;
  const ppm = hres / scene;
  const reached = [...CCTV_PPM].reverse().find((l) => ppm >= l.ppm.value - 1e-9);
  const maxDist = (level: number) => hres / (widthFactor * level);
  const main = CCTV_PPM.filter((l) => ["detect", "observe", "recognise", "identify"].includes(l.key));
  constants.push(...main.map((l) => l.ppm));
  const identify = CCTV_PPM.find((l) => l.key === "identify")!;
  const chartMax = Math.max(ppm, identify.ppm.value) * 1.2;
  const lv = (k: string) => CCTV_PPM.find((l) => l.key === k)!.ppm.value;

  return resultX({
    title: "มุมกล้อง / ระยะเห็นหน้า",
    headline: `ที่ ${fmtTrim(d, 1)} ม. ภาพกว้าง ${fmt(scene, 2)} ม. · ${fmt(ppm)} px/ม. → ${reached ? reached.label : "ต่ำกว่าระดับดูภาพรวม"}`,
    chart: {
      kind: "threshold",
      unit: "px/ม.",
      value: ppm,
      max: chartMax,
      zones: [
        { upTo: lv("detect"), tone: "bad", label: "ไม่ถึงรู้ว่ามีคน" },
        { upTo: lv("recognise"), tone: "warn", label: "เห็นคน/ท่าทาง" },
        { upTo: lv("identify"), tone: "accent", label: "จำคนรู้จัก" },
        { upTo: chartMax, tone: "good", label: "ระบุตัวได้" },
      ],
    },
    rows: [
      { label: "กล้อง", value: `${lensText} · ภาพกว้าง ${fmt(hres)} พิกเซล` },
      { label: "มุมรับภาพแนวนอน", value: `${fmt(fov, 1)}°` },
      { label: `ความกว้างฉากที่ ${fmtTrim(d, 1)} ม.`, value: `${fmt(scene, 2)} ม.` },
      { label: "ความละเอียดที่ระยะนี้", value: `${fmt(ppm, 1)} px/ม.`, emphasize: true },
      { label: "ได้ระดับ", value: reached ? `${reached.label} (≥ ${fmtTrim(reached.ppm.value, 1)} px/ม.)` : `ต่ำกว่า ${fmtTrim(CCTV_PPM[0].ppm.value, 1)} px/ม.`, emphasize: true },
      ...[...main].reverse().map((l) => ({ label: `${l.label} ไกลสุด`, value: `${fmt(maxDist(l.ppm.value), 1)} ม. (${fmtTrim(l.ppm.value, 1)} px/ม.)` })),
    ],
    tip: "อยากเห็นหน้าคนแปลกหน้าชัด ต้องได้ราว 250 px/ม. ขึ้นไป — หน้าประตูใช้เลนส์แคบลงหรือขยับกล้องให้ใกล้จุดที่คนเดินผ่าน",
    explain: {
      risk: "B",
      updatedAt: UPDATED,
      summary: "มุมแนวนอน = 2·atan(กว้างเซนเซอร์ ÷ 2·เลนส์) · ความกว้างฉาก = ระยะ × กว้างเซนเซอร์ ÷ เลนส์ · px/ม. = พิกเซลแนวนอน ÷ ความกว้างฉาก",
      steps: [
        mode === "lens"
          ? { label: "มุมรับภาพ", expr: "2 × atan(กว้างเซนเซอร์ ÷ (2 × เลนส์))", subst: `${lensText} → ${fmt(fov, 1)}°` }
          : { label: "มุมรับภาพ", expr: "ใช้มุมแนวนอนจากสเปกกล้อง", subst: `${fmtTrim(fov, 1)}°` },
        {
          label: "ความกว้างฉาก",
          expr: mode === "lens" ? "ระยะ × กว้างเซนเซอร์ ÷ เลนส์" : "2 × ระยะ × tan(มุม ÷ 2)",
          subst: `${fmtTrim(d, 1)} × ${fmtTrim(widthFactor, 4)} = ${fmt(scene, 2)} ม.`,
        },
        { label: "ความละเอียดต่อเมตร", expr: "พิกเซลแนวนอน ÷ ความกว้างฉาก", subst: `${fmt(hres)} ÷ ${fmt(scene, 3)} = ${fmt(ppm, 1)} px/ม.` },
        {
          label: "ระยะไกลสุดตามระดับ",
          expr: "พิกเซลแนวนอน ÷ (px/ม. ที่ต้องการ × กว้างฉากต่อระยะ 1 ม.)",
          subst: `ระบุตัว: ${fmt(hres)} ÷ (${fmtTrim(identify.ppm.value, 1)} × ${fmtTrim(widthFactor, 4)}) = ${fmt(maxDist(identify.ppm.value), 2)} ม.`,
        },
      ],
      constants,
      assumptions: [
        "เลนส์ไม่บิดภาพ (pinhole) — เลนส์มุมกว้าง 2.8 มม. ของจริงบิดขอบภาพ มุมในสเปกจึงกว้างกว่าที่คิดได้ ถ้ามีสเปกให้ใช้โหมดมุมจากสเปก",
        "วัดที่กึ่งกลางภาพ คนยืนตั้งฉากกับกล้อง ไม่คิดมุมก้มของกล้อง",
        "ความกว้างเซนเซอร์ในตารางคิดเป็นภาพ 16:9 จากเส้นทแยงตามขนาดเรียก (ทแยง × 16 ÷ √337) — กล้องที่ตั้งภาพ 4:3 ความกว้างจริงต่างจากนี้ ให้ใช้โหมดมุมจากสเปก",
      ],
      caveats: [
        "ระดับ px/ม. เป็นค่าอ้างอิง ภาพจริงยังขึ้นกับแสง โฟกัส การบีบอัด และกลางคืนที่เปิด IR",
        "ขนาดเซนเซอร์เป็นค่าตามตารางทั่วไป ชิปแต่ละรุ่นต่างกันเล็กน้อย",
        DISCLAIMER_AB,
      ],
      refs: [{ label: "IEC 62676-4:2014 — ระดับความละเอียดตามจุดประสงค์ (ค่าอ้างอิง)" }],
    },
  });
}

/* ─────────── ฟอร์ม ─────────── */

const bitrateOptions = [
  ...Object.entries(CCTV_BITRATES).map(([value, b]) => ({ value, label: `${b.label} ≈ ${fmtTrim(b.mbps.value, 1)} Mbps (ค่าทั่วไป)` })),
  { value: "custom", label: "กรอกบิตเรตเอง" },
];

function poeGroupFields(i: number, n: number, w: number, nMin: number): Field[] {
  return [
    { type: "number", integer: true, key: `n${i}`, label: `กลุ่ม ${i}: จำนวน${i === 1 ? "กล้อง" : "อุปกรณ์"}`, unit: "ตัว", default: n, min: nMin, max: 48 },
    {
      type: "select",
      key: `s${i}`,
      label: `กลุ่ม ${i}: ไฟต่อตัว`,
      default: "w",
      options: [
        { value: "w", label: "กรอกวัตต์จากสเปก" },
        { value: "c0", label: `คลาส 0 / ไม่ระบุคลาส (จองเท่าคลาส 3 ≤ ${fmtTrim(POE_CLASS0.pd, 2)} W)` },
        ...POE_CLASSES.map((c) => ({ value: `c${c.cls}`, label: `คลาส ${c.cls} (≤ ${fmtTrim(c.pd, 2)} W)` })),
      ],
    },
    { type: "number", key: `w${i}`, label: `กลุ่ม ${i}: วัตต์สูงสุดต่อตัว`, unit: "W", default: w, min: 0.5, max: 71.3, step: 0.1, when: { key: `s${i}`, is: "w" } },
  ];
}

export const lowvoltTools: ToolDef[] = [
  {
    id: "hdd",
    name: "ฮาร์ดดิสก์กล้องวงจรปิดกี่ TB",
    blurb: "บิตเรต ชั่วโมงอัด วันเก็บ → TB",
    keywords: ["ฮาร์ดดิสก์", "hdd", "nvr", "dvr", "เก็บย้อนหลัง", "บิตเรต", "tb"],
    fields: [
      { type: "number", integer: true, key: "cams", label: "จำนวนกล้อง", unit: "ตัว", default: 8, min: 1, max: 128 },
      { type: "select", key: "preset", label: "ความละเอียด/การบีบอัด", default: "4mp-h265", options: bitrateOptions },
      { type: "number", key: "mbps", label: "บิตเรตต่อกล้อง", unit: "Mbps", default: 4, min: 0.1, max: 50, step: 0.1, when: { key: "preset", is: "custom" } },
      { type: "number", key: "hours", label: "อัดวันละ", unit: "ชม.", default: 24, min: 1, max: 24 },
      { type: "number", key: "record", label: "สัดส่วนเวลาที่อัดจริง (อัดเฉพาะเคลื่อนไหว < 100)", unit: "%", default: 100, min: 1, max: 100 },
      { type: "number", key: "days", label: "เก็บย้อนหลัง", unit: "วัน", default: 30, min: 1, max: 365 },
      { type: "number", key: "headroom", label: "เผื่อ", unit: "%", default: CCTV_STORAGE.headroomPct.value, min: 0, max: 50 },
      { type: "number", integer: true, key: "bays", label: "ช่องใส่ดิสก์ใน NVR", unit: "ช่อง", default: 1, min: 1, max: 16 },
    ],
    calc: calcHdd,
  },
  {
    id: "poe",
    name: "งบไฟ PoE",
    blurb: "รวมวัตต์ เทียบงบสวิตช์ เช็กต่อพอร์ต",
    keywords: ["poe", "สวิตช์", "switch", "802.3af", "802.3at", "poe+", "วัตต์กล้อง"],
    fields: [
      ...poeGroupFields(1, 8, 6, 1),
      ...poeGroupFields(2, 0, 12, 0),
      ...poeGroupFields(3, 0, 25.5, 0),
      { type: "number", key: "budget", label: "งบ PoE ของสวิตช์ (PoE budget)", unit: "W", default: 65, min: 5, max: 2000 },
      { type: "number", integer: true, key: "ports", label: "จำนวนพอร์ต PoE", unit: "พอร์ต", default: 8, min: 1, max: 96 },
      { type: "select", key: "type", label: "ชนิดพอร์ต", default: "at", options: Object.entries(POE_TYPES).map(([value, t]) => ({ value, label: t.label })) },
      {
        type: "select",
        key: "basis",
        label: "คิดเทียบงบแบบ",
        default: "class",
        options: [
          { value: "class", label: "จองตามคลาส (ระมัดระวัง)" },
          { value: "actual", label: "ตามวัตต์ที่อุปกรณ์ใช้" },
        ],
      },
    ],
    calc: calcPoe,
  },
  {
    id: "lan",
    name: "สาย LAN กี่กล่อง",
    blurb: "กล่อง 305 ม. หัว RJ45 เช็ก 90/100 ม.",
    keywords: ["สายแลน", "lan", "cat6", "cat5e", "utp", "rj45", "หัวแลน", "กล่อง 305"],
    fields: [
      { type: "number", integer: true, key: "runs", label: "จำนวนเส้น", unit: "เส้น", default: 8, min: 1, max: 500 },
      { type: "number", key: "avg", label: "ยาวเฉลี่ยต่อเส้น", unit: "ม.", default: 30, min: 1, max: 250, step: 0.5 },
      { type: "number", key: "longest", label: "เส้นที่ยาวที่สุด", unit: "ม.", default: 45, min: 1, max: 290, step: 0.5 },
      { type: "number", key: "slackA", label: "เผื่อปลายฝั่งกล้อง/เต้ารับ", unit: "ม.", default: LAN.slackOutlet.value, min: 0, max: 5, step: 0.1 },
      { type: "number", key: "slackB", label: "เผื่อปลายฝั่งตู้/NVR", unit: "ม.", default: LAN.slackRack.value, min: 0, max: 10, step: 0.1 },
      {
        type: "select",
        key: "ends",
        label: "เข้าหัวปลายสาย",
        default: "both",
        options: [
          { value: "both", label: "หัว RJ45 ทั้งสองปลาย" },
          { value: "panel", label: "ฝั่งตู้เข้าแพตช์พาเนล/keystone" },
        ],
      },
      { type: "number", key: "spare", label: "เผื่อหัวเสีย", unit: "%", default: LAN.rj45Spare.value, min: 0, max: 50 },
    ],
    calc: calcLan,
  },
  {
    id: "fov",
    name: "มุมกล้อง / ระยะเห็นหน้า",
    blurb: "เลนส์ เซนเซอร์ ระยะ → px/ม.",
    keywords: ["มุมกล้อง", "เลนส์", "2.8 มม.", "fov", "ppm", "เห็นหน้า", "ระยะกล้อง", "dori"],
    fields: [
      {
        type: "select",
        key: "mode",
        label: "คิดมุมจาก",
        default: "lens",
        options: [
          { value: "lens", label: "เลนส์ + ขนาดเซนเซอร์" },
          { value: "spec", label: "มุมแนวนอนจากสเปกกล้อง" },
        ],
      },
      { type: "number", key: "f", label: "เลนส์", unit: "มม.", default: 2.8, min: 1, max: 100, step: 0.1, when: { key: "mode", is: "lens" } },
      {
        type: "select",
        key: "sensor",
        label: "ขนาดเซนเซอร์",
        default: "1/2.7",
        options: [
          ...Object.entries(CCTV_SENSORS).map(([value, s]) => ({ value, label: `${s.label} (กว้าง ${fmtTrim(s.width.value, 2)} มม.)` })),
          { value: "custom", label: "กรอกความกว้างเอง" },
        ],
        when: { key: "mode", is: "lens" },
      },
      { type: "number", key: "sw", label: "กว้างเซนเซอร์ (ภาพ 16:9)", unit: "มม.", default: CUSTOM_SENSOR_DEFAULT, min: 1, max: 20, step: 0.01, when: { key: "sensor", is: "custom", and: { key: "mode", is: "lens" } } },
      { type: "number", key: "hfov", label: "มุมแนวนอนจากสเปก", unit: "องศา", default: 100, min: 5, max: 170, step: 0.1, when: { key: "mode", is: "spec" } },
      { type: "number", key: "hres", label: "ภาพกว้าง (พิกเซลแนวนอน)", unit: "px", default: 2560, min: 320, max: 8192 },
      { type: "number", key: "d", label: "ระยะถึงจุดที่ต้องการดู", unit: "ม.", default: 5, min: 0.5, max: 300, step: 0.1 },
    ],
    calc: calcFov,
  },
];
