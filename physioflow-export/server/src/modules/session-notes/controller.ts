import type { Request, Response } from "express";
import * as service from "./service.js";
import * as patientService from "../patients/service.js";
import { getPhysiotherapistByUserId } from "../physiotherapists/service.js";
import { getCallerClinicId, assertSameInstitution } from "../../lib/tenant.js";
import { AppError } from "../../lib/AppError.js";

export async function listForPatient(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  const patient = await patientService.getPatient(req.params.patientId);
  assertSameInstitution(patient.clinicId, callerClinicId, "Patient not found.");
  res.json(await service.listForPatient(req.params.patientId));
}

export async function create(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  const physio = await getPhysiotherapistByUserId(req.user.id);
  const note = await service.createNote({ ...req.body, clinicId, physioId: physio.id });
  res.status(201).json(note);
}
