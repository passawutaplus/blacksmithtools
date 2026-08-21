/** แสดงช่องนี้เมื่อค่าของช่องอื่นตรงเงื่อนไข — ใช้ซ่อนช่องที่ไม่เกี่ยวกับโหมดที่เลือก */
export type FieldWhen = { key: string; is: string | string[] };

export type Field =
  | {
      type: "number";
      key: string;
      label: string;
      unit?: string;
      min?: number;
      max?: number;
      step?: number;
      default: number;
      when?: FieldWhen;
    }
  | {
      type: "select";
      key: string;
      label: string;
      default: string;
      options: { value: string; label: string }[];
      when?: FieldWhen;
    }
  | {
      type: "bool";
      key: string;
      label: string;
      default: boolean;
      when?: FieldWhen;
    }
  | {
      type: "text";
      key: string;
      label: string;
      placeholder?: string;
      default: string;
      when?: FieldWhen;
    };

export type ResultRow = {
  label: string;
  value: string;
  emphasize?: boolean;
};

/**
 * ระดับความเสี่ยงของสูตร — กำหนดว่าต้องมีคำเตือนระดับไหน
 * A = คิดผิดแล้วเสียเงิน (ซื้อของขาด/เกิน)
 * B = คิดผิดแล้วระบบเสียหาย ต้องรื้อแก้
 * C = คิดผิดแล้วกระทบความปลอดภัย/โครงสร้าง ต้องมีผู้มีใบอนุญาตตรวจ
 */
export type RiskTier = "A" | "B" | "C";

/** ค่าคงที่ที่ใช้ในสูตร ต้องมีแหล่งอ้างอิงติดมาด้วยเสมอ */
export type ConstRef = {
  value: number;
  unit: string;
  label: string;
  source: string;
  range?: string;
  note?: string;
};

export type FormulaStep = {
  label: string;
  /** สูตรเชิงสัญลักษณ์ เช่น "A = กว้าง × ยาว" */
  expr: string;
  /** แทนค่าจริงจากที่ผู้ใช้กรอก เช่น "A = 4 × 5 = 20 ตร.ม." */
  subst?: string;
  note?: string;
};

export type FormulaExplain = {
  summary: string;
  steps: FormulaStep[];
  constants?: ConstRef[];
  assumptions?: string[];
  caveats?: string[];
  refs?: { label: string; url?: string }[];
  risk: RiskTier;
  /** YYYY-MM-DD ของการทบทวนล่าสุด */
  updatedAt: string;
};

export type ChartTone = "good" | "warn" | "bad" | "accent" | "mute";

/**
 * กราฟประกอบผลลัพธ์ — เก็บเป็นข้อมูลล้วน ไม่ผูกกับการวาด
 * เลือกชนิดตาม "เรื่องที่ต้องเล่า" ไม่ใช่ตามความสวย ผลลัพธ์ที่เป็นเลขเดี่ยวไม่ต้องมีกราฟ
 */
export type ChartSpec =
  /** ไต่ขั้นของขนาดที่ขายจริง เห็นว่าที่เลือกอยู่ตรงไหนและขั้นถัดไปห่างแค่ไหน */
  | {
      kind: "steps";
      unit: string;
      /** เส้นประ "ต้องได้ไม่น้อยกว่านี้" */
      need?: number;
      needLabel?: string;
      items: { label: string; value: number; state: "under" | "chosen" | "over" }[];
    }
  /** ค่าเทียบเกณฑ์ที่มีโซนผ่าน-เฉียด-เกิน */
  | {
      kind: "threshold";
      unit: string;
      value: number;
      max: number;
      zones: { upTo: number; tone: ChartTone; label?: string }[];
    }
  /** ของก้อนเดียวแยกเป็นส่วน ๆ หรือตัวเลขนี้โตมาจากอะไร */
  | {
      kind: "stack";
      parts: { label: string; value: number; display: string; tone?: ChartTone }[];
      totalLabel?: string;
      totalDisplay?: string;
    }
  /** ของที่ซื้อเป็นใบ/กล่อง เห็นใบสุดท้ายว่าใช้ไปเท่าไหร่ */
  | {
      kind: "packs";
      unitLabel: string;
      count: number;
      /** สัดส่วนที่ใช้จริงของใบสุดท้าย 0–1 */
      lastUsed?: number;
      note?: string;
    };

export type CalcResult = {
  headline?: string;
  rows: ResultRow[];
  tip: string;
  copyText: string;
  explain?: FormulaExplain;
  chart?: ChartSpec;
  /** true เมื่ออินพุตไม่สมเหตุผล — ห้ามเอาตัวเลขไปสั่งของ */
  invalid?: boolean;
  fieldErrors?: Record<string, string>;
};

export type Values = Record<string, string | number | boolean>;

export type ToolDef = {
  id: string;
  name: string;
  blurb: string;
  fields: Field[];
  calc: (v: Values) => CalcResult;
  /** คำพ้องหน้างาน สำหรับค้นหา เช่น "ทับหลัง", "แรงดันตก" */
  keywords?: string[];
};

export type JobDef = {
  name: string;
  blurb: string;
  fields: Field[];
  calc: (v: Values) => CalcResult;
};

export type Trade = {
  id: string;
  name: string;
  short: string;
  pillarId: string;
  blurb: string;
  tools: ToolDef[];
  job?: JobDef;
};

export type Pillar = {
  id: string;
  name: string;
  blurb: string;
};
