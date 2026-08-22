"use client";

import {
  completeThaiAddress,
  districtFieldLabel,
  districtsIn,
  subdistrictFieldLabel,
  subdistrictsIn,
  thaiProvinces,
  type ThaiAddressParts,
} from "@/lib/thai-address";

function RequiredMark() {
  return (
    <span className="text-forge" aria-hidden>
      *
    </span>
  );
}

export function ThaiAddressFields({
  idPrefix,
  value,
  onChange,
  required = true,
  names,
}: {
  idPrefix: string;
  value: ThaiAddressParts;
  onChange: (next: ThaiAddressParts) => void;
  required?: boolean;
  names?: Partial<Record<keyof ThaiAddressParts, string>>;
}) {
  const provinces = thaiProvinces();
  const districts = districtsIn(value.province);
  const tambons = subdistrictsIn(value.province, value.district);
  const districtLabel = districtFieldLabel(value.province);
  const subLabel = subdistrictFieldLabel(value.province);

  function patch(next: ThaiAddressParts) {
    onChange(completeThaiAddress(next));
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor={`${idPrefix}-province`}>
          จังหวัด {required ? <RequiredMark /> : null}
        </label>
        <select
          id={`${idPrefix}-province`}
          name={names?.province}
          required={required}
          className="input"
          autoComplete="address-level1"
          value={value.province}
          onChange={(e) =>
            patch({ province: e.target.value, district: "", subdistrict: "", postalCode: "" })
          }
        >
          <option value="">เลือกจังหวัด</option>
          {provinces.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`${idPrefix}-district`}>
          {districtLabel} {required ? <RequiredMark /> : null}
        </label>
        <select
          id={`${idPrefix}-district`}
          name={names?.district}
          required={required}
          className="input"
          autoComplete="address-level2"
          disabled={!value.province}
          value={value.district}
          onChange={(e) =>
            patch({
              province: value.province,
              district: e.target.value,
              subdistrict: "",
              postalCode: "",
            })
          }
        >
          <option value="">{value.province ? `เลือก${districtLabel}` : "เลือกจังหวัดก่อน"}</option>
          {districts.map((d) => (
            <option key={d.n} value={d.n}>
              {d.n}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`${idPrefix}-subdistrict`}>
          {subLabel} {required ? <RequiredMark /> : null}
        </label>
        <select
          id={`${idPrefix}-subdistrict`}
          name={names?.subdistrict}
          required={required}
          className="input"
          disabled={!value.district}
          value={value.subdistrict}
          onChange={(e) =>
            patch({
              province: value.province,
              district: value.district,
              subdistrict: e.target.value,
              postalCode: "",
            })
          }
        >
          <option value="">{value.district ? `เลือก${subLabel}` : `เลือก${districtLabel}ก่อน`}</option>
          {tambons.map((s) => (
            <option key={`${s.n}-${s.z}`} value={s.n}>
              {s.n}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`${idPrefix}-postalCode`}>
          รหัสไปรษณีย์ {required ? <RequiredMark /> : null}
        </label>
        <input
          id={`${idPrefix}-postalCode`}
          name={names?.postalCode}
          required={required}
          readOnly
          inputMode="numeric"
          autoComplete="postal-code"
          className="input bg-steel/60"
          value={value.postalCode}
          placeholder="เลือกแขวง/ตำบลแล้วขึ้นเอง"
        />
      </div>
    </div>
  );
}
