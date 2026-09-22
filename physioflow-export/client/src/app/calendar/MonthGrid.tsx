import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from "date-fns";
import clsx from "clsx";
import { getPatientColor } from "../../lib/patientColor";
import type { Appointment } from "../../features/appointments/hooks";

interface MonthGridProps {
  visibleMonth: Date;
  appointments: Appointment[];
  onSelectDay: (date: Date) => void;
}

export function MonthGrid({ visibleMonth, appointments, onSelectDay }: MonthGridProps) {
  const gridStart = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 });

  const days: Date[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-control)] border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-surface-sunken text-center text-xs font-medium text-ink-500">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const inMonth = isSameMonth(day, visibleMonth);
          const isToday = isSameDay(day, new Date());
          const dayAppointments = appointments.filter((a) => isSameDay(new Date(a.startsAt), day));

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={clsx(
                "flex min-h-24 flex-col items-start gap-1 border-b border-r border-border p-2 text-left hover:bg-surface-sunken",
                !inMonth && "bg-surface-sunken/40"
              )}
            >
              <span
                className={clsx(
                  "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  isToday ? "bg-brand-800 text-white" : inMonth ? "text-ink-900" : "text-ink-300"
                )}
              >
                {format(day, "d")}
              </span>
              <div className="flex flex-wrap gap-0.5">
                {dayAppointments.slice(0, 4).map((a) => (
                  <span key={a.id} className={clsx("size-1.5 rounded-full", getPatientColor(a.patientId).border.replace("border-", "bg-"))} />
                ))}
                {dayAppointments.length > 4 && <span className="text-[10px] text-ink-400">+{dayAppointments.length - 4}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
