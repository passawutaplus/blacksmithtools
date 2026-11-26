"use client";

import { Arrow, Box, Circ, Dim, Leader, Ln, Mark, Shape, Svg, Txt, pick, type DiagramProps } from "./primitives";

/** ตู้ไฟ → สาย (เส้นไฟ นิวทรัล สายดิน) → โหลด และวิธีเดินสายสองแบบ (electrical/cable, electrical/job) */
export function CableCircuit({ values }: DiagramProps) {
  const method = pick(values, "method", "surface");
  const surface = method !== "embed";
  return (
    <Svg title="วงจรจากตู้ไฟผ่านเบรกเกอร์และสายไฟไปถึงโหลด พร้อมรูปวิธีเดินสายแบบเดินลอยและแบบฝังในผนัง" h={214}>
      <Txt x={42} y={36} anchor="middle">
        ตู้ไฟ
      </Txt>
      <Box x={10} y={44} w={64} h={62} />
      <Box x={30} y={50} w={24} h={26} fill="paper" width={1.25} />
      <Ln x1={42} y1={56} x2={42} y2={70} width={2.5} />
      <Txt x={42} y={98} anchor="middle" halo={false}>
        เบรกเกอร์
      </Txt>
      <Box x={262} y={48} w={68} h={54} />
      <Txt x={296} y={80} anchor="middle" halo={false}>
        โหลด
      </Txt>
      {/* ตัวนำ */}
      {[58, 74, 90].map((y, i) => (
        <g key={y}>
          <Ln x1={74} y1={y} x2={132} y2={y} line={i === 2 ? "dash" : "ink"} width={i === 2 ? 1.5 : undefined} />
          <Ln x1={204} y1={y} x2={262} y2={y} line={i === 2 ? "dash" : "ink"} width={i === 2 ? 1.5 : undefined} />
        </g>
      ))}
      <Txt x={168} y={62} anchor="middle" halo={false}>
        สายไฟ L
      </Txt>
      <Txt x={168} y={78} anchor="middle" halo={false}>
        นิวทรัล N
      </Txt>
      <Txt x={168} y={94} anchor="middle" halo={false}>
        สายดิน
      </Txt>
      {/* กระแสโหลด */}
      <Arrow x1={92} y1={40} x2={134} y2={40} tone="rust" />
      <Txt x={140} y={44} tone="rust" weight={600} k={["il", "watts"]}>
        กระแสโหลด
      </Txt>
      {/* วิธีเดินสาย */}
      <Ln x1={10} y1={122} x2={330} y2={122} line="hair" />
      <Mark x={10} y={134} on={surface} />
      <Txt x={24} y={142} weight={surface ? 700 : 500} tone={surface ? "ink" : "soft"} k="method">
        ท่อเดินลอย
      </Txt>
      <Box x={10} y={152} w={14} h={54} fill="hatch" width={1.25} />
      <Circ cx={35} cy={179} r={10} fill="paper" />
      <Circ cx={31} cy={179} r={2.2} fill="fill2" width={1} />
      <Circ cx={39} cy={179} r={2.2} fill="fill2" width={1} />
      <Shape d="M24 166 L46 166 L46 192 L24 192" fill="none" line="hair" />
      <Txt x={56} y={176} tone="soft">
        เกาะผนัง
      </Txt>
      <Txt x={56} y={194} tone="soft">
        หรือเพดาน
      </Txt>
      <Mark x={178} y={134} on={!surface} />
      <Txt x={192} y={142} weight={!surface ? 700 : 500} tone={!surface ? "ink" : "soft"} k="method">
        ท่อฝัง
      </Txt>
      <Box x={178} y={152} w={40} h={54} fill="hatch" width={1.25} />
      <Circ cx={198} cy={179} r={10} fill="paper" />
      <Circ cx={194} cy={179} r={2.2} fill="fill2" width={1} />
      <Circ cx={202} cy={179} r={2.2} fill="fill2" width={1} />
      <Txt x={228} y={176} tone="soft">
        ในผนัง
      </Txt>
      <Txt x={228} y={194} tone="soft">
        หรือในฝ้า
      </Txt>
    </Svg>
  );
}

/** ระยะสายเที่ยวเดียวจากตู้ไฟถึงโหลด (electrical/vdrop) */
export function VDrop() {
  return (
    <Svg title="สายไฟจากตู้ไฟถึงโหลด ระยะสายวัดเที่ยวเดียวจากต้นทางถึงปลายทาง แรงดันปลายทางต่ำกว่าต้นทาง" h={156}>
      <Box x={10} y={48} w={58} h={62} />
      <Txt x={39} y={84} anchor="middle" halo={false}>
        ตู้ไฟ
      </Txt>
      <Box x={272} y={48} w={58} h={62} />
      <Txt x={301} y={84} anchor="middle" halo={false}>
        โหลด
      </Txt>
      <Ln x1={68} y1={62} x2={272} y2={62} />
      <Ln x1={68} y1={96} x2={272} y2={96} />
      <Dim x1={68} y1={28} x2={272} y2={28} ext={30} label="ระยะสาย (เที่ยวเดียว)" k="len" />
      <Txt x={150} y={84} anchor="end" k="il">
        กระแส
      </Txt>
      <Arrow x1={158} y1={80} x2={196} y2={80} />
      <Leader x1={170} y1={118} x2={170} y2={97} />
      <Txt x={170} y={132} anchor="middle" k="mm2">
        ขนาดสาย
      </Txt>
      <Txt x={10} y={128} k="volts">
        แรงดัน
      </Txt>
      <Txt x={10} y={146} tone="soft">
        ต้นทาง
      </Txt>
      <Txt x={330} y={128} anchor="end">
        แรงดัน
      </Txt>
      <Txt x={330} y={146} anchor="end" tone="soft">
        ปลายทาง (ต่ำลง)
      </Txt>
    </Svg>
  );
}

function Panel({ x }: { x: number }) {
  return (
    <g>
      <Box x={x} y={44} w={40} h={58} />
      <Ln x1={x + 20} y1={44} x2={x + 20} y2={102} line="hair" />
      <Ln x1={x} y1={63} x2={x + 40} y2={63} line="hair" />
      <Ln x1={x} y1={83} x2={x + 40} y2={83} line="hair" />
    </g>
  );
}

/** แผงต่ออนุกรมเป็นสตริงเข้าอินเวอร์เตอร์ (electrical/string) */
export function SolarString() {
  return (
    <Svg title="แผงโซลาร์ต่ออนุกรมเป็นหนึ่งสตริงเข้าช่อง MPPT ของอินเวอร์เตอร์ แรงดันสตริงคือแรงดันแผงคูณจำนวนแผง" h={178}>
      <Panel x={10} />
      <Panel x={58} />
      <Panel x={106} />
      <Panel x={186} />
      <Ln x1={50} y1={73} x2={58} y2={73} />
      <Ln x1={98} y1={73} x2={106} y2={73} />
      <Ln x1={146} y1={73} x2={154} y2={73} />
      <Ln x1={154} y1={73} x2={178} y2={73} line="dash" width={1.5} />
      <Ln x1={178} y1={73} x2={186} y2={73} />
      <Ln x1={226} y1={73} x2={254} y2={73} />
      <Box x={254} y={40} w={80} h={66} />
      <Txt x={294} y={68} anchor="middle" halo={false}>
        อินเวอร์เตอร์
      </Txt>
      <Txt x={294} y={88} anchor="middle" halo={false} weight={600}>
        MPPT
      </Txt>
      <Dim x1={10} y1={26} x2={226} y2={26} ext={18} label="แผงต่อสตริง (ต่ออนุกรม)" k="n" />
      <Leader x1={30} y1={116} x2={30} y2={96} tone="rust" />
      <Txt x={10} y={130} tone="rust" weight={600} k={["voc", "vmp"]}>
        Voc / Vmp ของ 1 แผง
      </Txt>
      <Txt x={334} y={130} anchor="end" tone="rust" weight={600} k={["vmin", "vmax"]}>
        ช่วงแรงดันเครื่อง
      </Txt>
      <Ln x1={10} y1={142} x2={334} y2={142} line="hair" />
      <Txt x={10} y={164}>
        แรงดันสตริง = แรงดันแผง × จำนวนแผง
      </Txt>
    </Svg>
  );
}
