"use client";

import { useEffect, useState } from "react";
import { adminJson } from "@/lib/admin-client";
import type { WholesaleLead } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

const FILTERS = [
  { id: "", label: "ทั้งหมด" },
  { id: "new", label: "รอติดต่อ" },
  { id: "contacted", label: "ติดต่อแล้ว" },
  { id: "closed", label: "ปิดงาน" },
];

const STATUS_LABEL: Record<string, string> = {
  new: "รอติดต่อ",
  contacted: "ติดต่อแล้ว",
  closed: "ปิดงาน",
};

const STATUS_TONE: Record<string, string> = {
  new: "bg-orange-100 text-orange-900",
  contacted: "bg-blue-100 text-blue-900",
  closed: "bg-gray-100 text-gray-600",
};

export default function AdminInquiriesPage() {
  const [status, setStatus] = useState("new");
  const [rows, setRows] = useState<WholesaleLead[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function load(next = status) {
    setError("");
    try {
      const p = new URLSearchParams({ resource: "inquiries" });
      if (next) p.set("status", next);
      const data = await adminJson<{ inquiries: WholesaleLead[] }>(`/api/admin?${p}`);
      setRows(data.inquiries);
      setNotes(Object.fromEntries(data.inquiries.map((i) => [i.id, i.adminNote ?? ""])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function update(id: string, patch: { status?: string; adminNote?: string }) {
    setBusyId(id);
    setError("");
    try {
      await adminJson("/api/admin", {
        method: "POST",
        body: JSON.stringify({ action: "update_inquiry", id, ...patch }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">ขายส่ง</h1>
      <p className="mt-1 text-sm text-muted">ใบสมัครจากหน้าเว็บ — ติดต่อกลับแล้วเปลี่ยนสถานะ</p>

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

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      {!rows ? (
        <p className="mt-6 text-sm text-muted">กำลังโหลดใบสมัคร…</p>
      ) : rows.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-sm text-muted">
          ยังไม่มีใบสมัคร{status ? `สถานะ${STATUS_LABEL[status]}` : ""}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {rows.map((lead) => (
            <article key={lead.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-navy">{lead.number}</p>
                  <p className="text-sm text-muted">{formatDateTime(lead.createdAt)}</p>
                </div>
                <span className={`badge ${STATUS_TONE[lead.status]}`}>{STATUS_LABEL[lead.status]}</span>
              </div>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">ร้าน / เพจ</dt>
                  <dd className="font-medium">{lead.shopName}</dd>
                </div>
                <div>
                  <dt className="text-muted">จังหวัด</dt>
                  <dd>{lead.province}</dd>
                </div>
                <div>
                  <dt className="text-muted">ช่องทางขาย</dt>
                  <dd>{lead.channel}</dd>
                </div>
                <div>
                  <dt className="text-muted">ติดต่อกลับ</dt>
                  <dd>
                    {lead.contact.replace(/\D/g, "").length >= 9 ? (
                      <a className="underline" href={`tel:${lead.contact}`}>
                        {lead.contact}
                      </a>
                    ) : (
                      lead.contact
                    )}
                  </dd>
                </div>
              </dl>
              {lead.note ? <p className="mt-3 text-sm">รายละเอียด: {lead.note}</p> : null}
              <div className="mt-4">
                <label className="label" htmlFor={`n-${lead.id}`}>
                  โน้ตทีม
                </label>
                <textarea
                  id={`n-${lead.id}`}
                  className="input min-h-[72px]"
                  value={notes[lead.id] ?? ""}
                  onChange={(e) => setNotes((s) => ({ ...s, [lead.id]: e.target.value }))}
                />
                <button
                  type="button"
                  className="btn btn-secondary mt-2"
                  disabled={busyId === lead.id}
                  onClick={() => void update(lead.id, { adminNote: notes[lead.id] ?? "" })}
                >
                  บันทึกโน้ต
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {lead.status === "new" ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busyId === lead.id}
                    onClick={() => void update(lead.id, { status: "contacted" })}
                  >
                    ติดต่อแล้ว
                  </button>
                ) : null}
                {lead.status !== "closed" ? (
                  <button
                    type="button"
                    className="btn btn-navy"
                    disabled={busyId === lead.id}
                    onClick={() => void update(lead.id, { status: "closed" })}
                  >
                    ปิดงาน
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busyId === lead.id}
                    onClick={() => void update(lead.id, { status: "new" })}
                  >
                    เปิดใหม่
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
