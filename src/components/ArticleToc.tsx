"use client";

import { useEffect, useState } from "react";

type Item = { id: string; title: string };

/** Opens a collapsed section (if any), then scrolls to it. */
function goTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el instanceof HTMLDetailsElement) el.open = true;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
}

function setAll(open: boolean) {
  document.querySelectorAll<HTMLDetailsElement>("details.art-sec").forEach((d) => (d.open = open));
}

/** Table of contents with scroll-spy + expand/collapse all. `compact` = the mobile dropdown version. */
export function ArticleToc({ items, compact = false }: { items: Item[]; compact?: boolean }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    els.forEach((e) => io.observe(e));
    // open the section named in the URL hash on first load
    const h = decodeURIComponent(location.hash.slice(1));
    if (h) goTo(h);
    return () => io.disconnect();
  }, [items]);

  const list = (
    <ol className="art-toc-list">
      {items.map((it, i) => (
        <li key={it.id}>
          <a
            href={`#${it.id}`}
            aria-current={active === it.id ? "true" : undefined}
            onClick={(e) => {
              e.preventDefault();
              goTo(it.id);
              const d = (e.currentTarget as HTMLElement).closest("details.art-toc-m");
              if (d instanceof HTMLDetailsElement) d.open = false;
            }}
          >
            <span className="num">{String(i + 1).padStart(2, "0")}</span>
            <span>{it.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  const controls = (
    <div className="art-toc-ctl">
      <button type="button" onClick={() => setAll(true)}>
        กางทั้งหมด
      </button>
      <span aria-hidden>·</span>
      <button type="button" onClick={() => setAll(false)}>
        หุบทั้งหมด
      </button>
    </div>
  );

  if (compact) {
    return (
      <details className="art-toc-m">
        <summary>
          <span>สารบัญ</span>
          <span className="num text-muted">{items.length} หัวข้อ</span>
        </summary>
        {list}
        {controls}
      </details>
    );
  }
  return (
    <nav aria-label="สารบัญ" className="art-toc">
      <p className="art-toc-h">สารบัญ</p>
      {list}
      {controls}
    </nav>
  );
}
