export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatLink {
  href: string;
  label: string;
  external?: boolean;
}

export interface AssistantReply {
  text: string;
  links?: ChatLink[];
  showQr?: boolean;
  quickReplies?: string[];
  showMenu?: boolean;
}

export const CHAT_MENU = [
  "ติดตามออเดอร์",
  "พิมพ์ 3D",
  "เคลมสินค้า",
  "สอบถามเพิ่มเติม",
  "อื่นๆ",
] as const;
