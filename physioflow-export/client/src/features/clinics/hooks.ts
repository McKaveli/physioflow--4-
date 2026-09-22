import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

export interface ClinicOverview {
  physiotherapistCount: number;
  patientCount: number;
  appointmentsThisWeek: number;
  physiotherapists: Array<{ id: string; specialty: string | null; user: { fullName: string; email: string } }>;
  patients: Array<{ id: string; condition: string | null; user: { fullName: string; email: string } }>;
  inventoryAlerts: { lowStockCount: number; outOfStockCount: number };
}

async function fetchClinicOverview(clinicId: string) {
  const res = await api.get<ClinicOverview>(`/clinics/${clinicId}/overview`);
  return res.data;
}

export function useClinicOverview(clinicId: string | null) {
  return useQuery({
    queryKey: ["clinics", clinicId, "overview"],
    queryFn: () => fetchClinicOverview(clinicId as string),
    enabled: !!clinicId,
  });
}

export interface ClinicSummary {
  id: string;
  name: string;
  city: string | null;
}

async function fetchClinic(clinicId: string) {
  const res = await api.get<ClinicSummary>(`/clinics/${clinicId}`);
  return res.data;
}

/** Public endpoint — safe for every role (patient/physio/admin) to use for sidebar branding. */
export function useClinic(clinicId: string | null) {
  return useQuery({
    queryKey: ["clinics", clinicId],
    queryFn: () => fetchClinic(clinicId as string),
    enabled: !!clinicId,
    staleTime: 5 * 60_000,
  });
}

import { useMutation } from "@tanstack/react-query";

export function useLookupClinic() {
  return useMutation({
    mutationFn: async (orgCode: string) => {
      const res = await api.get<{ id: string; name: string; orgCode: string }>(`/clinics/lookup?code=${encodeURIComponent(orgCode)}`);
      return res.data;
    },
  });
}
