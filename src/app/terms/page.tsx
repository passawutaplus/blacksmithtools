import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "ข้อกำหนดการใช้บริการ" };

export default function TermsPage() {
  return (
    <>
      <PageHeader
        title="ข้อกำหนดการใช้บริการและเงื่อนไขการขาย"
        crumbs={[{ href: "/", label: "หน้าแรก" }, { label: "ข้อกำหนด" }]}
      />
      <div className="container-bs max-w-3xl py-10">
      <div className="mt-6 space-y-4 text-sm text-navy/90">
        <p>
          การสั่งซื้อผ่านเว็บไซต์ BlackSmith ถือว่าคุณยอมรับเงื่อนไขการขาย ราคา สต็อก
          และการจัดส่งตามที่แสดงตอนยืนยันออเดอร์
        </p>
        <h2 className="text-lg font-bold">การสั่งซื้อและการชำระเงิน</h2>
        <p>
          ออเดอร์มีผลเมื่อระบบสร้างบิลแล้ว การชำระเงินอาจทำผ่าน Payso (เมื่อเปิดใช้), โอนธนาคาร+สลิป
          หรือช่องทางอื่นที่ร้านเปิดไว้ ร้านมีสิทธิ์ยกเลิกหากตรวจพบข้อมูลไม่ถูกต้องหรือสลิปไม่ตรงยอด
        </p>
        <h2 className="text-lg font-bold">สินค้าและสต็อก</h2>
        <p>
          สินค้าส่วนใหญ่เป็นอุปกรณ์เสริมที่ออกแบบให้เข้ากับยี่ห้อเครื่องมืออื่น — ไม่ได้เป็นตัวแทนจำหน่ายทางการของ Milwaukee,
          Dewalt, Makita, Bosch หรือยี่ห้ออื่น
        </p>
        <h2 className="text-lg font-bold">การจัดส่ง</h2>
        <p>เมื่อร้านกดส่งแล้ว จะอัปเดตเลขแทรกบนบิลออนไลน์ และส่งอีเมลหากมีที่อยู่อีเมล</p>
        <h2 className="text-lg font-bold">การเคลม</h2>
        <p>
          งาน 3D Print มีเงื่อนไขรับประกันตามหน้า{" "}
          <a href="/warranty" className="text-forge underline">
            รับประกัน
          </a>
        </p>
      </div>
    </div>
    </>
  );
}