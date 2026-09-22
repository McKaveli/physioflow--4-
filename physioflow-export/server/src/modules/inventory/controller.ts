import type { Request, Response } from "express";
import * as service from "./service.js";
import { AppError } from "../../lib/AppError.js";
import { getCallerClinicId, assertSameInstitution } from "../../lib/tenant.js";
import { recordAudit } from "../../lib/audit.js";

export async function list(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  res.json(await service.listInventory(clinicId, req.query as any));
}

export async function overview(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  res.json(await service.getInventoryOverview(clinicId));
}

export async function get(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  const item = await service.getInventoryItem(req.params.id);
  assertSameInstitution(item.clinicId, callerClinicId, "Inventory item not found.");
  res.json(item);
}

export async function create(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  const item = await service.createInventoryItem({ ...req.body, clinicId, actorUserId: req.user.id });
  res.status(201).json(item);
}

export async function recordMovement(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  const item = await service.getInventoryItem(req.params.id);
  assertSameInstitution(item.clinicId, callerClinicId, "Inventory item not found.");

  const result = await service.recordMovement({
    ...req.body,
    clinicId: callerClinicId,
    itemId: req.params.id,
    recordedByUserId: req.user.id,
  });

  await recordAudit({
    clinicId: callerClinicId,
    actorUserId: req.user.id,
    action: "INVENTORY_ADJUSTED",
    resourceType: "inventory_item",
    resourceId: req.params.id,
    metadata: { type: req.body.type, quantityDelta: result.movement.quantityDelta, reason: req.body.reason },
  });

  res.json(result);
}

export async function listMovements(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  res.json(await service.listMovements(clinicId, req.query.itemId as string | undefined));
}
