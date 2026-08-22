"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PackageSearch, Receipt, Smartphone, Truck } from "lucide-react";
import { LastBillButton } from "@/components/LastBillButton";
import { saveLastBill } from "@/lib/last-bill";
import { ORDER_STATUS_LABEL } from "@/lib/shipping";
import type { TrackBillSummary } from "@/lib/track-types";
import { formatDate, formatTHB } from "@/lib/utils";

type TrackApi = {
  token?: string;
  number?: string;
  bills?: TrackBillSummary[];
  error?: string;
};

export function TrackOrderForm({
  variant,
  lineUrl,
  lineId,
}: {
  variant: "page" | "portal";
  lineUrl: string;
  lineId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bills, setBills] = useState<TrackBillSummary[] | null>(null);

  const portal = variant === "portal";
  const numberId = portal ? "portal-bill" : "number";
  const phoneId = portal ? "portal-phone" : "phone";
  const errorId = portal ? "portal-track-error" : "track-error";
  const ring = portal
    ? "focus-within:outline-forge"
    : "focus-within:outline-navy";
  const inputSize = portal ? "text-base" : "text-sm";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setBills(null);
    const fd = new FormData(e.currentTarget);
    const number = String(fd.get("number") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number, phone }),
      });
      const data = (await res.json()) as TrackApi;
      if (!res.ok) throw new Error(data.error || "ไม่พบออเดอร์");
      if (data.token) {
        if (data.number) saveLastBill(data.token, data.number);
        router.push(`/bill/${data.token}`);
        return;
      }
      if (data.bills?.length) {
        setBills(data.bills);
        return;
      }
      throw new Error("ไม่พบออเดอร์");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ค้นหาไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className={
        portal
          ? "overflow-hidden rounded-[1.35rem] bg-white p-4 text-left text-navy shadow-[0_8px_28px_rgba(0,0,0,0.22)]"
          : "card min-w-0 w-full p-5 sm:p-7 xl:flex-1"
      }
    >
      <p
        className={
          portal
            ? "flex items-center gap-2 text-[15px] font-semibold leading-tight"
            : "flex items-center gap-2 text-sm font-semibold text-navy"
        }
      >
        <Truck className={portal ? "h-[18px] w-[18px] shrink-0 text-forge" : "h-4 w-4 shrink-0 text-forge"} aria-hidden />
        ติดตามสถานะส่งของ
      </p>

      <div className={portal ? "" : "mt-6 space-y-4"}>
        <div className={portal ? "mt-4" : "min-w-0"}>
          <label className="label" htmlFor={phoneId}>
            เบอร์โทรที่ใช้สั่ง
          </label>
          <div
            className={`flex min-h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 focus-within:outline-2 focus-within:outline-offset-1 ${ring}`}
          >
            <Smartphone className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            <input
              id={phoneId}
              name="phone"
              required
              autoFocus={!portal}
              inputMode="tel"
              autoComplete="tel"
              placeholder="08x-xxx-xxxx"
              className={`min-w-0 flex-1 bg-transparent py-2.5 ${inputSize} outline-none`}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
          </div>
        </div>

        <div className={portal ? "mt-3" : "min-w-0"}>
          <label className="label" htmlFor={numberId}>
            เลขบิล
          </label>
          <div
            className={`flex min-h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 focus-within:outline-2 focus-within:outline-offset-1 ${ring}`}
          >
            <Receipt className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            <input
              id={numberId}
              name="number"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="BS-260821-0001"
              className={`min-w-0 flex-1 bg-transparent py-2.5 font-latin ${portal ? "text-base" : "text-sm"} tracking-wide outline-none`}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
          </div>
        </div>
      </div>

      {error ? (
        portal ? (
          <p id={errorId} role="alert" className="mt-3 text-sm font-medium text-red-700">
            {error} — ตรวจเบอร์อีกครั้ง หรือทักไลน์ร้าน
          </p>
        ) : (
          <div
            id={errorId}
            role="alert"
            className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800"
          >
            <p className="font-semibold">{error}</p>
            <p className="mt-1">ตรวจเบอร์อีกครั้ง ลองใส่เลขบิลเพิ่ม หรือทักไลน์ร้านให้ช่วยเช็ค</p>
          </div>
        )
      ) : null}

      {bills?.length ? (
        <ul className="mt-4 space-y-2" aria-label="บิลของเบอร์นี้">
          <li className="text-xs font-semibold text-navy">พบ {bills.length} บิล — กดเปิดใบที่ต้องการ</li>
          {bills.map((bill) => (
            <li key={bill.token}>
              <Link
                href={`/bill/${bill.token}`}
                onClick={() => saveLastBill(bill.token, bill.number)}
                className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-steel bg-white px-3 py-2.5 hover:border-navy"
              >
                <span className="min-w-0">
                  <span className="block font-latin text-sm font-semibold tracking-wide text-navy">{bill.number}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {formatDate(bill.createdAt)} · {ORDER_STATUS_LABEL[bill.status] ?? bill.status}
                    {bill.itemCount ? ` · ${bill.itemCount} ชิ้น` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-navy">{formatTHB(bill.grandTotal)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <button type="submit" className={`btn btn-primary w-full ${portal ? "mt-4" : "mt-6"}`} disabled={loading}>
        <PackageSearch className="h-4 w-4" aria-hidden />
        {loading ? "กำลังค้นหา…" : "ดูสถานะออเดอร์"}
      </button>

      <LastBillButton compact={portal} />

      {lineUrl ? (
        <p className={portal ? "mt-3 text-center text-xs leading-relaxed text-muted" : "mt-4 text-center text-sm leading-relaxed text-muted"}>
          จำเบอร์ไม่ได้?{" "}
          <a
            href={lineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-navy underline underline-offset-2"
          >
            ทัก LINE {lineId || "ร้าน"}
          </a>
        </p>
      ) : null}
    </form>
  );
}
