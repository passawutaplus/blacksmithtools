import Link from "next/link";
import { getSettings } from "@/lib/db";
import { QuoteTool } from "@/components/print-quote/QuoteTool";

export const metadata = {
  title: "ประเมินราคาพิมพ์ 3D จากไฟล์",
  alternates: { canonical: "/custom-print/quote" },
  description:
    "วางไฟล์ STL หรือ OBJ ดูโมเดล 3D เช็กไฟล์ ใส่จำนวน แล้วขอใบเสนอราคาพิมพ์ 3D (FDM PETG / Resin) ร้านตรวจไฟล์ก่อนยืนยันราคา",
};

export default async function PrintQuotePage() {
  const settings = await getSettings();
  return (
    <div className="bg-white pb-12">
      <nav aria-label="เส้นทาง" className="border-b border-steel bg-white">
        <div className="container-bs py-3 text-sm text-muted">
          <Link href="/" className="hover:text-navy">หน้าแรก</Link>
          <span className="mx-2">/</span>
          <Link href="/custom-print" className="hover:text-navy">พิมพ์ 3D</Link>
          <span className="mx-2">/</span>
          <span className="text-navy">ประเมินราคา</span>
        </div>
      </nav>
      <div className="container-bs pt-8">
        <h1 className="text-2xl font-bold text-navy md:text-3xl">ประเมินราคาพิมพ์ 3D</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          วางไฟล์ STL / OBJ เลือกวัสดุและความละเอียด ใส่จำนวน แล้วขอใบเสนอราคา ร้านจะตรวจไฟล์ก่อนยืนยันราคาจริง
        </p>
      </div>
      <div className="container-bs pt-6">
        <QuoteTool lineId={settings.lineId} lineUrl={settings.lineUrl} />
      </div>
    </div>
  );
}
