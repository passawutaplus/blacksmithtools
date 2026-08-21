const FAV_KEY = "chang-assist-favorites";
const RECENT_KEY = "chang-assist-recent";

export function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(toolPath: string): string[] {
  const cur = loadFavorites();
  const next = cur.includes(toolPath) ? cur.filter((x) => x !== toolPath) : [toolPath, ...cur];
  localStorage.setItem(FAV_KEY, JSON.stringify(next.slice(0, 40)));
  return next;
}

export function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function pushRecent(toolPath: string): void {
  const next = [toolPath, ...loadRecent().filter((x) => x !== toolPath)].slice(0, 8);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}
