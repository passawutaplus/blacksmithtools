"use client";

import { createContext, useContext, useId, type ReactNode } from "react";

/**
 * ชิ้นส่วนกลางของภาพประกอบผู้ช่วยงานช่าง — ทุกภาพต้องวาดจากชุดนี้เพื่อให้ออกมาเป็นตระกูลเดียวกัน
 *
 * กติกาเส้น (แบบสเปกชีต/แบบวิศวกรรม):
 * - เส้นวัตถุ: navy 1.75 หน่วย มุมเหลี่ยม ไม่มีเงา ไม่มีไล่สี
 * - เส้นรอง/เส้นซ่อน: เทา เส้นเดียวบาง ๆ
 * - สีสนิม ใช้ "เฉพาะ" ระยะที่กำลังอธิบาย (เส้นบอกระยะ หัวลูกศร และป้ายของมัน)
 * - พื้นวัตถุตัน: เทาเหล็กอ่อน
 *
 * พิกัดออกแบบบนความกว้าง 340 หน่วย: จอ 360 px ภาพกว้างราว 326 px ตัวหนังสือ 13 หน่วยจึงยังได้ ≥ 12 px
 */
export const C = {
  ink: "#253641",
  soft: "#55626c",
  hair: "#98a3ab",
  fill: "#e8ecef",
  fill2: "#cfd7dd",
  rust: "#C14D35",
  rustTint: "#f6ddd6",
  paper: "#ffffff",
} as const;

export const W = 340;
export const FONT = 13;
const STROKE = 1.75;

/** คีย์ของช่องกรอกที่กำลังโฟกัสอยู่ — ToolDiagram เป็นคนป้อน ภาพใช้เน้นระยะที่ตรงกับช่องนั้น */
export const ActiveFieldContext = createContext<string | null>(null);
const UidContext = createContext<string>("d");

function isActive(active: string | null, k: string | string[] | undefined): boolean {
  if (!active || !k) return false;
  return Array.isArray(k) ? k.includes(active) : k === active;
}

/** กรอบ SVG ของทุกภาพ: viewBox, role="img", <title> ภาษาไทย และลายแรเงาที่ใช้ร่วมกัน */
export function Svg({ title, h, w = W, children }: { title: string; h: number; w?: number; children: ReactNode }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-labelledby={`${uid}-title`}
      className="block h-auto w-full"
      fill="none"
      fontFamily="inherit"
      fontSize={FONT}
      strokeLinecap="butt"
      strokeLinejoin="miter"
    >
      <title id={`${uid}-title`}>{title}</title>
      <defs>
        <pattern id={`${uid}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={C.hair} strokeWidth="1" />
        </pattern>
        <pattern id={`${uid}-dots`} width="7" height="7" patternUnits="userSpaceOnUse">
          <rect x="1" y="1" width="1.2" height="1.2" fill={C.hair} />
          <rect x="4.5" y="4.5" width="1.2" height="1.2" fill={C.hair} />
        </pattern>
      </defs>
      <UidContext.Provider value={uid}>{children}</UidContext.Provider>
    </svg>
  );
}

type Tone = "ink" | "soft" | "rust";
const TONE: Record<Tone, string> = { ink: C.ink, soft: C.soft, rust: C.rust };

/** ป้ายข้อความ มีขอบขาวรองหลังตัวหนังสือ (knockout) ให้อ่านออกเมื่อทับเส้น */
export function Txt({
  x,
  y,
  children,
  anchor = "start",
  tone = "ink",
  size = FONT,
  weight = 500,
  halo = C.paper,
  k,
}: {
  x: number;
  y: number;
  children: ReactNode;
  anchor?: "start" | "middle" | "end";
  tone?: Tone;
  size?: number;
  weight?: number;
  /** สีขอบรองหลังตัวหนังสือ — ใส่ false ถ้าไม่ต้องการ */
  halo?: string | false;
  /** คีย์ช่องกรอกที่ป้ายนี้อธิบาย (เน้นเมื่อช่องนั้นถูกโฟกัส) */
  k?: string | string[];
}) {
  const active = isActive(useContext(ActiveFieldContext), k);
  const haloColor = active ? C.rustTint : halo;
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fill={TONE[tone]}
      fontSize={size}
      fontWeight={active ? 700 : weight}
      stroke={haloColor || undefined}
      strokeWidth={haloColor ? (active ? 6 : 3.5) : undefined}
      strokeLinejoin="round"
      paintOrder="stroke"
    >
      {children}
    </text>
  );
}

function arrowHead(x: number, y: number, ux: number, uy: number, size = 7, half = 2.6): string {
  // ปลายแหลมอยู่ที่ (x, y) ชี้ไปทาง (ux, uy)
  const bx = x - ux * size;
  const by = y - uy * size;
  return `${x},${y} ${bx - uy * half},${by + ux * half} ${bx + uy * half},${by - ux * half}`;
}

/**
 * เส้นบอกระยะ: เส้นบาง + หัวลูกศรสองปลาย + เส้นฉาย (ext) + ป้าย
 * - ext: ยาวเส้นฉายจากปลายเส้นบอกระยะกลับไปหาวัตถุ — เส้นนอนซ้าย→ขวา ค่าบวกชี้ลง · เส้นตั้งบน→ล่าง ค่าบวกชี้ซ้าย
 * - side: "a" = ป้ายอยู่เหนือเส้น (เส้นนอน) หรือขวาเส้น (เส้นตั้ง) · "b" = ฝั่งตรงข้าม
 * - k: คีย์ช่องกรอกที่ระยะนี้ตรงกับมัน
 * - arrows="in": ใช้กับระยะแคบ หัวลูกศรชี้เข้าหากันจากด้านนอก
 */
export function Dim({
  x1,
  y1,
  x2,
  y2,
  label,
  k,
  ext = 0,
  side = "a",
  tone = "rust",
  lx,
  ly,
  anchor,
  arrows = "both",
  size = FONT,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: ReactNode;
  k?: string | string[];
  ext?: number | [number, number];
  side?: "a" | "b";
  tone?: "rust" | "soft";
  lx?: number;
  ly?: number;
  anchor?: "start" | "middle" | "end";
  /** "in" = ระยะแคบ: ลูกศรชี้เข้าหากันจากด้านนอก (ร่อง รอยต่อ ความหนา) */
  arrows?: "both" | "none" | "start" | "end" | "in";
  size?: number;
}) {
  const active = isActive(useContext(ActiveFieldContext), k);
  const color = tone === "rust" ? C.rust : C.soft;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const [e1, e2] = Array.isArray(ext) ? ext : [ext, ext];
  const vertical = Math.abs(dx) < Math.abs(dy);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const tx = lx ?? (vertical ? mx + (side === "a" ? 6 : -6) : mx);
  const ty = ly ?? (vertical ? my + size * 0.35 : my + (side === "a" ? -5 : size + 3));
  const ta = anchor ?? (vertical ? (side === "a" ? "start" : "end") : "middle");
  const sw = active ? 2.4 : 1.25;
  const extLine = (x: number, y: number, e: number) =>
    e ? (
      <line
        x1={x - nx * Math.sign(e) * 3}
        y1={y - ny * Math.sign(e) * 3}
        x2={x + nx * e}
        y2={y + ny * e}
        stroke={color}
        strokeWidth={0.9}
      />
    ) : null;
  return (
    <g>
      {extLine(x1, y1, e1)}
      {extLine(x2, y2, e2)}
      {arrows === "in" ? (
        <>
          <line x1={x1 - ux * 14} y1={y1 - uy * 14} x2={x1} y2={y1} stroke={color} strokeWidth={sw} />
          <line x1={x2} y1={y2} x2={x2 + ux * 14} y2={y2 + uy * 14} stroke={color} strokeWidth={sw} />
          <polygon points={arrowHead(x1, y1, ux, uy)} fill={color} />
          <polygon points={arrowHead(x2, y2, -ux, -uy)} fill={color} />
        </>
      ) : (
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={sw} />
      )}
      {arrows === "both" || arrows === "start" ? <polygon points={arrowHead(x1, y1, -ux, -uy)} fill={color} /> : null}
      {arrows === "both" || arrows === "end" ? <polygon points={arrowHead(x2, y2, ux, uy)} fill={color} /> : null}
      {label != null ? (
        <Txt x={tx} y={ty} anchor={ta} tone={tone} weight={600} size={size} k={k}>
          {label}
        </Txt>
      ) : null}
    </g>
  );
}

/** ลูกศรทิศทาง (ทิศน้ำไหล แรง แดด) — ไม่ใช่เส้นบอกระยะ */
export function Arrow({
  x1,
  y1,
  x2,
  y2,
  tone = "ink",
  width = 1.5,
  dash,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tone?: Tone | "hair";
  width?: number;
  dash?: string;
}) {
  const color = tone === "hair" ? C.hair : TONE[tone];
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2 - ux * 5} y2={y2 - uy * 5} stroke={color} strokeWidth={width} strokeDasharray={dash} />
      <polygon points={arrowHead(x2, y2, ux, uy, 7, 3)} fill={color} />
    </g>
  );
}

/** เส้นชี้จากป้ายไปยังจุดบนวัตถุ ปลายเป็นจุดเหลี่ยมเล็ก */
export function Leader({
  x1,
  y1,
  x2,
  y2,
  tone = "soft",
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tone?: Tone;
}) {
  const color = TONE[tone];
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={0.9} />
      <rect x={x2 - 1.75} y={y2 - 1.75} width={3.5} height={3.5} fill={color} />
    </g>
  );
}

type ShapeProps = {
  /** "fill" = วัตถุตัน · "fill2" = เทาเข้มขึ้นหนึ่งขั้น · "hatch" = หน้าตัดปูน/ผนัง · "dots" = เนื้อปูน/ทราย · "none" */
  fill?: "fill" | "fill2" | "hatch" | "dots" | "none" | "paper";
  /** "hair" = เส้นรองสีเทา · "dash" = เส้นซ่อน/แนวอ้างอิง */
  line?: "ink" | "hair" | "dash" | "none" | "rust";
  width?: number;
};

function useShapeStyle({ fill = "fill", line = "ink", width }: ShapeProps) {
  const uid = useContext(UidContext);
  const fillValue =
    fill === "none"
      ? "none"
      : fill === "paper"
        ? C.paper
        : fill === "hatch"
          ? `url(#${uid}-hatch)`
          : fill === "dots"
            ? `url(#${uid}-dots)`
            : C[fill];
  const stroke = line === "none" ? "none" : line === "ink" ? C.ink : line === "rust" ? C.rust : C.hair;
  return {
    fill: fillValue,
    stroke,
    strokeWidth: width ?? (line === "ink" || line === "rust" ? STROKE : 1),
    strokeDasharray: line === "dash" ? "4 3" : undefined,
  };
}

export function Box({ x, y, w, h, ...style }: { x: number; y: number; w: number; h: number } & ShapeProps) {
  return <rect x={x} y={y} width={w} height={h} {...useShapeStyle(style)} />;
}

export function Shape({ d, ...style }: { d: string } & ShapeProps) {
  return <path d={d} {...useShapeStyle(style)} />;
}

export function Circ({ cx, cy, r, ...style }: { cx: number; cy: number; r: number } & ShapeProps) {
  return <circle cx={cx} cy={cy} r={r} {...useShapeStyle(style)} />;
}

export function Ellipse({
  cx,
  cy,
  rx,
  ry,
  ...style
}: { cx: number; cy: number; rx: number; ry: number } & ShapeProps) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} {...useShapeStyle(style)} />;
}

/** ตัดขอบชิ้นงานข้างในให้อยู่ในกรอบสี่เหลี่ยม (เช่น ลายกระเบื้องในห้อง แนวอิฐในผนัง) */
export function Clipped({
  x,
  y,
  w,
  h,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  children: ReactNode;
}) {
  const id = `clip-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <g>
      <clipPath id={id}>
        <rect x={x} y={y} width={w} height={h} />
      </clipPath>
      <g clipPath={`url(#${id})`}>{children}</g>
    </g>
  );
}

/** ช่องเลือกแบบสเปกชีต: สี่เหลี่ยมทึบสีสนิม = ตัวเลือกที่เลือกอยู่ · กรอบเทา = ตัวเลือกอื่น */
export function Mark({ x, y, on }: { x: number; y: number; on: boolean }) {
  return on ? (
    <rect x={x} y={y} width={8} height={8} fill={C.rust} />
  ) : (
    <rect x={x + 0.5} y={y + 0.5} width={7} height={7} fill="none" stroke={C.hair} strokeWidth={1} />
  );
}

/** เส้นตรงเดี่ยว: เส้นวัตถุ (ink) เส้นรอง (hair) หรือเส้นประ (dash) */
export function Ln({
  x1,
  y1,
  x2,
  y2,
  line = "ink",
  width,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  line?: "ink" | "hair" | "dash" | "rust";
  width?: number;
}) {
  const stroke = line === "ink" ? C.ink : line === "rust" ? C.rust : C.hair;
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={stroke}
      strokeWidth={width ?? (line === "ink" || line === "rust" ? STROKE : 1)}
      strokeDasharray={line === "dash" ? "4 3" : undefined}
    />
  );
}

/** แนวพื้น/ผนังอ้างอิง: เส้นหนาหนึ่งเส้นกับขีดเฉียงใต้เส้น */
export function Ground({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  const ticks: ReactNode[] = [];
  for (let x = x1 + 4; x < x2; x += 9) {
    ticks.push(<line key={x} x1={x} y1={y} x2={x - 5} y2={y + 6} stroke={C.hair} strokeWidth={1} />);
  }
  return (
    <g>
      {ticks}
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={C.ink} strokeWidth={STROKE} />
    </g>
  );
}

export type DiagramProps = {
  /** ค่าที่ผู้ใช้กรอกอยู่ — ใช้เลือกรูปย่อยให้ตรงตัวเลือก (เช่น รูปทรง ลายปู ชนิดแนวเชื่อม) ห้ามเอาไปคำนวณซ้ำ */
  values: Record<string, string | number | boolean>;
};

export function pick(values: DiagramProps["values"], key: string, fallback: string): string {
  const v = values[key];
  return typeof v === "string" && v ? v : fallback;
}
