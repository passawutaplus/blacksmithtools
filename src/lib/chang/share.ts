export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function shareText(title: string, text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text });
      return true;
    } catch {
      return false;
    }
  }
  return copyText(text);
}

export function downloadResultPng(opts: {
  title: string;
  headline?: string;
  rows: { label: string; value: string }[];
  tip: string;
  disclaimer?: string;
}): void {
  const pad = 28;
  const lineH = 36;
  const width = 720;
  const extra = opts.headline ? 48 : 0;
  const discLines = opts.disclaimer ? Math.ceil(opts.disclaimer.length / 42) : 0;
  const height = pad * 2 + 72 + extra + opts.rows.length * lineH + 88 + discLines * 20;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#F3EEE4";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#1A1612";
  ctx.fillRect(0, 0, 10, height);

  ctx.fillStyle = "#1A1612";
  ctx.font = "700 28px Prompt, sans-serif";
  ctx.fillText(opts.title, pad + 8, pad + 32);

  ctx.fillStyle = "#C45C26";
  ctx.font = "500 16px Prompt, sans-serif";
  ctx.fillText("Blacksmith · ผู้ช่วยงานช่าง", pad + 8, pad + 58);

  let y = pad + 88;
  if (opts.disclaimer) {
    ctx.fillStyle = "#C45C26";
    ctx.font = "400 13px Prompt, sans-serif";
    y = wrapText(ctx, opts.disclaimer, pad + 8, y, width - pad * 2, 18) + 16;
  }
  if (opts.headline) {
    ctx.fillStyle = "#1A1612";
    ctx.font = "600 22px Prompt, sans-serif";
    wrapText(ctx, opts.headline, pad + 8, y, width - pad * 2, 28);
    y += 48;
  }

  ctx.font = "500 18px Prompt, sans-serif";
  for (const row of opts.rows) {
    ctx.fillStyle = "#5C5348";
    ctx.fillText(row.label, pad + 8, y);
    ctx.fillStyle = "#1A1612";
    ctx.textAlign = "right";
    ctx.fillText(row.value, width - pad, y);
    ctx.textAlign = "left";
    y += lineH;
  }

  y += 12;
  ctx.fillStyle = "#5C5348";
  ctx.font = "400 14px Prompt, sans-serif";
  wrapText(ctx, opts.tip, pad + 8, y, width - pad * 2, 20);

  const a = document.createElement("a");
  a.download = "blacksmith-ผู้ช่วยงานช่าง.png";
  a.href = canvas.toDataURL("image/png");
  a.click();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const chars = [...text];
  let line = "";
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = ch;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
  return y;
}
