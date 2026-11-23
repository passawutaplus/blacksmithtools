import { getSettings } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";

export const metadata = {
  title: "รับประกัน / เคลม",
  description: "เงื่อนไขรับประกันและวิธีเคลมสินค้า BlackSmith Tools งานพิมพ์มีปัญหา แจ้งรูปทาง LINE แล้วร้านพิมพ์ใหม่ให้",
  alternates: { canonical: "/warranty" },
};

export default async function WarrantyPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHeader
        title="รับประกันและเคลมสินค้า"
        description="งานพิมพ์ 3D มีรับประกันตามเงื่อนไขร้าน — แจ้งเคลมผ่าน LINE OA"
        crumbs={[{ href: "/", label: "หน้าแรก" }, { label: "รับประกัน" }]}
      />
      <div className="container-bs max-w-3xl py-10" data-reveal>
      <div className="mt-6 space-y-4 text-sm text-navy/90">
        <p>
          สินค้างาน 3D Print มีรับประกันตลอดชีพตามเงื่อนไขที่ร้านกำหนด — แจ้งเคลมผ่าน LINE OA
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            เข้า LINE:{" "}
            <a href={settings.lineUrl} className="text-forge underline">
              {settings.lineId}
            </a>
          </li>
          <li>เลือกเมนู &quot;แจ้งปัญหา เคลมสินค้า&quot;</li>
          <li>ส่งรูปและรายละเอียดปัญหา</li>
          <li>ร้านพิจารณาและดำเนินการโดยประมาณ 1–2 วัน</li>
        </ol>
        <p>งานพิมพ์ตามสั่งสามารถเลือกสีได้ตามที่มีในระบบ</p>
      </div>
    </div>
    </>
  );
}