"use client";

import { useEffect } from "react";

export default function WholesaleRedirect() {
  useEffect(() => {
    window.location.replace("/about#wholesale");
  }, []);

  return <p className="container-bs py-16 text-sm text-muted">กำลังไปหน้าเกี่ยวกับเรา…</p>;
}
