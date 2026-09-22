import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export interface PatientDetail {
  id: string;
  patientCode: string;
  status: "PENDING_ONBOARDING" | "ACTIVE" | "INACTIVE" | "TREATMENT_COMPLETED" | "DISCHARGED";
  dateOnboarded: string | null;
  profession: string | null;
  condition: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  emergencyContact: string | null;
  presentingComplaint: string | null;
  bodyArea: string | null;
  dateOfInjury: string | null;
  referringSource: string | null;
  intakeNotes: string | null;
  user: { fullName: string; email: string; phone: string | null; avatarUrl: string | null };
  primaryPhysio: { user: { fullName: string } } | null;
}

async function fetchPatient(id: string) {
  const res = await api.get<PatientDetail>(`/patients/${id}`);
  return res.data;
}

export function usePatientDetail(id: string | undefined) {
  return useQuery({ queryKey: ["patients", id], queryFn: () => fetchPatient(id as string), enabled: !!id });
}

export interface SessionNote {
  id: string;
  date: string;
  summary: string;
  observations: string | null;
  treatmentPerformed: string | null;
  patientResponse: string | null;
  nextSteps: string | null;
  physio: { user: { fullName: string } };
}

async function fetchSessionNotes(patientId: string) {
  const res = await api.get<SessionNote[]>(`/session-notes/patient/${patientId}`);
  return res.data;
}

export function useSessionNotes(patientId: string | undefined) {
  return useQuery({ queryKey: ["session-notes", patientId], queryFn: () => fetchSessionNotes(patientId as string), enabled: !!patientId });
}

interface CreateSessionNoteInput {
  patientId: string;
  summary: string;
  observations?: string;
  treatmentPerformed?: string;
  patientResponse?: string;
  nextSteps?: string;
}

export function useCreateSessionNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSessionNoteInput) => {
      const res = await api.post<SessionNote>("/session-notes", input);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["session-notes", variables.patientId] });
    },
  });
}

export interface RecoveryLogEntry {
  id: string;
  date: string;
  painLevel: number | null;
  mobility: number | null;
  mood: number | null;
  notes: string | null;
}

async function fetchPatientRecoveryLogs(patientId: string) {
  const res = await api.get<RecoveryLogEntry[]>(`/recovery/patient/${patientId}`);
  return res.data;
}

export function usePatientRecoveryLogs(patientId: string | undefined) {
  return useQuery({
    queryKey: ["recovery", "patient", patientId],
    queryFn: () => fetchPatientRecoveryLogs(patientId as string),
    enabled: !!patientId,
  });
}

export interface PatientDischarge {
  id: string;
  treatmentOutcome: string;
  finalClinicalNotes: string;
  treatmentGoalsStatus: string;
  sessionsCompleted: number;
  dischargeReason: string;
  finalProgress: string;
  followUpRecommendations: string | null;
  dischargedAt: string;
  physio: { user: { fullName: string } };
  dischargedBy: { fullName: string };
}

export function usePatientDischarge(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patient-discharge", patientId],
    queryFn: async () => (await api.get<PatientDischarge | null>(`/patients/${patientId}/discharge`)).data,
    enabled: !!patientId,
  });
}

export function useDischargePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ patientId, ...input }: { patientId: string; treatmentOutcome: string; finalClinicalNotes: string; treatmentGoalsStatus: string; sessionsCompleted: number; dischargeReason: string; finalProgress: string; followUpRecommendations?: string }) =>
      (await api.post<PatientDischarge>(`/patients/${patientId}/discharge`, input)).data,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["patients", variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ["patient-discharge", variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}
