"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { BookOpen, ChevronDown, Compass, Library, Pin, ShieldAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { DISCLAIMER_C } from "@/lib/chang/constants";
import { safeGet, safeSet } from "@/lib/chang/storage";
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

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="mt-4 border-t border-navy/15 pt-3">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
        <Icon className="h-4 w-4 shrink-0 text-forge" aria-hidden />
        {title}
      </h4>
      {children}
    </section>
  );
}

export function FormulaNote({ explain }: { explain: FormulaExplain }) {
  const ref = useRef<HTMLDetailsElement>(null);

  // เปิดค้างไว้ตามที่ผู้ใช้เลือกครั้งก่อน สั่งที่ DOM ตรง ๆ เพื่อไม่ให้ชนกับ HTML ที่เรนเดอร์จากเซิร์ฟเวอร์
  // อ่าน/เขียนผ่าน safeGet/safeSet — เครื่องที่บล็อก storage แค่จำสถานะไม่ได้ หน้าไม่พัง
  useEffect(() => {
    if (ref.current && safeGet(STORAGE_KEY) === "1") ref.current.open = true;
  }, []);

  return (
    <div>
      {explain.risk === "C" ? (
        <p className="mb-3 flex items-start gap-2 border border-forge/50 bg-white px-3 py-2.5 text-[0.8125rem] leading-relaxed text-navy">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-forge" aria-hidden />
          <span>{DISCLAIMER_C}</span>
        </p>
      ) : null}

      <details
        ref={ref}
        className="group rounded-[2px] border border-navy/25 bg-white"
        onToggle={(e) => {
          safeSet(STORAGE_KEY, e.currentTarget.open ? "1" : "0");
        }}
      >
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold text-navy">
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-forge" aria-hidden />
            ดูสูตรที่ใช้คิด
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-navy/60 transition-transform group-open:rotate-180" aria-hidden />
        </summary>

        <div className="border-t border-navy/15 px-3 py-3 text-sm">
          <p className="bg-navy px-3 py-2.5 font-mono text-[0.8125rem] leading-relaxed text-white tabular-nums">
            {explain.summary}
          </p>

          <ol className="mt-3 divide-y divide-navy/10">
            {explain.steps.map((step, i) => (
              <li key={`${i}:${step.label}`} className="flex gap-3 py-2.5">
                <span
                  className="font-latin mt-px flex h-6 w-6 shrink-0 items-center justify-center border border-navy/30 text-xs font-semibold text-navy tabular-nums"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy">{step.label}</p>
                  <p className="font-mono text-[0.8125rem] leading-relaxed text-navy/75 tabular-nums">{step.expr}</p>
                  {step.subst ? (
                    <p className="font-mono text-[0.8125rem] font-medium leading-relaxed text-navy tabular-nums">
                      {step.subst}
                    </p>
                  ) : null}
                  {step.note ? <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-navy/75">{step.note}</p> : null}
                </div>
              </li>
            ))}
          </ol>

          {explain.constants?.length ? (
            <Section icon={Pin} title="ค่าคงที่ที่ใช้ และที่มา">
              <ul className="mt-1.5 space-y-2">
                {explain.constants.map((k, i) => (
                  <li key={`${i}:${k.label}`} className="text-[0.8125rem] leading-relaxed">
                    <span className="font-semibold text-navy">
                      {k.label} = {k.value.toLocaleString("th-TH")} {k.unit}
                    </span>
                    {k.range ? <span className="text-navy/75"> (ช่วงมาตรฐาน {k.range})</span> : null}
                    <span className="block text-navy/75">ที่มา: {k.source}</span>
                    {k.note ? <span className="block text-navy/75">{k.note}</span> : null}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {explain.assumptions?.length ? (
            <Section icon={Compass} title="สูตรนี้ตั้งสมมติฐานว่า">
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[0.8125rem] leading-relaxed text-navy/80">
                {explain.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </Section>
          ) : null}

          {explain.caveats?.length ? (
            <Section icon={TriangleAlert} title="ข้อควรระวัง">
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[0.8125rem] leading-relaxed text-navy">
                {explain.caveats.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </Section>
          ) : null}

          {explain.refs?.length ? (
            <Section icon={Library} title="อ้างอิง">
              <ul className="mt-1.5 space-y-1 text-[0.8125rem] leading-relaxed">
                {explain.refs.map((r, i) =>
                  r.url ? (
                    <li key={`${i}:${r.label}`}>
                      <a
                        className="inline-flex min-h-11 items-center text-navy underline decoration-forge decoration-2 underline-offset-4 hover:text-forge"
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {r.label}
                      </a>
                    </li>
                  ) : (
                    <li key={`${i}:${r.label}`} className="text-navy/75">
                      {r.label}
                    </li>
                  ),
                )}
              </ul>
            </Section>
          ) : null}

          <p className="mt-4 border-t border-navy/15 pt-2.5 text-xs leading-relaxed text-navy/75">
            ระดับความเสี่ยง {explain.risk} · {RISK_LABEL[explain.risk]} · ทบทวนสูตรล่าสุด {explain.updatedAt}
          </p>
        </div>
      </details>
    </div>
  );
}
