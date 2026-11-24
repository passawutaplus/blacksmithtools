"use client";

import { useEffect, useState } from "react";
import { adminJson } from "@/lib/admin-client";
import { VOUCHER_KINDS, VOUCHER_KIND_LABEL, voucherCondition, voucherHeadline } from "@/lib/vouchers";
import type { Voucher, VoucherKind } from "@/lib/types";

const EMPTY = {
  code: "",
  kind: "fixed" as VoucherKind,
  value: "30",
  minSubtotal: "500",
  maxDiscount: "0",
  endsAt: "",
  usageLimit: "0",
  oncePerPhone: true,
  public: true,
};

export default function AdminVouchersPage() {
  const [rows, setRows] = useState<Voucher[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await adminJson<{ vouchers: Voucher[] }>("/api/admin?resource=vouchers");
    setRows(r.vouchers);
  }
  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
  }, []);

  async function post(body: object, ok: string) {
    setBusy(true);
    setError("");
    setSaved("");
    try {
      await adminJson("/api/admin", { method: "POST", body: JSON.stringify(body) });
      setSaved(ok);
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const done = await post(
      {
        action: "save_voucher",
        voucher: {
          code: form.code,
          kind: form.kind,
          value: Number(form.value),
          minSubtotal: Number(form.minSubtotal),
          maxDiscount: Number(form.maxDiscount),
          endsAt: form.endsAt ? new Date(`${form.endsAt}T23:59:59+07:00`).toISOString() : "",
          usageLimit: Number(form.usageLimit),
          oncePerPhone: form.oncePerPhone,
          public: form.public,
        },
      },
      "สร้างคูปองแล้ว",
    );
    if (done) setForm(EMPTY);
  }

  const f = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">คูปองส่วนลด</h1>
      <p className="mt-1 text-sm text-muted">
        ระบบตรวจเงื่อนไขและตัดสิทธิ์ที่เซิร์ฟเวอร์ตอนสั่งซื้อ ลูกค้าแก้ราคาในเบราว์เซอร์ไม่ได้
      </p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {saved ? <p className="mt-3 text-sm text-emerald-700">{saved}</p> : null}

      <form onSubmit={(e) => void create(e)} className="card mt-6 space-y-4 p-4 md:p-6">
        <h2 className="font-semibold text-navy">สร้างคูปองใหม่</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label" htmlFor="vc">โค้ด (A-Z 0-9)</label>
            <input id="vc" className="input" value={form.code} onChange={f("code")} placeholder="WELCOME30" required />
          </div>
          <div>
            <label className="label" htmlFor="vk">ประเภท</label>
            <select id="vk" className="input" value={form.kind} onChange={f("kind")}>
              {VOUCHER_KINDS.map((k) => (
                <option key={k} value={k}>{VOUCHER_KIND_LABEL[k]}</option>
              ))}
            </select>
          </div>
          {form.kind !== "free_shipping" ? (
            <div>
              <label className="label" htmlFor="vv">{form.kind === "percent" ? "ลดกี่ %" : "ลดกี่บาท"}</label>
              <input id="vv" className="input" inputMode="numeric" value={form.value} onChange={f("value")} />
            </div>
          ) : null}
          <div>
            <label className="label" htmlFor="vm">ยอดสินค้าขั้นต่ำ (บาท)</label>
            <input id="vm" className="input" inputMode="numeric" value={form.minSubtotal} onChange={f("minSubtotal")} />
          </div>
          {form.kind === "percent" ? (
            <div>
              <label className="label" htmlFor="vx">ลดสูงสุด (บาท, 0 = ไม่จำกัด)</label>
              <input id="vx" className="input" inputMode="numeric" value={form.maxDiscount} onChange={f("maxDiscount")} />
            </div>
          ) : null}
          <div>
            <label className="label" htmlFor="ve">หมดอายุวันที่ (ว่าง = ไม่หมด)</label>
            <input id="ve" className="input" type="date" value={form.endsAt} onChange={f("endsAt")} />
          </div>
          <div>
            <label className="label" htmlFor="vl">จำนวนสิทธิ์ทั้งหมด (0 = ไม่จำกัด)</label>
            <input id="vl" className="input" inputMode="numeric" value={form.usageLimit} onChange={f("usageLimit")} />
          </div>
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.oncePerPhone} onChange={(e) => setForm({ ...form, oncePerPhone: e.target.checked })} />
            เบอร์เดียวใช้ได้ครั้งเดียว
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.public} onChange={(e) => setForm({ ...form, public: e.target.checked })} />
            โชว์ปุ่ม “เก็บโค้ด” บนหน้าสินค้า (ไม่ติ๊ก = โค้ดลับ ต้องพิมพ์เอง)
          </label>
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "กำลังบันทึก…" : "สร้างคูปอง"}
        </button>
      </form>

      <section className="mt-6">
        <h2 className="font-semibold text-navy">คูปองทั้งหมด</h2>
        {rows && rows.length === 0 ? <p className="mt-3 text-sm text-muted">ยังไม่มีคูปอง</p> : null}
        <ul className="mt-3 space-y-3">
          {(rows ?? []).map((v) => (
            <li key={v.id} className="card p-4">
              <p className="text-sm text-navy">
                <b className="num">{v.code}</b> · {voucherHeadline(v)} · {voucherCondition(v)}
              </p>
              <p className="mt-1 text-xs text-muted">
                ใช้แล้ว {v.usedCount}
                {v.usageLimit ? `/${v.usageLimit}` : ""} ครั้ง
                {v.endsAt ? ` · หมดอายุ ${new Date(v.endsAt).toLocaleDateString("th-TH")}` : ""}
                {v.public ? " · โชว์หน้าร้าน" : " · โค้ดลับ"}
                {v.oncePerPhone ? " · เบอร์ละ 1 ครั้ง" : ""}
                {v.active ? "" : " · ปิดอยู่"}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={busy}
                  onClick={() => void post({ action: "save_voucher", voucher: { id: v.id, active: !v.active } }, v.active ? "ปิดคูปองแล้ว" : "เปิดคูปองแล้ว")}
                >
                  {v.active ? "ปิด" : "เปิด"}
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  disabled={busy}
                  onClick={() => {
                    if (confirm(`ลบโค้ด ${v.code}?`)) void post({ action: "delete_voucher", id: v.id }, "ลบแล้ว");
                  }}
                >
                  ลบ
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
