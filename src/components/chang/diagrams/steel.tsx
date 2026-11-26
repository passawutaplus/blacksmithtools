"use client";

import { WELD } from "../../../lib/chang/constants";
import { Arrow, Box, C, Circ, Dim, Ground, Ln, Mark, Shape, Svg, Txt, pick, type DiagramProps } from "./primitives";

function iBeam(cx: number, cy: number, w: number, h: number, tf: number, tw: number): string {
  const l = cx - w / 2;
  const r = cx + w / 2;
  const t = cy - h / 2;
  const b = cy + h / 2;
  const wl = cx - tw / 2;
  const wr = cx + tw / 2;
  return `M${l} ${t} H${r} V${t + tf} H${wr} V${b - tf} H${r} V${b} H${l} V${b - tf} H${wl} V${t + tf} H${l} Z`;
}

function sizePair(raw: string, fallback: [string, string]): [string, string] {
  const m = /^(\d+)x(\d+)$/.exec(raw);
  return m ? [m[1], m[2]] : fallback;
}

/** หน้าตัดเหล็กแต่ละรูปพรรณ: ตัวเลขไหนคือระยะไหน (steel/weight, steel/job) */
export function SteelSection({ values }: DiagramProps) {
  const shape = pick(values, "shape", "h");
  const names: Record<string, string> = {
    plate: "เหล็กแผ่น",
    round: "เหล็กกลมตัน",
    pipe: "ท่อกลม",
    h: "H-Beam",
    w: "W / เสา",
    c: "C-Channel",
  };
  const name = names[shape] ?? names.h;
  let section;
  if (shape === "plate") {
    section = (
      <g>
        <Box x={24} y={84} w={140} h={14} />
        <Dim x1={24} y1={64} x2={164} y2={64} ext={20} label="กว้างแผ่น" k="w" />
        <Dim x1={176} y1={84} x2={176} y2={98} ext={12} arrows="in" label="หนา" lx={176} ly={128} anchor="middle" k="t" />
      </g>
    );
  } else if (shape === "round") {
    section = (
      <g>
        <Circ cx={96} cy={92} r={38} />
        <Dim x1={58} y1={92} x2={134} y2={92} label="Ø เหล็กกลม" ly={42} k="d" />
      </g>
    );
  } else if (shape === "pipe") {
    section = (
      <g>
        <Circ cx={96} cy={90} r={40} />
        <Circ cx={96} cy={90} r={31} fill="paper" />
        <Dim x1={56} y1={90} x2={136} y2={90} label="Ø นอกท่อ" ly={40} k="od" />
        <Dim x1={96} y1={121} x2={96} y2={130} arrows="in" label="หนา" lx={104} ly={148} anchor="start" k="t" />
      </g>
    );
  } else if (shape === "c") {
    const size = pick(values, "csize", "100");
    section = (
      <g>
        <Shape d="M70 40 H122 V56 H112 V50 H80 V134 H112 V128 H122 V144 H70 Z" />
        <Dim x1={54} y1={40} x2={54} y2={144} ext={-14} side="b" label={`สูง ${size}`} k="csize" />
      </g>
    );
  } else {
    const isW = shape === "w";
    const [hh, bb] = isW
      ? sizePair(pick(values, "wsize", "150x150"), ["150", "150"])
      : sizePair(pick(values, "hsize", "200x100"), ["200", "100"]);
    const w = isW ? 92 : 58;
    const h = isW ? 92 : 108;
    const cx = 112;
    const cy = 96;
    section = (
      <g>
        <Shape d={iBeam(cx, cy, w, h, 9, 6)} />
        <Dim
          x1={cx - w / 2 - 14}
          y1={cy - h / 2}
          x2={cx - w / 2 - 14}
          y2={cy + h / 2}
          ext={-12}
          side="b"
          label={`สูง ${hh}`}
          k={isW ? "wsize" : "hsize"}
        />
        <Dim
          x1={cx - w / 2}
          y1={cy - h / 2 - 14}
          x2={cx + w / 2}
          y2={cy - h / 2 - 14}
          ext={12}
          label={`กว้างปีก ${bb}`}
          k={isW ? "wsize" : "hsize"}
        />
      </g>
    );
  }
  return (
    <Svg title={`หน้าตัด${name} แสดงว่าตัวเลขขนาดแต่ละตัวคือระยะไหน และความยาวของเส้น`} h={190}>
      {section}
      <Txt x={10} y={180} weight={600} k="shape">
        หน้าตัด {name}
      </Txt>
      {/* ด้านข้าง: ความยาว */}
      <Ln x1={198} y1={20} x2={198} y2={170} line="hair" />
      <Box x={212} y={80} w={116} h={18} />
      <Dim x1={212} y1={118} x2={328} y2={118} ext={-18} side="b" label="ยาว" k="len" />
      <Txt x={270} y={66} anchor="middle" tone="soft">
        มองด้านข้าง
      </Txt>
    </Svg>
  );
}

/** แนวเชื่อมสามแบบ: z คือขาเชื่อม (Fillet) หรือความลึก (V / Square) (steel/weld) */
export function WeldJoint({ values }: DiagramProps) {
  const kind = pick(values, "kind", "fillet");
  const gap = WELD.squareGap.value;
  const tone = (k: string) => (kind === k ? ("rust" as const) : ("soft" as const));
  const name = (k: string, label: string, x: number) => (
    <g>
      <Mark x={x - 34} y={146} on={kind === k} />
      <Txt x={x - 22} y={154} weight={kind === k ? 700 : 500} tone={kind === k ? "ink" : "soft"} k="kind">
        {label}
      </Txt>
    </g>
  );
  return (
    <Svg title="หน้าตัดแนวเชื่อมสามแบบ Fillet วัดขาเชื่อม V-groove และ Square วัดความลึกของร่อง" h={186}>
      {/* Fillet */}
      <Box x={12} y={100} w={92} h={12} />
      <Box x={46} y={34} w={12} h={66} />
      <Shape d="M58 100 L58 78 L80 100 Z" fill="fill2" />
      <Dim x1={58} y1={124} x2={80} y2={124} ext={-10} arrows="in" tone={tone("fillet")} label="z" lx={69} ly={138} k="z" />
      <Dim x1={92} y1={78} x2={92} y2={100} ext={10} arrows="in" tone={tone("fillet")} label="z" lx={99} ly={94} anchor="start" k="z" />
      {name("fillet", "Fillet", 62)}
      <Txt x={58} y={174} anchor="middle" tone={tone("fillet")} weight={600}>
        z = ขาเชื่อม
      </Txt>
      {/* V-groove */}
      <Shape d="M122 78 L157 78 L170 100 L122 100 Z" />
      <Shape d="M218 78 L183 78 L170 100 L218 100 Z" />
      <Shape d="M157 78 L183 78 L170 100 Z" fill="fill2" />
      <Txt x={170} y={66} anchor="middle" tone="soft">
        60°
      </Txt>
      <Dim x1={226} y1={78} x2={226} y2={100} ext={6} arrows="in" tone={tone("v")} label="z" lx={226} ly={126} anchor="middle" k="z" />
      {name("v", "V-groove", 164)}
      <Txt x={170} y={174} anchor="middle" tone={tone("v")} weight={600}>
        z = ลึก
      </Txt>
      {/* Square */}
      <Box x={246} y={78} w={34} h={22} />
      <Box x={288} y={78} w={34} h={22} />
      <Box x={280} y={78} w={8} h={22} fill="fill2" width={1.25} />
      <Txt x={284} y={66} anchor="middle" tone="soft">
        ห่าง {gap} มม.
      </Txt>
      <Dim x1={332} y1={78} x2={332} y2={100} ext={8} arrows="in" tone={tone("sq")} label="z" lx={332} ly={126} anchor="middle" k="z" />
      {name("sq", "Square", 286)}
      <Txt x={284} y={174} anchor="middle" tone={tone("sq")} weight={600}>
        z = ลึก
      </Txt>
    </Svg>
  );
}

/** คานช่วงเดียว โหลดกระจาย ระยะโก่งกลางช่วง (steel/deflection) */
export function BeamDeflection() {
  const arrows = [];
  for (let x = 52; x <= 288; x += 26.2) arrows.push(x);
  return (
    <Svg title="คานวางบนจุดรองรับสองปลาย รับโหลดกระจายตลอดช่วง ระยะโก่งวัดที่กลางช่วงคาน" h={176}>
      <Txt x={170} y={18} anchor="middle" k="w">
        โหลดกระจาย
      </Txt>
      <Ln x1={48} y1={28} x2={292} y2={28} width={1.25} />
      {arrows.map((x) => (
        <Arrow key={x} x1={x} y1={28} x2={x} y2={58} width={1.25} />
      ))}
      <Box x={40} y={60} w={260} h={12} />
      <path d="M48 72 Q170 116 292 72" fill="none" stroke={C.ink} strokeWidth={1.25} strokeDasharray="5 3" />
      <Shape d="M48 72 L38 90 L58 90 Z" fill="paper" />
      <Shape d="M292 72 L282 90 L302 90 Z" fill="paper" />
      <Ground x1={30} x2={66} y={90} />
      <Ground x1={274} x2={310} y={90} />
      <Dim x1={170} y1={72} x2={170} y2={94} label="ระยะโก่ง" lx={180} ly={112} anchor="start" />
      <Dim x1={48} y1={128} x2={292} y2={128} ext={-32} side="b" label="ช่วงคาน L" k="L" />
      <Txt x={170} y={168} anchor="middle" tone="soft">
        ระยะโก่งต้องไม่เกิน L/360 หรือ L/240
      </Txt>
    </Svg>
  );
}

/** แผนตัด: ทุกรอยตัดกินเนื้อเหล็กเท่าความหนาใบตัด (steel/cut) */
export function CutPlan() {
  const piece = (x: number, w: number, label: string) => (
    <g>
      <Box x={x} y={52} w={w} h={26} />
      <Txt x={x + w / 2} y={70} anchor="middle" halo={false}>
        {label}
      </Txt>
    </g>
  );
  const kerf = (x: number) => <rect x={x} y={51} width={6} height={28} fill={C.ink} />;
  return (
    <Svg title="เหล็กหนึ่งเส้นแบ่งเป็นชิ้นงาน ระหว่างชิ้นมีระยะเผื่อตัดเท่าความหนาใบตัด ส่วนที่เหลือปลายเส้นคือเศษ" h={136}>
      {piece(14, 96, "ชิ้น 1")}
      {kerf(110)}
      {piece(116, 96, "ชิ้น 2")}
      {kerf(212)}
      {piece(218, 64, "ชิ้น 3")}
      {kerf(282)}
      <Box x={288} y={52} w={38} h={26} fill="hatch" />
      <Txt x={307} y={70} anchor="middle">
        เศษ
      </Txt>
      <Dim x1={14} y1={28} x2={326} y2={28} ext={24} label="ยาววัตถุดิบ" k="stock" />
      <Dim x1={110} y1={94} x2={116} y2={94} ext={-14} arrows="in" k="kerf" />
      <Txt x={113} y={116} anchor="middle" tone="rust" weight={600} k="kerf">
        เผื่อตัด = หนาใบตัด
      </Txt>
      <Txt x={326} y={116} anchor="end" tone="soft">
        ตัดทุกครั้งเสียเท่านี้
      </Txt>
    </Svg>
  );
}
