import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export interface Exercise {
  id: string;
  name: string;
  bodyArea: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  description: string;
  instructions: string;
  safetyNotes: string | null;
  mediaUrl: string | null;
  youtubeUrl: string | null;
  defaultSets: number | null;
  defaultReps: number | null;
  defaultDurationSec: number | null;
  defaultRestSec: number | null;
}

interface ListFilters {
  bodyArea?: string;
  difficulty?: string;
  search?: string;
}

async function fetchExercises(filters: ListFilters) {
  const res = await api.get<Exercise[]>("/exercises", { params: filters });
  return res.data;
}

export function useExercises(filters: ListFilters) {
  return useQuery({ queryKey: ["exercises", filters], queryFn: () => fetchExercises(filters) });
}

async function fetchExercise(id: string) {
  const res = await api.get<Exercise>(`/exercises/${id}`);
  return res.data;
}

export function useExercise(id: string | null) {
  return useQuery({ queryKey: ["exercises", id], queryFn: () => fetchExercise(id as string), enabled: !!id });
}

interface CreateExerciseInput {
  name: string;
  bodyArea: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  description: string;
  instructions: string;
  safetyNotes?: string;
  mediaUrl?: string;
  youtubeUrl?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultDurationSec?: number;
  defaultRestSec?: number;
}

export function useCreateExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateExerciseInput) => {
      const res = await api.post<Exercise>("/exercises", input);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}

/** Uploads a video/image/PDF for an exercise. Returns the API path to use as mediaUrl —
 *  never a raw public URL, since serving is gated behind an authenticated, tenant-checked route. */
export function useUploadExerciseMedia() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post<{ url: string }>("/exercises/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.url;
    },
  });
}

interface CompleteInput {
  assignmentId: string;
  state: "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
  setsCompleted?: number;
  painLevel?: number;
  difficultyRating?: number;
  notes?: string;
}

export function useCompleteExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId, ...body }: CompleteInput) => {
      const res = await api.post(`/exercises/assignments/${assignmentId}/complete`, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients", "me", "dashboard"] });
    },
  });
}
