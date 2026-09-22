import type { HTMLAttributes } from "react";
import clsx from "clsx";

type Tone = "neutral" | "positive" | "attention" | "urgent" | "brand";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-ink-700",
  positive: "bg-positive-50 text-positive-700",
  attention: "bg-attention-50 text-attention-700",
  urgent: "bg-urgent-50 text-urgent-700",
  brand: "bg-brand-100 text-brand-800",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", toneClasses[tone], className)}
      {...props}
    />
  );
}
