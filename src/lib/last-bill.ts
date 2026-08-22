export type LastBill = {
  token: string;
  number: string;
  savedAt: string;
};

const KEY = "bs-last-bill";

export function saveLastBill(token: string, number: string) {
  if (typeof window === "undefined") return;
  const tokenOk = token.trim();
  const numberOk = number.trim();
  if (!tokenOk || !numberOk) return;
  const payload: LastBill = { token: tokenOk, number: numberOk, savedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // private mode / quota
  }
}

export function readLastBill(): LastBill | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastBill;
    if (!parsed?.token || !parsed?.number) return null;
    return parsed;
  } catch {
    return null;
  }
}
