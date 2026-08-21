"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { CookieBanner } from "@/components/CookieBanner";
import { ChatFab } from "@/components/ChatFab";
import { ScrollReveal } from "@/components/ScrollReveal";
import type { Brand, Category, SiteSettings } from "@/lib/types";

export function StoreChrome({
  children,
  settings,
  brands,
  categories,
}: {
  children: React.ReactNode;
  settings: SiteSettings;
  brands: Brand[];
  categories: Category[];
}) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader settings={settings} brands={brands} categories={categories} />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <ScrollReveal />
      <SiteFooter settings={settings} />
      <CartDrawer />
      <CookieBanner />
      {pathname.includes("/print") ? null : (
        <ChatFab lineUrl={settings.lineUrl} lineId={settings.lineId} />
      )}
    </>
  );
}
