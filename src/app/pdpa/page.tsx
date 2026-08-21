import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "PDPA — สิทธิเจ้าของข้อมูล" };

export default function PdpaPage() {
  return (
    <>
      <PageHeader
        title="สิทธิตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล"
        crumbs={[{ href: "/", label: "หน้าแรก" }, { label: "PDPA" }]}
      />
      <div className="container-bs max-w-3xl py-10">
      <div className="mt-6 space-y-4 text-sm text-navy/90">
        <p>
          คุณมีสิทธิขอเข้าถึง แก้ไข ลบ ระงับ โอนย้าย หรือคัดค้านการประมวลผลข้อมูลส่วนบุคคลที่เกี่ยวข้องกับออเดอร์และการตลาด
        </p>
        <p>
          ส่งคำขอผ่าน LINE ร้าน หรือหน้า{" "}
          <a href="/contact" className="text-forge underline">
            ติดต่อเรา
          </a>{" "}
          โดยระบุชื่อ เบอร์โทร และเลขออเดอร์ (ถ้ามี) เราจะตอบภายในระยะเวลาที่กฎหมายกำหนด
        </p>
        <p className="text-muted">
          อ่านนโยบายฉบับเต็มที่{" "}
          <a href="/privacy" className="underline">
            ความเป็นส่วนตัว
          </a>
        </p>
      </div>
    </div>
    </>
  );
}