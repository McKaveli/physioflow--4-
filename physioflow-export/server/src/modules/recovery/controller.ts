import type { Request, Response } from "express";
import * as service from "./service.js";
import * as patientService from "../patients/service.js";
import { AppError } from "../../lib/AppError.js";
import { getCallerClinicId, assertSameInstitution } from "../../lib/tenant.js";

export async function listMine(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const patient = await patientService.getPatientByUserId(req.user.id);
  res.json(await service.listRecoveryLogs(patient.id));
}

export async function createMine(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const patient = await patientService.getPatientByUserId(req.user.id);
  res.status(201).json(await service.createRecoveryLog({ clinicId: patient.clinicId, patientId: patient.id, ...req.body }));
}

// A physio/admin can only view recovery logs for a patient within their own institution —
// patientId alone is never enough to authorize this.
export async function listForPatient(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  const patient = await patientService.getPatient(req.params.patientId);
  assertSameInstitution(patient.clinicId, callerClinicId, "Patient not found.");
  res.json(await service.listRecoveryLogs(req.params.patientId));
}
