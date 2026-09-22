import { Link } from "react-router-dom";
import { ArrowUpRight, Building2, Users } from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonCard } from "../components/ui/Skeleton";
import { InventoryAlertBanner } from "../components/ui/InventoryAlertBanner";
import { useClinicOverview } from "../features/clinics/hooks";
import { useAuthStore } from "../lib/authStore";
import { DashboardStat, DonutChartCard } from "../components/dashboard/DashboardPrimitives";

export function AdminOverviewPage() {
  const { clinicId, fullName } = useAuthStore();
  const { data, isLoading, isError, refetch } = useClinicOverview(clinicId);

  if (!clinicId) {
    return (
      <EmptyState
        title="No clinic linked to your account"
        description="Ask a system administrator to link your admin account to a clinic."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState message="We couldn't load the clinic overview." onRetry={() => refetch()} />;
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="rounded-2xl bg-white/70 p-5 shadow-[0_10px_26px_-20px_rgba(15,23,42,0.25)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Clinic operations</p>
            <h1 className="text-3xl font-semibold tracking-tight text-ink-900">Good to see you, {fullName?.split(" ")[0]}.</h1>
            <p className="mt-1 text-ink-500">A clear view of today’s care team and capacity.</p>
          </div>
          <Link to="/appointments" className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-brand-950 px-4 text-sm font-semibold text-white hover:bg-brand-800">
            Open schedule <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>

      <Card className="border-brand-200/80 bg-brand-50/60">
        <CardContent className="grid gap-3 p-3 sm:grid-cols-2 md:grid-cols-4">
          <DashboardStat value={data.physiotherapistCount} label="Physiotherapists" />
          <DashboardStat value={data.patientCount} label="Patients" accent="pink" />
          <DashboardStat value={data.appointmentsThisWeek} label="Appointments this week" accent="amber" />
          <Link to="/reports" className="group rounded-xl border border-brand-200 bg-brand-800 p-4 text-white transition-colors hover:bg-brand-900">
            <p className="flex items-center gap-1 text-2xl font-semibold tracking-tight">Reports <ArrowUpRight className="size-5" /></p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-brand-200">Revenue &amp; insights</p>
          </Link>
        </CardContent>
      </Card>

      <InventoryAlertBanner lowStockCount={data.inventoryAlerts.lowStockCount} outOfStockCount={data.inventoryAlerts.outOfStockCount} />

      <div className="grid gap-5 md:grid-cols-2">
        <DonutChartCard percent={data.patientCount ? Math.min(100, Math.round((data.appointmentsThisWeek / Math.max(data.patientCount, 1)) * 100)) : 0} label="Clinic activity" items={[{ label: "Appointments", value: String(data.appointmentsThisWeek), color: "#6c5ce7" }, { label: "Patients", value: String(data.patientCount), color: "#ec4899" }, { label: "Physios", value: String(data.physiotherapistCount), color: "#10b981" }]} />
        <Card>
          <CardContent>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700"><Building2 className="size-4" /></span>
                <h2 className="font-semibold text-ink-900">Care team</h2>
              </div>
              <span className="text-xs font-medium text-ink-400">{data.physiotherapists.length} members</span>
            </div>
            {data.physiotherapists.length === 0 ? (
              <EmptyState title="No physiotherapists yet" description="Add staff to start scheduling appointments." />
            ) : (
              data.physiotherapists.map((p) => (
                <div key={p.id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{p.user.fullName.charAt(0)}</div>
                  <div className="min-w-0">
                    <p className="font-medium text-ink-900">{p.user.fullName}</p>
                    <p className="text-sm text-ink-500">{p.specialty ?? "General practice"}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-teal-100 text-teal-700"><Users className="size-4" /></span>
                <h2 className="font-semibold text-ink-900">Patients</h2>
              </div>
              <span className="text-xs font-medium text-ink-400">{data.patients.length} records</span>
            </div>
            {data.patients.length === 0 ? (
              <EmptyState title="No patients yet" description="Patients will appear here once they register with the clinic." />
            ) : (
              data.patients.map((p) => (
                <div key={p.id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-bold text-ink-700">{p.user.fullName.charAt(0)}</div>
                  <div className="min-w-0">
                    <p className="font-medium text-ink-900">{p.user.fullName}</p>
                    <p className="text-sm text-ink-500">{p.condition ?? "No condition on file"}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
