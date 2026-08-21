"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/admin/ProductForm";
import { adminJson } from "@/lib/admin-client";
import type { Brand, Category } from "@/lib/types";

export default function NewProductPage() {
  const [meta, setMeta] = useState<{ brands: Brand[]; categories: Category[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminJson<{ brands: Brand[]; categories: Category[] }>("/api/admin?resource=catalog-meta")
      .then(setMeta)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div>
      <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm text-muted hover:text-navy">
        <ArrowLeft className="h-4 w-4" />
        สินค้าทั้งหมด
      </Link>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">สินค้าใหม่</p>
      <h1 className="mt-1 text-2xl font-bold text-navy">เพิ่มสินค้า</h1>
      <p className="mt-1 text-sm text-muted">กรอกข้อมูลตามหมวด แล้วกดบันทึกด้านล่าง</p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {meta ? (
        <div className="mt-5">
          <ProductForm brands={meta.brands} categories={meta.categories} />
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">กำลังโหลดฟอร์ม…</p>
      )}
    </div>
  );
}
