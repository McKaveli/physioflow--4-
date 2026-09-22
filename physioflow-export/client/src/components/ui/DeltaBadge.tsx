interface DeltaBadgeProps {
  current: number;
  previous?: number;
}

import { getDeltaLabel } from "../../lib/delta";

export function DeltaBadge({ current, previous }: DeltaBadgeProps) {
  const label = getDeltaLabel(current, previous);
  if (!label) return null;

  return (
    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700">
      {label}
    </span>
  );
}
