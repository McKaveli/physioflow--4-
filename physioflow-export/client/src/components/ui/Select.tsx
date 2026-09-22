import { forwardRef, useId } from "react";
import type { SelectHTMLAttributes } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  hideLabel?: boolean;
  wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, hideLabel, wrapperClassName, className, id, children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;

    return (
      <div className={clsx("flex flex-col gap-1.5", wrapperClassName)}>
        <label htmlFor={selectId} className={clsx("text-sm font-medium text-ink-700", hideLabel && "sr-only")}>
          {label}
        </label>
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={clsx(
              "w-full appearance-none rounded-[var(--radius-control)] border border-border-strong bg-white px-3.5 py-2.5 pr-9 text-sm text-ink-900",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-brand-500",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
        </div>
        {hint ? <p className="text-xs text-ink-500">{hint}</p> : null}
      </div>
    );
  }
);
Select.displayName = "Select";
