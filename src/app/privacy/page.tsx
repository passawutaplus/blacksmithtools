import { PageHeader } from "@/components/PageHeader";

function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHeader title={title} crumbs={[{ href: "/", label: "หน้าแรก" }, { label: title }]} />
      <div className="container-bs max-w-3xl py-10">
        <div className="space-y-4 text-sm text-navy/90">{children}</div>
      </div>
    </>
  );
}

export function PrivacyContent() {
  return (
    <LegalLayout title="นโยบายความเป็นส่วนตัว">
      <p>
        BlackSmith Tools & Supplies (“เรา”) เก็บและใช้ข้อมูลส่วนบุคคลเพื่อดำเนินการสั่งซื้อ
        จัดส่ง ออกใบเสร็จ ติดต่อลูกค้า และปรับปรุงบริการ ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
      </p>
      <h2 className="text-lg font-bold">ข้อมูลที่เก็บ</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>ชื่อ เบอร์โทร อีเมล ที่อยู่จัดส่ง</li>
        <li>ที่อยู่และข้อมูลออกบิลที่จำไว้บนเบราว์เซอร์นี้ เพื่อสั่งครั้งหน้าโดยไม่ต้องสมัครสมาชิก</li>
        <li>รายละเอียดออเดอร์ การชำระเงิน (ไม่เก็บเลขบัตรเต็ม)</li>
        <li>หลักฐานสลิปโอน (ถ้ามี)</li>
        <li>คุกกี้ที่จำเป็นและคุกกี้ที่คุณยินยอม</li>
      </ul>
      <h2 className="text-lg font-bold">สิทธิของเจ้าของข้อมูล</h2>
      <p>
        คุณขอเข้าถึง แก้ไข ลบ หรือคัดค้านการประมวลผลได้ผ่านหน้า{" "}
        <a href="/pdpa" className="text-forge underline">
          PDPA
        </a>{" "}
        หรือติดต่อเราที่หน้า{" "}
        <a href="/contact" className="text-forge underline">
          ติดต่อเรา
        </a>
      </p>
      <p className="text-sm text-muted">
        รายละเอียดบริษัท ที่อยู่ และเลขผู้เสียภาษี แก้ไขได้จากหลังร้าน (site settings)
      </p>
    </LegalLayout>
  );
}

export default function PrivacyPage() {
  return <PrivacyContent />;
}