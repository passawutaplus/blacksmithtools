import { NextResponse } from "next/server";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { z } from "zod";
import { createWholesaleLead } from "@/lib/db";
import { notifyShop } from "@/lib/notify";

const schema = z.object({
  shopName: z.string().min(2).max(80),
  province: z.string().min(2).max(40),
  channel: z.enum(["ร้านหน้าร้าน", "Shopee / Lazada", "อู่ / โรงงาน", "อื่น ๆ"]),
  contact: z.string().min(5).max(80),
  note: z.string().max(1000).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  if (rateLimited(`wholesale:${clientIp(req)}`, 3, 10 * 60_000)) {
    return NextResponse.json({ error: "ส่งข้อมูลบ่อยเกินไป รอสักครู่แล้วลองใหม่" }, { status: 429 });
  }
  try {
    const json = await req.json();
    const data = schema.parse(json);
    const lead = await createWholesaleLead(data);
    notifyShop(`🤝 ลูกค้าขายส่งใหม่ ${lead.number}\n${data.shopName} · ${data.province}\n${data.channel} · ${data.contact}`);
    return NextResponse.json({ ok: true, number: lead.number });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "กรอกข้อมูลให้ครบ" }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "ส่งไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
