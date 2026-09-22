import type { Request, Response } from "express";
import * as service from "./service.js";
import * as patientService from "../patients/service.js";
import { AppError } from "../../lib/AppError.js";
import { getCallerClinicId } from "../../lib/tenant.js";

export async function myConversation(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const patient = await patientService.getPatientByUserId(req.user.id);
  const convo = await service.getOrCreateConversation(patient.clinicId, patient.id);
  const msgs = await service.getMessages(convo.id, patient.clinicId);
  res.json({ conversationId: convo.id, messages: msgs });
}

export async function listConversations(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  res.json(await service.listConversations(clinicId, req.user.id, req.query as any));
}

export async function unreadCount(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);

  if (req.user.role === "PATIENT") {
    const patient = await patientService.getPatientByUserId(req.user.id);
    const count = await service.getUnreadCountForCaller(clinicId, req.user.id, { patientId: patient.id });
    return res.json({ count });
  }

  const count = await service.getUnreadCountForCaller(clinicId, req.user.id, {});
  res.json({ count });
}

export async function getMessages(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  res.json(await service.getMessages(req.params.conversationId, clinicId));
}

export async function send(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  const message = await service.sendMessage(req.params.conversationId, clinicId, req.user.id, req.body.body);
  res.status(201).json(message);
}

export async function markRead(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  await service.markRead(req.params.conversationId, clinicId, req.user.id);
  res.status(204).send();
}
