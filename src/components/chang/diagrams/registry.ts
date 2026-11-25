import type { ComponentType } from "react";
import type { DiagramProps } from "./primitives";
import { CeilingJob, GypsumFrame, TbarGrid } from "./ceiling";
import { CableCircuit, SolarString, VDrop } from "./electrical";
import { Pythagoras, Shapes } from "./general";
import { FrameCut, GlassDrill, SealantJoint } from "./glass";
import { AnchorTypes, DrawerFronts, HingeCup, Stair } from "./handyman";
import { ChargeRun, PipeRun, RoomBtu, ShSc } from "./hvac";
import { BrickWall, ConcreteMix, Lintel, Plaster } from "./masonry";
import { DrainSlope, PumpHead, TankSizing } from "./plumbing";
import { Gutter, RidgeHip, RoofMaterial, RoofPitch } from "./roof";
import { BeamDeflection, CutPlan, SteelSection, WeldJoint } from "./steel";
import { GroutJoint, TileLayout, TrowelNotch } from "./tile";

export type DiagramEntry = {
  Diagram: ComponentType<DiagramProps>;
  /** บรรทัดเดียว: ภาพนี้คือภาพอะไร */
  caption: string;
  /** 1–2 บรรทัดสั้น ๆ: ต้องวัดอะไร วัดตรงไหน */
  notes: string[];
};

const roomBtu: DiagramEntry = {
  Diagram: RoomBtu,
  caption: "วัดห้องสามด้าน: กว้าง ยาว และสูงถึงฝ้า",
  notes: ["วัดจากผนังถึงผนังด้านใน สูงวัดจากพื้นถึงฝ้า", "แดดเข้าห้อง = ผนังหรือกระจกด้านที่โดนแดดตรง ๆ"],
};

const cableCircuit: DiagramEntry = {
  Diagram: CableCircuit,
  caption: "จากตู้ไฟถึงโหลด และวิธีเดินสายสองแบบ",
  notes: ["กระแสโหลดคือกระแสที่เครื่องใช้จริง ดูจากป้ายเครื่อง", "เลือกวิธีเดินสายให้ตรงกับหน้างาน ท่อฝังระบายความร้อนได้น้อยกว่า"],
};

const tileLayout: DiagramEntry = {
  Diagram: TileLayout,
  caption: "ผังห้องกับลายปู แผ่นริมห้องคือแผ่นที่ต้องตัด",
  notes: ["วัดกว้างและยาวห้องจากผนังถึงผนัง", "ลายที่ต้องตัดแผ่นมาก ยิ่งต้องเผื่อเสียมาก"],
};

const brickWall: DiagramEntry = {
  Diagram: BrickWall,
  caption: "ขนาดผนัง ช่องที่ต้องหัก และความหนาปูนก่อ",
  notes: ["วัดกว้างและสูงของผนังทั้งผืน แล้วหักพื้นที่ประตูหน้าต่างรวมกัน", "ความหนาปูนก่อคือชั้นปูนระหว่างก้อนอิฐ"],
};

const roofPitch: DiagramEntry = {
  Diagram: RoofPitch,
  caption: "กว้างแปลนวัดแนวราบ ผิวหลังคาจริงยาวกว่า",
  notes: ["กว้างและยาวแปลนวัดแนวราบเหมือนมองจากด้านบน รวมชายคา", "ความชัน % = ยกขึ้นกี่หน่วยต่อระยะราบ 100 หน่วย"],
};

const steelSection: DiagramEntry = {
  Diagram: SteelSection,
  caption: "ตัวเลขขนาดหน้าตัดแต่ละตัวคือระยะไหน",
  notes: ["ขนาดหน้าตัดเป็นมิลลิเมตร ความยาวเป็นเมตร", "H และ W: เลขแรกคือความสูง เลขหลังคือความกว้างปีก"],
};

const frameCut: DiagramEntry = {
  Diagram: FrameCut,
  caption: "ขนาดช่องและวิธีตัดมุมเฟรม",
  notes: ["กว้างและสูงช่องวัดที่ขอบนอกของเฟรม", "ชน 90°: ด้านตั้งสั้นลงเท่าหน้าตัดเฟรมสองข้าง"],
};

const gypsumFrame: DiagramEntry = {
  Diagram: GypsumFrame,
  caption: "โครงฝ้ายิปซัมฉาบเรียบ มองจากด้านบน",
  notes: ["โครง C-Line วางห่างกันทุก 40 ซม. ตลอดความกว้างห้อง", "วัดกว้างและยาวห้องจากผนังถึงผนัง"],
};

/**
 * ทะเบียนภาพประกอบ คีย์เป็น "tradeId/toolId" หรือ "tradeId/job" ตรงกับ catalog.ts
 * เครื่องมือที่ไม่มีในนี้จะไม่มีภาพ (ไม่วาดดีกว่าวาดผิด) — มีเทสต์เช็กว่าทุกคีย์ชี้ไปเครื่องมือที่มีจริง
 */
export const DIAGRAMS: Record<string, DiagramEntry> = {
  /* ───── ช่างแอร์ ───── */
  "hvac/btu": roomBtu,
  "hvac/job": roomBtu,
  "hvac/shsc": {
    Diagram: ShSc,
    caption: "จุดต่อเกจ (P) และจุดหนีบเทอร์โมมิเตอร์ (T)",
    notes: [
      "หนีบเทอร์โมมิเตอร์บนท่อใกล้จุดที่ต่อเกจ แล้วพันฉนวนคลุมหัววัด",
      "ท่อดูดคือเส้นใหญ่ที่หุ้มฉนวน ตำแหน่งพอร์ตฝั่งของเหลวต่างกันตามรุ่น",
    ],
  },
  "hvac/pipe": {
    Diagram: PipeRun,
    caption: "ระยะเดินท่อ วัดตามแนวท่อจริง",
    notes: ["วัดไล่ตามท่อจากคอยล์เย็นถึงคอยล์ร้อน รวมช่วงเลี้ยวและช่วงขึ้นลง", "ต่างระดับมาก ๆ ให้เช็กข้อจำกัดในคู่มือรุ่น"],
  },
  "hvac/charge": {
    Diagram: ChargeRun,
    caption: "เติมน้ำยาเพิ่มเฉพาะระยะท่อที่เกินมาตรฐานรุ่น",
    notes: ["ระยะมาตรฐานรุ่นดูจากคู่มือหรือป้ายเครื่อง", "ท่อสั้นกว่าหรือเท่าระยะมาตรฐาน ไม่ต้องเติมเพิ่ม"],
  },

  /* ───── ช่างไฟและโซลาร์ ───── */
  "electrical/cable": cableCircuit,
  "electrical/job": cableCircuit,
  "electrical/vdrop": {
    Diagram: VDrop,
    caption: "ระยะสาย วัดเที่ยวเดียวจากตู้ไฟถึงโหลด",
    notes: ["วัดตามแนวเดินสายจริง ไม่ใช่ระยะเส้นตรง", "ไม่ต้องคูณสองเอง ระบบ 1 เฟสเครื่องคิดสายไป-กลับให้แล้ว"],
  },
  "electrical/string": {
    Diagram: SolarString,
    caption: "แผงต่ออนุกรมเป็นหนึ่งสตริง เข้าช่อง MPPT",
    notes: ["Voc และ Vmp ดูจากป้ายหลังแผง เป็นค่าของแผงเดียว", "ช่วงแรงดันเครื่องดูจากสเปกอินเวอร์เตอร์"],
  },

  /* ───── ช่างประปา ───── */
  "plumbing/pump": {
    Diagram: PumpHead,
    caption: "เฮดรวม = ความสูงที่ส่ง + แรงเสียดทานในท่อ",
    notes: ["ความสูงที่ส่งวัดแนวดิ่งจากระดับน้ำในถังถึงจุดจ่ายน้ำสูงสุด", "ท่อยาว ข้องอเยอะ ให้บวกเฮดเผื่อเพิ่ม"],
  },
  "plumbing/slope": {
    Diagram: DrainSlope,
    caption: "ความลาดท่อ = ปลายท่อต่ำลงเท่าไรต่อความยาว",
    notes: ["ความยาวท่อวัดแนวราบจากต้นท่อถึงปลายท่อ", "ระยะตกวัดแนวดิ่ง เทียบกับเส้นระดับที่ต้นท่อ"],
  },
  "plumbing/tank": {
    Diagram: TankSizing,
    caption: "ขนาดถัง = น้ำที่ใช้ต่อวัน × จำนวนวันที่สำรอง",
    notes: ["นับจำนวนคนที่อยู่ประจำในบ้าน", "อยากมีน้ำใช้ตอนน้ำไม่ไหลกี่วัน ใส่เป็นวันสำรอง"],
  },

  /* ───── ช่างปูกระเบื้อง ───── */
  "tile/qty": tileLayout,
  "tile/job": tileLayout,
  "tile/grout": {
    Diagram: GroutJoint,
    caption: "ร่องยาแนว: กว้างเท่าร่อง ลึกเท่าความหนาแผ่น",
    notes: ["ร่องยาแนวคือระยะห่างระหว่างแผ่น วัดเป็นมิลลิเมตร", "หนาแผ่นดูจากข้างกล่องกระเบื้อง"],
  },
  "tile/adhesive": {
    Diagram: TrowelNotch,
    caption: "ขนาดร่องฟันเกรียงหวีกำหนดปริมาณปูนกาว",
    notes: ["เลือกขนาดเกรียงตามที่ใช้จริง ฟันใหญ่ใช้ปูนกาวมากกว่า", "แผ่นใหญ่ใช้เกรียงฟันใหญ่ขึ้น"],
  },

  /* ───── ช่างก่ออิฐฉาบปูน ───── */
  "masonry/brick": brickWall,
  "masonry/mortar": brickWall,
  "masonry/job": brickWall,
  "masonry/lintel": {
    Diagram: Lintel,
    caption: "ทับหลังยาวกว่าช่องเปิด เพราะต้องฝังเข้าผนังสองข้าง",
    notes: ["กว้างช่องวัดระหว่างขอบในของช่องเปิด", "ภาพบอกตำแหน่งที่วัด ขนาดและเหล็กจริงต้องให้ผู้มีใบอนุญาตตรวจ"],
  },
  "masonry/plaster": {
    Diagram: Plaster,
    caption: "ชั้นปูนฉาบบนผนัง ฉาบด้านเดียวหรือสองด้าน",
    notes: ["ฉาบทั้งด้านในและด้านนอกให้ใส่ 2 ด้าน", "ความหนาฉาบเปลี่ยนตามชนิดฉาบที่เลือก"],
  },
  "masonry/mix": {
    Diagram: ConcreteMix,
    caption: "สัดส่วนผสมนับตามปริมาตร ไม่ใช่น้ำหนัก",
    notes: ["ตวงปูน ทราย หิน ด้วยถังหรือกระบะใบเดียวกัน", "ภาพบอกวิธีตวง งานโครงสร้างต้องใช้สัดส่วนตามแบบ"],
  },

  /* ───── ช่างหลังคาและรางน้ำ ───── */
  "roof/area": roofPitch,
  "roof/job": roofPitch,
  "roof/fastener": roofPitch,
  "roof/material": {
    Diagram: RoofMaterial,
    caption: "กว้างคลุมคือระยะที่แผ่นคลุมได้จริงหลังซ้อนลอน",
    notes: ["เมทัลชีท: ใส่กว้างคลุมจากสเปกแผ่น ไม่ใช่ความกว้างแผ่นเต็ม", "กระเบื้องลอน: วัดกว้างและยาวแปลนแนวราบ รวมชายคา"],
  },
  "roof/gutter": {
    Diagram: Gutter,
    caption: "รางน้ำรับน้ำจากผิวหลังคาที่ไหลลงมา",
    notes: ["กว้างรางวัดที่ปากราง ขนาดท่อลงคือเส้นผ่านศูนย์กลางท่อ", "หลังคายิ่งใหญ่ น้ำยิ่งมาก ต้องใช้รางและท่อลงมากขึ้น"],
  },
  "roof/ridge": {
    Diagram: RidgeHip,
    caption: "สันอยู่กลางหลังคา ตะเข้สันวิ่งลงไปที่มุมชายคา",
    notes: ["ยาวสันวัดตามแนวสันบนสุด", "ยาวตะเข้วัดตามแนวเอียงจริงของแต่ละเส้น แล้วนับจำนวนเส้น"],
  },

  /* ───── ช่างเหล็กและงานเชื่อม ───── */
  "steel/weight": steelSection,
  "steel/job": steelSection,
  "steel/weld": {
    Diagram: WeldJoint,
    caption: "z คือขาเชื่อมของ Fillet หรือความลึกของร่อง",
    notes: ["Fillet: วัดขาเชื่อมจากมุมออกไปตามผิวเหล็ก", "V-groove และ Square: วัดความลึกของร่อง มักเท่าความหนาแผ่น"],
  },
  "steel/deflection": {
    Diagram: BeamDeflection,
    caption: "คานช่วงเดียว รับโหลดกระจาย โก่งมากสุดที่กลางช่วง",
    notes: ["ช่วงคาน L วัดระหว่างกึ่งกลางจุดรองรับสองปลาย", "ภาพบอกตำแหน่งที่วัด งานโครงสร้างต้องให้วิศวกรคำนวณยืนยัน"],
  },
  "steel/cut": {
    Diagram: CutPlan,
    caption: "ทุกรอยตัดกินเนื้อเหล็กเท่าความหนาใบตัด",
    notes: ["ยาววัตถุดิบคือความยาวเหล็กหนึ่งเส้นที่ซื้อมา", "เผื่อตัดดูจากความหนาใบตัดที่ใช้"],
  },

  /* ───── ช่างกระจกและอลูมิเนียม ───── */
  "glass/cut": frameCut,
  "glass/job": frameCut,
  "glass/hardware": {
    Diagram: GlassDrill,
    caption: "ระยะจากขอบกระจกถึงจุดเจาะหรือบาก",
    notes: ["วัดจากขอบกระจกเข้ามาถึงจุดเจาะ ทั้งด้านบนและด้านล่าง", "ตำแหน่งจริงยึดตามสเปกฮาร์ดแวร์ และเจาะที่โรงงานเท่านั้น"],
  },
  "glass/sealant": {
    Diagram: SealantJoint,
    caption: "ร่องซิลิโคน: กว้างร่อง × ลึกยา",
    notes: ["กว้างร่องคือช่องว่างระหว่างสองวัสดุ ลึกยาคือความหนาของเนื้อซิลิโคน", "เส้นรอบร่องคือความยาวรวมทุกด้านที่ต้องยิง"],
  },

  /* ───── ช่างฝ้าและกันเสียง ───── */
  "ceiling/tbar": {
    Diagram: TbarGrid,
    caption: "โครงฝ้าทีบาร์ มองจากด้านบน",
    notes: ["Main tee วางตามแนวยาวห้อง ห่างกัน 1.20 ม.", "Cross tee วางขวาง ห่างกัน 0.60 ม."],
  },
  "ceiling/gypsum": gypsumFrame,
  "ceiling/job": {
    Diagram: CeilingJob,
    caption: "โครงฝ้าตามระบบที่เลือก มองจากด้านบน",
    notes: ["วัดกว้างและยาวห้องจากผนังถึงผนัง", "ระยะโครงในภาพเป็นระยะมาตรฐานที่ใช้คิดจำนวน"],
  },

  /* ───── ช่างติดตั้งและบิ้วอิน ───── */
  "handyman/hinge": {
    Diagram: HingeCup,
    caption: "ระยะจากขอบบานถึงขอบรูถ้วย และระบบบานสามแบบ",
    notes: ["วัดจากขอบบานฝั่งบานพับถึงขอบรูถ้วย", "ระบบบานดูว่าบานปิดทับข้างตู้เต็ม ครึ่งเดียว หรือฝังอยู่ในตู้"],
  },
  "handyman/drawer": {
    Diagram: DrawerFronts,
    caption: "ช่องเปิดรวม แบ่งเป็นหน้าบานเท่ากัน มีร่องคั่น",
    notes: ["สูงช่องเปิดวัดจากขอบบนหน้าบานแรกถึงขอบล่างหน้าบานสุดท้าย", "ร่องระหว่างบานคือช่องว่างระหว่างหน้าบานสองใบ"],
  },
  "handyman/stair": {
    Diagram: Stair,
    caption: "ลูกตั้ง R คือความสูงขั้น ลูกนอน T คือความลึกขั้น",
    notes: ["สูงพื้นถึงพื้นวัดแนวดิ่งจากผิวพื้นล่างถึงผิวพื้นบน", "ภาพบอกตำแหน่งที่วัด แบบก่อสร้างจริงต้องเป็นไปตามกฎหมายอาคาร"],
  },
  "handyman/screw": {
    Diagram: AnchorTypes,
    caption: "พุกต้องจับเนื้อผนังส่วนที่รับแรงได้",
    notes: ["น้ำหนักคือน้ำหนักรวมของของที่แขวน แบ่งให้ทุกจุดยึด", "ไม่แน่ใจชนิดผนังให้เจาะรูนำเล็ก ๆ ดูเนื้อผนังก่อน"],
  },

  /* ───── เครื่องมือทั่วไป ───── */
  "general/geometry": {
    Diagram: Shapes,
    caption: "ช่อง ก ข และ สูง คือระยะไหนของรูปที่เลือก",
    notes: ["วงกลมใส่เส้นผ่านศูนย์กลาง ส่วนทรงกระบอกและกรวยใส่รัศมี", "สูงวัดตั้งฉากกับฐานเสมอ ไม่ใช่วัดตามแนวเอียง"],
  },
  "general/triangle": {
    Diagram: Pythagoras,
    caption: "สามเหลี่ยมมุมฉาก: สองด้านฉากกับด้านทแยง",
    notes: ["ด้านทแยงคือด้านยาวสุด อยู่ตรงข้ามมุมฉาก", "ใช้จับฉากหน้างาน: วัด 3 กับ 4 แล้วทแยงต้องได้ 5"],
  },
};

export function getDiagram(path: string): DiagramEntry | undefined {
  return Object.prototype.hasOwnProperty.call(DIAGRAMS, path) ? DIAGRAMS[path] : undefined;
}
