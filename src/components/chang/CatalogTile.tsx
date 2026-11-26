import Image from "next/image";
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

/**
 * รายการสายงาน/เครื่องมือ — โครง DOM เดียว เปลี่ยนรูปตามจอ
 * มือถือ: แถวกะทัดรัดสูง ~72px (รูปเล็กซ้าย ชื่อ+คำอธิบายขวา) เลื่อนหาได้เร็ว ไม่ต้องไถผ่านรูปใหญ่ทีละใบ
 * จอ sm ขึ้นไป: การ์ดรูป 4:3 เส้นขอบบาง มุม 3px ไม่มีเงา ไม่ยก ไม่ซูม — hover แค่ขอบเข้มขึ้น
 */
export function CatalogList({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <ul
      aria-label={label}
      className="divide-y divide-navy/10 rounded-[3px] border border-navy/15 bg-white sm:grid sm:grid-cols-2 sm:gap-4 sm:divide-y-0 sm:border-0 sm:bg-transparent lg:grid-cols-3"
    >
      {children}
    </ul>
  );
}

export function CatalogTile({
  id,
  href,
  title,
  meta,
  blurb,
  cover,
  icon: Icon,
  badge,
  eager = false,
  highPriority = false,
}: {
  /** anchor ของการ์ด (สารบัญลิงก์มาที่นี่) */
  id?: string;
  href: string;
  title: string;
  meta?: string;
  blurb: string;
  cover?: string;
  icon?: LucideIcon;
  badge?: string;
  /** รูปที่อยู่ในจอแรก: โหลดทันที ไม่ lazy */
  eager?: boolean;
  /** รูปแรกสุดของหน้า (LCP) */
  highPriority?: boolean;
}) {
  return (
    <li id={id} className={`sm:flex${id ? " chang-anchor" : ""}`}>
      <Link
        href={href}
        className="group flex min-h-[72px] w-full items-center gap-3 px-3 py-2 transition-colors hover:bg-[#f7f8f9] sm:block sm:min-h-0 sm:overflow-hidden sm:rounded-[3px] sm:border sm:border-navy/15 sm:bg-white sm:p-0 sm:hover:border-navy sm:hover:bg-white"
      >
        <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-[2px] bg-steel sm:aspect-[4/3] sm:h-auto sm:w-full sm:rounded-none sm:border-b sm:border-navy/15">
          {cover ? (
            <Image
              src={cover}
              alt=""
              fill
              sizes="(min-width: 1024px) 22rem, (min-width: 640px) 50vw, 56px"
              className="object-cover"
              loading={eager ? "eager" : "lazy"}
              fetchPriority={highPriority ? "high" : undefined}
            />
          ) : (
            <span className="flex h-full items-center justify-center text-navy/40">
              {Icon ? <Icon className="h-6 w-6 sm:h-12 sm:w-12" aria-hidden /> : null}
            </span>
          )}
          {badge ? (
            <span className="absolute left-0 top-0 hidden bg-navy px-2.5 py-1 text-xs font-semibold text-white sm:block">
              {badge}
            </span>
          ) : null}
          {Icon && cover ? (
            <span className="absolute right-0 top-0 hidden h-9 w-9 items-center justify-center border-b border-l border-navy/15 bg-white text-navy sm:flex">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
          ) : null}
        </span>
        <span className="block min-w-0 flex-1 sm:p-4">
          <span className="block text-[0.9375rem] font-semibold leading-snug text-navy sm:text-base">{title}</span>
          {meta ? <span className="mt-0.5 hidden text-[0.8125rem] text-navy/70 sm:block">{meta}</span> : null}
          <span className="mt-0.5 line-clamp-2 block text-[0.8125rem] leading-snug text-navy/75 sm:mt-1 sm:text-sm sm:leading-relaxed">
            {/* มือถือ: จำนวนเครื่องมือต่อท้ายบรรทัดเดียวกับคำอธิบาย แถวจะได้ไม่สูงเกิน */}
            {meta ? <span className="font-medium text-navy sm:hidden">{meta} · </span> : null}
            {blurb}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-navy/45 sm:hidden" aria-hidden />
      </Link>
    </li>
  );
}
