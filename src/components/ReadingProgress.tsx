"use client";

import { useEffect, useState } from "react";

/** Thin bar at the very top of the viewport that fills as the article is read. */
export function ReadingProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => {
      const el = document.querySelector("article.art");
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      setP(total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);
  return <div className="art-progress" style={{ transform: `scaleX(${p})` }} aria-hidden />;
}
