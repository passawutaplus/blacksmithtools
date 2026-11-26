"use client";

import { useId, useState } from "react";
import { ArrowLeftRight, Check, CircleAlert } from "lucide-react";
import type { Field, Values } from "@/lib/chang/types";
import { visibleFields } from "@/lib/chang/math";
import {
  draftMatchesValue,
  formatFieldNumber,
  parseNumberInput,
  toFieldValue,
} from "@/lib/chang/number-input";

/** id ของช่องกรอกใน DOM — ใช้พาไปช่องที่กรอกผิดจากการ์ดผลลัพธ์/แถบคำตอบ */
export function fieldDomId(key: string): string {
  return `chang-field-${key}`;
}

/** เลื่อนไปที่ช่องแล้วโฟกัส (ไม่เลื่อนซ้ำตอนโฟกัส กันจอกระตุก) */
export function focusField(key: string): void {
  const el = document.getElementById(fieldDomId(key));
  if (!el) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  el.focus({ preventScroll: true });
}

type SelectField = Extract<Field, { type: "select" }>;

type Group =
  | { kind: "swap"; from: SelectField; to: SelectField }
  | { kind: "pair"; a: Field; b: Field }
  | { kind: "single"; field: Field };

export function Fields({
  fields,
  values,
  onChange,
  errors,
}: {
  fields: Field[];
  values: Values;
  onChange: (next: Values) => void;
  errors?: Record<string, string>;
}) {
  const shown = visibleFields(fields, values);
  const groups = groupFields(shown);

  return (
    // แบ่งฟอร์มเป็นแถว ๆ ด้วยเส้นขั้น (divide-y) แต่ละแถวจัดกริดเองให้ชัดว่าเต็มบรรทัดหรือครึ่งบรรทัด
    // ป้องกันปัญหาช่องกว้างไม่เท่ากันจนเกิดช่องโหว่แบบเดิม
    <div className="divide-y divide-steel">
      {groups.map((group, i) => (
        <div
          key={groupKey(group)}
          className={`grid grid-cols-2 gap-x-3 gap-y-4 md:grid-cols-4 md:gap-x-4 ${i === 0 ? "pb-4" : "py-4"}`}
        >
          <GroupControl group={group} values={values} onChange={onChange} errors={errors} />
        </div>
      ))}
    </div>
  );
}

function groupKey(group: Group): string {
  if (group.kind === "swap") return `swap-${group.from.key}-${group.to.key}`;
  if (group.kind === "pair") return `pair-${group.a.key}-${group.b.key}`;
  return group.field.key;
}

/**
 * จัดฟิลด์เป็น "แถว" ล่วงหน้าฝั่ง JS แทนการปล่อยให้กริดไหลเอง
 * เพื่อไม่ให้เกิดครึ่งบรรทัดโหว่เวลาความกว้างของฟิลด์แต่ละแบบผสมกันไม่พอดีบรรทัด (Error ก่อนหน้า)
 *
 * กติกา: ฟิลด์ที่ "แคบพอ" 2 อันติดกันจับคู่อยู่บรรทัดเดียว (ครึ่ง–ครึ่ง)
 * ที่เหลือ (โดด ๆ, ตัวเลือกข้อความยาว, ข้อความ) กินเต็มบรรทัดเสมอ ไม่มีช่องว่างเหลือค้าง
 */
function groupFields(fields: Field[]): Group[] {
  const groups: Group[] = [];
  let i = 0;
  while (i < fields.length) {
    const field = fields[i];
    const next = fields[i + 1];

    if (field.type === "select" && next?.type === "select" && isSwapPair(field, next)) {
      groups.push({ kind: "swap", from: field, to: next });
      i += 2;
      continue;
    }

    if (next && isDesktopCompact(field) && isDesktopCompact(next)) {
      groups.push({ kind: "pair", a: field, b: next });
      i += 2;
      continue;
    }

    groups.push({ kind: "single", field });
    i += 1;
  }
  return groups;
}

function GroupControl({
  group,
  values,
  onChange,
  errors,
}: {
  group: Group;
  values: Values;
  onChange: (next: Values) => void;
  errors?: Record<string, string>;
}) {
  if (group.kind === "swap") {
    const { from, to } = group;
    return (
      <div className="col-span-2 min-w-0 md:col-span-4">
        <SwapPairControl
          fromField={from}
          toField={to}
          fromValue={values[from.key]}
          toValue={values[to.key]}
          onChangeFrom={(val) => onChange({ ...values, [from.key]: val })}
          onChangeTo={(val) => onChange({ ...values, [to.key]: val })}
          onSwap={() => onChange({ ...values, [from.key]: values[to.key], [to.key]: values[from.key] })}
        />
      </div>
    );
  }

  if (group.kind === "pair") {
    const { a, b } = group;
    // บนมือถือ จับคู่ครึ่ง–ครึ่งเฉพาะตัวเลขชื่อสั้น ที่เหลือกองซ้อนเต็มบรรทัดในแถวเดียวกัน (ไม่มีเส้นขั้นแทรกกลาง)
    const sideBySideOnMobile = isMobileCompact(a) && isMobileCompact(b);
    const mobileSpan = sideBySideOnMobile ? "col-span-1" : "col-span-2";
    return (
      <>
        <div className={`min-w-0 ${mobileSpan} md:col-span-2`}>
          <FieldControl
            field={a}
            value={values[a.key]}
            error={errors?.[a.key]}
            onChange={(val) => onChange({ ...values, [a.key]: val })}
          />
        </div>
        <div className={`min-w-0 ${mobileSpan} md:col-span-2`}>
          <FieldControl
            field={b}
            value={values[b.key]}
            error={errors?.[b.key]}
            onChange={(val) => onChange({ ...values, [b.key]: val })}
          />
        </div>
      </>
    );
  }

  const { field } = group;
  return (
    <div className="col-span-2 min-w-0 md:col-span-4">
      <FieldControl
        field={field}
        value={values[field.key]}
        error={errors?.[field.key]}
        onChange={(val) => onChange({ ...values, [field.key]: val })}
      />
    </div>
  );
}

/** สองช่องนี้เป็นคู่หน่วยต้นทาง → ปลายทาง ที่สลับกันได้ (from/to, fromArea/toArea, fromVol/toVol) */
function isSwapPair(a: Field | undefined, b: Field | undefined): boolean {
  if (!a || !b || a.type !== "select" || b.type !== "select") return false;
  if (!a.key.startsWith("from") || !b.key.startsWith("to")) return false;
  const fromSuffix = a.key === "from" ? "" : a.key.slice("from".length);
  const toSuffix = b.key === "to" ? "" : b.key.slice("to".length);
  return fromSuffix === toSuffix;
}

/** ฟิลด์ที่แคบพอจะอยู่ครึ่งบรรทัดบนจอ md ขึ้นไป (ตัวเลข/บูลีนแคบเสมอ ตัวเลือกที่ข้อความไม่ยาวเกินไปก็แคบได้) */
function isDesktopCompact(field: Field): boolean {
  if (field.type === "number" || field.type === "bool") return true;
  if (field.type === "select") {
    const longestOption = Math.max(...field.options.map((o) => o.label.length));
    return longestOption <= 36;
  }
  return false;
}

/** ฟิลด์ที่แคบพอจะจับคู่ครึ่งบรรทัดบนมือถือได้ ต้องเป็นตัวเลข ชื่อไม่ยาว และหน่วยสั้นพอที่จะไม่เบียดตัวเลข */
function isMobileCompact(field: Field): boolean {
  return field.type === "number" && field.label.length <= 16 && (field.unit?.length ?? 0) <= 6;
}

/** ปุ่มสลับ "จาก" ↔ "เป็น" แบบ Google Translate ใช้ร่วมกับทั้งฟอร์มทั่วไปและ UnitConverter */
export function SwapButton({ onClick, label = "สลับหน่วย" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[2px] border border-navy/30 bg-white text-navy transition-colors hover:border-navy hover:bg-navy hover:text-white"
    >
      <ArrowLeftRight className="h-4 w-4" aria-hidden />
    </button>
  );
}

function SwapPairControl({
  fromField,
  toField,
  fromValue,
  toValue,
  onChangeFrom,
  onChangeTo,
  onSwap,
}: {
  fromField: SelectField;
  toField: SelectField;
  fromValue: string | number | boolean | undefined;
  toValue: string | number | boolean | undefined;
  onChangeFrom: (v: string) => void;
  onChangeTo: (v: string) => void;
  onSwap: () => void;
}) {
  return (
    <div className="flex items-end gap-2">
      <label className="block min-w-0 flex-1">
        <span className="label">{fromField.label}</span>
        <select className="input" value={String(fromValue ?? fromField.default)} onChange={(e) => onChangeFrom(e.target.value)}>
          {fromField.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <SwapButton onClick={onSwap} />
      <label className="block min-w-0 flex-1">
        <span className="label">{toField.label}</span>
        <select className="input" value={String(toValue ?? toField.default)} onChange={(e) => onChangeTo(e.target.value)}>
          {toField.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function FieldControl({
  field,
  value,
  error,
  onChange,
}: {
  field: Field;
  value: string | number | boolean | undefined;
  error?: string;
  onChange: (v: string | number | boolean) => void;
}) {
  if (field.type === "bool") {
    const on = Boolean(value);
    return (
      <fieldset>
        <legend className="label">{field.label}</legend>
        <div className="grid grid-cols-2">
          <ToggleOption label="ไม่" selected={!on} onClick={() => onChange(false)} side="left" />
          <ToggleOption label="ใช่" selected={on} onClick={() => onChange(true)} side="right" />
        </div>
      </fieldset>
    );
  }

  if (field.type === "select") {
    return (
      <label className="block">
        <span className="label">{field.label}</span>
        <select
          id={fieldDomId(field.key)}
          className="input"
          value={String(value ?? field.default)}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "text") {
    return (
      <label className="block">
        <span className="label">{field.label}</span>
        <textarea
          id={fieldDomId(field.key)}
          className="input min-h-24 py-3"
          rows={3}
          placeholder={field.placeholder}
          value={String(value ?? field.default)}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  }

  return <NumberControl field={field} value={value} error={error} onChange={onChange} />;
}

/** ปุ่มเลือก ใช่/ไม่ — บอกสถานะด้วยเครื่องหมายถูก + aria-pressed ไม่ใช่สีอย่างเดียว */
function ToggleOption({
  label,
  selected,
  onClick,
  side,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  side: "left" | "right";
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex min-h-12 items-center justify-center gap-1.5 border px-3 text-sm font-semibold transition-colors ${
        side === "left" ? "rounded-l-[2px]" : "-ml-px rounded-r-[2px]"
      } ${
        selected
          ? "relative z-10 border-navy bg-navy text-white"
          : "border-navy/30 bg-white text-navy hover:border-navy"
      }`}
    >
      {selected ? <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden /> : null}
      {label}
    </button>
  );
}

type NumberField = Extract<Field, { type: "number" }>;

/**
 * ช่องตัวเลข — ใช้ type="text" + inputMode="decimal" แทน type="number"
 * เพราะ type="number" ทิ้งคอมมาและเลขไทยเงียบ ๆ ("4,5" กลายเป็น 45) ดูกติกาที่ number-input.ts
 */
function NumberControl({
  field,
  value,
  error,
  onChange,
}: {
  field: NumberField;
  value: string | number | boolean | undefined;
  error?: string;
  onChange: (v: string | number | boolean) => void;
}) {
  const uid = useId();
  const errorId = `${uid}-err`;
  const unitId = `${uid}-unit`;
  // ข้อความที่พิมพ์ค้างไว้ (เช่น "4." หรือ "๔,๕") — ใช้ต่อเมื่อยังหมายถึงค่าเดียวกับในฟอร์ม
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft !== null && draftMatchesValue(draft, value) ? draft : formatFieldNumber(value);
  const describedBy = [error ? errorId : null, field.unit ? unitId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label className="label" htmlFor={fieldDomId(field.key)}>
        {field.label}
      </label>
      <div className="chang-field" data-invalid={error ? "true" : undefined}>
        <input
          id={fieldDomId(field.key)}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          value={text}
          onChange={(e) => {
            setDraft(e.target.value);
            onChange(toFieldValue(parseNumberInput(e.target.value)));
          }}
          onBlur={() => {
            // ออกจากช่องแล้วแสดงค่าที่ระบบเข้าใจ ("4,5" → "4.5", "๓" → "3") ให้เห็นกับตาว่าคิดจากเลขอะไร
            if (draft !== null && parseNumberInput(draft).kind !== "invalid") setDraft(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        {field.unit ? (
          <span id={unitId} className="shrink-0 text-sm text-navy/75">
            {field.unit}
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium leading-snug text-forge">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
