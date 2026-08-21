"use client";

import { ArrowLeftRight } from "lucide-react";
import type { Field, Values } from "@/lib/chang/types";
import { visibleFields } from "@/lib/chang/math";

export function defaultsFrom(fields: Field[]): Values {
  const v: Values = {};
  for (const f of fields) {
    v[f.key] = f.default;
  }
  return v;
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
      className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-steel bg-white text-navy transition hover:border-navy/30 hover:bg-navy/5 hover:text-forge active:scale-95"
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
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`min-h-11 rounded px-3 py-2 text-sm font-semibold ${
              !on ? "bg-navy text-white" : "border border-steel bg-white text-navy"
            }`}
            onClick={() => onChange(false)}
          >
            ไม่
          </button>
          <button
            type="button"
            className={`min-h-11 rounded px-3 py-2 text-sm font-semibold ${
              on ? "bg-navy text-white" : "border border-steel bg-white text-navy"
            }`}
            onClick={() => onChange(true)}
          >
            ใช่
          </button>
        </div>
      </fieldset>
    );
  }

  if (field.type === "select") {
    return (
      <label className="block">
        <span className="label">{field.label}</span>
        <select
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
          className="input min-h-24 py-3"
          rows={3}
          placeholder={field.placeholder}
          value={String(value ?? field.default)}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  }

  return (
    <label className="block">
      <span className="label">{field.label}</span>
      <span className={`flex items-center gap-2 rounded border bg-white px-3 ${error ? "border-forge" : "border-[#d1d5db]"}`}>
        <input
          type="number"
          inputMode="decimal"
          className="min-h-11 w-full bg-transparent text-base outline-none"
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={value === undefined || value === "" ? "" : Number(value)}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          aria-invalid={Boolean(error)}
        />
        {field.unit ? <span className="shrink-0 text-sm text-muted">{field.unit}</span> : null}
      </span>
      {error ? <span className="mt-1 block text-xs text-forge">{error}</span> : null}
    </label>
  );
}
