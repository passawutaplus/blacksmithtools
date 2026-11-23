import { describe, expect, it } from "vitest";
import { isNotifyIdRequest } from "../line-keyword";

describe("isNotifyIdRequest", () => {
  it("matches the keyword with common typing variants", () => {
    expect(isNotifyIdRequest("รหัสแจ้งเตือน")).toBe(true);
    expect(isNotifyIdRequest("รหัสเเจ้งเตือน")).toBe(true);
    expect(isNotifyIdRequest(" รหัส แจ้งเตือน ")).toBe(true);
    expect(isNotifyIdRequest("ขอรหัสแจ้งเตือนหน่อย")).toBe(true);
    expect(isNotifyIdRequest("Notify ID")).toBe(true);
  });
  it("ignores other messages", () => {
    expect(isNotifyIdRequest("สวัสดี")).toBe(false);
    expect(isNotifyIdRequest("แจ้งเตือน")).toBe(false);
  });
});
