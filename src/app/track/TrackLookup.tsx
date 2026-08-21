"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageSearch, Receipt, Smartphone } from "lucide-react";

const STEPS = [
  { n: "1", t: "กรอกเลขบิล", d: "เช่น BS-260821-0001 จากใบเสร็จหรือไลน์ร้าน" },
  { n: "2", t: "ใส่เบอร์โทร", d: "เบอร์เดียวกับที่ใช้สั่ง — ไม่ใช่เบอร์คนอื่น" },
  { n: "3", t: "ดูสถานะ", d: "จ่ายเงิน แพ็กของ เลขพัสดุ และพิมพ์บิลได้จากหน้าบิล" },
];

const PIPELINE = ["รอชำระ", "แพ็กของ", "ส่งแล้ว", "ถึงมือ"];

export function TrackLookup({
  lineUrl,
  lineId,
}: {
  lineUrl: string;
  lineId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const number = String(fd.get("number") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ไม่พบออเดอร์");
      router.push(`/bill/${data.token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ค้นหาไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-8">
      <form onSubmit={onSubmit} className="card min-w-0 w-full p-5 sm:p-7 xl:flex-1" noValidate>
        <p className="text-sm font-semibold text-navy">ค้นหาด้วยเลขบิล</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">ใช้ข้อมูลเดียวกับตอนสั่ง ไม่ต้องสมัครสมาชิก</p>

        <div className="mt-6 space-y-4">
          <div className="min-w-0">
            <label className="label" htmlFor="number">
              เลขบิล
            </label>
            <div className="flex min-h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-navy">
              <Receipt className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              <input
                id="number"
                name="number"
                required
                autoFocus
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="BS-260821-0001"
                className="min-w-0 flex-1 bg-transparent py-2.5 font-latin text-sm tracking-wide outline-none"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "track-error" : "number-hint"}
              />
            </div>
            <p id="number-hint" className="mt-1.5 text-xs leading-relaxed text-muted">
              อยู่บนใบเสร็จ หรือข้อความยืนยันจากร้าน
            </p>
          </div>

          <div className="min-w-0">
            <label className="label" htmlFor="phone">
              เบอร์โทรที่ใช้สั่ง
            </label>
            <div className="flex min-h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-navy">
              <Smartphone className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              <input
                id="phone"
                name="phone"
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder="08x-xxx-xxxx"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "track-error" : undefined}
              />
            </div>
          </div>
        </div>

        {error ? (
          <div
            id="track-error"
            role="alert"
            className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800"
          >
            <p className="font-semibold">{error}</p>
            <p className="mt-1">ตรวจเลขบิลกับเบอร์อีกครั้ง หรือทักไลน์ร้านให้ช่วยเช็ค</p>
          </div>
        ) : null}

        <button type="submit" className="btn btn-primary mt-6 w-full" disabled={loading}>
          <PackageSearch className="h-4 w-4" aria-hidden />
          {loading ? "กำลังค้นหา..." : "ดูสถานะออเดอร์"}
        </button>

        {lineUrl ? (
          <p className="mt-4 text-center text-sm leading-relaxed text-muted">
            ไม่มีเลขบิล?{" "}
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

      <aside className="flex min-w-0 w-full flex-col gap-4 xl:w-80 xl:shrink-0">
        <div className="card p-5">
          <p className="text-sm font-bold text-navy">ใช้ยังไง</p>
          <ol className="mt-3 space-y-3">
            {STEPS.map((s) => (
              <li key={s.n} className="flex min-w-0 items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                  {s.n}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-navy">{s.t}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted">{s.d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="card p-5">
          <p className="text-sm font-bold text-navy">สถานะที่เห็นในบิล</p>
          <ol className="mt-3 grid grid-cols-2 gap-2">
            {PIPELINE.map((label, i) => (
              <li
                key={label}
                className="min-w-0 rounded-2xl border border-steel bg-white px-2 py-2.5 text-center"
              >
                <span className="block text-[10px] font-medium text-muted">{i + 1}</span>
                <span className="block text-xs font-semibold leading-snug text-navy">{label}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            ถ้าส่งแล้ว หน้าบิลมีเลขพัสดุและปุ่มเปิดเว็บขนส่งให้ดูสถานะได้เลย
          </p>
        </div>
      </aside>
    </div>
  );
}
