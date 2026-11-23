import { getSettings } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { TrackLookup } from "./TrackLookup";

export const metadata = {
  title: "ติดตามออเดอร์",
  description: "ใส่เลขบิลและเบอร์โทรที่ใช้สั่งเพื่อดูบิล สถานะ เลขพัสดุ และพิมพ์ใบเสร็จ — ไม่ต้องสมัครสมาชิก",
};

export default async function TrackPage() {
  const settings = await getSettings();

  return (
    <>
      <PageHeader
        title="ติดตามออเดอร์"
        description="ใส่เลขบิลกับเบอร์ที่ใช้สั่ง — ไม่ต้องล็อกอิน"
        crumbs={[{ href: "/", label: "หน้าแรก" }, { label: "ติดตามออเดอร์" }]}
      />
      <div className="container-bs max-w-5xl py-8 md:py-12">
        <TrackLookup lineUrl={settings.lineUrl} lineId={settings.lineId} />
      </div>
    </>
  );
}
