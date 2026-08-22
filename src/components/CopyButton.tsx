"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "คัดลอกเลข",
  compact = false,
}: {
  value: string;
  label?: string;
  compact?: boolean;
}) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      window.setTimeout(() => setDone(false), 1600);
    } catch {
      setDone(false);
    }
  }

  if (!value.trim()) return null;

  return (
    <button
      type="button"
      className={cn("btn btn-secondary shrink-0", compact ? "btn-sm mt-0" : "mt-2")}
      onClick={() => void copy()}
    >
      {done ? "คัดลอกแล้ว" : label}
    </button>
  );
}
