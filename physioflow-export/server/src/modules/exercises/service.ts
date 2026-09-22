import { eq, and } from "drizzle-orm";
import { db } from "../../db/client.js";
import { exercises, exerciseAssignments, exerciseCompletions } from "../../db/schema.js";
import { AppError } from "../../lib/AppError.js";

// Every exercise belongs to exactly one institution's library — clinicId is always required
// and always derived server-side from the caller, never accepted from the client.
export async function listExercises(clinicId: string, filters: { bodyArea?: string; difficulty?: string; search?: string }) {
  const rows = await db.query.exercises.findMany({
    where: (e, { eq: eqOp, and: andOp }) => {
      const clauses = [eqOp(e.clinicId, clinicId)];
      if (filters.bodyArea) clauses.push(eqOp(e.bodyArea, filters.bodyArea));
      if (filters.difficulty) clauses.push(eqOp(e.difficulty, filters.difficulty as any));
      return andOp(...clauses);
    },
  });
  if (filters.search) {
    const term = filters.search.toLowerCase();
    return rows.filter((r) => r.name.toLowerCase().includes(term));
  }
  return rows;
}

export async function getExercise(id: string) {
  const exercise = await db.query.exercises.findFirst({ where: eq(exercises.id, id) });
  if (!exercise) throw AppError.notFound("Exercise not found.");
  return exercise;
}

export async function findExerciseByMediaUrl(url: string) {
  return db.query.exercises.findFirst({ where: eq(exercises.mediaUrl, url) });
}

export async function createExercise(input: {
  clinicId: string;
  name: string;
  bodyArea: string;
  difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  description: string;
  instructions: string;
  safetyNotes?: string;
  mediaUrl?: string;
  youtubeUrl?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultDurationSec?: number;
  defaultRestSec?: number;
}) {
  const [exercise] = await db.insert(exercises).values(input).returning();
  return exercise;
}

export async function getAssignment(id: string) {
  const assignment = await db.query.exerciseAssignments.findFirst({
    where: eq(exerciseAssignments.id, id),
    with: { exercise: true },
  });
  if (!assignment) throw AppError.notFound("Exercise assignment not found.");
  return assignment;
}

/** Records (or updates today's) completion state for an assigned exercise. */
export async function recordCompletion(
  assignmentId: string,
  input: { state: "IN_PROGRESS" | "COMPLETED" | "SKIPPED"; setsCompleted?: number; painLevel?: number; difficultyRating?: number; notes?: string }
) {
  await getAssignment(assignmentId);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const existing = await db.query.exerciseCompletions.findFirst({
    where: (c, { eq: eqOp, and: andOp, gte, lt }) =>
      andOp(eqOp(c.exerciseAssignmentId, assignmentId), gte(c.date, startOfToday), lt(c.date, endOfToday)),
  });

  if (existing) {
    const [updated] = await db
      .update(exerciseCompletions)
      .set(input)
      .where(eq(exerciseCompletions.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(exerciseCompletions)
    .values({ exerciseAssignmentId: assignmentId, ...input })
    .returning();
  return created;
}
