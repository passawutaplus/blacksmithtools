import { getSettings } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "ติดต่อเรา" };

export default async function ContactPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHeader
        title="ติดต่อเรา"
        crumbs={[{ href: "/", label: "หน้าแรก" }, { label: "ติดต่อเรา" }]}
      />
      <div className="container-bs max-w-2xl py-10" data-reveal>
      <div className="card mt-6 space-y-3 p-5 text-sm">
        <p>
          <strong>{settings.shopName}</strong>
        </p>
        <p>{settings.address}</p>
        {settings.phone ? (
          <p>
            โทร: <a href={`tel:${settings.phone}`}>{settings.phone}</a>
          </p>
        ) : (
          <p className="text-muted">เบอร์โทร — รออัปเดตในหลังร้าน</p>
        )}
        {settings.email ? (
          <p>
            อีเมล: <a href={`mailto:${settings.email}`}>{settings.email}</a>
          </p>
        ) : (
          <p className="text-muted">อีเมล — รออัปเดตในหลังร้าน</p>
        )}
        <p>
          LINE:{" "}
          <a href={settings.lineUrl} target="_blank" rel="noopener noreferrer" className="text-forge underline">
            {settings.lineId}
          </a>
        </p>
        <p>
          Shopee:{" "}
          <a href={settings.shopeeShopUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">
            เปิดร้าน
          </a>
        </p>
        <p>
          Lazada:{" "}
          <a href={settings.lazadaShopUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">
            เปิดร้าน
          </a>
        </p>
      </div>
      <p className="mt-4 text-sm text-muted">
        ฟอร์มติดต่อจะเชื่อมอีเมล/LINE เมื่อตั้งค่า SMTP หรือ Messaging API ในเฟสถัดไป
      </p>
    </div>
    </>
  );
}