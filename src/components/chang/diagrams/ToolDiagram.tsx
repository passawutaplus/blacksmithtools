"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Ruler } from "lucide-react";
import { writeStored } from "../../../lib/chang/storage";
import { useStoredRaw } from "../useStored";
import { ActiveFieldContext, type DiagramProps } from "./primitives";
import { getDiagram } from "./registry";

/** จำว่าผู้ใช้พับภาพประกอบไว้หรือไม่ (ค่าเดียวใช้ทุกเครื่องมือ) — "0" = พับ, อย่างอื่น = เปิด */
export const DIAGRAM_OPEN_KEY = "chang:diagram-open";
const FIELD_ID_PREFIX = "chang-field-";

/** คีย์ของช่องกรอกที่กำลังโฟกัส อ่านจาก id ของช่อง (chang-field-<key>) — ไม่ต้องแก้ฟอร์ม */
function useFocusedFieldKey(): string | null {
  const [key, setKey] = useState<string | null>(null);
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const id = e.target instanceof HTMLElement ? e.target.id : "";
      setKey(id.startsWith(FIELD_ID_PREFIX) ? id.slice(FIELD_ID_PREFIX.length) : null);
    };
    const onFocusOut = () => setKey(null);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);
  return key;
}

/**
 * ภาพประกอบของเครื่องมือ วางเหนือฟอร์ม: บอกว่าแต่ละช่องคือระยะไหนของงานจริง
 * เปิดไว้ตั้งแต่ครั้งแรก พับได้ และจำสถานะไว้ในเครื่อง — เครื่องมือที่ไม่มีภาพจะไม่เรนเดอร์อะไรเลย
 */
export function ToolDiagram({ path, values }: { path: string; values: DiagramProps["values"] }) {
  const entry = getDiagram(path);
  const stored = useStoredRaw(DIAGRAM_OPEN_KEY);
  const focused = useFocusedFieldKey();
  if (!entry) return null;
  const open = stored !== "0";
  const { Diagram, caption, notes } = entry;

  return (
    <details
      className="group rounded-[2px] border border-navy/25 bg-white"
      open={open}
      onToggle={(e) => {
        const next = e.currentTarget.open;
        if (next !== open) writeStored(DIAGRAM_OPEN_KEY, next ? "1" : "0");
      }}
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold text-navy [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <Ruler className="h-4 w-4 shrink-0 text-forge" aria-hidden />
          ดูภาพประกอบ
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-navy/60 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <figure className="border-t border-navy/15 md:flex md:items-start md:gap-5 md:p-4">
        <div className="w-full shrink-0 text-navy md:max-w-[400px]">
          <ActiveFieldContext.Provider value={focused}>
            <Diagram values={values} />
          </ActiveFieldContext.Provider>
        </div>
        <figcaption className="border-t border-navy/15 px-3 py-3 md:min-w-0 md:border-l md:border-t-0 md:py-1 md:pl-5 md:pr-0">
          <p className="text-sm font-semibold leading-snug text-navy">{caption}</p>
          <ul className="mt-1.5 space-y-1 text-[0.8125rem] leading-relaxed text-navy/75">
            {notes.map((note) => (
              <li key={note} className="flex gap-2">
                <span className="mt-[0.6em] h-px w-2 shrink-0 bg-forge" aria-hidden />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </figcaption>
      </figure>
    </details>
  );
}
