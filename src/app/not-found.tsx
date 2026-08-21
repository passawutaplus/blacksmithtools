import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-bs flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="text-sm font-semibold text-forge">404</p>
      <h1 className="mt-2 text-2xl font-black text-navy">ไม่พบหน้านี้</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        ลิงก์นี้อาจเปลี่ยนแล้ว หรือสินค้าถูกลบไป ลองค้นจากหน้าร้านได้
      </p>
      <Link href="/shop" className="btn btn-primary mt-6">
        ไปหน้าสินค้า
      </Link>
    </div>
  );
}
