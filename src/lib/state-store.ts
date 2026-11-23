import "server-only";
import { readRuntimeText, writeRuntimeText } from "./runtime-store";

/**
 * Where the shop's state document (orders, products, settings…) lives.
 *
 * - Postgres (Supabase) when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set:
 *   one row in `shop_state` with a version number. Every save is a
 *   compare-and-swap on that version, so two requests can never silently
 *   overwrite each other; the losing request re-runs from fresh data.
 * - Otherwise the old JSON file (local disk, or Vercel Blob in production).
 */
const ROW_ID = "main";

export class StateConflictError extends Error {
  constructor() {
    super("ข้อมูลร้านถูกแก้พร้อมกัน ลองใหม่อีกครั้ง");
  }
}

function pg() {
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

export function stateBackend() {
  return pg() ? "postgres" : "file";
}

async function rest(path: string, init: RequestInit & { prefer?: string } = {}) {
  const c = pg()!;
  const res = await fetch(`${c.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: c.key,
      Authorization: `Bearer ${c.key}`,
      "Content-Type": "application/json",
      ...(init.prefer ? { Prefer: init.prefer } : {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`state store ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res;
}

/** Returns the raw JSON and its version (null = file store, or no row yet on Postgres). */
export async function readState(): Promise<{ raw: string | null; version: number | null }> {
  if (!pg()) return { raw: await readRuntimeText("db.json"), version: null };
  const rows = (await (await rest(`shop_state?id=eq.${ROW_ID}&select=data,version`)).json()) as {
    data: unknown;
    version: number;
  }[];
  if (rows.length === 0) {
    // First run on Postgres: carry over the existing JSON store so nothing is lost.
    return { raw: await readRuntimeText("db.json"), version: null };
  }
  return { raw: JSON.stringify(rows[0].data), version: Number(rows[0].version) };
}

/** Saves only if nobody else saved since `version` was read. Returns the new version. */
export async function writeState(json: string, version: number | null): Promise<number | null> {
  if (!pg()) {
    await writeRuntimeText("db.json", json);
    return null;
  }
  if (version === null) {
    const res = await rest(`shop_state?on_conflict=id`, {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=representation",
      body: JSON.stringify({ id: ROW_ID, data: JSON.parse(json), version: 1 }),
    });
    if (((await res.json()) as unknown[]).length === 0) throw new StateConflictError();
    return 1;
  }
  const res = await rest(`shop_state?id=eq.${ROW_ID}&version=eq.${version}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: JSON.stringify({ data: JSON.parse(json), version: version + 1, updated_at: new Date().toISOString() }),
  });
  if (((await res.json()) as unknown[]).length === 0) throw new StateConflictError();
  return version + 1;
}

/** Re-run a whole read-modify-write when another request saved in between. */
export function withStateRetry<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R> => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await fn(...args);
      } catch (e) {
        if (!(e instanceof StateConflictError) || attempt >= 4) throw e;
        await new Promise((r) => setTimeout(r, 40 * (attempt + 1) + Math.random() * 60));
      }
    }
  };
}
