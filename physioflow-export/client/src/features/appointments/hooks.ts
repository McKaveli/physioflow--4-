import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export type AppointmentStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type RescheduleRequestStatus = "PENDING" | "APPROVED" | "DECLINED" | "WITHDRAWN";

export interface Appointment {
  id: string;
  patientId: string;
  physioId: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  treatmentFocus: string | null;
  notes: string | null;
  patient: { id: string; patientCode?: string; user: { fullName: string } };
  physio: { id: string; user: { fullName: string } };
}

interface ListFilters {
  patientId?: string;
  physioId?: string;
}

async function fetchAppointments(filters: ListFilters) {
  const res = await api.get<Appointment[]>("/appointments", { params: filters });
  return res.data;
}

export function useAppointments(filters: ListFilters = {}) {
  return useQuery({ queryKey: ["appointments", filters], queryFn: () => fetchAppointments(filters) });
}

interface BookInput {
  patientId: string;
  physioId: string;
  startsAt: string;
  endsAt: string;
  treatmentFocus?: string;
}

function invalidateAppointmentQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["appointments"] });
  queryClient.invalidateQueries({ queryKey: ["patients", "me", "dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["physiotherapists", "me", "dashboard"] });
}

// Scheduling is a physio/admin-only action now — the name reflects that this is staff
// scheduling a visit for a patient, not a patient booking their own appointment.
export function useScheduleAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BookInput) => {
      const res = await api.post<Appointment>("/appointments", input);
      return res.data;
    },
    onSuccess: () => invalidateAppointmentQueries(queryClient),
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      const res = await api.patch<Appointment>(`/appointments/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => invalidateAppointmentQueries(queryClient),
  });
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, startsAt, endsAt }: { id: string; startsAt: string; endsAt: string }) => {
      const res = await api.patch<Appointment>(`/appointments/${id}/reschedule`, { startsAt, endsAt });
      return res.data;
    },
    onSuccess: () => invalidateAppointmentQueries(queryClient),
  });
}

export function useRescheduleRequests(filters: { patientId?: string } = {}) {
  return useQuery({
    queryKey: ["reschedule-requests", filters],
    queryFn: async () => (await api.get<Array<{ id: string; appointmentId: string; requestedDate: string; preferredTimeNote: string | null; reason: string | null; status: RescheduleRequestStatus; declineReason: string | null }>>("/appointments/reschedule-requests", { params: filters })).data,
  });
}

export function useCreateRescheduleRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { appointmentId: string; requestedDate: string; preferredTimeNote: string; reason: string }) =>
      (await api.post("/appointments/reschedule-requests", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reschedule-requests"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch<Appointment>(`/appointments/${id}/cancel`);
      return res.data;
    },
    onSuccess: () => invalidateAppointmentQueries(queryClient),
  });
}
