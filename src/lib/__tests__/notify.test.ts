import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => fn() }));

import { orderAlertText } from "../notify";
import type { Order } from "../types";

const order = {
  id: "o1",
  number: "BS-20261123-0001",
  grandTotal: 1035,
  paymentMethod: "bank_transfer",
  address: { fullName: "สมชาย", province: "กรุงเทพมหานคร" },
  items: [{ name: "Battery Mount M18", variantName: "ดำ", quantity: 2 }],
} as unknown as Order;

describe("orderAlertText", () => {
  it("summarises the order", () => {
    const t = orderAlertText("new", order);
    expect(t).toContain("ออเดอร์ใหม่");
    expect(t).toContain("BS-20261123-0001");
    expect(t).toContain("Battery Mount M18 (ดำ) × 2");
    expect(t).toContain("โอน");
  });
});
