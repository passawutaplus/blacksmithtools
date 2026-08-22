"use client";

import { useEffect } from "react";
import { saveLastBill } from "@/lib/last-bill";

export function RememberBill({ token, number }: { token: string; number: string }) {
  useEffect(() => {
    saveLastBill(token, number);
  }, [token, number]);
  return null;
}
