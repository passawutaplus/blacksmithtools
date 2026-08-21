import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

function Tile({
  href,
  label,
  external,
  className,
  children,
}: {
  href: string;
  label: string;
  external?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const cls = cn(
    "group relative inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-[14px]",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] ring-1 ring-white/10",
    "transition-[transform,filter,box-shadow] duration-200",
    "hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_8px_20px_rgba(0,0,0,0.35)]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge",
    className,
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow" aria-label={label} title={label} className={cls}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} aria-label={label} title={label} className={cls}>
      {children}
    </Link>
  );
}

export function ShopeeTile({ href }: { href: string }) {
  return (
    <Tile href={href} label="Shopee" external className="bg-[#EE4D2D]">
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#fff" aria-hidden>
        <path d="M15.9414 17.9633c.229-1.879-.981-3.077-4.1758-4.0969-1.548-.528-2.277-1.22-2.26-2.1719.065-1.056 1.048-1.825 2.352-1.85a5.2898 5.2898 0 0 1 2.8838.89c.116.072.197.06.263-.039.09-.145.315-.494.39-.62.051-.081.061-.187-.068-.281-.185-.1369-.704-.4149-.983-.5319a6.4697 6.4697 0 0 0-2.5118-.514c-1.909.008-3.4129 1.215-3.5389 2.826-.082 1.1629.494 2.1078 1.73 2.8278.262.152 1.6799.716 2.2438.892 1.774.552 2.695 1.5419 2.478 2.6969-.197 1.047-1.299 1.7239-2.818 1.7439-1.2039-.046-2.2878-.537-3.1278-1.19l-.141-.11c-.104-.08-.218-.075-.287.03-.05.077-.376.547-.458.67-.077.108-.035.168.045.234.35.293.817.613 1.134.775a6.7097 6.7097 0 0 0 2.8289.727 4.9048 4.9048 0 0 0 2.0759-.354c1.095-.465 1.8029-1.394 1.9449-2.554zM11.9986 1.4009c-2.068 0-3.7539 1.95-3.8329 4.3899h7.6657c-.08-2.44-1.765-4.3899-3.8328-4.3899zm7.8516 22.5981-.08.001-15.7843-.002c-1.074-.04-1.863-.91-1.971-1.991l-.01-.195L1.298 6.2858a.459.459 0 0 1 .45-.494h4.9748C6.8448 2.568 9.1607 0 11.9996 0c2.8388 0 5.1537 2.5689 5.2757 5.7898h4.9678a.459.459 0 0 1 .458.483l-.773 15.5883-.007.131c-.094 1.094-.979 1.9769-2.0709 2.0059z" />
      </svg>
    </Tile>
  );
}

export function LazadaTile({ href }: { href: string }) {
  return (
    <Tile href={href} label="Lazada" external className="bg-white">
      <Image src="/channels/lazada.png" alt="" width={30} height={24} className="h-6 w-auto" />
    </Tile>
  );
}

export function LineTile({ href }: { href: string }) {
  return (
    <Tile href={href} label="LINE" external className="bg-[#06C755]">
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#fff" aria-hidden>
        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
      </svg>
    </Tile>
  );
}

export function TikTokTile({ href }: { href: string }) {
  return (
    <Tile href={href} label="TikTok Shop" external className="bg-black">
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#fff" aria-hidden>
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    </Tile>
  );
}

export function WebsiteTile({ href }: { href: string }) {
  return (
    <Tile href={href} label="เว็บไซต์นี้" className="bg-white text-[#0c1014]">
      <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden>
        <path
          fill="currentColor"
          d="M24 10.5 38 16v16L24 37.5 10 32V16L24 10.5Zm0 3.2L14 17.4v13.2l10 4.1 10-4.1V17.4L24 13.7Zm0 4.3 7 2.8v8.4l-7 2.9-7-2.9v-8.4l7-2.8Z"
        />
      </svg>
    </Tile>
  );
}

export function SocialDot({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/55 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge"
    >
      {children}
    </a>
  );
}
