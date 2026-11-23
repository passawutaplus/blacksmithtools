import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PILLAR_LABEL, getArticle, listArticles, renderMarkdown } from "@/lib/articles";
import { jsonLd } from "@/lib/json-ld";

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
    robots: a.draft ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "article",
      title: a.title,
      description: a.description,
      publishedTime: a.date,
      ...(a.cover ? { images: [{ url: a.cover }] } : {}),
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = await getArticle((await params).slug);
  if (!a) notFound();
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: a.title,
      description: a.description,
      datePublished: a.date,
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
  ];

  return (
    <article className="container-bs py-10 md:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <nav className="text-xs text-muted">
        <Link href="/tools-lab" className="hover:text-navy hover:underline">
          Tools ลับ ฉบับย่อ
        </Link>
        <span className="px-1.5">/</span>
        <span>{PILLAR_LABEL[a.pillar]}</span>
      </nav>
      <header className="mt-4 max-w-3xl">
        {a.draft ? (
          <p className="mb-3 inline-block bg-forge px-2 py-1 text-xs font-semibold text-white">
            ฉบับร่าง — ยังไม่แสดงบนเว็บจริง
          </p>
        ) : null}
        <h1 className="text-3xl font-bold leading-tight text-navy md:text-4xl">{a.title}</h1>
        <p className="mt-3 text-lg text-muted">{a.description}</p>
        <p className="num mt-3 text-xs text-muted">{a.date} · BlackSmith Tools</p>
      </header>
      {a.cover ? (
        <div className="relative mt-8 aspect-[16/9] max-w-4xl overflow-hidden bg-steel">
          <Image src={a.cover} alt="" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 900px" priority />
        </div>
      ) : null}
      <div className="article-body mt-8 max-w-3xl" dangerouslySetInnerHTML={{ __html: renderMarkdown(a.body) }} />
      <aside className="mt-12 max-w-3xl border-t-4 border-forge bg-navy p-6 text-white">
        <p className="text-lg font-semibold">อุปกรณ์เสริมที่ใช้ได้กับเครื่องมือของคุณ</p>
        <p className="mt-1 text-sm text-white/75">ออกแบบโดยคนไทย พิมพ์ 3D วัสดุ PETG ส่งใน 2 วัน</p>
        <Link href="/shop" className="btn btn-primary mt-4">
          ดูสินค้าทั้งหมด
        </Link>
      </aside>
    </article>
  );
}
