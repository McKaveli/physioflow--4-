import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, Dumbbell, CornerDownLeft } from "lucide-react";
import { api } from "../lib/api";
import { useAuthStore } from "../lib/authStore";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

async function searchPatients(term: string) {
  const res = await api.get("/patients", { params: { search: term } });
  return res.data as Array<{ id: string; patientCode: string; user: { fullName: string } }>;
}

async function searchExercises(term: string) {
  const res = await api.get("/exercises", { params: { search: term } });
  return res.data as Array<{ id: string; name: string; bodyArea: string }>;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [term, setTerm] = useState("");
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.role);
  const canSearchPatients = role === "PHYSIOTHERAPIST" || role === "CLINIC_ADMIN";

  const patientsQuery = useQuery({
    queryKey: ["command-search", "patients", term],
    queryFn: () => searchPatients(term),
    enabled: isOpen && term.length > 1 && canSearchPatients,
  });
  const exercisesQuery = useQuery({
    queryKey: ["command-search", "exercises", term],
    queryFn: () => searchExercises(term),
    enabled: isOpen && term.length > 1,
  });

  useEffect(() => {
    if (!isOpen) setTerm("");
  }, [isOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const goToPatients = () => {
    navigate(`/patients?q=${encodeURIComponent(term)}`);
    onClose();
  };
  const goToExercises = () => {
    navigate(`/exercises?q=${encodeURIComponent(term)}`);
    onClose();
  };

  const hasResults = (patientsQuery.data?.length ?? 0) > 0 || (exercisesQuery.data?.length ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink-900/40 px-4 pt-24" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-raised)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search PhysioFlow"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="size-4 text-ink-400" />
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search patients, exercises..."
            className="flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
          />
          <kbd className="rounded border border-border-strong px-1.5 py-0.5 text-[10px] text-ink-400">Esc</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {term.length <= 1 ? (
            <p className="px-3 py-6 text-center text-sm text-ink-400">Type to search across PhysioFlow.</p>
          ) : !hasResults ? (
            <p className="px-3 py-6 text-center text-sm text-ink-400">No results for "{term}".</p>
          ) : (
            <>
              {canSearchPatients && patientsQuery.data && patientsQuery.data.length > 0 && (
                <div className="mb-1">
                  <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Patients</p>
                  {patientsQuery.data.slice(0, 5).map((p) => (
                    <button
                      key={p.id}
                      onClick={goToPatients}
                      className="flex w-full items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-left text-sm hover:bg-surface-sunken"
                    >
                      <Users className="size-4 text-brand-500" />
                      <span className="flex-1 text-ink-900">{p.user.fullName}</span>
                      <span className="text-xs text-ink-400">{p.patientCode}</span>
                    </button>
                  ))}
                </div>
              )}
              {exercisesQuery.data && exercisesQuery.data.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Exercises</p>
                  {exercisesQuery.data.slice(0, 5).map((ex) => (
                    <button
                      key={ex.id}
                      onClick={goToExercises}
                      className="flex w-full items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-left text-sm hover:bg-surface-sunken"
                    >
                      <Dumbbell className="size-4 text-brand-500" />
                      <span className="flex-1 text-ink-900">{ex.name}</span>
                      <span className="text-xs text-ink-400">{ex.bodyArea}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 border-t border-border px-4 py-2 text-xs text-ink-400">
          <CornerDownLeft className="size-3" /> to open a section
        </div>
      </div>
    </div>
  );
}
