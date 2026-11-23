"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin-auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.replace("/admin");
      router.refresh();
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setError(data.error || "เข้าสู่ระบบไม่สำเร็จ");
    setBusy(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4">
      <form onSubmit={submit} className="w-full max-w-sm border-t-4 border-forge bg-white p-6">
        <p className="font-latin text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          BlackSmith · หลังร้าน
        </p>
        <h1 className="mt-1 text-xl">เข้าสู่ระบบ</h1>
        <label htmlFor="pw" className="mt-5 block text-sm font-medium">
          รหัสผ่าน
        </label>
        <input
          id="pw"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 h-11 w-full border border-navy/30 px-3 outline-none focus:border-forge"
        />
        {error ? <p role="alert" className="mt-2 text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-5 h-11 w-full bg-forge font-semibold text-white hover:bg-forge-hover disabled:opacity-50"
        >
          {busy ? "กำลังตรวจสอบ…" : "เข้าสู่ระบบ"}
        </button>
      </form>
    </main>
  );
}
