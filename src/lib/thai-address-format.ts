export function stripThaiAdminPrefix(name: string) {
  return name.trim().replace(/^(เขต|อำเภอ|อ\.|แขวง|ตำบล|ต\.)\s*/u, "");
}

export function isBangkok(provinceName: string) {
  const name = provinceName.trim();
  return name === "กรุงเทพมหานคร" || stripThaiAdminPrefix(name) === "กรุงเทพมหานคร";
}

export function districtFieldLabel(provinceName: string) {
  if (!provinceName.trim()) return "เขต/อำเภอ";
  return isBangkok(provinceName) ? "เขต" : "อำเภอ";
}

export function subdistrictFieldLabel(provinceName: string) {
  if (!provinceName.trim()) return "แขวง/ตำบล";
  return isBangkok(provinceName) ? "แขวง" : "ตำบล";
}

export function formatThaiLocality(addr: {
  subdistrict?: string;
  district: string;
  province: string;
  postalCode: string;
}) {
  return [addr.subdistrict, addr.district, addr.province, addr.postalCode]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

/** ที่อยู่บนใบปะหน้า: ตำบล/แขวง อำเภอ/เขต จังหวัด รหัสไปรษณีย์ — ไม่มีเลขผู้เสียภาษี */
export function formatThaiLocalityOnLabel(addr: {
  subdistrict?: string;
  district: string;
  province: string;
  postalCode: string;
}) {
  const province = addr.province.trim();
  const district = addr.district.trim();
  const sub = addr.subdistrict?.trim() ?? "";
  const zip = addr.postalCode.trim();
  const subPart = sub
    ? `${isBangkok(province) ? "แขวง" : "ตำบล"}${stripThaiAdminPrefix(sub)}`
    : "";
  const distPart = district
    ? isBangkok(province)
      ? district.startsWith("เขต")
        ? district
        : `เขต${stripThaiAdminPrefix(district)}`
      : `อำเภอ${stripThaiAdminPrefix(district)}`
    : "";
  const provPart = province
    ? isBangkok(province)
      ? "กรุงเทพมหานคร"
      : `จังหวัด${stripThaiAdminPrefix(province)}`
    : "";
  return [subPart, distPart, provPart, zip].filter(Boolean).join(" ");
}
