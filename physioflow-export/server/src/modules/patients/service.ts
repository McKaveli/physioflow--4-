import { eq, and, gte, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  patients,
  users,
  physiotherapists,
  appointments,
  treatmentPlans,
  exerciseAssignments,
  exerciseCompletions,
  recoveryLogs,
  messages,
  conversations,
  patientDischarges,
  notifications,
} from "../../db/schema.js";
import { AppError } from "../../lib/AppError.js";

async function generatePatientCode(): Promise<string> {
  const [{ count }] = (await db.select({ count: sql<number>`count(*)` }).from(patients)) as Array<{ count: number }>;
  return `PF-${String(count + 1).padStart(6, "0")}`;
}

// Always scoped to a clinic — patientId/physioId filters (when present) narrow further
// within that clinic, they never substitute for clinic scoping.
export async function listPatients(clinicId: string, filters: { physioId?: string; search?: string; status?: string }) {
  const rows = await db.query.patients.findMany({
    where: (p, { eq: eqOp, and: andOp }) => {
      const clauses = [eqOp(p.clinicId, clinicId)];
      if (filters.physioId) clauses.push(eqOp(p.primaryPhysioId, filters.physioId));
      if (filters.status) clauses.push(eqOp(p.status, filters.status as any));
      return andOp(...clauses);
    },
    with: { user: { columns: { fullName: true, email: true, phone: true, avatarUrl: true } } },
  });

  if (filters.search) {
    const term = filters.search.toLowerCase();
    return rows.filter(
      (r) =>
        r.user.fullName.toLowerCase().includes(term) ||
        r.user.email.toLowerCase().includes(term) ||
        r.patientCode.toLowerCase().includes(term)
    );
  }
  return rows;
}

export async function getPatientByUserId(userId: string) {
  const patient = await db.query.patients.findFirst({ where: eq(patients.userId, userId) });
  if (!patient) throw AppError.notFound("Patient profile not found.");
  return patient;
}

export async function getPatient(id: string) {
  const patient = await db.query.patients.findFirst({
    where: eq(patients.id, id),
    with: {
      user: { columns: { fullName: true, email: true, phone: true, avatarUrl: true } },
      primaryPhysio: { with: { user: { columns: { fullName: true } } } },
    },
  });
  if (!patient) throw AppError.notFound("Patient not found.");
  return patient;
}

/**
 * Admin-only. This is the ONLY way a patient record (and its linked user account) comes
 * into existence — patients never self-register. The account is created with no password;
 * it becomes usable only once the patient accepts their invitation (see invitations.ts).
 */
export async function createPatient(input: {
  clinicId: string;
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: string;
  emergencyContact?: string;
  presentingComplaint?: string;
  bodyArea?: string;
  dateOfInjury?: Date;
  referringSource?: string;
  intakeNotes?: string;
  primaryPhysioId?: string;
  avatarUrl?: string;
}) {
  const existing = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (existing) throw AppError.conflict("An account with that email already exists.");

  // If a primary physio is specified, it must belong to this same clinic.
  if (input.primaryPhysioId) {
    const physio = await db.query.physiotherapists.findFirst({ where: eq(physiotherapists.id, input.primaryPhysioId) });
    if (!physio || physio.clinicId !== input.clinicId) {
      throw AppError.badRequest("Selected physiotherapist does not belong to this clinic.");
    }
  }

  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      passwordHash: null,
      role: "PATIENT",
      fullName: input.fullName,
      phone: input.phone,
      avatarUrl: input.avatarUrl,
    })
    .returning();

  const patientCode = await generatePatientCode();

  const [patient] = await db
    .insert(patients)
    .values({
      patientCode,
      userId: user.id,
      clinicId: input.clinicId,
      primaryPhysioId: input.primaryPhysioId,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      emergencyContact: input.emergencyContact,
      presentingComplaint: input.presentingComplaint,
      bodyArea: input.bodyArea,
      dateOfInjury: input.dateOfInjury,
      referringSource: input.referringSource,
      intakeNotes: input.intakeNotes,
      status: "PENDING_ONBOARDING",
    })
    .returning();

  return patient;
}

export async function updatePatient(
  id: string,
  input: Partial<{
    condition: string;
    gender: string;
    emergencyContact: string;
    primaryPhysioId: string;
    presentingComplaint: string;
    bodyArea: string;
    referringSource: string;
    intakeNotes: string;
    profession: string;
  }>
) {
  await getPatient(id);
  const [updated] = await db.update(patients).set(input).where(eq(patients.id, id)).returning();
  return updated;
}

export async function getDischarge(patientId: string) {
  return db.query.patientDischarges.findFirst({
    where: eq(patientDischarges.patientId, patientId),
    with: {
      physio: { with: { user: { columns: { fullName: true } } } },
      dischargedBy: { columns: { fullName: true } },
    },
  });
}

export async function dischargePatient(input: {
  clinicId: string;
  patientId: string;
  physioId: string;
  dischargedByUserId: string;
  treatmentOutcome: string;
  finalClinicalNotes: string;
  treatmentGoalsStatus: string;
  sessionsCompleted: number;
  dischargeReason: string;
  finalProgress: string;
  followUpRecommendations?: string;
}) {
  const patient = await db.query.patients.findFirst({ where: eq(patients.id, input.patientId) });
  if (!patient || patient.clinicId !== input.clinicId) throw AppError.notFound("Patient not found.");
  if (patient.primaryPhysioId !== input.physioId) throw AppError.forbidden("Only the treating physiotherapist can discharge this patient.");
  if (patient.status === "DISCHARGED" || patient.status === "TREATMENT_COMPLETED") {
    throw AppError.conflict("This patient has already been discharged.");
  }

  const existing = await getDischarge(input.patientId);
  if (existing) throw AppError.conflict("This patient has already been discharged.");

  const [discharge] = await db.insert(patientDischarges).values(input).returning();
  await db.update(patients).set({ status: "DISCHARGED" }).where(eq(patients.id, input.patientId));
  await db.insert(notifications).values({
    userId: patient.userId,
    type: "TREATMENT_PLAN_UPDATED",
    title: "Treatment completed",
    body: "Your physiotherapist has completed your treatment and recorded your discharge.",
  });
  return discharge;
}

/** Recovery % = share of exercise assignments (across all active plans) with a COMPLETED state logged this week. */
async function computeRecoveryPct(patientId: string) {
  const assignments = await db.query.exerciseAssignments.findMany({
    where: eq(exerciseAssignments.patientId, patientId),
    with: { completions: true },
  });
  const all = assignments.flatMap((a) => a.completions);
  if (all.length === 0) return { pct: 0, trend: 0 };

  const completed = all.filter((c) => c.state === "COMPLETED").length;
  const pct = Math.round((completed / all.length) * 100);

  const now = Date.now();
  const week = 7 * 24 * 60 * 60 * 1000;
  const thisWeek = all.filter((c) => now - c.date.getTime() < week);
  const lastWeek = all.filter((c) => now - c.date.getTime() >= week && now - c.date.getTime() < week * 2);
  const thisWeekPct = thisWeek.length ? (thisWeek.filter((c) => c.state === "COMPLETED").length / thisWeek.length) * 100 : 0;
  const lastWeekPct = lastWeek.length ? (lastWeek.filter((c) => c.state === "COMPLETED").length / lastWeek.length) * 100 : 0;

  return { pct, trend: Math.round(thisWeekPct - lastWeekPct) };
}

/** Powers the patient home screen. */
export async function getDashboard(patientId: string) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const activeAssignments = await db.query.exerciseAssignments.findMany({
    where: and(eq(exerciseAssignments.patientId, patientId), eq(exerciseAssignments.status, "ACTIVE")),
    with: {
      exercise: true,
      completions: { where: (c, { gte: g }) => g(c.date, startOfToday), orderBy: (c, { desc: d }) => [d(c.date)] },
    },
  });

  const todaysExercises = activeAssignments.map((a) => ({
    id: a.id,
    exerciseId: a.exercise.id,
    exerciseName: a.exercise.name,
    sets: a.sets ?? a.exercise.defaultSets,
    reps: a.reps ?? a.exercise.defaultReps,
    durationSec: a.durationSec ?? a.exercise.defaultDurationSec,
    state: a.completions[0]?.state ?? "NOT_STARTED",
    setsCompleted: a.completions[0]?.setsCompleted ?? 0,
  }));

  const upcomingAppointment = await db.query.appointments.findFirst({
    where: and(eq(appointments.patientId, patientId), gte(appointments.startsAt, new Date())),
    orderBy: (a, { asc: aAsc }) => [aAsc(a.startsAt)],
    with: { physio: { with: { user: { columns: { fullName: true } } } } },
  });

  const { pct: recoveryPct, trend } = await computeRecoveryPct(patientId);

  const conversation = await db.query.conversations.findFirst({ where: eq(conversations.patientId, patientId) });
  let latestMessage = null;
  if (conversation) {
    latestMessage = await db.query.messages.findFirst({
      where: eq(messages.conversationId, conversation.id),
      orderBy: (m, { desc: d }) => [d(m.createdAt)],
      with: { sender: { columns: { fullName: true, role: true } } },
    });
  }

  return {
    recoveryPct,
    recoveryTrend: trend,
    todaysExercises,
    upcomingAppointment,
    latestMessage,
  };
}

export async function getProgressHistory(patientId: string) {
  return db.query.recoveryLogs.findMany({
    where: eq(recoveryLogs.patientId, patientId),
    orderBy: (r, { asc: rAsc }) => [rAsc(r.date)],
    limit: 60,
  });
}
