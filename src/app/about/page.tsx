import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Landmark,
  Link2,
  MapPin,
  MessageCircle,
  Printer,
  ShieldCheck,
  Store,
  Wrench,
} from "lucide-react";
import { getBrandsAndCategories, getSettings } from "@/lib/db";
import { BrandLogo } from "@/components/BrandLogo";
import { LineTile, LazadaTile, ShopeeTile, TikTokTile, WebsiteTile } from "@/components/ChannelIcons";
import { WholesaleInquiry } from "@/components/WholesaleInquiry";

export const metadata = {
  title: "เกี่ยวกับเรา",
  description:
    "BlackSmith Tools & Supplies แบรนด์คนไทย ออกแบบอุปกรณ์เสริมเครื่องมือช่างให้เข้ากับ Milwaukee, Dewalt, Makita และอื่น ๆ พร้อมบริการพิมพ์ 3D และรับร้านที่อยากขายส่ง",
};

const COMPAT_SLUGS = ["milwaukee", "dewalt", "makita", "bosch", "osuka", "stanley"] as const;

const WHY = [
  {
    icon: Link2,
    t: "เข้าล็อกกับระบบจริง",
    d: "Packout, TStak, Toughsystem, M12/M18 และรุ่นเป่าลมที่ระบุชัดบนหน้าสินค้า",
  },
  {
    icon: MapPin,
    t: "ไทยทำ ไทยใช้",
    d: "ออกแบบเอง ผลิตเอง คุยกับร้านได้ตรง ไม่ต้องรอตัวแทนต่างประเทศ",
  },
  {
    icon: Printer,
    t: "งาน 3D ที่ซ่อมได้",
    d: "พิมพ์ตามสั่ง เลือกสีได้ มีรับประกันตามเงื่อนไขร้าน",
  },
  {
    icon: Store,
    t: "ซื้อได้หลายช่องทาง",
    d: "เว็บนี้ มาร์เก็ตเพลส หรือไลน์ร้าน — เลือกช่องที่คุ้น",
  },
] as const;

const WORKS = [
  {
    href: "/shop?category=battery-mount",
    src: "/print/jig.png",
    t: "ที่เก็บเครื่องมือและแบต",
    d: "Holder, battery mount, แม่เหล็กติดดอก",
  },
  {
    href: "/shop?category=milwaukee-packout",
    src: "/print/proto.png",
    t: "ถาดและเพลตกล่อง",
    d: "Packout, TStak, Toughsystem",
  },
  {
    href: "/shop?category=blower-nozzle",
    src: "/print/part.png",
    t: "ท่อเป่าลมเฉพาะรุ่น",
    d: "Makita, Osuka, Stanley ตามรหัสเครื่อง",
  },
  {
    href: "/shop?category=gooporange",
    src: "/about/parts.jpg",
    t: "GoopOrange",
    d: "เจลล้างมือช่าง ขจัดคราบน้ำมัน กาว สี",
  },
] as const;

const JUMP = [
  { href: "#who", label: "เราคือใคร" },
  { href: "#why", label: "ทำไมมีเรา" },
  { href: "#work", label: "สิ่งที่ทำ" },
  { href: "#buy", label: "วิธีซื้อ" },
  { href: "#wholesale", label: "ขายส่ง" },
] as const;

export default async function AboutPage() {
  const [settings, { brands }] = await Promise.all([getSettings(), getBrandsAndCategories()]);
  const compatBrands = COMPAT_SLUGS.map((slug) => brands.find((b) => b.slug === slug)).filter(
    (b): b is NonNullable<typeof b> => Boolean(b),
  );

  return (
    <div className="bg-white pb-8">
      <nav aria-label="เส้นทาง" className="border-b border-steel bg-white">
        <div className="container-bs py-3 text-sm text-muted">
          <Link href="/" className="hover:text-navy">
            หน้าแรก
          </Link>
          <span className="mx-2">/</span>
          <span className="text-navy">เกี่ยวกับเรา</span>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute inset-0">
          <Image
            src="/about/hero.jpg"
            alt=""
            fill
            priority
            className="object-cover object-center opacity-40"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/88 to-navy/50" />
        </div>
        <div className="container-bs relative py-14 md:py-20">
          <p className="text-sm font-semibold tracking-wide text-forge">แบรนด์คนไทย</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold leading-tight md:text-5xl">เกี่ยวกับเรา</h1>
          <p className="mt-4 max-w-xl text-base text-white/85 md:text-lg">
            อุปกรณ์เสริมเครื่องมือช่าง ออกแบบและผลิตในไทย ให้ช่างจัดของได้ หยิบง่าย ทำงานเร็วขึ้น
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="btn btn-primary">
              ดูสินค้า
            </Link>
            <Link href="/custom-print" className="btn btn-secondary text-navy">
              พิมพ์ 3D ตามสั่ง
            </Link>
          </div>
          <nav className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-white/80" aria-label="ข้ามไปหมวด">
            {JUMP.map((item) => (
              <a key={item.href} href={item.href} className="hover:text-white">
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section id="who" className="scroll-mt-24">
        <div className="container-bs grid gap-8 py-12 md:grid-cols-2 md:items-center md:py-16">
          <figure className="relative aspect-[3/2] overflow-hidden rounded-[3px] bg-navy-deep">
            <Image
              src="/about/workshop.jpg"
              alt="ฟาร์มเครื่องพิมพ์ 3D ของร้าน ที่พิมพ์อุปกรณ์เสริมเครื่องมือช่าง"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 560px"
            />
          </figure>
          <div>
            <p className="text-sm font-semibold text-forge">ที่มา</p>
            <h2 className="mt-1 text-2xl font-bold text-navy">เราคือใคร</h2>
            <p className="mt-4 text-sm leading-relaxed text-navy/90">
              {settings.shopName} เป็นแบรนด์คนไทยที่ทำอุปกรณ์เสริมให้เข้ากับเครื่องมือช่างยี่ห้อดัง
              ไม่ได้ขายสว่านหรือเครื่องเป่าของแบรนด์อื่น แต่ทำชิ้นที่ของแท้มักไม่มี — ที่เก็บแบต
              ที่แขวนกล่อง ถาดแบ่งช่อง ท่อเป่าลมเฉพาะรุ่น และเจลล้างมือช่าง
            </p>
            <p className="mt-3 text-sm leading-relaxed text-navy/90">
              สินค้าออกแบบจากงานจริงในอู่ โรงงาน และไซต์งาน แล้วพิมพ์และประกอบขายทั้งปลีกและส่ง
              ผ่านเว็บนี้ Shopee Lazada และ LINE
            </p>
          </div>
        </div>
      </section>

      <section id="why" className="scroll-mt-24 border-y border-steel bg-[#f7f8f9]">
        <div className="container-bs py-12 md:py-16">
          <p className="text-sm font-semibold text-forge">สัญญาหน้างาน</p>
          <h2 className="mt-1 text-2xl font-bold text-navy">ทำไมมีเรา</h2>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map((item) => (
              <li key={item.t} className="flex gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-forge shadow-[0_8px_20px_rgba(35,50,61,0.06)]">
                  <item.icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold text-navy">{item.t}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{item.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="work" className="scroll-mt-24">
        <div className="container-bs py-12 md:py-16">
          <p className="text-sm font-semibold text-forge">สินค้า</p>
          <h2 className="mt-1 text-2xl font-bold text-navy">สิ่งที่เราทำ</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">กดหมวดเพื่อดูของที่เข้ากับงานพี่</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WORKS.map((item) => (
              <Link key={item.href} href={item.href} className="group overflow-hidden rounded-[3px] bg-navy-deep">
                <span className="relative block aspect-[4/3]">
                  <Image
                    src={item.src}
                    alt=""
                    fill
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
                  />
                </span>
                <span className="block bg-white px-4 py-3">
                  <span className="block font-semibold text-navy">{item.t}</span>
                  <span className="mt-1 block text-sm text-muted">{item.d}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute inset-0">
          <Image
            src="/hero/farm.png"
            alt=""
            fill
            className="object-cover object-center opacity-25"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/90 to-navy/70" />
        </div>
        <div className="container-bs relative grid gap-8 py-12 md:grid-cols-2 md:items-center md:py-16">
          <div>
            <p className="text-sm font-semibold tracking-wide text-forge">บริการ</p>
            <h2 className="mt-1 text-2xl font-bold">บริการพิมพ์ 3D</h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/80">
              รับออกแบบและพิมพ์ชิ้นงาน FDM/SLA ตามไฟล์หรือตามสเปก เลือกสีได้ตามที่มี
              งานพิมพ์ของร้านมีรับประกันตามเงื่อนไข — แจ้งเคลมผ่าน LINE OA
            </p>
            <Link href="/custom-print" className="btn btn-primary mt-6 inline-flex">
              ดูบริการพิมพ์ 3D
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {["/print/jig.png", "/print/part.png", "/print/proto.png"].map((src) => (
              <div key={src} className="relative aspect-[3/4] overflow-hidden rounded-[3px] ring-1 ring-white/10">
                <Image src={src} alt="" fill className="object-cover" sizes="180px" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-steel">
        <div className="container-bs grid gap-8 py-12 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-16">
          <div>
            <p className="text-sm font-semibold text-forge">เครื่องมือในเว็บ</p>
            <h2 className="mt-1 text-2xl font-bold text-navy">ผู้ช่วยงานช่าง</h2>
            <p className="mt-3 text-sm leading-relaxed text-navy/90">
              คำนวณวัสดุหน้างานในเว็บนี้เลย — แอร์ ไฟ กระเบื้อง ก่อฉาบ สี หลังคา และสายอื่น
              กรอกขนาดห้องแล้วได้รายการของที่ต้องซื้อ ไม่ต้องสมัคร ไม่เก็บเงิน
            </p>
            <Link href="/assistant" className="btn btn-primary mt-6 inline-flex">
              <Wrench className="h-4 w-4" aria-hidden />
              เปิดผู้ช่วยงานช่าง
            </Link>
          </div>
          <figure className="relative aspect-[3/2] overflow-hidden rounded-[3px] bg-steel">
            <Image
              src="/assistant/covers/tile.webp"
              alt="ตัวอย่างหน้าผู้ช่วยงานช่าง สำหรับคิดวัสดุกระเบื้อง"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 480px"
            />
          </figure>
        </div>
      </section>

      <section className="container-bs py-12 md:py-16">
        <p className="text-sm font-semibold text-forge">ความเข้ากันได้</p>
        <h2 className="mt-1 text-2xl font-bold text-navy">เข้ากับยี่ห้อไหน</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-navy/90">
          อุปกรณ์ BlackSmith ออกแบบให้เข้ากับ Milwaukee Packout / M12 / M18, Dewalt TStak /
          Toughsystem, Makita, Bosch Pick & Click, Osuka และ Stanley ตามรุ่นที่ระบุ
          เราไม่ใช่ร้านทางการหรือตัวแทนจำหน่ายของยี่ห้อเหล่านั้น
        </p>
        <ul className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {compatBrands.map((brand) => (
            <li key={brand.id}>
              <Link
                href={`/shop/${brand.slug}`}
                className="flex h-20 items-center justify-center rounded-[3px] border border-steel bg-white px-3 hover:border-navy"
              >
                <BrandLogo
                  brand={brand}
                  className={
                    brand.slug === "blacksmith" ? "h-14 w-14" : "h-8 w-full max-w-[96px]"
                  }
                />
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/shop" className="btn btn-secondary mt-6 inline-flex">
          ดูสินค้าตามยี่ห้อ
        </Link>
      </section>

      <section id="buy" className="scroll-mt-24 border-y border-steel bg-[#f7f8f9]">
        <div className="container-bs grid gap-10 py-12 md:grid-cols-2 md:py-16">
          <div>
            <p className="text-sm font-semibold text-forge">ช่องทาง</p>
            <h2 className="mt-1 text-2xl font-bold text-navy">วิธีซื้อและติดต่อ</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">เลือกช่องที่คุ้น แล้วสั่งของแบรนด์เราได้เลย</p>
            <ul className="mt-6 space-y-4">
              <li className="flex items-center gap-3">
                <WebsiteTile href="/shop" />
                <span className="text-sm text-navy">เว็บไซต์นี้ — สั่งตรง ดูบิลและตามพัสดุได้</span>
              </li>
              <li className="flex items-center gap-3">
                <ShopeeTile href={settings.shopeeShopUrl} />
                <a
                  href={settings.shopeeShopUrl}
                  className="text-sm text-navy underline"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                >
                  Shopee: BlackSmith Tools & Supplies
                </a>
              </li>
              <li className="flex items-center gap-3">
                <LazadaTile href={settings.lazadaShopUrl} />
                <a
                  href={settings.lazadaShopUrl}
                  className="text-sm text-navy underline"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                >
                  Lazada: เปิดร้าน
                </a>
              </li>
              {settings.tiktokShopUrl ? (
                <li className="flex items-center gap-3">
                  <TikTokTile href={settings.tiktokShopUrl} />
                  <a
                    href={settings.tiktokShopUrl}
                    className="text-sm text-navy underline"
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    TikTok: @blacksmith_ts
                  </a>
                </li>
              ) : null}
              {settings.facebookUrl ? (
                <li className="flex items-center gap-3">
                  <a
                    href={settings.facebookUrl}
                    className="text-sm text-navy underline"
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    Facebook: BlackSmith Tools & Supplies
                  </a>
                </li>
              ) : null}
              <li className="flex items-center gap-3">
                <LineTile href={settings.lineUrl} />
                <a
                  href={settings.lineUrl}
                  className="text-sm text-navy underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LINE: {settings.lineId}
                </a>
              </li>
            </ul>
            <p className="mt-5 flex items-start gap-2 text-sm text-muted">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-forge" aria-hidden />
              พอยท์สมาชิก: ยอดสั่งซื้อ 25 บาท = 1 พอยท์ สมัครผ่าน LINE ร้าน
            </p>
          </div>
          <aside className="rounded-[3px] border border-steel bg-white p-5">
            <h2 className="flex items-center gap-2 text-xl font-bold text-navy">
              <ShieldCheck className="h-5 w-5 text-forge" aria-hidden />
              รับประกัน
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-navy/90">
              สินค้างาน 3D มีรับประกันตลอดชีพตามเงื่อนไขที่ร้านกำหนด หากมีปัญหา ให้ถ่ายรูปส่งทาง LINE
              ร้านพิจารณาประมาณ 1–2 วัน
            </p>
            <Link href="/warranty" className="mt-4 inline-flex text-sm font-semibold text-forge underline">
              อ่านวิธีเคลม
            </Link>
            <a
              href={settings.lineUrl}
              className="btn btn-primary mt-6 inline-flex w-full"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              แอด LINE {settings.lineId}
            </a>
          </aside>
        </div>
      </section>

      <section id="wholesale" className="scroll-mt-28">
        <div className="container-bs py-12 md:py-16">
          <p className="text-sm font-semibold text-forge">ตัวแทน</p>
          <h2 className="mt-1 text-2xl font-bold text-navy">ขายส่ง — นำสินค้าแบรนด์เราไปขาย</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-navy/90">
            เปิดรับร้านเครื่องมือช่าง เพจ และตัวแทนที่อยากวางขายอุปกรณ์เสริมคนไทย
            ที่เข้ากับ Milwaukee, Dewalt, Makita และยี่ห้ออื่น
          </p>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Store, t: "ใครเหมาะ", d: "ร้านฮาร์ดแวร์, เพจเครื่องมือ, อู่, โรงงาน, ตัวแทนต่างจังหวัด" },
              { icon: Landmark, t: "ได้อะไร", d: "ราคาตัวแทน, รูปสินค้าพร้อมขาย, ซัพพอร์ตรุ่นที่เข้ากันได้" },
              { icon: Wrench, t: "สินค้าหลัก", d: "ที่เก็บแบต/เครื่องมือ, ถาดกล่อง, ท่อเป่าลม, เจลล้างมือ" },
              { icon: ShieldCheck, t: "หลังการขาย", d: "เคลมงาน 3D ตามเงื่อนไขร้าน คุยผ่าน LINE OA" },
            ].map((item) => (
              <li key={item.t} className="flex gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-steel text-forge">
                  <item.icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold text-navy">{item.t}</p>
                  <p className="mt-1 text-sm text-muted">{item.d}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted">
            นี่คือการขายสินค้าแบรนด์ BlackSmith ไม่ใช่การเป็นตัวแทนจำหน่ายเครื่องมือ Milwaukee / Dewalt / Makita
          </p>
          <a
            href={settings.lineUrl}
            className="btn btn-primary mt-6 inline-flex"
            target="_blank"
            rel="noopener noreferrer"
          >
            แอด LINE {settings.lineId}
          </a>
          <WholesaleInquiry lineUrl={settings.lineUrl} lineId={settings.lineId} />
        </div>
      </section>
    </div>
  );
}
