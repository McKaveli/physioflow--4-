import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek, addDays, addWeeks } from "date-fns";
import { Plus, CalendarDays, ChevronLeft, ChevronRight, Search, User as UserIcon, Clock, Stethoscope, Hash, Maximize2, Minimize2 } from "lucide-react";
import clsx from "clsx";
import { Card, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Textarea } from "../components/ui/Textarea";
import { Modal } from "../components/ui/Modal";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonCard } from "../components/ui/Skeleton";
import { MiniCalendar } from "../components/ui/MiniCalendar";
import { CalendarGrid } from "../app/calendar/CalendarGrid";
import { MonthGrid } from "../app/calendar/MonthGrid";
import {
  useAppointments,
  useScheduleAppointment,
  useUpdateAppointmentStatus,
  useRescheduleAppointment,
  useCancelAppointment,
  useCreateRescheduleRequest,
} from "../features/appointments/hooks";
import type { Appointment, AppointmentStatus } from "../features/appointments/hooks";
import { usePatientsList } from "../features/patients/directory";
import { useClinicPhysios } from "../features/physiotherapists/clinicDirectory";
import { useCurrentUser } from "../features/auth/hooks";
import { useAuthStore } from "../lib/authStore";
import { getErrorMessage } from "../lib/api";
import { getPatientColor } from "../lib/patientColor";

const STATUS_TONE: Record<AppointmentStatus, "positive" | "attention" | "neutral" | "urgent"> = {
  CONFIRMED: "positive",
  PENDING: "attention",
  COMPLETED: "neutral",
  CANCELLED: "urgent",
  NO_SHOW: "urgent",
};

type ViewMode = "day" | "week" | "month";

function ExpandableCalendarCard({ children }: { children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isExpanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isExpanded]);

  return (
    <Card
      className={clsx(
        "overflow-hidden",
        isExpanded && "fixed inset-3 z-50 flex min-h-0 flex-col shadow-2xl ring-1 ring-brand-200/70"
      )}
    >
      <div className="flex items-center justify-end border-b border-border bg-surface-raised px-3 py-2">
        <button
          type="button"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          aria-label={isExpanded ? "Collapse calendar" : "Expand calendar"}
          title={isExpanded ? "Collapse calendar" : "Expand calendar"}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-control)] text-ink-500 transition hover:bg-surface-sunken hover:text-ink-900"
        >
          {isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>
      </div>
      <CardContent className={clsx("min-h-0 p-0", isExpanded && "flex-1 overflow-auto")}>{children}</CardContent>
    </Card>
  );
}

function ScheduleAppointmentModal({ isOpen, onClose, physioId }: { isOpen: boolean; onClose: () => void; physioId: string }) {
  const { data: patients } = usePatientsList({});
  const [patientId, setPatientId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [treatmentFocus, setTreatmentFocus] = useState("");
  const schedule = useScheduleAppointment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !date || !time) return;
    const startsAt = new Date(`${date}T${time}:00`);
    const endsAt = new Date(startsAt.getTime() + 45 * 60 * 1000);
    try {
      await schedule.mutateAsync({ patientId, physioId, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), treatmentFocus });
      onClose();
      setPatientId("");
      setDate("");
      setTime("");
      setTreatmentFocus("");
    } catch {
      // surfaced below
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule appointment"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="schedule-appointment-form" isLoading={schedule.isPending}>
            Schedule appointment
          </Button>
        </>
      }
    >
      <form id="schedule-appointment-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Select label="Patient" required value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          <option value="">Select a patient</option>
          {patients?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.user.fullName} {p.condition ? `— ${p.condition}` : ""}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label="Time" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <Input
          label="Appointment type / focus"
          placeholder="e.g. Follow-up session"
          value={treatmentFocus}
          onChange={(e) => setTreatmentFocus(e.target.value)}
        />
        {schedule.isError ? <p className="text-sm text-urgent-700">{getErrorMessage(schedule.error)}</p> : null}
        <p className="text-xs text-ink-500">Sessions are 45 minutes. The patient will be notified once scheduled.</p>
      </form>
    </Modal>
  );
}

function RescheduleModal({
  isOpen,
  onClose,
  appointment,
  requestedStart,
  requestedEnd,
}: {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  requestedStart?: Date | null;
  requestedEnd?: Date | null;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const reschedule = useRescheduleAppointment();
  useEffect(() => {
    if (requestedStart) {
      setDate(format(requestedStart, "yyyy-MM-dd"));
      setTime(format(requestedStart, "HH:mm"));
    }
  }, [requestedStart]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointment || !date || !time) return;
    const startsAt = new Date(`${date}T${time}:00`);
    const endsAt = requestedEnd
      ? new Date(requestedEnd)
      : new Date(startsAt.getTime() + (new Date(appointment.endsAt).getTime() - new Date(appointment.startsAt).getTime()));
    try {
      await reschedule.mutateAsync({ id: appointment.id, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() });
      onClose();
    } catch {
      // surfaced below
    }
  };

  if (!appointment) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reschedule appointment"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="reschedule-form" isLoading={reschedule.isPending}>
            Confirm new time
          </Button>
        </>
      }
    >
      <form id="reschedule-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-ink-500">
          Currently {format(new Date(appointment.startsAt), "EEEE, MMM d 'at' h:mm a")} with {appointment.patient.user.fullName}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="New date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label="New time" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        {requestedEnd ? (
          <p className="text-sm text-ink-500">
            New end time: <span className="font-medium text-ink-900">{format(requestedEnd, "EEEE, MMM d 'at' h:mm a")}</span>
          </p>
        ) : null}
        {reschedule.isError ? <p className="text-sm text-urgent-700">{getErrorMessage(reschedule.error)}</p> : null}
      </form>
    </Modal>
  );
}

function DetailPanel({ appointment, onReschedule }: { appointment: Appointment | null; onReschedule: () => void }) {
  const navigate = useNavigate();
  const updateStatus = useUpdateAppointmentStatus();
  const cancel = useCancelAppointment();

  if (!appointment) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-ink-500">Select an appointment to see its details.</p>
        </CardContent>
      </Card>
    );
  }

  const color = getPatientColor(appointment.patientId);
  const durationMin = Math.round((new Date(appointment.endsAt).getTime() - new Date(appointment.startsAt).getTime()) / 60000);
  const isFinal = appointment.status === "COMPLETED" || appointment.status === "CANCELLED";

  return (
    <Card>
      <CardContent>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Appointment details</p>
        <div className="mb-3 flex items-center gap-2">
          <Badge tone={STATUS_TONE[appointment.status]}>{appointment.status.replace("_", " ").toLowerCase()}</Badge>
        </div>
        <h3 className="text-lg font-semibold text-ink-900">{appointment.patient.user.fullName}</h3>
        <p className={clsx("text-sm font-medium", color.text)}>{appointment.treatmentFocus ?? "General session"}</p>

        <div className="mt-4 flex flex-col gap-2.5 border-t border-border pt-4 text-sm">
          <div className="flex items-center gap-2 text-ink-700">
            <CalendarDays className="size-4 text-ink-400" />
            {format(new Date(appointment.startsAt), "EEEE, MMM d, yyyy")}
          </div>
          <div className="flex items-center gap-2 text-ink-700">
            <Clock className="size-4 text-ink-400" />
            {format(new Date(appointment.startsAt), "h:mm a")} – {format(new Date(appointment.endsAt), "h:mm a")} ({durationMin} min)
          </div>
          <div className="flex items-center gap-2 text-ink-700">
            <Stethoscope className="size-4 text-ink-400" />
            {appointment.physio.user.fullName}
          </div>
          {appointment.patient.patientCode ? (
            <div className="flex items-center gap-2 text-ink-700">
              <Hash className="size-4 text-ink-400" />
              {appointment.patient.patientCode}
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/patients?q=${encodeURIComponent(appointment.patient.user.fullName)}`)}
          >
            <UserIcon className="size-4" /> View patient
          </Button>
          {!isFinal && (
            <>
              {appointment.status === "CONFIRMED" && (
                <Button size="sm" onClick={() => updateStatus.mutate({ id: appointment.id, status: "COMPLETED" })} isLoading={updateStatus.isPending}>
                  Mark completed
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={onReschedule}>
                Reschedule
              </Button>
              <Button variant="ghost" size="sm" className="text-urgent-700" isLoading={cancel.isPending} onClick={() => cancel.mutate(appointment.id)}>
                Cancel appointment
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StaffCalendar() {
  const { data: me } = useCurrentUser();
  const { data: physios } = useClinicPhysios();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [physioFilter, setPhysioFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [requestedStart, setRequestedStart] = useState<Date | null>(null);
  const [requestedEnd, setRequestedEnd] = useState<Date | null>(null);

  const { data, isLoading, isError, refetch } = useAppointments(physioFilter ? { physioId: physioFilter } : {});

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const daysToShow = viewMode === "day" ? [selectedDate] : weekDays;

  const filtered = (data ?? []).filter((a) => {
    if (statusFilter && a.status !== statusFilter) return false;
    if (search) {
      const term = search.toLowerCase();
      if (!a.patient.user.fullName.toLowerCase().includes(term) && !(a.treatmentFocus ?? "").toLowerCase().includes(term)) return false;
    }
    return true;
  });

  const rangeLabel =
    viewMode === "day"
      ? format(selectedDate, "MMMM d, yyyy")
      : viewMode === "week"
      ? `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "d, yyyy")}`
      : format(selectedDate, "MMMM yyyy");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Appointments</h1>
          <p className="mt-1 text-ink-500">Manage your clinical schedule.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients or appointments..."
              className="w-64 rounded-[var(--radius-control)] border border-border-strong bg-white py-2 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
          </div>
          {me?.physiotherapist ? (
            <Button onClick={() => setIsScheduleOpen(true)}>
              <Plus className="size-4" /> Schedule appointment
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setSelectedDate(new Date())}>
            Today
          </Button>
          <button
            onClick={() => setSelectedDate((d) => (viewMode === "day" ? addDays(d, -1) : addWeeks(d, -1)))}
            className="rounded p-1.5 text-ink-500 hover:bg-surface-sunken"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => setSelectedDate((d) => (viewMode === "day" ? addDays(d, 1) : addWeeks(d, 1)))}
            className="rounded p-1.5 text-ink-500 hover:bg-surface-sunken"
          >
            <ChevronRight className="size-4" />
          </button>
          <p className="text-sm font-semibold text-ink-900">{rangeLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <Select label="Physiotherapist" hideLabel value={physioFilter} onChange={(e) => setPhysioFilter(e.target.value)} wrapperClassName="w-44">
            <option value="">All physiotherapists</option>
            {physios?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.user.fullName}
              </option>
            ))}
          </Select>
          <Select label="Status" hideLabel value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} wrapperClassName="w-36">
            <option value="">All statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No-show</option>
          </Select>
          <div className="flex overflow-hidden rounded-[var(--radius-control)] border border-border-strong">
            {(["day", "week", "month"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={clsx(
                  "px-3 py-1.5 text-sm font-medium capitalize",
                  viewMode === mode ? "bg-brand-800 text-white" : "bg-white text-ink-700 hover:bg-surface-sunken"
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <SkeletonCard />
      ) : isError ? (
        <ErrorState message="We couldn't load the calendar." onRetry={() => refetch()} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <ExpandableCalendarCard>
              {viewMode === "month" ? (
                <MonthGrid
                  visibleMonth={selectedDate}
                  appointments={filtered}
                  onSelectDay={(day) => {
                    setSelectedDate(day);
                    setViewMode("day");
                  }}
                />
              ) : (
                <CalendarGrid
                  days={daysToShow}
                  appointments={filtered}
                  selectedAppointmentId={selectedAppointment?.id ?? null}
                  onSelectAppointment={setSelectedAppointment}
                  onAppointmentDrop={(appointment, startsAt) => {
                    setSelectedAppointment(appointment);
                    setRequestedStart(startsAt);
                    setRequestedEnd(null);
                    setIsRescheduleOpen(true);
                  }}
                  onAppointmentResize={(appointment, startsAt, endsAt) => {
                    setSelectedAppointment(appointment);
                    setRequestedStart(startsAt);
                    setRequestedEnd(endsAt);
                    setIsRescheduleOpen(true);
                  }}
                />
              )}
          </ExpandableCalendarCard>

          <div className="flex flex-col gap-4">
            <Card>
              <CardContent>
                <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate} />
              </CardContent>
            </Card>
            <DetailPanel appointment={selectedAppointment} onReschedule={() => setIsRescheduleOpen(true)} />
          </div>
        </div>
      )}

      {me?.physiotherapist ? (
        <ScheduleAppointmentModal isOpen={isScheduleOpen} onClose={() => setIsScheduleOpen(false)} physioId={me.physiotherapist.id} />
      ) : null}
      <RescheduleModal
        isOpen={isRescheduleOpen}
        onClose={() => {
          setIsRescheduleOpen(false);
          setRequestedStart(null);
          setRequestedEnd(null);
        }}
        appointment={selectedAppointment}
        requestedStart={requestedStart}
        requestedEnd={requestedEnd}
      />
    </div>
  );
}

function PatientRescheduleModal({ appointment, startsAt, onClose }: { appointment: Appointment | null; startsAt: Date | null; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const request = useCreateRescheduleRequest();
  if (!appointment || !startsAt) return null;
  return (
    <Modal isOpen onClose={onClose} title="Request appointment change" footer={<><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="patient-reschedule-form" isLoading={request.isPending}>Submit request</Button></>}>
      <form id="patient-reschedule-form" className="flex flex-col gap-4" onSubmit={async (event) => {
        event.preventDefault();
        if (!reason.trim()) return;
        await request.mutateAsync({ appointmentId: appointment.id, requestedDate: startsAt.toISOString(), preferredTimeNote: startsAt.toISOString(), reason: reason.trim() });
        onClose();
      }}>
        <p className="text-sm text-ink-500">New time: <span className="font-medium text-ink-900">{format(startsAt, "EEEE, MMM d 'at' h:mm a")}</span></p>
        <Textarea label="Reason for rescheduling" required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Tell your clinic why you need a different time." />
        {request.isError ? <p className="text-sm text-urgent-700">{getErrorMessage(request.error)}</p> : null}
      </form>
    </Modal>
  );
}

function PatientAppointmentsList() {
  const { data, isLoading, isError, refetch } = useAppointments();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [requestedStartsAt, setRequestedStartsAt] = useState<Date | null>(null);

  if (isLoading) return <SkeletonCard />;
  if (isError) return <ErrorState message="We couldn't load your appointments." onRetry={() => refetch()} />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="size-6" />}
        title="No appointments yet"
        description="Your physiotherapist will schedule your next visit — it'll show up here."
      />
    );
  }

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = viewMode === "day" ? [selectedDate] : Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink-900">{format(selectedDate, viewMode === "month" ? "MMMM yyyy" : "MMM d, yyyy")}</p>
        <div className="flex overflow-hidden rounded-[var(--radius-control)] border border-border-strong">
          {(["day", "week", "month"] as ViewMode[]).map((mode) => <button key={mode} onClick={() => setViewMode(mode)} className={clsx("px-3 py-1.5 text-sm font-medium capitalize", viewMode === mode ? "bg-brand-800 text-white" : "bg-white text-ink-700")}>{mode}</button>)}
        </div>
      </div>
      <ExpandableCalendarCard>
        {viewMode === "month" ? <MonthGrid visibleMonth={selectedDate} appointments={data} onSelectDay={(day) => { setSelectedDate(day); setViewMode("day"); }} /> :
          <CalendarGrid days={days} appointments={data} selectedAppointmentId={null} onSelectAppointment={setDraggedAppointment} onAppointmentDrop={(appointment, startsAt) => { setDraggedAppointment(appointment); setRequestedStartsAt(startsAt); }} />}
      </ExpandableCalendarCard>
      <p className="text-xs text-ink-500">Drag an appointment to request a new time. Your current appointment stays unchanged until clinic staff approve the request.</p>
      <PatientRescheduleModal appointment={requestedStartsAt ? draggedAppointment : null} startsAt={requestedStartsAt} onClose={() => { setDraggedAppointment(null); setRequestedStartsAt(null); }} />
    </div>
  );
}

export function AppointmentsPage() {
  const { role } = useAuthStore();

  if (role === "PATIENT") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Appointments</h1>
          <p className="mt-1 text-ink-500">Appointments scheduled by your care team.</p>
        </div>
        <PatientAppointmentsList />
      </div>
    );
  }

  return <StaffCalendar />;
}
