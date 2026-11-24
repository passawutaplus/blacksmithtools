"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Codes the customer tapped "เก็บโค้ด" on. Only a convenience list: the server re-checks everything at checkout. */
interface VoucherState {
  claimed: string[];
  claim: (code: string) => void;
}

export const useVoucherStore = create<VoucherState>()(
  persist(
    (set, get) => ({
      claimed: [],
      claim: (code) => {
        if (!get().claimed.includes(code)) set({ claimed: [...get().claimed, code].slice(-20) });
      },
    }),
    { name: "bs-vouchers" },
  ),
);
