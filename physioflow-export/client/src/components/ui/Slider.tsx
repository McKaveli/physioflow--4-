import { useId } from "react";

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  lowLabel?: string;
  highLabel?: string;
}

export function Slider({ label, value, onChange, min = 0, max = 10, lowLabel, highLabel }: SliderProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-ink-700">
          {label}
        </label>
        <span className="text-sm font-semibold text-brand-800">{value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-brand-100 accent-brand-700"
      />
      {(lowLabel || highLabel) && (
        <div className="flex justify-between text-xs text-ink-400">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  );
}
