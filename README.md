# BlackSmith Tools — Ecommerce

ร้านออนไลน์แบรนด์ **BlackSmith Tools & Supplies**  
Tagline: *Tools Designed for Simpler Work*

โปรเจกต์แยกที่ `F:\blacksmith-tools` (ไม่ได้อยู่ใน AunAun-fresh)

## สแต็ก

- Next.js App Router + TypeScript + Tailwind CSS 4
- ข้อมูลเดโม่: JSON store ใน `data/runtime/` (สร้างอัตโนมัติ)
- Schema Supabase พร้อมใน `supabase/migrations/`
- ชำระเงิน: Mock + โอน/สลิป + PromptPay stub + Payso adapter (ปิดจนกว่ามี merchant)

## เริ่มต้น

```bash
cd F:\blacksmith-tools
cp .env.example .env.local
npm install
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

หลังร้าน: [http://localhost:3000/admin](http://localhost:3000/admin) — เข้าได้เลย ไม่มีรหัส

## ฟีเจอร์หลัก

- แคตตาล็อกตามยี่ห้อที่เข้ากันได้ (Milwaukee, Dewalt, Makita, Bosch, Osuka, …)
- ตะกร้า drawer, checkout แขก, บิลออนไลน์ `/bill/[token]`
- บิลเงินสดอัตโนมัติเมื่อชำระแล้ว + หน้าพิมพ์ใส่กล่อง
- สถานะ packing → shipped (ใส่เลขแทรก) → delivered
- ปุ่มซื้อบน Shopee/Lazada/TikTok ในหน้าสินค้า (ซ่อนถ้าไม่มี URL)
- Header/Footer เรฟ UX ร้านเครื่องมือ + หน้า privacy/terms/cookies/pdpa + cookie banner
- SEO: metadata, JSON-LD Product, sitemap, robots
- Security headers + rate-minded slip upload (MIME + magic bytes)
- ผู้ช่วยงานช่าง `/assistant` — 13 สายงาน 72 เครื่องมือคำนวณ ([หลักการและมาตรฐานที่ใช้](docs/assistant-formula-principles.md))

## Payso

ตั้งค่าใน `.env.local` เมื่อได้บัญชี:

```
PAYMENTS_LIVE=true
PAYSO_MERCHANT_ID=...
PAYSO_SECRET=...
```

Webhook: `POST /api/payments/payso/webhook`

## GitHub + Supabase

- GitHub: https://github.com/passawutaplus/blacksmithtools
- Supabase project: `zkflkpbmbozrchqncpzi`
- Dashboard: https://supabase.com/dashboard/project/zkflkpbmbozrchqncpzi

โปรเจกต์ Supabase นี้มีข้อมูล Solo/AunAun อยู่แล้ว — ร้าน BlackSmith ยังใช้ไฟล์ JSON ใน `data/runtime/` เป็นหลัก จนกว่าจะแยก schema/โปรเจกต์ใหม่

เปิดโฟลเดอร์ร้านใน Cursor: เปิดไฟล์ `AunAun.code-workspace` (มีทั้ง AunAun-fresh และ blacksmith-tools ใน sidebar)

## หมายเหตุ

- ห้ามนำไฟล์ API/secret จากโฟลเดอร์ `F:\BlackSmith\#CHAT BOT` เข้า git
- โลโก้ CI จาก `#New branding` สามารถวางใน `public/brand/` ทีหลัง
- ลิงก์ TikTok / Facebook / ที่อยู่จริง แก้ใน `site_settings` (หลังร้านหรือ `db.json`)
