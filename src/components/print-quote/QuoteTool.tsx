"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { customAlphabet } from "nanoid";
import {
  AlertTriangle,
  Bike,
  Box,
  Calculator,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Clock,
  Droplet,
  FileText,
  ImageDown,
  Info,
  Layers,
  Loader2,
  MapPin,
  Maximize2,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  Truck,
  Upload,
  User,
  XCircle,
} from "lucide-react";
import { ACCEPTED_EXT, analyseMesh, fileExt, isCadFile, MAX_FILE_BYTES, parseMesh, type MeshStats } from "@/lib/print-quote/mesh";
import {
  estimateOrder,
  fileStatus,
  formatHours,
  parcelFee,
  PRINT_CONFIG,
  type FileStatus,
  type Process,
  type Quality,
} from "@/lib/print-quote/pricing";
import { quoteRequestSchema, storageName, type QuoteRequest } from "@/lib/print-quote/request";
import { ThaiAddressFields } from "@/components/ThaiAddressFields";
import { renderThumb } from "./mesh-gl";
import { ModelViewer } from "./ModelViewer";

const MAX_FILES = 30;
const sessionId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 16);

type Item = {
  id: string;
  file: File;
  name: string;
  size: number;
  loading: boolean;
  tri?: Float32Array;
  stats?: MeshStats;
  thumb?: string | null;
  readError?: string;
  /** STEP/STP: no preview, the shop opens it. */
  cad?: boolean;
  qty: number;
  open: boolean;
  want: [string, string, string];
  note: string;
};

type Contact = QuoteRequest["contact"];

const baht = (n: number) => `฿${Math.ceil(n).toLocaleString("th-TH")}`;
const dims = (s: MeshStats) => s.size.map((n) => n.toFixed(1)).join(" × ");

function StatusChip({ st }: { st: FileStatus }) {
  const cls =
    st.level === "ok"
      ? "bg-[#ecf5ef] text-[#2f7a4d]"
      : st.level === "warn"
        ? "bg-[#fdf3e1] text-[#7a4c06]"
        : "bg-[#fdeeed] text-[#b3261e]";
  const Icon = st.level === "ok" ? CheckCircle2 : st.level === "warn" ? AlertTriangle : XCircle;
  return (
    <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs ${cls}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {st.text}
    </span>
  );
}

function Section({ no, title, right, children }: { no: string; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[3px] border border-[#d9dcdf] bg-white">
      <div className="flex items-center gap-2.5 border-b border-[#d9dcdf] px-4 py-3">
        <span className="grid h-[22px] w-[22px] place-items-center rounded-sm bg-navy text-[11px] font-semibold text-white">{no}</span>
        <h2 className="text-[15px] font-semibold tracking-normal">{title}</h2>
        {right && <span className="ml-auto text-xs text-muted">{right}</span>}
      </div>
      {children}
    </section>
  );
}

function Seg<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: React.ReactNode }[];
  label: string;
}) {
  return (
    <div className="flex overflow-hidden rounded-[3px] border border-navy" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={`flex flex-1 items-center justify-center gap-1.5 border-r border-navy px-1.5 py-2 text-[13px] last:border-r-0 ${
            value === o.v ? "bg-navy text-white" : "bg-white text-navy"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  optional,
  required,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  optional?: boolean;
  required?: boolean;
  children: React.ReactElement;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs text-muted">
        {label}
        {required && <span className="text-forge">*</span>}
        {optional && <span className="ml-auto text-[11px]">ไม่บังคับ</span>}
      </span>
      <span className="relative block">
        {Icon && <Icon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />}
        {children}
      </span>
    </label>
  );
}

const inputCls = (icon: boolean) =>
  `w-full rounded-[3px] border border-[#b7bfc5] bg-white py-2 pr-2.5 text-base outline-navy md:text-[13.5px] ${icon ? "pl-9" : "pl-2.5"}`;

export function QuoteTool({ lineId, lineUrl }: { lineId: string; lineUrl: string }) {
  const [process, setProcess] = useState<Process>("fdm");
  const [quality, setQuality] = useState<Quality>("normal");
  const [items, setItems] = useState<Item[]>([]);
  const [calculated, setCalculated] = useState(false);
  const [contact, setContact] = useState<Contact>({
    name: "",
    phone: "",
    address: "",
    province: "",
    district: "",
    subdistrict: "",
    zip: "",
    lineId: "",
    wantDate: "",
  });
  const [shipping, setShipping] = useState<"parcel" | "rider">("parcel");
  const [keepFiles, setKeepFiles] = useState(true);
  const [uploadsOn, setUploadsOn] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const session = useMemo(() => sessionId(), []);

  useEffect(() => {
    fetch("/api/print-quote/upload")
      .then((r) => r.json())
      .then((d) => setUploadsOn(Boolean(d.uploads)))
      .catch(() => setUploadsOn(false));
  }, []);

  const cfg = PRINT_CONFIG[process];
  const rows = items.map((it) => ({
    it,
    st: it.loading ? null : fileStatus(it.stats ?? null, process, it.readError, it.cad),
  }));
  const priceable = rows.filter(
    (r) => r.st && r.it.stats && (r.st.level === "ok" || (r.st.level === "warn" && r.st.autoPrice)),
  );
  const order = estimateOrder(
    priceable.map((r) => ({ stats: r.it.stats!, qty: Math.max(1, r.it.qty) })),
    process,
    quality,
  );
  const shipFee = shipping === "parcel" ? parcelFee(calculated ? order.printTHB : null) : null;
  const counts = { ok: 0, warn: 0, error: 0 };
  rows.forEach((r) => r.st && counts[r.st.level]++);
  const usable = rows.filter((r) => r.st && r.st.level !== "error");
  const lineTHB = new Map(priceable.map((r, i) => [r.it.id, order.lineTHB[i]]));
  const pricedPieces = priceable.reduce((s, r) => s + Math.max(1, r.it.qty), 0);
  const shopPieces = usable.reduce((s, r) => s + Math.max(1, r.it.qty), 0) - pricedPieces;

  function update(id: string, patch: Partial<Item>) {
    setItems((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    // Any change after sending allows sending an updated request.
    if (!("open" in patch) && !("loading" in patch)) setDone(null);
  }

  async function addFiles(files: FileList | File[]) {
    setDone(null);
    const list = Array.from(files);
    const room = MAX_FILES - items.length;
    if (list.length > room) {
      setNotice(
        room > 0
          ? `เพิ่มได้อีก ${room} ไฟล์ (สูงสุด ${MAX_FILES} ไฟล์ต่อคำขอ) ไฟล์ที่เหลือส่งทาง LINE หรือส่งคำขอแยก`
          : `ครบ ${MAX_FILES} ไฟล์แล้ว ไฟล์ที่เหลือส่งทาง LINE หรือส่งคำขอแยก`,
      );
    } else setNotice(null);
    for (const file of list.slice(0, Math.max(0, room))) {
      const id = sessionId();
      const base: Item = {
        id,
        file,
        name: file.name,
        size: file.size,
        loading: true,
        qty: 1,
        open: false,
        want: ["", "", ""],
        note: "",
      };
      setItems((l) => (l.length >= MAX_FILES ? l : [...l, base]));
      await new Promise((r) => setTimeout(r, 0));
      let patch: Partial<Item> = { loading: false };
      if (!(ACCEPTED_EXT as readonly string[]).includes(fileExt(file.name))) patch.readError = "ไม่ใช่ไฟล์ 3D (รับ STL, OBJ, 3MF, STEP) ถ้าเป็นรูปหรือแบบร่าง ส่งทาง LINE แทนได้";
      else if (file.size > MAX_FILE_BYTES) patch.readError = "ไฟล์ใหญ่เกิน 50 MB";
      else if (isCadFile(file.name)) patch.cad = true;
      else {
        try {
          const mesh = parseMesh(file.name, await file.arrayBuffer());
          const stats = mesh && analyseMesh(mesh.tri);
          if (!mesh || !stats) patch.readError = "อ่านไฟล์ไม่ได้ ไฟล์อาจเสีย";
          else patch = { ...patch, tri: mesh.tri, stats, thumb: renderThumb(mesh.tri, stats) };
        } catch {
          patch.readError = "อ่านไฟล์ไม่ได้ ไฟล์อาจเสีย";
        }
      }
      update(id, patch);
    }
  }

  function summaryText(id?: string) {
    const lines = usable
      .map((r) => {
        const want = r.it.want.some(Boolean) ? `\n   ขนาดที่ต้องการ ${r.it.want.map((w) => w || "-").join("×")} มม.` : "";
        const note = r.it.note.trim() ? `\n   หมายเหตุ: ${r.it.note.trim().slice(0, 200)}` : "";
        return `• ${r.it.name} × ${Math.max(1, r.it.qty)}${want}${note}`;
      })
      .join("\n");
    return [
      `ขอใบเสนอราคาพิมพ์ 3D${id ? ` #${id}` : ""}`,
      `${cfg.label} · layer ${cfg.layerMm[quality]} มม.`,
      lines,
      calculated && order.printTHB != null ? `ราคาประเมินจากเว็บ ${baht(order.printTHB)} (รอร้านยืนยัน)` : "",
      shipping === "parcel" ? `จัดส่ง: พัสดุ ${shipFee === 0 ? "ส่งฟรี" : `฿${PRINT_CONFIG.shippingTHB}`}` : "จัดส่ง: ด่วน Grab/ไรเดอร์ เก็บปลายทาง",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function openLine(id?: string) {
    const url = lineId
      ? `https://line.me/R/oaMessage/${encodeURIComponent(lineId)}/?${encodeURIComponent(summaryText(id))}`
      : lineUrl;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  async function saveImage() {
    if (!sheetRef.current) return;
    const { default: html2canvas } = await import("html2canvas-pro");
    const when = new Date().toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
    const canvas = await html2canvas(sheetRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      // Add shop name, date, request no. and the file list to the saved picture only.
      onclone: (doc, el) => {
        el.style.width = "420px";
        const head = doc.createElement("div");
        head.style.cssText = "font-size:13px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #3a4c58";
        head.innerHTML = `<b style="font-size:16px">BlackSmith Tools · ใบประเมินราคาพิมพ์ 3D</b><br><span style="color:#c5ced4"></span>`;
        head.querySelector("span")!.textContent = `${done ? `เลขที่ ${done} · ` : ""}${when} · layer ${cfg.layerMm[quality]} มม.`;
        el.prepend(head);
        const list = doc.createElement("div");
        list.style.cssText = "font-size:12px;margin-top:10px;color:#c5ced4;line-height:1.6";
        for (const r of usable) {
          const row = doc.createElement("div");
          const amt = lineTHB.get(r.it.id);
          row.textContent = `• ${r.it.name} × ${Math.max(1, r.it.qty)}  ${calculated && amt != null ? baht(amt) : "ร้านประเมิน"}`;
          list.append(row);
        }
        const foot = doc.createElement("div");
        foot.style.cssText = "margin-top:8px;font-size:11px";
        foot.textContent = "ราคาประมาณการ ร้านยืนยันราคาทาง LINE @black_smith ก่อนเริ่มพิมพ์";
        list.append(foot);
        el.append(list);
      },
    });
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `blacksmith-3d-quote-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  }

  async function submit() {
    setError(null);
    if (!usable.length) return setError("ยังไม่มีไฟล์ที่ใช้ได้");
    const sendRows = usable;
    const files = sendRows.map((r) => ({
      name: r.it.name.slice(0, 200),
      sizeBytes: r.it.size,
      dims: r.it.stats ? (r.it.stats.size.map((n) => Math.round(n * 10) / 10) as [number, number, number]) : null,
      qty: Math.max(1, r.it.qty),
      status: r.st?.level ?? "error",
      statusText: (r.st?.text ?? "").slice(0, 200),
      wantMm: r.it.want,
      note: r.it.note.slice(0, 1000),
      blobPath: undefined as string | undefined,
    }));
    const payload = {
      process,
      quality,
      files,
      contact,
      shipping,
      keepFiles,
      estimate: { printTHB: order.printTHB, hours: order.hours },
    };
    const check = quoteRequestSchema.safeParse(payload);
    if (!check.success) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      let msgs = [...new Set(check.error.issues.map((i) => i.message).filter((m) => m && !m.startsWith("Invalid")))];
      if (msgs.includes("เลือกตำบล/แขวง")) msgs = msgs.filter((m) => !m.includes("รหัสไปรษณีย์"));
      return setError(msgs.length ? `ยังขาด: ${msgs.join(" · ")}` : "กรอกข้อมูลผู้สั่งให้ครบ");
    }
    try {
      if (keepFiles && uploadsOn) {
        const { upload } = await import("@vercel/blob/client");
        for (let i = 0; i < sendRows.length; i++) {
          const r = sendRows[i];
          setSending(`กำลังอัปโหลด ${i + 1}/${sendRows.length}`);
          const blob = await upload(`print-quotes/${session}/${storageName(r.it.name)}`, r.it.file, {
            access: "private",
            handleUploadUrl: "/api/print-quote/upload",
            contentType: "application/octet-stream",
            multipart: r.it.size > 8 * 1024 * 1024,
          });
          files[i].blobPath = blob.pathname;
        }
      }
      setSending("กำลังส่งคำขอ");
      const res = await fetch("/api/print-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ส่งไม่สำเร็จ");
      setDone(data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSending(null);
    }
  }

  const set = (k: keyof Contact) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setContact((c) => ({ ...c, [k]: e.target.value }));

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid gap-5">
        <Section no="01" title="ตั้งค่างานพิมพ์" right={process === "resin" ? <span className="text-forge">* ค่าตัวอย่าง รอร้านยืนยัน</span> : "ใช้กับทุกไฟล์"}>
          <div className="grid gap-4 p-4 md:grid-cols-[1.25fr_1fr]">
            <div>
              <p className="mb-1.5 text-xs text-muted">ระบบพิมพ์</p>
              <Seg
                label="ระบบพิมพ์"
                value={process}
                onChange={setProcess}
                options={[
                  { v: "fdm", label: <><CircleDot className="h-4 w-4" aria-hidden />FDM · PETG</> },
                  { v: "resin", label: <><Droplet className="h-4 w-4" aria-hidden />Resin SLA/DLP</> },
                ]}
              />
            </div>
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs text-muted"><Layers className="h-3.5 w-3.5" aria-hidden />ความละเอียด (layer)</p>
              <Seg
                label="ความละเอียด"
                value={quality}
                onChange={setQuality}
                options={[
                  { v: "normal", label: `ปกติ ${cfg.layerMm.normal} มม.` },
                  { v: "fine", label: `ละเอียด ${cfg.layerMm.fine} มม.` },
                ]}
              />
            </div>
          </div>
          {process === "resin" && (
            <p className="mx-4 mb-4 flex items-start gap-2 rounded-[3px] border border-[#d9dcdf] bg-[#f3f6f8] px-3 py-2.5 text-[12.5px]">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              เรซิ่นเหมาะกับงานละเอียด เช่น ฟิกเกอร์ โมเดล ชิ้นส่วนเล็ก ผิวเนียนกว่า FDM แต่เปราะกว่า ไม่เหมาะกับงานรับแรง ร้านเติมซัพพอร์ต ล้าง และอบ UV ให้
            </p>
          )}
        </Section>

        <Section no="02" title="ไฟล์งาน" right={`${items.length} ไฟล์`}>
          <div className="p-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                addFiles(e.dataTransfer.files);
              }}
              className={`flex items-center justify-center gap-3 rounded-[3px] border-[1.5px] border-dashed p-4 text-[13px] text-muted ${
                dragOver ? "border-forge bg-[#fdf3f0]" : "border-[#9aa4ab] bg-[#fafbfb]"
              }`}
            >
              <span className="grid h-10 w-10 place-items-center rounded-[3px] bg-navy text-white">
                <Upload className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <b className="font-medium text-navy">ลากไฟล์มาวาง ได้หลายไฟล์พร้อมกัน</b>
                <span className="ml-1.5 text-[11.5px]">STL · OBJ · 3MF · STEP</span>
                <br />
                หรือ{" "}
                <button type="button" onClick={() => inputRef.current?.click()} className="px-1 py-2 text-forge underline">
                  เลือกไฟล์
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept={ACCEPTED_EXT.join(",")}
                  hidden
                  onChange={(e) => {
                    if (e.target.files) addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            {notice && (
              <p role="status" className="mt-2.5 flex items-start gap-1.5 text-[12.5px] text-[#a8680b]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {notice}
              </p>
            )}
            <div className="mt-3.5 rounded-[3px] border border-[#d9dcdf]">
              {!items.length ? (
                <p className="p-6 text-center text-[13px] text-muted">ยังไม่มีไฟล์</p>
              ) : (
                <>
                  <div className="hidden grid-cols-[56px_minmax(0,1fr)_112px_80px_160px] gap-3.5 border-b border-[#d9dcdf] bg-[#f3f4f5] px-3.5 py-2 text-[11.5px] text-muted md:grid">
                    <span />
                    <span>ไฟล์</span>
                    <span>จำนวน</span>
                    <span className="text-right">ราคา</span>
                    <span />
                  </div>
                  {rows.map(({ it, st }) => {
                    const line = lineTHB.get(it.id) ?? null;
                    const canPrice = st && (st.level === "ok" || (st.level === "warn" && st.autoPrice));
                    return (
                      <div key={it.id} className="border-t border-[#d9dcdf] first:border-t-0 md:[&:nth-child(2)]:border-t-0">
                        <div className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3.5 px-3.5 py-3 md:grid-cols-[56px_minmax(0,1fr)_112px_80px_160px]">
                          <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-sm border border-[#d9dcdf] bg-[#f3f4f5] text-[#9aa4ab]">
                            {it.loading ? (
                              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                            ) : it.thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={it.thumb} alt="" className="h-full w-full object-contain" />
                            ) : st?.level === "error" ? (
                              <XCircle className="h-5 w-5" aria-hidden />
                            ) : (
                              <Box className="h-5 w-5" aria-hidden />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium" title={it.name}>{it.name}</p>
                            <p className="flex items-center gap-1.5 text-xs text-muted">
                              {(it.size / 1e6).toFixed(1)} MB
                              {it.stats && (
                                <>
                                  {" · "}
                                  <Maximize2 className="h-3 w-3" aria-hidden />
                                  {dims(it.stats)} มม.
                                </>
                              )}
                            </p>
                            {it.loading ? <span className="text-xs text-muted">กำลังอ่านไฟล์…</span> : st && <StatusChip st={st} />}
                          </div>
                          <div className="col-start-2 md:col-start-auto">
                            {st && st.level !== "error" && (
                              <div className="flex h-10 w-[124px] items-center overflow-hidden rounded-[3px] border border-navy md:h-8 md:w-[104px]">
                                <button type="button" aria-label="ลดจำนวน" onClick={() => update(it.id, { qty: Math.max(1, it.qty - 1) })} className="grid h-full w-10 place-items-center bg-navy text-white md:w-[30px]">
                                  <Minus className="h-4 w-4" />
                                </button>
                                <input
                                  aria-label="จำนวน"
                                  inputMode="numeric"
                                  value={it.qty || ""}
                                  onChange={(e) => update(it.id, { qty: Math.min(10000, parseInt(e.target.value.replace(/\D/g, "")) || 0) })}
                                  onBlur={() => it.qty < 1 && update(it.id, { qty: 1 })}
                                  onFocus={(e) => e.target.select()}
                                  className="w-11 border-0 text-center text-base outline-none md:text-sm"
                                />
                                <button type="button" aria-label="เพิ่มจำนวน" onClick={() => update(it.id, { qty: Math.min(10000, it.qty + 1) })} className="grid h-full w-10 place-items-center bg-navy text-white md:w-[30px]">
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="text-right text-[15px] font-semibold">
                            {!st ? null : st.level === "error" ? (
                              <span className="text-[13px] font-normal text-[#b3261e]">พิมพ์ไม่ได้</span>
                            ) : !canPrice ? (
                              <span className="text-[13px] font-normal text-[#a8680b]">ร้านประเมิน</span>
                            ) : calculated ? (
                              <>
                                {line != null ? baht(line) : "฿ —"}
                                {line == null ? (
                                  <small className="block text-[11px] font-normal text-muted">รอร้านยืนยัน</small>
                                ) : (
                                  it.qty > 1 && <small className="block text-[11px] font-normal text-muted">{it.qty} ชิ้น</small>
                                )}
                              </>
                            ) : (
                              <small className="text-[11px] font-normal text-muted">กดคำนวณ</small>
                            )}
                          </div>
                          <div className="col-span-3 flex justify-end gap-1.5 md:col-span-1">
                            {(it.stats || it.cad) && st?.level !== "error" && (
                              <button
                                type="button"
                                aria-expanded={it.open}
                                onClick={() => update(it.id, { open: !it.open })}
                                className={`flex h-8 items-center gap-1.5 rounded-[3px] border border-navy pl-3 pr-2.5 text-[13px] font-medium ${
                                  it.open ? "bg-navy text-white" : "bg-white"
                                }`}
                              >
                                รายละเอียด
                                {it.open ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
                              </button>
                            )}
                            <button
                              type="button"
                              aria-label={`ลบ ${it.name}`}
                              onClick={() => setItems((l) => l.filter((x) => x.id !== it.id))}
                              className="grid h-8 w-8 place-items-center rounded-[3px] border border-[#d9dcdf] bg-white hover:border-[#b3261e] hover:text-[#b3261e]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {it.open && ((it.tri && it.stats) || it.cad) && (
                          <div className="grid border-t border-dashed border-[#d9dcdf] bg-[#fafbfb] md:grid-cols-[1.15fr_1fr]">
                            <div className="md:border-r md:border-[#d9dcdf]">
                              {it.tri && it.stats ? (
                                <ModelViewer tri={it.tri} stats={it.stats} />
                              ) : (
                                <div className="grid h-[180px] place-items-center p-4 text-center text-[12.5px] text-muted">
                                  <span>
                                    <Box className="mx-auto mb-2 h-7 w-7" aria-hidden />
                                    ไฟล์ STEP ดูตัวอย่างบนเว็บไม่ได้
                                    <br />
                                    ร้านจะเปิดในโปรแกรม CAD แล้วแจ้งขนาดและราคาให้
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="grid content-start gap-3 p-3.5">
                              {it.stats && (
                              <dl className="grid grid-cols-[1fr_auto] rounded-[3px] border border-[#d9dcdf] bg-white text-[12.5px] [&>*]:border-b [&>*]:border-[#d9dcdf] [&>*]:px-2.5 [&>*]:py-1.5 [&>*:nth-last-child(-n+2)]:border-b-0">
                                <dt>ขนาดที่ตรวจพบ</dt>
                                <dd className="text-right font-medium">{dims(it.stats)} มม.</dd>
                                <dt>ด้านยาวสุด / เครื่องรับได้</dt>
                                <dd className="text-right font-medium">{Math.round(Math.max(...it.stats.size))} / {cfg.maxMm} มม.</dd>
                                <dt>ผิวโมเดล</dt>
                                <dd className={`text-right font-medium ${it.stats.openEdges || it.stats.nonManifoldEdges ? "text-[#a8680b]" : "text-[#2f7a4d]"}`}>
                                  {it.stats.openEdges || it.stats.nonManifoldEdges ? "ร้านซ่อมให้" : "สมบูรณ์"}
                                </dd>
                              </dl>
                              )}
                              <div>
                                <p className="mb-1.5 flex items-center gap-1.5 text-xs text-muted"><Maximize2 className="h-3.5 w-3.5" aria-hidden />ขนาดที่ต้องการ (ถ้าไม่ตรงไฟล์)</p>
                                <div className="flex items-center gap-1.5 text-xs text-muted">
                                  {(["กว้าง", "ยาว", "สูง"] as const).map((ph, k) => (
                                    <span key={ph} className="contents">
                                      {k > 0 && "×"}
                                      <input
                                        aria-label={`${ph} (มม.)`}
                                        placeholder={ph}
                                        inputMode="decimal"
                                        maxLength={8}
                                        value={it.want[k]}
                                        onChange={(e) => {
                                          const w = [...it.want] as Item["want"];
                                          w[k] = e.target.value.replace(/[^0-9.]/g, "");
                                          update(it.id, { want: w });
                                        }}
                                        className="w-16 rounded-[3px] border border-navy px-1 py-1 text-center text-[13px] text-navy"
                                      />
                                    </span>
                                  ))}
                                  มม.
                                </div>
                              </div>
                              <label className="block">
                                <span className="mb-1.5 flex items-center gap-1.5 text-xs text-muted"><MessageCircle className="h-3.5 w-3.5" aria-hidden />หมายเหตุถึงร้าน</span>
                                <textarea
                                  value={it.note}
                                  maxLength={1000}
                                  onChange={(e) => update(it.id, { note: e.target.value })}
                                  placeholder="เช่น ย่อให้พอดีเครื่องมือรุ่น M12"
                                  className="min-h-[58px] w-full resize-y rounded-[3px] border border-[#d9dcdf] px-2.5 py-2 text-[13px] outline-navy"
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-4">
              {items.length > 0 && (
                <div className="flex gap-3.5 text-[12.5px]">
                  <span className="flex items-center gap-1 text-[#2f7a4d]"><CheckCircle2 className="h-4 w-4" aria-hidden />{counts.ok} ปกติ</span>
                  <span className="flex items-center gap-1 text-[#a8680b]"><AlertTriangle className="h-4 w-4" aria-hidden />{counts.warn} เตือน</span>
                  <span className="flex items-center gap-1 text-[#b3261e]"><XCircle className="h-4 w-4" aria-hidden />{counts.error} ใช้ไม่ได้</span>
                </div>
              )}
              <button
                type="button"
                disabled={!priceable.length}
                onClick={() => {
                  setCalculated(true);
                  if (window.matchMedia("(max-width: 1023px)").matches)
                    setTimeout(() => sheetRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
                }}
                className="ml-auto flex items-center gap-2 rounded-[3px] bg-navy px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                <Calculator className="h-4 w-4" aria-hidden />
                คำนวณราคา
              </button>
            </div>
          </div>
        </Section>

        <div ref={formRef} className="scroll-mt-24">
          <Section no="03" title="ข้อมูลผู้สั่งและการจัดส่ง">
            <div className="grid gap-3.5 p-4 md:grid-cols-2">
              <Field label="ชื่อ-นามสกุล" icon={User} required>
                <input className={inputCls(true)} autoComplete="name" maxLength={120} value={contact.name} onChange={set("name")} placeholder="ชื่อผู้รับ" />
              </Field>
              <Field label="เบอร์โทร" icon={Phone} required>
                <input className={inputCls(true)} autoComplete="tel" inputMode="tel" maxLength={20} value={contact.phone} onChange={set("phone")} placeholder="08x-xxx-xxxx" />
              </Field>
              <div className="md:col-span-2">
                <ThaiAddressFields
                  idPrefix="pq"
                  value={{ province: contact.province, district: contact.district, subdistrict: contact.subdistrict, postalCode: contact.zip }}
                  onChange={(a) =>
                    setContact((c) => ({ ...c, province: a.province, district: a.district, subdistrict: a.subdistrict, zip: a.postalCode }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Field label="ที่อยู่" icon={MapPin} required>
                  <input className={inputCls(true)} autoComplete="street-address" maxLength={400} value={contact.address} onChange={set("address")} placeholder="บ้านเลขที่ หมู่ ซอย ถนน" />
                </Field>
              </div>
              <Field label="LINE ID" icon={MessageCircle} optional>
                <input className={inputCls(true)} maxLength={60} value={contact.lineId} onChange={set("lineId")} placeholder="ให้ร้านทักยืนยัน" />
              </Field>
              <Field label="วันที่ต้องการรับ" icon={Calendar} optional>
                <input className={inputCls(true)} type="date" value={contact.wantDate} onChange={set("wantDate")} />
              </Field>
              <div className="md:col-span-2">
                <p className="mb-1.5 text-xs text-muted">วิธีจัดส่ง</p>
                <div className="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="วิธีจัดส่ง">
                  {(
                    [
                      { v: "parcel", Icon: Truck, t: `พัสดุปกติ · ฿${PRINT_CONFIG.shippingTHB}`, d: `ส่งฟรีเมื่อยอด ${PRINT_CONFIG.freeShipFromTHB.toLocaleString("th-TH")} บาทขึ้นไป` },
                      { v: "rider", Icon: Bike, t: "ด่วน · Grab / ไรเดอร์", d: "ร้านเรียกให้ ลูกค้าจ่ายค่าส่งปลายทางตามระยะทาง" },
                    ] as const
                  ).map(({ v, Icon, t, d }) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={shipping === v}
                      onClick={() => setShipping(v)}
                      className={`flex items-start gap-3 rounded-[3px] border p-3 text-left ${
                        shipping === v ? "border-navy shadow-[inset_0_0_0_1px_var(--navy)]" : "border-[#d9dcdf]"
                      }`}
                    >
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[3px] ${shipping === v ? "bg-navy text-white" : "bg-[#f3f4f5]"}`}>
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span>
                        <b className="block text-[13.5px] font-medium">{t}</b>
                        <small className="block text-xs leading-snug text-muted">{d}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="flex items-center gap-1.5 px-4 pb-4 text-[11.5px] text-muted">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                ใช้เพื่อติดต่อและจัดส่งงานนี้เท่านั้น ตาม<a href="/privacy" className="underline">นโยบายความเป็นส่วนตัว</a>
              </span>
            </p>
          </Section>
        </div>
      </div>

      <aside className="grid gap-3.5 lg:sticky lg:top-24">
        <div ref={sheetRef} className="rounded-[3px] bg-navy p-[18px] text-white">
          <p className="flex items-center gap-1.5 text-xs text-[#c5ced4]"><Calculator className="h-3.5 w-3.5" aria-hidden />ราคาประมาณการ · {cfg.label}</p>
          <p className="my-1 text-[34px] font-semibold leading-tight tracking-tight">
            {calculated && order.printTHB != null ? baht(order.printTHB + (shipFee ?? 0)) : "฿ —"}
          </p>
          <div className="mt-2 border-t border-[#3a4c58] text-[13px] [&>div]:flex [&>div]:items-center [&>div]:justify-between [&>div]:border-b [&>div]:border-[#3a4c58] [&>div]:py-2">
            <div>
              <span className="flex items-center gap-1.5 text-[#c5ced4]"><Box className="h-4 w-4" aria-hidden />ค่าพิมพ์ {pricedPieces} ชิ้น{shopPieces > 0 ? ` (+${shopPieces} รอร้านประเมิน)` : ""}</span>
              <b>{calculated && order.printTHB != null ? baht(order.printTHB) : "฿ —"}</b>
            </div>
            <div>
              <span className="flex items-center gap-1.5 text-[#c5ced4]"><Truck className="h-4 w-4" aria-hidden />ค่าส่ง</span>
              <b>{shipFee == null ? "เก็บปลายทาง" : shipFee === 0 ? "ส่งฟรี" : `฿${shipFee}`}</b>
            </div>
            <div>
              <span className="flex items-center gap-1.5 text-[#c5ced4]"><Clock className="h-4 w-4" aria-hidden />เวลาพิมพ์รวม</span>
              <b>{calculated ? formatHours(order.hours) : "—"}</b>
            </div>
          </div>
          {calculated && order.minApplied && (
            <p className="mt-2 text-[11.5px] text-[#c5ced4]">งานพิมพ์ไม่ถึง 1 ชม. คิดขั้นต่ำ ฿{PRINT_CONFIG[process].minOrderTHB}</p>
          )}
          {calculated && order.printTHB == null && priceable.length > 0 && (
            <p className="mt-2 text-[11.5px] text-[#c5ced4]">ร้านจะแจ้งราคาหลังตรวจไฟล์</p>
          )}
        </div>

        <div className="rounded-[3px] border border-l-[3px] border-[#d9dcdf] border-l-forge bg-white px-3.5 py-3 text-xs text-muted">
          <p className="mb-1 flex items-center gap-1.5 text-[12.5px] font-medium text-navy"><Info className="h-4 w-4" aria-hidden />ราคานี้เป็นราคาประมาณการ</p>
          <ul className="list-disc pl-4">
            <li>ร้านอาจต้องตรวจไฟล์ก่อนพิมพ์ และอาจมีส่วนลดเพิ่มหลังตรวจ</li>
            <li>ค่าส่ง ฿{PRINT_CONFIG.shippingTHB}/ออเดอร์ ส่งฟรีเมื่อยอดสั่ง {PRINT_CONFIG.freeShipFromTHB.toLocaleString("th-TH")} บาทขึ้นไป อาจเปลี่ยนตามการตรวจออเดอร์ก่อนพิมพ์จริง</li>
            <li>ไฟล์ที่ขึ้น “ร้านประเมิน” (เช่น STEP) ยังไม่รวมในราคานี้ ร้านแจ้งราคาให้หลังตรวจ</li>
          </ul>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-[3px] border border-[#d9dcdf] bg-white px-3.5 py-3 text-[12.5px]">
          <input type="checkbox" checked={keepFiles} onChange={(e) => setKeepFiles(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-navy" />
          <span>
            <b className="font-medium">ส่งไฟล์ให้ร้าน ใช้เพื่องานนี้เท่านั้น</b>
            <small className="block text-[11.5px] text-muted">
              ร้านไม่นำไปใช้ต่อหรือผลิตซ้ำ และลบไฟล์อัตโนมัติใน 30 วัน ถ้าไม่ติ๊ก ร้านจะขอไฟล์ทางแชทแทน
            </small>
          </span>
        </label>

        {done ? (
          <div className="rounded-[3px] border border-[#2f7a4d] bg-[#ecf5ef] p-3.5 text-[13px] text-[#1f5a37]">
            <p className="flex items-center gap-1.5 font-semibold"><CheckCircle2 className="h-4 w-4" aria-hidden />ส่งคำขอแล้ว เลขที่ {done}</p>
            <p className="mt-1 text-xs">ร้านจะตรวจไฟล์และยืนยันราคาทาง LINE / โทรกลับ</p>
          </div>
        ) : (
          <button
            type="button"
            disabled={!usable.length || Boolean(sending)}
            onClick={submit}
            className="flex w-full items-center justify-center gap-2 rounded-[3px] bg-forge p-3 text-[15px] font-semibold text-white hover:bg-forge-hover disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <FileText className="h-5 w-5" aria-hidden />}
            {sending ?? "ขอใบเสนอราคา"}
          </button>
        )}
        {error && <p role="alert" className="text-[12.5px] text-[#b3261e]">{error}</p>}
        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" disabled={!usable.length} onClick={saveImage} className="flex items-center justify-center gap-1.5 rounded-[3px] border border-navy bg-white p-2.5 text-[13px] font-medium disabled:opacity-40">
            <ImageDown className="h-4 w-4" aria-hidden />บันทึกรูป
          </button>
          <button type="button" onClick={() => openLine(done ?? undefined)} className="flex items-center justify-center gap-1.5 rounded-[3px] border border-navy bg-white p-2.5 text-[13px] font-medium">
            <MessageCircle className="h-4 w-4" aria-hidden />คุยทาง LINE
          </button>
        </div>
        <p className="text-center text-[11px] text-muted">ร้านตรวจและยืนยันราคาทาง LINE ก่อนเริ่มพิมพ์</p>
      </aside>
    </div>
  );
}
