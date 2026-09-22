import { z } from "zod";
import { TREATMENT_PLAN_STATUSES } from "../../db/schema.js";

const exerciseInputSchema = z.object({
  exerciseId: z.string(),
  sets: z.coerce.number().int().positive().optional(),
  reps: z.coerce.number().int().positive().optional(),
  durationSec: z.coerce.number().int().positive().optional(),
  frequency: z.string().optional(),
  instructions: z.string().optional(),
});

export const createTreatmentPlanSchema = z.object({
  patientId: z.string(),
  physioId: z.string(),
  title: z.string().min(3),
  goals: z.array(z.string()).min(1, "Select at least one recovery goal."),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  frequency: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE"]).optional(),
  exerciseInputs: z.array(exerciseInputSchema).default([]),
});

export const updateStatusSchema = z.object({
  status: z.enum(TREATMENT_PLAN_STATUSES),
});
