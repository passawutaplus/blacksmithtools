"use client";

import { useEffect, useState } from "react";
import { adminJson } from "@/lib/admin-client";
import { GO_QR_DOWNLOAD_NAME, GO_QR_URL } from "@/lib/go-qr";
import { GITHUB_REPO, SUPABASE_DASHBOARD } from "@/lib/project-links";
import type { SiteSettings } from "@/lib/types";

const EMPTY: SiteSettings = {
  shopName: "",
  tagline: "",
  address: "",
  phone: "",
  email: "",
  taxId: "",
  lineUrl: "",
  lineId: "",
  shopeeShopUrl: "",
  lazadaShopUrl: "",
  thaiMartShopUrl: "",
  tiktokShopUrl: "",
  facebookUrl: "",
  instagramUrl: "",
  youtubeUrl: "",
  tiktokSocialUrl: "",
  bankName: "",
  bankAccountName: "",
  bankAccountNumber: "",
  promptPayId: "",
  paymentsLive: false,
  freeShippingMin: 0,
  flatShippingFee: 0,
  shopeeRating: 0,
  shopeeReviewCount: 0,
};

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminJson<{ settings: SiteSettings }>("/api/admin?resource=settings")
      .then((d) => setSettings(d.settings))
      .catch((e: Error) => setError(e.message));
  }, []);

  const s = settings ?? EMPTY;

  function patch(p: Partial<SiteSettings>) {
    setSettings({ ...s, ...p });
    setSaved(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const data = await adminJson<{ settings: SiteSettings }>("/api/admin", {
        method: "POST",
        body: JSON.stringify({
          action: "update_settings",
          settings: {
            ...s,
            freeShippingMin: Number(s.freeShippingMin),
            flatShippingFee: Number(s.flatShippingFee),
          },
        }),
      });
      setSettings(data.settings);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  if (!settings && !error) return <p className="text-sm text-muted">กำลังโหลดตั้งค่า…</p>;

  return (
    <form onSubmit={(e) => void submit(e)}>
      <h1 className="text-2xl font-bold text-navy">ตั้งค่าร้าน</h1>
      <p className="mt-1 text-sm text-muted">ข้อมูลนี้โชว์บนหน้าร้าน ใบเสร็จ และหน้าโอนเงิน</p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {saved ? <p className="mt-3 text-sm text-emerald-700">บันทึกแล้ว</p> : null}

      <section className="card mt-6 space-y-4 p-4 md:p-6">
        <h2 className="font-semibold text-navy">ข้อมูลร้าน</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="shopName" label="ชื่อร้าน" value={s.shopName} onChange={(v) => patch({ shopName: v })} />
          <Field id="tagline" label="สโลแกน" value={s.tagline} onChange={(v) => patch({ tagline: v })} />
          <Field id="phone" label="โทร" value={s.phone} onChange={(v) => patch({ phone: v })} />
          <Field id="email" label="อีเมล" value={s.email} onChange={(v) => patch({ email: v })} />
          <Field id="taxId" label="เลขผู้เสียภาษี" value={s.taxId} onChange={(v) => patch({ taxId: v })} />
        </div>
        <div>
          <label className="label" htmlFor="address">
            ที่อยู่ร้าน / ที่อยู่คืนของ
          </label>
          <textarea
            id="address"
            className="input min-h-[80px]"
            value={s.address}
            onChange={(e) => patch({ address: e.target.value })}
          />
          <p className="mt-1 text-xs text-muted">ใช้บนใบเสร็จ หน้าร้าน และใบปะหน้าส่งของ (ที่อยู่คืนพัสดุ)</p>
        </div>
      </section>

      <section className="card mt-4 space-y-4 p-4 md:p-6">
        <h2 className="font-semibold text-navy">ช่องทางติดต่อ / ขาย</h2>
        <p className="text-sm text-muted">
          ลิงก์เหล่านี้โชว์บนหน้า QR{" "}
          <a href="/go" className="underline" target="_blank" rel="noreferrer">
            /go
          </a>{" "}
          — เว้นว่างถ้ายังไม่มีร้าน
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="lineId" label="LINE ID" value={s.lineId} onChange={(v) => patch({ lineId: v })} />
          <Field id="lineUrl" label="ลิงก์ LINE" value={s.lineUrl} onChange={(v) => patch({ lineUrl: v })} />
          <Field id="shopee" label="ร้าน Shopee" value={s.shopeeShopUrl} onChange={(v) => patch({ shopeeShopUrl: v })} />
          <Field id="lazada" label="ร้าน Lazada" value={s.lazadaShopUrl} onChange={(v) => patch({ lazadaShopUrl: v })} />
          <Field id="thaimart" label="ร้านไทยมาร์ท" value={s.thaiMartShopUrl} onChange={(v) => patch({ thaiMartShopUrl: v })} />
          <Field id="tiktokShop" label="TikTok Shop" value={s.tiktokShopUrl} onChange={(v) => patch({ tiktokShopUrl: v })} />
          <Field id="facebook" label="Facebook" value={s.facebookUrl} onChange={(v) => patch({ facebookUrl: v })} />
          <Field id="ig" label="Instagram" value={s.instagramUrl} onChange={(v) => patch({ instagramUrl: v })} />
          <Field id="tiktokSocial" label="TikTok (โซเชียล)" value={s.tiktokSocialUrl} onChange={(v) => patch({ tiktokSocialUrl: v })} />
          <Field id="yt" label="YouTube" value={s.youtubeUrl} onChange={(v) => patch({ youtubeUrl: v })} />
        </div>
      </section>

      <section className="card mt-4 space-y-4 p-4 md:p-6">
        <h2 className="font-semibold text-navy">QR สติกเกอร์สินค้า</h2>
        <p className="text-sm text-muted">
          สแกนแล้วเข้า{" "}
          <a href="/go" className="underline" target="_blank" rel="noreferrer">
            /go
          </a>{" "}
          — ไฟล์ SVG ย่อขยายได้ไม่แตก เอาไปวางในงานพิมพ์สติกเกอร์ได้เลย
        </p>
        <div className="flex flex-wrap items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/go/qr.svg"
            alt="QR ไปหน้าช่องทางร้าน"
            className="h-40 w-40 rounded-lg bg-white p-2 ring-1 ring-navy/10"
          />
          <div className="space-y-2">
            <p className="font-latin text-sm text-navy">{GO_QR_URL}</p>
            <p className="text-xs text-muted">แนะนำไม่เล็กกว่า 2 ซม. และเหลือขอบขาวรอบโค้ด</p>
            <a href="/go/qr.svg" download={GO_QR_DOWNLOAD_NAME} className="btn btn-secondary">
              ดาวน์โหลด SVG
            </a>
          </div>
        </div>
      </section>

      <section className="card mt-4 space-y-4 p-4 md:p-6">
        <h2 className="font-semibold text-navy">บัญชีรับเงิน</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="bankName" label="ธนาคาร" value={s.bankName} onChange={(v) => patch({ bankName: v })} />
          <Field
            id="bankAccountName"
            label="ชื่อบัญชี"
            value={s.bankAccountName}
            onChange={(v) => patch({ bankAccountName: v })}
          />
          <Field
            id="bankAccountNumber"
            label="เลขบัญชี"
            value={s.bankAccountNumber}
            onChange={(v) => patch({ bankAccountNumber: v })}
          />
          <Field id="promptPayId" label="พร้อมเพย์" value={s.promptPayId} onChange={(v) => patch({ promptPayId: v })} />
        </div>
      </section>

      <section className="card mt-4 space-y-4 p-4 md:p-6">
        <h2 className="font-semibold text-navy">ค่าส่ง</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            id="shipFee"
            label="ค่าส่งคงที่ (บาท)"
            type="number"
            value={s.flatShippingFee}
            onChange={(v) => patch({ flatShippingFee: Number(v) })}
          />
          <Field
            id="freeShip"
            label="ส่งฟรีเมื่อครบ (บาท)"
            type="number"
            value={s.freeShippingMin}
            onChange={(v) => patch({ freeShippingMin: Number(v) })}
          />
        </div>
      </section>

      <section className="card mt-4 space-y-3 p-4 md:p-6">
        <h2 className="font-semibold text-navy">โหมดชำระเงิน</h2>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={s.paymentsLive}
            onChange={(e) => patch({ paymentsLive: e.target.checked })}
          />
          <span>
            รับเงินจริง (Payso)
            <span className="block text-muted">เปิดเมื่อร้านพร้อม KYB แล้วเท่านั้น — ตอนนี้ควรปิดไว้</span>
          </span>
        </label>
      </section>

      <button type="submit" className="btn btn-primary mt-6" disabled={busy}>
        {busy ? "กำลังบันทึก…" : "บันทึกตั้งค่า"}
      </button>

      <p className="mt-8 text-xs text-muted">
        โค้ด:{" "}
        <a href={GITHUB_REPO} className="underline" target="_blank" rel="noreferrer">
          GitHub
        </a>
        {" · "}
        <a href={SUPABASE_DASHBOARD} className="underline" target="_blank" rel="noreferrer">
          Supabase
        </a>
      </p>
    </form>
  );
}
