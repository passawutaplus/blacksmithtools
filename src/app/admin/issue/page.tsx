"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ThaiAddressFields } from "@/components/ThaiAddressFields";
import { adminJson } from "@/lib/admin-client";
import type { AdminOrderRow } from "@/lib/admin-types";
import { selectableVariants } from "@/lib/product";
import { parseBillCustomerText, parseRecipientText, recipientParseLooksComplete, sanitizeLabelRecipient } from "@/lib/parse-recipient-text";
import type { ParsedShopeeOrder } from "@/lib/parse-shopee-order";
import { MANUAL_CHANNEL_LABEL } from "@/lib/shipping";
import type { Product } from "@/lib/types";
import type { ThaiAddressParts } from "@/lib/thai-address";
import { formatTHB, lineAmount } from "@/lib/utils";

type Kind = "receipt" | "label";

type Line = {
  key: string;
  productId: string;
  variantId: string;
  name: string;
  variantName: string;
  sku: string;
  price: string;
  quantity: string;
  discount: string;
  imageUrl: string;
};

function emptyLine(): Line {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productId: "",
    variantId: "",
    name: "",
    variantName: "",
    sku: "",
    price: "0",
    quantity: "1",
    discount: "0",
    imageUrl: "",
  };
}

async function compressCapture(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 700_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const max = 1600;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    bitmap.close();
    if (!blob) return file;
    return new File([blob], "shopee.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export default function AdminIssuePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef("");
  const [kind, setKind] = useState<Kind>("receipt");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [taxId, setTaxId] = useState("");
  const [line1, setLine1] = useState("");
  const [locality, setLocality] = useState<ThaiAddressParts>({
    province: "",
    district: "",
    subdistrict: "",
    postalCode: "",
  });
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [parseBusy, setParseBusy] = useState(false);
  const [preview, setPreview] = useState("");
  const [captureFile, setCaptureFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [recent, setRecent] = useState<AdminOrderRow[] | null>(null);

  useEffect(() => {
    adminJson<{ products: Product[] }>("/api/admin?resource=products")
      .then((data) => setProducts(data.products))
      .catch(() => undefined);
    adminJson<{ orders: AdminOrderRow[] }>("/api/admin?resource=orders&origin=manual")
      .then((data) => setRecent(data.orders.slice(0, 8)))
      .catch(() => undefined);
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const hits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return products
      .filter((p) => {
        const hay = `${p.nameTh} ${p.name} ${p.sku} ${(p.variants ?? []).map((v) => `${v.name} ${v.sku}`).join(" ")}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8);
  }, [products, search]);

  const subtotal = lines.reduce((s, line) => s + (Number(line.price) || 0) * (Number(line.quantity) || 0), 0);
  const discount = lines.reduce((s, line) => s + (Number(line.discount) || 0), 0);
  const total = Math.max(0, subtotal - discount);

  function patchLine(key: string, next: Partial<Line>) {
    setLines((rows) => rows.map((row) => (row.key === key ? { ...row, ...next } : row)));
  }

  function addProduct(product: Product, variantId?: string) {
    const variants = selectableVariants(product);
    const variant = variantId
      ? product.variants?.find((v) => v.id === variantId)
      : variants[0] ?? product.variants?.[0];
    const name = product.nameTh || product.name;
    setLines((rows) => {
      const last = rows[rows.length - 1];
      const line: Line = {
        key: emptyLine().key,
        productId: product.id,
        variantId: variant?.id ?? "",
        name,
        variantName: variant?.name ?? "",
        sku: variant?.sku || product.sku,
        price: String(variant?.price ?? product.price),
        quantity: "1",
        discount: "0",
        imageUrl: variant?.imageUrl || product.imageUrl,
      };
      if (rows.length === 1 && !last.name && !last.productId) return [line];
      return [...rows, line];
    });
    setSearch("");
  }

  function applyParsed(parsed: ParsedShopeeOrder) {
    const data = kind === "label" ? sanitizeLabelRecipient(parsed) : parsed;
    if (data.buyerName) setFullName(data.buyerName);
    if (data.phone) setPhone(data.phone);
    if (kind !== "label" && data.email) setEmail(data.email);
    if (kind !== "label" && data.taxId) setTaxId(data.taxId);
    if (data.line1) setLine1(data.line1);
    if (data.province || data.district || data.subdistrict || data.postalCode) {
      setLocality({
        province: data.province,
        district: data.district,
        subdistrict: data.subdistrict,
        postalCode: data.postalCode,
      });
    }
    if (kind !== "label" && data.note) setNote(data.note);
    if (kind === "receipt" && data.items.length) {
      setLines(
        data.items.map((item, i) => ({
          key: `shopee-${i}-${Math.random().toString(36).slice(2, 7)}`,
          productId: "",
          variantId: "",
          name: item.name,
          variantName: item.variantName,
          sku: "",
          price: String(item.price),
          quantity: String(item.quantity),
          discount: String(item.discount || 0),
          imageUrl: "",
        })),
      );
    }
  }

  async function parsePaste() {
    const text = pasteText.trim();
    if (text.length < 6) {
      setError(kind === "receipt" ? "วางข้อความลูกค้าและรายการสินค้าก่อน" : "วางข้อความชื่อ เบอร์ ที่อยู่ ก่อน");
      return;
    }
    setParseBusy(true);
    setError("");
    const local = kind === "receipt" ? parseBillCustomerText(text) : parseRecipientText(text);
    applyParsed(local);
    const skipServer = kind === "label" && recipientParseLooksComplete(local);
    if (skipServer) {
      setParseBusy(false);
      return;
    }
    try {
      const parsed = await adminJson<ParsedShopeeOrder>("/api/admin/parse-shopee-order", {
        method: "POST",
        body: JSON.stringify({ text, mode: kind === "receipt" ? "bill" : "label" }),
      });
      applyParsed(parsed);
      if (kind === "receipt" && !parsed.items.length && !local.items.length) {
        setError("อ่านรายการสินค้าจากข้อความไม่ได้ ใส่ชื่อ ตัวเลือก ราคา จำนวน ในช่องด้านล่างได้");
      } else if (!parsed.buyerName && !parsed.phone && !parsed.line1) {
        setError("อ่านข้อความไม่ได้ ลองวางใหม่หรือกรอกเอง");
      } else if (!parsed.subdistrict || !parsed.postalCode) {
        setError("ใส่ชื่อเบอร์แล้ว เลือกจังหวัด เขต/อำเภอ ให้ครบ");
      }
    } catch (err) {
      if (kind === "receipt" && local.items.length) {
        setError("");
      } else if (!local.buyerName && !local.phone && !local.line1) {
        setError(err instanceof Error ? err.message : "อ่านข้อความไม่สำเร็จ");
      } else if (!local.subdistrict) {
        setError("ใส่ชื่อเบอร์แล้ว เลือกจังหวัด เขต/อำเภอ ให้ครบ");
      }
    } finally {
      setParseBusy(false);
    }
  }

  function pickCapture(file: File) {
    setError("");
    setCaptureFile(file);
    const url = URL.createObjectURL(file);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      previewRef.current = url;
      return url;
    });
  }

  async function parseCapture() {
    if (!captureFile) {
      setError("เลือกภาพแคปออเดอร์ช้อปปี้ก่อน");
      return;
    }
    setParseBusy(true);
    setError("");
    try {
      const compressed = await compressCapture(captureFile);
      const fd = new FormData();
      fd.set("image", compressed);
      const parsed = await adminJson<ParsedShopeeOrder>("/api/admin/parse-shopee-order", {
        method: "POST",
        body: fd,
      });
      applyParsed(parsed);
      if (kind === "receipt" && !parsed.items.length) {
        setError("อ่านรายการสินค้าจากภาพไม่ได้ ลองแคปให้เห็นตารางสินค้า ราคา จำนวน ให้ชัด");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "อ่านภาพไม่สำเร็จ");
    } finally {
      setParseBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const items =
        kind === "label"
          ? []
          : lines
              .filter((line) => line.name.trim() || line.productId)
              .map((line) => ({
                productId: line.productId || undefined,
                variantId: line.variantId || undefined,
                name: line.name.trim(),
                variantName: line.variantName.trim() || undefined,
                sku: line.sku.trim() || undefined,
                price: Number(line.price) || 0,
                quantity: Number(line.quantity) || 1,
                discount: Number(line.discount) || 0,
                imageUrl: line.imageUrl || undefined,
              }));
      const data = await adminJson<{ order: { id: string; token: string } }>("/api/admin", {
        method: "POST",
        body: JSON.stringify({
          action: "create_manual_order",
          kind,
          customerNote: note.trim(),
          address: {
            fullName: fullName.trim(),
            phone: phone.trim(),
            email: kind === "label" ? undefined : email.trim() || undefined,
            line1: line1.trim(),
            ...locality,
          },
          billing:
            kind === "receipt"
              ? {
                  name: fullName.trim(),
                  email: email.trim(),
                  phone: phone.trim(),
                  line1: line1.trim(),
                  ...locality,
                  taxId: taxId.replace(/\D/g, "").slice(0, 13) || undefined,
                }
              : undefined,
          items,
        }),
      });
      const path = kind === "receipt" ? `/bill/${data.order.token}/print` : `/bill/${data.order.token}/print/label`;
      router.push(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "สร้างเอกสารไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function removeRecent(orderId: string) {
    if (!window.confirm("ลบเอกสารนี้? กู้คืนไม่ได้")) return;
    setError("");
    try {
      await adminJson("/api/admin", {
        method: "POST",
        body: JSON.stringify({ action: "delete_manual_order", orderId }),
      });
      setRecent((rows) => (rows ?? []).filter((row) => row.order.id !== orderId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">พิมพ์เอกสาร</h1>
      <p className="mt-1 text-sm text-muted">
        กรอกข้อมูลแล้วพิมพ์อย่างเดียว ไม่ตัดสต็อก ไม่ปนกับออเดอร์ขายบนเว็บ
      </p>

      <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4">
        <section className="card p-4">
          <h2 className="font-semibold text-navy">จะพิมพ์อะไร</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label
              className={`flex cursor-pointer gap-3 rounded-[3px] border p-3 text-sm ${
                kind === "receipt" ? "border-navy bg-steel" : "border-gray-200"
              }`}
            >
              <input type="radio" name="kind" className="mt-1" checked={kind === "receipt"} onChange={() => setKind("receipt")} />
              <span>
                <span className="block font-semibold">ออกบิล</span>
                <span className="text-xs text-muted">ชื่อสินค้า ตัวเลือก ราคา จำนวน ส่วนลด — ไม่มีค่าส่ง</span>
              </span>
            </label>
            <label
              className={`flex cursor-pointer gap-3 rounded-[3px] border p-3 text-sm ${
                kind === "label" ? "border-navy bg-steel" : "border-gray-200"
              }`}
            >
              <input type="radio" name="kind" className="mt-1" checked={kind === "label"} onChange={() => setKind("label")} />
              <span>
                <span className="block font-semibold">ใบปะหน้า</span>
                <span className="text-xs text-muted">ชื่อ ที่อยู่ เบอร์ผู้รับ — ไม่มีรายการสินค้า</span>
              </span>
            </label>
          </div>
        </section>

        {kind === "receipt" ? (
        <section className="card p-4">
          <h2 className="font-semibold text-navy">แคปออเดอร์ช้อปปี้</h2>
          <p className="mt-1 text-sm text-muted">
            อัปโหลดแคปจากหลังบ้าน Shopee แล้วกดแปลง เพื่อลงรายการสินค้า ชื่อ ตัวเลือก ราคา จำนวน ส่วนลด
          </p>
          <div className="mt-3 flex flex-wrap items-start gap-4">
            <div>
              <input
                ref={fileRef}
                className="block text-sm"
                type="file"
                accept="image/*"
                disabled={parseBusy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) pickCapture(file);
                }}
              />
              <button
                type="button"
                className="btn btn-secondary mt-2"
                disabled={parseBusy || !captureFile}
                onClick={() => void parseCapture()}
              >
                {parseBusy ? "กำลังแปลง…" : "แปลงเป็นลงข้อมูล"}
              </button>
            </div>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="แคปออเดอร์ช้อปปี้" className="h-28 w-auto rounded-[3px] border object-contain" />
            ) : null}
          </div>
        </section>
        ) : null}

        <section className="card p-4">
          <h2 className="font-semibold text-navy">{kind === "label" ? "ผู้รับ" : "ลูกค้า"}</h2>
          <div className="mt-3">
            <label className="label" htmlFor="paste-address">
              {kind === "label" ? "วางข้อความแล้วให้ช่วยใส่" : "วางข้อความบิล / ออเดอร์ แล้วแปลงลงข้อมูล"}
            </label>
            <textarea
              id="paste-address"
              className={kind === "receipt" ? "input min-h-40" : "input min-h-28"}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={
                kind === "label"
                  ? "สมชาย ใจดี\n081-234-5678\n99/1 ซอย… แขวง… เขต… จังหวัด… 10200"
                  : "ชื่อลูกค้า เบอร์ อีเมล ที่อยู่ เลขผู้เสียภาษี\nรายการ: ชื่อสินค้า ตัวเลือก ราคา จำนวน ส่วนลด"
              }
            />
            <button
              type="button"
              className="btn btn-secondary mt-2"
              disabled={parseBusy}
              onClick={() => void parsePaste()}
            >
              {parseBusy ? "กำลังอ่าน…" : kind === "receipt" ? "แปลงลงข้อมูลบิล" : "อ่านแล้วใส่ให้"}
            </button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="full-name">
                ชื่อ <span className="text-forge">*</span>
              </label>
              <input id="full-name" className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="phone">
                โทร <span className="text-forge">*</span>
              </label>
              <input
                id="phone"
                className="input"
                required
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            {kind === "receipt" ? (
              <>
                <div>
                  <label className="label" htmlFor="email">
                    อีเมล
                  </label>
                  <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="tax-id">
                    เลขผู้เสียภาษี
                  </label>
                  <input
                    id="tax-id"
                    className="input"
                    inputMode="numeric"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value.replace(/\D/g, "").slice(0, 13))}
                    placeholder="13 หลัก ถ้ามี"
                  />
                </div>
              </>
            ) : null}
            <div className="sm:col-span-2">
              <label className="label" htmlFor="line1">
                ที่อยู่ <span className="text-forge">*</span>
              </label>
              <input
                id="line1"
                className="input"
                required
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                placeholder="บ้านเลขที่ ซอย ถนน"
              />
            </div>
          </div>
          <div className="mt-4">
            <ThaiAddressFields idPrefix="issue" value={locality} onChange={setLocality} />
          </div>
          <div className="mt-4">
            <label className="label" htmlFor="note">
              หมายเหตุ {kind === "label" ? <span className="font-normal text-muted">(ขึ้นบนใบปะหน้า)</span> : null}
            </label>
            <textarea
              id="note"
              className="input min-h-20"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={kind === "label" ? "เช่น เคลมสินค้า / ส่งช่วงเย็น / ของแถม" : "ข้อความบนบิล"}
            />
          </div>
        </section>

        {kind === "receipt" ? (
          <section className="card p-4">
            <h2 className="font-semibold text-navy">รายการสินค้า</h2>
            <div className="relative mt-3">
              <label className="label" htmlFor="product-search">
                ค้นจากสินค้าในร้าน
              </label>
              <input
                id="product-search"
                className="input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="พิมพ์ชื่อหรือ SKU"
              />
              {hits.length > 0 ? (
                <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-[3px] border bg-white shadow-lg">
                  {hits.map((p) => {
                    const variants = selectableVariants(p);
                    return (
                      <li key={p.id} className="border-b border-gray-100 last:border-0">
                        <button
                          type="button"
                          className="flex w-full items-start gap-3 px-3 py-2 text-left text-sm hover:bg-steel"
                          onClick={() => addProduct(p)}
                        >
                          <span className="min-w-0 flex-1 font-medium">{p.nameTh}</span>
                          <span className="shrink-0 text-muted">{formatTHB(p.price)}</span>
                        </button>
                        {variants.length > 1 ? (
                          <div className="flex flex-wrap gap-1 px-3 pb-2">
                            {variants.slice(0, 8).map((v) => (
                              <button
                                key={v.id}
                                type="button"
                                className="rounded-[2px] border px-2 py-0.5 text-xs hover:border-navy"
                                onClick={() => addProduct(p, v.id)}
                              >
                                {v.name} · {formatTHB(v.price)}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>

            <ul className="mt-4 space-y-3">
              {lines.map((line) => (
                <li key={line.key} className="rounded-[3px] border border-gray-200 p-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="sm:col-span-2 lg:col-span-5">
                      <label className="label">ชื่อสินค้า</label>
                      <input
                        className="input"
                        value={line.name}
                        onChange={(e) => patchLine(line.key, { name: e.target.value })}
                        placeholder="พิมพ์เองได้"
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="label">ตัวเลือก</label>
                      <input
                        className="input"
                        value={line.variantName}
                        onChange={(e) => patchLine(line.key, { variantName: e.target.value })}
                        placeholder="สี / รุ่น"
                      />
                    </div>
                    <div>
                      <label className="label">ราคา</label>
                      <input
                        className="input"
                        inputMode="decimal"
                        value={line.price}
                        onChange={(e) => patchLine(line.key, { price: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">จำนวน</label>
                      <input
                        className="input"
                        inputMode="numeric"
                        value={line.quantity}
                        onChange={(e) => patchLine(line.key, { quantity: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">ส่วนลด</label>
                      <input
                        className="input"
                        inputMode="decimal"
                        value={line.discount}
                        onChange={(e) => patchLine(line.key, { discount: e.target.value })}
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-right text-sm text-muted">
                    รวม {formatTHB(lineAmount({
                      price: Number(line.price) || 0,
                      quantity: Number(line.quantity) || 0,
                      discount: Number(line.discount) || 0,
                    }))}
                  </p>
                  <button
                    type="button"
                    className="mt-1 text-sm text-muted underline"
                    onClick={() =>
                      setLines((rows) => (rows.length === 1 ? [emptyLine()] : rows.filter((r) => r.key !== line.key)))
                    }
                  >
                    ลบรายการ
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn-secondary mt-3" onClick={() => setLines((rows) => [...rows, emptyLine()])}>
              เพิ่มรายการ
            </button>

            <div className="mt-4 flex items-end justify-between rounded-[3px] bg-steel px-4 py-3 text-sm">
              <span>
                ยอดสินค้า {formatTHB(subtotal)}
                {discount ? ` − ส่วนลด ${formatTHB(discount)}` : ""}
              </span>
              <span className="text-lg font-bold text-forge">{formatTHB(total)}</span>
            </div>
          </section>
        ) : null}

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <button type="submit" className="btn btn-primary" disabled={busy || parseBusy}>
          {busy ? "กำลังสร้าง..." : kind === "receipt" ? "สร้างแล้วพิมพ์บิล" : "สร้างแล้วพิมพ์ใบปะหน้า"}
        </button>
      </form>

      <section className="card mt-8 overflow-hidden">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold text-navy">พิมพ์ล่าสุด</h2>
        </div>
        {!recent ? (
          <p className="px-4 py-6 text-sm text-muted">กำลังโหลด…</p>
        ) : recent.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">ยังไม่มี</p>
        ) : (
          <ul className="divide-y">
            {recent.map(({ order, document }) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold text-navy">{order.number}</p>
                  <p className="text-xs text-muted">
                    {MANUAL_CHANNEL_LABEL[order.channel ?? ""] ?? "พิมพ์เอง"} · {order.address.fullName}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {document ? (
                    <Link href={`/bill/${order.token}/print`} className="btn btn-secondary btn-sm" target="_blank" prefetch={false}>
                      บิล
                    </Link>
                  ) : null}
                  <Link href={`/bill/${order.token}/print/label`} className="btn btn-secondary btn-sm" target="_blank" prefetch={false}>
                    ใบปะหน้า
                  </Link>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm text-red-700"
                    onClick={() => void removeRecent(order.id)}
                  >
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
