import { z } from "zod";
import { APPOINTMENT_STATUSES } from "../../db/schema.js";

export const createAppointmentSchema = z.object({
  patientId: z.string(),
  physioId: z.string(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  treatmentFocus: z.string().optional(),
});

export const rescheduleAppointmentSchema = z.object({
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});

export const createRescheduleRequestSchema = z.object({
  appointmentId: z.string(),
  requestedDate: z.coerce.date(),
  preferredTimeNote: z.string().trim().min(1),
  reason: z.string().trim().min(1, "Please provide a reason for rescheduling."),
});

export const resolveRescheduleRequestSchema = z.object({
  action: z.enum(["APPROVE", "DECLINE"]),
  declineReason: z.string().optional(),
  newStartsAt: z.coerce.date().optional(),
  newEndsAt: z.coerce.date().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES),
});
