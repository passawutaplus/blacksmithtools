import { AssistantHome } from "@/components/chang/AssistantHome";

export const metadata = {
  alternates: { canonical: "/assistant" },
  title: "ผู้ช่วยงานช่าง",
  description:
    "เครื่องมือคำนวณงานช่างในเว็บ BlackSmith — แอร์ ไฟ ประปา กระเบื้อง ก่ออิฐ สี เหล็ก หลังคา ใช้ฟรี ไม่ต้องสมัคร",
};

export default function AssistantPage() {
  return <AssistantHome />;
}
