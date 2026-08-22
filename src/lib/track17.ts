import { createHash, timingSafeEqual } from "crypto";
import type { Carrier } from "./types";

const API = "https://api.17track.net/track/v2.4";
const ALREADY_REGISTERED = -18019901;

/** 17TRACK carrier keys for the Thai shops this store actually ships with. */
export const TRACK17_CARRIER_CODE: Partial<Record<Carrier, number>> = {
  flash: 100235,
  kerry: 100236,
  thailand_post: 20041,
  jnt: 100271,
  best: 100391,
};

export type Track17MainStatus =
  | "NotFound"
  | "InfoReceived"
  | "InTransit"
  | "Expired"
  | "AvailableForPickup"
  | "OutForDelivery"
  | "DeliveryFailure"
  | "Delivered"
  | "Exception";

export type Track17Snapshot = {
  trackingNo: string;
  tag?: string | null;
  carrierCode?: number | null;
  status: string;
  subStatus?: string;
  description?: string;
  at?: string;
};

export function normalizeTrackingNo(value: string) {
  return value.replace(/\s+/g, "").trim().toUpperCase();
}

export function track17ApiKey() {
  return process.env.TRACK17_API_KEY?.trim() || "";
}

export function isTrack17Configured() {
  return Boolean(track17ApiKey());
}

export function carrierCodeFor(carrier: Carrier) {
  return TRACK17_CARRIER_CODE[carrier];
}

export function verifyTrack17Signature(rawBody: string, signHeader: string | null, apiKey = track17ApiKey()) {
  if (!apiKey || !signHeader) return false;
  const expected = createHash("sha256").update(`${rawBody}/${apiKey}`).digest("hex");
  const got = signHeader.trim().toLowerCase();
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(got, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function mapTrack17ToShop(status: string, subStatus?: string): "shipped" | "delivered" | "exception" {
  if (status === "Delivered") return "delivered";
  if (status === "Exception") {
    const serious = [
      "Exception_Returning",
      "Exception_Returned",
      "Exception_Lost",
      "Exception_Destroyed",
      "Exception_Cancel",
      "Exception_Rejected",
    ];
    if (subStatus && serious.includes(subStatus)) return "exception";
    return "exception";
  }
  return "shipped";
}

type Track17Envelope = {
  code?: number;
  data?: {
    accepted?: unknown[];
    rejected?: Array<{ number?: string; error?: { code?: number; message?: string } }>;
  };
};

async function track17Post(path: string, body: unknown) {
  const key = track17ApiKey();
  if (!key) throw new Error("ยังไม่ได้ตั้ง TRACK17_API_KEY");
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "17token": key,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as Track17Envelope;
  if (!res.ok) {
    throw new Error(`17TRACK HTTP ${res.status}`);
  }
  return json;
}

export async function registerTrack17(input: {
  trackingNo: string;
  carrier: Carrier;
  tag: string;
  postalCode?: string;
  consignee?: string;
  phone?: string;
}) {
  const number = normalizeTrackingNo(input.trackingNo);
  if (!number) throw new Error("ไม่มีเลขพัสดุ");
  const payload: Record<string, unknown> = {
    number,
    tag: input.tag,
    origin_country: "TH",
    destination_country: "TH",
  };
  const code = carrierCodeFor(input.carrier);
  if (code) payload.carrier = code;
  if (input.postalCode) payload.destination_postal_code = input.postalCode.replace(/\s+/g, "");
  if (input.consignee) payload.consignee = input.consignee;
  const digits = (input.phone ?? "").replace(/\D/g, "");
  if (digits.length >= 4) payload.phone_number_last_4 = digits.slice(-4);

  const json = await track17Post("/register", [payload]);
  const rejected = json.data?.rejected ?? [];
  const hard = rejected.filter((r) => r.error?.code !== ALREADY_REGISTERED);
  if (json.code !== 0 && hard.length > 0) {
    throw new Error(hard[0]?.error?.message || "ลงทะเบียนเลขพัสดุไม่สำเร็จ");
  }
  if (hard.length > 0) {
    throw new Error(hard[0]?.error?.message || "ลงทะเบียนเลขพัสดุไม่สำเร็จ");
  }
  return { ok: true as const };
}

export async function fetchTrack17Info(items: Array<{ trackingNo: string; carrier: Carrier }>) {
  const body = items
    .map((item) => {
      const number = normalizeTrackingNo(item.trackingNo);
      if (!number) return null;
      const row: Record<string, unknown> = { number };
      const code = carrierCodeFor(item.carrier);
      if (code) row.carrier = code;
      return row;
    })
    .filter((row): row is Record<string, unknown> => Boolean(row));
  if (body.length === 0) return [] as Track17Snapshot[];
  const json = await track17Post("/gettrackinfo", body);
  const accepted = (json.data?.accepted ?? []) as Array<Record<string, unknown>>;
  return accepted.map(snapshotFromTrack17Row).filter((s): s is Track17Snapshot => Boolean(s));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function snapshotFromTrack17Row(row: Record<string, unknown>): Track17Snapshot | null {
  const number = typeof row.number === "string" ? row.number : "";
  if (!number) return null;
  const trackInfo = asRecord(row.track_info);
  const latestStatus = asRecord(trackInfo?.latest_status);
  const latestEvent = asRecord(trackInfo?.latest_event);
  const translation = asRecord(latestEvent?.description_translation);
  const description =
    (typeof translation?.description === "string" && translation.description) ||
    (typeof latestEvent?.description === "string" && latestEvent.description) ||
    undefined;
  const at =
    (typeof latestEvent?.time_utc === "string" && latestEvent.time_utc) ||
    (typeof latestEvent?.time_iso === "string" && latestEvent.time_iso) ||
    undefined;
  return {
    trackingNo: number,
    tag: typeof row.tag === "string" ? row.tag : null,
    carrierCode: typeof row.carrier === "number" ? row.carrier : null,
    status: typeof latestStatus?.status === "string" ? latestStatus.status : "NotFound",
    subStatus: typeof latestStatus?.sub_status === "string" ? latestStatus.sub_status : undefined,
    description,
    at,
  };
}

export function parseTrack17Webhook(payload: unknown): Track17Snapshot[] {
  const root = asRecord(payload);
  if (!root) return [];
  const data = root.data;
  if (Array.isArray(data)) {
    return data.flatMap((row) => {
      const rec = asRecord(row);
      const snap = rec ? snapshotFromTrack17Row(rec) : null;
      return snap ? [snap] : [];
    });
  }
  const obj = asRecord(data);
  if (!obj) return [];
  if (Array.isArray(obj.accepted)) {
    return obj.accepted.flatMap((row) => {
      const rec = asRecord(row);
      const snap = rec ? snapshotFromTrack17Row(rec) : null;
      return snap ? [snap] : [];
    });
  }
  const one = snapshotFromTrack17Row(obj);
  return one ? [one] : [];
}
