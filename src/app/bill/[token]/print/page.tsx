import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderByToken, incrementPrintCount } from "@/lib/db";
import { formatTHB } from "@/lib/utils";
import { PrintButton } from "@/components/PrintButton";
import { ShopLogo } from "@/components/ShopLogo";

export default async function PrintReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const detail = await getOrderByToken(token);
  if (!detail?.document) notFound();
  const { order, document, settings } = detail;
  await incrementPrintCount(document.id);

  return (
    <div className="mx-auto max-w-[800px] bg-white p-6 text-navy print:p-0">
      <div className="no-print mb-6 flex flex-wrap gap-2">
        <PrintButton />
        <Link href={`/bill/${token}`} className="btn btn-secondary">
          กลับบิล
        </Link>
      </div>

      <header className="border-b pb-4">
        <ShopLogo variant="print" />
        <p className="mt-1 text-sm">{settings.tagline}</p>
        <p className="mt-2 text-xs text-muted">{settings.address}</p>
        <p className="mt-4 text-lg font-bold">บิลเงินสด / ใบเสร็จรับเงิน</p>
        <p className="text-sm">
          เลขที่ {document.number} · ออเดอร์ {order.number}
        </p>
        <p className="text-xs text-muted">
          ออกเมื่อ {new Date(document.issuedAt).toLocaleString("th-TH")}
        </p>
      </header>

      <section className="mt-4 text-sm">
        <p className="font-semibold">ผู้รับ</p>
        <p>
          {order.address.fullName} · {order.address.phone}
          <br />
          {order.address.line1}
          {order.address.line2 ? `, ${order.address.line2}` : ""}
          <br />
          {order.address.district} {order.address.province} {order.address.postalCode}
        </p>
      </section>

      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">รายการ</th>
            <th className="py-2">จำนวน</th>
            <th className="py-2">ราคา</th>
            <th className="py-2">รวม</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.productId} className="border-b border-gray-100">
              <td className="py-2">
                {item.name}
                <br />
                <span className="text-xs text-muted">{item.sku}</span>
              </td>
              <td className="py-2">{item.quantity}</td>
              <td className="py-2">{formatTHB(item.price)}</td>
              <td className="py-2">{formatTHB(item.price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <span>ยอดสินค้า</span>
          <span>{formatTHB(order.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>ค่าส่ง</span>
          <span>{formatTHB(order.shippingFee)}</span>
        </div>
        <div className="flex justify-between text-base font-bold">
          <span>ยอดสุทธิ</span>
          <span>{formatTHB(order.grandTotal)}</span>
        </div>
        <p className="pt-2 text-xs text-muted">ชำระโดย: {order.paymentMethod}</p>
      </div>

      <p className="mt-8 text-xs text-muted">
        เอกสารนี้เป็นบิลเงินสดสำหรับลูกค้าปลีก ไม่ใช่ใบกำกับภาษีเต็มรูปแบบ
        <br />
        ขอบคุณที่อุดหนุนแบรนด์คนไทย — {settings.shopName}
      </p>
    </div>
  );
}