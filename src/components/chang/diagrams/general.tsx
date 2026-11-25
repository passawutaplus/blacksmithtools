"use client";

import { C, Dim, Ellipse, Ln, Shape, Svg, Txt, pick, type DiagramProps } from "./primitives";

const SHAPE_NAME: Record<string, string> = {
  rect: "สี่เหลี่ยม / ห้อง",
  tri: "สามเหลี่ยม",
  circle: "วงกลม",
  cyl: "ทรงกระบอก",
  cone: "กรวย",
  pyr: "พีระมิดฐานสี่เหลี่ยม",
};

/** รูปทรง: ช่อง ก ข และ สูง คือระยะไหนของรูปที่เลือก (general/geometry) */
export function Shapes({ values }: DiagramProps) {
  const raw = pick(values, "shape", "rect");
  const shape = raw in SHAPE_NAME ? raw : "rect";
  let body;
  let unused = false;
  if (shape === "rect") {
    body = (
      <g>
        <Shape d="M60 160 L190 160 L250 122 L120 122 Z" line="none" />
        <Ln x1={120} y1={122} x2={120} y2={52} line="dash" />
        <Ln x1={60} y1={160} x2={120} y2={122} line="dash" />
        <Ln x1={120} y1={122} x2={250} y2={122} line="dash" />
        <Shape d="M60 160 L190 160 L190 90 L60 90 Z" fill="none" />
        <Shape d="M60 90 L120 52 L250 52 L190 90" fill="none" />
        <Shape d="M190 160 L250 122 L250 52" fill="none" />
        <Dim x1={60} y1={176} x2={190} y2={176} ext={-12} side="b" label="ก = กว้าง" k="a" />
        <Dim x1={202} y1={170} x2={262} y2={132} label="ข = ยาว" lx={240} ly={166} anchor="start" k="b" />
        <Dim x1={46} y1={90} x2={46} y2={160} ext={-10} side="b" label="สูง" k="h" />
      </g>
    );
  } else if (shape === "tri") {
    body = (
      <g>
        <Shape d="M40 160 L200 160 L150 60 Z" />
        <Shape d="M200 160 L228 143 L178 43 L150 60" fill="paper" />
        <Ln x1={150} y1={60} x2={150} y2={160} line="dash" />
        <Shape d="M150 152 L158 152 L158 160" fill="none" line="hair" />
        <Dim x1={40} y1={176} x2={200} y2={176} ext={-12} side="b" label="ก = ฐาน" k="a" />
        <Dim x1={26} y1={60} x2={26} y2={160} ext={[-120, -10]} side="a" label="ข = สูงสามเหลี่ยม" lx={10} ly={40} anchor="start" k="b" />
        <Dim x1={210} y1={171} x2={238} y2={154} label="สูง / ลึก" lx={236} ly={178} anchor="start" k="h" />
      </g>
    );
  } else if (shape === "circle" || shape === "cyl") {
    const dia = shape === "circle";
    unused = true;
    body = (
      <g>
        <Shape d="M60 62 L60 150 A70 18 0 0 0 200 150 L200 62 Z" />
        <Ellipse cx={130} cy={62} rx={70} ry={18} fill="paper" />
        {dia ? (
          <Dim x1={60} y1={62} x2={200} y2={62} label="ก = เส้นผ่านศูนย์กลาง" ly={36} k="a" />
        ) : (
          <g>
            <rect x={128} y={60} width={4} height={4} fill={C.ink} />
            <Dim x1={130} y1={62} x2={200} y2={62} label="ก = รัศมี" lx={165} ly={36} anchor="middle" k="a" />
          </g>
        )}
        <Dim x1={216} y1={62} x2={216} y2={150} ext={10} label="สูง / ลึก" k="h" />
      </g>
    );
  } else if (shape === "cone") {
    unused = true;
    body = (
      <g>
        <Shape d="M60 150 L130 34 L200 150 A70 18 0 0 1 60 150 Z" />
        <path d="M60 150 A70 18 0 0 1 200 150" fill="none" stroke={C.hair} strokeWidth={1} strokeDasharray="4 3" />
        <Ln x1={130} y1={34} x2={130} y2={150} line="dash" />
        <Ln x1={130} y1={34} x2={228} y2={34} line="dash" />
        <Dim x1={130} y1={150} x2={200} y2={150} label="ก = รัศมี" lx={165} ly={186} k="a" />
        <Dim x1={222} y1={34} x2={222} y2={150} ext={[0, 16]} label="สูง" k="h" />
      </g>
    );
  } else {
    unused = true;
    body = (
      <g>
        <Shape d="M50 156 L170 156 L132 40 Z" />
        <Shape d="M170 156 L216 126 L132 40 Z" fill="paper" />
        <Ln x1={50} y1={156} x2={96} y2={126} line="dash" />
        <Ln x1={96} y1={126} x2={216} y2={126} line="dash" />
        <Ln x1={96} y1={126} x2={132} y2={40} line="dash" />
        <Ln x1={132} y1={40} x2={132} y2={141} line="dash" />
        <Ln x1={132} y1={40} x2={246} y2={40} line="dash" />
        <Dim x1={50} y1={172} x2={170} y2={172} ext={-12} side="b" label="ก = ด้านฐาน" k="a" />
        <Dim x1={240} y1={40} x2={240} y2={141} ext={[0, 104]} label="สูง" k="h" />
      </g>
    );
  }
  return (
    <Svg title={`รูป${SHAPE_NAME[shape]} แสดงว่าช่อง ก ช่อง ข และช่องสูง คือระยะส่วนไหนของรูป`} h={198}>
      <Txt x={10} y={18} weight={600} k="shape">
        {SHAPE_NAME[shape]}
      </Txt>
      {body}
      {unused ? (
        <Txt x={336} y={18} anchor="end" tone="soft" k="b">
          รูปนี้ไม่ใช้ช่อง ข
        </Txt>
      ) : null}
    </Svg>
  );
}

/** สามเหลี่ยมมุมฉาก: ด้าน A ด้าน B และด้านทแยง + ตัวอย่างจับฉาก 3-4-5 (general/triangle) */
export function Pythagoras({ values }: DiagramProps) {
  const leg = pick(values, "mode", "hyp") === "leg";
  return (
    <Svg
      title={
        leg
          ? "สามเหลี่ยมมุมฉาก ช่อง A คือด้านทแยง ช่อง B คือด้านฉากที่รู้ หาด้านฉากที่เหลือ"
          : "สามเหลี่ยมมุมฉาก ช่อง A และช่อง B คือสองด้านที่ตั้งฉากกัน หาด้านทแยง"
      }
      h={208}
    >
      <Shape d="M80 144 L220 144 L80 39 Z" />
      <Shape d="M80 132 L92 132 L92 144" fill="none" width={1.25} />
      {leg ? (
        <g>
          <Dim x1={90} y1={28} x2={230} y2={133} label="ด้าน A = ทแยง" lx={172} ly={72} anchor="start" k="a" />
          <Txt x={70} y={96} anchor="end" weight={700}>
            ด้านที่หา
          </Txt>
        </g>
      ) : (
        <g>
          <Dim x1={64} y1={39} x2={64} y2={144} ext={-12} side="b" label="ด้าน A" k="a" />
          <Txt x={166} y={80} weight={700}>
            ทแยง (ที่หา)
          </Txt>
        </g>
      )}
      <Dim x1={80} y1={160} x2={220} y2={160} ext={-12} side="b" label="ด้าน B" k="b" />
      <Txt x={98} y={126} tone="soft">
        90°
      </Txt>
      <Txt x={10} y={200} tone="soft">
        จับฉาก 3-4-5: ด้าน 3 กับ 4 ได้ทแยง 5 พอดี
      </Txt>
    </Svg>
  );
}
