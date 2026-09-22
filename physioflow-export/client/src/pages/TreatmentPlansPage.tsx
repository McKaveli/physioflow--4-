import { useState } from "react";
import { format } from "date-fns";
import { Plus, ClipboardList, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonCard } from "../components/ui/Skeleton";
import { useTreatmentPlans, useCreateTreatmentPlan, useAssignTreatmentPlan } from "../features/treatment-plans/hooks";
import type { TreatmentPlanStatus } from "../features/treatment-plans/hooks";
import { usePatientsList } from "../features/patients/directory";
import { useExercises } from "../features/exercises/hooks";
import { useCurrentUser } from "../features/auth/hooks";
import { getErrorMessage } from "../lib/api";
import clsx from "clsx";

const STATUS_TONE: Record<TreatmentPlanStatus, "positive" | "attention" | "neutral"> = {
  ACTIVE: "positive",
  DRAFT: "attention",
  COMPLETED: "neutral",
  ARCHIVED: "neutral",
};

const GOAL_OPTIONS = ["Improve strength", "Improve mobility", "Improve balance", "Increase range of motion", "Reduce discomfort"];

interface WizardExercise {
  exerciseId: string;
  name: string;
  sets: string;
  reps: string;
  durationSec: string;
}

function BuilderWizard({ isOpen, onClose, physioId }: { isOpen: boolean; onClose: () => void; physioId: string }) {
  const [step, setStep] = useState(1);
  const [patientId, setPatientId] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState("Daily");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [durationWeeks, setDurationWeeks] = useState("4");
  const [exercisesInPlan, setExercisesInPlan] = useState<WizardExercise[]>([]);

  const { data: patients } = usePatientsList({ physioId });
  const { data: exerciseLibrary } = useExercises({});
  const create = useCreateTreatmentPlan();
  const assign = useAssignTreatmentPlan();

  const selectedPatient = patients?.find((p) => p.id === patientId);

  const toggleGoal = (goal: string) => {
    setGoals((prev) => (prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]));
  };

  const addExercise = (exerciseId: string) => {
    const exercise = exerciseLibrary?.find((e) => e.id === exerciseId);
    if (!exercise || exercisesInPlan.some((e) => e.exerciseId === exerciseId)) return;
    setExercisesInPlan((prev) => [
      ...prev,
      {
        exerciseId,
        name: exercise.name,
        sets: exercise.defaultSets?.toString() ?? "",
        reps: exercise.defaultReps?.toString() ?? "",
        durationSec: exercise.defaultDurationSec?.toString() ?? "",
      },
    ]);
  };

  const removeExercise = (exerciseId: string) => setExercisesInPlan((prev) => prev.filter((e) => e.exerciseId !== exerciseId));

  const reset = () => {
    setStep(1);
    setPatientId("");
    setGoals([]);
    setTitle("");
    setFrequency("Daily");
    setExercisesInPlan([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAssign = async () => {
    try {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + Number(durationWeeks) * 7);

      const plan = await create.mutateAsync({
        patientId,
        physioId,
        title,
        goals,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        frequency,
        status: "DRAFT",
        exerciseInputs: exercisesInPlan.map((e) => ({
          exerciseId: e.exerciseId,
          sets: e.sets ? Number(e.sets) : undefined,
          reps: e.reps ? Number(e.reps) : undefined,
          durationSec: e.durationSec ? Number(e.durationSec) : undefined,
        })),
      });
      await assign.mutateAsync(plan.id);
      handleClose();
    } catch {
      // surfaced below
    }
  };

  const canProceed = [!!patientId, goals.length > 0, exercisesInPlan.length > 0, true][step - 1];
  const stepTitles = ["Choose patient", "Define recovery goals", "Build exercise program", "Review & assign"];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`${stepTitles[step - 1]} (${step}/4)`}>
      <div className="flex flex-col gap-4">
        {step === 1 && (
          <Select label="Patient" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            <option value="">Select a patient</option>
            {patients?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.user.fullName} {p.condition ? `— ${p.condition}` : ""}
              </option>
            ))}
          </Select>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <Input label="Plan title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 4-Week Knee Rehabilitation Plan" />
            <div>
              <p className="mb-2 text-sm font-medium text-ink-700">Recovery goals</p>
              <div className="flex flex-wrap gap-2">
                {GOAL_OPTIONS.map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => toggleGoal(goal)}
                    className={clsx(
                      "rounded-full border px-3 py-1.5 text-sm font-medium",
                      goals.includes(goal) ? "border-brand-700 bg-brand-50 text-brand-800" : "border-border-strong text-ink-700"
                    )}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <Select label="Add exercise from library" value="" onChange={(e) => addExercise(e.target.value)}>
              <option value="">Select an exercise to add</option>
              {exerciseLibrary?.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.bodyArea})
                </option>
              ))}
            </Select>
            {exercisesInPlan.length === 0 ? (
              <p className="text-sm text-ink-500">No exercises added yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {exercisesInPlan.map((ex) => (
                  <div key={ex.exerciseId} className="flex items-center gap-2 rounded-[var(--radius-control)] border border-border p-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink-900">{ex.name}</p>
                      <div className="mt-1 flex gap-2">
                        <input
                          className="w-16 rounded border border-border-strong px-2 py-1 text-xs"
                          placeholder="Sets"
                          value={ex.sets}
                          onChange={(e) =>
                            setExercisesInPlan((prev) => prev.map((p) => (p.exerciseId === ex.exerciseId ? { ...p, sets: e.target.value } : p)))
                          }
                        />
                        <input
                          className="w-16 rounded border border-border-strong px-2 py-1 text-xs"
                          placeholder="Reps"
                          value={ex.reps}
                          onChange={(e) =>
                            setExercisesInPlan((prev) => prev.map((p) => (p.exerciseId === ex.exerciseId ? { ...p, reps: e.target.value } : p)))
                          }
                        />
                      </div>
                    </div>
                    <button onClick={() => removeExercise(ex.exerciseId)} className="text-ink-400 hover:text-urgent-500">
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <Select label="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                <option>Daily</option>
                <option>3x/week</option>
                <option>Weekly</option>
              </Select>
              <Input label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <Input label="Duration (weeks)" type="number" min={1} value={durationWeeks} onChange={(e) => setDurationWeeks(e.target.value)} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-3 rounded-[var(--radius-control)] bg-surface-sunken p-4">
            <h3 className="font-semibold text-ink-900">{title || "Untitled plan"}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-ink-500">Patient</p>
                <p className="font-medium text-ink-900">{selectedPatient?.user.fullName}</p>
              </div>
              <div>
                <p className="text-ink-500">Duration</p>
                <p className="font-medium text-ink-900">
                  {format(new Date(startDate), "MMM d")} → +{durationWeeks} weeks
                </p>
              </div>
              <div>
                <p className="text-ink-500">Goal</p>
                <p className="font-medium text-ink-900">{goals.join(", ")}</p>
              </div>
              <div>
                <p className="text-ink-500">Exercises</p>
                <p className="font-medium text-ink-900">{exercisesInPlan.length}</p>
              </div>
              <div>
                <p className="text-ink-500">Frequency</p>
                <p className="font-medium text-ink-900">{frequency}</p>
              </div>
            </div>
            {(create.isError || assign.isError) && (
              <p className="text-sm text-urgent-700">{getErrorMessage(create.error ?? assign.error)}</p>
            )}
          </div>
        )}

        <div className="mt-2 flex justify-between">
          <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
            <ChevronLeft className="size-4" /> Back
          </Button>
          {step < 4 ? (
            <Button size="sm" onClick={() => setStep((s) => s + 1)} disabled={!canProceed}>
              Next <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleAssign} isLoading={create.isPending || assign.isPending}>
              Assign treatment plan
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function TreatmentPlansPage() {
  const { data: me } = useCurrentUser();
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const physioId = me?.physiotherapist?.id;

  const { data, isLoading, isError, refetch } = useTreatmentPlans({ physioId });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Treatment Plans</h1>
          <p className="mt-1 text-ink-500">Build and manage recovery programs for your patients.</p>
        </div>
        {physioId ? (
          <Button onClick={() => setIsBuilderOpen(true)}>
            <Plus className="size-4" /> New plan
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <SkeletonCard />
      ) : isError ? (
        <ErrorState message="We couldn't load treatment plans." onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-6" />}
          title="No treatment plans yet"
          description="Create your first recovery plan and assign exercises to a patient."
          actionLabel={physioId ? "Create treatment plan" : undefined}
          onAction={physioId ? () => setIsBuilderOpen(true) : undefined}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((plan) => {
            const goals: string[] = JSON.parse(plan.goals || "[]");
            return (
              <Card key={plan.id}>
                <CardContent>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="font-medium text-ink-900">{plan.title}</h3>
                    <Badge tone={STATUS_TONE[plan.status]}>{plan.status.toLowerCase()}</Badge>
                  </div>
                  <p className="mb-3 text-sm text-ink-500">{plan.patient?.user.fullName}</p>
                  <p className="mb-3 text-sm text-ink-700">{goals.join(", ")}</p>
                  <p className="text-xs text-ink-500">
                    {plan.exerciseAssignments.length} exercises · {plan.frequency}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {physioId ? <BuilderWizard isOpen={isBuilderOpen} onClose={() => setIsBuilderOpen(false)} physioId={physioId} /> : null}
    </div>
  );
}
