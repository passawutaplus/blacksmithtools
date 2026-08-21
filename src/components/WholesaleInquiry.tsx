"use client";

import { useState } from "react";

const CHANNELS = ["ร้านหน้าร้าน", "Shopee / Lazada", "อู่ / โรงงาน", "อื่น ๆ"] as const;

export function WholesaleInquiry({
  lineUrl,
  lineId,
}: {
  lineUrl: string;
  lineId: string;
}) {
  const [shopName, setShopName] = useState("");
  const [province, setProvince] = useState("");
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("ร้านหน้าร้าน");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/wholesale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopName, province, channel, contact, note }),
      });
      const data = (await res.json()) as { ok?: boolean; number?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "ส่งไม่สำเร็จ");
      setDone(data.number ?? "");
      setShopName("");
      setProvince("");
      setChannel("ร้านหน้าร้าน");
      setContact("");
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ส่งไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card mt-8 p-5">
        <p className="font-semibold text-navy">ส่งให้ทีมขายส่งแล้ว</p>
        <p className="mt-2 text-sm text-muted">
          เลขที่ {done} — ทีมจะติดต่อกลับตามเบอร์หรือ LINE ที่ให้ไว้
        </p>
        {lineUrl ? (
          <a
            href={lineUrl}
            className="btn btn-secondary mt-4 inline-flex"
            target="_blank"
            rel="noopener noreferrer"
          >
            ทัก LINE {lineId} ถ้าต้องการคุยทันที
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="card mt-8 space-y-4 p-5">
      <p className="font-semibold text-navy">ส่งข้อมูลให้ทีมขายส่ง</p>
      <p className="text-sm text-muted">กรอกแล้วกดส่ง — ทีมจะเห็นในหลังร้านแล้วติดต่อกลับ</p>
      <div>
        <label className="label" htmlFor="ws-shop">
          ชื่อร้าน / เพจ
        </label>
        <input
          id="ws-shop"
          className="input"
          required
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="ws-province">
          จังหวัด
        </label>
        <input
          id="ws-province"
          className="input"
          required
          value={province}
          onChange={(e) => setProvince(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="ws-channel">
          ช่องทางที่อยากขาย
        </label>
        <select
          id="ws-channel"
          className="input"
          value={channel}
          onChange={(e) => setChannel(e.target.value as (typeof CHANNELS)[number])}
        >
          {CHANNELS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="ws-contact">
          เบอร์โทร หรือ LINE
        </label>
        <input
          id="ws-contact"
          className="input"
          required
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="ws-note">
          รายละเอียดเพิ่มเติม
        </label>
        <textarea
          id="ws-note"
          className="input min-h-24"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={busy}>
        {busy ? "กำลังส่ง…" : "ส่งให้ทีมขายส่ง"}
      </button>
    </form>
  );
}
