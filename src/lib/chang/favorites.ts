import { parsePathList, readStored, writeStored } from "./storage";

export const FAV_KEY = "chang-assist-favorites";
export const RECENT_KEY = "chang-assist-recent";

export const FAV_LIMIT = 40;
export const RECENT_LIMIT = 8;

/** แปลงค่าดิบจาก storage เป็นรายการปักหมุด (ตัดไม่เกิน FAV_LIMIT) */
export function parseFavorites(raw: string | null): string[] {
  return parsePathList(raw, FAV_LIMIT);
}

/** แปลงค่าดิบจาก storage เป็นรายการใช้ล่าสุด (ตัดไม่เกิน RECENT_LIMIT) */
export function parseRecent(raw: string | null): string[] {
  return parsePathList(raw, RECENT_LIMIT);
}

export function loadFavorites(): string[] {
  return parseFavorites(readStored(FAV_KEY));
}

export function toggleFavorite(toolPath: string): string[] {
  const cur = loadFavorites();
  const next = (cur.includes(toolPath) ? cur.filter((x) => x !== toolPath) : [toolPath, ...cur]).slice(0, FAV_LIMIT);
  writeStored(FAV_KEY, JSON.stringify(next));
  return next;
}

export function loadRecent(): string[] {
  return parseRecent(readStored(RECENT_KEY));
}

export function pushRecent(toolPath: string): void {
  const cur = loadRecent();
  if (cur[0] === toolPath) return;
  const next = [toolPath, ...cur.filter((x) => x !== toolPath)].slice(0, RECENT_LIMIT);
  writeStored(RECENT_KEY, JSON.stringify(next));
}

export function clearRecent(): void {
  writeStored(RECENT_KEY, null);
}
