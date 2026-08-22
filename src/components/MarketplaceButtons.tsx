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
      <div className="flex flex-wrap gap-3">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href!}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className={`btn text-sm ${l.color}`}
          >
            <l.Icon className="h-4 w-4" />
            {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}