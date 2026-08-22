"use client";

import { useEffect, useState } from "react";
import { adminJson } from "@/lib/admin-client";
import { REVIEW_SOURCE_LABEL, REVIEW_SOURCES } from "@/lib/reviews";
import type { ReviewSource, ShopReview, SiteSettings } from "@/lib/types";

const EMPTY_FORM = {
  quote: "",
  author: "",
  stars: 5,
  productName: "",
  source: "shopee" as ReviewSource,
  sourceUrl: "",
  published: true,
};

export default function AdminReviewsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [reviews, setReviews] = useState<ShopReview[] | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [rating, setRating] = useState("4.9");
  const [count, setCount] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [s, r] = await Promise.all([
      adminJson<{ settings: SiteSettings }>("/api/admin?resource=settings"),
      adminJson<{ reviews: ShopReview[] }>("/api/admin?resource=reviews"),
    ]);
    setSettings(s.settings);
    setReviews(r.reviews);
    setRating(s.settings.shopeeRating ? String(s.settings.shopeeRating) : "");
    setCount(s.settings.shopeeReviewCount ? String(s.settings.shopeeReviewCount) : "");
  }

  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
  }, []);

  async function saveRating(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const data = await adminJson<{ settings: SiteSettings }>("/api/admin", {
        method: "POST",
        body: JSON.stringify({
          action: "update_settings",
          settings: {
            ...settings,
            shopeeRating: Number(rating) || 0,
            shopeeReviewCount: Number(count.replace(/\D/g, "")) || 0,
          },
        }),
      });
      setSettings(data.settings);
      setSaved("บันทึกคะแนนร้านแล้ว");
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function addReview(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved("");
    try {
      await adminJson("/api/admin", {
        method: "POST",
        body: JSON.stringify({ action: "save_review", review: form }),
      });
      setForm(EMPTY_FORM);
      setSaved("เพิ่มรีวิวแล้ว");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(row: ShopReview) {
    setBusy(true);
    setError("");
    try {
      await adminJson("/api/admin", {
        method: "POST",
        body: JSON.stringify({
          action: "save_review",
          review: { ...row, published: !row.published },
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("ลบรีวิวนี้?")) return;
    setBusy(true);
    setError("");
    try {
      await adminJson("/api/admin", {
        method: "POST",
        body: JSON.stringify({ action: "delete_review", id }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  if (!settings && !error) return <p className="text-sm text-muted">กำลังโหลดรีวิว…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">รีวิว Shopee</h1>
      <p className="mt-1 text-sm text-muted">
        คัดรีวิวจริงจากร้าน Shopee มาแปะเอง — ระบบไม่ดึงอัตโนมัติ เพื่อไม่ผิดเงื่อนไขของ Shopee
      </p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {saved ? <p className="mt-3 text-sm text-emerald-700">{saved}</p> : null}

      <form onSubmit={(e) => void saveRating(e)} className="card mt-6 space-y-4 p-4 md:p-6">
        <h2 className="font-semibold text-navy">คะแนนร้านบน Shopee</h2>
        <p className="text-sm text-muted">เปิดหน้าร้าน Shopee ดูตัวเลขจริง แล้วกรอกที่นี่ จะโชว์บนหน้าแรก</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="rating">
              คะแนน เช่น 4.9
            </label>
            <input
              id="rating"
              className="input"
              inputMode="decimal"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="count">
              จำนวนรีวิว (ไม่บังคับ)
            </label>
            <input
              id="count"
              className="input"
              inputMode="numeric"
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </div>
        </div>
        <button type="submit" className="btn btn-secondary" disabled={busy}>
          บันทึกคะแนนร้าน
        </button>
      </form>

      <form onSubmit={(e) => void addReview(e)} className="card mt-4 space-y-4 p-4 md:p-6">
        <h2 className="font-semibold text-navy">แปะรีวิว</h2>
        <div>
          <label className="label" htmlFor="quote">
            ข้อความรีวิว
          </label>
          <textarea
            id="quote"
            className="input min-h-[96px]"
            value={form.quote}
            onChange={(e) => setForm({ ...form, quote: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="author">
              ชื่อที่โชว์ เช่น คุณม***
            </label>
            <input
              id="author"
              className="input"
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="stars">
              ดาว
            </label>
            <select
              id="stars"
              className="input"
              value={form.stars}
              onChange={(e) => setForm({ ...form, stars: Number(e.target.value) })}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} ดาว
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="productName">
              สินค้าที่รีวิว (ไม่บังคับ)
            </label>
            <input
              id="productName"
              className="input"
              value={form.productName}
              onChange={(e) => setForm({ ...form, productName: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="source">
              แหล่งที่มา
            </label>
            <select
              id="source"
              className="input"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value as ReviewSource })}
            >
              {REVIEW_SOURCES.map((id) => (
                <option key={id} value={id}>
                  {REVIEW_SOURCE_LABEL[id]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="sourceUrl">
            ลิงก์ต้นทาง (ไม่บังคับ)
          </label>
          <input
            id="sourceUrl"
            className="input"
            type="url"
            value={form.sourceUrl}
            onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
            placeholder="https://shopee.co.th/..."
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked })}
          />
          โชว์บนหน้าร้าน
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "กำลังบันทึก…" : "เพิ่มรีวิว"}
        </button>
      </form>

      <section className="mt-6">
        <h2 className="font-semibold text-navy">รีวิวที่แปะแล้ว</h2>
        {reviews && reviews.length === 0 ? (
          <p className="mt-3 text-sm text-muted">ยังไม่มีรีวิว — เปิด Shopee คัด 6–12 อันที่ชัด แล้วแปะด้านบน</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {(reviews ?? []).map((row) => (
              <li key={row.id} className="card p-4">
                <p className="text-sm text-navy">“{row.quote}”</p>
                <p className="mt-2 text-xs text-muted">
                  {row.author} · {row.stars} ดาว · {REVIEW_SOURCE_LABEL[row.source]}
                  {row.productName ? ` · ${row.productName}` : ""}
                  {row.published ? "" : " · ซ่อนอยู่"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void togglePublished(row)}>
                    {row.published ? "ซ่อน" : "โชว์"}
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => void remove(row.id)}>
                    ลบ
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
