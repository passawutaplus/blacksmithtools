import type { ChartSpec, ChartTone } from "@/lib/chang/types";

/**
 * สีกราฟใช้เฉพาะชุดแบรนด์: navy, สนิม และเทากลาง — ไม่มีเขียว/เหลือง/แดงสัญญาณไฟ
 * สถานะทุกอย่างจึงต้องมี "คำ" กำกับเสมอ (ไม่พอ / แนะนำ / พอ, ชื่อช่วงเกณฑ์) ห้ามสื่อด้วยสีอย่างเดียว
 * ตัวหนังสือใช้สีหมึก (navy/เทา) ไม่ใช้สีของแท่ง
 */
const INK = "#253641";
const INK_SOFT = "#55626c";
const RUST = "#C14D35";
const GREY = "#aab4bc";
const TRACK = "#eef0f2";

/** โซนของกราฟเทียบเกณฑ์: พื้นอ่อน + ขอบเข้ม */
const ZONE: Record<ChartTone, { fill: string; edge: string }> = {
  good: { fill: "#dde2e6", edge: INK },
  warn: { fill: "#f6ddd6", edge: "#d98a76" },
  bad: { fill: "#e9aa9b", edge: RUST },
  accent: { fill: "#f6ddd6", edge: RUST },
  mute: { fill: TRACK, edge: GREY },
};

/** ส่วนประกอบของกราฟแยกส่วน: สีบอก "ชิ้นไหน" ไม่ได้บอกดี/เสีย — เรียงให้ชิ้นติดกันต่างกันชัด (ตรวจ CVD แล้ว) */
const PART: Record<ChartTone, string> = {
  accent: RUST,
  warn: INK,
  mute: GREY,
  good: "#5d6f7c",
  bad: "#e7876f",
};
const PART_ORDER: ChartTone[] = ["accent", "warn", "mute", "good", "bad"];

/**
 * กราฟ SVG ย่อ-ขยายทั้งภาพตามความกว้างที่ได้ ตัวหนังสือจึงโตตามไปด้วย
 * บนจอเล็กต้องเต็มความกว้างเพื่อให้อ่านออก แต่บนจอใหญ่ต้องหยุดไว้ ไม่งั้นตัวเลขจะโตเกินหัวข้อผลลัพธ์
 */
const CHART_WIDTH = "w-full max-w-[400px]";
const CAPTION = "text-[0.8125rem] leading-snug text-navy/75";

function fmtNum(n: number): string {
  const rounded = Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 100) / 100;
  return rounded.toLocaleString("th-TH");
}

/* ───────── ไต่ขั้นขนาดที่ขายจริง ───────── */

const STEP_WORD = { under: "ไม่พอ", chosen: "แนะนำ", over: "พอ" } as const;

function StepsChart({ spec }: { spec: Extract<ChartSpec, { kind: "steps" }> }) {
  // พิกัดออกแบบบนฐาน 320 หน่วย แล้วปล่อยให้ SVG ย่อตามความกว้างการ์ด
  // ตัวหนังสือใช้ 12 หน่วย เพราะบนจอ 360 px การ์ดเหลือราว 300 px ตัวจะเหลือ ~11 px ยังอ่านออกกลางแดด
  const W = 320;
  const ROW = 24;
  const TRACK_X = 92;
  const STATUS_W = 44;
  const height = spec.items.length * ROW + 6;
  const peak = Math.max(...spec.items.map((i) => i.value), spec.need ?? 0);
  const max = peak * 1.08 || 1;

  // ขั้นบางชุด (ขนาดแอร์ ถังน้ำ หม้อแปลง) ชื่อขั้นคือตัวเลขเดียวกับค่าอยู่แล้ว
  // ไม่ต้องพิมพ์ซ้ำอีกคอลัมน์ เอาที่ว่างไปต่อความยาวแท่งให้อ่านง่ายขึ้นบนจอเล็ก
  const labelCarriesValue = spec.items.every((i) => i.label.startsWith(fmtNum(i.value)));
  const VALUE_W = labelCarriesValue ? 0 : 46;
  const TRACK_W = W - TRACK_X - VALUE_W - STATUS_W - 6;
  const needX = spec.need ? TRACK_X + (spec.need / max) * TRACK_W : null;

  return (
    <figure className="mt-3.5">
      {spec.need ? (
        <figcaption className={`mb-1.5 flex items-center gap-2 ${CAPTION}`}>
          <span className="inline-block h-0 w-5 shrink-0 border-t-2 border-dashed border-navy/60" aria-hidden />
          {spec.needLabel ?? "ต้องได้ไม่น้อยกว่า"} {fmtNum(spec.need)} {spec.unit}
        </figcaption>
      ) : null}
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className={CHART_WIDTH}
        role="img"
        aria-label={spec.items
          .map((i) => `${i.label} ${fmtNum(i.value)} ${spec.unit} ${STEP_WORD[i.state]}`)
          .join(", ")}
      >
        {spec.items.map((item, i) => {
          const chosen = item.state === "chosen";
          const fill = chosen ? RUST : item.state === "under" ? GREY : INK;
          const y = i * ROW + 6;
          const ink = chosen ? INK : INK_SOFT;
          const weight = chosen ? 700 : 400;
          return (
            <g key={item.label}>
              <text x={84} y={y + 9.5} textAnchor="end" fontSize="12" fill={ink} fontWeight={weight}>
                {item.label}
              </text>
              <rect x={TRACK_X} y={y} width={TRACK_W} height="10" fill={TRACK} />
              <rect x={TRACK_X} y={y} width={Math.max((item.value / max) * TRACK_W, 3)} height="10" fill={fill} />
              {labelCarriesValue ? null : (
                <text x={TRACK_X + TRACK_W + 6} y={y + 9.5} fontSize="12" fill={ink} fontWeight={weight}>
                  {fmtNum(item.value)}
                </text>
              )}
              {/* สถานะเป็นคำ กำกับทุกแถว — ไม่ต้องจำว่าสีไหนแปลว่าอะไร */}
              <text x={W} y={y + 9.5} textAnchor="end" fontSize="12" fill={ink} fontWeight={weight}>
                {STEP_WORD[item.state]}
              </text>
            </g>
          );
        })}
        {needX ? (
          <line x1={needX} x2={needX} y1={2} y2={height - 2} stroke={INK} strokeOpacity="0.6" strokeWidth="1.5" strokeDasharray="3 3" />
        ) : null}
      </svg>
    </figure>
  );
}

/* ───────── ค่าเทียบเกณฑ์ ───────── */

function ThresholdChart({ spec }: { spec: Extract<ChartSpec, { kind: "threshold" }> }) {
  const W = 320;
  const H = 54;
  const TRACK_Y = 24;
  const TRACK_H = 12;
  const max = spec.max || 1;
  const x = (n: number) => Math.min(Math.max((n / max) * W, 0), W);
  const foundIndex = spec.zones.findIndex((z) => spec.value <= z.upTo);
  const currentIndex = foundIndex < 0 ? spec.zones.length - 1 : foundIndex;
  const valueX = x(spec.value);
  const markerX = Math.min(Math.max(valueX, 5), W - 5);
  const valueText = `${fmtNum(spec.value)} ${spec.unit}`;
  const half = valueText.length * 3.8 + 2;
  const labelX = Math.min(Math.max(valueX, half), W - half);

  const rangeText = (i: number) => {
    const upTo = fmtNum(spec.zones[i].upTo);
    if (i === 0) return `ไม่เกิน ${upTo} ${spec.unit}`;
    const from = fmtNum(spec.zones[i - 1].upTo);
    return i === spec.zones.length - 1 ? `เกิน ${from} ${spec.unit}` : `${from}–${upTo} ${spec.unit}`;
  };

  return (
    <figure className={`mt-3.5 ${CHART_WIDTH}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`ค่าที่คำนวณได้ ${valueText} อยู่ในช่วง ${rangeText(currentIndex)}${
          spec.zones[currentIndex]?.label ? ` ${spec.zones[currentIndex].label}` : ""
        }`}
      >
        {spec.zones.map((zone, i) => {
          const from = i === 0 ? 0 : x(spec.zones[i - 1].upTo);
          const to = x(zone.upTo);
          const tone = ZONE[zone.tone];
          return (
            <rect
              key={zone.upTo}
              x={from + (i === 0 ? 0.5 : 1)}
              y={TRACK_Y + 0.5}
              width={Math.max(to - from - (i === 0 ? 1 : 1.5), 0)}
              height={TRACK_H - 1}
              fill={tone.fill}
              stroke={tone.edge}
              strokeWidth={i === currentIndex ? 1.5 : 1}
            />
          );
        })}
        {spec.zones.slice(0, -1).map((zone) => (
          <text key={`b-${zone.upTo}`} x={x(zone.upTo)} y={H - 4} textAnchor="middle" fontSize="11" fill={INK_SOFT}>
            {fmtNum(zone.upTo)}
          </text>
        ))}
        {/* ตัวชี้ค่า: เส้นตั้ง + หัวลูกศร navy (ไม่ใช้จุดกลม) */}
        <line x1={markerX} x2={markerX} y1={TRACK_Y - 3} y2={TRACK_Y + TRACK_H + 3} stroke={INK} strokeWidth="2" />
        <path d={`M ${markerX - 4.5} ${TRACK_Y - 8} L ${markerX + 4.5} ${TRACK_Y - 8} L ${markerX} ${TRACK_Y - 2} Z`} fill={INK} />
        <text x={labelX} y={11} textAnchor="middle" fontSize="13" fontWeight="700" fill={INK}>
          {valueText}
        </text>
      </svg>
      <figcaption className="mt-1.5">
        <ul className="divide-y divide-navy/10 border-y border-navy/15">
          {spec.zones.map((zone, i) => {
            const current = i === currentIndex;
            return (
              <li
                key={zone.upTo}
                className={`flex items-start gap-2 py-1.5 text-[0.8125rem] leading-snug ${
                  current ? "font-semibold text-navy" : "text-navy/75"
                }`}
              >
                <span
                  className="mt-[3px] h-3 w-3 shrink-0 border"
                  style={{ background: ZONE[zone.tone].fill, borderColor: ZONE[zone.tone].edge }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="tabular-nums">{rangeText(i)}</span>
                  {zone.label ? ` · ${zone.label}` : ""}
                </span>
                {current ? (
                  <span className="shrink-0 bg-navy px-1.5 py-px text-xs font-semibold text-white">ค่าที่ได้</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </figcaption>
    </figure>
  );
}

/* ───────── แยกส่วนประกอบ ───────── */

function StackChart({ spec }: { spec: Extract<ChartSpec, { kind: "stack" }> }) {
  const total = spec.parts.reduce((sum, p) => sum + Math.max(p.value, 0), 0) || 1;
  const colorOf = (i: number) => PART[spec.parts[i].tone ?? PART_ORDER[i % PART_ORDER.length]];
  return (
    <figure className={`mt-3.5 ${CHART_WIDTH}`}>
      <div
        className="flex h-3.5 w-full gap-0.5"
        role="img"
        aria-label={spec.parts.map((p) => `${p.label} ${p.display}`).join(", ")}
      >
        {spec.parts.map((part, i) => (
          <span
            key={part.label}
            className="h-full"
            style={{ width: `${Math.max((Math.max(part.value, 0) / total) * 100, 2)}%`, background: colorOf(i) }}
          />
        ))}
      </div>
      <figcaption className="mt-2 space-y-1">
        {spec.parts.map((part, i) => (
          <span key={part.label} className="flex items-start justify-between gap-2 text-[0.8125rem] leading-snug">
            <span className="flex min-w-0 items-start gap-2 text-navy/75">
              <span className="mt-[3px] h-3 w-3 shrink-0" style={{ background: colorOf(i) }} aria-hidden />
              <span className="min-w-0">{part.label}</span>
            </span>
            <span className="shrink-0 font-medium text-navy tabular-nums">{part.display}</span>
          </span>
        ))}
        {spec.totalDisplay ? (
          <span className="flex items-center justify-between gap-2 border-t border-navy/20 pt-1.5 text-[0.8125rem]">
            <span className="font-semibold text-navy">{spec.totalLabel ?? "รวม"}</span>
            <span className="font-bold text-navy tabular-nums">{spec.totalDisplay}</span>
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}

/* ───────── ของที่ซื้อเป็นใบ/กล่อง ───────── */

function PacksChart({ spec }: { spec: Extract<ChartSpec, { kind: "packs" }> }) {
  const count = Math.max(0, Math.round(spec.count));
  const tooMany = count > 36;
  const lastUsed = spec.lastUsed === undefined ? 1 : Math.min(Math.max(spec.lastUsed, 0.08), 1);

  return (
    <figure className="mt-3.5">
      {tooMany ? (
        <p className="text-sm font-bold text-navy">
          {count.toLocaleString("th-TH")} {spec.unitLabel}
        </p>
      ) : (
        <div
          className="flex flex-wrap gap-1"
          role="img"
          aria-label={`${count} ${spec.unitLabel}${spec.note ? ` ${spec.note}` : ""}`}
        >
          {Array.from({ length: count }, (_, i) => {
            const isLast = i === count - 1;
            const fill = isLast ? lastUsed : 1;
            return (
              <span key={i} className="flex h-6 w-5 items-end overflow-hidden rounded-[2px] border border-navy/30 bg-white">
                <span className="w-full" style={{ height: `${fill * 100}%`, background: fill < 1 ? "#d98a76" : RUST }} />
              </span>
            );
          })}
        </div>
      )}
      {spec.note ? <figcaption className={`mt-1.5 ${CAPTION}`}>{spec.note}</figcaption> : null}
    </figure>
  );
}

export function ResultChart({ spec }: { spec: ChartSpec }) {
  if (spec.kind === "steps") return <StepsChart spec={spec} />;
  if (spec.kind === "threshold") return <ThresholdChart spec={spec} />;
  if (spec.kind === "stack") return <StackChart spec={spec} />;
  return <PacksChart spec={spec} />;
}
