import { eq, and, gte, lt, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "../../db/client.js";
import { physiotherapists, users, patients, appointments, treatmentPlans, exerciseAssignments, exerciseCompletions, inventoryItems, auditLogs } from "../../db/schema.js";
import { AppError } from "../../lib/AppError.js";

const AUDIT_ACTION_LABEL: Record<string, string> = {
  PATIENT_CREATED: "New patient registered",
  PATIENT_UPDATED: "Patient information updated",
  APPOINTMENT_CREATED: "Appointment scheduled",
  APPOINTMENT_CHANGED: "Appointment rescheduled",
  APPOINTMENT_CANCELLED: "Appointment cancelled",
  EXERCISE_CREATED: "New exercise added to library",
  EXERCISE_ASSIGNED: "Treatment plan assigned",
  INVENTORY_ADJUSTED: "Inventory stock updated",
  STAFF_INVITED: "New staff member added",
  PATIENT_INVITATION_SENT: "Patient invitation sent",
  PATIENT_INVITATION_ACCEPTED: "Patient completed onboarding",
};

export async function listPhysiotherapists(clinicId?: string) {
  return db.query.physiotherapists.findMany({
    where: clinicId ? eq(physiotherapists.clinicId, clinicId) : undefined,
    with: { user: { columns: { fullName: true, email: true, avatarUrl: true, phone: true } } },
  });
}

export async function getPhysiotherapistByUserId(userId: string) {
  const physio = await db.query.physiotherapists.findFirst({ where: eq(physiotherapists.userId, userId) });
  if (!physio) throw AppError.notFound("Physiotherapist profile not found.");
  return physio;
}

export async function getPhysiotherapist(id: string) {
  const physio = await db.query.physiotherapists.findFirst({
    where: eq(physiotherapists.id, id),
    with: { user: { columns: { fullName: true, email: true, avatarUrl: true, phone: true } } },
  });
  if (!physio) throw AppError.notFound("Physiotherapist not found.");
  return physio;
}

export async function updatePhysiotherapist(
  id: string,
  input: Partial<{ specialty: string; bio: string; licenseNo: string; yearsExperience: number }>
) {
  await getPhysiotherapist(id);
  const [updated] = await db.update(physiotherapists).set(input).where(eq(physiotherapists.id, id)).returning();
  return updated;
}

/** Admin creates a staff account. Deliberately does NOT issue an auth session/cookie —
 *  this runs in the admin's own authenticated request, and setting a cookie for the new
 *  account here would silently swap out the admin's own session. */
export async function createPhysiotherapistStaff(input: {
  clinicId: string;
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  specialty?: string;
}) {
  const existing = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (existing) throw AppError.conflict("An account with that email already exists.");

  const passwordHash = await bcrypt.hash(input.password, 12);
  const [user] = await db
    .insert(users)
    .values({ email: input.email, passwordHash, role: "PHYSIOTHERAPIST", fullName: input.fullName, phone: input.phone })
    .returning();

  const [physio] = await db
    .insert(physiotherapists)
    .values({ userId: user.id, clinicId: input.clinicId, specialty: input.specialty })
    .returning();

  return { ...physio, user: { fullName: user.fullName, email: user.email } };
}

/** Powers the physio dashboard: today's appointments, active patient count, plans to review, adherence. */
export async function getDashboard(physioId: string, clinicId: string) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const todaysAppointments = await db.query.appointments.findMany({
    where: and(eq(appointments.physioId, physioId), gte(appointments.startsAt, startOfToday), lt(appointments.startsAt, endOfToday)),
    with: { patient: { with: { user: { columns: { fullName: true } } } } },
    orderBy: (a, { asc }) => [asc(a.startsAt)],
  });

  const activePatients = await db.query.patients.findMany({
    where: eq(patients.primaryPhysioId, physioId),
    with: { user: { columns: { fullName: true } } },
  });

  const sevenDaysAgoForNewPatients = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newPatientsThisWeek = activePatients.filter((p) => p.createdAt >= sevenDaysAgoForNewPatients).length;

  const draftPlans = await db.query.treatmentPlans.findMany({
    where: and(eq(treatmentPlans.physioId, physioId), eq(treatmentPlans.status, "DRAFT")),
  });

  // Adherence: completed vs total completions logged across this physio's assignments in the last 7 days.
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const patientIds = activePatients.map((p) => p.id);
  let adherencePct = 0;
  let adherenceTrendPct = 0;
  let patientsNeedingAttention: Array<{ patientId: string; name: string; adherence: number; lastActivity: Date | null; daysSinceActivity: number | null }> = [];

  if (patientIds.length > 0) {
    const assignments = await db.query.exerciseAssignments.findMany({
      where: (ea, { inArray }) => inArray(ea.patientId, patientIds),
      with: { completions: true },
    });

    const totalCompletions = assignments.flatMap((a) => a.completions);
    const completedCount = totalCompletions.filter((c) => c.state === "COMPLETED").length;
    adherencePct = totalCompletions.length > 0 ? Math.round((completedCount / totalCompletions.length) * 100) : 0;

    // Week-over-week adherence trend across all this physio's patients (same method used
    // for the individual patient dashboard's trend, just aggregated clinic-wide for this physio).
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const thisWeekCompletions = totalCompletions.filter((c) => c.date >= sevenDaysAgo);
    const lastWeekCompletions = totalCompletions.filter((c) => c.date >= fourteenDaysAgo && c.date < sevenDaysAgo);
    const thisWeekPct = thisWeekCompletions.length
      ? (thisWeekCompletions.filter((c) => c.state === "COMPLETED").length / thisWeekCompletions.length) * 100
      : 0;
    const lastWeekPct = lastWeekCompletions.length
      ? (lastWeekCompletions.filter((c) => c.state === "COMPLETED").length / lastWeekCompletions.length) * 100
      : 0;
    adherenceTrendPct = Math.round(thisWeekPct - lastWeekPct);

    // Per-patient adherence for "needs attention"
    const byPatient = new Map<string, { total: number; completed: number; lastActivity: Date | null }>();
    for (const a of assignments) {
      const entry = byPatient.get(a.patientId) ?? { total: 0, completed: 0, lastActivity: null };
      for (const c of a.completions) {
        entry.total += 1;
        if (c.state === "COMPLETED") entry.completed += 1;
        if (!entry.lastActivity || c.date > entry.lastActivity) entry.lastActivity = c.date;
      }
      byPatient.set(a.patientId, entry);
    }

    patientsNeedingAttention = activePatients
      .map((p) => {
        const stats = byPatient.get(p.id);
        const pct = stats && stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
        const daysSinceActivity = stats?.lastActivity
          ? Math.floor((Date.now() - stats.lastActivity.getTime()) / (24 * 60 * 60 * 1000))
          : null;
        return { patientId: p.id, name: p.user.fullName, adherence: pct, lastActivity: stats?.lastActivity ?? null, daysSinceActivity };
      })
      .filter((p) => p.adherence < 60 || p.daysSinceActivity === null || p.daysSinceActivity >= 3)
      .sort((a, b) => a.adherence - b.adherence)
      .slice(0, 5);
  }

  // Low-stock alert count for the dashboard banner (AGENT.md §13 — visible on both
  // physio and admin dashboards, not just the inventory page itself).
  const allItems = await db.query.inventoryItems.findMany({ where: eq(inventoryItems.clinicId, clinicId) });
  const lowStockCount = allItems.filter((i) => i.quantity <= i.minStockThreshold && i.quantity > 0).length;
  const outOfStockCount = allItems.filter((i) => i.quantity <= 0).length;

  // Weekly overview: appointments scheduled vs. completed, per day, for the current Mon–Sun week.
  // Real per-day aggregation from actual appointment rows, not a fabricated trend line.
  const dayOfWeek = (startOfToday.getDay() + 6) % 7; // 0 = Monday
  const weekStart = new Date(startOfToday);
  weekStart.setDate(weekStart.getDate() - dayOfWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weekAppointments = await db.query.appointments.findMany({
    where: and(eq(appointments.physioId, physioId), gte(appointments.startsAt, weekStart), lt(appointments.startsAt, weekEnd)),
  });

  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyOverview = DAY_LABELS.map((label, i) => {
    const dayStart = new Date(weekStart);
    dayStart.setDate(dayStart.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const dayAppointments = weekAppointments.filter((a) => a.startsAt >= dayStart && a.startsAt < dayEnd);
    return {
      day: label,
      appointments: dayAppointments.length,
      completed: dayAppointments.filter((a) => a.status === "COMPLETED").length,
    };
  });

  const totalAppointmentsThisWeek = weekAppointments.length;
  const completedThisWeek = weekAppointments.filter((a) => a.status === "COMPLETED").length;
  const completionRatePct = totalAppointmentsThisWeek > 0 ? Math.round((completedThisWeek / totalAppointmentsThisWeek) * 100) : 0;

  // Adherence distribution across ALL active patients (not just the "needs attention" subset),
  // bucketed for the dashboard's donut chart.
  let adherenceDistribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
  if (patientIds.length > 0) {
    const allAssignments = await db.query.exerciseAssignments.findMany({
      where: (ea, { inArray }) => inArray(ea.patientId, patientIds),
      with: { completions: true },
    });
    const byPatientPct = new Map<string, number>();
    for (const patientId of patientIds) {
      const patientCompletions = allAssignments.filter((a) => a.patientId === patientId).flatMap((a) => a.completions);
      const pct =
        patientCompletions.length > 0
          ? Math.round((patientCompletions.filter((c) => c.state === "COMPLETED").length / patientCompletions.length) * 100)
          : 0;
      byPatientPct.set(patientId, pct);
    }
    for (const pct of byPatientPct.values()) {
      if (pct >= 90) adherenceDistribution.excellent += 1;
      else if (pct >= 70) adherenceDistribution.good += 1;
      else if (pct >= 50) adherenceDistribution.fair += 1;
      else adherenceDistribution.poor += 1;
    }
  }

  // Recent activity feed, sourced from the real audit log — not a fabricated timeline.
  const recentAuditEntries = await db.query.auditLogs.findMany({
    where: eq(auditLogs.clinicId, clinicId),
    orderBy: (a, { desc }) => [desc(a.createdAt)],
    limit: 8,
    with: { actor: { columns: { fullName: true } } },
  });
  const recentActivity = recentAuditEntries.map((entry) => ({
    id: entry.id,
    label: AUDIT_ACTION_LABEL[entry.action] ?? entry.action,
    actorName: entry.actor?.fullName ?? "System",
    createdAt: entry.createdAt,
  }));

  return {
    todaysAppointmentCount: todaysAppointments.length,
    activePatientCount: activePatients.length,
    newPatientsThisWeek,
    plansToReviewCount: draftPlans.length,
    adherencePct,
    adherenceTrendPct,
    todaysAppointments,
    patientsNeedingAttention,
    inventoryAlerts: { lowStockCount, outOfStockCount },
    weeklyOverview,
    totalAppointmentsThisWeek,
    completedThisWeek,
    completionRatePct,
    adherenceDistribution,
    recentActivity,
  };
}
