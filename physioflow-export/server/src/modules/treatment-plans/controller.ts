import type { Request, Response } from "express";
import * as service from "./service.js";
import { AppError } from "../../lib/AppError.js";
import { getCallerClinicId, assertSameInstitution } from "../../lib/tenant.js";
import { recordAudit } from "../../lib/audit.js";

export async function list(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  res.json(await service.listTreatmentPlans(clinicId, req.query as any));
}

export async function get(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  const plan = await service.getTreatmentPlan(req.params.id);
  assertSameInstitution(plan.clinicId, callerClinicId, "Treatment plan not found.");
  res.json(plan);
}

export async function create(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  res.status(201).json(await service.createTreatmentPlan({ ...req.body, clinicId }));
}

export async function updateStatus(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  const plan = await service.getTreatmentPlan(req.params.id);
  assertSameInstitution(plan.clinicId, callerClinicId, "Treatment plan not found.");
  res.json(await service.updateTreatmentPlanStatus(req.params.id, req.body.status));
}

export async function assign(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  const plan = await service.getTreatmentPlan(req.params.id);
  assertSameInstitution(plan.clinicId, callerClinicId, "Treatment plan not found.");
  const updated = await service.assignPlan(req.params.id);
  await recordAudit({
    clinicId: callerClinicId,
    actorUserId: req.user.id,
    action: "EXERCISE_ASSIGNED",
    resourceType: "treatment_plan",
    resourceId: req.params.id,
    metadata: { patientId: plan.patientId, exerciseCount: plan.exerciseAssignments.length },
  });
  res.json(updated);
}
