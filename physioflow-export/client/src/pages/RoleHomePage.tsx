import { useAuthStore } from "../lib/authStore";
import { PatientHomePage } from "./PatientHomePage";
import { PhysioDashboardPage } from "./PhysioDashboardPage";
import { AdminOverviewPage } from "./AdminOverviewPage";
import { ManagerDashboardPage } from "./ManagerDashboardPage";

export function RoleHomePage() {
  const role = useAuthStore((s) => s.role);

  if (role === "PATIENT") return <PatientHomePage />;
  if (role === "PHYSIOTHERAPIST") return <PhysioDashboardPage />;
  if (role === "CLINIC_ADMIN") return <AdminOverviewPage />;
  if (role === "MANAGER") return <ManagerDashboardPage />;
  return null;
}
