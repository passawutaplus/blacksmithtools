import type { DetailSection } from "@/lib/parse-product-details";

export function ProductDetailSections({ sections }: { sections: DetailSection[] }) {
  if (sections.length === 0) return null;
  return (
    <div className="mt-4 divide-y divide-steel/80">
      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <section key={`${section.id}-${section.title}`} className="py-4 first:pt-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-navy">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forge/10 text-forge">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              {section.title}
            </h3>
            {section.body ? <p className="mt-3 text-sm leading-7 text-navy/80">{section.body}</p> : null}
            {section.specs?.length ? (
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                {section.specs.map((row) => (
                  <div key={row.label} className="min-w-0">
                    <dt className="text-xs text-muted">{row.label}</dt>
                    <dd className="mt-0.5 text-sm leading-6 text-navy">{row.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {section.items?.length ? (
              section.ordered ? (
                <ol className="mt-3 space-y-2.5">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm leading-6 text-navy/80">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
                        {i + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <ul className="mt-3 space-y-2">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm leading-6 text-navy/80">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-forge" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
