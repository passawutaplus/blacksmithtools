"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Box, Copy, Download, ExternalLink, FileWarning, MessageCircle, Phone, Truck } from "lucide-react";
import { adminJson } from "@/lib/admin-client";
import type { PrintQuote as PrintQuoteBase } from "@/lib/types";

/** List rows also carry the order's bill token/total once the quote became an order. */
type PrintQuote = PrintQuoteBase & { orderToken?: string; orderTotal?: number };
import { formatDateTime } from "@/lib/utils";
import { parcelFee } from "@/lib/print-quote/pricing";

const FILTERS = [
  { id: "new", label: "รอยืนยันราคา" },
  { id: "ordered", label: "เปิดออเดอร์แล้ว" },
  { id: "closed", label: "ปิด/ไม่รับงาน" },
  { id: "", label: "ทั้งหมด" },
];

const STATUS_LABEL: Record<string, string> = {
  new: "รอยืนยันราคา",
  ordered: "เปิดออเดอร์แล้ว",
  closed: "ปิด/ไม่รับงาน",
};

const STATUS_TONE: Record<string, string> = {
  new: "bg-orange-100 text-orange-900",
  ordered: "bg-green-100 text-green-900",
  closed: "bg-gray-100 text-gray-600",
};

const FILE_TONE: Record<string, string> = {
  ok: "text-green-800",
  warn: "text-amber-800",
  error: "text-red-700",
};

type Draft = { price: string; ship: string; note: string; shipManual?: boolean };

async function fetchQuotes(status: string) {
  const p = new URLSearchParams({ resource: "print_quotes" });
  if (status) p.set("status", status);
  return (await adminJson<{ quotes: PrintQuote[] }>(`/api/admin?${p}`)).quotes;
}

function billUrl(token: string) {
  return `${window.location.origin}/bill/${token}`;
}

export default function AdminPrintQuotesPage() {
  const [status, setStatus] = useState("new");
  const [rows, setRows] = useState<PrintQuote[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [created, setCreated] = useState<Record<string, { number: string; token: string; id: string }>>({});
  const [copied, setCopied] = useState("");

  function apply(quotes: PrintQuote[]) {
    setRows(quotes);
    setDrafts((d) => {
      const out = { ...d };
      for (const q of quotes) {
        if (out[q.id]) continue;
        const est = q.estimate.printTHB;
        out[q.id] = {
          price: est != null ? String(est) : "",
          ship: q.shipping === "rider" ? "0" : String(parcelFee(est)),
          note: "",
        };
      }
      return out;
    });
  }

  async function load(next = status) {
    try {
      apply(await fetchQuotes(next));
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    }
  }

  useEffect(() => {
    let alive = true;
    fetchQuotes(status).then(
      (quotes) => alive && apply(quotes),
      (e) => alive && setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ"),
    );
    return () => {
      alive = false;
    };
  }, [status]);

  function setDraft(id: string, patch: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  }

  async function toOrder(q: PrintQuote) {
    const d = drafts[q.id];
    const price = Number(d?.price);
    const ship = Number(d?.ship);
    if (!price || price <= 0) return setError("ใส่ราคาพิมพ์ที่ยืนยันแล้วก่อน");
    const warn: string[] = [];
    if (q.process === "fdm" && price < 70) warn.push("⚠ ต่ำกว่าขั้นต่ำ ฿70");
    if (price % 5 !== 0) warn.push("⚠ ราคาไม่ลงท้าย 0 หรือ 5");
    const est = q.estimate.printTHB;
    if (est && Math.abs(price - est) / est > 0.3) warn.push(`⚠ ต่างจากราคาเว็บ (฿${est.toLocaleString("th-TH")}) เกิน 30%`);
    if (
      !window.confirm(
        [`เปิดออเดอร์ #${q.id}`, `ค่าพิมพ์ ฿${price.toLocaleString("th-TH")} + ค่าส่ง ฿${ship.toLocaleString("th-TH")}`, ...warn].join("\n"),
      )
    )
      return;
    setBusyId(q.id);
    setError("");
    try {
      const res = await adminJson<{ order: { id: string; number: string; token: string } }>("/api/admin", {
        method: "POST",
        body: JSON.stringify({ action: "print_quote_to_order", id: q.id, printTHB: price, shippingFee: ship, note: d.note }),
      });
      setCreated((c) => ({ ...c, [q.id]: res.order }));
      // Keep the card on screen (even in the "new" filter) so the admin can copy the payment message.
      setRows((r) =>
        r
          ? r.map((x) =>
              x.id === q.id
                ? { ...x, status: "ordered", orderId: res.order.id, orderNumber: res.order.number, orderToken: res.order.token, orderTotal: price + ship }
                : x,
            )
          : r,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "เปิดออเดอร์ไม่สำเร็จ");
    } finally {
      setBusyId("");
    }
  }

  async function setQuoteStatus(id: string, next: "new" | "closed") {
    if (next === "closed" && !window.confirm(`ไม่รับงาน #${id} ?\n(เปิดกลับได้ที่แท็บ "ปิด/ไม่รับงาน")`)) return;
    setBusyId(id);
    setError("");
    try {
      await adminJson("/api/admin", { method: "POST", body: JSON.stringify({ action: "update_print_quote", id, status: next }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusyId("");
    }
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      window.prompt("คัดลอกข้อความนี้", text);
    }
  }

  function customerMessage(q: PrintQuote, order: { number: string; token: string }) {
    const d = drafts[q.id];
    const total = q.orderTotal ?? Number(d?.price || 0) + Number(d?.ship || 0);
    return [
      `ยืนยันราคางานพิมพ์ 3D #${q.id}`,
      `ออเดอร์ ${order.number} ยอดชำระ ฿${total.toLocaleString("th-TH")}`,
      `ชำระเงินและแนบสลิปได้ที่ลิงก์นี้ (ดูสถานะและเลขพัสดุได้ที่ลิงก์เดิม)`,
      billUrl(order.token),
    ].join("\n");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">งานพิมพ์ 3D</h1>
      <p className="mt-1 text-sm text-muted">
        คำขอใบเสนอราคาจากหน้าเว็บ — ตรวจไฟล์ ยืนยันราคา แล้วกดเปิดออเดอร์ ส่งลิงก์ชำระเงินให้ลูกค้า จากนั้นจัดการต่อที่หน้าออเดอร์ (สลิป → แพ็ก → ใส่เลขพัสดุ)
      </p>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`shrink-0 rounded-[2px] border px-3 py-1.5 text-sm ${
              status === f.id ? "border-navy bg-navy text-white" : "border-gray-200 bg-white"
            }`}
            onClick={() => setStatus(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? <p className="mt-3 text-sm text-red-700" role="alert">{error}</p> : null}

      {!rows ? (
        <p className="mt-6 text-sm text-muted">กำลังโหลด…</p>
      ) : rows.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-sm text-muted">ไม่มีคำขอ{status ? `สถานะ${STATUS_LABEL[status]}` : ""}</div>
      ) : (
        <div className="mt-4 space-y-4">
          {rows.map((q) => {
            const d = drafts[q.id] ?? { price: "", ship: "50", note: "" };
            const usable = q.files.filter((f) => f.status !== "error");
            const pieces = usable.reduce((s, f) => s + f.qty, 0);
            const made = created[q.id] ?? (q.orderToken && q.orderNumber ? { number: q.orderNumber, token: q.orderToken } : undefined);
            const total = Number(d.price || 0) + Number(d.ship || 0);
            return (
              <article key={q.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-navy">#{q.id}</p>
                    <p className="text-sm text-muted">{formatDateTime(q.createdAt)}</p>
                  </div>
                  <span className={`badge ${STATUS_TONE[q.status]}`}>{STATUS_LABEL[q.status]}</span>
                </div>

                <div className="mt-3 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                  <div>
                    <p className="text-sm font-semibold text-navy">
                      <Box className="mr-1 inline h-4 w-4" aria-hidden />
                      {q.process === "fdm" ? "FDM PETG" : "Resin"} · layer{" "}
                      {q.process === "fdm" ? (q.quality === "fine" ? "0.15" : "0.25") : q.quality === "fine" ? "ละเอียด" : "ปกติ"} ·{" "}
                      {usable.length} ไฟล์ · {pieces} ชิ้น
                      {q.files.length > usable.length ? <span className="font-normal text-muted"> (+{q.files.length - usable.length} ไฟล์ใช้ไม่ได้)</span> : null}
                    </p>
                    <details open={q.files.length <= 4} className="group">
                    <summary className="mt-1 cursor-pointer text-xs text-forge underline group-open:hidden">
                      ดูรายการไฟล์ ({q.files.length})
                    </summary>
                    <ul className="mt-2 divide-y divide-gray-100 rounded-[2px] border border-gray-200 text-sm">
                      {q.files.map((f, i) => (
                        <li key={i} className={`p-2.5 ${f.status === "error" ? "opacity-50" : ""}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="min-w-0 break-all font-medium">
                              {f.name} <span className="text-muted">× {f.qty}</span>
                            </span>
                            {f.blobPath ? (
                              <a
                                className="inline-flex items-center gap-1 text-xs font-semibold text-forge underline"
                                href={`/api/admin/print-file?path=${encodeURIComponent(f.blobPath)}`}
                              >
                                <Download className="h-3.5 w-3.5" aria-hidden />
                                โหลดไฟล์
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-muted">
                                <FileWarning className="h-3.5 w-3.5" aria-hidden />
                                {f.status === "error" ? "ใช้ไม่ได้" : q.keepFiles ? "ไฟล์ไม่ได้อัปโหลด ขอทาง LINE" : "ลูกค้าไม่ให้เก็บไฟล์ ขอทาง LINE"}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-muted">
                            {f.dims ? `${f.dims.map((n) => n.toFixed(0)).join("×")} มม. · ` : ""}
                            <span className={FILE_TONE[f.status]}>{f.statusText}</span>
                          </p>
                          {f.wantMm?.some(Boolean) ? (
                            <p className="mt-0.5 text-xs">ต้องการขนาด {f.wantMm.map((n) => n || "-").join("×")} มม.</p>
                          ) : null}
                          {f.note?.trim() ? <p className="mt-0.5 text-xs">📝 {f.note}</p> : null}
                        </li>
                      ))}
                    </ul>
                    </details>
                    <p className="mt-2 text-xs text-muted">
                      ราคาที่เว็บคำนวณ (ตรวจไฟล์ก่อนยืนยัน): {q.estimate.printTHB != null ? `฿${q.estimate.printTHB.toLocaleString("th-TH")}` : "ร้านประเมิน"}
                      {q.keepFiles ? " · ไฟล์ลบอัตโนมัติใน 30 วัน" : ""}
                    </p>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="rounded-[2px] border border-gray-200 p-3">
                      <p className="font-medium">{q.contact.name}</p>
                      <p className="mt-0.5 flex flex-wrap gap-x-3">
                        <a className="inline-flex items-center gap-1 text-forge underline" href={`tel:${q.contact.phone}`}>
                          <Phone className="h-3.5 w-3.5" aria-hidden />
                          {q.contact.phone}
                        </a>
                        {q.contact.lineId ? (
                          <a
                            className="inline-flex items-center gap-1 text-forge underline"
                            href={`https://line.me/ti/p/~${encodeURIComponent(q.contact.lineId.replace(/^@/, ""))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                            LINE {q.contact.lineId}
                          </a>
                        ) : null}
                      </p>
                      <p className="mt-1 text-muted">
                        {q.contact.address} {q.contact.subdistrict} {q.contact.district} {q.contact.province} {q.contact.zip}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1">
                        <Truck className="h-3.5 w-3.5" aria-hidden />
                        {q.shipping === "parcel" ? "พัสดุปกติ" : "ด่วน Grab/ไรเดอร์ (ลูกค้าจ่ายปลายทาง)"}
                        {q.contact.wantDate ? <WantDate iso={q.contact.wantDate} /> : null}
                      </p>
                    </div>

                    {q.status === "new" ? (
                      <div className="rounded-[2px] border border-navy/30 bg-steel/40 p-3">
                        <p className="font-semibold text-navy">ยืนยันราคาแล้วเปิดออเดอร์</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <label className="block">
                            <span className="label">ค่าพิมพ์ (บาท)</span>
                            <input
                              className="input"
                              inputMode="numeric"
                              value={d.price}
                              onChange={(e) => {
                                const price = e.target.value.replace(/[^0-9]/g, "");
                                // Parcel fee follows the price (free from ฿1,000) unless the admin typed it.
                                const auto = q.shipping === "parcel" && !d.shipManual ? { ship: String(parcelFee(Number(price) || null)) } : {};
                                setDraft(q.id, { price, ...auto });
                              }}
                              placeholder="เช่น 350"
                            />
                          </label>
                          <label className="block">
                            <span className="label">ค่าส่ง (บาท)</span>
                            <input
                              className="input"
                              inputMode="numeric"
                              value={d.ship}
                              onChange={(e) => setDraft(q.id, { ship: e.target.value.replace(/[^0-9]/g, ""), shipManual: true })}
                            />
                          </label>
                        </div>
                        <label className="mt-2 block">
                          <span className="label">โน้ตภายในร้าน (ลูกค้าไม่เห็น)</span>
                          <input
                            className="input"
                            maxLength={300}
                            value={d.note}
                            onChange={(e) => setDraft(q.id, { note: e.target.value })}
                            placeholder="เช่น ย่อเหลือ 90% ตามที่ลูกค้าขอ"
                          />
                        </label>
                        <p className="mt-2 text-xs text-muted">
                          ยอดรวม ฿{total.toLocaleString("th-TH")}
                          {q.shipping === "parcel" ? " · ส่งฟรีเมื่อค่าพิมพ์ ฿1,000 ขึ้นไป" : " · ค่าไรเดอร์ลูกค้าจ่ายปลายทาง"}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={busyId === q.id}
                            onClick={() => void toOrder(q)}
                          >
                            {busyId === q.id ? "กำลังเปิดออเดอร์…" : "เปิดออเดอร์"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={busyId === q.id}
                            onClick={() => void setQuoteStatus(q.id, "closed")}
                          >
                            ไม่รับงาน
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {q.status === "ordered" && q.orderId ? (
                      <div className="rounded-[2px] border border-green-200 bg-green-50 p-3">
                        <p className="font-semibold text-green-900">เปิดออเดอร์ {q.orderNumber} แล้ว</p>
                        {made ? (
                          <>
                            <p className="mt-1 text-xs text-green-900">ส่งข้อความนี้ให้ลูกค้าทาง LINE:</p>
                            <pre className="mt-1 whitespace-pre-wrap break-all rounded-[2px] bg-white p-2 text-xs">{customerMessage(q, made)}</pre>
                            <button
                              type="button"
                              className="btn btn-secondary mt-2"
                              onClick={() => void copy(customerMessage(q, made), q.id)}
                            >
                              <Copy className="h-4 w-4" aria-hidden />
                              {copied === q.id ? "คัดลอกแล้ว" : "คัดลอกข้อความ"}
                            </button>
                          </>
                        ) : null}
                        <Link href={`/admin/orders/${q.orderId}`} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-forge underline">
                          <ExternalLink className="h-4 w-4" aria-hidden />
                          ไปหน้าออเดอร์ (ยืนยันสลิป · ใส่เลขพัสดุ)
                        </Link>
                      </div>
                    ) : null}

                    {q.status === "closed" ? (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={busyId === q.id}
                        onClick={() => void setQuoteStatus(q.id, "new")}
                      >
                        เปิดคำขอนี้อีกครั้ง
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WantDate({ iso }: { iso: string }) {
  const [now] = useState(() => Date.now());
  const d = new Date(`${iso}T00:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return <> · ต้องการรับ {iso}</>;
  const days = Math.ceil((d.getTime() - now) / 86_400_000);
  const label = d.toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });
  return (
    <>
      {" · "}
      <span className={days <= 3 ? "font-semibold text-red-700" : ""}>
        ต้องการรับ {label}
        {days <= 3 ? (days < 0 ? " (เลยกำหนด)" : ` (อีก ${Math.max(0, days)} วัน)`) : ""}
      </span>
    </>
  );
}
