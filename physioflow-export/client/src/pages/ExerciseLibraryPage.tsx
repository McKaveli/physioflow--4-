import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Dumbbell, Video, Upload, PlayCircle, Film } from "lucide-react";
import clsx from "clsx";
import { Card, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { Textarea } from "../components/ui/Textarea";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonCard } from "../components/ui/Skeleton";
import { useExercises, useExercise, useCreateExercise, useUploadExerciseMedia } from "../features/exercises/hooks";
import type { Exercise } from "../features/exercises/hooks";
import { useAuthStore } from "../lib/authStore";
import { getErrorMessage } from "../lib/api";
import { getYoutubeEmbedUrl } from "../lib/youtube";

const DIFFICULTY_TONE = { BEGINNER: "positive", INTERMEDIATE: "attention", ADVANCED: "urgent" } as const;
const BODY_AREAS = ["Knee", "Shoulder", "Balance", "General", "Back", "Hip", "Ankle"];

type ResourceType = "none" | "upload" | "youtube" | "both";

function CreateExerciseModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    name: "",
    bodyArea: "Knee",
    difficulty: "BEGINNER" as const,
    description: "",
    instructions: "",
    safetyNotes: "",
    defaultSets: "",
    defaultReps: "",
    defaultRestSec: "",
  });
  const [resourceType, setResourceType] = useState<ResourceType>("none");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  const create = useCreateExercise();
  const upload = useUploadExerciseMedia();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const url = await upload.mutateAsync(file);
      setUploadedUrl(url);
    } catch {
      setUploadedUrl(null);
    }
  };

  const reset = () => {
    setForm({ name: "", bodyArea: "Knee", difficulty: "BEGINNER", description: "", instructions: "", safetyNotes: "", defaultSets: "", defaultReps: "", defaultRestSec: "" });
    setResourceType("none");
    setYoutubeUrl("");
    setUploadedUrl(null);
    setFileName("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({
        ...form,
        safetyNotes: form.safetyNotes || undefined,
        defaultSets: form.defaultSets ? Number(form.defaultSets) : undefined,
        defaultReps: form.defaultReps ? Number(form.defaultReps) : undefined,
        defaultRestSec: form.defaultRestSec ? Number(form.defaultRestSec) : undefined,
        mediaUrl: (resourceType === "upload" || resourceType === "both") && uploadedUrl ? uploadedUrl : undefined,
        youtubeUrl: (resourceType === "youtube" || resourceType === "both") && youtubeUrl ? youtubeUrl : undefined,
      });
      onClose();
      reset();
    } catch {
      // surfaced below
    }
  };

  const embedPreview = youtubeUrl ? getYoutubeEmbedUrl(youtubeUrl) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
      }}
      title="Add exercise"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-exercise-form" isLoading={create.isPending}>
            Save exercise
          </Button>
        </>
      }
    >
      <form id="create-exercise-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Exercise name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Body area" value={form.bodyArea} onChange={(e) => setForm({ ...form, bodyArea: e.target.value })}>
            {BODY_AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
          <Select
            label="Difficulty"
            value={form.difficulty}
            onChange={(e) => setForm({ ...form, difficulty: e.target.value as typeof form.difficulty })}
          >
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Sets" type="number" min={1} value={form.defaultSets} onChange={(e) => setForm({ ...form, defaultSets: e.target.value })} />
          <Input label="Reps" type="number" min={1} value={form.defaultReps} onChange={(e) => setForm({ ...form, defaultReps: e.target.value })} />
          <Input label="Rest (sec)" type="number" min={0} value={form.defaultRestSec} onChange={(e) => setForm({ ...form, defaultRestSec: e.target.value })} />
        </div>
        <Textarea label="Description" required rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Textarea
          label="Instructions"
          required
          rows={3}
          hint="Write your own clinical instructions — this is exactly what the patient will see."
          value={form.instructions}
          onChange={(e) => setForm({ ...form, instructions: e.target.value })}
        />
        <Textarea
          label="Safety notes (optional)"
          rows={2}
          placeholder="e.g. Stop if pain exceeds 4/10. Avoid if recent surgery in this area."
          value={form.safetyNotes}
          onChange={(e) => setForm({ ...form, safetyNotes: e.target.value })}
        />

        <div className="border-t border-border pt-4">
          <p className="mb-2 text-sm font-medium text-ink-700">Video resource (optional)</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {(["none", "upload", "youtube", "both"] as ResourceType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setResourceType(t)}
                className={clsx(
                  "rounded-full border px-3 py-1.5 text-sm font-medium capitalize",
                  resourceType === t ? "border-brand-700 bg-brand-50 text-brand-800" : "border-border-strong text-ink-700"
                )}
              >
                {t === "none" ? "No video" : t}
              </button>
            ))}
          </div>

          {(resourceType === "upload" || resourceType === "both") && (
            <div className="mb-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-dashed border-border-strong px-4 py-3 text-sm text-ink-500 hover:border-brand-400">
                <Upload className="size-4" />
                {fileName || "Choose a video, image, or PDF (max 50MB)"}
                <input type="file" accept="video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleFileChange} />
              </label>
              {upload.isPending && <p className="mt-1 text-xs text-ink-500">Uploading...</p>}
              {uploadedUrl && <p className="mt-1 text-xs text-positive-700">✓ Uploaded successfully.</p>}
              {upload.isError && <p className="mt-1 text-xs text-urgent-700">{getErrorMessage(upload.error)}</p>}
            </div>
          )}

          {(resourceType === "youtube" || resourceType === "both") && (
            <div className="mb-1">
              <Input label="YouTube URL" placeholder="https://www.youtube.com/watch?v=..." value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} />
              {embedPreview && (
                <div className="mt-2 aspect-video overflow-hidden rounded-[var(--radius-control)] border border-border">
                  <iframe src={embedPreview} title="YouTube preview" className="h-full w-full" allowFullScreen />
                </div>
              )}
            </div>
          )}
        </div>

        {create.isError ? <p className="text-sm text-urgent-700">{getErrorMessage(create.error)}</p> : null}
      </form>
    </Modal>
  );
}

function ExerciseDetailModal({ exerciseId, onClose }: { exerciseId: string | null; onClose: () => void }) {
  const { data: exercise, isLoading } = useExercise(exerciseId);
  const embedUrl = exercise?.youtubeUrl ? getYoutubeEmbedUrl(exercise.youtubeUrl) : null;
  const isVideo = exercise?.mediaUrl && /\.(mp4|webm|mov)$/i.test(exercise.mediaUrl);
  const isImage = exercise?.mediaUrl && /\.(jpg|jpeg|png|webp)$/i.test(exercise.mediaUrl);

  return (
    <Modal isOpen={!!exerciseId} onClose={onClose} title={exercise?.name ?? "Exercise"}>
      {isLoading || !exercise ? (
        <p className="text-sm text-ink-500">Loading...</p>
      ) : (
        <div className="flex flex-col gap-4">
          {embedUrl && (
            <div className="aspect-video overflow-hidden rounded-[var(--radius-control)] border border-border">
              <iframe src={embedUrl} title={exercise.name} className="h-full w-full" allowFullScreen />
            </div>
          )}
          {exercise.mediaUrl && isVideo && (
            <video controls className="w-full rounded-[var(--radius-control)] border border-border">
              <source src={exercise.mediaUrl} />
            </video>
          )}
          {exercise.mediaUrl && isImage && <img src={exercise.mediaUrl} alt={exercise.name} className="w-full rounded-[var(--radius-control)] border border-border" />}

          <div className="flex gap-2">
            <Badge tone={DIFFICULTY_TONE[exercise.difficulty]}>{exercise.difficulty.toLowerCase()}</Badge>
            <Badge tone="neutral">{exercise.bodyArea}</Badge>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">Instructions</p>
            <p className="whitespace-pre-wrap text-sm text-ink-900">{exercise.instructions}</p>
          </div>

          {exercise.safetyNotes && (
            <div className="rounded-[var(--radius-control)] border border-attention-500/30 bg-attention-50 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-attention-700">Safety notes</p>
              <p className="text-sm text-attention-700">{exercise.safetyNotes}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 border-t border-border pt-3 text-center text-sm">
            <div>
              <p className="font-semibold text-ink-900">{exercise.defaultSets ?? "—"}</p>
              <p className="text-xs text-ink-500">Sets</p>
            </div>
            <div>
              <p className="font-semibold text-ink-900">{exercise.defaultReps ?? "—"}</p>
              <p className="text-xs text-ink-500">Reps</p>
            </div>
            <div>
              <p className="font-semibold text-ink-900">{exercise.defaultRestSec ? `${exercise.defaultRestSec}s` : "—"}</p>
              <p className="text-xs text-ink-500">Rest</p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ExerciseCard({ exercise, onClick }: { exercise: Exercise; onClick: () => void }) {
  const hasVideo = !!exercise.mediaUrl || !!exercise.youtubeUrl;
  return (
    <Card>
      <button onClick={onClick} className="block w-full text-left">
        <CardContent>
          <div className="mb-2 flex h-24 items-center justify-center rounded-[var(--radius-control)] bg-brand-50 text-brand-300">
            {hasVideo ? <PlayCircle className="size-8" /> : <Dumbbell className="size-8" />}
          </div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="font-medium text-ink-900">{exercise.name}</h3>
            <Badge tone={DIFFICULTY_TONE[exercise.difficulty]}>{exercise.difficulty.toLowerCase()}</Badge>
          </div>
          <p className="mb-3 text-sm text-ink-500">{exercise.bodyArea}</p>
          <p className="line-clamp-2 text-sm text-ink-700">{exercise.description}</p>
          <div className="mt-2 flex items-center justify-between">
            {(exercise.defaultSets || exercise.defaultDurationSec) && (
              <p className="text-xs font-medium text-ink-500">
                {exercise.defaultSets && exercise.defaultReps ? `${exercise.defaultSets} × ${exercise.defaultReps}` : null}
                {exercise.defaultDurationSec ? `${Math.round(exercise.defaultDurationSec / 60)} min` : null}
              </p>
            )}
            <div className="flex gap-1 text-ink-400">
              {exercise.mediaUrl && <Video className="size-3.5" />}
              {exercise.youtubeUrl && <Film className="size-3.5" />}
            </div>
          </div>
        </CardContent>
      </button>
    </Card>
  );
}

export function ExerciseLibraryPage() {
  const { role } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [bodyArea, setBodyArea] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(searchParams.get("exerciseId"));

  const { data, isLoading, isError, refetch } = useExercises({
    search: search || undefined,
    bodyArea: bodyArea || undefined,
    difficulty: difficulty || undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Exercise Library</h1>
          <p className="mt-1 text-ink-500">Reusable clinical assets for treatment plans.</p>
        </div>
        {role === "PHYSIOTHERAPIST" ? (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="size-4" /> Add exercise
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Input label="Search" placeholder="Search exercises..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select label="Body area" value={bodyArea} onChange={(e) => setBodyArea(e.target.value)}>
            <option value="">All areas</option>
            {BODY_AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
          <Select label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="">All levels</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : isError ? (
        <ErrorState message="We couldn't load the exercise library." onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="size-6" />}
          title="No exercises found"
          description="Try adjusting your filters, or add a new exercise to the library."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} onClick={() => setSelectedExerciseId(ex.id)} />
          ))}
        </div>
      )}

      <CreateExerciseModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <ExerciseDetailModal exerciseId={selectedExerciseId} onClose={() => setSelectedExerciseId(null)} />
    </div>
  );
}
