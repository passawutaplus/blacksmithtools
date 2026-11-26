"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { ArrowDown, ArrowUp, Check, CircleAlert, Copy, Share2, ShieldAlert } from "lucide-react";
import type { CalcResult } from "@/lib/chang/types";
import { DISCLAIMER_C } from "@/lib/chang/constants";
import { withBrandCredit } from "@/lib/chang/brand";
import { copyText, shareText } from "@/lib/chang/share";
import { ExportPanel } from "./ExportPanel";
import { InfoButton } from "./InfoButton";
import { formulaToText } from "./FormulaNote";
import { ResultChart } from "./ResultChart";

/** ช่องที่กรอกผิด — ใช้บอกในการ์ดผลและพาไปแก้ */
export type FieldIssue = { key: string; label: string; message: string };

type Notice =
  | { kind: "ok"; text: string }
  | { kind: "manual"; text: string; payload: string }
  | { kind: "error"; text: string };

export function ResultPanel({
  title,
  subtitle,
  result,
  issues = [],
  inputs = [],
  fileSlug,
  onFixField,
}: {
  title: string;
  subtitle?: string;
  /** รหัสเครื่องมือ (เช่น "hvac/btu") ใช้ตั้งชื่อไฟล์ที่ส่งออก */
  fileSlug?: string;
  result: CalcResult;
  issues?: FieldIssue[];
  inputs?: { label: string; value: string }[];
  onFixField?: (key: string) => void;
}) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [copied, setCopied] = useState<"" | "plain" | "formula">("");
  const cardRef = useRef<HTMLElement>(null);
  const manualRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const invalid = Boolean(result.invalid);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function flash(next: Notice, mark: "" | "plain" | "formula" = "") {
    window.clearTimeout(timer.current);
    setNotice(next);
    setCopied(mark);
    // ข้อความ "ทำเองด้วยมือ" ต้องค้างไว้ให้ผู้ใช้เลือกข้อความได้ ที่เหลือหายเองใน 4 วินาที
    if (next.kind !== "manual") {
      timer.current = window.setTimeout(() => {
        setNotice(null);
        setCopied("");
      }, 4000);
    }
  }

  function showManual(payload: string) {
    flash({ kind: "manual", text: "เครื่องนี้คัดลอกอัตโนมัติไม่ได้ — กดค้างที่ข้อความด้านล่างแล้วเลือก “คัดลอก”", payload });
    window.setTimeout(() => {
      manualRef.current?.focus();
      manualRef.current?.select();
    }, 50);
  }

  async function onCopy(withFormula: boolean) {
    // เครดิตแบรนด์ + ลิงก์ go ต่อท้ายเสมอ (บรรทัดเดียว) — ตัวผลลัพธ์และสูตรไม่ถูกแก้
    const text = withBrandCredit(
      withFormula && result.explain ? result.copyText + formulaToText(result.explain) : result.copyText,
    );
    if (await copyText(text)) {
      flash(
        { kind: "ok", text: withFormula ? "คัดลอกผลพร้อมสูตรแล้ว — วางในแชตได้เลย" : "คัดลอกแล้ว — วางในแชตได้เลย" },
        withFormula ? "formula" : "plain",
      );
    } else {
      showManual(text);
    }
  }

  async function onShare() {
    const text = withBrandCredit(result.copyText);
    const outcome = await shareText(title, text);
    if (outcome === "shared") flash({ kind: "ok", text: "ส่งต่อแล้ว" });
    else if (outcome === "copied")
      flash({ kind: "ok", text: "เครื่องนี้เปิดหน้าต่างแชร์ไม่ได้ จึงคัดลอกข้อความให้แทนแล้ว — วางในแชตได้เลย" }, "plain");
    else if (outcome === "failed") showManual(text);
  }

  return (
    <>
      <MobileAnswerBar
        headline={result.headline}
        invalid={invalid}
        issues={issues}
        targetRef={cardRef}
        onFixField={onFixField}
      />
      {/* @container: การ์ดนี้ถูกใช้ทั้งเต็มความกว้างและในแถบข้างแคบ ๆ ปุ่มจึงต้องดูความกว้างของการ์ดเอง ไม่ใช่ของจอ */}
      <section
        ref={cardRef}
        aria-label="ผลคำนวณ"
        className="@container scroll-mt-24 rounded-[3px] border border-navy bg-white"
      >
        {/* หัวการ์ด: สถานะ + คำตอบ อยู่ใน live region ให้โปรแกรมอ่านจอประกาศเมื่อคำตอบเปลี่ยน */}
        <div className="flex items-start justify-between gap-2 border-b border-navy/15 pb-3.5 pl-4 pr-2 pt-3">
          <div className="min-w-0" aria-live="polite" aria-atomic="true">
            <p className={`chang-kicker ${invalid ? "text-forge" : ""}`}>{invalid ? "ยังคิดไม่ได้" : "คิดให้แล้ว"}</p>
            {result.headline ? (
              <h2 className="mt-1.5 text-xl font-bold leading-snug text-navy">{result.headline}</h2>
            ) : null}
          </div>
          {/* เกร็ดหน้างานพับไว้ในปุ่ม i · ตอนคิดไม่ได้ เกร็ดคือวิธีแก้ จึงโชว์เต็มด้านล่างแทน */}
          {!invalid && result.tip ? (
            <InfoButton title="ข้อควรรู้" label="ข้อควรรู้" className="-mt-2.5">
              <p>{result.tip}</p>
            </InfoButton>
          ) : null}
        </div>

        <div className="px-4 pb-4">
          {invalid && issues.length > 0 ? (
            <div className="mt-3.5">
              <p className="text-sm font-semibold text-navy">ช่องที่ต้องแก้ ({issues.length})</p>
              <ul className="mt-1.5 divide-y divide-navy/10 border-y border-navy/15">
                {issues.map((issue) => (
                  <li key={issue.key}>
                    <button
                      type="button"
                      className="group flex min-h-11 w-full items-center gap-2.5 py-2 text-left"
                      onClick={() => onFixField?.(issue.key)}
                    >
                      <CircleAlert className="h-4 w-4 shrink-0 text-forge" aria-hidden />
                      <span className="min-w-0 flex-1 text-sm leading-snug">
                        <span className="font-semibold text-navy">{issue.label}</span>
                        <span className="text-navy/80"> — {issue.message}</span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-navy underline underline-offset-4 group-hover:text-forge">
                        ไปแก้
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* คำเตือนงานความปลอดภัย: บรรทัดสั้นต้องเห็นเสมอ ข้อความเต็มอยู่ในปุ่ม i */}
          {result.explain?.risk === "C" && !invalid ? (
            <div className="mt-2 flex items-center justify-between gap-2 border-l-[3px] border-forge py-0.5 pl-2.5">
              <p className="flex items-center gap-2 text-[0.8125rem] font-medium leading-snug text-navy">
                <ShieldAlert className="h-4 w-4 shrink-0 text-forge" aria-hidden />
                ค่าเบื้องต้น ต้องให้ผู้มีใบอนุญาตตรวจก่อนทำ
              </p>
              <InfoButton title="ค่าเบื้องต้น ไม่ใช่แบบรับรอง">
                <p>{DISCLAIMER_C}</p>
              </InfoButton>
            </div>
          ) : null}

          {result.chart ? <ResultChart spec={result.chart} /> : null}

          {result.rows.length > 0 ? (
            <dl className="mt-3 divide-y divide-navy/10 border-y border-navy/15">
              {result.rows.map((row, i) => (
                <div key={`${i}:${row.label}`} className="flex items-start justify-between gap-3 py-2.5">
                  <dt className="text-sm text-navy/75">{row.label}</dt>
                  <dd
                    className={`text-right text-sm tabular-nums text-navy ${row.emphasize ? "font-bold" : "font-medium"}`}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {invalid && result.tip ? (
            <p className="mt-3 border-l-[3px] border-navy/30 bg-[#f1f3f5] px-3 py-2.5 text-sm leading-relaxed text-navy">
              {result.tip}
            </p>
          ) : null}

          {invalid ? null : (
            <>
              {/* ปุ่มหลักคือ "คัดลอก" (ช่างส่งข้อความเข้าแชตบ่อยสุด) · ส่งออกเป็นไฟล์รวมอยู่กลุ่มเดียวด้านล่าง */}
              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <button type="button" className="btn btn-navy px-3 text-sm" onClick={() => void onCopy(false)}>
                  {copied === "plain" ? (
                    <Check className="h-4 w-4 shrink-0" aria-hidden />
                  ) : (
                    <Copy className="h-4 w-4 shrink-0" aria-hidden />
                  )}
                  {copied === "plain" ? "คัดลอกแล้ว" : "คัดลอก"}
                </button>
                <button type="button" className="btn btn-secondary px-4 text-sm" onClick={() => void onShare()}>
                  <Share2 className="h-4 w-4 shrink-0" aria-hidden />
                  แชร์ข้อความ
                </button>
              </div>
              {result.explain ? (
                <button
                  type="button"
                  className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-left text-sm font-semibold text-navy underline decoration-forge decoration-2 underline-offset-4 hover:text-forge"
                  onClick={() => void onCopy(true)}
                >
                  {copied === "formula" ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
                  {copied === "formula" ? "คัดลอกพร้อมสูตรแล้ว" : "คัดลอกพร้อมสูตร"}
                </button>
              ) : null}
              <ExportPanel
                title={title}
                subtitle={subtitle}
                fileSlug={fileSlug}
                result={result}
                inputs={inputs}
                onNotice={(next) => flash(next)}
              />
            </>
          )}

          {/* สถานะคัดลอก/แชร์/บันทึก — role=status ให้โปรแกรมอ่านจอประกาศ และค้างบนจอให้คนเห็น */}
          <div role="status" aria-live="polite" className={notice ? "mt-2" : ""}>
            {notice ? (
              <p
                className={`flex items-start gap-2 border px-3 py-2.5 text-sm font-medium leading-snug text-navy ${
                  notice.kind === "ok" ? "border-navy/25 bg-[#f1f3f5]" : "border-forge bg-white"
                }`}
              >
                {notice.kind === "ok" ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-navy" strokeWidth={2.5} aria-hidden />
                ) : (
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-forge" aria-hidden />
                )}
                <span>{notice.text}</span>
              </p>
            ) : null}
          </div>
          {notice?.kind === "manual" ? (
            <div className="mt-2">
              <label className="sr-only" htmlFor="chang-manual-copy">
                ข้อความผลคำนวณสำหรับคัดลอกเอง
              </label>
              <textarea
                id="chang-manual-copy"
                ref={manualRef}
                readOnly
                rows={6}
                className="input py-2.5 font-mono text-[0.8125rem] leading-relaxed"
                value={notice.payload}
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-navy underline underline-offset-4"
                onClick={() => setNotice(null)}
              >
                ปิดข้อความ
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

/**
 * แถบคำตอบติดขอบล่างสำหรับมือถือ
 *
 * ฟอร์มหน้างานบางตัวมี 8–9 ช่อง กรอกถึงช่องท้าย ๆ แล้วการ์ดผลลัพธ์ยังอยู่ใต้จอ
 * แถบนี้โผล่เฉพาะตอนที่การ์ดอยู่ "ใต้" จอ ให้เห็นคำตอบขยับตามที่กรอกและกดกระโดดไปดูเต็ม ๆ ได้
 * ถ้ากรอกผิด แถบต้องบอกว่ายังคิดไม่ได้ และปุ่มพาไปช่องแรกที่ผิด — ห้ามขึ้น "คิดให้แล้ว"
 */
function MobileAnswerBar({
  headline,
  invalid,
  issues,
  targetRef,
  onFixField,
}: {
  headline?: string;
  invalid: boolean;
  issues: FieldIssue[];
  targetRef: RefObject<HTMLElement | null>;
  onFixField?: (key: string) => void;
}) {
  const [below, setBelow] = useState(false);

  useEffect(() => {
    const el = targetRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      // การ์ดอยู่ใต้จอ = ขอบบนของการ์ดเลยขอบล่างของพื้นที่มองเห็น (เลื่อนเลยการ์ดไปแล้วไม่ต้องโชว์แถบ)
      setBelow(!entry.isIntersecting && entry.boundingClientRect.top > 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [targetRef]);

  const visible = Boolean(headline) && below;

  // บอกปุ่มแชทลอยของร้านว่าขอบล่างมีแถบนี้อยู่ ให้ขยับขึ้นไปอยู่เหนือแถบ (กติกาอยู่ใน globals.css)
  useEffect(() => {
    if (!visible) return;
    const root = document.documentElement;
    root.dataset.changAnswerBar = "1";
    return () => {
      delete root.dataset.changAnswerBar;
    };
  }, [visible]);

  if (!visible || !headline) return null;

  const first = issues[0];
  const fixable = invalid && first && onFixField;
  const summary = invalid
    ? first
      ? issues.length > 1
        ? `ต้องแก้ ${issues.length} ช่อง เริ่มที่ “${first.label}”`
        : `“${first.label}” ${first.message}`
      : headline
    : headline;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-navy bg-white px-4 pt-2.5 sm:hidden"
      style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-between gap-3 text-left"
        onClick={() => {
          if (fixable) onFixField(first.key);
          else targetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      >
        <span className="min-w-0">
          <span className={`flex items-center gap-1.5 text-[0.8125rem] font-semibold ${invalid ? "text-forge" : "text-navy/75"}`}>
            {invalid ? <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
            {invalid ? "ยังคิดไม่ได้" : "คิดให้แล้ว"}
          </span>
          <span className="line-clamp-2 text-sm font-bold leading-snug text-navy">{summary}</span>
        </span>
        <span className={`btn btn-sm shrink-0 ${invalid ? "btn-secondary" : "btn-navy"}`}>
          {fixable ? "ไปช่องที่ผิด" : "ดูคำตอบ"}
          {fixable ? <ArrowUp className="h-4 w-4" aria-hidden /> : <ArrowDown className="h-4 w-4" aria-hidden />}
        </span>
      </button>
    </div>
  );
}
