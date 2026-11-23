import { describe, expect, it } from "vitest";
import { clientIp, rateLimited } from "../rate-limit";

describe("rateLimited", () => {
  it("allows up to max hits in the window, then blocks", () => {
    const key = `t:${Math.random()}`;
    expect(rateLimited(key, 2, 60_000)).toBe(false);
    expect(rateLimited(key, 2, 60_000)).toBe(false);
    expect(rateLimited(key, 2, 60_000)).toBe(true);
  });

  it("keeps separate counts per key", () => {
    const a = `a:${Math.random()}`;
    const b = `b:${Math.random()}`;
    expect(rateLimited(a, 1, 60_000)).toBe(false);
    expect(rateLimited(a, 1, 60_000)).toBe(true);
    expect(rateLimited(b, 1, 60_000)).toBe(false);
  });
});

describe("clientIp", () => {
  it("prefers x-real-ip, then the first x-forwarded-for entry", () => {
    expect(clientIp(new Request("http://x", { headers: { "x-real-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" } }))).toBe("1.1.1.1");
    expect(clientIp(new Request("http://x", { headers: { "x-forwarded-for": "3.3.3.3, 4.4.4.4" } }))).toBe("3.3.3.3");
  });
});
