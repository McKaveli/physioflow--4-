import type { ReactNode } from "react";
import clsx from "clsx";
import { ArrowUpRight } from "lucide-react";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../ui/Card";
import { DeltaBadge } from "../ui/DeltaBadge";

export function DashboardStat({
  value,
  label,
  detail = "Compared to last month",
  delta,
  current,
  previous,
  accent = "purple",
  icon,
}: {
  value: string | number;
  label: string;
  detail?: string;
  delta?: string;
  current?: number;
  previous?: number;
  accent?: "purple" | "pink" | "amber" | "green" | "blue";
  icon?: ReactNode;
}) {
  const accents = {
    purple: "bg-[#6c5ce7]/12 text-[#6c5ce7]",
    pink: "bg-pink-100 text-pink-700",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
          {icon ? <span className={clsx("flex size-9 items-center justify-center rounded-full", accents[accent])}>{icon}</span> : null}
        </div>
        <p className="mt-4 text-3xl font-bold tracking-tight text-zinc-950">{value}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs text-zinc-500">{detail}</p>
          {current != null ? <DeltaBadge current={current} previous={previous} /> : delta ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700">{delta}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function DetailRecordCard({
  name,
  subtitle,
  status = "Active",
  stats,
  lines,
  notes,
  action,
}: {
  name: string;
  subtitle: string;
  status?: string;
  stats: Array<{ label: string; value: string | number }>;
  lines: Array<{ label: string; value: string | number }>;
  notes: string;
  action: { label: string; to: string };
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-[#6c5ce7] text-sm font-bold text-white">{name.charAt(0)}</span>
          <div className="min-w-0 flex-1"><p className="truncate font-semibold text-zinc-950">{name}</p><p className="truncate text-xs text-zinc-500">{subtitle}</p></div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">{status}</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">{stats.map((stat) => <div key={stat.label} className="rounded-2xl bg-zinc-50 p-3"><p className="text-lg font-bold text-zinc-950">{stat.value}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500">{stat.label}</p></div>)}</div>
        <div className="mt-4 divide-y divide-zinc-100">{lines.map((line) => <div key={line.label} className="flex items-center justify-between py-2 text-xs"><span className="text-zinc-500">{line.label}</span><strong className="text-zinc-900">{line.value}</strong></div>)}</div>
        <div className="mt-3 rounded-2xl bg-zinc-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Notes</p><p className="mt-1 line-clamp-2 text-xs text-zinc-600">{notes}</p></div>
        <DashboardCta to={action.to}>{action.label}</DashboardCta>
      </CardContent>
    </Card>
  );
}

export function ImageMetricCard({
  name,
  subtitle,
  stats,
  action,
}: {
  name: string;
  subtitle: string;
  stats: Array<{ label: string; value: string | number }>;
  action: { label: string; to: string };
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex h-36 items-end rounded-2xl bg-gradient-to-br from-[#6c5ce7] via-[#3b82f6] to-[#0f172a] p-4"><span className="flex size-14 items-center justify-center rounded-full bg-white/20 text-xl font-bold text-white backdrop-blur">{name.charAt(0)}</span></div>
        <div className="mt-4 flex items-start justify-between gap-3"><div><h2 className="font-semibold text-zinc-950">{name}</h2><p className="text-xs text-zinc-500">{subtitle}</p></div><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">On track</span></div>
        <div className="mt-4 grid grid-cols-2 gap-2">{stats.map((stat) => <div key={stat.label} className="rounded-2xl bg-zinc-50 p-3"><p className="text-lg font-bold text-zinc-950">{stat.value}</p><p className="text-[10px] uppercase tracking-wide text-zinc-500">{stat.label}</p></div>)}</div>
        <DashboardCta to={action.to}>{action.label}</DashboardCta>
      </CardContent>
    </Card>
  );
}

export function BarChartCard({ values }: { values: Array<{ label: string; value: number; color: string }> }) {
  const max = Math.max(...values.map((value) => value.value), 1);
  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Activity</p><h2 className="mt-1 font-semibold text-zinc-950">Monthly volume</h2></div><span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">Monthly ▾</span></div>
        <div className="mt-4 flex gap-4 text-xs text-zinc-500">{values.map((value) => <span key={value.label} className="flex items-center gap-1"><i className="size-2 rounded-full" style={{ backgroundColor: value.color }} />{value.label}</span>)}</div>
        <div className="mt-5 flex h-36 items-end justify-around gap-3 border-b border-zinc-200">{values.map((value) => <div key={value.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="w-full max-w-10 rounded-t-xl" style={{ height: `${Math.max(10, (value.value / max) * 100)}%`, backgroundColor: value.color }} /><span className="text-[10px] text-zinc-500">{value.label}</span></div>)}</div>
      </CardContent>
    </Card>
  );
}

export function DashboardCta({ children, to }: { children: ReactNode; to: string }) {
  return (
    <Link to={to} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6c5ce7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6c5ce7]">
      {children}
      <ArrowUpRight className="size-4" />
    </Link>
  );
}

export function TimelineScheduleCard({
  appointments,
  title = "Clinical schedule",
}: {
  appointments: Array<{ id: string; startsAt: string; patient: { user: { fullName: string } }; treatmentFocus: string | null; status: string }>;
  title?: string;
}) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index - 2));
  const colors = ["#6c5ce7", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Today</p><h2 className="mt-1 text-lg font-semibold text-zinc-950">{title}</h2></div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">{appointments.length} visits</span>
        </div>
        <div className="overflow-x-auto border-b border-zinc-200 bg-zinc-50 px-3 py-3">
          <div className="grid min-w-[420px] grid-cols-7 gap-1">
          {days.map((day) => {
            const current = isSameDay(day, today);
            return <div key={day.toISOString()} className={clsx("rounded-2xl px-1 py-2 text-center", current && "bg-zinc-950 text-white shadow-lg")}><p className={clsx("text-[10px] font-semibold uppercase", current ? "text-zinc-400" : "text-zinc-500")}>{format(day, "EEE")}</p><p className="mt-1 text-sm font-bold">{format(day, "d")}</p></div>;
          })}
          </div>
        </div>
        {appointments.length === 0 ? (
          <div className="px-5 py-10"><p className="text-center text-sm font-medium text-zinc-700">No visits scheduled</p><p className="mt-1 text-center text-xs text-zinc-500">Your calendar is clear for today.</p></div>
        ) : (
          <div className="space-y-2 px-5 py-4">
            {appointments.map((appointment, index) => (
              <div key={appointment.id} className={clsx("flex items-center gap-3 rounded-full px-3 py-2.5", index % 3 === 1 && "ml-[10%]", index % 3 === 2 && "ml-[20%]")} style={{ backgroundColor: `${colors[index % colors.length]}16` }}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: colors[index % colors.length] }}>{appointment.patient.user.fullName.charAt(0)}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">{appointment.patient.user.fullName}</span>
                <span className="hidden text-xs text-zinc-500 sm:block">{appointment.treatmentFocus ?? "General session"}</span>
                <span className="text-xs font-semibold text-zinc-700">{format(new Date(appointment.startsAt), "h:mm a")}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DonutChartCard({ percent, label, items }: { percent: number; label: string; items: Array<{ label: string; value: string; color: string }> }) {
  return (
    <Card>
      <CardContent>
        <div className="mb-5 flex items-center justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Overview</p><h2 className="mt-1 font-semibold text-zinc-950">{label}</h2></div>
          <span className="text-zinc-400">•••</span>
        </div>
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex size-32 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#6c5ce7 ${percent}%, #171717 0)` }}>
            <div className="flex size-24 flex-col items-center justify-center rounded-full bg-white"><strong className="text-2xl text-zinc-950">{percent}%</strong><span className="text-[10px] text-zinc-500">complete</span></div>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-2">{items.map((item) => <div key={item.label} className="flex items-center justify-between gap-3 text-xs"><span className="flex items-center gap-2 text-zinc-600"><i className="size-2 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span><strong className="text-zinc-950">{item.value}</strong></div>)}</div>
        </div>
      </CardContent>
    </Card>
  );
}
