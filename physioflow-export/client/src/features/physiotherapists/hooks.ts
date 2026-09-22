import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

export interface PhysioDashboard {
  todaysAppointmentCount: number;
  activePatientCount: number;
  newPatientsThisWeek: number;
  plansToReviewCount: number;
  adherencePct: number;
  adherenceTrendPct: number;
  todaysAppointments: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    status: string;
    treatmentFocus: string | null;
    patient: { user: { fullName: string } };
  }>;
  patientsNeedingAttention: Array<{
    patientId: string;
    name: string;
    adherence: number;
    lastActivity: string | null;
    daysSinceActivity: number | null;
  }>;
  inventoryAlerts: { lowStockCount: number; outOfStockCount: number };
  weeklyOverview: Array<{ day: string; appointments: number; completed: number }>;
  totalAppointmentsThisWeek: number;
  completedThisWeek: number;
  completionRatePct: number;
  adherenceDistribution: { excellent: number; good: number; fair: number; poor: number };
  recentActivity: Array<{ id: string; label: string; actorName: string; createdAt: string }>;
}

async function fetchPhysioDashboard() {
  const res = await api.get<PhysioDashboard>("/physiotherapists/me/dashboard");
  return res.data;
}

export function usePhysioDashboard() {
  return useQuery({ queryKey: ["physiotherapists", "me", "dashboard"], queryFn: fetchPhysioDashboard });
}
