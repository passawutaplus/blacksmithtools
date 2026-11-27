import { z } from "zod";

/** Uploaded quote files live here in private Blob storage (random suffix added by Blob). */
export const QUOTE_FILE_PATH = /^print-quotes\/[a-z0-9]{8,24}\/[A-Za-z0-9._-]{1,120}\.(stl|obj|3mf|step|stp)$/i;
/** Stored pathname after Blob adds "-<random>" before the extension. */
export const QUOTE_STORED_PATH = /^print-quotes\/[a-z0-9]{8,24}\/[A-Za-z0-9._-]{1,160}\.(stl|obj|3mf|step|stp)$/i;
export const QUOTE_FILE_TTL_DAYS = 30;

/** Safe ASCII file name for storage; the original name is kept separately for display. */
export function storageName(name: string) {
  const ext = /\.(stl|obj|3mf|step|stp)$/i.exec(name)?.[0].toLowerCase() ?? ".stl";
  const base = name
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return `${base || "model"}${ext}`;
}

const dims = z.tuple([z.number().min(0).max(5000), z.number().min(0).max(5000), z.number().min(0).max(5000)]);

export const quoteRequestSchema = z.object({
  process: z.enum(["fdm", "resin"]),
  quality: z.enum(["normal", "fine"]),
  files: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        sizeBytes: z.number().int().min(0).max(60 * 1024 * 1024),
        dims: dims.nullable(),
        qty: z.number().int().min(1).max(10000),
        status: z.enum(["ok", "warn", "error"]),
        statusText: z.string().max(200),
        wantMm: z.array(z.string().max(12)).max(3).optional(),
        note: z.string().max(1000).optional(),
        blobPath: z.string().regex(QUOTE_STORED_PATH).optional(),
      }),
    )
    .min(1)
    .max(30),
  contact: z.object({
    name: z.string().trim().min(1, "กรอกชื่อ").max(120),
    phone: z.string().trim().regex(/^[0-9+\-\s()]{9,20}$/, "เบอร์โทรไม่ถูกต้อง"),
    address: z.string().trim().min(5, "กรอกที่อยู่").max(400),
    province: z.string().trim().min(1, "เลือกจังหวัด").max(120),
    district: z.string().trim().min(1, "เลือกอำเภอ/เขต").max(120),
    subdistrict: z.string().trim().min(1, "เลือกตำบล/แขวง").max(120),
    zip: z.string().trim().regex(/^\d{5}$/, "เลือกตำบล/แขวงเพื่อใส่รหัสไปรษณีย์"),
    lineId: z.string().trim().max(60).optional(),
    wantDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal("")),
  }),
  shipping: z.enum(["parcel", "rider"]),
  keepFiles: z.boolean(),
  estimate: z.object({
    printTHB: z.number().min(0).max(10_000_000).nullable(),
    hours: z.number().min(0).max(100_000).nullable(),
  }),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
