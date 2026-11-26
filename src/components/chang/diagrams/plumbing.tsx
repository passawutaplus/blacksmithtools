"use client";

import { Arrow, Box, Circ, Dim, Ground, Leader, Ln, Shape, Svg, Txt, type DiagramProps } from "./primitives";

/** เฮดรวม = ความสูงที่ส่งจริง + แรงเสียดทานในท่อ (plumbing/pump) */
export function PumpHead() {
  return (
    <Svg title="ปั๊มสูบน้ำจากถังเก็บขึ้นไปยังจุดจ่ายน้ำสูงสุด ความสูงที่ส่งวัดจากระดับน้ำในถังถึงจุดจ่ายสูงสุด" h={218}>
      <Ground x1={0} x2={340} y={180} />
      {/* ถังเก็บ */}
      <Box x={12} y={112} w={62} h={68} fill="paper" />
      <Box x={13} y={132} w={60} h={47} line="none" />
      <Ln x1={12} y1={132} x2={74} y2={132} line="hair" />
      <Txt x={43} y={162} anchor="middle" halo={false}>
        ถังเก็บ
      </Txt>
      <Ln x1={74} y1={132} x2={316} y2={132} line="dash" />
      <Txt x={82} y={126} tone="soft">
        ระดับน้ำ
      </Txt>
      {/* ปั๊ม + ท่อ */}
      <Ln x1={74} y1={170} x2={98} y2={170} width={2.5} />
      <Box x={98} y={158} w={30} h={22} />
      <Circ cx={113} cy={169} r={7} fill="paper" width={1.25} />
      <Txt x={113} y={152} anchor="middle">
        ปั๊ม
      </Txt>
      <Shape d="M128 170 L196 170 L196 44 L250 44" fill="none" width={2.5} />
      <Arrow x1={250} y1={44} x2={250} y2={66} />
      <Txt x={206} y={30}>
        จุดจ่ายน้ำสูงสุด
      </Txt>
      <Arrow x1={140} y1={162} x2={184} y2={162} />
      <Txt x={186} y={152} anchor="end" k="q">
        อัตราไหล
      </Txt>
      <Leader x1={212} y1={112} x2={197} y2={104} />
      <Txt x={206} y={120} tone="soft">
        เสียดทานในท่อ
      </Txt>
      {/* ความสูงที่ส่ง */}
      <Dim x1={316} y1={44} x2={316} y2={132} ext={[62, 0]} side="b" label="ความสูงที่ส่ง" ly={84} k="h" />
      <Txt x={10} y={208} k="h">
        เฮดรวม = ความสูงที่ส่ง + เสียดทานในท่อ
      </Txt>
    </Svg>
  );
}

/** ความลาดท่อ: ตกกี่เซนติเมตรต่อความยาว 1 เมตร (plumbing/slope) */
export function DrainSlope({ values }: DiagramProps) {
  const ratio = Number(values.ratio) > 0 ? Number(values.ratio) : 50;
  const cmPerM = Number((100 / ratio).toFixed(2));
  return (
    <Svg title={`ท่อน้ำทิ้งวางลาดเอียง ความลาด 1 ต่อ ${ratio} คือตก ${cmPerM} เซนติเมตรทุกความยาว 1 เมตร`} h={186}>
      <Ln x1={30} y1={52} x2={308} y2={52} line="dash" />
      <Shape d="M30 52 L296 88 L296 100 L30 64 Z" />
      <Arrow x1={110} y1={86} x2={170} y2={94} />
      <Txt x={104} y={92} anchor="end" tone="soft">
        น้ำไหล
      </Txt>
      <Dim x1={30} y1={28} x2={296} y2={28} ext={[20, 56]} label="ความยาวท่อ" k="len" />
      <Dim x1={308} y1={52} x2={308} y2={88} ext={8} label="ตก" />
      <Ln x1={10} y1={114} x2={330} y2={114} line="hair" />
      <Txt x={10} y={164} size={17} weight={700} k="ratio">
        1:{ratio}
      </Txt>
      <Shape d="M84 150 L224 150 L224 172 Z" />
      <Dim x1={84} y1={142} x2={224} y2={142} tone="soft" label="ทุก 1 ม." ly={134} />
      <Dim x1={232} y1={150} x2={232} y2={172} label={`ตก ${cmPerM} ซม.`} k="ratio" />
    </Svg>
  );
}

/** ขนาดถัง = น้ำที่ใช้ต่อวัน × จำนวนวันสำรอง (plumbing/tank) */
export function TankSizing() {
  return (
    <Svg title="ถังเก็บน้ำแบ่งเป็นชั้นตามจำนวนวันที่สำรอง แต่ละชั้นคือน้ำที่ทั้งบ้านใช้ในหนึ่งวัน" h={176}>
      <Ground x1={10} x2={170} y={164} />
      <Box x={30} y={24} w={110} h={140} fill="paper" />
      <Box x={31} y={118} w={108} h={45} line="none" />
      <Ln x1={30} y1={118} x2={140} y2={118} />
      <Ln x1={30} y1={72} x2={140} y2={72} line="dash" />
      <Txt x={85} y={146} anchor="middle" halo={false}>
        ใช้ 1 วัน
      </Txt>
      <Txt x={85} y={100} anchor="middle" tone="soft">
        วันสำรองเพิ่ม
      </Txt>
      <Dim x1={154} y1={24} x2={154} y2={164} ext={12} />
      <Txt x={164} y={56} tone="rust" weight={600} k="days">
        ขนาดถัง
      </Txt>
      <Txt x={164} y={74} k="days">
        = น้ำใช้ต่อวัน × วันสำรอง
      </Txt>
      <Leader x1={164} y1={132} x2={132} y2={140} />
      <Txt x={168} y={136} k={["people", "lp"]}>
        น้ำใช้ต่อวัน
      </Txt>
      <Txt x={168} y={154} tone="soft">
        = จำนวนคน × ลิตร/คน/วัน
      </Txt>
    </Svg>
  );
}
