import { CalendarDays, MessageCircle, TrendingUp, TrendingDown, Dumbbell, BellRing } from "lucide-react";
import { format, isToday } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ProgressRing } from "../components/ui/ProgressRing";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonCard } from "../components/ui/Skeleton";
import { usePatientDashboard } from "../features/patients/hooks";
import { useCompleteExercise } from "../features/exercises/hooks";
import { useAuthStore } from "../lib/authStore";
import type { TodayExercise } from "../features/patients/api";
import { useMyRecoveryLogs } from "../features/recovery/hooks";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatDuration(sec: number | null) {
  if (!sec) return null;
  const min = Math.round(sec / 60);
  return `${min} min`;
}

function ExerciseRow({ exercise }: { exercise: TodayExercise }) {
  const complete = useCompleteExercise();
  const navigate = useNavigate();
  const isDone = exercise.state === "COMPLETED";
  const isInProgress = exercise.state === "IN_PROGRESS";

  const meta = [
    exercise.sets && exercise.reps ? `${exercise.sets} × ${exercise.reps}` : null,
    formatDuration(exercise.durationSec),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-0">
      <div className="min-w-0">
        <p className="font-medium text-ink-900">{exercise.exerciseName}</p>
        <p className="text-sm text-ink-500">{meta || "See instructions"}</p>
      </div>
      {isDone ? (
        <Badge tone="positive">Completed ✓</Badge>
      ) : (
        <Button
          size="sm"
          variant={isInProgress ? "primary" : "secondary"}
          isLoading={complete.isPending}
          onClick={() => navigate(`/exercises?exerciseId=${encodeURIComponent(exercise.exerciseId)}&assignmentId=${encodeURIComponent(exercise.id)}`)}
        >
          {isInProgress ? "Continue" : "Start"}
        </Button>
      )}
    </div>
  );
}

export function PatientHomePage() {
  const { fullName } = useAuthStore();
  const { data, isLoading, isError, refetch } = usePatientDashboard();
  const { data: recoveryLogs, isLoading: recoveryLogsLoading } = useMyRecoveryLogs();
  const needsRecoveryLog = !recoveryLogs?.some((log) => isToday(new Date(log.date)));

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState message="We couldn't load your recovery plan." onRetry={() => refetch()} />;
  }

  const firstName = fullName?.split(" ")[0] ?? "there";
  const totalMinutes = data.todaysExercises.reduce((sum, e) => sum + (e.durationSec ? e.durationSec / 60 : 3), 0);
  const hasRecoveryData = recoveryLogs != null && recoveryLogs.length > 0;

  return (
    <div className="flex flex-col gap-7">
      {needsRecoveryLog ? (
        <Link to="/recovery" className="flex min-h-11 items-center justify-between gap-4 rounded-[1.5rem] border border-[#6c5ce7]/30 bg-[#6c5ce7] px-5 py-4 text-white shadow-[0_18px_45px_-24px_rgb(108_92_231_/_0.9)]">
          <span className="flex items-center gap-3"><BellRing className="size-5 shrink-0" /><span><strong className="block">Log your recovery today</strong><span className="text-sm text-white/90">A quick check-in helps your care team track progress.</span></span></span>
          <span className="shrink-0 rounded-full bg-black px-3 py-2 text-xs font-semibold">Log now</span>
        </Link>
      ) : null}

      <div className="flex items-center gap-3 rounded-2xl bg-white/70 p-2">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-800 text-lg font-semibold text-white shadow-[0_0_0_5px_var(--color-brand-100)]">
          {firstName.charAt(0)}
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Your care plan</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink-900">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-ink-500">Let's keep your recovery moving.</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {/* Recovery hero */}
        <Card className="overflow-hidden border-brand-800 bg-brand-950 text-white md:col-span-1">
          <CardContent className="flex flex-col items-center text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">Recovery status</p>
            {recoveryLogsLoading ? (
              <div className="flex size-32 items-center justify-center rounded-full border-[10px] border-brand-800 text-xs text-brand-200" role="status">
                Loading recovery data…
              </div>
            ) : hasRecoveryData ? (
              <ProgressRing percent={data.recoveryPct} label="on track" dark />
            ) : (
              <div className="flex min-h-32 max-w-52 flex-col items-center justify-center text-center">
                <p className="text-sm font-semibold text-white">No recovery data yet</p>
                <p className="mt-1 text-xs text-brand-200">Log your first check-in to see progress.</p>
              </div>
            )}
            {data.recoveryTrend !== 0 && (
              <div
                className={`mt-4 flex items-center gap-1 text-sm font-medium ${
                  data.recoveryTrend > 0 ? "text-positive-500" : "text-attention-500"
                }`}
              >
                {data.recoveryTrend > 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                {data.recoveryTrend > 0 ? "+" : ""}
                {data.recoveryTrend}% this week
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's recovery */}
        <Card className="md:col-span-2">
          <CardContent>
            <div className="mb-1 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">Today</p>
                <h2 className="mt-1 text-lg font-semibold text-ink-900">Your recovery session</h2>
              </div>
              <Dumbbell className="size-5 text-brand-500" />
            </div>
            <p className="mb-2 text-sm text-ink-500">
              {data.todaysExercises.length} exercises · {Math.round(totalMinutes)} minutes
            </p>
            {data.todaysExercises.length === 0 ? (
              <EmptyState
                title="No exercises assigned yet"
                description="Your physiotherapist hasn't assigned your first exercise plan."
              />
            ) : (
              <div>
                {data.todaysExercises.map((ex) => (
                  <ExerciseRow key={ex.id} exercise={ex} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Upcoming appointment */}
        <Card>
          <CardContent>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand-100"><CalendarDays className="size-4 text-brand-700" /></span>
              <h2 className="font-semibold text-ink-900">Next appointment</h2>
            </div>
            {data.upcomingAppointment ? (
              <div>
                <p className="text-sm text-ink-500">
                  {format(new Date(data.upcomingAppointment.startsAt), "EEEE · h:mm a")}
                </p>
                <p className="mt-1 text-lg font-medium text-ink-900">{data.upcomingAppointment.physio.user.fullName}</p>
                <p className="text-sm text-ink-500">{data.upcomingAppointment.treatmentFocus ?? "Physiotherapist"}</p>
                <Button variant="secondary" size="sm" className="mt-4">
                  View appointment
                </Button>
              </div>
            ) : (
              <EmptyState title="No upcoming appointments" description="Your physiotherapist will schedule your next visit here." />
            )}
          </CardContent>
        </Card>

        {/* Latest message */}
        <Card>
          <CardContent>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand-100"><MessageCircle className="size-4 text-brand-700" /></span>
              <h2 className="font-semibold text-ink-900">Messages</h2>
            </div>
            {data.latestMessage ? (
              <div>
                <p className="text-sm font-medium text-ink-900">{data.latestMessage.sender.fullName}</p>
                <p className="mt-1 line-clamp-2 text-sm text-ink-500">{data.latestMessage.body}</p>
              </div>
            ) : (
              <EmptyState title="No messages yet" description="Your care team's updates will show up here." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
