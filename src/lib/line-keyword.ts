/**
 * Thai keyboards often produce "เเ" (two sara e) instead of "แ", and people add
 * spaces or punctuation, so normalise before matching. English "notify id" works too.
 */
export function isNotifyIdRequest(text: string) {
  const t = text.normalize("NFC").replace(/เเ/g, "แ").replace(/[\s\u200b.!?:]+/g, "").toLowerCase();
  return t.includes("รหัสแจ้งเตือน") || t === "notifyid";
}
