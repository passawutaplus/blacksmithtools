import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  adminPassword,
  createAdminToken,
  passwordMatches,
} from "@/lib/admin-auth";

const fails = new Map<string, { n: number; until: number }>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const f = fails.get(ip);
  if (f && f.n >= 5 && f.until > Date.now()) {
    return NextResponse.json({ error: "ลองผิดหลายครั้ง รอ 10 นาทีแล้วลองใหม่" }, { status: 429 });
  }
  if (!adminPassword()) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้ง ADMIN_PASSWORD บนเซิร์ฟเวอร์" }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  if (!(await passwordMatches(String(body.password ?? "")))) {
    fails.set(ip, { n: (f?.n ?? 0) + 1, until: Date.now() + 10 * 60_000 });
    return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }
  fails.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await createAdminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return res;
}
