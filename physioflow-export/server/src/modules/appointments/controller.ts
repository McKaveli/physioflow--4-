import type { Request, Response } from "express";
import * as service from "./service.js";
import { AppError } from "../../lib/AppError.js";
import { getCallerClinicId, assertSameInstitution } from "../../lib/tenant.js";
import { recordAudit } from "../../lib/audit.js";

export async function list(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  if (req.user.role === "PATIENT") {
    const { patients } = await import("../../db/schema.js");
    const { db } = await import("../../db/client.js");
    const { eq } = await import("drizzle-orm");
    const patient = await db.query.patients.findFirst({ where: eq(patients.userId, req.user.id) });
    if (!patient || patient.clinicId !== clinicId) throw AppError.forbidden();
    return res.json(await service.listAppointments(clinicId, { patientId: patient.id }));
  }
  res.json(await service.listAppointments(clinicId, req.query as any));
}

export async function get(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  const appt = await service.getAppointment(req.params.id);
  assertSameInstitution(appt.clinicId, callerClinicId, "Appointment not found.");
  res.json(appt);
}

export async function create(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  const appt = await service.createAppointment({ ...req.body, clinicId });
  await recordAudit({
    clinicId,
    actorUserId: req.user.id,
    action: "APPOINTMENT_CREATED",
    resourceType: "appointment",
    resourceId: appt.id,
    metadata: { patientId: appt.patientId, startsAt: appt.startsAt },
  });
  res.status(201).json(appt);
}

export async function updateStatus(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  const appt = await service.getAppointment(req.params.id);
  assertSameInstitution(appt.clinicId, callerClinicId, "Appointment not found.");
  res.json(await service.updateAppointmentStatus(req.params.id, req.body.status));
}

export async function reschedule(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  const appt = await service.getAppointment(req.params.id);
  assertSameInstitution(appt.clinicId, callerClinicId, "Appointment not found.");
  const updated = await service.rescheduleAppointment(req.params.id, req.body.startsAt, req.body.endsAt);
  await recordAudit({
    clinicId: callerClinicId,
    actorUserId: req.user.id,
    action: "APPOINTMENT_CHANGED",
    resourceType: "appointment",
    resourceId: req.params.id,
  });
  res.json(updated);
}

export async function cancel(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  const appt = await service.getAppointment(req.params.id);
  assertSameInstitution(appt.clinicId, callerClinicId, "Appointment not found.");
  const { cancellationReason } = req.body as { cancellationReason?: string };
  if (!cancellationReason?.trim()) throw AppError.badRequest("A cancellation reason is required.");
  const updated = await service.cancelAppointment(req.params.id, cancellationReason);
  await recordAudit({
    clinicId: callerClinicId,
    actorUserId: req.user.id,
    action: "APPOINTMENT_CANCELLED",
    resourceType: "appointment",
    resourceId: req.params.id,
  });
  res.json(updated);
}

// ─────────────────────────────────────────────────────────────────────────
// Appointment Requests
// ─────────────────────────────────────────────────────────────────────────

export async function listRequests(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  res.json(await service.listAppointmentRequests(clinicId, req.query as any));
}

export async function createRequest(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  const req_ = await service.createAppointmentRequest({ ...req.body, clinicId });
  res.status(201).json(req_);
}

export async function resolveRequest(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  const apptReq = await service.listAppointmentRequests(callerClinicId, {});
  // Verify this request belongs to caller's clinic
  const found = apptReq.find((r) => r.id === req.params.id);
  if (!found) throw AppError.notFound("Request not found.");
  const updated = await service.resolveAppointmentRequest(req.params.id, {
    action: req.body.action,
    resolvedByUserId: req.user.id,
    declineReason: req.body.declineReason,
    appointmentId: req.body.appointmentId,
  });
  res.json(updated);
}

export async function withdrawRequest(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  // Patient resolves their own patientId from their profile
  const { patients } = await import("../../db/schema.js");
  const { db } = await import("../../db/client.js");
  const { eq } = await import("drizzle-orm");
  const patient = await db.query.patients.findFirst({ where: eq(patients.userId, req.user.id) });
  if (!patient || patient.clinicId !== clinicId) throw AppError.forbidden();
  res.json(await service.withdrawAppointmentRequest(req.params.id, patient.id));
}

// ─────────────────────────────────────────────────────────────────────────
// Reschedule Requests
// ─────────────────────────────────────────────────────────────────────────

export async function listRescheduleRequests(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  res.json(await service.listRescheduleRequests(clinicId, req.query as any));
}

export async function createRescheduleRequest(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  const { patients } = await import("../../db/schema.js");
  const { db } = await import("../../db/client.js");
  const { eq } = await import("drizzle-orm");
  const patient = await db.query.patients.findFirst({ where: eq(patients.userId, req.user.id) });
  if (!patient || patient.clinicId !== clinicId) throw AppError.forbidden();
  const rr = await service.createRescheduleRequest({ ...req.body, clinicId, patientId: patient.id });
  await recordAudit({
    clinicId,
    actorUserId: req.user.id,
    action: "APPOINTMENT_CHANGED",
    resourceType: "reschedule_request",
    resourceId: rr.id,
    metadata: { appointmentId: rr.appointmentId, requestedDate: rr.requestedDate, reason: rr.reason },
  });
  res.status(201).json(rr);
}

export async function resolveRescheduleRequest(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  const allRR = await service.listRescheduleRequests(callerClinicId, {});
  const found = allRR.find((r) => r.id === req.params.id);
  if (!found) throw AppError.notFound("Request not found.");
  const updated = await service.resolveRescheduleRequest(req.params.id, {
    action: req.body.action,
    resolvedByUserId: req.user.id,
    declineReason: req.body.declineReason,
    newStartsAt: req.body.newStartsAt ? new Date(req.body.newStartsAt) : undefined,
    newEndsAt: req.body.newEndsAt ? new Date(req.body.newEndsAt) : undefined,
  });
  await recordAudit({
    clinicId: callerClinicId,
    actorUserId: req.user.id,
    action: "APPOINTMENT_CHANGED",
    resourceType: "reschedule_request",
    resourceId: req.params.id,
    metadata: { status: updated.status, appointmentId: found.appointmentId, reason: found.reason, newStartsAt: req.body.newStartsAt },
  });
  res.json(updated);
}
