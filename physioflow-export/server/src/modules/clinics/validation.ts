import { z } from "zod";

export const createClinicSchema = z.object({
  name: z.string().min(2),
  city: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  currency: z.string().default("GHS"),
});

export const updateClinicSchema = createClinicSchema.partial();
