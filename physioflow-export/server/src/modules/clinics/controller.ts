import type { Request, Response } from "express";
import * as service from "./service.js";
import { getCallerClinicId, assertSameInstitution } from "../../lib/tenant.js";
import { AppError } from "../../lib/AppError.js";

// Institution directory: only the name/city fields needed for e.g. an eventual multi-clinic
// selector, never returned to unauthenticated callers.
export async function list(_req: Request, res: Response) {
  res.json(await service.listClinics());
}

export async function get(req: Request, res: Response) {
  res.json(await service.getClinic(req.params.id));
}

export async function lookup(req: Request, res: Response) {
  const code = req.query.code as string;
  if (!code) throw AppError.badRequest("Organization code is required.");
  res.json(await service.lookupByOrgCode(code.toUpperCase()));
}

export async function create(req: Request, res: Response) {
  const input = req.body as { name: string; city?: string; address?: string; phone?: string; currency?: string };
  const baseCode = input.name.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 10);
  const suffix = Math.floor(1000 + Math.random() * 9000).toString();
  const orgCode = `${baseCode}-${suffix}`;
  res.status(201).json(await service.createClinic({ ...input, orgCode }));
}

// Admins may only ever modify their own institution — the :id in the URL is never trusted
// on its own, it must match the clinic the caller's own membership row resolves to.
export async function update(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  assertSameInstitution(req.params.id, callerClinicId);
  res.json(await service.updateClinic(req.params.id, req.body));
}

export async function overview(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  assertSameInstitution(req.params.id, callerClinicId);
  res.json(await service.getClinicOverview(req.params.id));
}
