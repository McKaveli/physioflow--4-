import { z } from "zod";

export const createSessionNoteSchema = z.object({
  patientId: z.string(),
  summary: z.string().min(3, "Please summarize the session."),
  observations: z.string().optional(),
  treatmentPerformed: z.string().optional(),
  patientResponse: z.string().optional(),
  nextSteps: z.string().optional(),
});
