import type { ReactNode } from "react";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { ShopLogo } from "@/components/ShopLogo";
import {
  FacebookTile,
  InstagramTile,
  YouTubeTile,
  LazadaTile,
  LineTile,
  ShopeeTile,
  ThaiMartTile,
  TikTokTile,
  WebsiteTile,
} from "@/components/ChannelIcons";
import type { SiteSettings } from "@/lib/types";

const SERVICES = [
  { href: "/shop", label: "ดูสินค้าทั้งหมด" },
  { href: "/custom-print", label: "บริการพิมพ์ 3D" },
  { href: "/assistant", label: "ผู้ช่วยงานช่าง" },
  { href: "/tools-lab", label: "Tools ลับ ฉบับย่อ" },
  { href: "/shop?category=battery-mount", label: "ที่เก็บแบต" },
  { href: "/shop?category=blower-nozzle", label: "ท่อเป่าลม" },
] as const;

const COMPANY = [
  { href: "/about", label: "เกี่ยวกับเรา" },
  { href: "/track", label: "ตามพัสดุ" },
  { href: "/warranty", label: "รับประกัน / เคลม" },
  { href: "/contact", label: "ติดต่อเรา" },
  { href: "/about#wholesale", label: "ขายส่ง" },
] as const;

const LEGAL = [
  { href: "/privacy", label: "ความเป็นส่วนตัว" },
  { href: "/terms", label: "ข้อกำหนด" },
  { href: "/cookies", label: "คุกกี้" },
  { href: "/pdpa", label: "PDPA" },
] as const;

function Col({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="lg:col-span-2">
      <h2 className="text-sm font-bold text-navy">{title}</h2>
      {children}
    </div>
  );
}

function ListLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-muted transition-colors hover:text-forge">
        {children}
      </Link>
    </li>
  );
}

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const year = new Date().getFullYear();
  const address =
    settings.address && !settings.address.includes("แก้ไขในหลังร้าน") ? settings.address : "";

  return (
    <footer className="no-print mt-16 border-t border-steel bg-white" data-reveal>
      <div className="container-bs grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8 lg:py-14">
        <div className="sm:col-span-2 lg:col-span-4">
          <Link
            href="/"
            className="inline-block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forge"
          >
            <ShopLogo variant="header" className="h-12 w-auto" />
          </Link>
          {settings.tagline ? (
            <p className="mt-2 text-sm font-semibold text-forge">{settings.tagline}</p>
          ) : null}
          <h2 className="mt-6 text-sm font-bold text-navy">เกี่ยวกับเรา</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
            {settings.shopName} ออกแบบและผลิตอุปกรณ์เสริมเครื่องมือช่างในไทย
            ให้เข้ากับ Milwaukee, Dewalt, Makita และยี่ห้ออื่น — พร้อมพิมพ์ 3D ตามสั่ง
          </p>
        </div>

        <Col title="บริการ">
          <ul className="mt-4 list-disc space-y-2.5 pl-4 marker:text-forge">
            {SERVICES.map((item) => (
              <ListLink key={item.href} href={item.href}>
                {item.label}
              </ListLink>
            ))}
          </ul>
        </Col>

        <Col title="ร้าน">
          <ul className="mt-4 list-disc space-y-2.5 pl-4 marker:text-forge">
            {COMPANY.map((item) => (
              <ListLink key={item.href} href={item.href}>
                {item.label}
              </ListLink>
            ))}
          </ul>
        </Col>

        <Col title="ติดต่อเรา">
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            {settings.phone ? (
              <li className="flex gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-forge" aria-hidden />
                <span>
                  โทร:{" "}
                  <a href={`tel:${settings.phone}`} className="hover:text-forge">
                    {settings.phone}
                  </a>
                </span>
              </li>
            ) : null}
            {settings.email ? (
              <li className="flex gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-forge" aria-hidden />
                <span>
                  อีเมล:{" "}
                  <a href={`mailto:${settings.email}`} className="hover:text-forge">
                    {settings.email}
                  </a>
                </span>
              </li>
            ) : null}
            {settings.lineUrl ? (
              <li>
                LINE:{" "}
                <a href={settings.lineUrl} target="_blank" rel="noopener noreferrer" className="hover:text-forge">
                  {settings.lineId}
                </a>
              </li>
            ) : null}
            {address ? (
              <li className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-forge" aria-hidden />
                {address}
              </li>
            ) : null}
          </ul>
        </Col>

        <Col title="ติดตามเรา">
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <WebsiteTile href="/" />
            {settings.shopeeShopUrl ? <ShopeeTile href={settings.shopeeShopUrl} /> : null}
            {settings.lazadaShopUrl ? <LazadaTile href={settings.lazadaShopUrl} /> : null}
            {settings.thaiMartShopUrl ? <ThaiMartTile href={settings.thaiMartShopUrl} /> : null}
            {settings.tiktokShopUrl ? <TikTokTile href={settings.tiktokShopUrl} /> : null}
            {settings.lineUrl ? <LineTile href={settings.lineUrl} /> : null}
            {settings.facebookUrl ? <FacebookTile href={settings.facebookUrl} /> : null}
            {settings.instagramUrl ? <InstagramTile href={settings.instagramUrl} /> : null}
            {settings.youtubeUrl ? <YouTubeTile href={settings.youtubeUrl} /> : null}
            {settings.tiktokSocialUrl && settings.tiktokSocialUrl !== settings.tiktokShopUrl ? <TikTokTile href={settings.tiktokSocialUrl} label="TikTok" /> : null}
          </div>
        </Col>
      </div>

      <div className="bg-navy text-white">
        <div className="container-bs flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <nav aria-label="กฎหมาย" className="flex flex-wrap items-center gap-x-0 text-[12px] font-light text-white/80">
            {LEGAL.map((item, i) => (
              <span key={item.href} className="inline-flex items-center">
                {i > 0 ? <span className="mx-2 text-white/30" aria-hidden>|</span> : null}
                <Link href={item.href} className="hover:text-white">
                  {item.label}
                </Link>
              </span>
            ))}
          </nav>
          <p className="text-[12px] font-light text-white/55">© {year} {settings.shopName}</p>
        </div>
      </div>
    </footer>
  );
}
