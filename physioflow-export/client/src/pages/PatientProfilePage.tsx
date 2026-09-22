import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Plus } from "lucide-react";
import clsx from "clsx";
import { Card, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Textarea } from "../components/ui/Textarea";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonCard } from "../components/ui/Skeleton";
import { usePatientDetail, useSessionNotes, useCreateSessionNote, usePatientRecoveryLogs, usePatientDischarge, useDischargePatient } from "../features/patients/profile";
import { useTreatmentPlans } from "../features/treatment-plans/hooks";
import { useAppointments } from "../features/appointments/hooks";
import { useConversations, useConversationMessages, useSendMessage } from "../features/messages/hooks";
import { useAuthStore } from "../lib/authStore";
import { getErrorMessage } from "../lib/api";

const STATUS_TONE = { PENDING_ONBOARDING: "attention", ACTIVE: "positive", INACTIVE: "neutral", TREATMENT_COMPLETED: "positive", DISCHARGED: "neutral" } as const;
const APPT_STATUS_TONE: Record<string, "positive" | "attention" | "neutral" | "urgent"> = {
  CONFIRMED: "positive",
  PENDING: "attention",
  COMPLETED: "neutral",
  CANCELLED: "urgent",
  NO_SHOW: "urgent",
};

type Tab = "overview" | "clinical" | "treatment" | "exercises" | "appointments" | "progress" | "sessions" | "messages";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "clinical", label: "Clinical" },
  { key: "treatment", label: "Treatment" },
  { key: "exercises", label: "Exercises" },
  { key: "appointments", label: "Appointments" },
  { key: "progress", label: "Progress" },
  { key: "sessions", label: "Sessions" },
  { key: "messages", label: "Messages" },
];

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between border-b border-border py-2.5 text-sm last:border-0">
      <span className="text-ink-500">{label}</span>
      <span className="text-right font-medium text-ink-900">{value || "—"}</span>
    </div>
  );
}

function OverviewTab({ patientId }: { patientId: string }) {
  const { data: patient } = usePatientDetail(patientId);
  const { data: plans } = useTreatmentPlans({ patientId });
  const { data: appointments } = useAppointments({ patientId });

  const activePlan = plans?.find((p) => p.status === "ACTIVE");
  const nextAppointment = appointments
    ?.filter((a) => new Date(a.startsAt) > new Date() && a.status !== "CANCELLED")
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardContent>
          <h3 className="mb-2 font-semibold text-ink-900">Personal information</h3>
          <InfoRow label="Email" value={patient?.user.email} />
          <InfoRow label="Phone" value={patient?.user.phone} />
          <InfoRow label="Date of birth" value={patient?.dateOfBirth ? format(new Date(patient.dateOfBirth), "MMM d, yyyy") : null} />
          <InfoRow label="Gender" value={patient?.gender} />
          <InfoRow label="Emergency contact" value={patient?.emergencyContact} />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <h3 className="mb-2 font-semibold text-ink-900">Presenting complaint</h3>
          <p className="text-sm text-ink-700">{patient?.presentingComplaint || "Not recorded."}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <h3 className="mb-2 font-semibold text-ink-900">Next appointment</h3>
          {nextAppointment ? (
            <div>
              <p className="font-medium text-ink-900">{format(new Date(nextAppointment.startsAt), "EEEE, MMM d 'at' h:mm a")}</p>
              <p className="text-sm text-ink-500">{nextAppointment.treatmentFocus ?? "General session"}</p>
            </div>
          ) : (
            <p className="text-sm text-ink-500">No upcoming appointment scheduled.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <h3 className="mb-2 font-semibold text-ink-900">Active treatment plan</h3>
          {activePlan ? (
            <div>
              <p className="font-medium text-ink-900">{activePlan.title}</p>
              <p className="text-sm text-ink-500">{activePlan.exerciseAssignments.length} exercises · {activePlan.frequency}</p>
            </div>
          ) : (
            <p className="text-sm text-ink-500">No active treatment plan.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClinicalTab({ patientId }: { patientId: string }) {
  const { data: patient } = usePatientDetail(patientId);
  return (
    <Card>
      <CardContent>
        <InfoRow label="Injury / condition" value={patient?.condition} />
        <InfoRow label="Body area" value={patient?.bodyArea} />
        <InfoRow label="Date of injury" value={patient?.dateOfInjury ? format(new Date(patient.dateOfInjury), "MMM d, yyyy") : null} />
        <InfoRow label="Referring source" value={patient?.referringSource} />
        <div className="pt-3">
          <p className="mb-1 text-sm text-ink-500">Additional notes</p>
          <p className="text-sm text-ink-900">{patient?.intakeNotes || "No additional notes recorded."}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TreatmentTab({ patientId }: { patientId: string }) {
  const { data: plans, isLoading } = useTreatmentPlans({ patientId });
  const { data: patient } = usePatientDetail(patientId);

  if (isLoading) return <SkeletonCard />;
  if (!plans || plans.length === 0) {
    return <EmptyState title="No treatment plans yet" description="Create a treatment plan from the Treatment Plans page to get started." />;
  }

  return (
    <div className="flex flex-col gap-4">
      {plans.map((plan) => {
        const goals: string[] = JSON.parse(plan.goals || "[]");
        return (
          <Card key={plan.id}>
            <CardContent>
              <div className="mb-2 flex items-start justify-between">
                <h3 className="font-medium text-ink-900">{plan.title}</h3>
                <Badge tone={plan.status === "ACTIVE" ? "positive" : "neutral"}>{plan.status.toLowerCase()}</Badge>
              </div>
              <p className="mb-2 text-sm text-ink-700">Goals: {goals.join(", ")}</p>
              <p className="text-xs text-ink-500">
                Assigned by {patient?.primaryPhysio?.user.fullName ?? "—"} · {plan.frequency} · {plan.exerciseAssignments.length} exercises
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ExercisesTab({ patientId }: { patientId: string }) {
  const { data: plans, isLoading } = useTreatmentPlans({ patientId });
  const assignments = plans?.flatMap((p) => p.exerciseAssignments) ?? [];

  if (isLoading) return <SkeletonCard />;
  if (assignments.length === 0) {
    return <EmptyState title="No exercises assigned" description="Assign exercises through a treatment plan." />;
  }

  return (
    <Card>
      <CardContent className="p-0">
        {assignments.map((a) => (
          <div key={a.id} className="flex items-center justify-between border-b border-border px-5 py-3 last:border-0">
            <div>
              <p className="font-medium text-ink-900">{a.exercise.name}</p>
              <p className="text-sm text-ink-500">
                {a.sets && a.reps ? `${a.sets} × ${a.reps}` : ""} {a.durationSec ? `${Math.round(a.durationSec / 60)} min` : ""}
              </p>
            </div>
            <Badge tone="neutral">{a.exercise.bodyArea}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AppointmentsTab({ patientId }: { patientId: string }) {
  const { data: appointments, isLoading } = useAppointments({ patientId });

  if (isLoading) return <SkeletonCard />;
  if (!appointments || appointments.length === 0) {
    return <EmptyState title="No appointments" description="Schedule an appointment from the Appointments calendar." />;
  }

  return (
    <Card>
      <CardContent className="p-0">
        {appointments.map((a) => (
          <div key={a.id} className="flex items-center justify-between border-b border-border px-5 py-3 last:border-0">
            <div>
              <p className="font-medium text-ink-900">{format(new Date(a.startsAt), "EEE, MMM d 'at' h:mm a")}</p>
              <p className="text-sm text-ink-500">{a.treatmentFocus ?? "General session"}</p>
            </div>
            <Badge tone={APPT_STATUS_TONE[a.status] ?? "neutral"}>{a.status.replace("_", " ").toLowerCase()}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ProgressTab({ patientId }: { patientId: string }) {
  const { data: logs, isLoading } = usePatientRecoveryLogs(patientId);

  if (isLoading) return <SkeletonCard />;
  if (!logs || logs.length === 0) {
    return <EmptyState title="No progress data yet" description="Progress appears once the patient starts logging their recovery." />;
  }

  return (
    <Card>
      <CardContent className="p-0">
        {logs.slice(0, 15).map((log) => (
          <div key={log.id} className="flex items-center justify-between border-b border-border px-5 py-3 last:border-0">
            <span className="text-sm font-medium text-ink-900">{format(new Date(log.date), "EEE, MMM d")}</span>
            <div className="flex gap-4 text-xs text-ink-500">
              <span>Pain {log.painLevel ?? "—"}</span>
              <span>Mobility {log.mobility ?? "—"}</span>
              <span>Mood {log.mood ?? "—"}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AddSessionNoteModal({ isOpen, onClose, patientId }: { isOpen: boolean; onClose: () => void; patientId: string }) {
  const [form, setForm] = useState({ summary: "", observations: "", treatmentPerformed: "", patientResponse: "", nextSteps: "" });
  const create = useCreateSessionNote();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({ patientId, ...form });
      onClose();
      setForm({ summary: "", observations: "", treatmentPerformed: "", patientResponse: "", nextSteps: "" });
    } catch {
      // surfaced below
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New session note"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="session-note-form" isLoading={create.isPending}>
            Save note
          </Button>
        </>
      }
    >
      <form id="session-note-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Textarea label="Session summary" required rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
        <Textarea label="Observations" rows={2} value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
        <Textarea label="Treatment performed" rows={2} value={form.treatmentPerformed} onChange={(e) => setForm({ ...form, treatmentPerformed: e.target.value })} />
        <Textarea label="Patient response" rows={2} value={form.patientResponse} onChange={(e) => setForm({ ...form, patientResponse: e.target.value })} />
        <Textarea label="Next steps" rows={2} value={form.nextSteps} onChange={(e) => setForm({ ...form, nextSteps: e.target.value })} />
        {create.isError ? <p className="text-sm text-urgent-700">{getErrorMessage(create.error)}</p> : null}
      </form>
    </Modal>
  );
}

function SessionsTab({ patientId }: { patientId: string }) {
  const { role } = useAuthStore();
  const { data: notes, isLoading } = useSessionNotes(patientId);
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {role === "PHYSIOTHERAPIST" && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setIsAddOpen(true)}>
            <Plus className="size-4" /> New session note
          </Button>
        </div>
      )}
      {isLoading ? (
        <SkeletonCard />
      ) : !notes || notes.length === 0 ? (
        <EmptyState title="No session notes yet" description="Session notes recorded after visits will appear here." />
      ) : (
        notes.map((note) => (
          <Card key={note.id}>
            <CardContent>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-ink-900">{format(new Date(note.date), "EEEE, MMM d, yyyy")}</p>
                <p className="text-xs text-ink-500">{note.physio.user.fullName}</p>
              </div>
              <p className="mb-2 text-sm text-ink-900">{note.summary}</p>
              {note.treatmentPerformed && (
                <p className="text-sm text-ink-700">
                  <span className="text-ink-500">Treatment: </span>
                  {note.treatmentPerformed}
                </p>
              )}
              {note.patientResponse && (
                <p className="text-sm text-ink-700">
                  <span className="text-ink-500">Response: </span>
                  {note.patientResponse}
                </p>
              )}
              {note.nextSteps && (
                <p className="text-sm text-ink-700">
                  <span className="text-ink-500">Next steps: </span>
                  {note.nextSteps}
                </p>
              )}
            </CardContent>
          </Card>
        ))
      )}
      <AddSessionNoteModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} patientId={patientId} />
    </div>
  );
}

function DischargeModal({ patientId, isOpen, onClose }: { patientId: string; isOpen: boolean; onClose: () => void }) {
  const discharge = useDischargePatient();
  const [form, setForm] = useState({ treatmentOutcome: "", finalClinicalNotes: "", treatmentGoalsStatus: "", sessionsCompleted: "0", dischargeReason: "", finalProgress: "", followUpRecommendations: "" });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await discharge.mutateAsync({ patientId, ...form, sessionsCompleted: Number(form.sessionsCompleted) });
    onClose();
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Discharge patient" footer={<><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="discharge-form" isLoading={discharge.isPending}>Complete discharge</Button></>}>
      <form id="discharge-form" onSubmit={submit} className="flex max-h-[65vh] flex-col gap-3 overflow-y-auto">
        <Textarea label="Treatment outcome" required value={form.treatmentOutcome} onChange={(e) => setForm({ ...form, treatmentOutcome: e.target.value })} />
        <Textarea label="Final clinical notes" required value={form.finalClinicalNotes} onChange={(e) => setForm({ ...form, finalClinicalNotes: e.target.value })} />
        <Textarea label="Treatment goals / status" required value={form.treatmentGoalsStatus} onChange={(e) => setForm({ ...form, treatmentGoalsStatus: e.target.value })} />
        <Input label="Sessions completed" type="number" min={0} required value={form.sessionsCompleted} onChange={(e) => setForm({ ...form, sessionsCompleted: e.target.value })} />
        <Textarea label="Discharge reason" required value={form.dischargeReason} onChange={(e) => setForm({ ...form, dischargeReason: e.target.value })} />
        <Textarea label="Final progress" required value={form.finalProgress} onChange={(e) => setForm({ ...form, finalProgress: e.target.value })} />
        <Textarea label="Follow-up recommendations (optional)" value={form.followUpRecommendations} onChange={(e) => setForm({ ...form, followUpRecommendations: e.target.value })} />
        {discharge.isError ? <p className="text-sm text-urgent-700">{getErrorMessage(discharge.error)}</p> : null}
      </form>
    </Modal>
  );
}

function MessagesTab({ patientId }: { patientId: string }) {
  const { data: conversations } = useConversations();
  const conversation = conversations?.find((c) => c.patientId === patientId);
  const { data: messages } = useConversationMessages(conversation?.id ?? null);
  const [draft, setDraft] = useState("");
  const send = useSendMessage(conversation?.id ?? null);
  const { userId } = useAuthStore();

  if (!conversation) {
    return <EmptyState title="No conversation yet" description="Messages with this patient will appear here once one of you sends the first message." />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    send.mutate(draft.trim());
    setDraft("");
  };

  return (
    <Card className="flex h-96 flex-col overflow-hidden">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {(messages ?? []).map((m) => (
          <div key={m.id} className={clsx("flex", m.senderId === userId ? "justify-end" : "justify-start")}>
            <div
              className={clsx(
                "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                m.senderId === userId ? "bg-brand-800 text-white" : "bg-surface-sunken text-ink-900"
              )}
            >
              {m.body}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full border border-border-strong bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />
        <Button type="submit" size="sm" disabled={!draft.trim()}>
          Send
        </Button>
      </form>
    </Card>
  );
}

export function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [isDischargeOpen, setIsDischargeOpen] = useState(false);
  const { role } = useAuthStore();
  const { data: discharge } = usePatientDischarge(id);
  const { data: patient, isLoading, isError, refetch } = usePatientDetail(id);

  if (isLoading) return <SkeletonCard />;
  if (isError || !patient || !id) return <ErrorState message="We couldn't load this patient." onRetry={() => refetch()} />;

  return (
    <div className="flex flex-col gap-6">
      <button onClick={() => navigate(-1)} className="flex w-fit items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft className="size-4" /> Back
      </button>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-full bg-brand-100 text-xl font-semibold text-brand-800">
          {patient.user.fullName.charAt(0)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-ink-900">{patient.user.fullName}</h1>
            <Badge tone={STATUS_TONE[patient.status]}>{patient.status.replace("_", " ").toLowerCase()}</Badge>
          </div>
          <p className="text-sm text-ink-500">
            {patient.patientCode} {patient.condition ? `· ${patient.condition}` : ""}
          </p>
        </div>
        {role === "PHYSIOTHERAPIST" && !discharge && patient.status !== "DISCHARGED" ? <Button onClick={() => setIsDischargeOpen(true)}>Discharge patient</Button> : null}
      </div>
      {discharge ? <Card><CardContent><p className="text-sm font-semibold text-ink-900">Discharged {format(new Date(discharge.dischargedAt), "MMM d, yyyy")} by {discharge.physio.user.fullName}</p><p className="mt-1 text-sm text-ink-500">{discharge.treatmentOutcome}</p></CardContent></Card> : null}

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium",
              tab === t.key ? "border-brand-800 text-brand-800" : "border-transparent text-ink-500 hover:text-ink-900"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab patientId={id} />}
      {tab === "clinical" && <ClinicalTab patientId={id} />}
      {tab === "treatment" && <TreatmentTab patientId={id} />}
      {tab === "exercises" && <ExercisesTab patientId={id} />}
      {tab === "appointments" && <AppointmentsTab patientId={id} />}
      {tab === "progress" && <ProgressTab patientId={id} />}
      {tab === "sessions" && <SessionsTab patientId={id} />}
      {tab === "messages" && <MessagesTab patientId={id} />}
      <DischargeModal patientId={id} isOpen={isDischargeOpen} onClose={() => setIsDischargeOpen(false)} />
    </div>
  );
}
