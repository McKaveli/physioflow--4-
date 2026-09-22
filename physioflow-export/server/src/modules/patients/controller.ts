import type { Request, Response } from "express";
import * as service from "./service.js";
import * as invitations from "./invitations.js";
import { AppError } from "../../lib/AppError.js";
import { getCallerClinicId, assertSameInstitution } from "../../lib/tenant.js";
import { recordAudit } from "../../lib/audit.js";

export async function list(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  res.json(await service.listPatients(clinicId, req.query as any));
}

export async function get(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  const patient = await service.getPatient(req.params.id);
  assertSameInstitution(patient.clinicId, callerClinicId, "Patient not found.");
  res.json(patient);
}

export async function getDischarge(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  const patient = await service.getPatient(req.params.id);
  assertSameInstitution(patient.clinicId, callerClinicId, "Patient not found.");
  if (req.user.role === "PATIENT" && patient.userId !== req.user.id) throw AppError.forbidden();
  res.json(await service.getDischarge(patient.id));
}

export async function discharge(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  const physio = await import("../physiotherapists/service.js");
  const physioProfile = await physio.getPhysiotherapistByUserId(req.user.id);
  const patient = await service.getPatient(req.params.id);
  assertSameInstitution(patient.clinicId, clinicId, "Patient not found.");
  const result = await service.dischargePatient({ ...req.body, clinicId, patientId: patient.id, physioId: physioProfile.id, dischargedByUserId: req.user.id });
  await recordAudit({ clinicId, actorUserId: req.user.id, action: "PATIENT_DISCHARGED", resourceType: "patient", resourceId: patient.id });
  res.status(201).json(result);
}

// clinicId is never accepted from the client — always the admin's own institution.
export async function create(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  const patient = await service.createPatient({ ...req.body, clinicId });
  await recordAudit({
    clinicId,
    actorUserId: req.user.id,
    action: "PATIENT_CREATED",
    resourceType: "patient",
    resourceId: patient.id,
    metadata: { patientCode: patient.patientCode },
  });
  res.status(201).json(patient);
}

export async function update(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  const patient = await service.getPatient(req.params.id);
  assertSameInstitution(patient.clinicId, callerClinicId, "Patient not found.");
  res.json(await service.updatePatient(req.params.id, req.body));
}

export async function myDashboard(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const patient = await service.getPatientByUserId(req.user.id);
  res.json(await service.getDashboard(patient.id));
}

export async function myProgress(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const patient = await service.getPatientByUserId(req.user.id);
  res.json(await service.getProgressHistory(patient.id));
}

// ── Invitations ──────────────────────────────────────────────────────────

export async function sendInvitation(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  const patient = await service.getPatient(req.params.id);
  assertSameInstitution(patient.clinicId, callerClinicId, "Patient not found.");

  const rawToken = await invitations.createInvitation(callerClinicId, patient.id);
  await recordAudit({
    clinicId: callerClinicId,
    actorUserId: req.user.id,
    action: "PATIENT_INVITATION_SENT",
    resourceType: "patient",
    resourceId: patient.id,
  });
  // The raw token is returned exactly once, here, and never persisted or logged again.
  res.status(201).json({ token: rawToken });
}

// Public — a patient hasn't logged in yet when opening their invitation link.
export async function getInvitation(req: Request, res: Response) {
  const details = await invitations.getInvitationDetails(req.params.token);
  res.json(details);
}

export async function acceptInvitation(req: Request, res: Response) {
  const result = await invitations.acceptInvitation(req.body.token, req.body.password);
  res.status(200).json(result);
}
