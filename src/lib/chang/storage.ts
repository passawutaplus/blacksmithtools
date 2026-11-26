/**
 * ตัวห่อ localStorage ของผู้ช่วยงานช่าง
 *
 * เครื่องหน้างานเจอได้ทุกแบบ: ที่เก็บเต็ม (QuotaExceededError), โหมดส่วนตัว, เบราว์เซอร์ในแอปที่บล็อก storage
 * (SecurityError ตั้งแต่ตอนแตะ window.localStorage) — ทุกกรณีต้อง "จำไม่ได้แต่ยังคิดเลขได้" ห้ามพังทั้งหน้า
 *
 * ค่าที่อ่าน/เขียนผ่านไฟล์นี้จะถูกพักไว้ในหน่วยความจำด้วย (cache) ทำให้
 * 1) ถึง storage ใช้ไม่ได้ ค่าก็ยังอยู่ตลอดการใช้งานรอบนั้น
 * 2) ใช้กับ useSyncExternalStore ได้ — snapshot เป็น string เดิมจนกว่าจะมีการเขียนใหม่
 */

type Listener = () => void;

const cache = new Map<string, string | null>();
const listeners = new Set<Listener>();
let storageEventBound = false;

function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** อ่านค่าดิบ — คืน null ถ้าไม่มีหรืออ่านไม่ได้ ไม่โยน error */
export function safeGet(key: string): string | null {
  try {
    return getStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** เขียนค่าดิบ — คืน false ถ้าเขียนไม่ได้ (เต็ม/ถูกบล็อก) ไม่โยน error */
export function safeSet(key: string, value: string): boolean {
  try {
    const storage = getStorage();
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemove(key: string): boolean {
  try {
    const storage = getStorage();
    if (!storage) return false;
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function emit() {
  for (const listener of [...listeners]) listener();
}

/** snapshot ฝั่งเบราว์เซอร์สำหรับ useSyncExternalStore (อ่าน storage ครั้งแรกครั้งเดียว แล้วใช้ cache) */
export function readStored(key: string): string | null {
  if (!cache.has(key)) cache.set(key, safeGet(key));
  return cache.get(key) ?? null;
}

/** เขียนค่าแล้วแจ้งทุกคอมโพเนนต์ที่ฟังอยู่ — ถึง storage จะเขียนไม่ได้ ค่าก็ยังอยู่ใน cache ของรอบนี้ */
export function writeStored(key: string, value: string | null): boolean {
  cache.set(key, value);
  const ok = value === null ? safeRemove(key) : safeSet(key, value);
  emit();
  return ok;
}

export function subscribeStored(listener: Listener): () => void {
  listeners.add(listener);
  if (!storageEventBound && typeof window !== "undefined") {
    storageEventBound = true;
    // แท็บอื่นแก้ค่า → ทิ้ง cache ของคีย์นั้นแล้วให้อ่านใหม่
    window.addEventListener("storage", (e) => {
      if (e.key === null) cache.clear();
      else cache.delete(e.key);
      emit();
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

/** แปลง JSON แบบไม่โยน error — ข้อมูลเสีย/ถูกแก้มือให้ถือว่าไม่มี */
export function parseJson(raw: string | null): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * รายการ path ของเครื่องมือ (ปักหมุด/ใช้ล่าสุด) จากค่าดิบ
 * ตัดความยาวตอนอ่านเสมอ — ถ้ามีคนยัดรายการเป็นหมื่นไว้ในเครื่อง หน้าแรกจะไม่ค้าง
 */
export function parsePathList(raw: string | null, limit: number): string[] {
  const parsed = parseJson(raw);
  if (!Array.isArray(parsed)) return [];
  const out: string[] = [];
  for (const item of parsed) {
    if (typeof item !== "string" || item.length > 80 || out.includes(item)) continue;
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}
