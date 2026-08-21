import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from "@/lib/shipping";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("badge", ORDER_STATUS_TONE[status] ?? "bg-gray-100 text-gray-700")}>
      {ORDER_STATUS_LABEL[status] ?? status}
    </span>
  );
}
