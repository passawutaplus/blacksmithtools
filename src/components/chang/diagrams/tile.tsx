"use client";

import { TILE_WASTE } from "../../../lib/chang/constants";
import { Box, C, Clipped, Dim, Ground, Ln, Shape, Svg, Txt, pick, type DiagramProps } from "./primitives";

type Pt = [number, number];

const ROOM = { x: 104, y: 30, w: 200, h: 146 };

function straight(s: number, shift: boolean): Pt[][] {
  const out: Pt[][] = [];
  for (let r = 0; r < 5; r++) {
    const off = shift && r % 2 === 1 ? -s / 2 : 0;
    for (let c = 0; c < 7; c++) {
      const x = ROOM.x + off + c * s;
      const y = ROOM.y + r * s;
      out.push([
        [x, y],
        [x + s, y],
        [x + s, y + s],
        [x, y + s],
      ]);
    }
  }
  return out;
}

function diagonal(s: number): Pt[][] {
  const out: Pt[][] = [];
  const d = s / Math.SQRT2;
  const cx = ROOM.x + ROOM.w / 2;
  const cy = ROOM.y + ROOM.h / 2;
  for (let i = -6; i <= 6; i++) {
    for (let j = -6; j <= 6; j++) {
      const x = cx + (i - j) * d;
      const y = cy + (i + j) * d;
      out.push([
        [x, y - d],
        [x + d, y],
        [x, y + d],
        [x - d, y],
      ]);
    }
  }
  return out;
}

function herringbone(s: number): Pt[][] {
  // แผ่น 2:1 วางสลับตั้ง-นอนเป็นขั้นบันได: แถว i มีแผ่นนอนที่คอลัมน์ i และแผ่นตั้งที่คอลัมน์ i−1 ซ้ำทุก 4 คอลัมน์
  const out: Pt[][] = [];
  const rect = (c: number, r: number, w: number, h: number): Pt[] => {
    const x = ROOM.x + c * s;
    const y = ROOM.y + r * s;
    return [
      [x, y],
      [x + w * s, y],
      [x + w * s, y + h * s],
      [x, y + h * s],
    ];
  };
  for (let i = -2; i < 9; i++) {
    for (let k = -3; k < 4; k++) {
      out.push(rect(i + 4 * k, i, 2, 1));
      out.push(rect(i - 1 + 4 * k, i, 1, 2));
    }
  }
  return out;
}

const PATTERN_NAME: Record<string, string> = {
  straight: "ลายตรง",
  brick: "สลับครึ่ง",
  diag: "ทะแยง",
  herring: "ก้างปลา",
};

/** ผังห้องกับลายปู แผ่นริมห้องที่ต้องตัดคือที่มาของ "เผื่อเสีย" (tile/qty, tile/job) */
export function TileLayout({ values }: DiagramProps) {
  const raw = pick(values, "pattern", "straight");
  const pattern = raw in PATTERN_NAME ? raw : "straight";
  const tiles =
    pattern === "diag"
      ? diagonal(44)
      : pattern === "herring"
        ? herringbone(24)
        : straight(44, pattern === "brick");
  const { x, y, w, h } = ROOM;
  const inside = ([px, py]: Pt) => px >= x - 0.5 && px <= x + w + 0.5 && py >= y - 0.5 && py <= y + h + 0.5;
  const touches = (t: Pt[]) => {
    const xs = t.map((p) => p[0]);
    const ys = t.map((p) => p[1]);
    return Math.max(...xs) > x && Math.min(...xs) < x + w && Math.max(...ys) > y && Math.min(...ys) < y + h;
  };
  const shown = tiles.filter(touches);
  const waste = raw === "custom" ? "กำหนดเผื่อเสียเอง" : `${PATTERN_NAME[pattern]} เผื่อเสีย +${TILE_WASTE[pattern].value}%`;
  return (
    <Svg title={`ผังห้องปูกระเบื้อง${PATTERN_NAME[pattern]} แผ่นริมห้องที่แรเงาคือแผ่นที่ต้องตัด`} h={212}>
      <Clipped x={x} y={y} w={w} h={h}>
        <rect x={x} y={y} width={w} height={h} fill={C.fill2} />
        {shown.map((t, i) => (
          <polygon
            key={i}
            points={t.map((p) => p.join(",")).join(" ")}
            fill={t.every(inside) ? C.paper : C.fill}
            stroke={C.soft}
            strokeWidth={1.25}
          />
        ))}
      </Clipped>
      <Box x={x} y={y} w={w} h={h} fill="none" />
      <Txt x={x} y={18} weight={600} k={["pattern", "waste"]}>
        {waste}
      </Txt>
      <Dim x1={x} y1={190} x2={x + w} y2={190} ext={-12} side="b" label="ยาวห้อง" k="l" />
      <Dim x1={90} y1={y} x2={90} y2={y + h} ext={-12} side="b" label="กว้างห้อง" k="w" />
      <Box x={6} y={186} w={12} h={12} width={1} line="hair" />
      <Txt x={24} y={197} tone="soft">
        = แผ่นตัด
      </Txt>
    </Svg>
  );
}

/** ร่องยาแนว (กว้าง) กับหนาแผ่น (ลึก) (tile/grout) */
export function GroutJoint() {
  return (
    <Svg title="ร่องยาแนวมองจากด้านบนและหน้าตัด ความกว้างร่องคือร่องยาแนว ความลึกร่องเท่ากับความหนาแผ่น" h={186}>
      {/* มองจากบน */}
      <Box x={16} y={44} w={62} h={50} />
      <Box x={88} y={44} w={62} h={50} />
      <Box x={16} y={104} w={62} h={50} />
      <Box x={88} y={104} w={62} h={50} />
      <Dim x1={78} y1={28} x2={88} y2={28} ext={14} arrows="in" label="ร่องยาแนว" lx={108} ly={22} anchor="start" k="joint" />
      <Txt x={83} y={176} anchor="middle" tone="soft">
        มองจากบน
      </Txt>
      {/* หน้าตัด */}
      <Ln x1={182} y1={20} x2={182} y2={180} line="hair" />
      <Box x={198} y={76} w={52} h={24} />
      <Box x={260} y={76} w={52} h={24} />
      <Box x={250} y={76} w={10} h={24} fill="fill2" width={1.25} />
      <Box x={198} y={100} w={114} h={10} fill="dots" width={1.25} />
      <Ground x1={192} x2={318} y={110} />
      <Dim x1={250} y1={62} x2={260} y2={62} ext={12} arrows="in" label="ร่องยาแนว" lx={255} ly={48} k="joint" />
      <Dim x1={326} y1={76} x2={326} y2={100} ext={12} arrows="in" label="หนาแผ่น" lx={334} ly={138} anchor="end" k="thick" />
      <Txt x={255} y={176} anchor="middle" tone="soft">
        หน้าตัด
      </Txt>
    </Svg>
  );
}

/** เกรียงหวี: ขนาดร่องฟันกำหนดปริมาณปูนกาว (tile/adhesive) */
export function TrowelNotch({ values }: DiagramProps) {
  const size = pick(values, "trowel", "10");
  const ridges = [0, 1, 2, 3, 4];
  return (
    <Svg title={`เกรียงหวีร่องฟัน ${size} มิลลิเมตร ปาดปูนกาวเป็นสัน แล้วกดกระเบื้องให้ปูนแผ่เต็มหลังแผ่น`} h={168}>
      {/* เกรียงหวี */}
      <Shape d="M20 14 H174 V52 H160 V38 H146 V52 H132 V38 H118 V52 H104 V38 H90 V52 H76 V38 H62 V52 H48 V38 H34 V52 H20 Z" />
      <Txt x={97} y={31} anchor="middle" halo={false}>
        เกรียงหวี
      </Txt>
      <Dim x1={34} y1={62} x2={48} y2={62} ext={-12} arrows="in" label={`ร่องฟัน ${size} มม.`} lx={68} ly={66} anchor="start" k="trowel" />
      {/* สันปูนกาว */}
      {ridges.map((i) => (
        <Box key={i} x={34 + i * 28} y={98} w={14} h={14} fill="dots" width={1.25} />
      ))}
      {/* กระเบื้องที่กดแล้ว */}
      <Box x={196} y={84} w={130} h={14} />
      <Box x={196} y={98} w={130} h={14} fill="dots" width={1.25} />
      <Txt x={261} y={76} anchor="middle">
        กระเบื้อง
      </Txt>
      {/* พื้น */}
      <Box x={14} y={112} w={312} h={18} fill="hatch" />
      <Txt x={97} y={152} anchor="middle" tone="soft">
        ปาดแล้วได้สันปูน
      </Txt>
      <Txt x={261} y={152} anchor="middle" tone="soft">
        กดแผ่นแล้วปูนแผ่เต็ม
      </Txt>
    </Svg>
  );
}
