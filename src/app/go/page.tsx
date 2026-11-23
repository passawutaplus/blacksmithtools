import type { Metadata, Viewport } from "next";
import { getProductBySlug, getSettings, listProducts } from "@/lib/db";
import { LinkPortal } from "@/components/LinkPortal";
import { portalChemSlides, portalPrintSlides } from "@/lib/portal-links";

export const viewport: Viewport = {
  themeColor: "#253641",
  viewportFit: "cover",
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}): Promise<Metadata> {
  const { p } = await searchParams;
  const product = p ? (await getProductBySlug(p))?.product : null;
  const title = product ? `${product.nameTh} · ช่องทางร้าน` : "ช่องทางร้าน";
  const description = product
    ? `ซื้อ ${product.nameTh} บนเว็บ Shopee Lazada ไทยมาร์ท TikTok หรือคุย LINE ร้าน BlackSmith`
    : "ซื้อของ BlackSmith บนเว็บ Shopee Lazada ไทยมาร์ท TikTok หรือคุย LINE — หน้าสำหรับสแกน QR บนสินค้าและใบปลิว";
  return {
    title,
    description,
    openGraph: {
      title: `${title} | BlackSmith Tools`,
      description,
      images: product?.imageUrl ? [{ url: product.imageUrl }] : [{ url: "/brand/logo.png" }],
    },
  };
}

export default async function GoPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const { p } = await searchParams;
  const [settings, catalog, productData] = await Promise.all([
    getSettings(),
    listProducts(),
    p ? getProductBySlug(p) : Promise.resolve(null),
  ]);

  return (
    <main id="main">
      <LinkPortal
        settings={settings}
        product={productData?.product ?? null}
        printSlides={portalPrintSlides(catalog.products)}
        chemSlides={portalChemSlides(catalog.products)}
      />
    </main>
  );
}
