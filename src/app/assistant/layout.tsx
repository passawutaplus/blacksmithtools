import { AssistantChrome } from "@/components/chang/AssistantChrome";

export default function AssistantLayout({ children }: { children: React.ReactNode }) {
  return (
    // chang-scope: ขอบเขตสไตล์ของผู้ช่วยงานช่าง (ดู globals.css) — ลิงก์/ตัวเล็กในนี้ใช้ utility ได้ตามที่เขียน
    <div className="chang-scope bg-white">
      <div className="container-bs py-5 md:py-10">
        <div className="mx-auto max-w-6xl">
          <AssistantChrome />
          {children}
        </div>
      </div>
    </div>
  );
}
