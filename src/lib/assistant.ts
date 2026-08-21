import "server-only";
import { getOrderByNumberAndPhone } from "@/lib/db";
import { formatTHB } from "@/lib/utils";
import { ORDER_STATUS_LABEL, carrierLabel } from "@/lib/shipping";
import type { AssistantReply, ChatMessage } from "@/lib/chat-types";

export type { AssistantReply, ChatMessage } from "@/lib/chat-types";

const BILL_RE = /BS-\d{6}-\d{3,}/i;
const PHONE_RE = /(?:\+66|0)[\d\s-]{8,14}/;

function extractBill(text: string) {
  return text.match(BILL_RE)?.[0]?.toUpperCase() ?? null;
}

function extractPhone(text: string) {
  const raw = text.match(PHONE_RE)?.[0];
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9) return null;
  return digits.startsWith("66") ? `0${digits.slice(2)}` : digits;
}

function allUserText(messages: ChatMessage[]) {
  return messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");
}

function lastUser(messages: ChatMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return "";
}

function includesAny(text: string, words: string[]) {
  return words.some((w) => text.includes(w));
}

export async function replyToChat(messages: ChatMessage[]): Promise<AssistantReply> {
  const last = lastUser(messages).trim();
  const blob = allUserText(messages);
  const lower = last.toLowerCase();

  const bill = extractBill(blob);
  const phone = extractPhone(blob);
  const askingOrder = includesAny(lower, [
    "ติดตามออเดอร์",
    "ตามออเดอร์",
    "ออเดอร์",
    "ออเดอ",
    "พัสดุ",
    "แทรก",
    "เลขบิล",
    "ตามของ",
    "ของถึง",
    "track",
    "order",
  ]);

  if (bill && phone) {
    const detail = await getOrderByNumberAndPhone(bill, phone);
    if (!detail) {
      return {
        text: `ไม่พบออเดอร์ ${bill} ที่เบอร์นี้ ตรวจเลขบิลกับเบอร์ที่ใช้สั่งอีกครั้ง หรือกด LINE มุมบน`,
        links: [{ href: "/track", label: "ค้นหาที่หน้าตามพัสดุ" }],
        showMenu: true,
      };
    }
    const { order, shipments } = detail;
    const ship = shipments[0];
    const shipLine = ship
      ? `\nขนส่ง: ${carrierLabel(ship.carrier)}${ship.trackingNo ? ` · ${ship.trackingNo}` : ""}`
      : "";
    const items = order.items.map((i) => `• ${i.name} × ${i.quantity}`).join("\n");
    return {
      text: `พบบิล ${order.number}\nสถานะ: ${ORDER_STATUS_LABEL[order.status] ?? order.status}\nยอดรวม: ${formatTHB(order.grandTotal)}${shipLine}\n\n${items}\n\nเปิดบิลออนไลน์เพื่อดูรายละเอียด จ่ายเงิน หรือตามพัสดุได้เลย`,
      links: [{ href: `/bill/${order.token}`, label: `เปิดบิล ${order.number}` }],
      showMenu: true,
    };
  }

  if (askingOrder || bill || (phone && includesAny(lower, ["ออเดอร์", "บิล", "พัสดุ", "ติดตาม"]))) {
    if (bill && !phone) {
      return {
        text: `รับเลขบิล ${bill} แล้ว ส่งเบอร์โทรที่ใช้สั่งซื้อมาได้เลย เช่น 0812345678`,
        showMenu: true,
      };
    }
    if (phone && !bill) {
      return {
        text: "รับเบอร์แล้ว ส่งเลขบิลมาด้วย เช่น BS-260821-0001 (อยู่บนบิลหรืออีเมลยืนยัน)",
        showMenu: true,
      };
    }
    return {
      text: "ส่งเลขบิลกับเบอร์โทรที่ใช้สั่งมาในแชทนี้ได้เลย เช่น\nBS-260821-0001\n0812345678",
      links: [{ href: "/track", label: "หรือกรอกที่หน้าตามพัสดุ" }],
      showMenu: true,
    };
  }

  if (includesAny(lower, ["สอบถามเพิ่มเติม"])) {
    return {
      text: "พิมพ์คำถามมาได้เลย หรือกดปุ่ม LINE มุมบนเพื่อคุยกับร้านโดยตรง",
      showMenu: true,
    };
  }

  if (lower === "อื่นๆ" || lower === "อื่น ๆ") {
    return {
      text: "เลือกเรื่องอื่นได้จากลิงก์ด้านล่าง หรือกด LINE มุมบนถ้าอยากคุยกับคน",
      links: [
        { href: "/shop", label: "ดูสินค้าทั้งหมด" },
        { href: "/about#wholesale", label: "ขายส่ง" },
        { href: "/contact", label: "ติดต่อร้าน" },
      ],
      showMenu: true,
    };
  }

  if (includesAny(lower, ["line", "ไลน์", "แอดไลน์", "qr"])) {
    return {
      text: "กดปุ่ม LINE มุมบนได้เลย ส่งไฟล์พิมพ์ 3D หรือรูปเคลมในแชทร้าน",
      showQr: true,
      showMenu: true,
    };
  }

  if (includesAny(lower, ["3d", "3ดี", "พิมพ์ 3d", "พิมพ์3d", "ปริ้น", "print"])) {
    return {
      text: "รับพิมพ์ 3D สองหมวด: FDM เส้นด้านบนของหน้า และ SLA เรซิ่นด้านล่าง ร้านคุยรายละเอียด ตรวจไฟล์ ช่วยจัดไฟล์ให้พร้อมพิมพ์ก่อนเสนอราคา จากนั้นมัดจำหรือจ่ายเต็มแล้วจึงพิมพ์ ส่งขนส่งทั่วไปฟรี เดลิเวอรี่ด่วนลูกค้าออกเอง งานมีปัญหาพิมพ์แก้ส่งใหม่",
      links: [
        { href: "/custom-print", label: "ดูบริการพิมพ์ 3D" },
        { href: "/warranty", label: "เงื่อนไขรับประกัน" },
      ],
      showMenu: true,
    };
  }

  if (includesAny(lower, ["ขายส่ง", "ตัวแทน", "นำไปขาย", "wholesale", "dealer"])) {
    return {
      text: "เปิดรับร้านที่อยากนำสินค้าแบรนด์ BlackSmith ไปขาย กรอกข้อมูลในหน้าเกี่ยวกับเรา หรือทัก LINE มุมบน",
      links: [{ href: "/about#wholesale", label: "ขายส่งในหน้าเกี่ยวกับเรา" }],
      showMenu: true,
    };
  }

  if (includesAny(lower, ["เคลม", "รับประกัน", "แตก", "หัก", "เสีย"])) {
    return {
      text: "งาน 3D มีรับประกันตามเงื่อนไขร้าน กด LINE มุมบน เลือกเมนูแจ้งปัญหา แล้วส่งรูป ร้านพิจารณาประมาณ 1–2 วัน",
      links: [{ href: "/warranty", label: "วิธีเคลม" }],
      showMenu: true,
    };
  }

  if (
    includesAny(lower, [
      "milwaukee",
      "มิลวอก",
      "dewalt",
      "dewatt",
      "ดีวอล",
      "makita",
      "มากีต้า",
      "bosch",
      "บอช",
      "packout",
      "tstak",
      "goop",
      "สินค้า",
      "ซื้อ",
    ])
  ) {
    return {
      text: "เราทำอุปกรณ์เสริมให้เข้ากับเครื่องมือยี่ห้อดัง และสินค้าแบรนด์ BlackSmith เช่น GoopOrange",
      links: [
        { href: "/shop", label: "ดูสินค้าทั้งหมด" },
        { href: "/shop/milwaukee", label: "อุปกรณ์สำหรับ Milwaukee" },
      ],
      showMenu: true,
    };
  }

  return {
    text: "เลือกจากเมนูได้เลย หรือพิมพ์คำถามมา ถ้าต้องการคุยกับคน กด LINE มุมบน",
    showMenu: true,
  };
}
