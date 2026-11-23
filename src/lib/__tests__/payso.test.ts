import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const env = {
  PAYSO_MERCHANT_ID: "12345678",
  PAYSO_API_KEY: "ak",
  PAYSO_SECRET_KEY: "sk",
  PAYSO_TERMINAL_ID: "TID00001",
};

describe("payso", () => {
  beforeEach(() => Object.assign(process.env, env));
  afterEach(() => {
    for (const k of Object.keys(env)) delete process.env[k];
    vi.restoreAllMocks();
  });

  it("makes 12-digit refs", async () => {
    const { newPaysoRef } = await import("../payments/payso");
    expect(newPaysoRef()).toMatch(/^\d{12}$/);
  });

  it("checks postback token", async () => {
    const { postbackToken, postbackTokenValid } = await import("../payments/payso");
    const k = postbackToken("123456789012");
    expect(postbackTokenValid("123456789012", k)).toBe(true);
    expect(postbackTokenValid("123456789013", k)).toBe(false);
    expect(postbackTokenValid("123456789012", null)).toBe(false);
  });

  it("creates payment with documented fields", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ status: { statusCode: "2A002" }, transactionId: "T1", redirectUrl: "https://x/redirect" }),
      ),
    );
    const { createPaysoPayment } = await import("../payments/payso");
    const r = await createPaysoPayment({
      referenceNo: "123456789012",
      amount: 1035,
      customerEmail: "a@b.co",
      description: "BlackSmith BS-1",
      returnUrl: "https://s/bill/t",
      postbackUrl: "https://s/hook",
    });
    expect(r.redirectUrl).toBe("https://x/redirect");
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://apis.paysolutions.asia/payment/gateway/v2/ui-payments");
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ merchantId: "12345678", currencyCode: "00", terminalId: "TID00001", amount: 1035 });
    expect((init.headers as Record<string, string>).secretKey).toBe("sk");
  });

  it("throws on non-success code", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: { statusCode: "4A006", message: "closed" } })),
    );
    const { createPaysoPayment } = await import("../payments/payso");
    await expect(
      createPaysoPayment({ referenceNo: "1", amount: 1, customerEmail: "a@b.co", description: "x", returnUrl: "", postbackUrl: "" }),
    ).rejects.toThrow(/4A006/);
  });

  it("inquiry: empty response = not paid, CP = paid", async () => {
    const { inquirePayso } = await import("../payments/payso");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(""));
    expect(await inquirePayso("123456789012")).toBeNull();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ ReferenceNo: "123456789012", Total: 1035.0, Status: "CP", OrderNo: "9" })),
    );
    expect(await inquirePayso("123456789012")).toEqual({ paid: true, total: 1035, orderNo: "9" });
  });
});
