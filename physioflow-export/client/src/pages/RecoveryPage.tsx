import { useState } from "react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Activity, Plus } from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Slider } from "../components/ui/Slider";
import { Textarea } from "../components/ui/Textarea";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonCard } from "../components/ui/Skeleton";
import { useMyRecoveryLogs, useLogRecovery } from "../features/recovery/hooks";
import { getErrorMessage } from "../lib/api";

function LogRecoveryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [painLevel, setPainLevel] = useState(3);
  const [mobility, setMobility] = useState(6);
  const [mood, setMood] = useState(6);
  const [notes, setNotes] = useState("");
  const logRecovery = useLogRecovery();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await logRecovery.mutateAsync({ painLevel, mobility, mood, notes: notes || undefined });
      onClose();
      setNotes("");
    } catch {
      // surfaced below
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log today's recovery"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="log-recovery-form" isLoading={logRecovery.isPending}>
            Save entry
          </Button>
        </>
      }
    >
      <form id="log-recovery-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Slider label="Pain level" value={painLevel} onChange={setPainLevel} lowLabel="No pain" highLabel="Severe" />
        <Slider label="Mobility" value={mobility} onChange={setMobility} lowLabel="Very limited" highLabel="Full range" />
        <Slider label="Mood / energy" value={mood} onChange={setMood} lowLabel="Low" highLabel="Great" />
        <Textarea label="Notes (optional)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        {logRecovery.isError ? <p className="text-sm text-urgent-700">{getErrorMessage(logRecovery.error)}</p> : null}
      </form>
    </Modal>
  );
}

export function RecoveryPage() {
  const [isLogOpen, setIsLogOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useMyRecoveryLogs();

  if (isLoading) return <SkeletonCard />;
  if (isError) return <ErrorState message="We couldn't load your recovery history." onRetry={() => refetch()} />;

  const chartData = (data ?? [])
    .slice()
    .reverse()
    .map((log) => ({
      date: format(new Date(log.date), "MMM d"),
      Pain: log.painLevel,
      Mobility: log.mobility,
      Mood: log.mood,
    }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">My Recovery</h1>
          <p className="mt-1 text-ink-500">Track how you're feeling day to day.</p>
        </div>
        <Button onClick={() => setIsLogOpen(true)}>
          <Plus className="size-4" /> Log today
        </Button>
      </div>

      <Card>
        <CardContent>
          <h2 className="mb-4 font-semibold text-ink-900">Recovery trend</h2>
          {chartData.length === 0 ? (
            <EmptyState
              icon={<Activity className="size-6" />}
              title="No entries yet"
              description="Log your pain, mobility, and mood to see your trend over time."
              actionLabel="Log today"
              onAction={() => setIsLogOpen(true)}
            />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e1e7ef" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#667085" }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: "#667085" }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e1e7ef", fontSize: 12 }} />
                  <Line type="monotone" dataKey="Mobility" stroke="#16a34a" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Mood" stroke="#3568a0" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Pain" stroke="#dc2626" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {data && data.length > 0 && (
        <Card>
          <CardContent className="p-0">
            {data.slice(0, 10).map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-4 border-b border-border px-5 py-3 last:border-0">
                <span className="text-sm font-medium text-ink-900">{format(new Date(log.date), "EEEE, MMM d")}</span>
                <div className="flex gap-4 text-xs text-ink-500">
                  <span>Pain {log.painLevel ?? "—"}</span>
                  <span>Mobility {log.mobility ?? "—"}</span>
                  <span>Mood {log.mood ?? "—"}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <LogRecoveryModal isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} />
    </div>
  );
}
