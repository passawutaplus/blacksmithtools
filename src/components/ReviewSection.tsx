import { Star } from "lucide-react";
import { REVIEW_SOURCE_LABEL } from "@/lib/reviews";
import type { ShopReview, SiteSettings } from "@/lib/types";

function Stars({ value }: { value: number }) {
  return (
    <p className="flex gap-0.5" aria-label={`${value} จาก 5 ดาว`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < value ? "fill-forge text-forge" : "text-steel"}`}
          aria-hidden
        />
      ))}
    </p>
  );
}

export function ReviewSection({
  reviews,
  settings,
  heading = "ลูกค้าว่ายังไง",
  embedded = false,
}: {
  reviews: ShopReview[];
  settings: SiteSettings;
  heading?: string;
  embedded?: boolean;
}) {
  const shopUrl = settings.shopeeShopUrl.trim();
  const rating = Number(settings.shopeeRating) || 0;
  const count = Number(settings.shopeeReviewCount) || 0;
  if (!reviews.length && !shopUrl && rating <= 0) return null;

  return (
    <section className={embedded ? "mt-12 md:mt-16" : "container-bs py-10 md:py-12"}>
      <p className="text-sm font-semibold text-forge">รีวิวจากร้านจริง</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-navy">{heading}</h2>
          {rating > 0 ? (
            <p className="mt-1 text-sm text-muted">
              {rating.toFixed(1)} ดาวบน Shopee
              {count > 0 ? ` · จาก ${count.toLocaleString("th-TH")} รีวิว` : ""}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">คัดจากรีวิวลูกค้าที่ซื้อบน Shopee — อ่านฉบับเต็มที่ร้านต้นทาง</p>
          )}
        </div>
        {shopUrl ? (
          <a href={shopUrl} className="btn btn-secondary" target="_blank" rel="noreferrer">
            อ่านรีวิวบน Shopee
          </a>
        ) : null}
      </div>

      {reviews.length ? (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((row) => (
            <li key={row.id} className="card p-4">
              <Stars value={row.stars} />
              <p className="mt-3 text-sm leading-relaxed text-navy">“{row.quote}”</p>
              <p className="mt-3 text-sm font-semibold text-navy">{row.author}</p>
              <p className="text-xs text-muted">
                {REVIEW_SOURCE_LABEL[row.source]}
                {row.productName ? ` · ${row.productName}` : ""}
              </p>
              {row.sourceUrl ? (
                <a href={row.sourceUrl} className="mt-2 inline-block text-xs font-semibold text-forge hover:underline" target="_blank" rel="noreferrer">
                  ดูที่ต้นทาง
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : shopUrl ? (
        <p className="mt-6 text-sm text-muted">ยังไม่ได้แปะรีวิวในหลังร้าน — กดอ่านบน Shopee ได้เลย</p>
      ) : null}
    </section>
  );
}
