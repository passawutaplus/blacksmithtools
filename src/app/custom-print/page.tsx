import Image from "next/image";
import Link from "next/link";
import { Layers, Droplets, ListOrdered, MessageCircle, Truck, RotateCcw, ShieldCheck, Printer, FileDown } from "lucide-react";
import { getSettings } from "@/lib/db";
import { PrintQuoteForm } from "@/components/PrintQuoteForm";
import { PrintGuide } from "@/components/PrintGuide";
import { PrintFlow } from "@/components/PrintFlow";
import { PrintFarm } from "@/components/PrintFarm";
import { PrintFileGuide } from "@/components/PrintFileGuide";
import { jsonLd } from "@/lib/json-ld";
import { OG_BASE, breadcrumbLd, siteUrl } from "@/lib/seo";

const PRINT_DESC =
  "รับพิมพ์ 3D FDM เส้น และ SLA เรซิ่น ตามสั่ง ส่งไฟล์ STL, 3MF, OBJ หรือ STEP ให้ร้านประเมินในโปรแกรมเตรียมพิมพ์ก่อนจึงแจ้งราคาแม่น";

export const metadata = {
  title: "รับพิมพ์ 3D ตามสั่ง FDM และเรซิ่น",
  openGraph: { ...OG_BASE, type: "website", title: "รับพิมพ์ 3D ตามสั่ง | BlackSmith Tools", description: PRINT_DESC },
  alternates: { canonical: "/custom-print" },
  description: PRINT_DESC,
};

const USES = [
  {
    src: "/print/jig.png",
    title: "จิ๊กและที่เก็บ",
    body: "Holder ที่แขวนกล่อง ถาดแบ่งช่อง ให้ของอยู่กับที่ในไซต์งาน",
  },
  {
    src: "/print/part.png",
    title: "อะไหล่เฉพาะรุ่น",
    body: "ท่อเป่าลม ชิ้นที่ขาดแล้วหาซื้อไม่ได้ พิมพ์เข้ากับรุ่นที่ระบุ",
  },
  {
    src: "/print/proto.png",
    title: "ต้นแบบจำนวนน้อย",
    body: "ลองรูปทรงก่อนสั่งผลิตจริง หรือทำจิ๊กใช้เองในอู่",
  },
];

const STEPS = [
  {
    n: "1",
    t: "พูดคุยรายละเอียด",
    d: "บอกว่าใช้ทำอะไร วัสดุ สี จำนวน และกำหนดส่ง ทาง LINE หรือฟอร์มด้านล่าง",
  },
  {
    n: "2",
    t: "ตรวจสอบไฟล์",
    d: "ส่ง STL / 3MF / OBJ / STEP ร้านเปิดดูความหนา รู ผนัง และจุดที่พิมพ์ไม่ติด",
  },
  {
    n: "3",
    t: "แก้ไฟล์ให้พร้อมพิมพ์",
    d: "ร้านช่วยจัดทิศ ซัพพอร์ต แยกชิ้น หรือซ่อมไฟล์ ก่อนทำราคา — ยังไม่ล็อกราคาตอนนี้",
  },
  {
    n: "4",
    t: "เสนอราคา",
    d: "เปิดในโปรแกรมเตรียมพิมพ์ ดูกรัม เวลา ซัพพอร์ต แล้วแจ้งราคาที่แม่น",
  },
  {
    n: "5",
    t: "มัดจำ หรือจ่ายเต็ม",
    d: "ยืนยันงานด้วยมัดจำ หรือชำระเต็มจำนวนตามที่ตกลง ก่อนขึ้นเครื่อง",
  },
  {
    n: "6",
    t: "พิมพ์งาน",
    d: "ขึ้นเครื่องตามวัสดุที่ล็อก ตรวจชิ้นงานก่อนแพ็ก",
  },
  {
    n: "7",
    t: "ส่งงาน",
    d: "ค่าส่งขนส่งทั่วไปร้านออกให้ฟรี หากต้องการเดลิเวอรี่ด่วน ลูกค้าออกเอง",
  },
  {
    n: "8",
    t: "งานมีปัญหา พิมพ์แก้ให้ใหม่",
    d: "แจ้งพร้อมรูปทาง LINE ร้านพิมพ์ชิ้นใหม่ส่งให้ ตามเงื่อนไขรับประกันงานพิมพ์",
  },
];

export default async function CustomPrintPage() {
  const settings = await getSettings();
  const base = siteUrl();
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "รับพิมพ์ 3D ตามสั่ง",
      serviceType: "3D printing",
      description: PRINT_DESC,
      url: `${base}/custom-print`,
      areaServed: { "@type": "Country", name: "Thailand" },
      provider: { "@type": "Organization", name: "BlackSmith Tools", url: base },
    },
    breadcrumbLd([
      ["หน้าแรก", "/"],
      ["บริการพิมพ์ 3D", "/custom-print"],
    ]),
  ];

  return (
    <div className="bg-white pb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <nav aria-label="เส้นทาง" className="border-b border-steel bg-white">
        <div className="container-bs py-3 text-sm text-muted">
          <Link href="/" className="hover:text-navy">
            หน้าแรก
          </Link>
          <span className="mx-2">/</span>
          <span className="text-navy">พิมพ์ 3D</span>
        </div>
      </nav>
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute inset-0">
          <Image
            src="/print/hero.png"
            alt=""
            fill
            priority
            className="object-cover object-center opacity-35"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/90 to-navy/55" />
        </div>
        <div className="container-bs relative grid gap-10 py-14 md:grid-cols-2 md:items-center md:py-20">
          <div>
            <p className="text-sm font-semibold tracking-wide text-forge">บริการ</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight md:text-5xl">พิมพ์ 3D ตามสั่ง</h1>
            <p className="mt-4 max-w-lg text-base text-white/85 md:text-lg">
              จิ๊ก ที่เก็บเครื่องมือ และอะไหล่ที่ของแท้มักไม่มี — พิมพ์เส้นด้วย P2S 6 เครื่อง หรือเรซิ่น (SLA)
            </p>
            <p className="mt-3 max-w-lg text-sm text-white/70">
              ราคาที่แม่นต้องส่งไฟล์ STL, 3MF, OBJ หรือ STEP ให้ร้านเปิดในโปรแกรมเตรียมพิมพ์ก่อน จึงล็อกราคาได้
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={settings.lineUrl}
                className="btn btn-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                คุยผ่าน LINE
              </a>
              <a href="#quote" className="btn btn-secondary text-navy">
                กรอกสเปกงาน
              </a>
            </div>
            <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-white/80" aria-label="ข้ามไปหมวด">
              <a href="#farm" className="inline-flex items-center gap-1.5 hover:text-white">
                <Printer className="h-4 w-4" aria-hidden /> เครื่อง 6 ตัว
              </a>
              <a href="#files" className="inline-flex items-center gap-1.5 hover:text-white">
                <FileDown className="h-4 w-4" aria-hidden /> เซฟไฟล์
              </a>
              <a href="#fdm" className="inline-flex items-center gap-1.5 hover:text-white">
                <Layers className="h-4 w-4" aria-hidden /> พิมพ์เส้น
              </a>
              <a href="#sla" className="inline-flex items-center gap-1.5 hover:text-white">
                <Droplets className="h-4 w-4" aria-hidden /> พิมพ์เรซิ่น
              </a>
              <a href="#steps" className="inline-flex items-center gap-1.5 hover:text-white">
                <ListOrdered className="h-4 w-4" aria-hidden /> ขั้นตอนงาน
              </a>
            </nav>
          </div>
          <div className="hidden md:block">
            <div className="grid grid-cols-3 gap-3">
              {USES.map((u) => (
                <div key={u.title} className="relative aspect-[3/4] overflow-hidden rounded bg-navy-deep ring-1 ring-white/10">
                  <Image src={u.src} alt={u.title} fill className="object-cover" sizes="180px" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PrintFarm />

      <PrintFileGuide />

      <PrintGuide />

      <section id="steps" className="scroll-mt-24 bg-white py-12 md:py-16">
        <div className="container-bs">
          <h2 className="flex items-center gap-2 text-2xl font-bold text-navy">
            <ListOrdered className="h-6 w-6 text-forge" aria-hidden />
            ขั้นตอนการทำงาน
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            ร้านช่วยตรวจและจัดไฟล์ให้พร้อมพิมพ์ก่อนทำราคา ไม่ขึ้นเครื่องจนกว่าจะมัดจำหรือจ่ายเต็ม
          </p>
          <PrintFlow steps={STEPS} />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="card p-5">
              <p className="flex items-center gap-2 font-semibold text-navy">
                <Truck className="h-4 w-4 text-forge" aria-hidden />
                ค่าส่ง
              </p>
              <p className="mt-2 text-sm leading-relaxed text-navy/90">
                ส่งขนส่งทั่วไป ร้านออกให้ฟรี หากต้องการเดลิเวอรี่ด่วน ลูกค้าเป็นคนออกค่าส่งเอง
              </p>
            </div>
            <div className="card p-5">
              <p className="flex items-center gap-2 font-semibold text-navy">
                <RotateCcw className="h-4 w-4 text-forge" aria-hidden />
                งานมีปัญหา
              </p>
              <p className="mt-2 text-sm leading-relaxed text-navy/90">
                แจ้งพร้อมรูปทาง LINE ร้านพิมพ์แก้แล้วส่งชิ้นใหม่ให้ ตามเงื่อนไขรับประกันงานพิมพ์
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-bs py-12 md:py-16">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-navy">
          <MessageCircle className="h-6 w-6 text-forge" aria-hidden />
          คุยงานกับร้าน
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          กรอกสเปกหรือทัก LINE ส่งไฟล์ ร้านตรวจและจัดไฟล์ให้พร้อมพิมพ์ก่อนเสนอราคา แล้วมัดจำหรือจ่ายเต็มก่อนขึ้นเครื่อง
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
          <PrintQuoteForm lineUrl={settings.lineUrl} lineId={settings.lineId} />
          <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-24">
            <p className="flex items-center gap-2 font-semibold text-navy">
              <MessageCircle className="h-4 w-4 text-forge" aria-hidden />
              LINE ร้าน
            </p>
            <p className="text-sm text-muted">
              {settings.lineId} · ส่งไฟล์ STL, 3MF, OBJ หรือ STEP ในแชท ร้านประเมินในโปรแกรมเตรียมพิมพ์แล้วค่อยล็อกราคา
            </p>
            <a href={settings.lineUrl} target="_blank" rel="noopener noreferrer" className="block">
              <img
                src="/line-oa-qr.png"
                alt={`QR LINE ${settings.lineId}`}
                className="mx-auto h-40 w-40 object-contain"
              />
            </a>
            <a
              href={settings.lineUrl}
              className="btn btn-primary w-full"
              target="_blank"
              rel="noopener noreferrer"
            >
              เปิดแชท LINE
            </a>
            <Link href="/warranty" className="inline-flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-forge underline">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              เงื่อนไขรับประกันงานพิมพ์
            </Link>
          </aside>
        </div>
      </section>
    </div>
  );
}
