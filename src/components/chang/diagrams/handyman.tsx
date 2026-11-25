"use client";

import { STAIR_LAW } from "../../../lib/chang/constants";
import { Arrow, Box, Circ, Dim, Ground, Leader, Ln, Mark, Shape, Svg, Txt, pick, type DiagramProps } from "./primitives";

/** บานพับถ้วย: ระยะขอบบานถึงถ้วย + ระบบบานสามแบบ (handyman/hinge) */
export function HingeCup({ values }: DiagramProps) {
  const overlay = pick(values, "overlay", "full");
  const types = [
    { id: "full", name: "ปิดทับเต็ม", door: { x: 190, y: 0, w: 62 } },
    { id: "half", name: "ปิดทับครึ่ง", door: { x: 196, y: 0, w: 56 } },
    { id: "inset", name: "บานฝังใน", door: { x: 203, y: 9, w: 49 } },
  ];
  return (
    <Svg title="ด้านหลังบานตู้ แสดงระยะจากขอบบานถึงขอบรูถ้วยบานพับ และรูปเทียบระบบบานปิดทับเต็ม ปิดทับครึ่ง และบานฝังใน" h={212}>
      {/* หลังบาน */}
      <Box x={20} y={40} w={136} h={162} fill="paper" />
      <Circ cx={38} cy={76} r={12} />
      <Circ cx={38} cy={176} r={12} />
      <Dim x1={20} y1={26} x2={26} y2={26} ext={[14, 50]} arrows="in" label="ขอบบาน → ถ้วย" lx={46} ly={22} anchor="start" k="overlay" />
      <Ln x1={38} y1={76} x2={76} y2={76} line="dash" />
      <Dim x1={70} y1={40} x2={70} y2={76} tone="soft" label="ห่างปลายบาน" ly={62} />
      <Txt x={56} y={100} tone="soft">
        ถ้วย Ø 35 มม.
      </Txt>
      <Txt x={88} y={150} anchor="middle" tone="soft">
        ด้านหลังบาน
      </Txt>
      {/* ระบบบาน */}
      <Ln x1={172} y1={10} x2={172} y2={202} line="hair" />
      {types.map((t, i) => {
        const y = 44 + i * 58;
        const on = overlay === t.id;
        return (
          <g key={t.id}>
            <Box x={190} y={y + 9} w={12} h={34} fill="hatch" width={1.25} />
            <Box x={t.door.x} y={y + t.door.y} w={t.door.w} h={8} fill={on ? "fill2" : "paper"} width={1.5} />
            <Mark x={262} y={y + 6} on={on} />
            <Txt x={276} y={y + 14} weight={on ? 700 : 500} tone={on ? "ink" : "soft"} size={12.5} k="overlay">
              {t.name}
            </Txt>
          </g>
        );
      })}
      <Txt x={190} y={26} tone="soft">
        มองจากด้านบน
      </Txt>
    </Svg>
  );
}

/** หน้าบานลิ้นชัก: ช่องเปิดรวม แบ่งเป็นบานเท่ากันโดยมีร่องคั่น (handyman/drawer) */
export function DrawerFronts({ values }: DiagramProps) {
  const n = Math.min(6, Math.max(2, Math.round(Number(values.n) || 4)));
  const top = 24;
  const total = 162;
  const gap = 5;
  const front = (total - gap * (n - 1)) / n;
  const firstGap = top + front;
  const lastTop = top + (n - 1) * (front + gap);
  return (
    <Svg title={`หน้าตู้ลิ้นชัก ${n} ลิ้น ความสูงช่องเปิดแบ่งเป็นหน้าบานเท่ากัน คั่นด้วยร่องระหว่างบาน`} h={206}>
      <Box x={86} y={top - 6} w={150} h={total + 12} fill="paper" line="hair" />
      {Array.from({ length: n }, (_, i) => {
        const y = top + i * (front + gap);
        return (
          <g key={i}>
            <Box x={92} y={y} w={138} h={front} />
            <Ln x1={146} y1={y + front / 2} x2={176} y2={y + front / 2} width={2.5} />
          </g>
        );
      })}
      <Dim x1={72} y1={top} x2={72} y2={top + total} ext={-16} side="b" label="สูงช่องเปิด" k="opening" />
      <Dim x1={248} y1={firstGap} x2={248} y2={firstGap + gap} ext={14} arrows="in" k="gap" />
      <Txt x={258} y={firstGap - 2} tone="rust" weight={600} k="gap">
        ร่อง
      </Txt>
      <Txt x={258} y={firstGap + 16} tone="rust" weight={600} k="gap">
        ระหว่างบาน
      </Txt>
      <Dim x1={248} y1={lastTop} x2={248} y2={lastTop + front} ext={14} tone="soft" />
      <Txt x={258} y={lastTop + front / 2 + 5} tone="soft">
        สูงหน้าบาน
      </Txt>
    </Svg>
  );
}

/** บันได: สูงพื้นถึงพื้น ลูกตั้ง R ลูกนอน T (handyman/stair) */
export function Stair() {
  return (
    <Svg title="หน้าตัดบันได แสดงความสูงจากพื้นถึงพื้น ลูกตั้ง R คือความสูงของขั้น ลูกนอน T คือความลึกของขั้น" h={212}>
      <Ground x1={10} x2={130} y={184} />
      <Shape d="M70 184 L70 156 L106 156 L106 128 L142 128 L142 100 L178 100 L178 72 L214 72 L214 44 L330 44 L330 58 L232 58 L96 184 Z" />
      <Ln x1={20} y1={44} x2={214} y2={44} line="dash" />
      <Dim x1={22} y1={44} x2={22} y2={184} label="สูงพื้นถึงพื้น" ly={96} k="H" />
      <Dim x1={98} y1={128} x2={98} y2={156} arrows="in" label="ลูกตั้ง R" lx={90} ly={146} anchor="end" k="r" />
      <Dim x1={178} y1={62} x2={214} y2={62} ext={8} label="ลูกนอน T" lx={206} ly={34} anchor="end" />
      <Txt x={330} y={204} anchor="end" tone="soft">
        เดินสบาย: 2R + T ≈ {STAIR_LAW.blondel.value} ซม.
      </Txt>
      <Txt x={272} y={38} anchor="middle" tone="soft">
        พื้นชั้นบน
      </Txt>
    </Svg>
  );
}

/** พุกตามชนิดผนัง: ตัวยึดต้องจับเนื้อผนังส่วนไหน (handyman/screw) */
export function AnchorTypes({ values }: DiagramProps) {
  const wall = pick(values, "wall", "conc");
  const screw = (toX: number) => (
    <g>
      <Ln x1={110} y1={93} x2={toX} y2={93} width={2.5} />
      <Box x={104} y={86} w={6} h={14} fill="fill2" width={1.25} />
    </g>
  );
  let body;
  let title;
  if (wall === "brick") {
    title = "ผนังอิฐฉาบปูน พุกต้องเจาะผ่านชั้นปูนฉาบเข้าไปอยู่ในเนื้ออิฐ";
    body = (
      <g>
        <Box x={130} y={20} w={10} h={150} fill="dots" width={1.25} />
        <Box x={140} y={20} w={66} h={150} fill="hatch" />
        <Box x={142} y={88} w={44} h={10} fill="fill2" width={1.25} />
        {screw(182)}
        <Txt x={222} y={40}>
          อิฐ
        </Txt>
        <Leader x1={218} y1={36} x2={196} y2={44} />
        <Txt x={222} y={98}>
          พุกอยู่ในเนื้ออิฐ
        </Txt>
        <Leader x1={218} y1={94} x2={180} y2={93} tone="ink" />
        <Txt x={222} y={150} tone="soft">
          ปูนฉาบไม่รับแรง
        </Txt>
        <Leader x1={218} y1={146} x2={136} y2={150} />
      </g>
    );
  } else if (wall === "gyp") {
    title = "ผนังยิปซัม พุกปีกผีเสื้อกางออกด้านหลังแผ่น ของหนักต้องยึดเข้าโครงคร่าว";
    body = (
      <g>
        <Box x={130} y={20} w={9} h={150} />
        <Ln x1={110} y1={93} x2={150} y2={93} width={2.5} />
        <Box x={104} y={86} w={6} h={14} fill="fill2" width={1.25} />
        <Shape d="M139 93 L152 76 M139 93 L152 110" fill="none" width={2} />
        <Box x={139} y={132} w={34} h={16} fill="paper" width={1.25} />
        <Txt x={222} y={40}>
          แผ่นยิปซัม
        </Txt>
        <Leader x1={218} y1={36} x2={136} y2={32} />
        <Txt x={222} y={98}>
          ปีกกางหลังแผ่น
        </Txt>
        <Leader x1={218} y1={94} x2={152} y2={93} tone="ink" />
        <Txt x={222} y={146} tone="soft">
          โครงคร่าว
        </Txt>
        <Leader x1={218} y1={142} x2={170} y2={140} />
      </g>
    );
  } else if (wall === "wood") {
    title = "ผนังไม้ ขันสกรูไม้เข้าเนื้อไม้ได้โดยตรง ไม่ต้องใช้พุก";
    body = (
      <g>
        <Box x={130} y={20} w={50} h={150} />
        <Ln x1={142} y1={20} x2={142} y2={170} line="hair" />
        <Ln x1={156} y1={20} x2={156} y2={170} line="hair" />
        <Ln x1={168} y1={20} x2={168} y2={170} line="hair" />
        {screw(170)}
        <Txt x={222} y={40}>
          ไม้
        </Txt>
        <Leader x1={218} y1={36} x2={176} y2={40} />
        <Txt x={222} y={98}>
          สกรูไม้ ไม่ต้องพุก
        </Txt>
        <Leader x1={218} y1={94} x2={170} y2={93} tone="ink" />
      </g>
    );
  } else {
    title = "ผนังคอนกรีต เจาะรูใส่พุกแล้วขันสกรูให้พุกเบ่งอัดกับเนื้อคอนกรีต";
    body = (
      <g>
        <Box x={130} y={20} w={76} h={150} fill="hatch" />
        <Box x={131} y={88} w={46} h={10} fill="fill2" width={1.25} />
        {screw(174)}
        <Txt x={222} y={40}>
          คอนกรีต
        </Txt>
        <Leader x1={218} y1={36} x2={196} y2={44} />
        <Txt x={222} y={98}>
          พุกอยู่ในรูเจาะ
        </Txt>
        <Leader x1={218} y1={94} x2={172} y2={93} tone="ink" />
      </g>
    );
  }
  return (
    <Svg title={title} h={194}>
      {body}
      {/* ของที่แขวน */}
      <Box x={112} y={62} w={8} h={62} fill="fill2" width={1.25} />
      <Box x={44} y={66} w={68} h={54} />
      <Arrow x1={78} y1={124} x2={78} y2={156} />
      <Txt x={78} y={174} anchor="middle" k="load">
        น้ำหนัก
      </Txt>
      <Txt x={10} y={40} tone="soft" k="points">
        1 จุดยึด
      </Txt>
      <Leader x1={62} y1={44} x2={104} y2={90} />
    </Svg>
  );
}
