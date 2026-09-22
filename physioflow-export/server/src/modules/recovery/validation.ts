import { z } from "zod";

export const createRecoveryLogSchema = z.object({
  painLevel: z.coerce.number().int().min(0).max(10).optional(),
  mobility: z.coerce.number().int().min(0).max(10).optional(),
  mood: z.coerce.number().int().min(0).max(10).optional(),
  notes: z.string().max(1000).optional(),
});
