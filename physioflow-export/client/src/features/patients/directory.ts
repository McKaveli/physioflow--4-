import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export interface PatientListEntry {
  id: string;
  patientCode: string;
  condition: string | null;
  status: "PENDING_ONBOARDING" | "ACTIVE" | "INACTIVE" | "TREATMENT_COMPLETED" | "DISCHARGED";
  user: { fullName: string; email: string; phone: string | null; avatarUrl: string | null };
}

interface ListFilters {
  physioId?: string;
  search?: string;
  status?: string;
}

async function fetchPatients(filters: ListFilters) {
  const res = await api.get<PatientListEntry[]>("/patients", { params: filters });
  return res.data;
}

export function usePatientsList(filters: ListFilters) {
  return useQuery({ queryKey: ["patients", "list", filters], queryFn: () => fetchPatients(filters) });
}

export interface CreatePatientInput {
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  emergencyContact?: string;
  presentingComplaint?: string;
  bodyArea?: string;
  dateOfInjury?: string;
  referringSource?: string;
  intakeNotes?: string;
  primaryPhysioId?: string;
  avatarUrl?: string;
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePatientInput) => {
      const res = await api.post<{ id: string; patientCode: string }>("/patients", input);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients"] }),
  });
}

export function useSendInvitation() {
  return useMutation({
    mutationFn: async (patientId: string) => {
      const res = await api.post<{ token: string }>(`/patients/${patientId}/invitations`);
      return res.data;
    },
  });
}
