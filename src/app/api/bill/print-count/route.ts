import { NextResponse } from "next/server";
import { getOrderByToken, incrementPrintCount } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { token?: string };
    const token = String(body.token ?? "").trim();
    if (!token) {
      return NextResponse.json({ error: "ไม่พบบิล" }, { status: 400 });
    }
    const detail = await getOrderByToken(token);
    if (!detail?.document) {
      return NextResponse.json({ error: "ยังไม่มีบิลเงินสด" }, { status: 404 });
    }
    const document = await incrementPrintCount(detail.document.id);
    return NextResponse.json({ ok: true, printCount: document.printCount });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "นับครั้งพิมพ์ไม่สำเร็จ" },
      { status: 400 },
    );
  }
}
