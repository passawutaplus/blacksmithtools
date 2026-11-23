import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../runtime-store", () => ({
  readRuntimeText: async () => JSON.stringify({ n: 0 }),
  writeRuntimeText: async () => undefined,
}));

/** Tiny fake of the PostgREST endpoints state-store uses. */
function fakePostgrest() {
  let row: { id: string; data: unknown; version: number } | null = null;
  return vi.fn(async (url: string, init: RequestInit = {}) => {
    await new Promise((r) => setTimeout(r, Math.random() * 5));
    const u = new URL(url);
    const method = init.method ?? "GET";
    if (method === "GET") return new Response(JSON.stringify(row ? [row] : []));
    const body = JSON.parse(String(init.body));
    if (method === "POST") {
      if (row) return new Response("[]");
      row = { id: body.id, data: body.data, version: body.version };
      return new Response(JSON.stringify([row]));
    }
    const want = Number(u.searchParams.get("version")?.replace("eq.", ""));
    if (!row || row.version !== want) return new Response("[]");
    row = { ...row, data: body.data, version: body.version };
    return new Response(JSON.stringify([row]));
  });
}

describe("state-store (postgres mode)", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://x.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
    vi.stubGlobal("fetch", fakePostgrest());
  });
  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.unstubAllGlobals();
  });

  it("never loses concurrent increments", async () => {
    const { readState, writeState, withStateRetry } = await import("../state-store");
    const inc = withStateRetry(async () => {
      const { raw, version } = await readState();
      const d = JSON.parse(raw!) as { n: number };
      d.n += 1;
      await new Promise((r) => setTimeout(r, Math.random() * 5));
      await writeState(JSON.stringify(d), version);
    });
    // seed the row first
    await inc();
    await Promise.all([inc(), inc(), inc()]);
    const { raw, version } = await readState();
    expect(JSON.parse(raw!).n).toBe(4);
    expect(version).toBe(4); // insert = v1, then 3 updates
  });

  it("rejects a stale save", async () => {
    const { readState, writeState, StateConflictError } = await import("../state-store");
    await writeState(JSON.stringify({ n: 1 }), null);
    const a = await readState();
    await writeState(JSON.stringify({ n: 2 }), a.version);
    await expect(writeState(JSON.stringify({ n: 3 }), a.version)).rejects.toBeInstanceOf(StateConflictError);
  });
});
