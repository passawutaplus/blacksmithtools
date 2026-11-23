import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin-auth";

const PUBLIC_ADMIN = ["/admin/login", "/api/admin-auth/login", "/api/admin-auth/logout"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_ADMIN.includes(pathname)) return NextResponse.next();

  if (await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบหลังร้านก่อน" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/admin"],
};
