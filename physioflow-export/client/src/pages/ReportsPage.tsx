import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent } from "../components/ui/Card";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonCard } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { BarChart3 } from "lucide-react";
import { useAppointments } from "../features/appointments/hooks";
import { usePayments } from "../features/payments/hooks";
import { useClinicOverview } from "../features/clinics/hooks";
import { usePhysioDashboard } from "../features/physiotherapists/hooks";
import { useCurrentUser } from "../features/auth/hooks";
import { useAuthStore } from "../lib/authStore";

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "#16a34a",
  PENDING: "#d97706",
  COMPLETED: "#3568a0",
  CANCELLED: "#dc2626",
  NO_SHOW: "#dc2626",
};

function PhysioReports() {
  const { data: me } = useCurrentUser();
  const { data: dashboard } = usePhysioDashboard();
  const { data: appointments, isLoading, isError, refetch } = useAppointments(
    me?.physiotherapist ? { physioId: me.physiotherapist.id } : {}
  );

  if (isLoading) return <SkeletonCard />;
  if (isError) return <ErrorState message="We couldn't load your reports." onRetry={() => refetch()} />;
  if (!appointments || appointments.length === 0) {
    return <EmptyState icon={<BarChart3 className="size-6" />} title="Not enough data yet" description="Reports will populate as you complete appointments." />;
  }

  const statusCounts = appointments.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});
  const chartData = Object.entries(statusCounts).map(([status, count]) => ({ status: status.replace("_", " "), count, fill: STATUS_COLORS[status] }));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardContent>
          <h2 className="mb-4 font-semibold text-ink-900">Appointment status breakdown</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e1e7ef" />
                <XAxis dataKey="status" tick={{ fontSize: 11, fill: "#667085" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#667085" }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e1e7ef", fontSize: 12 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#275683" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <h2 className="mb-4 font-semibold text-ink-900">Exercise adherence</h2>
          <p className="text-4xl font-semibold text-ink-900">{dashboard?.adherencePct ?? 0}%</p>
          <p className="mt-1 text-sm text-ink-500">Across all active patients' logged exercise completions.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminReports() {
  const { clinicId } = useAuthStore();
  const { data: overview, isLoading: loadingOverview } = useClinicOverview(clinicId);
  const { data: payments, isLoading: loadingPayments, isError, refetch } = usePayments();

  if (loadingOverview || loadingPayments) return <SkeletonCard />;
  if (isError) return <ErrorState message="We couldn't load reports." onRetry={() => refetch()} />;

  const paymentStatusCounts = (payments ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});
  const chartData = Object.entries(paymentStatusCounts).map(([status, count]) => ({ status, count }));
  const totalRevenue = (payments ?? []).filter((p) => p.status === "SUCCEEDED").reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardContent>
          <h2 className="mb-4 font-semibold text-ink-900">Clinic snapshot</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-semibold text-ink-900">{overview?.physiotherapistCount ?? 0}</p>
              <p className="text-sm text-ink-500">Physiotherapists</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-ink-900">{overview?.patientCount ?? 0}</p>
              <p className="text-sm text-ink-500">Patients</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-ink-900">GHS {totalRevenue.toFixed(2)}</p>
              <p className="text-sm text-ink-500">Confirmed revenue</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <h2 className="mb-4 font-semibold text-ink-900">Payments by status</h2>
          {chartData.length === 0 ? (
            <EmptyState title="No payments yet" description="Payment activity will appear here." />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e1e7ef" />
                  <XAxis dataKey="status" tick={{ fontSize: 11, fill: "#667085" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#667085" }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e1e7ef", fontSize: 12 }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#275683" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ReportsPage() {
  const { role } = useAuthStore();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Reports</h1>
        <p className="mt-1 text-ink-500">A snapshot of activity — built from real, current data.</p>
      </div>
      {role === "PHYSIOTHERAPIST" ? <PhysioReports /> : <AdminReports />}
    </div>
  );
}
