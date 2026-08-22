import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import {
  carrierCodeFor,
  mapTrack17ToShop,
  normalizeTrackingNo,
  parseTrack17Webhook,
  verifyTrack17Signature,
} from "../track17";

describe("track17 mapping", () => {
  it("strips spaces and uppercases tracking numbers", () => {
    expect(normalizeTrackingNo(" th 12 345 ")).toBe("TH12345");
  });

  it("maps Thai carriers to 17TRACK codes", () => {
    expect(carrierCodeFor("flash")).toBe(100235);
    expect(carrierCodeFor("kerry")).toBe(100236);
    expect(carrierCodeFor("thailand_post")).toBe(20041);
    expect(carrierCodeFor("jnt")).toBe(100271);
    expect(carrierCodeFor("best")).toBe(100391);
    expect(carrierCodeFor("pickup")).toBeUndefined();
  });

  it("marks delivered only when the carrier says delivered", () => {
    expect(mapTrack17ToShop("Delivered")).toBe("delivered");
    expect(mapTrack17ToShop("OutForDelivery")).toBe("shipped");
    expect(mapTrack17ToShop("InTransit", "InTransit_PickedUp")).toBe("shipped");
    expect(mapTrack17ToShop("Exception", "Exception_Returned")).toBe("exception");
  });

  it("verifies webhook signatures from raw body + API key", () => {
    const body = '{"event":"TRACKING_UPDATED","data":{"number":"X"}}';
    const key = "secret-key";
    const sign = createHash("sha256").update(`${body}/${key}`).digest("hex");
    expect(verifyTrack17Signature(body, sign, key)).toBe(true);
    expect(verifyTrack17Signature(body, "deadbeef", key)).toBe(false);
  });

  it("parses TRACKING_UPDATED objects and accepted arrays", () => {
    const one = parseTrack17Webhook({
      event: "TRACKING_UPDATED",
      data: {
        number: "ABC123",
        tag: "ship1",
        track_info: {
          latest_status: { status: "Delivered", sub_status: "Delivered_Other" },
          latest_event: { description: "Signed", time_utc: "2026-08-22T00:00:00Z" },
        },
      },
    });
    expect(one[0]).toMatchObject({
      trackingNo: "ABC123",
      tag: "ship1",
      status: "Delivered",
      description: "Signed",
    });

    const many = parseTrack17Webhook({
      data: {
        accepted: [
          {
            number: "DEF456",
            track_info: { latest_status: { status: "InTransit" } },
          },
        ],
      },
    });
    expect(many[0]?.status).toBe("InTransit");
  });
});
