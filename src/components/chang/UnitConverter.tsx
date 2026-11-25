"use client";

import { useId, useState } from "react";
import { CircleAlert } from "lucide-react";
import { convertLength } from "@/lib/chang/tools/general";
import { fmt } from "@/lib/chang/math";
import { parseNumberInput } from "@/lib/chang/number-input";
import { SwapButton } from "@/components/chang/Fields";

const UNITS = [
  { value: "mm", label: "มม." },
  { value: "cm", label: "ซม." },
  { value: "m", label: "ม." },
  { value: "in", label: "นิ้ว" },
  { value: "hun", label: "หุน" },
  { value: "ft", label: "ฟุต" },
] as const;

export function UnitConverter() {
  const uid = useId();
  const [text, setText] = useState("1");
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("ft");

  const parsed = parseNumberInput(text);
  const error =
    parsed.kind === "invalid"
      ? "ใส่เป็นตัวเลข เช่น 4.5"
      : parsed.kind === "number" && parsed.value < 0
        ? "ความยาวต้องไม่ติดลบ"
        : "";
  const y = parsed.kind === "number" && !error ? convertLength(parsed.value, from, to) : null;
  const toLabel = UNITS.find((u) => u.value === to)?.label;

  return (
    <section className="card p-4" aria-labelledby={`${uid}-title`}>
      <p className="chang-kicker">แปลงหน่วยด่วน</p>
      <h2 id={`${uid}-title`} className="mt-1 text-lg font-bold text-navy">
        ความยาวที่ใช้บนหน้างาน
      </h2>
      {/* จอกว้างจับทั้งแถว ค่า → จาก → เป็น → ผลลัพธ์ ให้อ่านไล่ซ้ายไปขวาได้จบในบรรทัดเดียว */}
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <label className="label" htmlFor={`${uid}-x`}>
            ค่า
          </label>
          <div className="chang-field" data-invalid={error ? "true" : undefined}>
            <input
              id={`${uid}-x`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${uid}-err` : undefined}
            />
          </div>
          {error ? (
            <p id={`${uid}-err`} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium leading-snug text-forge">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </p>
          ) : null}
        </div>
        <div className="col-span-2 flex items-end gap-2 md:col-span-2 md:self-start">
          <label className="min-w-0 flex-1">
            <span className="label">จาก</span>
            <select className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>
          <SwapButton
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
          />
          <label className="min-w-0 flex-1">
            <span className="label">เป็น</span>
            <select className="input" value={to} onChange={(e) => setTo(e.target.value)}>
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="col-span-2 md:col-span-1">
          <span className="label">เท่ากับ</span>
          <p className="flex min-h-12 items-center text-2xl font-bold text-navy tabular-nums" aria-live="polite">
            {y === null ? "—" : fmt(y, 4)}
            <span className="ml-1.5 text-base font-medium text-navy/75">{toLabel}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
