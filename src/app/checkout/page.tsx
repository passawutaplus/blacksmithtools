"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/cart-store";
import { formatTHB } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const cartId = useCartStore((s) => s.cartId);
  const setCartId = useCartStore((s) => s.setCartId);
  const clear = useCartStore((s) => s.clear);
  const [subtotal, setSubtotal] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"mock" | "bank_transfer" | "promptpay_qr">(
    "mock",
  );

  useEffect(() => {
    async function sync() {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, items }),
      });
      const data = await res.json();
      if (data.cartId) setCartId(data.cartId);
      setSubtotal(data.subtotal ?? 0);
      setShipping(data.shippingFee ?? 0);
    }
    void sync();
  }, [items, cartId, setCartId]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId,
          items,
          paymentMethod,
          address: {
            fullName: fd.get("fullName"),
            phone: fd.get("phone"),
            email: fd.get("email") || "",
            line1: fd.get("line1"),
            line2: fd.get("line2") || "",
            district: fd.get("district"),
            province: fd.get("province"),
            postalCode: fd.get("postalCode"),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "สั่งซื้อไม่สำเร็จ");
      clear();
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
          <div>
            <label className="label" htmlFor="fullName">
              ชื่อ-นามสกุล
            </label>
            <input id="fullName" name="fullName" required className="input" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="phone">
                เบอร์โทร
              </label>
              <input id="phone" name="phone" required className="input" inputMode="tel" />
            </div>
            <div>
              <label className="label" htmlFor="email">
                อีเมล (ถ้ามี — สำหรับใบเสร็จ)
              </label>
              <input id="email" name="email" type="email" className="input" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="line1">
              ที่อยู่
            </label>
            <input id="line1" name="line1" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="line2">
              รายละเอียดเพิ่มเติม
            </label>
            <input id="line2" name="line2" className="input" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="district">
                เขต/อำเภอ
              </label>
              <input id="district" name="district" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="province">
                จังหวัด
              </label>
              <input id="province" name="province" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="postalCode">
                รหัสไปรษณีย์
              </label>
              <input id="postalCode" name="postalCode" required className="input" />
            </div>
          </div>

          <h2 className="pt-4 font-bold">ช่องทางชำระเงิน</h2>
          <p className="text-xs text-muted">
            ขณะนี้ยังไม่เปิด Payso production — ใช้โหมดทดสอบหรือโอน+อัปโหลดสลิปได้
          </p>
          <div className="space-y-2">
            {(
              [
                ["mock", "ทดสอบชำระเงิน (เดโม่)"],
                ["bank_transfer", "โอนธนาคาร + อัปโหลดสลิป"],
                ["promptpay_qr", "PromptPay QR (แสดงบนบิล)"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="card flex items-center gap-2 p-3">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === value}
                  onChange={() => setPaymentMethod(value)}
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <aside className="card h-fit p-5">
          <div className="flex justify-between text-sm">
            <span>ยอดสินค้า</span>
            <span>{formatTHB(subtotal)}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span>ค่าส่ง</span>
            <span>{shipping === 0 ? "ฟรี" : formatTHB(shipping)}</span>
          </div>
          <div className="mt-4 flex justify-between text-lg font-bold">
            <span>รวมชำระ</span>
            <span className="text-forge">{formatTHB(subtotal + shipping)}</span>
          </div>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          <button type="submit" className="btn btn-primary mt-4 w-full" disabled={loading}>
            {loading ? "กำลังสร้างบิล..." : "ยืนยันสั่งซื้อ"}
          </button>
        </aside>
      </form>
    </div>
    </>
  );
}