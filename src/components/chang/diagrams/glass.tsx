"use client";

import { Box, C, Circ, Dim, Ground, Leader, Ln, Svg, Txt, pick, type DiagramProps } from "./primitives";

/** เฟรม: ตัดมุม 45° กับชน 90° ต่างกันที่ความยาวด้านตั้ง (glass/cut, glass/job) */
export function FrameCut({ values }: DiagramProps) {
  const miter = pick(values, "miter", "45");
  const butt = miter === "90";
  return (
    <Svg
      title={
        butt
          ? "เฟรมอลูมิเนียมแบบชน 90 องศา ด้านนอนยาวเต็มความกว้าง ด้านตั้งสั้นลงเท่าหน้าตัดเฟรมสองข้าง"
          : "เฟรมอลูมิเนียมแบบตัดมุม 45 องศา ปลายยาวของทุกด้านเท่ากับขนาดช่อง"
      }
      h={222}
    >
      <Box x={80} y={24} w={140} h={160} />
      <Box x={96} y={40} w={108} h={128} fill="paper" />
      {butt ? (
        <g>
          <Ln x1={80} y1={40} x2={96} y2={40} />
          <Ln x1={204} y1={40} x2={220} y2={40} />
          <Ln x1={80} y1={168} x2={96} y2={168} />
          <Ln x1={204} y1={168} x2={220} y2={168} />
          <Dim x1={126} y1={40} x2={126} y2={168} tone="soft" label="ตัดสูง" />
        </g>
      ) : (
        <g>
          <Ln x1={80} y1={24} x2={96} y2={40} />
          <Ln x1={220} y1={24} x2={204} y2={40} />
          <Ln x1={80} y1={184} x2={96} y2={168} />
          <Ln x1={220} y1={184} x2={204} y2={168} />
        </g>
      )}
      <Dim x1={80} y1={200} x2={220} y2={200} ext={-14} side="b" label="กว้างช่อง" k="w" />
      <Dim x1={66} y1={24} x2={66} y2={184} ext={-12} side="b" label="สูงช่อง" k="h" />
      <Dim x1={204} y1={104} x2={220} y2={104} arrows="in" label="หน้าตัดเฟรม" lx={240} ly={96} anchor="start" k="profile" />
      <Txt x={240} y={136} weight={600} k="miter">
        {butt ? "ชน 90°" : "ตัดมุม 45°"}
      </Txt>
      <Txt x={240} y={154} tone="soft">
        {butt ? "ด้านตั้งสั้นลง" : "ปลายยาว"}
      </Txt>
      <Txt x={240} y={172} tone="soft">
        {butt ? "2 × หน้าตัด" : "= ขนาดช่อง"}
      </Txt>
    </Svg>
  );
}

/** ระยะเจาะจากขอบกระจก (glass/hardware) */
export function GlassDrill({ values }: DiagramProps) {
  const door = pick(values, "kind", "door") !== "patch";
  return (
    <Svg title="แผ่นกระจก แสดงระยะจากขอบกระจกถึงจุดเจาะหรือบากด้านบนและด้านล่าง" h={216}>
      <Box x={110} y={46} w={110} h={150} />
      <Ground x1={90} x2={320} y={204} />
      <Circ cx={128} cy={64} r={4.5} fill="paper" />
      <Circ cx={128} cy={178} r={4.5} fill="paper" />
      <Dim x1={98} y1={46} x2={98} y2={64} ext={[-12, -26]} arrows="in" />
      <Dim x1={98} y1={178} x2={98} y2={196} ext={[-26, -12]} arrows="in" />
      <Txt x={86} y={60} anchor="end" tone="rust" weight={600}>
        ระยะจากขอบ
      </Txt>
      <Txt x={86} y={78} anchor="end" tone="rust" weight={600}>
        ถึงจุดเจาะ
      </Txt>
      <Dim x1={110} y1={28} x2={220} y2={28} ext={18} label="กว้าง" ly={20} k="w" />
      <Dim x1={234} y1={46} x2={234} y2={196} ext={12} label="สูง" ly={84} k="h" />
      {door ? (
        <g>
          <Box x={202} y={128} w={7} h={30} fill="fill2" width={1.25} />
          <Ln x1={212} y1={143} x2={270} y2={143} line="dash" />
          <Dim x1={264} y1={143} x2={264} y2={204} tone="soft" />
          <Txt x={272} y={162} tone="soft">
            มือจับ
          </Txt>
          <Txt x={272} y={180} tone="soft">
            0.9–1.0 ม.
          </Txt>
          <Txt x={272} y={198} tone="soft">
            จากพื้น
          </Txt>
        </g>
      ) : null}
    </Svg>
  );
}

/** ร่องซิลิโคน: กว้างร่อง × ลึกยา และเส้นรอบร่อง (glass/sealant) */
export function SealantJoint() {
  return (
    <Svg title="หน้าตัดร่องยาซิลิโคน แสดงความกว้างร่องและความลึกของยา และเส้นรอบร่องคือความยาวรวมรอบช่อง" h={192}>
      <Box x={24} y={56} w={92} h={96} fill="hatch" />
      <Box x={136} y={56} w={70} h={96} />
      <Box x={116} y={56} w={20} h={22} fill="fill2" />
      <Circ cx={126} cy={89} r={10} fill="paper" line="hair" />
      <Dim x1={116} y1={38} x2={136} y2={38} ext={16} arrows="in" label="กว้างร่อง" lx={156} ly={34} anchor="start" k="gap" />
      <Dim x1={218} y1={56} x2={218} y2={78} ext={[10, 80]} arrows="in" label="ลึกยา" lx={226} ly={72} anchor="start" k="depth" />
      <Txt x={24} y={30}>
        ซิลิโคน
      </Txt>
      <Leader x1={62} y1={35} x2={124} y2={66} tone="ink" />
      <Leader x1={126} y1={160} x2={126} y2={94} />
      <Txt x={126} y={176} anchor="middle" tone="soft">
        โฟมเส้นรองร่อง
      </Txt>
      {/* เส้นรอบร่อง */}
      <Box x={262} y={96} w={62} h={62} fill="paper" line="hair" />
      <rect x={267} y={101} width={52} height={52} fill="none" stroke={C.rust} strokeWidth={2} />
      <Txt x={293} y={178} anchor="middle" tone="rust" weight={600} k="peri">
        เส้นรอบร่อง
      </Txt>
    </Svg>
  );
}
