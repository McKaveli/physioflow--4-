import { format, isSameDay } from "date-fns";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { getPatientColor } from "../../lib/patientColor";
import type { Appointment } from "../../features/appointments/hooks";

const START_HOUR = 8;
const END_HOUR = 18;
const ROW_HEIGHT = 64; // px per hour

interface CalendarGridProps {
  days: Date[];
  appointments: Appointment[];
  selectedAppointmentId: string | null;
  onSelectAppointment: (appt: Appointment) => void;
  onAppointmentDrop?: (appointment: Appointment, startsAt: Date) => void;
  onAppointmentResize?: (appointment: Appointment, startsAt: Date, endsAt: Date) => void;
}

function minutesFromGridStart(date: Date) {
  return (date.getHours() - START_HOUR) * 60 + date.getMinutes();
}

type ResizeEdge = "left" | "right" | "top" | "bottom";
type ResizeState = { appointment: Appointment; edge: ResizeEdge; dayIndex: number };

export function CalendarGrid({
  days,
  appointments,
  selectedAppointmentId,
  onSelectAppointment,
  onAppointmentDrop,
  onAppointmentResize,
}: CalendarGridProps) {
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const gridHeight = (END_HOUR - START_HOUR) * ROW_HEIGHT;
  const dayColumnsRef = useRef<HTMLDivElement>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [resizePreview, setResizePreview] = useState<{ startsAt: Date; endsAt: Date } | null>(null);

  useEffect(() => {
    if (!resizeState || !onAppointmentResize) return;

    const originalStart = new Date(resizeState.appointment.startsAt);
    const originalEnd = new Date(resizeState.appointment.endsAt);
    const handlePointerMove = (event: PointerEvent) => {
      const startsAt = resizePreview?.startsAt ?? originalStart;
      const endsAt = resizePreview?.endsAt ?? originalEnd;
      const nextStart = new Date(startsAt);
      const nextEnd = new Date(endsAt);
      const columns = dayColumnsRef.current;
      const columnRect = columns?.getBoundingClientRect();

      if ((resizeState.edge === "left" || resizeState.edge === "right") && columnRect) {
        const columnWidth = columnRect.width / days.length;
        const nextDayIndex = Math.max(0, Math.min(days.length - 1, Math.floor((event.clientX - columnRect.left) / columnWidth)));
        const nextDay = days[nextDayIndex];
        if (resizeState.edge === "left") {
          nextStart.setFullYear(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate());
          if (nextStart.getTime() > nextEnd.getTime() - 15 * 60 * 1000) return;
        } else {
          nextEnd.setFullYear(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate());
          if (nextEnd.getTime() < nextStart.getTime() + 15 * 60 * 1000) return;
        }
      } else {
        const column = columns?.querySelector(`[data-calendar-day-index="${resizeState.dayIndex}"]`);
        const rect = column?.getBoundingClientRect();
        if (!rect) return;
        const minutes = Math.max(
          0,
          Math.min((END_HOUR - START_HOUR) * 60, Math.round(((event.clientY - rect.top) / ROW_HEIGHT) * 60 / 15) * 15)
        );
        const nextTime = new Date(originalStart);
        nextTime.setHours(START_HOUR + Math.floor(minutes / 60), minutes % 60, 0, 0);
        if (resizeState.edge === "top") {
          if (nextTime.getTime() >= nextEnd.getTime() - 15 * 60 * 1000) return;
          nextStart.setTime(nextTime.getTime());
        } else {
          const nextTimeEnd = new Date(originalEnd);
          nextTimeEnd.setHours(START_HOUR + Math.floor(minutes / 60), minutes % 60, 0, 0);
          if (nextTimeEnd.getTime() <= nextStart.getTime() + 15 * 60 * 1000) return;
          nextEnd.setTime(nextTimeEnd.getTime());
        }
      }

      setResizePreview({ startsAt: nextStart, endsAt: nextEnd });
    };

    const handlePointerUp = () => {
      if (resizePreview) {
        onAppointmentResize(resizeState.appointment, resizePreview.startsAt, resizePreview.endsAt);
      }
      setResizeState(null);
      setResizePreview(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [days, onAppointmentResize, resizePreview, resizeState]);

  const beginResize = (event: React.PointerEvent, appointment: Appointment, edge: ResizeEdge, dayIndex: number) => {
    if (!onAppointmentResize) return;
    event.preventDefault();
    event.stopPropagation();
    setResizePreview({ startsAt: new Date(appointment.startsAt), endsAt: new Date(appointment.endsAt) });
    setResizeState({ appointment, edge, dayIndex });
  };

  return (
    <div className="flex overflow-x-auto bg-surface-raised">
      {/* Time labels column */}
      <div className="w-20 shrink-0 border-r border-border bg-surface-sunken/40 pt-[4.5rem]">
        {hours.map((h) => (
          <div key={h} style={{ height: ROW_HEIGHT }} className="relative -translate-y-2 text-right text-[11px] font-medium text-ink-400">
            <span className="pr-3">{format(new Date(2000, 0, 1, h), "h:mm a")}</span>
          </div>
        ))}
      </div>

      {/* Day columns */}
      <div ref={dayColumnsRef} className="flex min-w-[700px] flex-1">
        {days.map((day, dayIndex) => {
          const isToday = isSameDay(day, new Date());
          const dayAppointments = appointments.filter((a) => {
            const previewStart = resizeState?.appointment.id === a.id && resizePreview ? resizePreview.startsAt : new Date(a.startsAt);
            return isSameDay(previewStart, day);
          });

          return (
            <div key={day.toISOString()} data-calendar-day-index={dayIndex} className={clsx("flex-1 border-l border-border", isToday && "bg-brand-50/35")}>
              <div className="sticky top-0 z-10 flex flex-col items-center gap-1 border-b border-border bg-surface-raised/95 py-2.5 backdrop-blur">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">{format(day, "EEE")}</span>
                <span
                  className={clsx(
                    "flex size-8 items-center justify-center rounded-full text-sm font-semibold",
                    isToday ? "bg-brand-800 text-white shadow-sm" : "text-ink-900"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="relative" style={{ height: gridHeight }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
                const id = event.dataTransfer.getData("appointment-id");
                const appointment = appointments.find((item) => item.id === id);
                if (!appointment || !onAppointmentDrop) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const minutes = Math.max(0, Math.min((END_HOUR - START_HOUR) * 60, Math.round(((event.clientY - rect.top) / ROW_HEIGHT) * 60 / 15) * 15));
                onAppointmentDrop(appointment, new Date(day.getFullYear(), day.getMonth(), day.getDate(), START_HOUR + Math.floor(minutes / 60), minutes % 60));
              }}>
                {hours.slice(0, -1).map((h) => (
                  <div key={h} className="border-b border-border/80 odd:bg-surface-sunken/20" style={{ height: ROW_HEIGHT }} />
                ))}
                {dayAppointments.map((appt) => {
                  const preview = resizePreview && resizeState?.appointment.id === appt.id ? resizePreview : null;
                  const start = preview?.startsAt ?? new Date(appt.startsAt);
                  const end = preview?.endsAt ?? new Date(appt.endsAt);
                  const top = Math.max(0, (minutesFromGridStart(start) / 60) * ROW_HEIGHT);
                  const height = Math.max(28, ((end.getTime() - start.getTime()) / 1000 / 60 / 60) * ROW_HEIGHT - 2);
                  const visibleDaySpan = Math.max(
                    1,
                    days.filter((visibleDay) => visibleDay >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) && visibleDay <= new Date(end.getFullYear(), end.getMonth(), end.getDate())).length
                  );
                  const color = getPatientColor(appt.patientId);
                  const isSelected = appt.id === selectedAppointmentId;

                  return (
                    <div
                      key={appt.id}
                      role="button"
                      tabIndex={0}
                      draggable={!!onAppointmentDrop}
                      onDragStart={(event) => event.dataTransfer.setData("appointment-id", appt.id)}
                      onClick={() => onSelectAppointment(appt)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") onSelectAppointment(appt);
                      }}
                      style={{
                        top,
                        height,
                        width: visibleDaySpan > 1 ? `calc(${visibleDaySpan * 100}% - 0.75rem)` : undefined,
                        right: visibleDaySpan > 1 ? "auto" : undefined,
                      }}
                      className={clsx(
                        "absolute left-1.5 right-1.5 overflow-hidden rounded-lg border-l-[3px] px-2.5 py-1.5 text-left text-xs shadow-sm transition-all hover:-translate-y-px hover:shadow-md",
                        color.bg,
                        color.border,
                        color.text,
                        isSelected && "ring-2 ring-brand-700"
                      )}
                    >
                      {onAppointmentResize ? (
                        <>
                          <span onPointerDown={(event) => beginResize(event, appt, "left", dayIndex)} className="absolute inset-y-0 left-0 z-10 w-2 cursor-ew-resize" aria-label="Resize appointment start day" />
                          <span onPointerDown={(event) => beginResize(event, appt, "right", dayIndex)} className="absolute inset-y-0 right-0 z-10 w-2 cursor-ew-resize" aria-label="Resize appointment end day" />
                          <span onPointerDown={(event) => beginResize(event, appt, "top", dayIndex)} className="absolute inset-x-2 top-0 z-10 h-2 cursor-ns-resize" aria-label="Resize appointment start time" />
                          <span onPointerDown={(event) => beginResize(event, appt, "bottom", dayIndex)} className="absolute inset-x-2 bottom-0 z-10 h-2 cursor-ns-resize" aria-label="Resize appointment end time" />
                        </>
                      ) : null}
                      <p className="truncate font-medium">
                        {format(start, "h:mm")}–{format(end, "h:mm a")}
                      </p>
                      <p className="truncate font-semibold">{appt.patient.user.fullName}</p>
                      <p className="truncate opacity-80">{appt.treatmentFocus ?? "Session"}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
