import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronDown, Clock, ListOrdered } from "lucide-react";
import { PILLAR_LABEL, extractFaq, getArticle, listArticles, plainText, readingMinutes, renderMarkdown, splitFaq, splitSections } from "@/lib/articles";
import { ArticleToc } from "@/components/ArticleToc";
import { ReadingProgress } from "@/components/ReadingProgress";
import { jsonLd } from "@/lib/json-ld";
import { OG_BASE } from "@/lib/seo";

export async function generateStaticParams() {
  return (await listArticles()).map((a) => ({ slug: a.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = await getArticle((await params).slug);
  if (!a) return { title: "ไม่พบบทความ" };
  return {
    title: a.title,
    description: a.description,
    alternates: { canonical: `/tools-lab/${a.slug}` },
    ...(a.keywords.length ? { keywords: a.keywords } : {}),
    robots: a.draft ? { index: false, follow: false } : undefined,
    openGraph: {
      ...OG_BASE,
      type: "article",
      title: a.title,
      description: a.description,
      publishedTime: a.date,
      ...(a.updated ? { modifiedTime: a.updated } : {}),
      ...(a.cover ? { images: [{ url: a.cover, width: 1080, height: 1080, alt: a.coverAlt ?? a.title }] } : {}),
    },
    twitter: { card: a.cover ? "summary_large_image" : "summary", title: a.title, description: a.description },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = await getArticle((await params).slug);
  if (!a) notFound();
  const related = (await listArticles()).filter((r) => r.slug !== a.slug).slice(0, 3);
  const faq = extractFaq(a.body);
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: a.title,
      description: a.description,
      datePublished: a.date,
      dateModified: a.updated ?? a.date,
      inLanguage: "th",
      ...(a.keywords.length ? { keywords: a.keywords.join(", ") } : {}),
      ...(a.cover ? { image: `${base}${a.cover}` } : {}),
      author: { "@type": "Organization", name: "BlackSmith Tools" },
      publisher: { "@type": "Organization", name: "BlackSmith Tools", logo: `${base}/brand/logo.png` },
      mainEntityOfPage: `${base}/tools-lab/${a.slug}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "หน้าแรก", item: `${base}/` },
        { "@type": "ListItem", position: 2, name: "Tools ลับ ฉบับย่อ", item: `${base}/tools-lab` },
        { "@type": "ListItem", position: 3, name: a.title, item: `${base}/tools-lab/${a.slug}` },
      ],
    },
    ...(faq.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]
      : []),
  ];

  const { intro, sections } = splitSections(a.body);
  const toc = sections.map((x) => ({ id: x.id, title: plainText(x.title) }));
  const mins = readingMinutes(a.body);

  return (
    <article className="art pb-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <ReadingProgress />
      <header className="art-hero">
        <div className="container-bs art-wrap grid gap-8 py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,400px)] md:items-center md:py-12">
          <div>
            <nav className="text-xs text-white/60">
              <Link href="/tools-lab" className="hover:text-white hover:underline">
                Tools ลับ ฉบับย่อ
              </Link>
              <span className="px-1.5">/</span>
              <span className="text-forge-light">{PILLAR_LABEL[a.pillar]}</span>
            </nav>
            {a.draft ? (
              <p className="mt-3 inline-block bg-forge px-2 py-1 text-xs font-semibold text-white">ฉบับร่าง — ยังไม่แสดงบนเว็บจริง</p>
            ) : null}
            <h1 className="mt-4 text-3xl font-bold leading-tight text-white md:text-[2.6rem] md:leading-[1.2]">{a.title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">{a.description}</p>
            <ul className="art-meta mt-6">
              <li>
                <CalendarDays className="h-4 w-4" aria-hidden />
                <span className="num">{a.updated ?? a.date}</span>
              </li>
              <li>
                <Clock className="h-4 w-4" aria-hidden />
                <span>อ่าน {mins} นาที</span>
              </li>
              <li>
                <ListOrdered className="h-4 w-4" aria-hidden />
                <span>{sections.length} หัวข้อ</span>
              </li>
            </ul>
          </div>
          {a.cover ? (
            <div className="relative aspect-square w-full max-w-[300px] md:max-w-[400px] justify-self-center overflow-hidden border border-white/15 md:justify-self-end">
              <Image src={a.cover} alt={a.coverAlt ?? a.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 400px" priority />
            </div>
          ) : null}
        </div>
      </header>

      <div className="container-bs art-wrap mt-8 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-32">
            <ArticleToc items={toc} />
          </div>
        </aside>
        <div className="min-w-0 max-w-[46rem]">
          <div className="lg:hidden">
            <ArticleToc items={toc} compact />
          </div>
          {intro ? <div className="article-body art-intro" dangerouslySetInnerHTML={{ __html: renderMarkdown(intro) }} /> : null}
          <div className="mt-8">
            {sections.map((sec, i) => {
              const faqParts = sec.faq ? splitFaq(sec.md) : null;
              return (
                <details key={sec.id} id={sec.id} className="art-sec" open>
                  <summary>
                    <span className="num art-sec-n">{String(i + 1).padStart(2, "0")}</span>
                    <h2 dangerouslySetInnerHTML={{ __html: renderMarkdown(`## ${sec.title}`).replace(/^<h2>|<\/h2>$/g, "") }} />
                    <ChevronDown className="art-chev h-5 w-5" aria-hidden />
                  </summary>
                  {faqParts && faqParts.items.length ? (
                    <div className="art-sec-body">
                      <div className="art-faq">
                        {faqParts.items.map((f) => (
                          <details key={f.q}>
                            <summary>
                              <span>{f.q}</span>
                              <span className="art-plus" aria-hidden />
                            </summary>
                            <div className="article-body" dangerouslySetInnerHTML={{ __html: f.html }} />
                          </details>
                        ))}
                      </div>
                      {faqParts.after ? <div className="article-body mt-5" dangerouslySetInnerHTML={{ __html: faqParts.after }} /> : null}
                    </div>
                  ) : (
                    <div className="article-body art-sec-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(sec.md) }} />
                  )}
                </details>
              );
            })}
          </div>

          <aside className="art-cta mt-12">
            <div>
              <p className="text-lg font-semibold">อุปกรณ์เสริมที่ใช้ได้กับเครื่องมือของคุณ</p>
              <p className="mt-1 text-sm text-white/75">ออกแบบโดยคนไทย พิมพ์ 3D วัสดุ PETG ส่งใน 2 วัน</p>
            </div>
            <Link href="/shop" className="btn btn-primary shrink-0">
              ดูสินค้าทั้งหมด
            </Link>
          </aside>

          {related.length ? (
            <section className="mt-12" aria-labelledby="related-h">
              <h2 id="related-h" className="text-xl font-bold text-navy">
                อ่านต่อ
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-3 sm:gap-4">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link href={`/tools-lab/${r.slug}`} className="art-rel group">
                      <div className="art-rel-img relative aspect-square bg-steel">
                        {r.cover ? <Image src={r.cover} alt={r.coverAlt ?? r.title} fill className="object-cover" sizes="(max-width: 640px) 88px, 240px" /> : null}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-forge sm:mt-3">{PILLAR_LABEL[r.pillar]}</p>
                        <p className="mt-1 line-clamp-3 text-sm font-semibold leading-snug text-navy group-hover:text-forge">{r.title}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </article>
  );
}
