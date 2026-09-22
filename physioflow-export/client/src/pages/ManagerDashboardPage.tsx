import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  FileText,
  UserRound,
  Users,
} from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonCard } from "../components/ui/Skeleton";
import { InventoryAlertBanner } from "../components/ui/InventoryAlertBanner";
import { useClinicOverview } from "../features/clinics/hooks";
import { useAuthStore } from "../lib/authStore";
import { DonutChartCard } from "../components/dashboard/DashboardPrimitives";

function KpiCard({ icon: Icon, label, value, delta, tone }: { icon: typeof Users; label: string; value: string | number; delta?: string; tone: string }) {
  return (
    <Card className="group transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_35px_-20px_rgb(15_23_42_/_0.35)]">
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <span className={`flex size-11 items-center justify-center rounded-2xl ${tone}`}><Icon className="size-5" /></span>
          <ChevronRight className="size-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700" />
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <div className="mt-1 flex items-end gap-2"><strong className="text-3xl font-bold tracking-tight text-slate-900">{value}</strong>{delta ? <span className="mb-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">{delta}</span> : null}</div>
        <p className="mt-2 text-xs text-slate-500">Compared to last month</p>
      </CardContent>
    </Card>
  );
}

export function ManagerDashboardPage() {
  const { clinicId, fullName } = useAuthStore();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useClinicOverview(clinicId);

  if (!clinicId) return <EmptyState title="No clinic linked to your account" description="Ask a system administrator to link your admin account to a clinic." />;
  if (isLoading) return <div className="grid gap-6 md:grid-cols-2"><SkeletonCard /><SkeletonCard /></div>;
  if (isError || !data) return <ErrorState message="We couldn't load the clinic overview." onRetry={() => refetch()} />;

  const firstName = fullName?.split(" ")[0] ?? "there";

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-64px)] bg-[#f4f8fb] px-4 py-6 md:-mx-8 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6">
        <section className="relative isolate overflow-hidden rounded-[20px] bg-gradient-to-r from-[#123f82] via-[#0e6f9b] to-[#13a7a0] px-6 py-8 text-white shadow-[0_18px_40px_-25px_rgb(14_116_144_/_0.65)] md:px-8 md:py-10">
          <div className="absolute -right-10 -top-20 -z-10 size-72 rounded-full bg-white/10 blur-3xl" />
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-100">Clinic operations</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Good to see you, {firstName}.</h1>
            <p className="mt-2 text-sm text-cyan-50 md:text-base">Here's what's happening at your clinic today.</p>
            <p className="mt-6 text-sm font-semibold leading-tight text-white/90">{data.patientCount} patients · {data.appointmentsThisWeek} appointments this week</p>
          </div>
          <div className="pointer-events-none absolute bottom-0 right-0 hidden h-full w-2/5 bg-[radial-gradient(ellipse_at_center,_rgb(255_255_255_/_0.24),_transparent_65%)] md:block" aria-hidden />
          <Link to="/appointments" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-[#123f82] transition hover:bg-cyan-50 md:absolute md:right-8 md:top-8 md:mt-0">Open schedule <ArrowUpRight className="size-4" /></Link>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard icon={Users} label="Physiotherapists" value={data.physiotherapistCount} tone="bg-blue-100 text-blue-700" />
          <KpiCard icon={UserRound} label="Patients" value={data.patientCount} tone="bg-emerald-100 text-emerald-700" />
          <KpiCard icon={CalendarDays} label="Appointments this week" value={data.appointmentsThisWeek} tone="bg-purple-100 text-purple-700" />
          <Link to="/reports" className="group rounded-[20px] bg-gradient-to-br from-[#123f82] to-[#075e75] p-5 text-white shadow-[0_16px_32px_-22px_rgb(14_116_144_/_0.8)] transition hover:-translate-y-1">
            <div className="flex items-start justify-between"><span className="flex size-11 items-center justify-center rounded-2xl bg-white/15"><FileText className="size-5" /></span><ArrowUpRight className="size-5 text-cyan-100 transition group-hover:translate-x-1 group-hover:-translate-y-1" /></div>
            <p className="mt-5 text-lg font-bold">Reports</p><p className="mt-1 text-xs text-cyan-100">Revenue &amp; Insights</p>
            <div className="mt-4 flex h-8 items-end gap-1.5"><i className="h-3 w-2 rounded-t bg-cyan-300" /><i className="h-5 w-2 rounded-t bg-cyan-200" /><i className="h-8 w-2 rounded-t bg-white/80" /></div>
          </Link>
        </div>

        <InventoryAlertBanner lowStockCount={data.inventoryAlerts.lowStockCount} outOfStockCount={data.inventoryAlerts.outOfStockCount} />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
          <Card>
            <CardContent>
              <div className="mb-6 flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.17em] text-slate-400">Overview</p><h2 className="mt-1 text-xl font-bold text-slate-900">Care activity</h2></div><button className="rounded-full bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">This Month ▾</button></div>
              <DonutChartCard
                percent={data.patientCount ? Math.min(100, Math.round((data.appointmentsThisWeek / Math.max(data.patientCount, 1)) * 100)) : 0}
                label="Care activity"
                items={[
                  { label: "Appointments", value: String(data.appointmentsThisWeek), color: "#6c5ce7" },
                  { label: "Patients", value: String(data.patientCount), color: "#14b8a6" },
                  { label: "Physios", value: String(data.physiotherapistCount), color: "#ec4899" },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Users className="size-4" /></span><h2 className="text-lg font-bold text-slate-900">Care team</h2></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{data.physiotherapists.length} members</span></div>
              {data.physiotherapists.length ? data.physiotherapists.slice(0, 4).map((member, index) => <button key={member.id} onClick={() => navigate("/staff")} className="flex w-full items-center gap-3 border-b border-slate-100 py-4 text-left last:border-0 hover:bg-slate-50"><span className={`flex size-11 items-center justify-center rounded-full ${index % 2 ? "bg-purple-100 text-purple-700" : "bg-teal-100 text-teal-700"} text-sm font-bold`}>{member.user.fullName.charAt(0)}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900">{member.user.fullName}</strong><small className="block truncate text-xs text-slate-500">{member.specialty ?? "General practice"}</small></span><ChevronRight className="size-4 text-slate-400" /></button>) : <EmptyState title="No physiotherapists yet" description="Add staff to start scheduling appointments." />}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
          <Card>
            <CardContent>
              <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Users className="size-4" /></span><h2 className="text-lg font-bold text-slate-900">Patients</h2></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{data.patients.length} records</span></div>
              <div className="hidden grid-cols-[1.2fr_1.5fr_1fr_0.7fr_20px] gap-3 border-b border-slate-100 pb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:grid"><span>Name</span><span>Condition</span><span>Last visit</span><span>Status</span><span /></div>
              {data.patients.length ? data.patients.slice(0, 8).map((patient) => <button key={patient.id} onClick={() => navigate(`/patients/${patient.id}`)} className="grid w-full grid-cols-[1fr_20px] items-center gap-3 border-b border-slate-100 py-3 text-left last:border-0 hover:bg-slate-50 sm:grid-cols-[1.2fr_1.5fr_1fr_0.7fr_20px]"><span className="flex min-w-0 items-center gap-2"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{patient.user.fullName.charAt(0)}</span><span className="truncate text-sm font-semibold text-slate-900">{patient.user.fullName}</span></span><span className="hidden truncate text-xs text-slate-500 sm:block">{patient.condition ?? "No condition on file"}</span><span className="hidden text-xs text-slate-500 sm:block">—</span><span className="hidden w-fit rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 sm:block">—</span><ChevronRight className="size-4 text-slate-400" /></button>) : <EmptyState title="No patients yet" description="Patients will appear here once they register with the clinic." />}
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="mb-3 flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700"><Activity className="size-4" /></span><h2 className="text-lg font-bold text-slate-900">Recent Activity</h2></div>
              <EmptyState title="No activity yet" description="New appointments, messages, payments, and patient updates will appear here." />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
