import type { ReactNode } from "react";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { ShopLogo } from "@/components/ShopLogo";
import {
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
  const socials = [
    {
      href: settings.facebookUrl,
      label: "Facebook",
      icon: (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
          <path d="M14.5 8.5V6.8c0-.7.5-1.3 1.2-1.3H17V3h-1.8C12.8 3 11 4.8 11 7.2v1.3H9v2.7h2V21h3.5v-9.8h2.2l.3-2.7h-2.5Z" />
        </svg>
      ),
    },
    {
      href: settings.instagramUrl,
      label: "Instagram",
      icon: (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <rect x="4" y="4" width="16" height="16" rx="4" />
          <circle cx="12" cy="12" r="3.4" />
          <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
    {
      href: settings.youtubeUrl,
      label: "YouTube",
      icon: (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
          <path d="M22 12.2s0-3.2-.4-4.6c-.2-.8-.9-1.5-1.7-1.7C18.4 5.5 12 5.5 12 5.5s-6.4 0-7.9.4c-.8.2-1.5.9-1.7 1.7C2 9 2 12.2 2 12.2s0 3.2.4 4.6c.2.8.9 1.5 1.7 1.7 1.5.4 7.9.4 7.9.4s6.4 0 7.9-.4c.8-.2 1.5-.9 1.7-1.7.4-1.4.4-4.6.4-4.6ZM10 15.2V9.2l5.2 3-5.2 3Z" />
        </svg>
      ),
    },
    {
      href: settings.tiktokSocialUrl,
      label: "TikTok",
      icon: (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
          <path d="M14.6 4c.4 1.5 1.3 2.8 2.5 3.6 1 .7 2.2 1.1 3.4 1.2v2.6c-1.4 0-2.8-.4-4-1.1v7.2A6.5 6.5 0 1 1 9.2 11v2.7a3.8 3.8 0 1 0 2.7 3.6V4h2.7Z" />
        </svg>
      ),
    },
  ].filter((s) => s.href);

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
          </div>
          {socials.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {socials.map((s, i) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  title={s.label}
                  className={
                    i === 0
                      ? "inline-flex h-9 w-9 items-center justify-center rounded-full bg-forge text-white"
                      : "inline-flex h-9 w-9 items-center justify-center rounded-full border border-steel text-navy hover:border-forge hover:text-forge"
                  }
                >
                  {s.icon}
                </a>
              ))}
            </div>
          ) : null}
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
