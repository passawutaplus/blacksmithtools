import { describe, expect, it } from "vitest";
import { completeThaiAddress, isValidThaiAddress } from "../thai-address";
import { formatThaiLocality, formatThaiLocalityOnLabel } from "../thai-address-format";

describe("thai address dataset", () => {
  it("fills zip from province → district → tambon", () => {
    const done = completeThaiAddress({
      province: "กรุงเทพมหานคร",
      district: "เขตพระนคร",
      subdistrict: "พระบรมมหาราชวัง",
    });
    expect(done.postalCode).toBe("10200");
    expect(isValidThaiAddress(done)).toBe(true);
  });

  it("matches names without เขต prefix", () => {
    const done = completeThaiAddress({
      province: "กรุงเทพมหานคร",
      district: "พระนคร",
      subdistrict: "พระบรมมหาราชวัง",
    });
    expect(done.district).toBe("เขตพระนคร");
    expect(done.postalCode).toBe("10200");
  });

  it("formats locality with tambon", () => {
    expect(
      formatThaiLocality({
        subdistrict: "พระบรมมหาราชวัง",
        district: "เขตพระนคร",
        province: "กรุงเทพมหานคร",
        postalCode: "10200",
      }),
    ).toBe("พระบรมมหาราชวัง เขตพระนคร กรุงเทพมหานคร 10200");
  });

  it("formats label locality with ตำบล อำเภอ จังหวัด", () => {
    expect(
      formatThaiLocalityOnLabel({
        subdistrict: "โคกขาม",
        district: "เมืองสมุทรสาคร",
        province: "สมุทรสาคร",
        postalCode: "74000",
      }),
    ).toBe("ตำบลโคกขาม อำเภอเมืองสมุทรสาคร จังหวัดสมุทรสาคร 74000");
  });
});
