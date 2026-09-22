import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export interface RecoveryLogEntry {
  id: string;
  date: string;
  painLevel: number | null;
  mobility: number | null;
  mood: number | null;
  notes: string | null;
}

async function fetchMyRecoveryLogs() {
  const res = await api.get<RecoveryLogEntry[]>("/recovery/me");
  return res.data;
}

export function useMyRecoveryLogs() {
  return useQuery({ queryKey: ["recovery", "me"], queryFn: fetchMyRecoveryLogs });
}

interface CreateLogInput {
  painLevel?: number;
  mobility?: number;
  mood?: number;
  notes?: string;
}

export function useLogRecovery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateLogInput) => {
      const res = await api.post<RecoveryLogEntry>("/recovery/me", input);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recovery", "me"] });
    },
  });
}
