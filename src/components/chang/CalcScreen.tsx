"use client";

import { useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { Fields, focusField } from "@/components/chang/Fields";
import { FormulaNote } from "@/components/chang/FormulaNote";
import { InfoButton } from "@/components/chang/InfoButton";
import { ResultPanel, type FieldIssue } from "@/components/chang/ResultPanel";
import { ToolDiagram } from "@/components/chang/diagrams/ToolDiagram";
import { useStoredRaw } from "@/components/chang/useStored";
import { FAV_KEY, parseFavorites, pushRecent, toggleFavorite } from "@/lib/chang/favorites";
import { invalidResult, validateFields, visibleFields } from "@/lib/chang/math";
import { describeInputs, mergeSavedValues, valuesStorageKey } from "@/lib/chang/saved-values";
import { writeStored } from "@/lib/chang/storage";
import type { CalcResult, Field, Values } from "@/lib/chang/types";

export function CalcScreen({
  crumbName,
  crumbTo,
  title,
  blurb,
  fields,
  calc,
  persistKey,
  favPath,
}: {
  crumbName: string;
  crumbTo: string;
  title: string;
  blurb: string;
  fields: Field[];
  calc: (v: Values) => CalcResult;
  /** คีย์สำหรับจำค่าที่กรอกไว้ในเครื่อง เช่น "hvac/btu" */
  persistKey: string;
  /** path ของเครื่องมือ — มีเมื่อปักหมุด/เข้า "ใช้ล่าสุด" ได้ */
  favPath?: string;
}) {
  // ค่าที่กรอกอยู่ใน store ภายนอก (localStorage + สำเนาในหน่วยความจำ) อ่านผ่าน useSyncExternalStore:
  // รอบ hydrate ได้ค่าเริ่มต้นตรงกับเซิร์ฟเวอร์ แล้วค่อยเปลี่ยนเป็นค่าที่จำไว้ — ไม่มีจังหวะที่ค่าเริ่มต้นไปเขียนทับของเดิม
  const storageKey = valuesStorageKey(persistKey);
  const savedRaw = useStoredRaw(storageKey);
  const values = useMemo(() => mergeSavedValues(fields, savedRaw), [fields, savedRaw]);
  const setValues = useCallback(
    (next: Values) => {
      writeStored(storageKey, JSON.stringify(next));
    },
    [storageKey],
  );

  const favRaw = useStoredRaw(FAV_KEY);
  const starred = favPath ? parseFavorites(favRaw).includes(favPath) : false;

  const fieldErrors = useMemo(() => validateFields(fields, values), [fields, values]);
  const result = useMemo(() => {
    if (Object.keys(fieldErrors).length) {
      return invalidResult("กรอกค่าให้ครบและอยู่ในช่วงที่กำหนดก่อน", fieldErrors);
    }
    return calc(values);
  }, [calc, values, fieldErrors]);

  const shownErrors = useMemo(() => ({ ...result.fieldErrors, ...fieldErrors }), [result.fieldErrors, fieldErrors]);
  const issues = useMemo<FieldIssue[]>(
    () =>
      visibleFields(fields, values)
        .filter((f) => shownErrors[f.key])
        .map((f) => ({ key: f.key, label: f.label, message: shownErrors[f.key] })),
    [fields, values, shownErrors],
  );
  const inputs = useMemo(() => describeInputs(fields, values), [fields, values]);

  useEffect(() => {
    if (favPath) pushRecent(favPath);
  }, [favPath]);

  return (
    <div className="grid gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <nav aria-label="ตำแหน่งหน้า" className="-ml-1 flex flex-wrap items-center text-sm text-navy/70">
            <Link href="/assistant" className="inline-flex min-h-11 items-center px-1 underline-offset-4 hover:text-navy hover:underline">
              ผู้ช่วยงานช่าง
            </Link>
            <ChevronRight className="h-4 w-4 shrink-0 text-navy/40" aria-hidden />
            <Link href={crumbTo} className="inline-flex min-h-11 items-center px-1 font-medium text-navy underline-offset-4 hover:underline">
              {crumbName}
            </Link>
          </nav>
          {/* คำโปรยกับหลักคิดย้ายเข้าปุ่ม i — หัวหน้าเหลือแค่ชื่อเครื่องมือ */}
          <div className="flex items-start gap-1">
            <h1 className="min-w-0 pt-1.5 text-2xl font-bold leading-tight text-navy">{title}</h1>
            <InfoButton title={title}>
              <p>{blurb}</p>
              {result.explain && !result.invalid ? (
                <p className="mt-3 border-t border-navy/15 pt-3">
                  <span className="font-semibold text-navy">หลักคิด: </span>
                  {result.explain.summary}
                </p>
              ) : null}
              {result.explain ? (
                <p className="mt-3 text-[0.8125rem] text-navy/70">สูตรเต็มทุกบรรทัดอยู่ที่ “ดูสูตรที่ใช้คิด” ท้ายหน้า</p>
              ) : null}
            </InfoButton>
          </div>
        </div>
        {favPath ? (
          <button
            type="button"
            aria-pressed={starred}
            className={`mt-1 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[2px] border px-3 text-sm font-semibold transition-colors ${
              starred ? "border-navy bg-navy text-white" : "border-navy/30 bg-white text-navy hover:border-navy"
            }`}
            onClick={() => toggleFavorite(favPath)}
          >
            <Star className={`h-4 w-4 shrink-0 ${starred ? "fill-white" : ""}`} aria-hidden />
            {starred ? "ปักหมุดแล้ว" : "ปักหมุด"}
          </button>
        ) : null}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <div className="grid min-w-0 gap-5">
          <ToolDiagram path={persistKey} values={values} />
          <Fields fields={fields} values={values} onChange={setValues} errors={shownErrors} />
        </div>
        <div className="lg:sticky lg:top-28">
          <ResultPanel
            title={title}
            subtitle={crumbName}
            fileSlug={persistKey}
            result={result}
            issues={issues}
            inputs={inputs}
            onFixField={focusField}
          />
        </div>
      </div>
      {result.explain ? (
        <section className="card p-4">
          <FormulaNote explain={result.explain} />
        </section>
      ) : null}
    </div>
  );
}
