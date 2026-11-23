import { formatTHB } from "@/lib/utils";

/** Segmented "gauge" toward free shipping — reads like a tool battery indicator. */
export function FreeShipMeter({ subtotal, min }: { subtotal: number; min: number }) {
  if (subtotal <= 0 || min <= 0) return null;
  const left = Math.max(0, min - subtotal);
  const ratio = Math.min(1, subtotal / min);
  const filled = Math.round(ratio * 10);
  return (
    <div className="mt-3" aria-live="polite">
      <p className="text-xs font-medium text-navy">
        {left > 0 ? (
          <>
            ซื้ออีก <span className="num font-semibold text-forge">{formatTHB(left)}</span> ส่งฟรี
          </>
        ) : (
          <>ได้ส่งฟรีแล้ว</>
        )}
      </p>
      <div
        className="mt-1.5 grid grid-cols-10 gap-0.5"
        role="meter"
        aria-label="ยอดสะสมสู่ส่งฟรี"
        aria-valuemin={0}
        aria-valuemax={min}
        aria-valuenow={Math.min(subtotal, min)}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={`h-1.5 ${i < filled ? (left > 0 ? "bg-forge" : "bg-navy") : "bg-navy/10"}`} />
        ))}
      </div>
    </div>
  );
}
