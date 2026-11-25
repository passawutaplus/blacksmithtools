"use client";

import { Box, C, Dim, Ln, Svg, Txt, pick, type DiagramProps } from "./primitives";

/** โครงทีบาร์: Main tee ทุก 1.20 ม. Cross tee ทุก 0.60 ม. (ceiling/tbar) */
export function TbarGrid({ values }: DiagramProps) {
  const big = pick(values, "tile", "60") === "120";
  const x0 = 70;
  const cell = 35;
  const mains = [34, 104, 174];
  const cols = [0, 1, 2, 3, 4, 5, 6, 7];
  return (
    <Svg title={`ผังโครงฝ้าทีบาร์มองจากด้านบน Main tee ห่างกัน 1.20 เมตร Cross tee ห่างกัน 0.60 เมตร แผ่นขนาด ${big ? "60×120" : "60×60"} เซนติเมตร`} h={208}>
      <Box x={x0 + cell} y={104} w={cell} h={big ? 70 : 35} line="none" />
      {!big ? (
        <g>
          <Ln x1={x0} y1={69} x2={x0 + 7 * cell} y2={69} line="hair" />
          <Ln x1={x0} y1={139} x2={x0 + 7 * cell} y2={139} line="hair" />
        </g>
      ) : null}
      {cols.map((c) => (
        <Ln key={c} x1={x0 + c * cell} y1={34} x2={x0 + c * cell} y2={174} width={1.25} />
      ))}
      {mains.map((y) => (
        <Ln key={y} x1={x0} y1={y} x2={x0 + 7 * cell} y2={y} width={3} />
      ))}
      {mains.flatMap((y) =>
        [1, 3, 5, 7].map((c) => (
          <rect key={`${y}-${c}`} x={x0 + c * cell - 4} y={y - 4} width={8} height={8} fill={C.paper} stroke={C.ink} strokeWidth={1.5} />
        )),
      )}
      <Txt x={x0 + cell * 1.5} y={big ? 144 : 126} anchor="middle" halo={false} k="tile">
        แผ่น
      </Txt>
      <Dim x1={56} y1={34} x2={56} y2={104} ext={-10} side="b" label="1.20 ม." />
      <Dim x1={x0} y1={18} x2={x0 + cell} y2={18} ext={12} label="0.60 ม." lx={x0 + cell + 8} ly={22} anchor="start" />
      <Ln x1={10} y1={194} x2={30} y2={194} width={3} />
      <Txt x={36} y={199} tone="soft">
        Main tee
      </Txt>
      <Ln x1={112} y1={194} x2={132} y2={194} width={1.25} />
      <Txt x={138} y={199} tone="soft">
        Cross tee
      </Txt>
      <rect x={222} y={190} width={8} height={8} fill={C.paper} stroke={C.ink} strokeWidth={1.5} />
      <Txt x={236} y={199} tone="soft">
        ลวดแขวน
      </Txt>
    </Svg>
  );
}

/** ฝ้ายิปซัมฉาบเรียบ: โครง C-Line ทุก 40 ซม. แผ่น 1.2 × 2.4 ม. (ceiling/gypsum) */
export function GypsumFrame() {
  const x0 = 50;
  const lines = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const hangers = [0, 67.5, 135, 202.5];
  return (
    <Svg title="ผังโครงฝ้ายิปซัมมองจากด้านบน โครง C-Line วางห่างกันทุก 40 เซนติเมตร แผ่นยิปซัมขนาด 1.2 คูณ 2.4 เมตร" h={206}>
      <Box x={x0} y={44} w={180} h={90} />
      <Ln x1={x0 - 10} y1={30} x2={x0 + 250} y2={30} line="hair" />
      <Ln x1={x0 - 10} y1={120} x2={x0 + 250} y2={120} line="hair" />
      {lines.map((i) => (
        <g key={i}>
          <Ln x1={x0 + i * 30} y1={20} x2={x0 + i * 30} y2={44} width={1.5} />
          <Ln x1={x0 + i * 30} y1={134} x2={x0 + i * 30} y2={150} width={1.5} />
          {i <= 6 ? (
            <line x1={x0 + i * 30} y1={44} x2={x0 + i * 30} y2={134} stroke={C.ink} strokeWidth={1.25} strokeDasharray="4 3" />
          ) : (
            <Ln x1={x0 + i * 30} y1={44} x2={x0 + i * 30} y2={134} width={1.5} />
          )}
        </g>
      ))}
      {[30, 120].flatMap((y) =>
        hangers.map((dx) => (
          <rect key={`${y}-${dx}`} x={x0 + dx - 4} y={y - 4} width={8} height={8} fill={C.paper} stroke={C.ink} strokeWidth={1.5} />
        )),
      )}
      <Txt x={x0 + 90} y={86} anchor="middle" halo={C.fill}>
        แผ่น 1.2 × 2.4 ม.
      </Txt>
      <Dim x1={x0} y1={162} x2={x0 + 30} y2={162} ext={-10} label="โครง C-Line ทุก 40 ซม." lx={x0 + 38} ly={166} anchor="start" />
      <rect x={x0} y={186} width={8} height={8} fill={C.paper} stroke={C.ink} strokeWidth={1.5} />
      <Txt x={x0 + 14} y={195} tone="soft">
        จุดแขวน ตารางประมาณ 1.2 × 0.9 ม.
      </Txt>
    </Svg>
  );
}

/** คิดทั้งงานฝ้า: เลือกภาพตามระบบฝ้าที่เลือก (ceiling/job) */
export function CeilingJob({ values }: DiagramProps) {
  return pick(values, "sys", "gyp") === "tbar" ? <TbarGrid values={{ tile: "60" }} /> : <GypsumFrame />;
}
