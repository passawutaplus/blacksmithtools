// Edge-safe (Web Crypto) helpers for the single-password admin gate.
export const ADMIN_COOKIE = "bs_admin";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function adminPassword() {
  return process.env.ADMIN_PASSWORD?.trim() || "";
}

/** No password set: open in local dev only, locked in production. */
export function adminGateOpen() {
  return !adminPassword() && process.env.NODE_ENV !== "production";
}

export async function passwordMatches(input: string) {
  const pw = adminPassword();
  if (!pw) return false;
  const [a, b] = await Promise.all([sign("pw", input), sign("pw", pw)]);
  return safeEqual(a, b);
}

export async function createAdminToken() {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const sig = await sign(`admin.${exp}`, adminPassword());
  return `${exp}.${sig}`;
}

export async function verifyAdminToken(token: string | undefined) {
  if (adminGateOpen()) return true;
  if (!token || !adminPassword()) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, await sign(`admin.${exp}`, adminPassword()));
}

export const ADMIN_COOKIE_MAX_AGE = MAX_AGE_SEC;
