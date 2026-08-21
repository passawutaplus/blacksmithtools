"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { ArrowDown, Copy, ImageDown, Share2 } from "lucide-react";
import type { CalcResult } from "@/lib/chang/types";
import { DISCLAIMER_C } from "@/lib/chang/constants";
import { copyText, downloadResultPng, shareText } from "@/lib/chang/share";
import { formulaToText } from "./FormulaNote";
import { ResultChart } from "./ResultChart";

export function ResultPanel({ title, result }: { title: string; result: CalcResult }) {
  const [copied, setCopied] = useState<"" | "plain" | "formula">("");
  const cardRef = useRef<HTMLElement>(null);

  async function onCopy(withFormula: boolean) {
    const text = withFormula && result.explain ? result.copyText + formulaToText(result.explain) : result.copyText;
    const ok = await copyText(text);
    if (ok) {
      setCopied(withFormula ? "formula" : "plain");
      window.setTimeout(() => setCopied(""), 1600);
    }
  }

  return (
    <>
      <MobileAnswerBar headline={result.headline} targetRef={cardRef} />
      {/* @container: การ์ดนี้ถูกใช้ทั้งเต็มความกว้างและในแถบข้างแคบ ๆ ปุ่มจึงต้องดูความกว้างของการ์ดเอง ไม่ใช่ของจอ */}
      <section ref={cardRef} className="card @container border-navy p-4">
        <p className="text-xs font-semibold text-forge">{result.invalid ? "ยังคิดไม่ได้" : "คิดให้แล้ว"}</p>
        {result.explain?.risk === "C" && !result.invalid ? (
          <p className="mt-2 rounded border border-forge/40 bg-forge/5 px-3 py-2 text-xs leading-relaxed text-navy">
            {DISCLAIMER_C}
          </p>
        ) : null}
        {result.headline ? (
          <h2 className="mt-1 text-xl font-bold leading-snug text-navy">{result.headline}</h2>
        ) : null}
        {result.chart ? <ResultChart spec={result.chart} /> : null}
        <dl className="mt-3 divide-y divide-steel">
          {result.rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-3 py-2.5">
              <dt className="text-sm text-muted">{row.label}</dt>
              <dd className={`text-right text-sm text-navy ${row.emphasize ? "font-bold" : "font-medium"}`}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 rounded bg-steel px-3 py-2 text-sm leading-relaxed text-muted">{result.tip}</p>
        {result.invalid ? null : (
        <div className="mt-4 grid grid-cols-2 gap-2 @[26rem]:grid-cols-3">
          <button
            type="button"
            className="btn btn-navy col-span-2 px-3 text-sm @[26rem]:col-span-1"
            onClick={() => void onCopy(false)}
          >
            <Copy className="h-4 w-4 shrink-0" aria-hidden />
            {copied === "plain" ? "คัดลอกแล้ว" : "คัดลอก"}
          </button>
          <button
            type="button"
            className="btn btn-secondary px-3 text-sm"
            onClick={() => void shareText(title, result.copyText)}
          >
            <Share2 className="h-4 w-4 shrink-0" aria-hidden />
            แชร์
          </button>
          <button
            type="button"
            className="btn btn-secondary px-3 text-sm"
            onClick={() =>
              downloadResultPng({
                title,
                headline: result.headline,
                rows: result.rows,
                tip: result.tip,
                disclaimer: result.explain?.risk === "C" ? DISCLAIMER_C : undefined,
              })
            }
          >
            <ImageDown className="h-4 w-4 shrink-0" aria-hidden />
            บันทึกรูป
          </button>
        </div>
        )}
        {result.explain && !result.invalid ? (
          <button
            type="button"
            className="mt-2 min-h-11 text-left text-xs font-semibold text-forge underline underline-offset-2"
            onClick={() => void onCopy(true)}
          >
            {copied === "formula" ? "คัดลอกพร้อมสูตรแล้ว" : "คัดลอกพร้อมสูตร (ส่งให้ช่างอีกคน)"}
          </button>
        ) : null}
      </section>
    </>
  );
}

/**
 * แถบคำตอบติดขอบล่างสำหรับมือถือ
 *
 * ฟอร์มหน้างานบางตัวมี 8–9 ช่อง กรอกถึงช่องท้าย ๆ แล้วการ์ดผลลัพธ์หลุดจอไปแล้ว
 * แถบนี้โผล่เฉพาะตอนที่การ์ดไม่อยู่ในสายตา ให้เห็นคำตอบขยับตามที่กรอกและกดกระโดดไปดูเต็ม ๆ ได้
 */
function MobileAnswerBar({
  headline,
  targetRef,
}: {
  headline?: string;
  targetRef: RefObject<HTMLElement | null>;
}) {
  const [offScreen, setOffScreen] = useState(false);

  useEffect(() => {
    const el = targetRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setOffScreen(!entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, [targetRef]);

  if (!headline || !offScreen) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-steel bg-white/95 px-4 pt-2.5 backdrop-blur sm:hidden"
      style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between gap-3 text-left"
        onClick={() => targetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold text-forge">คิดให้แล้ว</span>
          <span className="block truncate text-sm font-bold text-navy">{headline}</span>
        </span>
        <span className="btn btn-navy btn-sm shrink-0">
          ดูคำตอบ
          <ArrowDown className="h-4 w-4" aria-hidden />
        </span>
      </button>
    </div>
  );
}
