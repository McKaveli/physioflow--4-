import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileText,
  HeartPulse,
  Package,
  Sparkles,
  Users,
} from "lucide-react";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonCard } from "../components/ui/Skeleton";
import { InventoryAlertBanner } from "../components/ui/InventoryAlertBanner";
import { usePhysioDashboard } from "../features/physiotherapists/hooks";
import { useAuthStore } from "../lib/authStore";

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

function KpiCard({
  label,
  value,
  delta,
  detail,
  accent,
  icon: Icon,
  to,
}: {
  label: string;
  value: number | string;
  delta: string;
  detail: string;
  accent: "purple" | "teal" | "blue";
  icon: typeof Users;
  to: string;
}) {
  const styles = {
    purple: { surface: "bg-violet-50/75", icon: "bg-violet-100 text-violet-700", bar: "bg-violet-500" },
    teal: { surface: "bg-teal-50/75", icon: "bg-teal-100 text-teal-700", bar: "bg-teal-500" },
    blue: { surface: "bg-blue-50/75", icon: "bg-blue-100 text-blue-700", bar: "bg-blue-500" },
  }[accent];

  return (
    <Link
      to={to}
      className={`group relative block min-h-[150px] overflow-hidden rounded-[22px] border border-white/80 p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(15,23,42,0.12)] ${styles.surface}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${styles.bar}`} />
      <div className="flex h-full items-start gap-4">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${styles.icon}`}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold uppercase tracking-[0.13em] text-slate-600">{label}</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <p className="text-[48px] font-extrabold leading-[0.86] tracking-[-0.07em] text-[#102d4e]">{value}</p>
            {delta !== "—" ? <span className="mb-0.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">{delta}</span> : null}
          </div>
          <p className="mt-3 text-[11px] font-medium text-slate-500">{detail}</p>
        </div>
        <span className="mt-auto flex size-8 shrink-0 items-center justify-center rounded-full border border-slate-300/70 bg-white/55 text-slate-500 transition group-hover:border-slate-400 group-hover:bg-white group-hover:text-slate-900">
          <ArrowUpRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}

function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        {eyebrow ? <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{eyebrow}</p> : null}
        <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-950">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function PhysioDashboardPage() {
  const { fullName } = useAuthStore();
  const { data, isLoading, isError, refetch } = usePhysioDashboard();
  const firstName = fullName?.split(" ")[0] ?? "Sarah";

  if (isLoading) {
    return (
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState message="We couldn't load your clinical dashboard." onRetry={() => refetch()} />;
  }

  const nextAppointment = data.todaysAppointments[0];
  const attention = data.patientsNeedingAttention[0];

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-[26px] bg-[#102d4e] px-6 py-7 text-white shadow-[0_20px_45px_rgba(15,45,78,0.16)] sm:px-8 sm:py-8">
        <div className="absolute -right-10 -top-16 size-56 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-0 right-24 h-28 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute right-8 top-7 hidden h-36 w-56 rotate-[-8deg] rounded-[28px] border border-white/10 bg-gradient-to-br from-white/15 to-cyan-300/5 lg:block" />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">Clinical workspace</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Good morning, {firstName}.</h1>
            <p className="mt-2 text-sm text-blue-100">Your schedule and patient signals, in one view.</p>
          </div>
          <Link to="/appointments" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-[#102d4e] transition hover:bg-cyan-100">
            Full calendar <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <div className="relative z-10 mt-7 flex flex-wrap items-center gap-3 text-xs text-blue-100">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"><HeartPulse className="size-4 text-cyan-300" /> {data.patientsNeedingAttention.length} patients need attention</span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"><Sparkles className="size-4 text-cyan-300" /> {data.totalAppointmentsThisWeek} appointments this week</span>
        </div>
      </section>

      <InventoryAlertBanner lowStockCount={data.inventoryAlerts.lowStockCount} outOfStockCount={data.inventoryAlerts.outOfStockCount} />

      <div className="grid items-start gap-6 lg:grid-cols-3 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4">
          <div className="px-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">At a glance</p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">Today&apos;s signals</h2>
          </div>
          <KpiCard label="Total patients" value={data.activePatientCount} delta="—" detail="Historical comparison unavailable" accent="purple" icon={Users} to="/patients" />
          <KpiCard label="Today&apos;s appointments" value={data.todaysAppointmentCount} delta="—" detail="Historical comparison unavailable" accent="teal" icon={CalendarDays} to="/appointments" />
          <KpiCard label="Treatment plans" value={data.plansToReviewCount} delta="—" detail="Plans needing review" accent="blue" icon={ClipboardList} to="/treatment-plans" />
        </aside>

        <div className="col-span-2 grid min-w-0 gap-6 lg:col-span-2 xl:col-span-1">
          <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)] sm:p-6">
            <SectionHeading
              eyebrow="Today"
              title="Clinical schedule"
              action={<Link to="/appointments" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-950">View calendar <ArrowRight className="size-3.5" /></Link>}
            />
            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
              {Array.from({ length: 7 }, (_, index) => {
                const current = index === 2;
                return (
                  <div key={index} className={`min-w-[62px] rounded-2xl px-2 py-3 text-center ${current ? "bg-[#102d4e] text-white" : "bg-slate-50 text-slate-500"}`}>
                    <p className={`text-[10px] font-bold uppercase ${current ? "text-cyan-300" : "text-slate-400"}`}>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}</p>
                    <p className="mt-1 text-lg font-bold">{12 + index}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {data.todaysAppointments.slice(0, 4).map((appointment) => (
                <Link key={appointment.id} to={`/appointments?appointmentId=${appointment.id}`} className="group flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition hover:border-cyan-200 hover:bg-cyan-50/40">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700">{initials(appointment.patient.user.fullName)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-900">{appointment.patient.user.fullName}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500">{appointment.treatmentFocus ?? "Physiotherapy session"}</span>
                  </span>
                  <span className="text-right">
                    <span className="block text-xs font-bold text-slate-800">{new Date(appointment.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                    <span className="mt-1 block text-[10px] capitalize text-slate-400">{appointment.status.toLowerCase()}</span>
                  </span>
                  <ChevronRight className="size-4 text-slate-300 transition group-hover:text-slate-700" />
                </Link>
              ))}
              {data.todaysAppointments.length === 0 ? <p className="col-span-full rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No appointments scheduled for today.</p> : null}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)] sm:p-6">
              <SectionHeading eyebrow="Patient signals" title="Needs your attention" action={<Link to="/patients" className="text-xs font-bold text-slate-500 hover:text-slate-950">View all</Link>} />
              {attention ? (
                <Link to={`/patients/${attention.patientId}`} className="mt-5 flex items-center gap-4 rounded-2xl bg-rose-50/70 p-4 transition hover:bg-rose-50">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-700">{initials(attention.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-slate-900">{attention.name}</span>
                    <span className="mt-1 block text-xs text-slate-500">{attention.daysSinceActivity == null ? "No recent activity" : `${attention.daysSinceActivity} days since activity`}</span>
                  </span>
                  <span className="text-right"><span className="block text-lg font-bold text-rose-700">{attention.adherence}%</span><span className="text-[10px] font-bold uppercase text-rose-500">adherence</span></span>
                </Link>
              ) : <div className="mt-5 rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-800"><CheckCircle2 className="mb-2 size-5" />All patient signals are on track.</div>}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-2xl font-bold text-slate-950">{data.adherencePct}%</p><p className="mt-1 text-xs text-slate-500">Average adherence</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-2xl font-bold text-slate-950">{data.completionRatePct}%</p><p className="mt-1 text-xs text-slate-500">Visit completion</p></div>
              </div>
            </section>

            <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)] sm:p-6">
              <SectionHeading eyebrow="Next up" title="Care snapshot" />
              <div className="mt-5 rounded-2xl bg-gradient-to-br from-[#102d4e] to-[#176c83] p-5 text-white">
                <div className="flex items-start justify-between gap-3"><Clock3 className="size-5 text-cyan-300" /><span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase">{nextAppointment ? "Upcoming" : "No upcoming visit"}</span></div>
                <p className="mt-8 text-2xl font-bold">{nextAppointment ? nextAppointment.patient.user.fullName : "No upcoming visit"}</p>
                <p className="mt-1 text-sm text-blue-100">{nextAppointment?.treatmentFocus ?? "Your schedule is clear."}</p>
                {nextAppointment ? <p className="mt-4 text-xs font-semibold text-cyan-200">{new Date(nextAppointment.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p> : null}
              </div>
              <Link to="/treatment-plans" className="mt-4 flex items-center justify-between rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-800 transition hover:bg-blue-100"><span className="flex items-center gap-2"><FileText className="size-4" /> Review treatment plans</span><ArrowRight className="size-4" /></Link>
            </section>
          </div>

          <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)] sm:p-6">
            <SectionHeading eyebrow="Operations" title="Weekly care volume" action={<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">This week</span>} />
            <div className="mt-6 grid h-44 grid-cols-7 items-end gap-2 sm:gap-4">
              {data.weeklyOverview.map((day) => {
                const max = Math.max(...data.weeklyOverview.map((item) => item.appointments), 1);
                return <div key={day.day} className="flex h-full flex-col items-center justify-end gap-2"><div className="flex h-full w-full max-w-12 items-end rounded-t-xl bg-slate-50"><div className="w-full rounded-t-xl bg-gradient-to-t from-blue-600 to-cyan-400" style={{ height: `${Math.max(8, (day.appointments / max) * 100)}%` }} /></div><span className="text-[10px] font-bold text-slate-400">{day.day.slice(0, 3)}</span></div>;
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500"><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-cyan-400" /> Appointments {data.totalAppointmentsThisWeek}</span><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-blue-600" /> Completed {data.completedThisWeek}</span><span className="flex items-center gap-2"><Package className="size-3.5" /> {data.inventoryAlerts.lowStockCount + data.inventoryAlerts.outOfStockCount} inventory alerts</span></div>
          </section>
        </div>
      </div>
    </div>
  );
}
