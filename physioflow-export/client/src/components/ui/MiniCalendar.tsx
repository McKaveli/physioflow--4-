import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, isSameMonth, isSameDay } from "date-fns";
import clsx from "clsx";

interface MiniCalendarProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
}

export function MiniCalendar({ selectedDate, onSelect }: MiniCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(selectedDate));

  const gridStart = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 });

  const days: Date[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-900">{format(visibleMonth, "MMMM yyyy")}</p>
        <div className="flex gap-1">
          <button onClick={() => setVisibleMonth((m) => addMonths(m, -1))} className="rounded p-1 text-ink-400 hover:bg-surface-sunken hover:text-ink-900">
            <ChevronLeft className="size-3.5" />
          </button>
          <button onClick={() => setVisibleMonth((m) => addMonths(m, 1))} className="rounded p-1 text-ink-400 hover:bg-surface-sunken hover:text-ink-900">
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-[11px]">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="font-medium text-ink-400">
            {d}
          </span>
        ))}
        {days.map((day) => {
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, selectedDate);
          const inMonth = isSameMonth(day, visibleMonth);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelect(day)}
              className={clsx(
                "mx-auto flex size-7 items-center justify-center rounded-full",
                isSelected ? "bg-brand-800 font-semibold text-white" : isToday ? "font-semibold text-brand-700" : inMonth ? "text-ink-700" : "text-ink-300",
                !isSelected && "hover:bg-surface-sunken"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
