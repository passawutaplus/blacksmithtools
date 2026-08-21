"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Pin, Trash2 } from "lucide-react";
import { adminJson } from "@/lib/admin-client";
import type { Brand, Category, Product } from "@/lib/types";
import { formatTHB } from "@/lib/utils";

type Catalog = { products: Product[]; brands: Brand[]; categories: Category[] };

export default function AdminProductsPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [stock, setStock] = useState("");
  const [pin, setPin] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [draftStock, setDraftStock] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const data = await adminJson<Catalog>("/api/admin?resource=products");
    setCatalog(data);
    setDraftStock(Object.fromEntries(data.products.map((p) => [p.id, String(p.stock)])));
  }, []);

  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
  }, [load]);

  const filtered = useMemo(() => {
    if (!catalog) return [];
    const query = q.trim().toLowerCase();
    return catalog.products.filter((p) => {
      if (category && !p.categoryIds.includes(category)) return false;
      if (brand && !p.brandIds.includes(brand)) return false;
      if (pin === "yes" && !p.featured) return false;
      if (pin === "no" && p.featured) return false;
      if (stock === "out" && p.stock > 0) return false;
      if (stock === "low" && (p.stock <= 0 || p.stock > 5)) return false;
      if (stock === "in" && p.stock <= 0) return false;
      if (query) {
        const hay = `${p.nameTh} ${p.name} ${p.sku} ${p.compatibilities.join(" ")} ${(p.variants ?? [])
          .map((v) => `${v.name} ${v.sku}`)
          .join(" ")}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [catalog, q, category, brand, stock, pin]);

  const visibleIds = filtered.map((p) => p.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  function toggleAll() {
    if (allVisibleSelected) {
      setSelected((s) => s.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelected((s) => [...new Set([...s, ...visibleIds])]);
    }
  }

  function toggleOne(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function run(action: string, body: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(action);
    setError("");
    try {
      await adminJson("/api/admin", { method: "POST", body: JSON.stringify({ action, ...body }) });
      if (action === "delete_products") setSelected([]);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusy("");
    }
  }

  async function saveStock(id: string) {
    const product = catalog?.products.find((p) => p.id === id);
    const next = Number(draftStock[id]);
    if (!product || !Number.isFinite(next) || next < 0) return;
    if (next === product.stock) return;
    setBusy(`stock-${id}`);
    setError("");
    try {
      const data = await adminJson<{ product: Product }>("/api/admin", {
        method: "POST",
        body: JSON.stringify({ action: "set_stock", id, stock: next }),
      });
      setCatalog((cur) =>
        cur
          ? { ...cur, products: cur.products.map((p) => (p.id === id ? data.product : p)) }
          : cur,
      );
      setDraftStock((s) => ({ ...s, [id]: String(data.product.stock) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "แก้สต็อกไม่สำเร็จ");
    } finally {
      setBusy("");
    }
  }

  function catName(id: string) {
    return catalog?.categories.find((c) => c.id === id)?.nameTh ?? "";
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">สินค้า</h1>
          <p className="mt-1 text-sm text-muted">
            {catalog ? `${filtered.length} จาก ${catalog.products.length} รายการ` : "โหลดรายการ"}
          </p>
        </div>
        <Link href="/admin/products/new" className="btn btn-primary">
          เพิ่มสินค้า
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor="pq">
            ค้นหา
          </label>
          <input
            id="pq"
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ชื่อ / SKU / รุ่น"
          />
        </div>
        <div>
          <label className="label" htmlFor="pbrand">
            ยี่ห้อที่ใช้ด้วย
          </label>
          <select id="pbrand" className="input" value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">ทั้งหมด</option>
            {catalog?.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pstock">
            สต็อก
          </label>
          <select id="pstock" className="input" value={stock} onChange={(e) => setStock(e.target.value)}>
            <option value="">ทั้งหมด</option>
            <option value="in">มีของ</option>
            <option value="low">ใกล้หมด (≤5)</option>
            <option value="out">หมด</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ppin">
            ปักหมุด
          </label>
          <select id="ppin" className="input" value={pin} onChange={(e) => setPin(e.target.value)}>
            <option value="">ทั้งหมด</option>
            <option value="yes">แนะนำอยู่</option>
            <option value="no">ยังไม่แนะนำ</option>
          </select>
        </div>
      </div>

      <div className="mt-4">
        <p className="label">หมวดหมู่</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-full border px-3 py-1.5 text-sm ${
              category === "" ? "border-navy bg-navy text-white" : "border-gray-200 bg-white"
            }`}
            onClick={() => setCategory("")}
          >
            ทั้งหมด
          </button>
          {catalog?.categories.map((c) => {
            const n = catalog.products.filter((p) => p.categoryIds.includes(c.id)).length;
            return (
              <button
                key={c.id}
                type="button"
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  category === c.id ? "border-navy bg-navy text-white" : "border-gray-200 bg-white"
                }`}
                onClick={() => setCategory(c.id)}
              >
                {c.nameTh} ({n})
              </button>
            );
          })}
        </div>
      </div>

      {selected.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded border border-navy/20 bg-white p-3">
          <p className="text-sm font-semibold text-navy">เลือก {selected.length} รายการ</p>
          <button
            type="button"
            className="btn btn-sm btn-navy"
            disabled={!!busy}
            onClick={() => void run("set_featured", { ids: selected, featured: true })}
          >
            ปักหมุด
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            disabled={!!busy}
            onClick={() => void run("set_featured", { ids: selected, featured: false })}
          >
            เอาหมุดออก
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            disabled={!!busy}
            onClick={() =>
              void run("delete_products", { ids: selected }, `ลบสินค้า ${selected.length} รายการ?`)
            }
          >
            ลบที่เลือก
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <div className="card mt-4 overflow-hidden">
        {!catalog ? (
          <p className="px-4 py-8 text-center text-sm text-muted">กำลังโหลดสินค้า…</p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">ไม่พบสินค้าตามตัวกรองนี้</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAll}
                      aria-label="เลือกทั้งหมดในหน้านี้"
                    />
                  </th>
                  <th>สินค้า</th>
                  <th>หมวด</th>
                  <th>SKU</th>
                  <th>ราคา</th>
                  <th>สต็อก</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className={selected.includes(p.id) ? "bg-steel/60" : undefined}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(p.id)}
                        onChange={() => toggleOne(p.id)}
                        aria-label={`เลือก ${p.nameTh}`}
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded bg-steel object-cover" />
                        ) : (
                          <span className="h-12 w-12 shrink-0 rounded bg-steel" />
                        )}
                        <span>
                          <span className="font-medium">{p.nameTh}</span>
                          {p.featured ? <span className="ml-2 text-xs font-semibold text-forge">แนะนำ</span> : null}
                          {(p.variants?.length ?? 0) > 1 ? (
                            <span className="mt-0.5 block text-xs text-muted">{p.variants!.length} ตัวเลือก</span>
                          ) : null}
                        </span>
                      </div>
                    </td>
                    <td className="text-xs text-muted">
                      {p.categoryIds.map(catName).filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="text-xs text-muted">
                      {p.sku}
                      {(p.variants?.length ?? 0) > 1 ? (
                        <span className="block text-[11px]">{p.variants!.length} SKU</span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap">{formatTHB(p.price)}</td>
                    <td>
                      {(p.variants?.length ?? 0) > 1 ? (
                        <Link href={`/admin/products/${p.id}`} className="text-sm text-forge hover:underline">
                          {p.stock} · แก้ตัวเลือก
                        </Link>
                      ) : (
                        <input
                          className={`input h-9 min-h-9 w-20 px-2 py-1 text-sm ${
                            p.stock <= 0 ? "font-semibold text-red-700" : p.stock <= 5 ? "text-forge" : ""
                          }`}
                          type="number"
                          min={0}
                          aria-label={`สต็อก ${p.nameTh}`}
                          value={draftStock[p.id] ?? String(p.stock)}
                          onChange={(e) => setDraftStock((s) => ({ ...s, [p.id]: e.target.value }))}
                          onBlur={() => void saveStock(p.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            }
                          }}
                        />
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className={`btn btn-icon btn-sm ${p.featured ? "btn-primary" : "btn-secondary"}`}
                          aria-label={p.featured ? "เอาหมุดออก" : "ปักหมุด"}
                          title={p.featured ? "เอาหมุดออก" : "ปักหมุดแนะนำ"}
                          disabled={!!busy}
                          onClick={() =>
                            void run("set_featured", { ids: [p.id], featured: !p.featured })
                          }
                        >
                          <Pin className="h-4 w-4" />
                        </button>
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="btn btn-icon btn-sm btn-secondary"
                          aria-label={`แก้ไข ${p.nameTh}`}
                          title="แก้ไข"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          className="btn btn-icon btn-sm btn-danger"
                          aria-label={`ลบ ${p.nameTh}`}
                          title="ลบ"
                          disabled={!!busy}
                          onClick={() =>
                            void run("delete_products", { ids: [p.id] }, `ลบ ${p.nameTh}?`)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
