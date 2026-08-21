"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

function collectTargets() {
  const nodes = [
    ...document.querySelectorAll<HTMLElement>("#main section, #main [data-reveal], footer"),
  ];
  return nodes.filter((el) => !nodes.some((other) => other !== el && other.contains(el)));
}

export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      },
      { threshold: 0, rootMargin: "0px 0px -40px 0px" },
    );

    const targets = collectTargets();
    for (const el of targets) {
      const fadeOnly = el.classList.contains("isolate") || el.classList.contains("min-h-dvh");
      el.classList.add(fadeOnly ? "reveal-fade" : "reveal");

      const grids = [...el.querySelectorAll<HTMLElement>(":scope .grid")];
      const cardGrid = grids.find((grid) => {
        const count = grid.children.length;
        return count >= 3 && count <= 12;
      });
      if (!fadeOnly && cardGrid) cardGrid.classList.add("reveal-stagger");

      if (!fadeOnly && el.offsetHeight > window.innerHeight) {
        el.classList.add("is-in");
        continue;
      }
      io.observe(el);
    }

    return () => io.disconnect();
  }, [pathname]);

  return null;
}
