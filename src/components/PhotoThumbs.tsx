"use client";

import { useEffect, useState } from "react";

export function PhotoThumbs({
  images,
  className = "mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3",
  thumbClassName = "h-32 w-full object-cover",
}: {
  images: { src: string; alt?: string }[];
  className?: string;
  thumbClassName?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const current = open != null ? images[open] : null;

  useEffect(() => {
    if (open == null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i == null ? i : (i + 1) % images.length));
      if (e.key === "ArrowLeft") {
        setOpen((i) => (i == null ? i : (i - 1 + images.length) % images.length));
      }
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, images.length]);

  if (images.length === 0) return null;

  return (
    <>
      <ul className={className}>
        {images.map((img, i) => (
          <li key={img.src} className="overflow-hidden rounded-2xl bg-steel">
            <button
              type="button"
              className="block w-full cursor-zoom-in"
              onClick={() => setOpen(i)}
              aria-label="ดูภาพใหญ่"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt={img.alt ?? "ภาพพัสดุจากร้าน"} className={thumbClassName} />
            </button>
          </li>
        ))}
      </ul>
      {current ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="ภาพขยาย"
          onClick={() => setOpen(null)}
        >
          <div className="relative max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.src}
              alt={current.alt ?? "ภาพพัสดุจากร้าน"}
              className="max-h-[88vh] max-w-[min(96vw,1100px)] rounded-lg object-contain"
            />
            <button
              type="button"
              className="btn btn-secondary absolute right-0 top-0 translate-x-2 -translate-y-2 bg-white"
              onClick={() => setOpen(null)}
            >
              ปิด
            </button>
            {images.length > 1 ? (
              <div className="mt-3 flex justify-center gap-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm bg-white"
                  onClick={() => setOpen((i) => (i == null ? 0 : (i - 1 + images.length) % images.length))}
                >
                  ก่อนหน้า
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm bg-white"
                  onClick={() => setOpen((i) => (i == null ? 0 : (i + 1) % images.length))}
                >
                  ถัดไป
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
