"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ProductForm } from "@/components/admin/ProductForm";
import { adminJson } from "@/lib/admin-client";
import type { Brand, Category, Product } from "@/lib/types";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{
    product: Product;
    brands: Brand[];
    categories: Category[];
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminJson<{ product: Product; brands: Brand[]; categories: Category[] }>(
      `/api/admin?resource=product&id=${encodeURIComponent(id)}`,
    )
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  return (
    <div>
      <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm text-muted hover:text-navy">
        <ArrowLeft className="h-4 w-4" />
        สินค้าทั้งหมด
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">แก้ไขสินค้า</p>
          <h1 className="mt-1 max-w-3xl text-2xl font-bold text-navy">
            {data?.product.nameTh ?? "กำลังโหลด…"}
          </h1>
          {data?.product.sku ? <p className="mt-1 font-mono text-sm text-muted">{data.product.sku}</p> : null}
        </div>
        {data?.product.slug ? (
          <Link
            href={`/product/${data.product.slug}`}
            className="btn btn-secondary"
            target="_blank"
          >
            ดูหน้าร้าน
            <ExternalLink className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {data ? (
        <div className="mt-5">
          <ProductForm product={data.product} brands={data.brands} categories={data.categories} />
        </div>
      ) : !error ? (
        <p className="mt-6 text-sm text-muted">กำลังโหลดสินค้า…</p>
      ) : null}
    </div>
  );
}
