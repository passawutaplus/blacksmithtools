import type { LucideIcon } from "lucide-react";
import {
  Layers,
  Droplets,
  Palette,
  Ruler,
  ClipboardList,
  CircleDollarSign,
  Images,
  Box,
} from "lucide-react";
import { FDM_WORKS, SLA_WORKS, PrintWorksBand } from "@/components/PrintWorksSlider";

const FDM_PRICE = [
  ["PLA (เส้น)", "2.5 บาท/กรัม", "80 บาท", "งานทั่วไป ที่เก็บ จิ๊ก"],
  ["PETG (เส้น)", "3.5 บาท/กรัม", "80 บาท", "งานทนร้อน/น้ำมัน กว่า PLA"],
  ["TPU (เส้นยืด)", "4.5 บาท/กรัม", "100 บาท", "ชิ้นที่ต้องยืดหยุ่น"],
];

const SLA_PRICE = [
  ["เรซิ่นมาตรฐาน", "6 บาท/กรัม", "120 บาท", "ชิ้นเล็ก ผิวเรียบ"],
  ["เรซิ่นทนกระแทก", "8 บาท/กรัม", "120 บาท", "ฟิตติ้งเล็กที่ต้องรับแรง"],
];

const FDM_SPEC = [
  ["วิธีพิมพ์", "หลอมเส้นพลาสติกทีละชั้น"],
  ["ผิวงาน", "มีลายชั้นเล็กน้อย ใช้งานจริงได้"],
  ["ความแข็งแรง", "ทนกระแทกและบิดได้ดี โดยเฉพาะ PETG"],
  ["เหมาะกับ", "จิ๊ก ที่เก็บ ท่อเป่าลม ต้นแบบใช้ในอู่"],
  ["ไม่ค่อยเหมาะ", "ชิ้นเล็กมากที่ต้องการขอบคม"],
  ["ขนาดสูงสุด/ชิ้น", "ประมาณ 256 × 256 × 256 มม."],
  ["ไฟล์ที่รับ", "STL, 3MF, OBJ, STEP"],
  ["หลังพิมพ์", "ตัดซัพพอร์ต แต่งครีบ"],
];

const SLA_SPEC = [
  ["วิธีพิมพ์", "ฉายแสงน้ำเรซิ่นทีละชั้น"],
  ["ผิวงาน", "เรียบ คม รายละเอียดสูง"],
  ["ความแข็งแรง", "เรซิ่นทั่วไปเปราะกว่า แบบทนแรงใช้ได้ในชิ้นเล็ก"],
  ["เหมาะกับ", "ชิ้นจิ๋ว ฟิตติ้งแน่น ต้นแบบโชว์ ลายคม"],
  ["ไม่ค่อยเหมาะ", "ชิ้นใหญ่รับแรง หรือใช้กลางแจ้งนาน"],
  ["ขนาดสูงสุด/ชิ้น", "ประมาณ 192 × 120 × 200 มม."],
  ["ไฟล์ที่รับ", "STL, 3MF, OBJ, STEP"],
  ["หลังพิมพ์", "ล้างเรซิ่น อบ ตัดซัพพอร์ต แล้วขัดแต่งเบื้องต้น"],
];

const FDM_COLORS = [
  { name: "ดำ", src: "/print/materials/filament-black.png" },
  { name: "เทา", src: "/print/materials/filament-gray.png" },
  { name: "ส้มร้าน", src: "/print/materials/filament-orange.png" },
  { name: "เหลือง", src: "/print/materials/filament-yellow.png" },
  { name: "ขาว", src: "/print/materials/filament-white.png" },
  { name: "เขียว", src: "/print/materials/filament-green.png" },
];

const SLA_COLORS = [
  { name: "ขาว", src: "/print/materials/resin-white.png" },
  { name: "สีเนื้อ", src: "/print/materials/resin-skin.png" },
];

function Heading({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <h3 className="mt-10 flex items-center gap-2 text-lg font-bold text-navy">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-steel">
        <Icon className="h-4 w-4 text-forge" aria-hidden />
      </span>
      {children}
    </h3>
  );
}

function ColorGrid({
  items,
  note,
}: {
  items: { name: string; src: string }[];
  note: string;
}) {
  return (
    <div className="mt-4">
      <ul
        className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${items.length > 3 ? "md:grid-cols-6" : "md:grid-cols-2 md:max-w-md"}`}
      >
        {items.map((c) => (
          <li key={c.name} className="card overflow-hidden">
            <div className="aspect-square bg-steel">
              <img src={c.src} alt={`สี${c.name}`} className="h-full w-full object-cover" />
            </div>
            <p className="px-2 py-2 text-center text-sm font-semibold text-navy">{c.name}</p>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm text-muted">{note}</p>
    </div>
  );
}

function SpecTable({ rows }: { rows: string[][] }) {
  return (
    <div className="card mt-4 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table min-w-[520px]">
          <thead>
            <tr>
              <th className="w-44">หัวข้อ</th>
              <th>รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]}>
                <td className="font-semibold text-muted">{row[0]}</td>
                <td>{row[1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PriceTable({ rows }: { rows: string[][] }) {
  return (
    <div className="card mt-4 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table min-w-[640px]">
          <thead>
            <tr>
              <th>วัสดุ</th>
              <th>เรทตั้งต้น</th>
              <th>ขั้นต่ำ / ชิ้น</th>
              <th>เหมาะกับ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]}>
                <td className="font-semibold">{row[0]}</td>
                <td className="num">{row[1]}</td>
                <td className="num">{row[2]}</td>
                <td>{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PrintGuide() {
  return (
    <>
      <section id="fdm" className="scroll-mt-24 border-t border-steel py-12 md:py-16">
        <div className="container-bs">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded bg-navy text-white">
              <Layers className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold tracking-wide text-forge">หมวด FDM</p>
              <h2 className="mt-1 text-2xl font-bold text-navy md:text-3xl">พิมพ์เส้น</h2>
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-navy/90">
            เครื่องดึงเส้นพลาสติกหลอมออกมาเป็นชั้น ๆ เหมือนงานที่ร้านใช้ทำที่เก็บเครื่องมือและท่อเป่าลม
            เห็นลายชั้นได้เล็กน้อย แต่ชิ้นงานทน ซ่อมง่าย ราคาต่อชิ้นคุ้มกว่างานเรซิ่นขนาดเดียวกัน
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              ["PLA", "พิมพ์ง่าย ผิวสวย งานในร่ม ที่เก็บ จิ๊ก"],
              ["PETG", "เหนียว ทนความร้อนและน้ำมัน งานอู่"],
              ["TPU", "ยืดได้ งานที่ต้องกระแทกแล้วไม่แตก"],
            ].map(([name, hint]) => (
              <li key={name} className="card px-3 py-3">
                <p className="flex items-center gap-2 font-semibold text-navy">
                  <Box className="h-4 w-4 text-forge" aria-hidden />
                  {name}
                </p>
                <p className="mt-1 text-sm text-muted">{hint}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-start gap-2 text-sm text-muted">
            <Ruler className="mt-0.5 h-4 w-4 shrink-0 text-forge" aria-hidden />
            <span>
              ขนาดที่รับได้ต่อชิ้นประมาณ <strong className="text-navy">256 × 256 × 256 มม.</strong>{" "}
              งานใหญ่กว่านี้แยกชิ้นแล้วประกอบ
            </span>
          </p>

          <Heading icon={Palette}>สีเส้นที่มี</Heading>
          <ColorGrid items={FDM_COLORS} note="สต็อกสีเส้นเปลี่ยนได้ตามรอบวัสดุ ยืนยันตอนคุยงาน" />

          <Heading icon={ClipboardList}>สเปก</Heading>
          <SpecTable rows={FDM_SPEC} />

          <Heading icon={CircleDollarSign}>ราคาตั้งต้น</Heading>
          <p className="mt-2 text-sm text-muted">
            เรทตั้งต้น ไม่ใช่ใบเสนอราคา — ล็อกราคาหลังเปิดไฟล์ในโปรแกรมเตรียมพิมพ์
          </p>
          <PriceTable rows={FDM_PRICE} />

          <Heading icon={Images}>ผลงาน</Heading>
        </div>
        <div className="mt-4">
          <PrintWorksBand items={FDM_WORKS} />
        </div>
      </section>

      <section id="sla" className="scroll-mt-24 bg-steel/60 py-12 md:py-16">
        <div className="container-bs">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded bg-navy text-white">
              <Droplets className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold tracking-wide text-forge">หมวด SLA</p>
              <h2 className="mt-1 text-2xl font-bold text-navy md:text-3xl">พิมพ์เรซิ่น</h2>
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-navy/90">
            เครื่องฉายแสงลงถังเรซิ่น ทำให้ชิ้นงานละเอียด ผิวเรียบ ขอบคม เหมาะชิ้นเล็กที่เส้นทำไม่คมพอ
            ต้องล้างและอบหลังพิมพ์ เรซิ่นทั่วไปเปราะกว่าเส้น ถ้าชิ้นรับแรงให้ใช้สูตรทนกระแทก
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              ["เรซิ่นมาตรฐาน", "โมเดล ต้นแบบโชว์ ชิ้นจิ๋ว"],
              ["เรซิ่นทนกระแทก", "ฟิตติ้งเล็ก คลิป ชิ้นที่ต้องงัด"],
            ].map(([name, hint]) => (
              <li key={name} className="card px-3 py-3">
                <p className="flex items-center gap-2 font-semibold text-navy">
                  <Droplets className="h-4 w-4 text-forge" aria-hidden />
                  {name}
                </p>
                <p className="mt-1 text-sm text-muted">{hint}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-start gap-2 text-sm text-muted">
            <Ruler className="mt-0.5 h-4 w-4 shrink-0 text-forge" aria-hidden />
            <span>
              ขนาดที่รับได้ต่อชิ้นประมาณ <strong className="text-navy">192 × 120 × 200 มม.</strong>{" "}
              ชิ้นใหญ่หรือหนา ร้านอาจแนะนำสลับไปพิมพ์เส้น
            </span>
          </p>

          <Heading icon={Palette}>สีเรซิ่นที่มี</Heading>
          <ColorGrid
            items={SLA_COLORS}
            note="มีแค่ขาวกับสีเนื้อ ร้านตัดซัพพอร์ต ล้าง อบ แล้วขัดแต่งเบื้องต้นให้ ไม่ทำสีทับ"
          />

          <Heading icon={ClipboardList}>สเปก</Heading>
          <SpecTable rows={SLA_SPEC} />

          <Heading icon={CircleDollarSign}>ราคาตั้งต้น</Heading>
          <p className="mt-2 text-sm text-muted">
            เรทตั้งต้น ไม่ใช่ใบเสนอราคา — ล็อกราคาหลังเปิดไฟล์ในโปรแกรมเตรียมพิมพ์
          </p>
          <PriceTable rows={SLA_PRICE} />

          <Heading icon={Images}>ผลงาน</Heading>
        </div>
        <div className="mt-4">
          <PrintWorksBand items={SLA_WORKS} />
        </div>
      </section>
    </>
  );
}
