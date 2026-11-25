import { describe, expect, it } from "vitest";
import { exportFileName, resultFileName } from "./export-file";

describe("exportFileName", () => {
  const date = new Date(2026, 10, 25);

  it("รหัสเครื่องมือ + ชนิดแผ่น + วันที่ + นามสกุล เป็น ASCII ล้วน", () => {
    expect(exportFileName("tile/job", date)).toBe("blacksmith-tile-job-2026-11-25.png");
    expect(exportFileName("tile/job", date, "order")).toBe("blacksmith-tile-job-order-2026-11-25.png");
    expect(exportFileName("tile/job", date, "order", "pdf")).toBe("blacksmith-tile-job-order-2026-11-25.pdf");
    expect(exportFileName("electrical/cable", date, "result", "pdf")).toBe("blacksmith-electrical-cable-2026-11-25.pdf");
    for (const name of [exportFileName("สายไฟ", date, "order", "pdf"), exportFileName("../..\\x:*?", date)]) {
      expect(name).toMatch(/^[a-z0-9.-]+$/);
    }
  });

  it("ชื่อแปลก/ว่าง ไม่ทำให้ชื่อไฟล์พัง", () => {
    expect(exportFileName("", date, "order", "pdf")).toBe("blacksmith-result-order-2026-11-25.pdf");
    expect(exportFileName("../..\\x:*?", date)).toBe("blacksmith-x-2026-11-25.png");
  });

  it("resultFileName ยังให้ชื่อรูปผลคำนวณแบบเดิม", () => {
    expect(resultFileName("hvac/btu", date)).toBe(exportFileName("hvac/btu", date, "result", "png"));
    expect(resultFileName("hvac/btu", date)).toBe("blacksmith-hvac-btu-2026-11-25.png");
  });
});
