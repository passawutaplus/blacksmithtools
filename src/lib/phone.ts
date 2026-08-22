/** Normalize Thai phone numbers for lookup (0812345678 vs +66 81...). */
export function normalizePhoneDigits(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("66") && digits.length >= 11) digits = `0${digits.slice(2)}`;
  return digits;
}

export function phonesMatch(stored: string, query: string) {
  const a = normalizePhoneDigits(stored);
  const b = normalizePhoneDigits(query);
  if (a.length < 9 || b.length < 9) return false;
  if (a === b) return true;
  return a.slice(-9) === b.slice(-9);
}

export function formatPhoneDisplay(phone: string) {
  const digits = normalizePhoneDigits(phone);
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  return phone.trim();
}
