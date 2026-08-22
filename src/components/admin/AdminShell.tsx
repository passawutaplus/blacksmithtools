"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ClipboardList,
  FileText,
  Handshake,
  ImageIcon,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  X,
} from "lucide-react";
import { adminJson } from "@/lib/admin-client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/admin/orders", label: "ออเดอร์", icon: ClipboardList },
          { href: "/admin/issue", label: "พิมพ์เอกสาร", icon: FileText },
  { href: "/admin/inquiries", label: "ขายส่ง", icon: Handshake },
  { href: "/admin/slips", label: "สลิป", icon: ImageIcon },
  { href: "/admin/products", label: "สินค้า", icon: Package },
  { href: "/admin/settings", label: "ตั้งค่า", icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [shopName, setShopName] = useState("หลังร้าน");
  const [slipCount, setSlipCount] = useState(0);
  const [inquiryCount, setInquiryCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    adminJson<{ shopName: string; slipCount: number; inquiryCount: number }>(
      "/api/admin?resource=session",
    )
      .then((data) => {
        setShopName(data.shopName);
        setSlipCount(data.slipCount);
        setInquiryCount(data.inquiryCount);
      })
      .catch(() => undefined);
  }, [pathname]);

  if (pathname.includes("/print")) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-steel">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/10 bg-navy px-4 text-white lg:hidden">
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded"
          aria-label="เปิดเมนู"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <p className="truncate text-sm font-semibold">หลังร้าน</p>
      </header>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="ปิดเมนู"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy text-white transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-3">
          <img src="/brand/mark.png" alt="" className="h-9 w-9 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-white/50">หลังร้าน</p>
            <p className="truncate text-sm font-semibold">{shopName}</p>
          </div>
          <button
            type="button"
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded lg:hidden"
            aria-label="ปิดเมนู"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const active =
              item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded px-3 py-2.5 text-sm font-medium",
                  active ? "bg-white/15" : "hover:bg-white/10",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="flex-1">{item.label}</span>
                {item.href === "/admin/slips" && slipCount > 0 ? (
                  <span className="rounded-full bg-forge px-2 py-0.5 text-[11px]">{slipCount}</span>
                ) : null}
                {item.href === "/admin/inquiries" && inquiryCount > 0 ? (
                  <span className="rounded-full bg-forge px-2 py-0.5 text-[11px]">{inquiryCount}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <a href="/" className="block rounded px-3 py-2 text-sm text-white/70 hover:bg-white/10">
            ดูหน้าร้าน
          </a>
        </div>
      </aside>

      <div className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 pb-16 md:px-6 md:py-8">{children}</div>
      </div>
    </div>
  );
}
