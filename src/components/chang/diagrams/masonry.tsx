"use client";

import { MASONRY } from "../../../lib/chang/constants";
import { Box, C, Clipped, Dim, Ground, Leader, Ln, Svg, Txt, pick, type DiagramProps } from "./primitives";

function Courses({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const lines = [];
  const course = 10;
  const brick = 26;
  for (let r = 0; r * course < h; r++) {
    const yy = y + r * course;
    lines.push(<line key={`h${r}`} x1={x} y1={yy} x2={x + w} y2={yy} stroke={C.hair} strokeWidth={0.7} />);
    for (let xx = x + (r % 2 ? brick / 2 : 0); xx < x + w; xx += brick) {
      lines.push(<line key={`v${r}-${xx}`} x1={xx} y1={yy} x2={xx} y2={yy + course} stroke={C.hair} strokeWidth={0.7} />);
    }
  }
  return (
    <Clipped x={x} y={y} w={w} h={h}>
      {lines}
    </Clipped>
  );
}

/** ผนัง: กว้าง × สูง หักช่องประตูหน้าต่าง + ความหนาปูนก่อ (masonry/brick, masonry/mortar, masonry/job) */
export function BrickWall() {
  return (
    <Svg title="ผนังก่ออิฐ แสดงความกว้างผนัง ความสูงผนัง ช่องประตูหน้าต่างที่ต้องหักออก และความหนาปูนก่อระหว่างก้อนอิฐ" h={200}>
      <Box x={72} y={34} w={170} h={126} fill="paper" line="none" />
      <Courses x={72} y={34} w={170} h={126} />
      <Box x={72} y={34} w={170} h={126} fill="none" />
      {/* ช่องเปิด */}
      <Box x={90} y={62} w={46} h={38} fill="paper" />
      <Ln x1={90} y1={62} x2={136} y2={100} line="hair" />
      <Ln x1={136} y1={62} x2={90} y2={100} line="hair" />
      <Box x={176} y={90} w={38} h={70} fill="paper" />
      <Ln x1={176} y1={90} x2={214} y2={160} line="hair" />
      <Ln x1={214} y1={90} x2={176} y2={160} line="hair" />
      <Ground x1={60} x2={254} y={160} />
      <Txt x={72} y={20} k="open">
        หักประตู/หน้าต่าง
      </Txt>
      <Leader x1={112} y1={25} x2={112} y2={70} tone="ink" />
      <Leader x1={170} y1={25} x2={194} y2={100} tone="ink" />
      <Dim x1={72} y1={178} x2={242} y2={178} ext={-14} side="b" label="กว้างผนัง" k="w" />
      <Dim x1={58} y1={34} x2={58} y2={160} ext={-10} side="b" label="สูงผนัง" k="h" />
      {/* ความหนาปูนก่อ */}
      <Box x={262} y={92} w={52} h={22} />
      <Box x={262} y={124} w={52} h={22} />
      <Box x={262} y={114} w={52} h={10} fill="dots" width={1} />
      <Dim x1={326} y1={114} x2={326} y2={124} ext={10} arrows="in" k="joint" />
      <Txt x={258} y={62} tone="rust" weight={600} k="joint">
        ความหนา
      </Txt>
      <Txt x={258} y={80} tone="rust" weight={600} k="joint">
        ปูนก่อ
      </Txt>
    </Svg>
  );
}

/** ทับหลัง: กว้างช่อง + ระยะฝังเข้าผนังสองข้าง (masonry/lintel) */
export function Lintel() {
  const bearingCm = Math.round(MASONRY.lintelBearing.value * 100);
  return (
    <Svg title={`ทับหลังเหนือช่องเปิด ยาวกว่าช่องเปิดโดยฝังเข้าผนังข้างละ ${bearingCm} เซนติเมตร`} h={198}>
      <Box x={20} y={52} w={300} h={128} />
      <Box x={110} y={94} w={120} h={86} fill="paper" />
      <rect x={111.5} y={170} width={117} height={12} fill={C.paper} />
      <Box x={80} y={78} w={180} h={16} fill="fill2" />
      <Ground x1={10} x2={330} y={180} />
      <Txt x={270} y={91} halo={C.fill}>
        ทับหลัง
      </Txt>
      <Dim x1={80} y1={38} x2={110} y2={38} ext={40} />
      <Dim x1={230} y1={38} x2={260} y2={38} ext={40} />
      <Txt x={170} y={24} anchor="middle" tone="rust" weight={600}>
        ฝังเข้าผนัง ข้างละ {bearingCm} ซม.
      </Txt>
      <Dim x1={110} y1={132} x2={230} y2={132} label="กว้างช่อง" k="width" />
    </Svg>
  );
}

const PLASTER_MM: Record<string, number> = {
  normal: MASONRY.plasterThickNormal.value,
  thin: MASONRY.plasterThickThin.value,
  skim: MASONRY.plasterThickSkim.value,
};

/** หน้าตัดผนัง: ชั้นปูนฉาบด้านเดียว/สองด้าน และความหนาฉาบ (masonry/plaster) */
export function Plaster({ values }: DiagramProps) {
  const kind = pick(values, "pkind", "normal");
  const mm = PLASTER_MM[kind] ?? PLASTER_MM.normal;
  const sides = Number(values.sides) >= 2 ? 2 : 1;
  return (
    <Svg title={`หน้าตัดผนังมองจากด้านบน ปูนฉาบหนา ${mm} มิลลิเมตร ฉาบ ${sides} ด้าน`} h={164}>
      <Box x={24} y={70} w={270} h={40} fill="hatch" />
      <Txt x={159} y={95} anchor="middle">
        ผนังอิฐ
      </Txt>
      <Box x={24} y={58} w={270} h={12} fill="dots" width={1.25} />
      <Box x={24} y={110} w={270} h={12} fill={sides === 2 ? "dots" : "none"} line={sides === 2 ? "ink" : "dash"} width={1.25} />
      <Dim x1={306} y1={58} x2={306} y2={70} ext={10} arrows="in" k="pkind" />
      <Txt x={316} y={30} anchor="end" tone="rust" weight={600} k="pkind">
        หนาฉาบ {mm} มม.
      </Txt>
      <Txt x={24} y={48} k="sides">
        ปูนฉาบ ด้านที่ 1
      </Txt>
      <Txt x={24} y={142} tone={sides === 2 ? "ink" : "soft"} k="sides">
        {sides === 2 ? "ปูนฉาบ ด้านที่ 2" : "ด้านที่ 2 (ยังไม่ได้นับ)"}
      </Txt>
      <Txt x={316} y={158} anchor="end" tone="soft">
        หน้าตัดผนัง มองจากบน
      </Txt>
    </Svg>
  );
}

const MIX_PARTS: Record<string, [number, number, number]> = {
  "124": [1, 2, 4],
  "112": [1, 1, 2],
  "136": [1, 3, 6],
};

/** สัดส่วนผสมโดยปริมาตร: ตวงด้วยภาชนะใบเดียวกัน (masonry/mix) */
export function ConcreteMix({ values }: DiagramProps) {
  const parts = MIX_PARTS[pick(values, "ratio", "124")] ?? MIX_PARTS["124"];
  const rows = [
    { name: "ปูนซีเมนต์", n: parts[0], fill: "fill2" as const },
    { name: "ทราย", n: parts[1], fill: "dots" as const },
    { name: "หิน", n: parts[2], fill: "hatch" as const },
  ];
  return (
    <Svg title={`สัดส่วนผสมคอนกรีตโดยปริมาตร ปูน ${parts[0]} ส่วน ทราย ${parts[1]} ส่วน หิน ${parts[2]} ส่วน ตวงด้วยภาชนะใบเดียวกัน`} h={178}>
      {rows.map((row, r) => {
        const y = 14 + r * 46;
        return (
          <g key={row.name}>
            <Txt x={10} y={y + 14}>
              {row.name}
            </Txt>
            <Txt x={10} y={y + 32} tone="rust" weight={600} k="ratio">
              {row.n} ส่วน
            </Txt>
            {Array.from({ length: row.n }, (_, i) => (
              <Box key={i} x={100 + i * 38} y={y} w={32} h={32} fill={row.fill} />
            ))}
          </g>
        );
      })}
      <Ln x1={10} y1={150} x2={330} y2={150} line="hair" />
      <Txt x={10} y={170} tone="soft">
        1 ช่อง = 1 ถังตวง ใช้ถังใบเดียวกันทุกอย่าง
      </Txt>
    </Svg>
  );
}
