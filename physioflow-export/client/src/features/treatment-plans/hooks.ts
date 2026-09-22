import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Exercise } from "../exercises/hooks";

export type TreatmentPlanStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

export interface ExerciseAssignmentDetail {
  id: string;
  sets: number | null;
  reps: number | null;
  durationSec: number | null;
  frequency: string | null;
  exercise: Exercise;
}

export interface TreatmentPlan {
  id: string;
  title: string;
  goals: string; // JSON-encoded string[]
  status: TreatmentPlanStatus;
  startDate: string;
  endDate: string | null;
  frequency: string | null;
  patientId: string;
  physioId: string;
  exerciseAssignments: ExerciseAssignmentDetail[];
  patient?: { user: { fullName: string } };
  physio?: { user: { fullName: string } };
}

interface ListFilters {
  patientId?: string;
  physioId?: string;
}

async function fetchTreatmentPlans(filters: ListFilters) {
  const res = await api.get<TreatmentPlan[]>("/treatment-plans", { params: filters });
  return res.data;
}

export function useTreatmentPlans(filters: ListFilters) {
  return useQuery({ queryKey: ["treatment-plans", filters], queryFn: () => fetchTreatmentPlans(filters) });
}

export interface CreateTreatmentPlanInput {
  patientId: string;
  physioId: string;
  title: string;
  goals: string[];
  startDate: string;
  endDate?: string;
  frequency?: string;
  status?: "DRAFT" | "ACTIVE";
  exerciseInputs: Array<{ exerciseId: string; sets?: number; reps?: number; durationSec?: number; instructions?: string }>;
}

export function useCreateTreatmentPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTreatmentPlanInput) => {
      const res = await api.post<TreatmentPlan>("/treatment-plans", input);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatment-plans"] });
    },
  });
}

export function useAssignTreatmentPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<TreatmentPlan>(`/treatment-plans/${id}/assign`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatment-plans"] });
      queryClient.invalidateQueries({ queryKey: ["physiotherapists", "me", "dashboard"] });
    },
  });
}
