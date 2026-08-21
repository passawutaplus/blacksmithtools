import type { ChartSpec, ChartTone } from "@/lib/chang/types";

const TONE: Record<ChartTone, { solid: string; tint: string }> = {
  good: { solid: "#16a34a", tint: "#dcfce7" },
  warn: { solid: "#d97706", tint: "#fef3c7" },
  bad: { solid: "#dc2626", tint: "#fee2e2" },
  accent: { solid: "#c24b32", tint: "#f6e3de" },
  mute: { solid: "#9aa8b4", tint: "#eef0f2" },
};

const STACK_TONES: ChartTone[] = ["accent", "good", "warn", "mute", "bad"];

/**
 * กราฟ SVG ย่อ-ขยายทั้งภาพตามความกว้างที่ได้ ตัวหนังสือจึงโตตามไปด้วย
 * บนจอเล็กต้องเต็มความกว้างเพื่อให้อ่านออก แต่บนจอใหญ่ต้องหยุดไว้ ไม่งั้นตัวเลขจะโตเกินหัวข้อผลลัพธ์
 */
const CHART_WIDTH = "w-full max-w-[400px]";

function fmtNum(n: number): string {
  const rounded = Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 100) / 100;
  return rounded.toLocaleString("th-TH");
}

/* ───────── ไต่ขั้นขนาดที่ขายจริง ───────── */

function StepsChart({ spec }: { spec: Extract<ChartSpec, { kind: "steps" }> }) {
  // พิกัดออกแบบบนฐาน 320 หน่วย แล้วปล่อยให้ SVG ย่อตามความกว้างการ์ด
  // ตัวหนังสือใช้ 12 หน่วย เพราะบนจอ 360 px การ์ดเหลือราว 300 px ตัวจะเหลือ ~11 px ยังอ่านออกกลางแดด
  const W = 320;
  const ROW = 24;
  const TRACK_X = 92;
  const height = spec.items.length * ROW + 6;
  const peak = Math.max(...spec.items.map((i) => i.value), spec.need ?? 0);
  const max = peak * 1.08 || 1;

  // ขั้นบางชุด (ขนาดแอร์ ถังน้ำ หม้อแปลง) ชื่อขั้นคือตัวเลขเดียวกับค่าอยู่แล้ว
  // ไม่ต้องพิมพ์ซ้ำอีกคอลัมน์ เอาที่ว่างไปต่อความยาวแท่งให้อ่านง่ายขึ้นบนจอเล็ก
  const labelCarriesValue = spec.items.every((i) => i.label.startsWith(fmtNum(i.value)));
  const TRACK_W = labelCarriesValue ? W - TRACK_X - 4 : 168;
  const needX = spec.need ? TRACK_X + (spec.need / max) * TRACK_W : null;

  return (
    <figure className="mt-3">
      {spec.need ? (
        <figcaption className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted">
          <span className="inline-block h-0 w-4 border-t border-dashed border-[#64748b]" />
          {spec.needLabel ?? "ต้องได้ไม่น้อยกว่า"} {fmtNum(spec.need)} {spec.unit}
        </figcaption>
      ) : null}
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className={CHART_WIDTH}
        role="img"
        aria-label={spec.items.map((i) => `${i.label} ${fmtNum(i.value)} ${spec.unit}`).join(", ")}
      >
        {spec.items.map((item, i) => {
          const tone = item.state === "chosen" ? TONE.accent : item.state === "under" ? TONE.mute : TONE.good;
          const y = i * ROW + 6;
          return (
            <g key={item.label}>
              <text
                x={84}
                y={y + 9}
                textAnchor="end"
                fontSize="12"
                fill={item.state === "chosen" ? "#23323d" : "#6b7280"}
                fontWeight={item.state === "chosen" ? 700 : 400}
              >
                {item.label}
              </text>
              <rect x={TRACK_X} y={y} width={TRACK_W} height="10" rx="5" fill="#f1f3f5" />
              <rect
                x={TRACK_X}
                y={y}
                width={Math.max((item.value / max) * TRACK_W, 3)}
                height="10"
                rx="5"
                fill={tone.solid}
                opacity={item.state === "under" ? 0.5 : 1}
              />
              {labelCarriesValue ? null : (
                <text
                  x={TRACK_X + TRACK_W + 6}
                  y={y + 9}
                  fontSize="12"
                  fill={item.state === "chosen" ? "#23323d" : "#6b7280"}
                  fontWeight={item.state === "chosen" ? 700 : 400}
                >
                  {fmtNum(item.value)}
                </text>
              )}
            </g>
          );
        })}
        {needX ? (
          <line
            x1={needX}
            x2={needX}
            y1={2}
            y2={height - 2}
            stroke="#64748b"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        ) : null}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
        {spec.items.some((i) => i.state === "under") ? <Swatch tone="mute" faded label="ยังไม่พอ" /> : null}
        <Swatch tone="accent" label="ที่แนะนำ" />
        {spec.items.some((i) => i.state === "over") ? <Swatch tone="good" label="พอ เผื่อไว้ได้" /> : null}
      </figcaption>
    </figure>
  );
}

function Swatch({ tone, label, faded }: { tone: ChartTone; label: string; faded?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: TONE[tone].solid, opacity: faded ? 0.5 : 1 }}
      />
      {label}
    </span>
  );
}

/* ───────── ค่าเทียบเกณฑ์ ───────── */

function ThresholdChart({ spec }: { spec: Extract<ChartSpec, { kind: "threshold" }> }) {
  const W = 320;
  const H = 50;
  const TRACK_Y = 20;
  const max = spec.max || 1;
  const x = (n: number) => Math.min(Math.max((n / max) * W, 0), W);
  const valueTone = spec.zones.find((z) => spec.value <= z.upTo)?.tone ?? "bad";
  const valueX = x(spec.value);
  const labelX = Math.min(Math.max(valueX, 22), W - 22);

  return (
    <figure className="mt-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={CHART_WIDTH}
        role="img"
        aria-label={`ค่าที่คำนวณได้ ${fmtNum(spec.value)} ${spec.unit} เทียบเกณฑ์ ${spec.zones
          .filter((z) => z.label)
          .map((z) => `${z.label} ${fmtNum(z.upTo)}`)
          .join(" และ ")}`}
      >
        {spec.zones.map((zone, i) => {
          const from = i === 0 ? 0 : x(spec.zones[i - 1].upTo);
          const to = x(zone.upTo);
          return <rect key={zone.upTo} x={from} y={TRACK_Y} width={Math.max(to - from, 0)} height="12" fill={TONE[zone.tone].tint} />;
        })}
        {spec.zones.slice(0, -1).map((zone) => (
          <g key={`b-${zone.upTo}`}>
            <line
              x1={x(zone.upTo)}
              x2={x(zone.upTo)}
              y1={TRACK_Y - 3}
              y2={TRACK_Y + 15}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <text x={x(zone.upTo)} y={H - 2} textAnchor="middle" fontSize="11" fill="#6b7280">
              {zone.label ?? `${fmtNum(zone.upTo)}${spec.unit}`}
            </text>
          </g>
        ))}
        <circle cx={valueX} cy={TRACK_Y + 6} r="5.5" fill={TONE[valueTone].solid} stroke="white" strokeWidth="2" />
        <text x={labelX} y={12} textAnchor="middle" fontSize="13" fontWeight="700" fill={TONE[valueTone].solid}>
          {fmtNum(spec.value)} {spec.unit}
        </text>
      </svg>
    </figure>
  );
}

/* ───────── แยกส่วนประกอบ ───────── */

function StackChart({ spec }: { spec: Extract<ChartSpec, { kind: "stack" }> }) {
  const total = spec.parts.reduce((sum, p) => sum + Math.max(p.value, 0), 0) || 1;
  return (
    <figure className={`mt-3 ${CHART_WIDTH}`}>
      <div
        className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full"
        role="img"
        aria-label={spec.parts.map((p) => `${p.label} ${p.display}`).join(", ")}
      >
        {spec.parts.map((part, i) => (
          <span
            key={part.label}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${Math.max((Math.max(part.value, 0) / total) * 100, 2)}%`,
              background: TONE[part.tone ?? STACK_TONES[i % STACK_TONES.length]].solid,
            }}
          />
        ))}
      </div>
      <figcaption className="mt-2 space-y-1">
        {spec.parts.map((part, i) => (
          <span key={part.label} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="flex min-w-0 items-center gap-1.5 text-muted">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: TONE[part.tone ?? STACK_TONES[i % STACK_TONES.length]].solid }}
              />
              <span className="truncate">{part.label}</span>
            </span>
            <span className="shrink-0 font-medium text-navy tabular-nums">{part.display}</span>
          </span>
        ))}
        {spec.totalDisplay ? (
          <span className="flex items-center justify-between gap-2 border-t border-steel pt-1 text-[11px]">
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
    <figure className="mt-3">
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
              <span
                key={i}
                className="flex h-6 w-5 items-end overflow-hidden rounded-[3px] border"
                style={{ borderColor: "#d5dbe0", background: "#f7f8f9" }}
              >
                <span
                  className="w-full"
                  style={{ height: `${fill * 100}%`, background: TONE.accent.solid, opacity: fill < 1 ? 0.7 : 1 }}
                />
              </span>
            );
          })}
        </div>
      )}
      {spec.note ? <figcaption className="mt-1.5 text-[11px] text-muted">{spec.note}</figcaption> : null}
    </figure>
  );
}

export function ResultChart({ spec }: { spec: ChartSpec }) {
  if (spec.kind === "steps") return <StepsChart spec={spec} />;
  if (spec.kind === "threshold") return <ThresholdChart spec={spec} />;
  if (spec.kind === "stack") return <StackChart spec={spec} />;
  return <PacksChart spec={spec} />;
}
