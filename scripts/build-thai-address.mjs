/**
 * Builds src/data/thai-address.json from kongvut/thai-province-data
 * https://github.com/kongvut/thai-province-data
 *
 * Usage: node scripts/build-thai-address.mjs
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const BASE = "https://raw.githubusercontent.com/kongvut/thai-province-data/master/api/latest";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "src", "data", "thai-address.json");

const [provinces, districts, subs] = await Promise.all([
  fetch(`${BASE}/province.json`).then((r) => r.json()),
  fetch(`${BASE}/district.json`).then((r) => r.json()),
  fetch(`${BASE}/sub_district.json`).then((r) => r.json()),
]);

const alive = (row) => !row.deleted_at;
const thSort = (a, b) => a.localeCompare(b, "th");

const districtByProvince = new Map();
for (const d of districts.filter(alive)) {
  if (!districtByProvince.has(d.province_id)) districtByProvince.set(d.province_id, []);
  districtByProvince.get(d.province_id).push(d);
}

const subByDistrict = new Map();
for (const s of subs.filter(alive)) {
  const zip = String(s.zip_code ?? "").replace(/\D/g, "");
  if (zip.length !== 5) continue;
  if (!subByDistrict.has(s.district_id)) subByDistrict.set(s.district_id, []);
  subByDistrict.get(s.district_id).push(s);
}

const nested = provinces
  .filter(alive)
  .map((p) => {
    const ds = (districtByProvince.get(p.id) ?? [])
      .map((d) => {
        const raw = subByDistrict.get(d.id) ?? [];
        const seen = new Set();
        const tambons = [];
        for (const s of raw) {
          const zip = String(s.zip_code).replace(/\D/g, "");
          const key = `${s.name_th}|${zip}`;
          if (seen.has(key)) continue;
          seen.add(key);
          tambons.push({ n: s.name_th, z: zip });
        }
        tambons.sort((a, b) => thSort(a.n, b.n) || a.z.localeCompare(b.z));
        return { n: d.name_th, s: tambons };
      })
      .filter((d) => d.s.length > 0);
    ds.sort((a, b) => thSort(a.n, b.n));
    return { n: p.name_th, d: ds };
  })
  .filter((p) => p.d.length > 0);

nested.sort((a, b) => {
  if (a.n === "กรุงเทพมหานคร") return -1;
  if (b.n === "กรุงเทพมหานคร") return 1;
  return thSort(a.n, b.n);
});

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(nested));
console.log(`wrote ${out} (${nested.length} provinces)`);
