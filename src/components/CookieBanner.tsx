"use client";

import { useEffect, useState } from "react";

type Consent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

const KEY = "bs-cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function save(consent: Consent) {
    localStorage.setItem(KEY, JSON.stringify(consent));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="safe-bottom fixed inset-x-3 bottom-3 z-50 rounded-[3px] border border-navy/15 bg-white p-3 md:p-4 md:inset-x-0 md:bottom-0 md:rounded-none">
      <div className="container-bs flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl text-sm text-navy">
          <p className="font-semibold">คุกกี้และความเป็นส่วนตัว</p>
          <p className="mt-1 text-xs text-muted md:text-sm">
            เราใช้คุกกี้ที่จำเป็นต่อการทำงานของร้าน และขออนุญาตก่อนใช้คุกกี้วิเคราะห์/การตลาด ตาม PDPA{" "}
            <a href="/cookies" className="underline">
              นโยบายคุกกี้
            </a>
          </p>
          {customize ? (
            <div className="mt-3 space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked disabled /> จำเป็น (เปิดเสมอ)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                />{" "}
                วิเคราะห์การใช้งาน
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                />{" "}
                การตลาด
              </label>
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
          <button
            type="button"
            className="col-span-2 justify-self-start text-xs font-semibold text-navy underline underline-offset-2 md:order-first md:mr-2 md:text-sm"
            onClick={() => setCustomize((v) => !v)}
          >
            {customize ? "ซ่อนตัวเลือก" : "ปรับแต่งคุกกี้"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => save({ necessary: true, analytics: false, marketing: false })}
          >
            ยอมรับที่จำเป็น
          </button>
          {customize ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => save({ necessary: true, analytics, marketing })}
            >
              บันทึก
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => save({ necessary: true, analytics: true, marketing: true })}
            >
              ยอมรับทั้งหมด
            </button>
          )}
        </div>
      </div>
    </div>
  );
}