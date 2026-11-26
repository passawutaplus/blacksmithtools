"use client";

import { Arrow, Box, Dim, Ground, Leader, Ln, Shape, Svg, Txt, pick, type DiagramProps } from "./primitives";

/** ความชัน = ยกขึ้นต่อระยะราบ และ กว้างแปลน (แนวราบ) เทียบกับผิวหลังคาจริง (roof/area, roof/job, roof/fastener) */
export function RoofPitch() {
  return (
    <Svg title="หน้าตัดหลังคาจั่ว กว้างแปลนวัดแนวราบ ผิวหลังคาจริงวัดตามแนวเอียงจึงยาวกว่า ความชันคือระยะยกขึ้นต่อระยะราบ 100" h={228}>
      {/* ตัวอย่างความชัน */}
      <Txt x={336} y={18} anchor="end" k={["pitch", "pitchUnit"]}>
        ชัน 30% ≈ 17°
      </Txt>
      <Shape d="M236 36 L336 66" fill="none" width={2.5} />
      <Ln x1={236} y1={36} x2={236} y2={66} line="rust" width={1.25} />
      <Ln x1={236} y1={66} x2={336} y2={66} line="rust" width={1.25} />
      <Shape d="M236 58 L244 58 L244 66" fill="none" line="rust" width={0.9} />
      <Txt x={230} y={56} anchor="end" tone="rust" weight={600} k="pitch">
        ยก 30
      </Txt>
      <Txt x={286} y={82} anchor="middle" tone="rust" weight={600} k="pitch">
        ราบ 100
      </Txt>
      {/* บ้าน */}
      <Box x={62} y={136} w={216} h={50} fill="paper" line="hair" />
      <Ground x1={20} x2={320} y={186} />
      <Shape d="M40 136 L170 96 L300 136" fill="none" width={2.75} />
      <Dim x1={34} y1={121} x2={164} y2={81} tone="soft" />
      <Txt x={14} y={62} tone="soft">
        ผิวหลังคาจริง
      </Txt>
      <Txt x={14} y={80} tone="soft">
        ยาวกว่าแปลน
      </Txt>
      <Dim x1={40} y1={202} x2={300} y2={202} ext={-62} side="b" label="กว้างแปลน (วัดแนวราบ)" k="w" />
    </Svg>
  );
}

function ribs(x0: number, n: number, yb: number, yt: number, tail: boolean): string {
  let d = `M${x0} ${yb}`;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * 34;
    d += ` L${x + 6} ${yt} L${x + 16} ${yt} L${x + 22} ${yb} L${x + 34} ${yb}`;
  }
  if (tail) {
    const x = x0 + n * 34;
    d += ` L${x + 6} ${yt} L${x + 16} ${yt} L${x + 22} ${yb}`;
  }
  return d;
}

/** เมทัลชีท: กว้างคลุม (หลังซ้อนลอน) ไม่ใช่กว้างแผ่นเต็ม + ยาวแผ่น (roof/material) */
export function MetalSheet() {
  return (
    <Svg title="หน้าตัดเมทัลชีทสองแผ่นซ้อนลอนกัน กว้างคลุมคือระยะที่แผ่นคลุมได้จริงหลังซ้อนลอน สั้นกว่าความกว้างแผ่นเต็ม" h={226}>
      <Shape d={ribs(20, 5, 78, 62, true)} fill="none" width={2} />
      <Shape d={ribs(190, 3, 74, 58, true)} fill="none" width={2} />
      <Txt x={201} y={32} anchor="middle">
        ซ้อนลอน
      </Txt>
      <Leader x1={201} y1={37} x2={201} y2={54} tone="ink" />
      <Dim x1={20} y1={100} x2={190} y2={100} ext={-20} side="b" label="กว้างคลุม" k="coverW" />
      <Dim x1={20} y1={134} x2={212} y2={134} ext={[-54, -54]} side="b" tone="soft" label="กว้างแผ่นเต็ม" />
      <Txt x={336} y={104} anchor="end" tone="soft">
        แผ่นถัดไป
      </Txt>
      {/* ยาวแผ่น */}
      <Ln x1={10} y1={162} x2={330} y2={162} line="hair" />
      <Box x={20} y={174} w={170} h={30} />
      <Ln x1={20} y1={184} x2={190} y2={184} line="hair" />
      <Ln x1={20} y1={194} x2={190} y2={194} line="hair" />
      <Dim x1={20} y1={214} x2={190} y2={214} ext={-8} label="ยาวแผ่น" lx={198} ly={218} anchor="start" k="sheetLen" />
      <Txt x={198} y={192} tone="soft">
        ลอนวิ่งตามแนวยาว
      </Txt>
    </Svg>
  );
}

/** จำนวนแผ่นหลังคา: เมทัลชีทใช้ภาพกว้างคลุม ส่วนกระเบื้องลอนใช้ภาพความชัน */
export function RoofMaterial({ values }: DiagramProps) {
  return pick(values, "kind", "metal") === "tile" ? <RoofPitch /> : <MetalSheet />;
}

/** รางน้ำกับท่อลง: วัดกว้างรางและขนาดท่อตรงไหน (roof/gutter) */
export function Gutter() {
  return (
    <Svg title="หน้าตัดชายคา รางน้ำ และท่อลง กว้างรางวัดที่ปากราง ขนาดท่อลงคือเส้นผ่านศูนย์กลางท่อ" h={206}>
      <Ground x1={110} x2={330} y={194} />
      <Box x={136} y={84} w={16} h={110} fill="hatch" width={1.25} />
      <Shape d="M14 36 L186 92" fill="none" width={2.75} />
      <Arrow x1={70} y1={42} x2={116} y2={57} />
      <Txt x={14} y={22}>
        พื้นที่รับน้ำ = ผิวหลังคาที่ไหลลงรางนี้
      </Txt>
      {/* รางน้ำ */}
      <Shape d="M188 96 L188 120 L228 120 L228 96" />
      {/* ท่อลง */}
      <Box x={201} y={120} w={14} h={74} />
      <Dim x1={188} y1={78} x2={228} y2={78} ext={16} label="กว้างราง" lx={236} ly={82} anchor="start" />
      <Dim x1={201} y1={156} x2={215} y2={156} arrows="in" label="Ø ท่อลง" lx={236} ly={160} anchor="start" />
      <Txt x={128} y={150} anchor="end" tone="soft">
        ผนัง
      </Txt>
    </Svg>
  );
}

/** ผังหลังคาปั้นหยา: สัน กับ ตะเข้สัน (roof/ridge) */
export function RidgeHip() {
  return (
    <Svg title="ผังหลังคาปั้นหยามองจากด้านบน สันหลังคาอยู่กลาง ตะเข้สันคือแนวทแยงจากปลายสันลงไปที่มุมชายคา" h={186}>
      <Box x={40} y={36} w={260} h={120} />
      <Ln x1={100} y1={96} x2={240} y2={96} width={2.5} />
      <Ln x1={100} y1={96} x2={40} y2={36} />
      <Ln x1={100} y1={96} x2={40} y2={156} />
      <Ln x1={240} y1={96} x2={300} y2={36} />
      <Ln x1={240} y1={96} x2={300} y2={156} />
      <Dim x1={100} y1={82} x2={240} y2={82} ext={10} label="ยาวสัน" k="ridge" />
      <Dim x1={108} y1={104} x2={48} y2={164} ext={9} k="hipLen" />
      <Txt x={112} y={142} tone="rust" weight={600} k="hipLen">
        ยาวตะเข้/เส้น
      </Txt>
      <Txt x={336} y={22} anchor="end" k="hips">
        ตะเข้สัน (นับทุกเส้น)
      </Txt>
      <Leader x1={284} y1={27} x2={276} y2={60} tone="ink" />
      <Txt x={300} y={178} anchor="end" tone="soft">
        มองจากด้านบน
      </Txt>
    </Svg>
  );
}
