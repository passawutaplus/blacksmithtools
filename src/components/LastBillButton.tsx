"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { readLastBill, type LastBill } from "@/lib/last-bill";

export function LastBillButton({ compact = false }: { compact?: boolean }) {
  const [bill, setBill] = useState<LastBill | null>(null);

  useEffect(() => {
    setBill(readLastBill());
  }, []);

  if (!bill) return null;

  return (
    <Link
      href={`/bill/${bill.token}`}
      className={compact ? "btn btn-secondary mt-3 w-full text-sm" : "btn btn-secondary mt-4 w-full"}
    >
      <Clock className="h-4 w-4" aria-hidden />
      เปิดบิลล่าสุดบนเครื่องนี้
      <span className="font-latin font-normal opacity-80">{bill.number}</span>
    </Link>
  );
}
