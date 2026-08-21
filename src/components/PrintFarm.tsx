import Image from "next/image";
import { Camera, Layers, Printer, Ruler } from "lucide-react";

const SPECS = [
  { label: "รุ่น", value: "Bambu Lab P2S" },
  { label: "จำนวน", value: "6 เครื่อง พร้อมขึ้นงานพร้อมกัน" },
  { label: "ปริมาตรพิมพ์ / ชิ้น", value: "256 × 256 × 256 มม." },
  { label: "วัสดุที่ใช้", value: "PLA, PETG, TPU" },
  { label: "ห้องพิมพ์", value: "ปิดทั้งเครื่อง งาน PETG เสถียร" },
  { label: "ดูงาน", value: "กล้องในเครื่อง ร้านเช็คระหว่างพิมพ์" },
];

export function PrintFarm() {
  return (
    <section id="farm" className="scroll-mt-24 border-b border-steel bg-white py-10 md:py-14">
      <div className="container-bs">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded bg-navy text-white">
            <Printer className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-wide text-forge">เครื่องพิมพ์เส้น</p>
            <h2 className="mt-1 text-2xl font-bold text-navy md:text-3xl">6 เครื่อง เรียงพร้อมรับงาน</h2>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-navy/90">
          ร้านใช้ Bambu Lab P2S ทั้ง 6 เครื่อง ขึ้นงานได้พร้อมกัน ไม่ต้องรอคิวเครื่องเดียวเมื่อออเดอร์มาหลายชิ้น
          ปริมาตรต่อชิ้นเท่ากับหมวดพิมพ์เส้นด้านล่าง
        </p>

        <div className="mt-6 overflow-hidden rounded-3xl border border-gray-200">
          <div className="relative aspect-[16/9] bg-navy">
            <Image
              src="/print/p2s-farm.png"
              alt="เครื่อง Bambu Lab P2S หกเครื่องเรียงบนโต๊ะงาน"
              fill
              priority
              className="object-cover"
              sizes="(min-width: 1440px) 1400px, 100vw"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="card flex items-start gap-2 px-4 py-3">
            <Printer className="mt-0.5 h-4 w-4 shrink-0 text-forge" aria-hidden />
            <p className="text-sm text-navy">
              <span className="font-semibold">6 เครื่อง</span>
              <span className="mt-0.5 block text-muted">พิมพ์พร้อมกันได้</span>
            </p>
          </div>
          <div className="card flex items-start gap-2 px-4 py-3">
            <Ruler className="mt-0.5 h-4 w-4 shrink-0 text-forge" aria-hidden />
            <p className="text-sm text-navy">
              <span className="font-semibold">256 × 256 × 256 มม.</span>
              <span className="mt-0.5 block text-muted">ขนาดสูงสุดต่อชิ้น</span>
            </p>
          </div>
          <div className="card flex items-start gap-2 px-4 py-3">
            <Layers className="mt-0.5 h-4 w-4 shrink-0 text-forge" aria-hidden />
            <p className="text-sm text-navy">
              <span className="font-semibold">PLA · PETG · TPU</span>
              <span className="mt-0.5 block text-muted">วัสดุที่รับบนเครื่องนี้</span>
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_1.1fr] lg:items-start">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-gray-200 bg-steel">
            <Image
              src="/print/p2s-close.png"
              alt="เครื่อง Bambu Lab P2S ใกล้ ๆ พร้อมกล่องเส้นด้านบน"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 360px, 100vw"
            />
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-gray-200 bg-steel">
            <Image
              src="/print/p2s-print.png"
              alt="งานพิมพ์เส้นกำลังขึ้นในห้องเครื่อง P2S"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 360px, 100vw"
            />
          </div>
          <div className="overflow-hidden rounded-3xl border border-gray-200">
            <table className="data-table">
              <thead>
                <tr>
                  <th>หัวข้อ</th>
                  <th>รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {SPECS.map((row) => (
                  <tr key={row.label}>
                    <td className="font-semibold text-muted">{row.label}</td>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-4 flex items-start gap-2 text-sm text-muted">
          <Camera className="mt-0.5 h-4 w-4 shrink-0 text-forge" aria-hidden />
          <span>เครื่องมีกล้องในห้องพิมพ์ ร้านดูงานระหว่างขึ้นได้ ถ้าชิ้นพังกลางทางหยุดแล้วแจ้งลูกค้า</span>
        </p>
      </div>
    </section>
  );
}
