import raw from "../data/thai-address.json";
import { stripThaiAdminPrefix } from "./thai-address-format";

export type ThaiAddressParts = {
  province: string;
  district: string;
  subdistrict: string;
  postalCode: string;
};

export {
  districtFieldLabel,
  formatThaiLocality,
  isBangkok,
  stripThaiAdminPrefix,
  subdistrictFieldLabel,
} from "./thai-address-format";

type TambonRow = { n: string; z: string };
type DistrictRow = { n: string; s: TambonRow[] };
type ProvinceRow = { n: string; d: DistrictRow[] };

const provinces = raw as ProvinceRow[];

function sameName(a: string, b: string) {
  const left = a.trim();
  const right = b.trim();
  if (!left || !right) return false;
  return left === right || stripThaiAdminPrefix(left) === stripThaiAdminPrefix(right);
}

export function thaiProvinces() {
  return provinces.map((p) => p.n);
}

export function findProvince(name: string) {
  const needle = name.trim();
  if (!needle) return undefined;
  return provinces.find((p) => sameName(p.n, needle));
}

export function districtsIn(provinceName: string) {
  return findProvince(provinceName)?.d ?? [];
}

export function subdistrictsIn(provinceName: string, districtName: string) {
  const province = findProvince(provinceName);
  if (!province) return [];
  const district = province.d.find((d) => sameName(d.n, districtName));
  return district?.s ?? [];
}

/** Map free-text / remembered values onto official names and fill zip. */
export function completeThaiAddress(input: Partial<ThaiAddressParts>): ThaiAddressParts {
  const province = findProvince(input.province ?? "");
  if (!province) {
    return { province: "", district: "", subdistrict: "", postalCode: "" };
  }

  const district = province.d.find((d) => sameName(d.n, input.district ?? ""));
  if (!district) {
    return { province: province.n, district: "", subdistrict: "", postalCode: "" };
  }

  const wantedSub = (input.subdistrict ?? "").trim();
  const wantedZip = (input.postalCode ?? "").replace(/\D/g, "");
  let tambon = district.s.find((s) => sameName(s.n, wantedSub));
  if (!tambon && wantedZip.length === 5) {
    const zipMatches = district.s.filter((s) => s.z === wantedZip);
    if (zipMatches.length === 1) tambon = zipMatches[0];
    else if (wantedSub) tambon = zipMatches.find((s) => sameName(s.n, wantedSub));
  }

  if (!tambon) {
    return {
      province: province.n,
      district: district.n,
      subdistrict: "",
      postalCode: "",
    };
  }

  return {
    province: province.n,
    district: district.n,
    subdistrict: tambon.n,
    postalCode: tambon.z,
  };
}

export function isValidThaiAddress(input: ThaiAddressParts) {
  const done = completeThaiAddress(input);
  return Boolean(done.province && done.district && done.subdistrict && done.postalCode);
}

/** All tambons that use this 5-digit zip. */
export function addressesForPostalCode(zip: string): ThaiAddressParts[] {
  const z = zip.replace(/\D/g, "");
  if (z.length !== 5) return [];
  const out: ThaiAddressParts[] = [];
  for (const province of provinces) {
    for (const district of province.d) {
      for (const tambon of district.s) {
        if (tambon.z === z) {
          out.push({
            province: province.n,
            district: district.n,
            subdistrict: tambon.n,
            postalCode: tambon.z,
          });
        }
      }
    }
  }
  return out;
}
