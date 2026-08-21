import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "นโยบายคุกกี้" };

export default function CookiesPage() {
  return (
    <>
      <PageHeader title="นโยบายคุกกี้" crumbs={[{ href: "/", label: "หน้าแรก" }, { label: "คุกกี้" }]} />
      <div className="container-bs max-w-3xl py-10">
      <div className="mt-6 space-y-4 text-sm text-navy/90">
        <p>เราแบ่งคุกกี้เป็น 3 ประเภท:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>จำเป็น</strong> — ตะกร้า เซสชัน ความปลอดภัย (เปิดเสมอ)
          </li>
          <li>
            <strong>วิเคราะห์</strong> — เข้าใจการใช้งานเว็บ (ต้องยินยอม)
          </li>
          <li>
            <strong>การตลาด</strong> — โฆษณา/รีมาร์เก็ตติ้ง (ต้องยินยอม)
          </li>
        </ul>
        <p>
          คุณเปลี่ยนความยินยอมได้โดยลบคุกกี้ในเบราว์เซอร์ แล้วโหลดหน้าเว็บใหม่เพื่อเลือกอีกครั้ง
          หรือติดต่อเราผ่านหน้าติดต่อ
        </p>
      </div>
    </div>
    </>
  );
}