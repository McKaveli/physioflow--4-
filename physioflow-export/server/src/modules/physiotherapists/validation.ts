import { z } from "zod";

export const updatePhysioSchema = z.object({
  specialty: z.string().optional(),
  bio: z.string().optional(),
  licenseNo: z.string().optional(),
  yearsExperience: z.coerce.number().int().min(0).optional(),
});

// Note: clinicId is intentionally NOT accepted here — the controller always derives it
// server-side from the authenticated admin's own institution membership.
export const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  specialty: z.string().optional(),
});
