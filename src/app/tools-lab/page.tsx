import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PILLAR_LABEL, listArticles } from "@/lib/articles";
import { jsonLd } from "@/lib/json-ld";
import { OG_BASE, breadcrumbLd, collectionLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Tools ลับ ฉบับย่อ — เรื่องเล่าและความรู้เครื่องมือช่าง",
  description: "ประวัติเครื่องมือที่คนไม่ค่อยรู้ เคล็ดลับงานช่าง และวิธีใช้อุปกรณ์เสริม จากทีม BlackSmith",
  alternates: { canonical: "/tools-lab" },
  openGraph: {
    ...OG_BASE,
    type: "website",
    title: "Tools ลับ ฉบับย่อ — เรื่องเล่าและความรู้เครื่องมือช่าง",
    description: "ประวัติเครื่องมือที่คนไม่ค่อยรู้ เคล็ดลับงานช่าง และวิธีใช้อุปกรณ์เสริม จากทีม BlackSmith",
  },
};

export default async function ToolsLabPage() {
  const articles = await listArticles();
  const ld = [
    collectionLd(
      "Tools ลับ ฉบับย่อ",
      "เรื่องเล่า เคล็ดลับ และวิธีใช้เครื่องมือช่าง จากทีม BlackSmith",
      "/tools-lab",
      articles.filter((a) => !a.draft).map((a) => ({ name: a.title, path: `/tools-lab/${a.slug}` })),
    ),
    breadcrumbLd([
      ["หน้าแรก", "/"],
      ["Tools ลับ ฉบับย่อ", "/tools-lab"],
    ]),
  ];
  return (
    <div className="container-bs py-10 md:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <p className="eyebrow">Tools Lab</p>
      <h1 className="mt-2 text-3xl font-bold text-navy md:text-4xl">Tools ลับ ฉบับย่อ</h1>
      <p className="mt-3 max-w-2xl text-muted">
        รู้หรือไม่ว่าเครื่องมือที่ใช้ทุกวันมีที่มายังไง — เรื่องเล่า เคล็ดลับ และวิธีใช้ จากทีมช่างของ BlackSmith
      </p>

      {articles.length === 0 ? (
        <p className="mt-10 border border-navy/12 bg-white p-6 text-sm text-muted">บทความกำลังมา เร็ว ๆ นี้</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <li key={a.slug} className="border border-navy/12 bg-white hover:border-navy/40">
              <Link href={`/tools-lab/${a.slug}`} className="group flex h-full flex-col">
                <div className="relative aspect-square bg-forge">
                  {a.cover ? (
                    <Image src={a.cover} alt={a.coverAlt ?? a.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" />
                  ) : (
                    <Image src="/brand/mark-white.png" alt="" width={56} height={56} className="absolute bottom-4 left-4 h-14 w-14 object-contain opacity-90" />
                  )}
                  {a.draft ? (
                    <span className="absolute right-2 top-2 bg-white px-2 py-0.5 text-[11px] font-semibold text-forge">
                      ฉบับร่าง
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="text-xs font-medium text-forge">{PILLAR_LABEL[a.pillar]}</p>
                  <h2 className="mt-1 text-lg font-semibold leading-snug text-navy group-hover:text-forge">{a.title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm text-muted">{a.description}</p>
                  <p className="num mt-auto pt-4 text-xs text-muted">{a.date}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
