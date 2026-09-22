interface ProgressRingProps {
  percent: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  dark?: boolean;
}

export function ProgressRing({ percent, size = 128, strokeWidth = 10, label, dark = false }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${clamped}%${label ? ` ${label}` : ""}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} stroke="#dff1ee" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke="#0f6b70"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={dark ? "text-3xl font-semibold text-white" : "text-3xl font-semibold text-ink-900"}>{clamped}%</span>
        {label ? <span className={dark ? "text-xs font-semibold text-white" : "text-xs text-ink-500"}>{label}</span> : null}
      </div>
    </div>
  );
}
