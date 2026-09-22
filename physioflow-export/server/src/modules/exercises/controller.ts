import type { Request, Response } from "express";
import path from "node:path";
import * as service from "./service.js";
import { AppError } from "../../lib/AppError.js";
import { getCallerClinicId, assertSameInstitution } from "../../lib/tenant.js";
import { getPatientByUserId } from "../patients/service.js";
import { recordAudit } from "../../lib/audit.js";
import { UPLOAD_DIR } from "./upload.js";

export async function list(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  res.json(await service.listExercises(clinicId, req.query as any));
}

export async function get(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  const exercise = await service.getExercise(req.params.id);
  assertSameInstitution(exercise.clinicId, callerClinicId, "Exercise not found.");
  res.json(exercise);
}

export async function create(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  const exercise = await service.createExercise({ ...req.body, clinicId });
  await recordAudit({
    clinicId,
    actorUserId: req.user.id,
    action: "EXERCISE_CREATED",
    resourceType: "exercise",
    resourceId: exercise.id,
    metadata: { name: exercise.name },
  });
  res.status(201).json(exercise);
}

export async function complete(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const assignment = await service.getAssignment(req.params.assignmentId);
  const patient = await getPatientByUserId(req.user.id);
  if (assignment.patientId !== patient.id) {
    throw AppError.forbidden("You can only complete your own assigned exercises.");
  }
  res.json(await service.recordCompletion(req.params.assignmentId, req.body));
}

export async function uploadMedia(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  if (!req.file) throw AppError.badRequest("No file was uploaded.");
  // Return an API path (not a raw static path) so serving stays gated behind tenant checks.
  res.status(201).json({ url: `/api/exercises/media/${req.file.filename}` });
}

/** Serves uploaded exercise media only to authenticated users within the owning institution —
 *  the file is never reachable as a plain static asset. */
export async function serveMedia(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  const filename = req.params.filename;
  const url = `/api/exercises/media/${filename}`;

  const owningExercise = await service.findExerciseByMediaUrl(url);
  if (!owningExercise) throw AppError.notFound("File not found.");
  assertSameInstitution(owningExercise.clinicId, callerClinicId, "File not found.");

  res.sendFile(path.join(UPLOAD_DIR, filename));
}
