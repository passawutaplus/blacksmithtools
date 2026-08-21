"use client";

import { useState } from "react";
import { Copy, MessageCircle } from "lucide-react";

export function PrintQuoteForm({
  lineUrl,
  lineId,
}: {
  lineUrl: string;
  lineId: string;
}) {
  const [title, setTitle] = useState("");
  const [fileState, setFileState] = useState("มีไฟล์ STL / 3MF");
  const [fileLink, setFileLink] = useState("");
  const [material, setMaterial] = useState("FDM PLA (เส้น)");
  const [color, setColor] = useState("FDM ดำ");
  const [qty, setQty] = useState("1");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  const message = [
    "ขอราคาพิมพ์ 3D",
    title ? `งาน: ${title}` : "",
    `ไฟล์: ${fileState}`,
    fileLink ? `ลิงก์ไฟล์: ${fileLink}` : "",
    `วัสดุ: ${material}`,
    `สี: ${color}`,
    `จำนวน: ${qty}`,
    contact ? `ติดต่อกลับ: ${contact}` : "",
    note ? `รายละเอียด: ${note}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
    if (lineUrl) window.open(lineUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <form id="quote" onSubmit={submit} className="card space-y-4 p-5 scroll-mt-24">
      <div className="flex items-start gap-2">
        <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-forge" aria-hidden />
        <div>
          <p className="font-semibold text-navy">ขอราคาพิมพ์ 3D</p>
          <p className="mt-1 text-sm text-muted">
            กดส่งแล้วข้อความจะถูกคัดลอก เปิด LINE {lineId} แล้ววางส่งได้ทันที
            ร้านตรวจไฟล์ก่อนเสนอราคา มัดจำหรือจ่ายเต็มก่อนขึ้นเครื่อง
          </p>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="pq-title">
          ชื่องาน / ใช้ทำอะไร
        </label>
        <input
          id="pq-title"
          className="input"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="เช่น ที่เก็บแบต M18 ติดผนัง"
        />
      </div>
      <div>
        <label className="label" htmlFor="pq-file">
          มีไฟล์ไหม
        </label>
        <select
          id="pq-file"
          className="input"
          value={fileState}
          onChange={(e) => setFileState(e.target.value)}
        >
          <option>มีไฟล์ STL / 3MF</option>
          <option>มีไฟล์ OBJ / STEP</option>
          <option>มีแค่รูป / ขนาด</option>
          <option>อยากให้ร้านออกแบบ</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="pq-link">
          ลิงก์ไฟล์ (ถ้ามี)
        </label>
        <input
          id="pq-link"
          className="input"
          value={fileLink}
          onChange={(e) => setFileLink(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="pq-material">
            วัสดุ
          </label>
          <select
            id="pq-material"
            className="input"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
          >
            <option>FDM PLA (เส้น)</option>
            <option>FDM PETG (เส้น)</option>
            <option>FDM TPU (เส้นยืด)</option>
            <option>SLA เรซิ่นมาตรฐาน</option>
            <option>SLA เรซิ่นทนกระแทก</option>
            <option>ยังไม่แน่ใจ ให้ร้านแนะนำ</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pq-color">
            สีที่อยากได้
          </label>
          <select id="pq-color" className="input" value={color} onChange={(e) => setColor(e.target.value)}>
            <option value="FDM ดำ">FDM ดำ</option>
            <option value="FDM เทา">FDM เทา</option>
            <option value="FDM ส้มร้าน">FDM ส้มร้าน</option>
            <option value="FDM เหลือง">FDM เหลือง</option>
            <option value="FDM ขาว">FDM ขาว</option>
            <option value="FDM เขียว">FDM เขียว</option>
            <option value="SLA ขาว">SLA ขาว</option>
            <option value="SLA สีเนื้อ">SLA สีเนื้อ</option>
            <option>ให้ร้านแนะนำตามที่มี</option>
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="pq-qty">
            จำนวน
          </label>
          <input
            id="pq-qty"
            className="input"
            inputMode="numeric"
            required
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="pq-contact">
            เบอร์โทร หรือ LINE
          </label>
          <input
            id="pq-contact"
            className="input"
            required
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="pq-note">
          รายละเอียดเพิ่มเติม
        </label>
        <textarea
          id="pq-note"
          className="input min-h-24"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn-primary w-full sm:w-auto">
        <Copy className="h-4 w-4" aria-hidden />
        คัดลอกแล้วเปิด LINE
      </button>
      {copied ? <p className="text-sm text-forge">คัดลอกข้อความแล้ว — วางในแชท LINE ได้เลย</p> : null}
    </form>
  );
}
