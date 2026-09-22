import { eq, and } from "drizzle-orm";
import { db } from "../../db/client.js";
import { treatmentPlans, exerciseAssignments, exercises, patients, physiotherapists } from "../../db/schema.js";
import { AppError } from "../../lib/AppError.js";

export async function listTreatmentPlans(clinicId: string, filters: { patientId?: string; physioId?: string }) {
  return db.query.treatmentPlans.findMany({
    where: (t, { eq: eqOp, and: andOp }) => {
      const clauses = [eqOp(t.clinicId, clinicId)];
      if (filters.patientId) clauses.push(eqOp(t.patientId, filters.patientId));
      if (filters.physioId) clauses.push(eqOp(t.physioId, filters.physioId));
      return andOp(...clauses);
    },
    with: { exerciseAssignments: { with: { exercise: true } } },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
}

export async function getTreatmentPlan(id: string) {
  const plan = await db.query.treatmentPlans.findFirst({
    where: eq(treatmentPlans.id, id),
    with: {
      exerciseAssignments: { with: { exercise: true, completions: true } },
      patient: { with: { user: { columns: { fullName: true } } } },
      physio: { with: { user: { columns: { fullName: true } } } },
    },
  });
  if (!plan) throw AppError.notFound("Treatment plan not found.");
  return plan;
}

interface ExerciseInput {
  exerciseId: string;
  sets?: number;
  reps?: number;
  durationSec?: number;
  frequency?: string;
  instructions?: string;
}

export async function createTreatmentPlan(input: {
  clinicId: string;
  patientId: string;
  physioId: string;
  title: string;
  goals: string[];
  startDate: Date;
  endDate?: Date;
  frequency?: string;
  status?: "DRAFT" | "ACTIVE";
  exerciseInputs: ExerciseInput[];
}) {
  // Cross-tenant guard: the patient and physio being linked must actually belong to the
  // clinic this plan is being created under — never trust the ids alone.
  const patient = await db.query.patients.findFirst({ where: eq(patients.id, input.patientId) });
  if (!patient || patient.clinicId !== input.clinicId) throw AppError.notFound("Patient not found.");

  const physio = await db.query.physiotherapists.findFirst({ where: eq(physiotherapists.id, input.physioId) });
  if (!physio || physio.clinicId !== input.clinicId) throw AppError.notFound("Physiotherapist not found.");

  // Validate every referenced exercise exists AND belongs to the same institution's library.
  for (const ex of input.exerciseInputs) {
    const found = await db.query.exercises.findFirst({ where: eq(exercises.id, ex.exerciseId) });
    if (!found || found.clinicId !== input.clinicId) {
      throw AppError.badRequest(`Exercise ${ex.exerciseId} does not exist in this clinic's library.`);
    }
  }

  const [plan] = await db
    .insert(treatmentPlans)
    .values({
      clinicId: input.clinicId,
      patientId: input.patientId,
      physioId: input.physioId,
      title: input.title,
      goals: JSON.stringify(input.goals),
      startDate: input.startDate,
      endDate: input.endDate,
      frequency: input.frequency,
      status: input.status ?? "DRAFT",
    })
    .returning();

  if (input.exerciseInputs.length > 0) {
    await db.insert(exerciseAssignments).values(
      input.exerciseInputs.map((ex) => ({
        clinicId: input.clinicId,
        treatmentPlanId: plan.id,
        exerciseId: ex.exerciseId,
        patientId: input.patientId,
        sets: ex.sets,
        reps: ex.reps,
        durationSec: ex.durationSec,
        frequency: ex.frequency ?? input.frequency,
        instructions: ex.instructions,
      }))
    );
  }

  return getTreatmentPlan(plan.id);
}

export async function updateTreatmentPlanStatus(id: string, status: (typeof treatmentPlans.$inferSelect)["status"]) {
  await getTreatmentPlan(id);
  const [updated] = await db.update(treatmentPlans).set({ status, updatedAt: new Date() }).where(eq(treatmentPlans.id, id)).returning();
  return updated;
}

export async function assignPlan(id: string) {
  return updateTreatmentPlanStatus(id, "ACTIVE");
}
