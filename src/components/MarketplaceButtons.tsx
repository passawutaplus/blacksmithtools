import { LazadaMark, ShopeeMark, TikTokMark } from "@/components/ChannelIcons";

interface Props {
  shopeeUrl?: string | null;
  lazadaUrl?: string | null;
  tiktokUrl?: string | null;
  className?: string;
  stickyMobile?: boolean;
}

export function MarketplaceButtons({
  shopeeUrl,
  lazadaUrl,
  tiktokUrl,
  className = "",
  stickyMobile = false,
}: Props) {
  const links = [
    { href: shopeeUrl, label: "ซื้อบน Shopee", color: "bg-[#EE4D2D] text-white", Icon: ShopeeMark },
    { href: lazadaUrl, label: "ซื้อบน Lazada", color: "bg-[#0F146D] text-white", Icon: LazadaMark },
    { href: tiktokUrl, label: "ซื้อบน TikTok", color: "bg-black text-white", Icon: TikTokMark },
  ].filter((l) => Boolean(l.href));

  if (links.length === 0) return null;

  return (
    <div
      className={`${stickyMobile ? "safe-bottom sticky bottom-0 z-30 border-t border-gray-200 bg-white/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0" : ""} ${className}`}
    >
      <p className="mb-3 text-xs text-muted">หรือสั่งจากร้าน BlackSmith บนแพลตฟอร์มอื่น</p>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href!}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex min-h-10 items-center gap-2 rounded-[2px] border border-navy/15 bg-white px-3 text-xs font-semibold text-navy hover:border-navy"
          >
            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-[2px] ${l.color}`}>
              <l.Icon className="h-3.5 w-3.5" />
            </span>
            {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}