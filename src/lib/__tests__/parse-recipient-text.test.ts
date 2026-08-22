import { describe, expect, it } from "vitest";
import { parseBillCustomerText, parseRecipientText } from "../parse-recipient-text";

describe("parseRecipientText", () => {
  it("fills a Bangkok Shopee-style paste", () => {
    const parsed = parseRecipientText(`สมชาย ใจดี
081-234-5678
99/1 ซอยสุขุมวิท 101 แขวงบางจาก เขตพระโขนง กรุงเทพมหานคร 10260`);
    expect(parsed.buyerName).toBe("สมชาย ใจดี");
    expect(parsed.phone).toBe("0812345678");
    expect(parsed.province).toBe("กรุงเทพมหานคร");
    expect(parsed.district).toContain("พระโขนง");
    expect(parsed.subdistrict).toBe("บางจาก");
    expect(parsed.postalCode).toBe("10260");
    expect(parsed.line1).toContain("99/1");
  });

  it("keeps only name, first phone, and address from a company paste", () => {
    const parsed = parseRecipientText(`ห้างหุ้นส่วนจำกัด ชัยธนาไฟฟ้าการช่าง 
49/500 หมู่ 4 ตำบลโคกขาม อำเภอเมืองสมุทรสาคร จังหวัดสมุทรสาคร 74000 
เลขที่ผู้เสียภาษี 0743556001130
โทร. 081-5469282,0853807557
อีเมลล์ Ctnnana@gmail.com`);
    expect(parsed.buyerName).toBe("ชัยธนาไฟฟ้าการช่าง");
    expect(parsed.phone).toBe("0815469282");
    expect(parsed.email).toBe("");
    expect(parsed.note).toBe("");
    expect(parsed.line1).toBe("49/500 หมู่ 4");
    expect(parsed.line1).not.toMatch(/0743556001130|ผู้เสียภาษี|gmail|0853807557/i);
    expect(parsed.province).toBe("สมุทรสาคร");
    expect(parsed.district).toContain("เมืองสมุทรสาคร");
    expect(parsed.subdistrict).toBe("โคกขาม");
    expect(parsed.postalCode).toBe("74000");
  });

  it("reads labeled upcountry address with อำเภอเมือง", () => {
    const parsed = parseRecipientText(`ผู้รับ: วิชัย ช่างเหล็ก
โทร: 0866259407
ที่อยู่: 12/3 หมู่ 5 ตำบลในเมือง อำเภอเมือง จังหวัดนครราชสีมา 30000`);
    expect(parsed.buyerName).toBe("วิชัย ช่างเหล็ก");
    expect(parsed.phone).toBe("0866259407");
    expect(parsed.province).toBe("นครราชสีมา");
    expect(parsed.district).toContain("เมือง");
    expect(parsed.subdistrict).toBe("ในเมือง");
    expect(parsed.postalCode).toBe("30000");
    expect(parsed.line1).toContain("12/3");
  });
});

describe("parseBillCustomerText", () => {
  it("keeps the full company name, tax id, email, and product lines", () => {
    const parsed = parseBillCustomerText(`ห้างหุ้นส่วนจำกัด ชัยธนาไฟฟ้าการช่าง 
49/500 หมู่ 4 ตำบลโคกขาม อำเภอเมืองสมุทรสาคร จังหวัดสมุทรสาคร 74000 
เลขที่ผู้เสียภาษี 0743556001130
โทร. 081-5469282,0853807557
อีเมลล์ Ctnnana@gmail.com
ที่แขวนดอกเตอร์ ตัวเลือก สีดำ ราคา 199 จำนวน 2 ส่วนลด 20`);
    expect(parsed.buyerName).toContain("ห้างหุ้นส่วนจำกัด");
    expect(parsed.buyerName).toContain("ชัยธนาไฟฟ้าการช่าง");
    expect(parsed.email.toLowerCase()).toBe("ctnnana@gmail.com");
    expect(parsed.taxId).toBe("0743556001130");
    expect(parsed.phone).toBe("0815469282");
    expect(parsed.items[0]).toMatchObject({
      name: expect.stringContaining("ที่แขวนดอกเตอร์"),
      variantName: "สีดำ",
      price: 199,
      quantity: 2,
      discount: 20,
    });
  });
});
