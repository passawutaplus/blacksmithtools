"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/cart-store";
import { cartLineKey } from "@/lib/product";
import { formatTHB } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { saveLastBill } from "@/lib/last-bill";
import { readCheckoutProfile, saveCheckoutProfile } from "@/lib/checkout-profile";
import { ThaiAddressFields } from "@/components/ThaiAddressFields";
import { completeThaiAddress } from "@/lib/thai-address";

type CheckoutLine = {
  productId: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  sku: string;
  imageUrl: string;
  lineTotal: number;
  product: { nameTh: string; slug: string };
};

type PayMethod = "mock" | "payso" | "bank_transfer" | "promptpay_qr";

const PAY_LABEL: Record<PayMethod, { title: string; note: string }> = {
  payso: { title: "บัตรเครดิต / QR PromptPay / Mobile Banking", note: "จ่ายผ่าน Payso ยืนยันอัตโนมัติทันที" },
  bank_transfer: { title: "โอนเข้าบัญชีร้าน", note: "โอนแล้วอัปโหลดสลิปที่หน้าบิล ทีมงานตรวจในเวลาทำการ" },
  promptpay_qr: { title: "สแกน PromptPay ของร้าน", note: "QR แสดงบนหน้าบิล แล้วอัปโหลดสลิป" },
  mock: { title: "ทดสอบชำระเงิน (เฉพาะเครื่องพัฒนา)", note: "ไม่มีเงินจริง" },
};

type BillingForm = {
  name: string;
  email: string;
  phone: string;
  line1: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  taxId: string;
};

const emptyBilling: BillingForm = {
  name: "",
  email: "",
  phone: "",
  line1: "",
  subdistrict: "",
  district: "",
  province: "",
  postalCode: "",
  taxId: "",
};

function RequiredMark() {
  return (
    <span className="text-forge" aria-hidden>
      *
    </span>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const cartId = useCartStore((s) => s.cartId);
  const setCartId = useCartStore((s) => s.setCartId);
  const clear = useCartStore((s) => s.clear);
  const [lines, setLines] = useState<CheckoutLine[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>("bank_transfer");
  const [methods, setMethods] = useState<PayMethod[]>(["bank_transfer", "promptpay_qr"]);
  const [wantReceipt, setWantReceipt] = useState(false);
  const [billing, setBilling] = useState<BillingForm>(emptyBilling);
  const [address, setAddress] = useState({
    fullName: "",
    phone: "",
    email: "",
    line1: "",
    subdistrict: "",
    district: "",
    province: "",
    postalCode: "",
    customerNote: "",
  });
  const [profileReady, setProfileReady] = useState(false);

  function patchAddress(patch: Partial<typeof address>) {
    setAddress((prev) => ({ ...prev, ...patch }));
  }

  function patchBilling(patch: Partial<BillingForm>) {
    setBilling((prev) => ({ ...prev, ...patch }));
  }

  function fillBillingFromShipping() {
    setBilling((prev) => ({
      name: address.fullName.trim(),
      email: address.email.trim(),
      phone: address.phone.trim(),
      line1: address.line1.trim(),
      ...completeThaiAddress(address),
      taxId: prev.taxId,
    }));
  }

  function toggleReceipt(checked: boolean) {
    setWantReceipt(checked);
    if (checked) fillBillingFromShipping();
  }

  useEffect(() => {
    const saved = readCheckoutProfile();
    if (saved) {
      setAddress(saved.address);
      setWantReceipt(saved.wantReceipt);
      if (saved.billing) setBilling({ ...emptyBilling, ...saved.billing });
    }
    setProfileReady(true);
  }, []);

  useEffect(() => {
    if (!profileReady) return;
    saveCheckoutProfile({
      address,
      wantReceipt,
      billing: wantReceipt ? billing : undefined,
    });
  }, [profileReady, address, billing, wantReceipt]);

  useEffect(() => {
    async function sync() {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, items }),
      });
      const data = await res.json();
      if (data.cartId) setCartId(data.cartId);
      setLines(data.lines ?? []);
      setSubtotal(data.subtotal ?? 0);
      setShipping(data.shippingFee ?? 0);
      if (Array.isArray(data.paymentMethods) && data.paymentMethods.length) {
        const list = data.paymentMethods as PayMethod[];
        setMethods(list);
        setPaymentMethod((cur) => (list.includes(cur) ? cur : list.includes("payso") ? "payso" : list[0]));
      }
    }
    void sync();
  }, [items, cartId, setCartId]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId,
          items,
          paymentMethod,
          customerNote: address.customerNote.trim(),
          wantReceipt,
          billing: wantReceipt
            ? {
                name: billing.name.trim(),
                email: billing.email.trim(),
                phone: billing.phone.trim(),
                line1: billing.line1.trim(),
                ...completeThaiAddress(billing),
                taxId: billing.taxId.trim(),
              }
            : undefined,
          address: {
            fullName: address.fullName.trim(),
            phone: address.phone.trim(),
            email: address.email.trim(),
            line1: address.line1.trim(),
            ...completeThaiAddress(address),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "สั่งซื้อไม่สำเร็จ");
      saveCheckoutProfile({
        address,
        wantReceipt,
        billing: wantReceipt ? billing : undefined,
      });
      if (data.token && data.orderNumber) saveLastBill(data.token, data.orderNumber);
      clear();
      if (data.redirectUrl) {
        window.location.assign(data.redirectUrl);
        return;
      }
      router.push(data.billUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="container-bs py-16 text-center">
        <p className="text-muted">ไม่มีสินค้าในตะกร้า</p>
        <a href="/shop" className="btn btn-primary mt-4 inline-flex">
          กลับไปช้อป
        </a>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="ชำระเงิน"
        description="สั่งได้โดยไม่ต้องสมัครสมาชิก"
        crumbs={[
          { href: "/", label: "หน้าแรก" },
          { href: "/cart", label: "ตะกร้า" },
          { label: "ชำระเงิน" },
        ]}
      />
      <div className="container-bs py-8 md:py-10">
        <form onSubmit={onSubmit} className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="card space-y-4 p-5">
            <h2 className="font-bold">ที่อยู่จัดส่ง</h2>
            <p className="text-xs leading-relaxed text-muted">
              เลือกจังหวัด → เขต/อำเภอ → แขวง/ตำบล แล้วรหัสไปรษณีย์จะขึ้นเอง
            </p>
            <div>
              <label className="label" htmlFor="fullName">
                ชื่อผู้ส่ง <RequiredMark />
              </label>
              <input
                id="fullName"
                name="fullName"
                required
                minLength={2}
                autoComplete="name"
                className="input"
                value={address.fullName}
                onChange={(e) => patchAddress({ fullName: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="phone">
                  เบอร์โทร <RequiredMark />
                </label>
                <input
                  id="phone"
                  name="phone"
                  required
                  minLength={9}
                  className="input"
                  inputMode="tel"
                  autoComplete="tel"
                  value={address.phone}
                  onChange={(e) => patchAddress({ phone: e.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="email">
                  อีเมล (ถ้ามี)
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="input"
                  placeholder="name@email.com"
                  value={address.email}
                  onChange={(e) => patchAddress({ email: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="line1">
                ที่อยู่ <RequiredMark />
              </label>
              <input
                id="line1"
                name="line1"
                required
                minLength={3}
                autoComplete="street-address"
                className="input"
                placeholder="บ้านเลขที่ หมู่ ซอย ถนน"
                value={address.line1}
                onChange={(e) => patchAddress({ line1: e.target.value })}
              />
            </div>
            <ThaiAddressFields
              idPrefix="ship"
              value={address}
              onChange={(locality) => patchAddress(locality)}
              names={{
                province: "province",
                district: "district",
                subdistrict: "subdistrict",
                postalCode: "postalCode",
              }}
            />
            <div>
              <label className="label" htmlFor="customerNote">
                หมายเหตุ
              </label>
              <textarea
                id="customerNote"
                name="customerNote"
                maxLength={500}
                rows={3}
                className="input"
                placeholder="เช่น เวลาว่างรับของ / จุดสังเกตบ้าน"
                value={address.customerNote}
                onChange={(e) => patchAddress({ customerNote: e.target.value })}
              />
            </div>

            <h2 className="pt-4 font-bold">บิลเงินสด</h2>
            <p className="text-xs leading-relaxed text-muted">
              ร้านเป็นบุคคลธรรมดา ยังไม่ได้จด VAT จึงออกได้แค่บิลเงินสด ส่งทางอีเมลเมื่อชำระแล้ว — ไม่ใช่ใบกำกับภาษี
              และนำไปหักภาษีไม่ได้
            </p>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 p-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-forge"
                checked={wantReceipt}
                onChange={(e) => toggleReceipt(e.target.checked)}
              />
              <span>
                <span className="block text-sm font-semibold">ต้องการบิลเงินสดทางอีเมล</span>
                <span className="mt-0.5 block text-xs text-muted">กรอกชื่อ ที่อยู่ และเมลที่จะออกบนบิล</span>
              </span>
            </label>
            {wantReceipt ? (
              <div className="space-y-4 rounded-2xl border border-gray-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">ข้อมูลออกบิล</p>
                  <button
                    type="button"
                    className="text-sm font-semibold text-forge hover:underline"
                    onClick={fillBillingFromShipping}
                  >
                    ใช้ที่อยู่จัดส่ง
                  </button>
                </div>
                <div>
                  <label className="label" htmlFor="billingName">
                    ชื่อบนบิล <RequiredMark />
                  </label>
                  <input
                    id="billingName"
                    required
                    minLength={2}
                    className="input"
                    value={billing.name}
                    onChange={(e) => patchBilling({ name: e.target.value })}
                    autoComplete="billing name"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="billingEmail">
                      อีเมลรับบิล <RequiredMark />
                    </label>
                    <input
                      id="billingEmail"
                      type="email"
                      required
                      className="input"
                      value={billing.email}
                      onChange={(e) => patchBilling({ email: e.target.value })}
                      autoComplete="email"
                      placeholder="name@email.com"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="billingPhone">
                      เบอร์โทรบนบิล
                    </label>
                    <input
                      id="billingPhone"
                      className="input"
                      inputMode="tel"
                      value={billing.phone}
                      onChange={(e) => patchBilling({ phone: e.target.value })}
                      autoComplete="tel"
                    />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="billingLine1">
                    ที่อยู่บนบิล <RequiredMark />
                  </label>
                  <input
                    id="billingLine1"
                    required
                    minLength={3}
                    className="input"
                    value={billing.line1}
                    onChange={(e) => patchBilling({ line1: e.target.value })}
                    autoComplete="billing street-address"
                  />
                </div>
                <ThaiAddressFields
                  idPrefix="bill"
                  value={billing}
                  onChange={(locality) => patchBilling(locality)}
                />
                <div>
                  <label className="label" htmlFor="billingTaxId">
                    เลขประจำตัวผู้เสียภาษี <RequiredMark />
                  </label>
                  <input
                    id="billingTaxId"
                    required
                    minLength={13}
                    maxLength={13}
                    inputMode="numeric"
                    pattern="[0-9]{13}"
                    className="input"
                    value={billing.taxId}
                    onChange={(e) => patchBilling({ taxId: e.target.value.replace(/\D/g, "").slice(0, 13) })}
                    placeholder="13 หลัก"
                  />
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">
                    ใส่เลข 13 หลักเพื่อโชว์บนบิล — เอกสารนี้ยังไม่ใช่ใบกำกับภาษี
                  </p>
                </div>
              </div>
            ) : null}

            <h2 className="pt-4 font-bold">ช่องทางชำระเงิน</h2>
            <div className="space-y-2" role="radiogroup" aria-label="ช่องทางชำระเงิน">
              {methods.map((value) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-start gap-3 border p-3 transition-colors ${
                    paymentMethod === value ? "border-forge bg-forge/5" : "border-navy/15 bg-white hover:border-navy/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    className="mt-1 accent-[var(--forge)]"
                    checked={paymentMethod === value}
                    onChange={() => setPaymentMethod(value)}
                  />
                  <span>
                    <span className="block text-sm font-medium">{PAY_LABEL[value].title}</span>
                    <span className="block text-xs text-muted">{PAY_LABEL[value].note}</span>
                  </span>
                </label>
              ))}
            </div>
            {paymentMethod === "payso" && !address.email.trim() ? (
              <p className="text-xs text-forge">ใส่อีเมลด้านบนด้วย เพื่อรับใบเสร็จจาก Payso</p>
            ) : null}
          </div>

          <aside className="card h-fit p-5 lg:sticky lg:top-24">
            <h2 className="font-bold">รายการสินค้า</h2>
            {lines.length === 0 ? (
              <p className="mt-3 text-sm text-muted">กำลังโหลดรายการ…</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {lines.map((line) => (
                  <li key={cartLineKey(line.productId, line.variantId)} className="flex gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-steel">
                      <Image
                        src={line.imageUrl}
                        alt={line.product.nameTh}
                        fill
                        className="object-contain p-1"
                        sizes="56px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-navy">
                        {line.product.nameTh}
                      </p>
                      {line.variantName ? (
                        <p className="mt-0.5 text-xs text-muted">{line.variantName}</p>
                      ) : null}
                      <p className="mt-0.5 text-xs text-muted">
                        {line.quantity} × {formatTHB(line.unitPrice)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatTHB(line.lineTotal)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted">ยอดสินค้า</span>
                <span className="tabular-nums">{formatTHB(subtotal)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted">ค่าส่ง</span>
                <span className="tabular-nums">{shipping === 0 ? "ฟรี" : formatTHB(shipping)}</span>
              </div>
            </div>
            <div className="mt-3 flex justify-between gap-4 text-lg font-bold">
              <span>รวมชำระ</span>
              <span className="tabular-nums text-forge">{formatTHB(subtotal + shipping)}</span>
            </div>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            <button type="submit" className="btn btn-primary mt-4 w-full" disabled={loading}>
              {loading ? "กำลังสร้างบิล..." : "ยืนยันสั่งซื้อ"}
            </button>
            <Link href="/cart" className="btn mt-2 w-full border-navy bg-white text-navy hover:bg-steel">
              แก้ไขตะกร้า
            </Link>
          </aside>
        </form>
      </div>
    </>
  );
}
