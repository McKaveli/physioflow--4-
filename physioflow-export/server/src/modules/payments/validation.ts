import { z } from "zod";
import { PAYMENT_METHODS } from "../../db/schema.js";

export const createPaymentSchema = z.object({
  patientId: z.string(),
  appointmentId: z.string().optional(),
  amount: z.coerce.number().positive(),
  currency: z.string().default("GHS"),
  method: z.enum(PAYMENT_METHODS),
  purpose: z.string().trim().optional(),
});
