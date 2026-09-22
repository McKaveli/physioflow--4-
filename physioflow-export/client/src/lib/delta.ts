export function getDeltaLabel(current: number, previous?: number): string | null {
  if (previous == null) return null;
  if (current === 0) return "—";
  if (previous === 0) return "New";
  const change = Math.round(((current - previous) / previous) * 100);
  return `${change > 0 ? "+" : ""}${change}%`;
}
