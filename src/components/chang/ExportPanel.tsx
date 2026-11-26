"use client";

import { useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";
import { ChevronDown, ClipboardList, FileDown, ImageDown, Send } from "lucide-react";
import type { CalcResult } from "@/lib/chang/types";
import { DISCLAIMER_C } from "@/lib/chang/constants";
import {
  canShareFiles,
  downloadSheetPdf,
  downloadSheetPng,
  preloadExportAssets,
  shareSheetImage,
} from "@/lib/chang/export-file";
import { orderCandidates, pickOrderItems } from "@/lib/chang/order-rows";
import type { SheetDoc } from "@/lib/chang/sheet";

export type ExportNotice = { kind: "ok" | "error"; text: string };

type SheetKind = "result" | "order";
type Action = "png" | "pdf" | "share";

/* เครื่องนี้ส่งไฟล์รูปผ่านหน้าต่างแชร์ได้ไหม — ค่าคงที่ตลอดการใช้งาน อ่านครั้งเดียวหลัง hydrate */
let shareSupport: boolean | undefined;
const subscribeNever = () => () => {};
const readShareSupport = () => (shareSupport ??= canShareFiles());
const serverShareSupport = () => false;

/**
 * ส่งออกผลคำนวณเป็นไฟล์: รูป PNG · PDF A4 · ส่งรูปเข้าแชต — เลือกได้ว่าจะเป็นแผ่น "ผลคำนวณ" หรือ "ใบสั่งของ"
 * ใบสั่งของมีให้เฉพาะเครื่องมือที่ผลลัพธ์มีของที่ต้องซื้อ (ดู order-rows.ts)
 */
export function ExportPanel({
  title,
  subtitle,
  fileSlug,
  result,
  inputs,
  onNotice,
}: {
  title: string;
  subtitle?: string;
  fileSlug?: string;
  result: CalcResult;
  inputs: { label: string; value: string }[];
  onNotice: (notice: ExportNotice) => void;
}) {
  const id = useId();
  const [wanted, setWanted] = useState<SheetKind>("result");
  const [jobName, setJobName] = useState("");
  const [customer, setCustomer] = useState("");
  /** สิ่งที่ผู้ใช้ติ๊กเพิ่ม/เอาออกเอง ทับชุดที่เลือกให้อัตโนมัติ */
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<Action | "">("");
  const shareable = useSyncExternalStore(subscribeNever, readShareSupport, serverShareSupport);

  const candidates = useMemo(() => orderCandidates(result.rows), [result.rows]);
  const hasOrder = candidates.some((c) => c.selected);
  const kind: SheetKind = hasOrder ? wanted : "result";
  const items = useMemo(() => pickOrderItems(candidates, overrides), [candidates, overrides]);

  // โหลดโลโก้/QR รอไว้ตอนเครื่องว่าง — กดส่งออกแล้วได้ไฟล์ทันที และ "ส่งรูปเข้าแชต" ไม่หลุดช่วงเวลาที่เบราว์เซอร์ยอมให้เปิดหน้าต่างแชร์
  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(() => preloadExportAssets());
      return () => window.cancelIdleCallback(handle);
    }
    const timer = window.setTimeout(preloadExportAssets, 600);
    return () => window.clearTimeout(timer);
  }, []);

  function buildDoc(): SheetDoc {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1";
    const common = {
      title,
      subtitle,
      fileSlug,
      inputs,
      disclaimer: result.explain?.risk === "C" ? DISCLAIMER_C : undefined,
      url: isLocal ? undefined : `${window.location.host}${window.location.pathname}`,
    };
    if (kind === "order") return { ...common, kind: "order", items, jobName, customer };
    return { ...common, headline: result.headline, rows: result.rows, tip: result.tip };
  }

  async function run(action: Action) {
    if (busy) return;
    if (kind === "order" && items.length === 0) {
      onNotice({ kind: "error", text: "ยังไม่ได้เลือกรายการลงใบสั่งของ — ติ๊กอย่างน้อย 1 รายการก่อน" });
      return;
    }
    const sheetName = kind === "order" ? "ใบสั่งของ" : "รูปผลคำนวณ";
    setBusy(action);
    try {
      const doc = buildDoc();
      if (action === "png") {
        onNotice(
          (await downloadSheetPng(doc))
            ? { kind: "ok", text: `บันทึก${sheetName}แล้ว — ดูในโฟลเดอร์ดาวน์โหลดหรือแกลเลอรี` }
            : { kind: "error", text: "บันทึกรูปไม่สำเร็จ ลองใช้ “คัดลอก” แทน หรือจับภาพหน้าจอ" },
        );
      } else if (action === "pdf") {
        onNotice(
          (await downloadSheetPdf(doc))
            ? { kind: "ok", text: `บันทึก PDF ${kind === "order" ? "ใบสั่งของ" : "ผลคำนวณ"}แล้ว (A4) — ดูในโฟลเดอร์ดาวน์โหลด` }
            : { kind: "error", text: "สร้าง PDF ไม่สำเร็จ ลอง “บันทึกรูป” แทน" },
        );
      } else {
        const outcome = await shareSheetImage(doc);
        if (outcome === "shared") onNotice({ kind: "ok", text: `ส่ง${sheetName}แล้ว` });
        else if (outcome === "saved")
          onNotice({ kind: "ok", text: "เครื่องนี้ส่งรูปเข้าแชตตรง ๆ ไม่ได้ จึงบันทึกรูปลงเครื่องให้แทน — แนบจากแกลเลอรีได้เลย" });
        else if (outcome === "failed")
          onNotice({ kind: "error", text: "สร้างรูปไม่สำเร็จ ลองใช้ “คัดลอก” แทน หรือจับภาพหน้าจอ" });
      }
    } finally {
      setBusy("");
    }
  }

  const actions: { action: Action; label: string; hint: string; Icon: typeof ImageDown }[] = [
    kind === "order"
      ? { action: "png", label: "ใบสั่งของ", hint: "PNG", Icon: ClipboardList }
      : { action: "png", label: "บันทึกรูป", hint: "PNG", Icon: ImageDown },
    { action: "pdf", label: "PDF", hint: "A4", Icon: FileDown },
    ...(shareable ? [{ action: "share" as const, label: "ส่งรูปเข้าแชต", hint: "LINE ฯลฯ", Icon: Send }] : []),
  ];

  return (
    <section aria-labelledby={`${id}-title`} className="mt-3 border-t border-navy/15 pt-3">
      <h3 id={`${id}-title`} className="chang-kicker">
        ส่งออกเป็นไฟล์
      </h3>

      {hasOrder ? (
        <div
          role="radiogroup"
          aria-label="แบบแผ่นที่จะส่งออก"
          className="mt-2 grid grid-cols-2 overflow-hidden rounded-[2px] border border-navy/35"
        >
          {(
            [
              { value: "result", label: "ผลคำนวณ" },
              { value: "order", label: "ใบสั่งของ" },
            ] as const
          ).map((option) => {
            const active = kind === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                className={`min-h-11 px-3 text-sm font-semibold transition-colors ${
                  active ? "bg-navy text-white" : "bg-white text-navy hover:bg-[#f1f3f5]"
                }`}
                onClick={() => setWanted(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {kind === "order" ? (
        <div className="mt-2.5">
          <div className="grid gap-2.5 @[26rem]:grid-cols-2">
            <label className="block">
              <span className="text-[0.8125rem] font-medium text-navy">
                ชื่องาน <span className="font-normal text-navy/70">(ไม่ใส่ก็ได้)</span>
              </span>
              <input
                className="input mt-1"
                value={jobName}
                maxLength={80}
                autoComplete="off"
                placeholder="เช่น ปูพื้นห้องนอนชั้น 2"
                onChange={(e) => setJobName(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-[0.8125rem] font-medium text-navy">
                ลูกค้า <span className="font-normal text-navy/70">(ไม่ใส่ก็ได้)</span>
              </span>
              <input
                className="input mt-1"
                value={customer}
                maxLength={60}
                autoComplete="off"
                placeholder="ชื่อลูกค้า / หน้างาน"
                onChange={(e) => setCustomer(e.target.value)}
              />
            </label>
          </div>

          <details className="group mt-2.5 rounded-[2px] border border-navy/25">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-semibold text-navy [&::-webkit-details-marker]:hidden">
              <span>
                รายการในใบสั่ง{" "}
                <span className="font-normal tabular-nums text-navy/75">
                  {items.length} จาก {candidates.length} แถว
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-[0.8125rem] font-medium underline underline-offset-4">
                เลือกเอง
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
              </span>
            </summary>
            <ul className="divide-y divide-navy/10 border-t border-navy/15">
              {candidates.map((c) => {
                const checked = overrides[c.key] ?? c.selected;
                return (
                  <li key={c.key}>
                    <label className="flex min-h-11 cursor-pointer items-start gap-3 px-3 py-2.5">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-5 w-5 shrink-0 accent-[#253641]"
                        checked={checked}
                        onChange={(e) => setOverrides((prev) => ({ ...prev, [c.key]: e.target.checked }))}
                      />
                      <span className="min-w-0 flex-1 text-sm leading-snug text-navy">
                        {c.item.name}
                        {c.item.detail ? (
                          <span className="block text-[0.8125rem] text-navy/70">{c.item.detail}</span>
                        ) : null}
                      </span>
                      {c.item.qty ? (
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-navy">
                          {c.item.qty} {c.item.unit}
                        </span>
                      ) : null}
                    </label>
                  </li>
                );
              })}
            </ul>
          </details>
        </div>
      ) : null}

      <div className={`mt-2.5 grid gap-2 ${actions.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {actions.map(({ action, label, hint, Icon }) => {
          const working = busy === action;
          return (
            <button
              key={action}
              type="button"
              className="btn btn-secondary flex-col gap-0 px-1 py-2 text-center"
              disabled={busy !== ""}
              aria-busy={working}
              aria-label={`${label} (${hint})`}
              onClick={() => void run(action)}
            >
              {/* ไอคอนบน ชื่อกลาง ชนิดไฟล์ล่าง — ชื่อไม่ตัดบรรทัดแม้ปุ่มกว้างแค่ 1/3 ของการ์ดบนมือถือ */}
              <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" aria-hidden />
              <span className="mt-1 whitespace-nowrap text-[0.8125rem] font-semibold leading-tight">{label}</span>
              <span className="whitespace-nowrap text-xs font-normal leading-tight text-navy/75">
                {working ? "กำลังสร้าง…" : hint}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
