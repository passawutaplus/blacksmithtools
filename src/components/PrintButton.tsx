"use client";

export function PrintButton({
  label = "พิมพ์ใส่กล่อง",
  token,
  filename,
}: {
  label?: string;
  token?: string;
  filename?: string;
}) {
  function print() {
    const prev = document.title;
    if (filename) document.title = filename.replace(/\.pdf$/i, "");
    if (token) {
      void fetch("/api/bill/print-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }).catch(() => undefined);
    }
    const restore = () => {
      document.title = prev;
    };
    window.addEventListener("afterprint", restore, { once: true });
    window.print();
  }

  return (
    <button type="button" className="btn btn-primary no-print" onClick={print}>
      {label}
    </button>
  );
}
