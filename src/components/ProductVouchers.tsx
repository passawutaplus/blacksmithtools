"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useVoucherStore } from "@/lib/voucher-store";
import { voucherCondition, voucherHeadline } from "@/lib/vouchers";
import type { VoucherKind } from "@/lib/types";

export interface PublicVoucher {
  code: string;
  kind: VoucherKind;
  value: number;
  minSubtotal: number;
  maxDiscount: number;
  endsAt?: string;
}

export function useClaimableVouchers() {
  const [list, setList] = useState<PublicVoucher[]>([]);
  useEffect(() => {
    let live = true;
    fetch("/api/vouchers")
      .then((r) => r.json())
      .then((d) => live && setList(Array.isArray(d.vouchers) ? d.vouchers : []))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return list;
}

export function ProductVouchers() {
  const list = useClaimableVouchers();
  const claimed = useVoucherStore((s) => s.claimed);
  const claim = useVoucherStore((s) => s.claim);
  if (list.length === 0) return null;
  return (
    <div className="mt-6">
      <p className="text-xs font-semibold text-muted">คูปองร้านค้า</p>
      <ul className="mt-2 flex flex-wrap gap-2.5">
        {list.map((v) => {
          const got = claimed.includes(v.code);
          return (
            <li key={v.code} className="flex border border-forge text-xs">
              <span className="bg-forge px-3 py-2 font-semibold text-white">{voucherHeadline(v)}</span>
              <span className="flex items-center gap-3 bg-white px-3 py-2 text-navy">
                <span>{voucherCondition(v)}</span>
                <button
                  type="button"
                  onClick={() => claim(v.code)}
                  disabled={got}
                  className={got ? "inline-flex items-center gap-1 font-semibold text-muted" : "font-semibold text-forge underline underline-offset-2"}
                >
                  {got ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden /> เก็บแล้ว
                    </>
                  ) : (
                    "เก็บโค้ด"
                  )}
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-muted">โค้ดที่เก็บไว้จะแสดงตอนชำระเงิน</p>
    </div>
  );
}
