"use client";

import { Arrow, Box, C, Circ, Dim, Ground, Ln, Shape, Svg, Txt } from "./primitives";

/** ห้อง: กว้าง × ยาว × สูงฝ้า + ผนังที่แดดเข้า + ชั้นบนสุด (hvac/btu, hvac/job) */
export function RoomBtu() {
  return (
    <Svg title="ภาพห้อง แสดงด้านกว้าง ด้านยาว ความสูงถึงฝ้า ผนังด้านที่แดดเข้า และเพดานชั้นบนสุด" h={212}>
      {/* พื้น */}
      <Shape d="M72 172 L206 172 L268 132 L134 132 Z" fill="fill" line="none" />
      {/* ผนังด้านแดดเข้า */}
      <Shape d="M206 172 L268 132 L268 50 L206 90 Z" fill="paper" />
      <Shape d="M224 132 L250 115 L250 84 L224 101 Z" fill="fill" width={1.25} />
      {/* ขอบหลัง (เส้นซ่อน) */}
      <Ln x1={134} y1={132} x2={134} y2={50} line="dash" />
      <Ln x1={72} y1={172} x2={134} y2={132} line="dash" />
      <Ln x1={134} y1={132} x2={268} y2={132} line="dash" />
      {/* กรอบห้อง */}
      <Shape d="M72 172 L206 172 L206 90 L72 90 Z" fill="none" />
      <Shape d="M72 90 L134 50 L268 50 L206 90" fill="none" />
      {/* แดด */}
      <Arrow x1={320} y1={92} x2={274} y2={100} />
      <Arrow x1={320} y1={110} x2={274} y2={118} />
      <Txt x={336} y={82} anchor="end" k="sunload">
        แดดเข้าห้อง
      </Txt>
      {/* ชั้นบนสุด */}
      <Arrow x1={150} y1={26} x2={150} y2={64} />
      <Arrow x1={190} y1={26} x2={190} y2={64} />
      <Txt x={72} y={18} k="top">
        ชั้นบนสุดใต้หลังคา
      </Txt>
      {/* ระยะ */}
      <Dim x1={72} y1={188} x2={206} y2={188} ext={-12} side="b" label="กว้าง" k="w" />
      <Dim x1={218} y1={182} x2={280} y2={142} label="ยาว" lx={256} ly={176} anchor="start" k="l" />
      <Dim x1={58} y1={90} x2={58} y2={172} ext={-10} side="b" label="สูงฝ้า" k="h" />
    </Svg>
  );
}

function Gauge({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={9} fill={C.paper} stroke={C.rust} strokeWidth={1.75} />
      <line x1={x} y1={y} x2={x + 5} y2={y - 5} stroke={C.rust} strokeWidth={1.5} />
    </g>
  );
}

function Clamp({ x, y }: { x: number; y: number }) {
  return <rect x={x - 5} y={y - 6} width={10} height={12} fill={C.rust} />;
}

/** จุดต่อเกจและจุดหนีบเทอร์โมมิเตอร์บนท่อดูด/ท่อของเหลว (hvac/shsc) */
export function ShSc() {
  return (
    <Svg title="ผังแอร์แยกส่วน แสดงจุดต่อเกจวัดแรงดันและจุดหนีบเทอร์โมมิเตอร์บนท่อดูดและท่อของเหลว" h={206}>
      {/* คอยล์ร้อน */}
      <Box x={10} y={62} w={92} h={104} />
      <Circ cx={56} cy={104} r={26} fill="paper" width={1.25} />
      <Ln x1={38} y1={86} x2={74} y2={122} line="hair" />
      <Ln x1={74} y1={86} x2={38} y2={122} line="hair" />
      <Txt x={56} y={156} anchor="middle" halo={false}>
        คอยล์ร้อน
      </Txt>
      {/* คอยล์เย็น */}
      <Box x={246} y={12} w={86} h={32} />
      <Txt x={289} y={33} anchor="middle" halo={false}>
        คอยล์เย็น
      </Txt>
      {/* ท่อของเหลว (เล็ก) */}
      <Shape d="M102 92 L296 92 L296 44" fill="none" width={1.5} />
      {/* ท่อดูด (ใหญ่) */}
      <Shape d="M102 132 L312 132 L312 44" fill="none" width={4} />
      <Txt x={206} y={84}>
        ท่อของเหลว
      </Txt>
      <Txt x={206} y={150}>
        ท่อดูด
      </Txt>
      {/* จุดวัดฝั่งของเหลว */}
      <Ln x1={122} y1={92} x2={122} y2={70} line="rust" width={1.25} />
      <Gauge x={122} y={62} />
      <Txt x={136} y={60} tone="rust" weight={600} k="liqP">
        P ของเหลว
      </Txt>
      <Clamp x={180} y={92} />
      <Txt x={136} y={84} tone="rust" weight={600} k="liqT">
        T
      </Txt>
      <Ln x1={148} y1={80} x2={174} y2={88} line="rust" width={0.9} />
      {/* จุดวัดฝั่งดูด */}
      <Ln x1={122} y1={132} x2={122} y2={158} line="rust" width={1.25} />
      <Gauge x={122} y={166} />
      <Txt x={136} y={172} tone="rust" weight={600} k="sucP">
        P ดูด
      </Txt>
      <Clamp x={180} y={132} />
      <Txt x={136} y={150} tone="rust" weight={600} k="sucT">
        T
      </Txt>
      <Ln x1={148} y1={145} x2={174} y2={137} line="rust" width={0.9} />
      {/* คำอธิบายสัญลักษณ์ */}
      <Gauge x={20} y={194} />
      <Txt x={34} y={199} tone="soft">
        P = ต่อเกจ
      </Txt>
      <Clamp x={128} y={194} />
      <Txt x={140} y={199} tone="soft">
        T = หนีบเทอร์โมมิเตอร์ที่ท่อ
      </Txt>
    </Svg>
  );
}

function SplitUnits() {
  return (
    <g>
      <Box x={96} y={8} w={12} h={172} fill="hatch" width={1.25} />
      <Box x={14} y={28} w={82} h={32} />
      <Txt x={55} y={49} anchor="middle" halo={false}>
        คอยล์เย็น
      </Txt>
      <Ground x1={108} x2={340} y={180} />
      <Box x={240} y={128} w={86} h={52} />
      <Txt x={283} y={160} anchor="middle" halo={false}>
        คอยล์ร้อน
      </Txt>
    </g>
  );
}

/** ระยะเดินท่อ = วัดตามแนวท่อจริง + ท่อเล็ก/ท่อใหญ่ (hvac/pipe) */
export function PipeRun() {
  return (
    <Svg title="แนวเดินท่อน้ำยาจากคอยล์เย็นถึงคอยล์ร้อน ระยะเดินท่อวัดตามแนวท่อจริงรวมช่วงเลี้ยว" h={196}>
      <SplitUnits />
      {/* ท่อคู่: เส้นเล็ก = ของเหลว เส้นใหญ่ = ดูด */}
      <Shape d="M96 41 L203 41 L203 149 L240 149" fill="none" width={1.5} />
      <Shape d="M96 48 L196 48 L196 156 L240 156" fill="none" width={3.5} />
      {/* ระยะเดินท่อ: ไล่ตามแนวท่อ */}
      <Dim x1={108} y1={30} x2={214} y2={30} arrows="start" k="run" />
      <Dim x1={214} y1={30} x2={214} y2={138} arrows="none" k="run" />
      <Dim x1={214} y1={138} x2={240} y2={138} arrows="end" k="run" />
      <Txt x={222} y={76} tone="rust" weight={600} k="run">
        ระยะเดินท่อ
      </Txt>
      {/* ต่างระดับ */}
      <Dim x1={130} y1={52} x2={130} y2={152} tone="soft" label="ต่างระดับ" />
      <Ln x1={126} y1={152} x2={192} y2={152} line="dash" />
      {/* คำอธิบายเส้น */}
      <Ln x1={222} y1={95} x2={240} y2={95} width={1.5} />
      <Txt x={246} y={100} tone="soft">
        ท่อน้ำยาเหลว
      </Txt>
      <Ln x1={222} y1={113} x2={240} y2={113} width={3.5} />
      <Txt x={246} y={118} tone="soft">
        ท่อดูด
      </Txt>
    </Svg>
  );
}

/** ระยะมาตรฐานรุ่น กับ เมตรที่เกิน ซึ่งเป็นส่วนที่ต้องเติมน้ำยาเพิ่ม (hvac/charge) */
export function ChargeRun() {
  return (
    <Svg title="ระยะท่อจริงแบ่งเป็นระยะมาตรฐานของรุ่นกับส่วนที่เกิน เติมน้ำยาเพิ่มเฉพาะส่วนที่เกิน" h={150}>
      <Box x={6} y={56} w={56} h={34} />
      <Txt x={4} y={110}>
        คอยล์เย็น
      </Txt>
      <Box x={278} y={50} w={56} h={46} />
      <Txt x={336} y={116} anchor="end">
        คอยล์ร้อน
      </Txt>
      {/* ท่อ: ส่วนมาตรฐาน + ส่วนเกิน */}
      <Box x={62} y={66} w={136} h={14} />
      <Box x={198} y={66} w={80} h={14} fill="hatch" />
      <Dim x1={62} y1={26} x2={278} y2={26} ext={36} label="ระยะท่อจริง" k="run" />
      <Dim x1={62} y1={104} x2={198} y2={104} ext={-20} side="b" label="ระยะมาตรฐานรุ่น" k="std" />
      <Dim x1={198} y1={104} x2={278} y2={104} ext={-20} side="b" label="ส่วนเกิน" />
      <Txt x={336} y={142} anchor="end">
        เติมเพิ่ม = ส่วนเกิน × กรัมต่อเมตร
      </Txt>
    </Svg>
  );
}
