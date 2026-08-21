"use client";

import { useMemo, useState } from "react";
import { convertLength } from "@/lib/chang/tools/general";
import { fmt } from "@/lib/chang/math";
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
  const [x, setX] = useState(1);
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("ft");
  const y = useMemo(() => convertLength(x || 0, from, to), [x, from, to]);

  return (
    <section className="card p-4">
      <p className="text-xs font-semibold text-forge">แปลงหน่วยด่วน</p>
      <h2 className="mt-1 text-lg font-bold text-navy">ความยาวที่ใช้บนหน้างาน</h2>
      {/* จอกว้างจับทั้งแถว ค่า → จาก → เป็น → ผลลัพธ์ ให้อ่านไล่ซ้ายไปขวาได้จบในบรรทัดเดียว */}
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <label className="col-span-2 block md:col-span-1">
          <span className="label">ค่า</span>
          <input
            type="number"
            inputMode="decimal"
            className="input"
            value={x}
            min={0}
            step={0.001}
            onChange={(e) => setX(Number(e.target.value))}
          />
        </label>
        <div className="col-span-2 flex items-end gap-2 md:col-span-2">
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
          <p className="flex min-h-11 items-center text-2xl font-bold text-navy">
            {fmt(y, 4)}
            <span className="ml-1.5 text-base font-medium text-muted">
              {UNITS.find((u) => u.value === to)?.label}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
