"use client";

import { TrackOrderForm } from "@/components/TrackOrderForm";

const STEPS = [
  { n: "1", t: "ใส่เบอร์โทรและเลขบิล", d: "เลขบิลอยู่ในหน้ายืนยันการสั่งซื้อ เช่น BS-260821-0001" },
  { n: "2", t: "เปิดบิล", d: "ใส่ทั้งสองอย่างเพื่อกันคนอื่นเปิดบิลของคุณ ไม่ต้องสมัครสมาชิก" },
  { n: "3", t: "ดูเลขพัสดุ", d: "เปิดบิลแล้วกดไปหน้าขนส่ง เลขถูกใส่ให้แล้ว" },
];

const PIPELINE = ["รอชำระ", "แพ็กของ", "ส่งแล้ว", "ถึงมือ"];

export function TrackLookup({
  lineUrl,
  lineId,
}: {
  lineUrl: string;
  lineId: string;
}) {
  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-8">
      <TrackOrderForm variant="page" lineUrl={lineUrl} lineId={lineId} />

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
                className="min-w-0 rounded-[3px] border border-steel bg-white px-2 py-2.5 text-center"
              >
                <span className="block text-[10px] font-medium text-muted">{i + 1}</span>
                <span className="block text-xs font-semibold leading-snug text-navy">{label}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            ถ้าส่งแล้ว หน้าบิลมีเลขพัสดุ รูปใบปะหน้า และปุ่มเปิดเว็บขนส่ง — สถานะระหว่างทางดูที่นั่น
          </p>
        </div>
      </aside>
    </div>
  );
}
