import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

export function InventoryAlertBanner({ lowStockCount, outOfStockCount }: { lowStockCount: number; outOfStockCount: number }) {
  const total = lowStockCount + outOfStockCount;
  if (total === 0) return null;

  return (
    <Link
      to="/inventory"
      className="flex items-center gap-2 rounded-[var(--radius-control)] border border-attention-500/30 bg-attention-50 px-4 py-3 text-sm text-attention-700 transition-colors hover:bg-attention-50/70"
    >
      <AlertTriangle className="size-4 shrink-0" />
      <span className="flex-1">
        {total} item{total === 1 ? "" : "s"} running low.
      </span>
      <span className="font-medium underline">Review inventory</span>
    </Link>
  );
}
