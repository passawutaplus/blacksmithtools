import Link from "next/link";

export function PageHeader({
  title,
  description,
  crumbs,
}: {
  title: string;
  description?: string;
  crumbs: { href?: string; label: string }[];
}) {
  return (
    <div className="border-b border-steel bg-white" data-reveal>
      <div className="container-bs py-8 md:py-10">
        <nav aria-label="เส้นทาง" className="text-sm text-muted">
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`}>
              {i > 0 ? <span className="mx-2 text-steel">/</span> : null}
              {c.href ? (
                <Link href={c.href} className="hover:text-navy">
                  {c.label}
                </Link>
              ) : (
                <span className="font-medium text-navy">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        <h1 className="mt-3 text-2xl font-bold text-navy md:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{description}</p> : null}
      </div>
    </div>
  );
}

export function SectionHead({
  title,
  href,
  linkLabel = "ดูทั้งหมด",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h2 className="text-2xl font-bold text-navy">{title}</h2>
      {href ? (
        <Link href={href} className="btn btn-secondary btn-sm shrink-0">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}
