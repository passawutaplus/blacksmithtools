"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  Menu,
  Search,
  ShoppingCart,
  X,
  ChevronDown,
  PackageSearch,
} from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { BrandLogo } from "@/components/BrandLogo";
import { ShopLogo } from "@/components/ShopLogo";
import { cn } from "@/lib/utils";
import { storefrontCategories } from "@/lib/collections";
import type { Brand, Category, SiteSettings } from "@/lib/types";

type MenuKey = "products" | "brands" | null;

function navLink(active: boolean) {
  return `inline-flex items-center gap-1 rounded px-3 py-2 text-sm text-white hover:bg-white/10 ${
    active ? "font-bold" : "font-light"
  }`;
}

export function SiteHeader({
  settings,
  brands,
  categories,
}: {
  settings: SiteSettings;
  brands: Brand[];
  categories: Category[];
}) {
  const pathname = usePathname();
  const navCategories = storefrontCategories(categories);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [mounted, setMounted] = useState(false);
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [mobileSection, setMobileSection] = useState<MenuKey>(null);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const productsId = useId();
  const brandsId = useId();
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const setOpen = useCartStore((s) => s.setOpen);

  useEffect(() => setMounted(true), []);

  const home = pathname === "/";

  useEffect(() => {
    if (!home) {
      setScrolled(false);
      return;
    }
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [home]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!navRef.current?.contains(e.target as Node)) setOpenMenu(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function toggleMenu(key: MenuKey) {
    setOpenMenu((current) => (current === key ? null : key));
  }

  function closeAll() {
    setOpenMenu(null);
    setMobileOpen(false);
    setMobileSection(null);
  }

  const shopActive = pathname === "/shop" || pathname.startsWith("/product/");
  const brandActive = pathname.startsWith("/shop/");
  const overHero = home && !scrolled && !mobileOpen && !searchOpen;
  const iconBtn = overHero
    ? "inline-flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/10"
    : "inline-flex h-11 w-11 items-center justify-center rounded-full text-navy hover:bg-steel";

  return (
    <header
      className={cn(
        "no-print z-40",
        home ? "fixed inset-x-0 top-0" : "sticky top-0",
        overHero ? "text-white" : "text-navy",
        home && scrolled ? "shadow-md backdrop-blur-md" : "",
      )}
    >
      <a href="#main" className="skip-link">
        ข้ามไปยังเนื้อหา
      </a>

      <div
        className={cn(
          "border-b transition-colors",
          overHero ? "border-transparent bg-transparent" : "border-steel bg-white",
        )}
      >
        <div className="container-bs flex h-16 items-center gap-3 md:h-[4.25rem] md:gap-6">
          <button
            type="button"
            className={cn(iconBtn, "lg:hidden")}
            aria-label="เปิดเมนู"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <Link href="/" className="shrink-0" aria-label="BlackSmith หน้าแรก">
            <ShopLogo variant="header" tagline={settings.tagline} light={overHero} />
          </Link>

          <form action="/shop" className="hidden min-w-0 flex-1 lg:block" role="search">
            <label className="sr-only" htmlFor="q-desktop">
              ค้นหา
            </label>
            <div
              className={cn(
                "mx-auto flex max-w-xl overflow-hidden rounded-full border",
                overHero ? "border-white/30 bg-white/10" : "border-gray-200 bg-white",
              )}
            >
              <span className={cn("flex items-center pl-3", overHero ? "text-white/70" : "text-muted")}>
                <Search className="h-4 w-4" aria-hidden />
              </span>
              <input
                id="q-desktop"
                name="q"
                placeholder="ค้นหา เช่น M18, TStak, ที่เก็บแบต"
                className={cn(
                  "h-11 min-w-0 flex-1 border-0 bg-transparent px-3 outline-none",
                  overHero ? "text-white placeholder:text-white/55" : "text-navy",
                )}
              />
              <button type="submit" className="btn btn-primary h-11 shrink-0 rounded-none px-5">
                ค้นหา
              </button>
            </div>
          </form>

          <div className={cn("ml-auto flex items-center gap-1 md:gap-2", overHero ? "text-white" : "text-navy")}>
            <button
              type="button"
              className={cn(iconBtn, "lg:hidden")}
              aria-label="ค้นหา"
              onClick={() => setSearchOpen((v) => !v)}
            >
              <Search className="h-5 w-5" />
            </button>
            {settings.lineUrl ? (
              <a
                href={settings.lineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={iconBtn}
                aria-label={`LINE ${settings.lineId || "ร้าน"}`}
                title={settings.lineId || "LINE"}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.939 24 12.718 24 10.314"
                  />
                </svg>
              </a>
            ) : null}
            <Link
              href="/track"
              className={cn(iconBtn, "hidden sm:inline-flex")}
              aria-label="ตามออเดอร์"
            >
              <PackageSearch className="h-5 w-5" />
            </Link>
            <button
              type="button"
              className={cn(iconBtn, "relative")}
              aria-label="ตะกร้า"
              onClick={() => setOpen(true)}
            >
              <ShoppingCart className="h-5 w-5" />
              {mounted && count > 0 ? (
                <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-forge px-1 text-[11px] font-bold text-white">
                  {count}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {searchOpen ? (
          <div className={cn("px-4 py-3 lg:hidden", overHero ? "border-t border-white/20" : "border-t border-steel")}>
            <form action="/shop" className="flex gap-2">
              <input
                name="q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหาสินค้า"
                className="input text-navy"
              />
              <button type="submit" className="btn btn-primary shrink-0">
                ค้นหา
              </button>
            </form>
          </div>
        ) : null}
      </div>

      <div className={cn(overHero ? "bg-transparent" : "bg-navy text-white")}>
        <div className="container-bs hidden h-11 items-center lg:flex">
          <nav ref={navRef} className="flex flex-1 items-center justify-center gap-1" aria-label="เมนูหลัก">
            <div className="relative">
              <button
                type="button"
                className={navLink(shopActive || openMenu === "products")}
                aria-expanded={openMenu === "products"}
                aria-controls={productsId}
                aria-haspopup="true"
                onClick={() => toggleMenu("products")}
              >
                สินค้า <ChevronDown className="h-4 w-4" />
              </button>
              {openMenu === "products" ? (
                <div id={productsId} className="absolute left-0 top-full z-50 min-w-[260px] pt-1">
                  <div className="rounded-3xl border border-gray-200 bg-white p-3 text-navy shadow-[0_8px_30px_rgba(35,50,61,0.12)]">
                    <Link
                      href="/shop"
                      className="block rounded px-2 py-2 text-sm font-semibold hover:bg-steel"
                      onClick={closeAll}
                    >
                      ดูสินค้าทั้งหมด
                    </Link>
                    <p className="mt-2 mb-1 px-2 text-xs font-semibold text-muted">หมวดย่อย</p>
                    {navCategories.map((c) => (
                      <Link
                        key={c.id}
                        href={`/shop?category=${c.slug}`}
                        className="block rounded px-2 py-2 text-sm hover:bg-steel"
                        onClick={closeAll}
                      >
                        {c.nameTh}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                className={navLink(brandActive || openMenu === "brands")}
                aria-expanded={openMenu === "brands"}
                aria-controls={brandsId}
                aria-haspopup="true"
                onClick={() => toggleMenu("brands")}
              >
                แบรนด์ <ChevronDown className="h-4 w-4" />
              </button>
              {openMenu === "brands" ? (
                <div id={brandsId} className="absolute left-0 top-full z-50 w-[420px] max-w-[90vw] pt-1">
                  <div className="rounded-3xl border border-gray-200 bg-white p-3 text-navy shadow-[0_8px_30px_rgba(35,50,61,0.12)]">
                    <p className="mb-2 px-1 text-xs font-semibold text-muted">เลือกสินค้าตามยี่ห้อที่เข้ากันได้</p>
                    <div className="grid grid-cols-2 gap-2">
                      {brands.map((b) => (
                        <Link
                          key={b.id}
                          href={`/shop/${b.slug}`}
                          className="card flex min-h-[4.75rem] min-w-0 flex-col items-center justify-center gap-1 overflow-hidden px-3 py-2.5 hover:ring-1 hover:ring-navy/20"
                          onClick={closeAll}
                        >
                          <span className="flex h-11 w-full items-center justify-center overflow-hidden">
                            <BrandLogo
                              brand={b}
                              decorative
                              className={
                                b.slug === "blacksmith"
                                  ? "h-11 w-11"
                                  : "h-7 w-auto max-h-7 max-w-full"
                              }
                            />
                          </span>
                          <span className="w-full truncate text-center text-[11px] text-muted">{b.name}</span>
                        </Link>
                      ))}
                    </div>
                    <p className="mt-2 px-1 text-[11px] leading-snug text-muted">
                      อุปกรณ์เสริม BlackSmith ที่เข้ากับระบบเหล่านี้ — ไม่ใช่ร้านทางการของยี่ห้อ
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <Link href="/custom-print" className={navLink(pathname.startsWith("/custom-print"))}>
              พิมพ์ 3D
            </Link>
            <Link href="/assistant" className={navLink(pathname.startsWith("/assistant"))}>
              ผู้ช่วยงานช่าง
            </Link>
            <Link href="/about" className={navLink(pathname.startsWith("/about"))}>
              เกี่ยวกับเรา
            </Link>
          </nav>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-navy text-white lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <ShopLogo variant="hero" className="h-10 w-10" />
            <button
              type="button"
              aria-label="ปิดเมนู"
              className="inline-flex h-11 w-11 items-center justify-center"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="max-h-[calc(100vh-3.5rem)] overflow-y-auto px-4 pb-8">
            <button
              type="button"
              className={`flex w-full items-center justify-between border-b border-white/10 py-3 ${shopActive || mobileSection === "products" ? "font-bold" : "font-light"}`}
              aria-expanded={mobileSection === "products"}
              onClick={() => setMobileSection((s) => (s === "products" ? null : "products"))}
            >
              สินค้า
              <ChevronDown className={`h-4 w-4 transition ${mobileSection === "products" ? "rotate-180" : ""}`} />
            </button>
            {mobileSection === "products" ? (
              <div className="border-b border-white/10 pb-2 pl-3">
                <Link href="/shop" className="block py-2.5 font-light" onClick={closeAll}>
                  ดูสินค้าทั้งหมด
                </Link>
                {navCategories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/shop?category=${c.slug}`}
                    className="block py-2.5 text-white/90"
                    onClick={closeAll}
                  >
                    {c.nameTh}
                  </Link>
                ))}
              </div>
            ) : null}

            <button
              type="button"
              className={`flex w-full items-center justify-between border-b border-white/10 py-3 ${brandActive || mobileSection === "brands" ? "font-bold" : "font-light"}`}
              aria-expanded={mobileSection === "brands"}
              onClick={() => setMobileSection((s) => (s === "brands" ? null : "brands"))}
            >
              แบรนด์
              <ChevronDown className={`h-4 w-4 transition ${mobileSection === "brands" ? "rotate-180" : ""}`} />
            </button>
            {mobileSection === "brands" ? (
              <div className="grid grid-cols-2 gap-2 border-b border-white/10 py-3">
                {brands.map((b) => (
                  <Link
                    key={b.id}
                    href={`/shop/${b.slug}`}
                    className="flex min-h-[4.5rem] min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl bg-white px-2 py-2.5"
                    onClick={closeAll}
                  >
                    <span className="flex h-11 w-full items-center justify-center overflow-hidden">
                      <BrandLogo
                        brand={b}
                        decorative
                        className={
                          b.slug === "blacksmith" ? "h-11 w-11" : "h-6 w-auto max-h-6 max-w-full"
                        }
                      />
                    </span>
                    <span className="w-full truncate text-center text-[11px] text-navy/70">{b.name}</span>
                  </Link>
                ))}
              </div>
            ) : null}

            <Link
              href="/custom-print"
              className={`block border-b border-white/10 py-3 ${pathname.startsWith("/custom-print") ? "font-bold" : "font-light"}`}
              onClick={closeAll}
            >
              พิมพ์ 3D
            </Link>
            <Link
              href="/assistant"
              className={`block border-b border-white/10 py-3 ${pathname.startsWith("/assistant") ? "font-bold" : "font-light"}`}
              onClick={closeAll}
            >
              ผู้ช่วยงานช่าง
            </Link>
            <Link
              href="/about"
              className={`block border-b border-white/10 py-3 ${pathname.startsWith("/about") ? "font-bold" : "font-light"}`}
              onClick={closeAll}
            >
              เกี่ยวกับเรา
            </Link>
            <Link href="/contact" className="block py-3 font-light" onClick={closeAll}>
              ติดต่อเรา
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
