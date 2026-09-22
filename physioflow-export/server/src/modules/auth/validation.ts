import { z } from "zod";

// Public self-registration now creates a brand-new INSTITUTION (clinic) plus its first
// admin — this is how a new customer signs up for the platform. Patients and
// physiotherapists are never self-registered; they're created by clinic staff
// (see patients/service.ts createPatient and physiotherapists/service.ts createPhysiotherapistStaff).
export const registerInstitutionSchema = z.object({
  clinicName: z.string().min(2, "Please enter your clinic's name."),
  fullName: z.string().min(2, "Please enter your full name."),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  orgCode: z.string().trim().min(1, "Organization ID is required."),
  email: z.string().email(),
  password: z.string().min(1, "Password is required."),
});

// Used when a patient accepts their invitation link to set up their own login.
export const acceptInvitationSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "Password must be at least 8 characters."),
});
