"use client";

import { useSyncExternalStore } from "react";
import { readStored, subscribeStored } from "@/lib/chang/storage";

const serverSnapshot = () => null;

/**
 * อ่านค่าดิบจาก localStorage แบบไม่ทำให้ hydration เพี้ยน
 * รอบแรก (เซิร์ฟเวอร์ + ตอน hydrate) ได้ null เสมอ แล้ว React จะเรนเดอร์ซ้ำด้วยค่าจริงของเครื่องเอง
 */
export function useStoredRaw(key: string): string | null {
  return useSyncExternalStore(subscribeStored, () => readStored(key), serverSnapshot);
}
