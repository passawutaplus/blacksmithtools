"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bike,
  Box,
  CalendarClock,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileWarning,
  MapPin,
  MessageCircle,
  Phone,
  Truck,
  User,
  XCircle,
} from "lucide-react";
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
  new: "bg-amber-100 text-amber-900",
  ordered: "bg-green-100 text-green-900",
  closed: "bg-gray-100 text-gray-600",
};

/** Left accent of each card = its status, so the list can be scanned by colour. */
const STATUS_EDGE: Record<string, string> = {
  new: "border-l-amber-500",
  ordered: "border-l-green-600",
  closed: "border-l-gray-300",
};

const FILE_ICON = { ok: CheckCircle2, warn: AlertTriangle, error: XCircle } as const;

const FILE_TONE: Record<string, string> = {
  ok: "text-green-800",
  warn: "text-amber-800",
  error: "text-red-700",
};

type Draft = { price: string; ship: string; note: string; shipManual?: boolean };

async function fetchQuotes() {
  return (await adminJson<{ quotes: PrintQuote[] }>("/api/admin?resource=print_quotes")).quotes;
}

const baht = (n: number) => `฿${n.toLocaleString("th-TH")}`;

/** Small spec-sheet section heading used inside each card. */
function Head({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2 border-b border-gray-200 pb-1.5">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{children}</h3>
      {right ? <div className="text-xs text-muted">{right}</div> : null}
    </div>
  );
}

const FILES_PREVIEW = 5;

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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // Cards opened as an order in this visit stay under "รอยืนยันราคา" so the message can be copied.
  const [justOrdered, setJustOrdered] = useState<Record<string, boolean>>({});

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

  async function load() {
    try {
      apply(await fetchQuotes());
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    }
  }

  useEffect(() => {
    let alive = true;
    fetchQuotes().then(
      (quotes) => alive && apply(quotes),
      (e) => alive && setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ"),
    );
    return () => {
      alive = false;
    };
  }, []);

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
      setJustOrdered((j) => ({ ...j, [q.id]: true }));
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

  const all = rows ?? [];
  const count = (id: string) => (id ? all.filter((q) => q.status === id).length : all.length);
  const shown = all.filter((q) => !status || q.status === status || (status === "new" && justOrdered[q.id]));
  const waiting = all.filter((q) => q.status === "new");
  const waitingValue = waiting.reduce((s, q) => s + (q.estimate.printTHB ?? 0), 0);

  return (
    <div className="mx-auto max-w-[1200px]">
      {/* ── Page header ─────────────────────────── */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-forge">Custom print</p>
          <h1 className="text-2xl font-bold text-navy">งานพิมพ์ 3D</h1>
        </div>
        {rows ? (
          <dl className="grid grid-cols-2 border border-gray-300 bg-white text-sm">
            <div className="px-4 py-2">
              <dt className="text-[11px] text-muted">รอยืนยันราคา</dt>
              <dd className="text-lg font-bold text-navy">{waiting.length} งาน</dd>
            </div>
            <div className="border-l border-gray-300 px-4 py-2">
              <dt className="text-[11px] text-muted">มูลค่าที่เว็บประเมิน</dt>
              <dd className="text-lg font-bold text-navy">{baht(waitingValue)}</dd>
            </div>
          </dl>
        ) : null}
      </header>

      {/* Flow reminder: what the admin does, in order */}
      <ol className="mt-4 hidden grid-cols-2 gap-px border border-gray-300 bg-gray-300 text-xs sm:grid sm:grid-cols-4">
        {["ตรวจไฟล์ + ยืนยันราคา", "เปิดออเดอร์ + ส่งลิงก์ให้ลูกค้า", "ลูกค้าโอน แนบสลิป", "หน้าออเดอร์: ยืนยันสลิป → แพ็ก → เลขพัสดุ"].map(
          (t, i) => (
            <li key={t} className="flex items-center gap-2 bg-white px-3 py-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center bg-navy text-[11px] font-bold text-white">{i + 1}</span>
              <span className="text-gray-700">{t}</span>
            </li>
          ),
        )}
      </ol>

      {/* ── Filters (with counts) ───────────────── */}
      <div className="-mx-4 mt-5 flex overflow-x-auto border-b border-gray-300 px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="สถานะคำขอ">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={status === f.id}
            className={`-mb-px flex min-h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-sm sm:px-4 ${
              status === f.id ? "border-forge font-semibold text-navy" : "border-transparent text-muted hover:text-navy"
            }`}
            onClick={() => setStatus(f.id)}
          >
            <span>{f.label}</span>
            {rows ? (
              <span className={`min-w-5 px-1 text-[11px] ${status === f.id ? "bg-navy text-white" : "bg-gray-200 text-gray-700"}`}>
                {count(f.id)}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-3 border-l-[3px] border-red-600 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {!rows ? (
        <p className="mt-6 text-sm text-muted">กำลังโหลด…</p>
      ) : !shown.length ? (
        <div className="mt-6 border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-muted">
          ไม่มีคำขอ{status ? `ในสถานะ “${STATUS_LABEL[status]}”` : ""}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {shown.map((q) => {
            const d = drafts[q.id] ?? { price: "", ship: "50", note: "" };
            const usable = q.files.filter((f) => f.status !== "error");
            const pieces = usable.reduce((s, f) => s + f.qty, 0);
            const made = created[q.id] ?? (q.orderToken && q.orderNumber ? { number: q.orderNumber, token: q.orderToken } : undefined);
            const total = Number(d.price || 0) + Number(d.ship || 0);
            const tally = { ok: 0, warn: 0, error: 0 };
            q.files.forEach((f) => tally[f.status]++);
            const open = expanded[q.id] || q.files.length <= FILES_PREVIEW;
            const files = open ? q.files : q.files.slice(0, FILES_PREVIEW);
            const layer = q.process === "fdm" ? (q.quality === "fine" ? "0.15 มม." : "0.25 มม.") : q.quality === "fine" ? "ละเอียด" : "ปกติ";
            const est = q.estimate.printTHB;
            const diff = est && Number(d.price) ? Math.round(((Number(d.price) - est) / est) * 100) : 0;
            return (
              <article key={q.id} className={`border border-l-[3px] border-gray-300 bg-white ${STATUS_EDGE[q.status]}`}>
                {/* Card header: id · date · job spec · status */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                  <p className="font-bold text-navy">#{q.id}</p>
                  <p className="text-xs text-muted">{formatDateTime(q.createdAt)}</p>
                  <p className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                    <Box className="h-3.5 w-3.5" aria-hidden />
                    {q.process === "fdm" ? "FDM · PETG" : "Resin"} · layer {layer}
                  </p>
                  <span className={`badge ml-auto ${STATUS_TONE[q.status]}`}>{STATUS_LABEL[q.status]}</span>
                </div>

                <div className="grid gap-px bg-gray-200 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.1fr)]">
                  {/* ── Column 1: files ── */}
                  <section className="min-w-0 bg-white p-4">
                    <Head
                      right={
                        <span className="flex gap-2.5">
                          <span>{usable.length} ไฟล์ · {pieces} ชิ้น</span>
                          {tally.warn ? <span className="text-amber-700">⚠ {tally.warn}</span> : null}
                          {tally.error ? <span className="text-red-700">✕ {tally.error}</span> : null}
                        </span>
                      }
                    >
                      ไฟล์งาน
                    </Head>
                    <ul className="divide-y divide-gray-100">
                      {files.map((f, i) => {
                        const Icon = FILE_ICON[f.status];
                        return (
                          <li key={i} className={`flex gap-2.5 py-2 ${f.status === "error" ? "opacity-50" : ""}`}>
                            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${FILE_TONE[f.status]}`} aria-label={f.statusText} />
                            <div className="min-w-0 flex-1">
                              <p className="flex items-baseline gap-2 text-sm">
                                <span className="min-w-0 truncate font-medium" title={f.name}>{f.name}</span>
                                <span className="shrink-0 font-semibold text-navy">× {f.qty}</span>
                              </p>
                              <p className="text-xs text-muted">
                                {f.dims ? `${f.dims.map((n) => n.toFixed(0)).join(" × ")} มม.` : "ไม่มีขนาด"}
                                {f.status !== "ok" ? <span className={`ml-1.5 ${FILE_TONE[f.status]}`}>· {f.statusText}</span> : null}
                              </p>
                              {f.wantMm?.some(Boolean) ? (
                                <p className="mt-0.5 text-xs font-medium text-forge">ต้องการขนาด {f.wantMm.map((n) => n || "-").join(" × ")} มม.</p>
                              ) : null}
                              {f.note?.trim() ? <p className="mt-0.5 bg-amber-50 px-1.5 py-0.5 text-xs">📝 {f.note}</p> : null}
                            </div>
                            {f.blobPath ? (
                              <a
                                className="btn-icon inline-flex shrink-0 items-center justify-center border border-gray-300 text-navy hover:border-navy"
                                href={`/api/admin/print-file?path=${encodeURIComponent(f.blobPath)}`}
                                aria-label={`โหลด ${f.name}`}
                                title="โหลดไฟล์"
                              >
                                <Download className="h-4 w-4" aria-hidden />
                              </a>
                            ) : f.status !== "error" && q.files.some((x) => x.blobPath) ? (
                              <span className="shrink-0 self-center" title={q.keepFiles ? "ไฟล์ไม่ได้อัปโหลด ขอทาง LINE" : "ลูกค้าไม่ให้เก็บไฟล์ ขอทาง LINE"}>
                                <FileWarning className="h-4 w-4 text-muted" aria-label="ไม่มีไฟล์ ขอทาง LINE" />
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                    {q.files.length > FILES_PREVIEW ? (
                      <button
                        type="button"
                        className="mt-1 text-xs font-semibold text-forge underline"
                        onClick={() => setExpanded((x) => ({ ...x, [q.id]: !open }))}
                      >
                        {open ? "ย่อรายการ" : `ดูอีก ${q.files.length - FILES_PREVIEW} ไฟล์`}
                      </button>
                    ) : null}
                    {!q.files.some((f) => f.blobPath) && usable.length ? (
                      <p className="mt-2 text-xs text-muted">
                        <FileWarning className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                        {q.keepFiles ? "ไฟล์ไม่ได้อัปโหลดเข้าระบบ ขอไฟล์จากลูกค้าทาง LINE" : "ลูกค้าไม่ให้เก็บไฟล์ ขอทาง LINE"}
                      </p>
                    ) : q.keepFiles ? (
                      <p className="mt-2 text-xs text-muted">ไฟล์ลบอัตโนมัติใน 30 วัน</p>
                    ) : null}
                  </section>

                  {/* ── Column 2: customer & delivery ── */}
                  <section className="min-w-0 bg-white p-4 text-sm">
                    <Head>ลูกค้า · จัดส่ง</Head>
                    <ul className="space-y-2">
                      <li className="flex gap-2">
                        <User className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                        <span className="font-semibold">{q.contact.name}</span>
                      </li>
                      <li className="flex gap-2">
                        <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                        <a className="text-forge underline" href={`tel:${q.contact.phone}`}>{q.contact.phone}</a>
                      </li>
                      {q.contact.lineId ? (
                        <li className="flex gap-2">
                          <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                          <a
                            className="text-forge underline"
                            href={`https://line.me/ti/p/~${encodeURIComponent(q.contact.lineId.replace(/^@/, ""))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            LINE {q.contact.lineId}
                          </a>
                        </li>
                      ) : null}
                      <li className="flex gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                        <span className="text-gray-700">
                          {q.contact.address} {q.contact.subdistrict} {q.contact.district} {q.contact.province} {q.contact.zip}
                        </span>
                      </li>
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className={`inline-flex items-center gap-1.5 border px-2 py-1 text-xs font-medium ${q.shipping === "rider" ? "border-forge text-forge" : "border-gray-300 text-gray-700"}`}>
                        {q.shipping === "rider" ? <Bike className="h-3.5 w-3.5" aria-hidden /> : <Truck className="h-3.5 w-3.5" aria-hidden />}
                        {q.shipping === "parcel" ? "พัสดุปกติ" : "ด่วน ไรเดอร์ · ลูกค้าจ่ายปลายทาง"}
                      </span>
                      {q.contact.wantDate ? <WantDate iso={q.contact.wantDate} /> : null}
                    </div>
                  </section>

                  {/* ── Column 3: price / action ── */}
                  <section className="min-w-0 bg-white p-4 text-sm">
                    {q.status === "new" && !made ? (
                      <>
                        <Head right={est != null ? <>เว็บประเมิน <b className="text-navy">{baht(est)}</b></> : "เว็บประเมินไม่ได้"}>ยืนยันราคา</Head>
                        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                          <label className="block">
                            <span className="text-xs text-muted">ค่าพิมพ์</span>
                            <input
                              className="input text-base font-semibold"
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
                          <span className="pb-3 text-muted">+</span>
                          <label className="block">
                            <span className="text-xs text-muted">{q.shipping === "rider" ? "ค่าส่ง (ไรเดอร์ = 0)" : "ค่าส่ง"}</span>
                            <input
                              className="input text-base"
                              inputMode="numeric"
                              value={d.ship}
                              onChange={(e) => setDraft(q.id, { ship: e.target.value.replace(/[^0-9]/g, ""), shipManual: true })}
                            />
                          </label>
                        </div>
                        {diff ? (
                          <p className={`mt-1 text-xs ${Math.abs(diff) > 30 ? "font-semibold text-red-700" : "text-muted"}`}>
                            {diff > 0 ? "+" : ""}
                            {diff}% จากราคาเว็บ
                          </p>
                        ) : null}
                        <div className="mt-3 flex items-baseline justify-between border-y border-gray-200 py-2">
                          <span className="text-xs text-muted">ยอดที่ลูกค้าต้องโอน</span>
                          <span className="text-xl font-bold text-navy">{baht(total)}</span>
                        </div>
                        <label className="mt-3 block">
                          <span className="text-xs text-muted">โน้ตภายในร้าน (ลูกค้าไม่เห็น)</span>
                          <input
                            className="input"
                            maxLength={300}
                            value={d.note}
                            onChange={(e) => setDraft(q.id, { note: e.target.value })}
                            placeholder="เช่น ลดให้ลูกค้าประจำ"
                          />
                        </label>
                        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                          <button type="button" className="btn btn-primary" disabled={busyId === q.id} onClick={() => void toOrder(q)}>
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
                      </>
                    ) : null}

                    {q.orderId && made ? (
                      <>
                        <Head right={<b className="text-green-800">{q.orderNumber}</b>}>ส่งลิงก์ชำระเงิน</Head>
                        <pre className="whitespace-pre-wrap break-all border border-gray-200 bg-gray-50 p-2 text-xs">{customerMessage(q, made)}</pre>
                        <div className="mt-2 grid gap-2">
                          <button type="button" className="btn btn-primary" onClick={() => void copy(customerMessage(q, made), q.id)}>
                            <Copy className="h-4 w-4" aria-hidden />
                            {copied === q.id ? "คัดลอกแล้ว" : "คัดลอกข้อความส่งลูกค้า"}
                          </button>
                          <Link href={`/admin/orders/${q.orderId}`} className="btn btn-secondary">
                            <ExternalLink className="h-4 w-4" aria-hidden />
                            ไปหน้าออเดอร์
                          </Link>
                        </div>
                        <p className="mt-2 text-xs text-muted">ยืนยันสลิป แพ็ก และใส่เลขพัสดุที่หน้าออเดอร์</p>
                      </>
                    ) : null}

                    {q.status === "closed" ? (
                      <>
                        <Head>ปิดคำขอแล้ว</Head>
                        <p className="text-xs text-muted">ไม่รับงานนี้ ถ้าเปลี่ยนใจกดเปิดกลับมายืนยันราคาได้</p>
                        <button
                          type="button"
                          className="btn btn-secondary mt-3 w-full"
                          disabled={busyId === q.id}
                          onClick={() => void setQuoteStatus(q.id, "new")}
                        >
                          เปิดคำขอนี้อีกครั้ง
                        </button>
                      </>
                    ) : null}
                  </section>
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
  if (Number.isNaN(d.getTime())) return null;
  const days = Math.ceil((d.getTime() - now) / 86_400_000);
  const label = d.toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });
  const urgent = days <= 3;
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-1 text-xs font-medium ${
        urgent ? "border-red-600 bg-red-50 text-red-800" : "border-gray-300 text-gray-700"
      }`}
    >
      <CalendarClock className="h-3.5 w-3.5" aria-hidden />
      ต้องการรับ {label}
      {urgent ? (days < 0 ? " · เลยกำหนด" : ` · อีก ${Math.max(0, days)} วัน`) : ""}
    </span>
  );
}
