"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { Fields, defaultsFrom } from "@/components/chang/Fields";
import { FormulaNote } from "@/components/chang/FormulaNote";
import { ResultPanel } from "@/components/chang/ResultPanel";
import { loadFavorites, pushRecent, toggleFavorite } from "@/lib/chang/favorites";
import { invalidResult, validateFields } from "@/lib/chang/math";
import type { CalcResult, Field, Values } from "@/lib/chang/types";

function storageKey(path: string) {
  return `chang:vals:${path}`;
}

export function CalcScreen({
  crumbName,
  crumbTo,
  title,
  blurb,
  fields,
  calc,
  favPath,
}: {
  crumbName: string;
  crumbTo: string;
  title: string;
  blurb: string;
  fields: Field[];
  calc: (v: Values) => CalcResult;
  favPath?: string;
}) {
  const [values, setValues] = useState<Values>(() => defaultsFrom(fields));
  const [starred, setStarred] = useState(() => (favPath ? loadFavorites().includes(favPath) : false));
  const fieldErrors = useMemo(() => validateFields(fields, values), [fields, values]);
  const result = useMemo(() => {
    if (Object.keys(fieldErrors).length) {
      return invalidResult("กรอกค่าให้ครบและอยู่ในช่วงที่กำหนดก่อน", fieldErrors);
    }
    return calc(values);
  }, [calc, values, fieldErrors]);

  useEffect(() => {
    if (favPath) pushRecent(favPath);
  }, [favPath]);

  useEffect(() => {
    if (!favPath || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey(favPath));
      if (!raw) return;
      const saved = JSON.parse(raw) as Values;
      if (saved && typeof saved === "object") setValues({ ...defaultsFrom(fields), ...saved });
    } catch {
      /* ignore corrupt cache */
    }
  }, [favPath, fields]);

  useEffect(() => {
    if (!favPath || typeof window === "undefined") return;
    window.localStorage.setItem(storageKey(favPath), JSON.stringify(values));
  }, [favPath, values]);

  return (
    <div className="grid gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={crumbTo} className="text-sm text-muted hover:underline">
            {crumbName}
          </Link>
          <h1 className="mt-1 text-2xl font-bold leading-tight text-navy">{title}</h1>
          <p className="mt-1 text-sm text-muted">{blurb}</p>
        </div>
        {favPath ? (
          <button
            type="button"
            className="card p-3"
            aria-label={starred ? "เอาออกจากปักหมุด" : "ปักหมุดเครื่องมือนี้"}
            onClick={() => {
              const next = toggleFavorite(favPath);
              setStarred(next.includes(favPath));
            }}
          >
            <Star className={`h-5 w-5 ${starred ? "fill-forge text-forge" : "text-muted"}`} />
          </button>
        ) : null}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <Fields fields={fields} values={values} onChange={setValues} errors={fieldErrors} />
        <div className="lg:sticky lg:top-28">
          <ResultPanel title={title} result={result} />
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
