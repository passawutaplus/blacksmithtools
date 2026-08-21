"use client";

import { useEffect, useRef } from "react";
import { BookOpen, ChevronDown, ShieldAlert } from "lucide-react";
import { DISCLAIMER_C } from "@/lib/chang/constants";
import type { FormulaExplain } from "@/lib/chang/types";

const STORAGE_KEY = "chang:formula-open";

const RISK_LABEL: Record<FormulaExplain["risk"], string> = {
  A: "คิดผิดแล้วเสียเงินค่าของ",
  B: "คิดผิดแล้วงานต้องรื้อแก้",
  C: "เกี่ยวกับความปลอดภัย",
};

/** แปลงคำอธิบายสูตรเป็นข้อความ สำหรับปุ่ม "คัดลอกพร้อมสูตร" */
export function formulaToText(explain: FormulaExplain): string {
  const lines = ["", `สูตร: ${explain.summary}`];
  explain.steps.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.label}: ${s.subst ?? s.expr}`);
  });
  if (explain.constants?.length) {
    lines.push("ค่าคงที่:");
    explain.constants.forEach((k) => lines.push(`- ${k.label} = ${k.value} ${k.unit} (${k.source})`));
  }
  if (explain.caveats?.length) {
    lines.push("ข้อควรระวัง:");
    explain.caveats.forEach((a) => lines.push(`- ${a}`));
  }
  if (explain.risk === "C") lines.push(DISCLAIMER_C);
  return lines.join("\n");
}

export function FormulaNote({ explain }: { explain: FormulaExplain }) {
  const ref = useRef<HTMLDetailsElement>(null);

  // เปิดค้างไว้ตามที่ผู้ใช้เลือกครั้งก่อน สั่งที่ DOM ตรง ๆ เพื่อไม่ให้ชนกับ HTML ที่เรนเดอร์จากเซิร์ฟเวอร์
  useEffect(() => {
    if (ref.current && window.localStorage.getItem(STORAGE_KEY) === "1") ref.current.open = true;
  }, []);

  return (
    <div className="mt-3">
      {explain.risk === "C" ? (
        <p className="flex items-start gap-2 rounded-sm border border-forge/40 bg-forge/5 px-3 py-2 text-xs leading-relaxed text-navy">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-forge" aria-hidden />
          <span>{DISCLAIMER_C}</span>
        </p>
      ) : null}

      <details
        ref={ref}
        className="group mt-2 rounded-sm border border-steel bg-white"
        onToggle={(e) => window.localStorage.setItem(STORAGE_KEY, e.currentTarget.open ? "1" : "0")}
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold text-navy">
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-forge" aria-hidden />
            ดูสูตรที่ใช้คิด
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
        </summary>

        <div className="border-t border-steel px-3 py-3 text-sm">
          <p className="rounded-sm bg-navy px-3 py-2 font-mono text-xs leading-relaxed text-white tabular-nums">
            {explain.summary}
          </p>

          <ol className="mt-3 space-y-2.5">
            {explain.steps.map((step, i) => (
              <li key={step.label} className="flex gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-steel text-[11px] font-bold text-navy tabular-nums">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-navy">{step.label}</p>
                  <p className="font-mono text-xs leading-relaxed text-muted tabular-nums">{step.expr}</p>
                  {step.subst ? (
                    <p className="font-mono text-xs leading-relaxed font-medium text-navy tabular-nums">{step.subst}</p>
                  ) : null}
                  {step.note ? <p className="mt-0.5 text-xs leading-relaxed text-muted">{step.note}</p> : null}
                </div>
              </li>
            ))}
          </ol>

          {explain.constants?.length ? (
            <section className="mt-4">
              <h4 className="text-xs font-bold text-navy">📌 ค่าคงที่ที่ใช้ และที่มา</h4>
              <ul className="mt-1.5 space-y-1.5">
                {explain.constants.map((k) => (
                  <li key={k.label} className="text-xs leading-relaxed">
                    <span className="font-semibold text-navy">
                      {k.label} = {k.value.toLocaleString("th-TH")} {k.unit}
                    </span>
                    {k.range ? <span className="text-muted"> (ช่วงมาตรฐาน {k.range})</span> : null}
                    <span className="block text-muted">ที่มา: {k.source}</span>
                    {k.note ? <span className="block text-muted">{k.note}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {explain.assumptions?.length ? (
            <section className="mt-4">
              <h4 className="text-xs font-bold text-navy">🧭 สูตรนี้ตั้งสมมติฐานว่า</h4>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted">
                {explain.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {explain.caveats?.length ? (
            <section className="mt-4">
              <h4 className="text-xs font-bold text-forge">⚠️ ข้อควรระวัง</h4>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs leading-relaxed text-navy">
                {explain.caveats.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {explain.refs?.length ? (
            <section className="mt-4">
              <h4 className="text-xs font-bold text-navy">📚 อ้างอิง</h4>
              <ul className="mt-1.5 space-y-1 text-xs leading-relaxed">
                {explain.refs.map((r) =>
                  r.url ? (
                    <li key={r.label}>
                      <a
                        className="text-forge underline underline-offset-2"
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {r.label}
                      </a>
                    </li>
                  ) : (
                    <li key={r.label} className="text-muted">
                      {r.label}
                    </li>
                  ),
                )}
              </ul>
            </section>
          ) : null}

          <p className="mt-4 border-t border-steel pt-2 text-[11px] leading-relaxed text-muted">
            ระดับความเสี่ยง {explain.risk} · {RISK_LABEL[explain.risk]} · ทบทวนสูตรล่าสุด {explain.updatedAt}
          </p>
        </div>
      </details>
    </div>
  );
}
