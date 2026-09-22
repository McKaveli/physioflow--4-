import { api } from "../../lib/api";

export type ExerciseState = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";

export interface TodayExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sets: number | null;
  reps: number | null;
  durationSec: number | null;
  state: ExerciseState;
  setsCompleted: number;
}

export interface PatientDashboard {
  recoveryPct: number;
  recoveryTrend: number;
  todaysExercises: TodayExercise[];
  upcomingAppointment: {
    id: string;
    startsAt: string;
    treatmentFocus: string | null;
    physio: { user: { fullName: string } };
  } | null;
  latestMessage: { body: string; sender: { fullName: string; role: string } } | null;
}

export async function fetchPatientDashboard() {
  const res = await api.get<PatientDashboard>("/patients/me/dashboard");
  return res.data;
}

export interface RecoveryLogEntry {
  id: string;
  date: string;
  painLevel: number | null;
  mobility: number | null;
  mood: number | null;
}

export async function fetchMyProgress() {
  const res = await api.get<RecoveryLogEntry[]>("/patients/me/progress");
  return res.data;
}
