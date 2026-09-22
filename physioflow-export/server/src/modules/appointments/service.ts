import { eq, and, lt, gt, ne } from "drizzle-orm";
import { db } from "../../db/client.js";
import { appointments, appointmentRequests, rescheduleRequests, patients, physiotherapists, notifications } from "../../db/schema.js";
import { AppError } from "../../lib/AppError.js";

async function assertNoOverlap(physioId: string, startsAt: Date, endsAt: Date, excludeId?: string) {
  const clashes = await db.query.appointments.findMany({
    where: and(
      eq(appointments.physioId, physioId),
      ne(appointments.status, "CANCELLED"),
      lt(appointments.startsAt, endsAt),
      gt(appointments.endsAt, startsAt),
      excludeId ? ne(appointments.id, excludeId) : undefined
    ),
  });
  if (clashes.length > 0) {
    throw AppError.conflict("That time slot is already booked. Please choose a different time.");
  }
}

export async function listAppointments(clinicId: string, filters: { patientId?: string; physioId?: string }) {
  return db.query.appointments.findMany({
    where: (a, { eq: eqOp, and: andOp }) => {
      const clauses = [eqOp(a.clinicId, clinicId)];
      if (filters.patientId) clauses.push(eqOp(a.patientId, filters.patientId));
      if (filters.physioId) clauses.push(eqOp(a.physioId, filters.physioId));
      return andOp(...clauses);
    },
    with: {
      patient: { with: { user: { columns: { fullName: true } } } },
      physio: { with: { user: { columns: { fullName: true } } } },
    },
    orderBy: (a, { desc }) => [desc(a.startsAt)],
  });
}

export async function getAppointment(id: string) {
  const appt = await db.query.appointments.findFirst({
    where: eq(appointments.id, id),
    with: {
      patient: { with: { user: { columns: { fullName: true } } } },
      physio: { with: { user: { columns: { fullName: true } } } },
    },
  });
  if (!appt) throw AppError.notFound("Appointment not found.");
  return appt;
}

/**
 * Scheduling is a physio/admin-initiated action — patients never call this directly (enforced
 * at the route/role level). Created straight into CONFIRMED status: since a staff member is
 * the one deciding the slot, there's no separate "patient must confirm" step in this model.
 */
export async function createAppointment(input: {
  clinicId: string;
  patientId: string;
  physioId: string;
  startsAt: Date;
  endsAt: Date;
  treatmentFocus?: string;
  notes?: string;
}) {
  if (input.endsAt <= input.startsAt) {
    throw AppError.badRequest("The appointment end time must be after the start time.");
  }

  // Cross-tenant guard: both patient and physio must belong to the scheduling clinic.
  const patient = await db.query.patients.findFirst({ where: eq(patients.id, input.patientId) });
  if (!patient || patient.clinicId !== input.clinicId) throw AppError.notFound("Patient not found.");

  const physio = await db.query.physiotherapists.findFirst({ where: eq(physiotherapists.id, input.physioId) });
  if (!physio || physio.clinicId !== input.clinicId) throw AppError.notFound("Physiotherapist not found.");

  await assertNoOverlap(input.physioId, input.startsAt, input.endsAt);

  const [appt] = await db
    .insert(appointments)
    .values({ ...input, status: "CONFIRMED" })
    .returning();

  await db.insert(notifications).values({
    userId: patient.userId,
    type: "APPOINTMENT_SCHEDULED",
    title: "New appointment scheduled",
    body: "Your physiotherapist scheduled your next appointment.",
  });

  return appt;
}

export async function updateAppointmentStatus(id: string, status: (typeof appointments.$inferSelect)["status"]) {
  await getAppointment(id);
  const [updated] = await db.update(appointments).set({ status, updatedAt: new Date() }).where(eq(appointments.id, id)).returning();
  return updated;
}

export async function rescheduleAppointment(id: string, startsAt: Date, endsAt: Date) {
  const existing = await getAppointment(id);
  if (endsAt <= startsAt) {
    throw AppError.badRequest("The appointment end time must be after the start time.");
  }
  await assertNoOverlap(existing.physioId, startsAt, endsAt, id);

  const [updated] = await db
    .update(appointments)
    .set({ startsAt, endsAt, status: "CONFIRMED", updatedAt: new Date() })
    .where(eq(appointments.id, id))
    .returning();

  const patient = await db.query.patients.findFirst({ where: eq(patients.id, existing.patientId) });
  if (patient) {
    await db.insert(notifications).values({
      userId: patient.userId,
      type: "APPOINTMENT_CHANGED",
      title: "Appointment rescheduled",
      body: "Your physiotherapist changed the time of your upcoming appointment.",
    });
  }

  return updated;
}

export async function cancelAppointment(id: string, cancellationReason: string) {
  if (!cancellationReason?.trim()) {
    throw AppError.badRequest("A cancellation reason is required.");
  }
  const existing = await getAppointment(id);
  const [updated] = await db
    .update(appointments)
    .set({ status: "CANCELLED", cancellationReason: cancellationReason.trim(), updatedAt: new Date() })
    .where(eq(appointments.id, id))
    .returning();

  const patient = await db.query.patients.findFirst({ where: eq(patients.id, existing.patientId) });
  if (patient) {
    await db.insert(notifications).values({
      userId: patient.userId,
      type: "APPOINTMENT_CANCELLED",
      title: "Appointment cancelled",
      body: "Your upcoming appointment has been cancelled.",
    });
  }

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────
// Appointment Requests (patient-initiated, staff-resolved)
// ─────────────────────────────────────────────────────────────────────────

export async function listAppointmentRequests(clinicId: string, filters: { patientId?: string; status?: string }) {
  return db.query.appointmentRequests.findMany({
    where: (r, { eq: eqOp, and: andOp }) => {
      const clauses = [eqOp(r.clinicId, clinicId)];
      if (filters.patientId) clauses.push(eqOp(r.patientId, filters.patientId));
      if (filters.status) clauses.push(eqOp(r.status, filters.status as (typeof appointmentRequests.$inferSelect)["status"]));
      return andOp(...clauses);
    },
    with: {
      patient: { with: { user: { columns: { fullName: true, avatarUrl: true } } } },
      physio: { with: { user: { columns: { fullName: true } } } },
    },
    orderBy: (r, { desc }) => [desc(r.createdAt)],
  });
}

export async function createAppointmentRequest(input: {
  clinicId: string;
  patientId: string;
  physioId?: string;
  requestedDate: Date;
  preferredTimeNote?: string;
  reason?: string;
}) {
  // Patient must belong to this clinic
  const patient = await db.query.patients.findFirst({ where: eq(patients.id, input.patientId) });
  if (!patient || patient.clinicId !== input.clinicId) throw AppError.notFound("Patient not found.");

  const [req] = await db.insert(appointmentRequests).values(input).returning();
  return req;
}

export async function resolveAppointmentRequest(
  requestId: string,
  resolution: { action: "APPROVE" | "DECLINE"; resolvedByUserId: string; declineReason?: string; appointmentId?: string }
) {
  const req = await db.query.appointmentRequests.findFirst({ where: eq(appointmentRequests.id, requestId) });
  if (!req) throw AppError.notFound("Request not found.");
  if (req.status !== "PENDING") throw AppError.conflict("This request has already been resolved.");

  const newStatus = resolution.action === "APPROVE" ? "APPROVED" : "DECLINED";
  const [updated] = await db
    .update(appointmentRequests)
    .set({
      status: newStatus,
      resolvedBy: resolution.resolvedByUserId,
      resolvedAt: new Date(),
      declineReason: resolution.declineReason,
      appointmentId: resolution.appointmentId,
    })
    .where(eq(appointmentRequests.id, requestId))
    .returning();

  // Notify the patient
  const patient = await db.query.patients.findFirst({ where: eq(patients.id, req.patientId) });
  if (patient) {
    await db.insert(notifications).values({
      userId: patient.userId,
      type: "APPOINTMENT_SCHEDULED",
      title: newStatus === "APPROVED" ? "Appointment request approved" : "Appointment request declined",
      body: newStatus === "APPROVED"
        ? "Your appointment request has been approved. Check your appointments for details."
        : `Your appointment request was declined. ${resolution.declineReason ?? ""}`.trim(),
    });
  }

  return updated;
}

export async function withdrawAppointmentRequest(requestId: string, patientId: string) {
  const req = await db.query.appointmentRequests.findFirst({ where: eq(appointmentRequests.id, requestId) });
  if (!req) throw AppError.notFound("Request not found.");
  if (req.patientId !== patientId) throw AppError.forbidden();
  if (req.status !== "PENDING") throw AppError.conflict("Only pending requests can be withdrawn.");

  const [updated] = await db
    .update(appointmentRequests)
    .set({ status: "WITHDRAWN" })
    .where(eq(appointmentRequests.id, requestId))
    .returning();
  return updated;
}

// ─────────────────────────────────────────────────────────────────────────
// Reschedule Requests (patient-initiated, staff-resolved)
// ─────────────────────────────────────────────────────────────────────────

export async function listRescheduleRequests(clinicId: string, filters: { appointmentId?: string; patientId?: string }) {
  return db.query.rescheduleRequests.findMany({
    where: (r, { eq: eqOp, and: andOp }) => {
      const clauses = [eqOp(r.clinicId, clinicId)];
      if (filters.appointmentId) clauses.push(eqOp(r.appointmentId, filters.appointmentId));
      if (filters.patientId) clauses.push(eqOp(r.patientId, filters.patientId));
      return andOp(...clauses);
    },
    with: {
      patient: { with: { user: { columns: { fullName: true } } } },
      appointment: true,
    },
    orderBy: (r, { desc }) => [desc(r.createdAt)],
  });
}

export async function createRescheduleRequest(input: {
  clinicId: string;
  appointmentId: string;
  patientId: string;
  requestedDate: Date;
  preferredTimeNote?: string;
  reason?: string;
}) {
  const appt = await db.query.appointments.findFirst({ where: eq(appointments.id, input.appointmentId) });
  if (!appt || appt.clinicId !== input.clinicId) throw AppError.notFound("Appointment not found.");
  if (appt.patientId !== input.patientId) throw AppError.forbidden();
  if (appt.status === "CANCELLED" || appt.status === "COMPLETED") {
    throw AppError.conflict("Cannot request reschedule for a cancelled or completed appointment.");
  }
  const requestedEnd = new Date(input.requestedDate.getTime() + (appt.endsAt.getTime() - appt.startsAt.getTime()));
  await assertNoOverlap(appt.physioId, input.requestedDate, requestedEnd, appt.id);
  const patientClash = await db.query.appointments.findFirst({
    where: and(eq(appointments.patientId, input.patientId), ne(appointments.status, "CANCELLED"), lt(appointments.startsAt, requestedEnd), gt(appointments.endsAt, input.requestedDate), ne(appointments.id, appt.id)),
  });
  if (patientClash) throw AppError.conflict("This time is unavailable. Please choose another time.");

  // Only one pending reschedule at a time
  const existing = await db.query.rescheduleRequests.findFirst({
    where: and(eq(rescheduleRequests.appointmentId, input.appointmentId), eq(rescheduleRequests.status, "PENDING")),
  });
  if (existing) throw AppError.conflict("There is already a pending reschedule request for this appointment.");

  const [req] = await db.insert(rescheduleRequests).values(input).returning();
  const physio = await db.query.physiotherapists.findFirst({ where: eq(physiotherapists.id, appt.physioId) });
  if (physio) await db.insert(notifications).values({
    userId: physio.userId,
    type: "APPOINTMENT_CHANGED",
    title: "Rescheduling request received",
    body: "A patient has requested a new appointment time.",
  });
  return req;
}

export async function resolveRescheduleRequest(
  requestId: string,
  resolution: { action: "APPROVE" | "DECLINE"; resolvedByUserId: string; declineReason?: string; newStartsAt?: Date; newEndsAt?: Date }
) {
  const req = await db.query.rescheduleRequests.findFirst({ where: eq(rescheduleRequests.id, requestId) });
  if (!req) throw AppError.notFound("Request not found.");
  if (req.status !== "PENDING") throw AppError.conflict("This request has already been resolved.");

  const newStatus = resolution.action === "APPROVE" ? "APPROVED" : "DECLINED";
  const [updated] = await db
    .update(rescheduleRequests)
    .set({ status: newStatus, resolvedBy: resolution.resolvedByUserId, resolvedAt: new Date(), declineReason: resolution.declineReason })
    .where(eq(rescheduleRequests.id, requestId))
    .returning();

  if (resolution.action === "APPROVE" && resolution.newStartsAt && resolution.newEndsAt) {
    await rescheduleAppointment(req.appointmentId, resolution.newStartsAt, resolution.newEndsAt);
  }

  return updated;
}
