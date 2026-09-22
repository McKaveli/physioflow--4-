import type { Request, Response } from "express";
import * as service from "./service.js";
import { AppError } from "../../lib/AppError.js";
import { getCallerClinicId, assertSameInstitution } from "../../lib/tenant.js";
import { recordAudit } from "../../lib/audit.js";

export async function list(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  res.json(await service.listPhysiotherapists(clinicId));
}

export async function get(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  const physio = await service.getPhysiotherapist(req.params.id);
  assertSameInstitution(physio.clinicId, callerClinicId, "Physiotherapist not found.");
  res.json(physio);
}

export async function update(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  const physio = await service.getPhysiotherapist(req.params.id);
  assertSameInstitution(physio.clinicId, callerClinicId, "Physiotherapist not found.");
  res.json(await service.updatePhysiotherapist(req.params.id, req.body));
}

export async function myDashboard(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const physio = await service.getPhysiotherapistByUserId(req.user.id);
  res.json(await service.getDashboard(physio.id, physio.clinicId));
}

// clinicId is deliberately never read from req.body — it's always the admin's own
// institution, resolved server-side, so an admin can never plant staff into another clinic.
export async function createStaff(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  const staff = await service.createPhysiotherapistStaff({ ...req.body, clinicId });
  await recordAudit({
    clinicId,
    actorUserId: req.user.id,
    action: "STAFF_INVITED",
    resourceType: "physiotherapist",
    resourceId: staff.id,
    metadata: { email: staff.user.email },
  });
  res.status(201).json(staff);
}
