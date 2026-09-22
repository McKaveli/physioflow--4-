import { forwardRef, useId } from "react";
import type { TextareaHTMLAttributes } from "react";
import clsx from "clsx";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, error, hint, className, id, ...props }, ref) => {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={textareaId} className="text-sm font-medium text-ink-700">
        {label}
      </label>
      <textarea
        ref={ref}
        id={textareaId}
        className={clsx(
          "rounded-[var(--radius-control)] border bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-brand-500",
          error ? "border-urgent-500" : "border-border-strong",
          className
        )}
        {...props}
      />
      {hint && !error ? <p className="text-xs text-ink-500">{hint}</p> : null}
      {error ? <p className="text-xs text-urgent-700">{error}</p> : null}
    </div>
  );
});
Textarea.displayName = "Textarea";
