"use client";

import { useState } from "react";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function sheetsToPdf(sheets: HTMLElement[], filename: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);
  if (document.fonts?.ready) await document.fonts.ready;

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "p" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    sheet.scrollIntoView({ block: "nearest" });
    const canvas = await html2canvas(sheet, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      scrollX: 0,
      scrollY: 0,
      ignoreElements: (el) => el.classList.contains("no-print"),
      onclone(clonedDoc, cloned) {
        cloned.style.boxShadow = "none";
        clonedDoc.querySelectorAll(".no-print").forEach((el) => el.remove());
      },
    });
    const img = canvas.toDataURL("image/png");
    const imgH = (canvas.height * pageW) / canvas.width;
    if (i > 0) pdf.addPage();
    if (imgH <= pageH + 2) {
      pdf.addImage(img, "PNG", 0, 0, pageW, Math.min(imgH, pageH), undefined, "FAST");
      continue;
    }
    let y = 0;
    let remaining = imgH;
    pdf.addImage(img, "PNG", 0, 0, pageW, imgH, undefined, "FAST");
    remaining -= pageH;
    while (remaining > 0.8) {
      y -= pageH;
      pdf.addPage();
      pdf.addImage(img, "PNG", 0, y, pageW, imgH, undefined, "FAST");
      remaining -= pageH;
    }
  }

  saveBlob(pdf.output("blob"), filename);
}

export function DownloadPdfButton({
  filename,
  targetSelector = "[data-a4-invoice]",
}: {
  filename: string;
  targetSelector?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pdfName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;

  async function download() {
    setError("");
    const sheets = [...document.querySelectorAll<HTMLElement>(targetSelector)];
    if (sheets.length === 0) {
      setError("ไม่พบบิลที่จะโหลด — รีเฟรชหน้าแล้วลองใหม่");
      return;
    }

    setBusy(true);
    const prevShadow = sheets.map((el) => el.style.boxShadow);
    sheets.forEach((el) => {
      el.style.boxShadow = "none";
    });
    try {
      await sheetsToPdf(sheets, pdfName);
    } catch (err) {
      console.error(err);
      setError("โหลด PDF ไม่สำเร็จ — ลองอีกครั้ง");
    } finally {
      sheets.forEach((el, i) => {
        el.style.boxShadow = prevShadow[i] ?? "";
      });
      setBusy(false);
    }
  }

  return (
    <span className="no-print inline-flex flex-col items-start gap-1">
      <button type="button" className="btn btn-navy" onClick={() => void download()} disabled={busy}>
        {busy ? "กำลังโหลด PDF..." : "โหลด PDF"}
      </button>
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </span>
  );
}
