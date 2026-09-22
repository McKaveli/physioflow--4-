import { z } from "zod";

export const createPatientSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.string().optional(),
  emergencyContact: z.string().optional(),
  presentingComplaint: z.string().optional(),
  bodyArea: z.string().optional(),
  dateOfInjury: z.coerce.date().optional(),
  referringSource: z.string().optional(),
  intakeNotes: z.string().optional(),
  primaryPhysioId: z.string().optional(),
  avatarUrl: z.string().max(2_000_000).optional(),
});

export const updatePatientSchema = z.object({
  condition: z.string().optional(),
  gender: z.string().optional(),
  emergencyContact: z.string().optional(),
  primaryPhysioId: z.string().optional(),
  presentingComplaint: z.string().optional(),
  bodyArea: z.string().optional(),
  referringSource: z.string().optional(),
  intakeNotes: z.string().optional(),
  profession: z.string().optional(),
});

export const listPatientsQuerySchema = z.object({
  physioId: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(["PENDING_ONBOARDING", "ACTIVE", "INACTIVE", "TREATMENT_COMPLETED", "DISCHARGED"]).optional(),
});

export const dischargePatientSchema = z.object({
  treatmentOutcome: z.string().trim().min(1),
  finalClinicalNotes: z.string().trim().min(1),
  treatmentGoalsStatus: z.string().trim().min(1),
  sessionsCompleted: z.coerce.number().int().min(0),
  dischargeReason: z.string().trim().min(1),
  finalProgress: z.string().trim().min(1),
  followUpRecommendations: z.string().trim().optional(),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "Password must be at least 8 characters."),
});
