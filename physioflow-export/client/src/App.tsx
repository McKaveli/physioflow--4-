import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AppShell } from "./app/AppShell";
import { ProtectedRoute } from "./app/ProtectedRoute";

const LoginPage = lazy(() => import("./pages/LoginPage").then(({ LoginPage: page }) => ({ default: page })));
const RegisterPage = lazy(() => import("./pages/RegisterPage").then(({ RegisterPage: page }) => ({ default: page })));
const InvitationAcceptPage = lazy(() => import("./pages/InvitationAcceptPage").then(({ InvitationAcceptPage: page }) => ({ default: page })));
const RoleHomePage = lazy(() => import("./pages/RoleHomePage").then(({ RoleHomePage: page }) => ({ default: page })));
const ExerciseLibraryPage = lazy(() => import("./pages/ExerciseLibraryPage").then(({ ExerciseLibraryPage: page }) => ({ default: page })));
const AppointmentsPage = lazy(() => import("./pages/AppointmentsPage").then(({ AppointmentsPage: page }) => ({ default: page })));
const MessagesPage = lazy(() => import("./pages/MessagesPage").then(({ MessagesPage: page }) => ({ default: page })));
const TreatmentPlansPage = lazy(() => import("./pages/TreatmentPlansPage").then(({ TreatmentPlansPage: page }) => ({ default: page })));
const PatientsPage = lazy(() => import("./pages/PatientsPage").then(({ PatientsPage: page }) => ({ default: page })));
const PatientProfilePage = lazy(() => import("./pages/PatientProfilePage").then(({ PatientProfilePage: page }) => ({ default: page })));
const InventoryPage = lazy(() => import("./pages/InventoryPage").then(({ InventoryPage: page }) => ({ default: page })));
const RecoveryPage = lazy(() => import("./pages/RecoveryPage").then(({ RecoveryPage: page }) => ({ default: page })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then(({ ProfilePage: page }) => ({ default: page })));
const PaymentsPage = lazy(() => import("./pages/PaymentsPage").then(({ PaymentsPage: page }) => ({ default: page })));
const StaffPage = lazy(() => import("./pages/StaffPage").then(({ StaffPage: page }) => ({ default: page })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then(({ SettingsPage: page }) => ({ default: page })));
const ReportsPage = lazy(() => import("./pages/ReportsPage").then(({ ReportsPage: page }) => ({ default: page })));

function RouteFallback() {
  return <div className="flex min-h-48 items-center justify-center text-sm text-slate-500" role="status">Loading workspace…</div>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/invite/:token" element={<InvitationAcceptPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<RoleHomePage />} />
                <Route path="/recovery" element={<RecoveryPage />} />
                <Route path="/exercises" element={<ExerciseLibraryPage />} />
                <Route path="/appointments" element={<AppointmentsPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/patients" element={<PatientsPage />} />
                <Route path="/patients/:id" element={<PatientProfilePage />} />
                <Route path="/treatment-plans" element={<TreatmentPlansPage />} />

                <Route element={<ProtectedRoute allowedRoles={["PHYSIOTHERAPIST", "CLINIC_ADMIN", "MANAGER"]} />}>
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                </Route>
                <Route element={<ProtectedRoute allowedRoles={["CLINIC_ADMIN", "MANAGER"]} />}>
                  <Route path="/staff" element={<StaffPage />} />
                </Route>
                <Route element={<ProtectedRoute allowedRoles={["MANAGER"]} />}>
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
                <Route path="/payments" element={<PaymentsPage />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
