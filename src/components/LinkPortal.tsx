import type { ComponentType, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronRight, ClipboardCheck, Globe, Phone, RotateCcw } from "lucide-react";
import type { Product, SiteSettings } from "@/lib/types";
import { formatTHB } from "@/lib/utils";
import {
  productBuyLinks,
  serviceLinks,
  shopHomeLinks,
  shopMarketLinks,
  shopSupportLinks,
  socialLinks,
  withPortalUtm,
  type PortalChannelId,
  type PortalLink,
  type PortalSlide,
  type ShopChannelLink,
} from "@/lib/portal-links";
import { PortalProductMarquee } from "@/components/PortalProductMarquee";
import { PortalTrackCard } from "@/components/PortalTrackCard";
import {
  ChannelBadge,
  LazadaMark,
  LineMark,
  ShopeeMark,
  ThaiMartMark,
  TikTokMark,
  WebsiteMark,
} from "@/components/ChannelIcons";

const CHANNEL_BADGE: Record<PortalChannelId, { className: string; icon: ComponentType<{ className?: string }> }> = {
  shopee: { className: "bg-[#EE4D2D] text-white", icon: ShopeeMark },
  lazada: { className: "bg-white text-[#0F146D]", icon: LazadaMark },
  thaimart: { className: "bg-[#128C4B] text-white", icon: ThaiMartMark },
  tiktok: { className: "bg-black text-white", icon: TikTokMark },
  line: { className: "bg-[#06C755] text-white", icon: LineMark },
  website: { className: "bg-white text-navy", icon: Globe },
  claim: { className: "bg-forge text-white", icon: ClipboardCheck },
  return: { className: "bg-forge text-white", icon: RotateCcw },
};

function rowClassName() {
  return [
    "flex min-h-14 w-full items-center gap-3 rounded-2xl bg-white px-3 py-2 text-left text-navy",
    "shadow-[0_8px_24px_rgba(0,0,0,0.18)]",
    "transition-[transform,background-color] duration-150 active:scale-[0.99] hover:bg-steel/80",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge",
  ].join(" ");
}

function PortalRow({
  href,
  external,
  label,
  hint,
  badge,
}: {
  href: string;
  external: boolean;
  label: string;
  hint?: string;
  badge: ReactNode;
}) {
  const inner = (
    <>
      {badge}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-tight">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs font-light text-muted">{hint}</span> : null}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
    </>
  );

  const className = rowClassName();
  const targetHref = external ? withPortalUtm(href) : href;

  if (external) {
    return (
      <a href={targetHref} target="_blank" rel="noopener noreferrer nofollow" className={className}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={targetHref} className={className}>
      {inner}
    </Link>
  );
}

function HomeTile({ link }: { link: ShopChannelLink }) {
  const { className, icon: Icon } = CHANNEL_BADGE[link.channel];
  const inner = (
    <>
      <ChannelBadge className={`${className} h-12 w-12 rounded-2xl`}>
        <Icon className={link.channel === "lazada" ? "h-6 w-auto" : "h-6 w-6"} />
      </ChannelBadge>
      <span className="min-w-0 text-sm font-semibold leading-tight text-navy">{link.shortLabel ?? link.label}</span>
    </>
  );
  const href = link.external ? withPortalUtm(link.href) : link.href;
  const cls = [
    "flex w-full min-h-14 items-center justify-center gap-2.5 rounded-2xl bg-white px-3 py-2.5",
    "shadow-[0_8px_24px_rgba(0,0,0,0.18)]",
    "transition-[transform,background-color] duration-150 active:scale-[0.99] hover:bg-steel/80",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge",
  ].join(" ");
  if (link.external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={cls} aria-label={link.label}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} aria-label={link.label}>
      {inner}
    </Link>
  );
}

function ShopTile({ link }: { link: ShopChannelLink }) {
  const { className, icon: Icon } = CHANNEL_BADGE[link.channel];
  const inner = (
    <>
      <ChannelBadge className={`${className} h-14 w-14 rounded-2xl`}>
        <Icon className={link.channel === "lazada" ? "h-7 w-auto" : "h-7 w-7"} />
      </ChannelBadge>
      <span className="text-[12px] font-semibold text-white">{link.shortLabel ?? link.label}</span>
    </>
  );
  const href = link.external ? withPortalUtm(link.href) : link.href;
  const cls = [
    "flex flex-col items-center justify-center gap-2 py-1 text-center",
    "transition-transform duration-150 active:scale-[0.97]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge",
  ].join(" ");
  if (link.external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={cls} aria-label={link.label}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} aria-label={link.label}>
      {inner}
    </Link>
  );
}

function ServiceCard({ link }: { link: PortalLink }) {
  const cls = [
    "relative isolate block overflow-hidden rounded-[1.35rem]",
    "aspect-[16/9] bg-steel",
    "shadow-[0_8px_28px_rgba(0,0,0,0.28)]",
    "transition-transform duration-150 active:scale-[0.99]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge",
  ].join(" ");
  const body = (
    <>
      {link.image ? (
        <Image
          src={link.image}
          alt=""
          fill
          sizes="(max-width: 440px) 100vw, 448px"
          className="object-cover object-center"
        />
      ) : null}
      <span
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/5"
        aria-hidden
      />
      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
        <span className="min-w-0">
          <span className="block text-[17px] font-semibold leading-snug text-white">{link.label}</span>
          {link.hint ? (
            <span className="mt-0.5 block text-sm font-medium leading-relaxed text-white/85">{link.hint}</span>
          ) : null}
        </span>
        <span className="inline-flex min-h-8 shrink-0 items-center gap-0.5 rounded-full bg-white px-3 text-[11px] font-semibold text-navy">
          เปิด
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </span>
    </>
  );
  if (link.external) {
    return (
      <a href={withPortalUtm(link.href)} target="_blank" rel="noopener noreferrer nofollow" className={cls}>
        {body}
      </a>
    );
  }
  return (
    <Link href={link.href} className={cls}>
      {body}
    </Link>
  );
}

function SocialIcon({ id, href, label }: PortalLink) {
  const icon =
    id === "facebook" ? (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M14.5 8.5V6.8c0-.7.5-1.3 1.2-1.3H17V3h-1.8C12.8 3 11 4.8 11 7.2v1.3H9v2.7h2V21h3.5v-9.8h2.2l.3-2.7h-2.5Z" />
      </svg>
    ) : id === "instagram" ? (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <circle cx="12" cy="12" r="3.4" />
        <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    ) : id === "youtube" ? (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M22 12.2s0-3.2-.4-4.6c-.2-.8-.9-1.5-1.7-1.7C18.4 5.5 12 5.5 12 5.5s-6.4 0-7.9.4c-.8.2-1.5.9-1.7 1.7C2 9 2 12.2 2 12.2s0 3.2.4 4.6c.2.8.9 1.5 1.7 1.7 1.5.4 7.9.4 7.9.4s6.4 0 7.9-.4c.8-.2 1.5-.9 1.7-1.7.4-1.4.4-4.6.4-4.6ZM10 15.2V9.2l5.2 3-5.2 3Z" />
      </svg>
    ) : id === "line" ? (
      <LineMark className="h-4 w-4" />
    ) : (
      <TikTokMark className="h-4 w-4" />
    );

  return (
    <a
      href={withPortalUtm(href)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white ring-1 ring-white/20 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge"
    >
      {icon}
    </a>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-white/55">{children}</h2>;
}

export function LinkPortal({
  settings,
  product,
  printSlides = [],
  chemSlides = [],
}: {
  settings: SiteSettings;
  product?: Product | null;
  printSlides?: PortalSlide[];
  chemSlides?: PortalSlide[];
}) {
  const markets = shopMarketLinks(settings);
  const homes = shopHomeLinks(settings);
  const support = shopSupportLinks(settings);
  const services = serviceLinks();
  const socials = socialLinks(settings);
  const productLinks = product ? productBuyLinks(product) : [];

  return (
    <div className="relative min-h-dvh bg-navy text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(194,75,50,0.22),_transparent_52%)]"
        aria-hidden
      />
      <div
        className="relative mx-auto flex min-h-dvh max-w-md flex-col px-4"
        style={{
          paddingTop: "max(1.25rem, env(safe-area-inset-top))",
          paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
        }}
      >
        <header className="flex flex-col items-center pt-4 text-center">
          <Image
            src="/brand/mark.png"
            alt=""
            width={96}
            height={96}
            priority
            className="h-20 w-20 rounded-full bg-white object-contain p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.28)] ring-2 ring-white/15"
          />
          <h1 className="mt-4 text-xl font-semibold leading-tight">{settings.shopName}</h1>
          {settings.tagline ? <p className="mt-1 text-sm font-light text-white/70">{settings.tagline}</p> : null}
        </header>

        {product ? (
          <section className="mt-6 rounded-2xl bg-white/8 p-3 ring-1 ring-white/10">
            <div className="flex gap-3">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white">
                <Image src={product.imageUrl} alt={product.nameTh} fill sizes="80px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-forge">สินค้าที่สแกน</p>
                <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug">{product.nameTh}</p>
                <p className="mt-1 text-sm tabular-nums text-white/80">{formatTHB(product.price)}</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {productLinks.map((link) => (
                <PortalRow
                  key={link.id}
                  href={link.href}
                  external={link.external}
                  label={link.label}
                  badge={
                    <ChannelBadge
                      className={
                        link.id === "p-shopee"
                          ? "bg-[#EE4D2D] text-white"
                          : link.id === "p-lazada"
                            ? "bg-white text-[#0F146D]"
                            : link.id === "p-tiktok"
                              ? "bg-black text-white"
                              : "bg-navy-deep text-white"
                      }
                    >
                      {link.id === "p-shopee" ? (
                        <ShopeeMark className="h-5 w-5" />
                      ) : link.id === "p-lazada" ? (
                        <LazadaMark className="h-5 w-auto" />
                      ) : link.id === "p-tiktok" ? (
                        <TikTokMark className="h-5 w-5" />
                      ) : (
                        <WebsiteMark className="h-5 w-5" />
                      )}
                    </ChannelBadge>
                  }
                />
              ))}
            </div>
          </section>
        ) : null}

        {settings.phone ? (
          <a
            href={`tel:${settings.phone}`}
            className={`${rowClassName()} mt-2`}
          >
            <ChannelBadge className="bg-navy-deep text-white">
              <Phone className="h-5 w-5" aria-hidden />
            </ChannelBadge>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold leading-tight">โทรร้าน</span>
              <span className="mt-0.5 block text-xs font-light text-muted">{settings.phone}</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
          </a>
        ) : null}

        <section className="mt-7">
          <SectionLabel>ซื้อสินค้า</SectionLabel>
          {markets.length > 0 ? (
            <div
              className={`mt-3 grid gap-3 ${
                markets.length === 3 ? "grid-cols-3" : markets.length === 2 ? "grid-cols-2" : "grid-cols-4"
              }`}
            >
              {markets.map((link) => (
                <ShopTile key={link.id} link={link} />
              ))}
            </div>
          ) : null}
          {homes.length > 0 ? (
            <>
              <div className="mt-4 border-t border-white/25" aria-hidden />
              <div className={`mt-4 grid gap-3 ${homes.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
                {homes.map((link) => (
                  <HomeTile key={link.id} link={link} />
                ))}
              </div>
            </>
          ) : null}
        </section>

        <section className="mt-7">
          <PortalTrackCard lineUrl={settings.lineUrl} lineId={settings.lineId} />
          {support.map((link) => {
            const { className, icon: Icon } = CHANNEL_BADGE[link.channel];
            return (
              <a
                key={link.id}
                href={withPortalUtm(link.href)}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className={`${rowClassName()} mt-3`}
                aria-label={link.label}
              >
                <ChannelBadge className={className}>
                  <Icon className="h-5 w-5" aria-hidden />
                </ChannelBadge>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold leading-tight text-forge">{link.label}</span>
                  {link.hint ? <span className="mt-0.5 block text-xs font-medium text-navy/80">{link.hint}</span> : null}
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-forge" aria-hidden />
              </a>
            );
          })}
        </section>

        <PortalProductMarquee printItems={printSlides} chemItems={chemSlides} />

        <section className="mt-7">
          <SectionLabel>บริการ</SectionLabel>
          <div className="mt-2.5 flex flex-col gap-3">
            {services.map((link) => (
              <ServiceCard key={link.id} link={link} />
            ))}
          </div>
        </section>

        {socials.length > 0 ? (
          <section className="mt-7">
            <SectionLabel>ติดตามเรา</SectionLabel>
            <div className="mt-3 flex flex-wrap justify-start gap-2">
              {socials.map((s) => (
                <SocialIcon key={s.id} {...s} />
              ))}
            </div>
          </section>
        ) : null}

        <footer className="mt-auto pt-10 text-center text-[11px] font-light text-white/45">
          <p>สแกนแล้วเลือกช่องทางที่ใช่</p>
          <nav className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1" aria-label="กฎหมาย">
            <Link href="/privacy" className="hover:text-white">
              ความเป็นส่วนตัว
            </Link>
            <Link href="/terms" className="hover:text-white">
              ข้อกำหนด
            </Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
