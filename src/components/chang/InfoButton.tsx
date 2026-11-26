"use client";

import { useId, useRef, type ReactNode } from "react";
import { Info, X } from "lucide-react";

/**
 * ปุ่ม "i" เปิดป๊อปอัปคำอธิบาย — ใช้แทนย่อหน้าอธิบายที่ไม่ต้องเห็นตลอด หน้าจะได้เหลือแต่ของที่ต้องใช้
 *
 * ใช้ <dialog> ของเบราว์เซอร์ (showModal): ได้กับดักโฟกัส ปิดด้วย Esc และคืนโฟกัสให้ปุ่มเองโดยไม่ต้องเขียนเพิ่ม
 * มือถือขึ้นเป็นแผ่นจากขอบล่าง จอกว้างขึ้นกลางจอ · กดพื้นหลังเพื่อปิดได้
 * ห้ามเอาคำเตือนความปลอดภัยไปซ่อนในนี้ทั้งก้อน — ต้องมีบรรทัดสั้นให้เห็นบนหน้าเสมอ
 */
export function InfoButton({
  title,
  children,
  label,
  tone = "light",
  className = "",
}: {
  /** หัวป๊อปอัป และใช้เป็นชื่อปุ่มสำหรับโปรแกรมอ่านจอ */
  title: string;
  children: ReactNode;
  /** ข้อความข้างไอคอน (ไม่ใส่ = ไอคอนอย่างเดียว) */
  label?: string;
  /** "navy" เมื่อวางบนพื้นกรมท่า */
  tone?: "light" | "navy";
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const onNavy = tone === "navy";

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={label ? undefined : `คำอธิบาย: ${title}`}
        className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-[2px] text-sm font-semibold underline-offset-4 ${
          label ? "px-1" : "min-w-11"
        } ${onNavy ? "text-white/85 hover:text-white" : "text-navy/70 hover:text-navy"} ${
          label ? "hover:underline" : ""
        } ${className}`}
        onClick={() => ref.current?.showModal()}
      >
        <Info className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
        {label ? <span>{label}</span> : null}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        className="chang-info m-0 mt-auto max-h-[85dvh] w-full max-w-none overflow-hidden rounded-t-[3px] border border-navy/25 bg-white p-0 text-navy backdrop:bg-navy/55 sm:m-auto sm:w-[calc(100%-2rem)] sm:max-w-lg sm:rounded-[3px]"
        onClick={(e) => {
          // คลิกโดนพื้นหลัง (ตัว dialog เอง ไม่ใช่เนื้อหาข้างใน) = ปิด
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-navy/15 py-1 pl-4 pr-1">
            <h2 id={titleId} className="flex items-center gap-2 py-2.5 text-base font-bold leading-snug">
              <Info className="h-4 w-4 shrink-0 text-forge" aria-hidden />
              {title}
            </h2>
            <button
              type="button"
              aria-label="ปิด"
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center text-navy/70 hover:text-navy"
              onClick={() => ref.current?.close()}
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div
            className="overflow-y-auto px-4 pb-5 pt-3 text-sm leading-relaxed text-navy/85"
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
          >
            {children}
          </div>
        </div>
      </dialog>
    </>
  );
}

/** รายการข้อในป๊อปอัป — ขีดสีสนิมหน้าข้อ แบบเดียวกับโน้ตใต้ภาพประกอบ */
export function InfoList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-[0.65em] h-px w-2 shrink-0 bg-forge" aria-hidden />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}
