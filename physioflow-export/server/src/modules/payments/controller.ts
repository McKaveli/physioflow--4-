import type { Request, Response } from "express";
import * as service from "./service.js";
import * as patientService from "../patients/service.js";
import { AppError } from "../../lib/AppError.js";
import { getCallerClinicId, assertSameInstitution } from "../../lib/tenant.js";

export async function list(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();

  // Patients can only ever see their own payments — never trust a client-supplied patientId here.
  if (req.user.role === "PATIENT") {
    const patient = await patientService.getPatientByUserId(req.user.id);
    return res.json(await service.listPayments(patient.clinicId, patient.id));
  }

  // Only clinic finance roles may list organisation payment records.
  if (req.user.role !== "CLINIC_ADMIN" && req.user.role !== "MANAGER") {
    throw AppError.forbidden();
  }

  const clinicId = await getCallerClinicId(req.user.id, req.user.role);
  res.json(await service.listPayments(clinicId, req.query.patientId as string | undefined));
}

export async function get(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const payment = await service.getPayment(req.params.id);
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  assertSameInstitution(payment.clinicId, callerClinicId, "Payment not found.");

  if (req.user.role === "PATIENT") {
    const patient = await patientService.getPatientByUserId(req.user.id);
    if (payment.patientId !== patient.id) throw AppError.forbidden();
  }

  res.json(payment);
}

export async function create(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const clinicId = await getCallerClinicId(req.user.id, req.user.role);

  if (req.user.role === "PATIENT") {
    const patient = await patientService.getPatientByUserId(req.user.id);
    if (req.body.patientId !== patient.id) throw AppError.forbidden("You can only make payments for your own account.");
  }

  res.status(201).json(await service.createPayment({ ...req.body, clinicId, recordedByUserId: req.user.id }));
}

export async function verify(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const payment = await service.getPayment(req.params.id);
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  assertSameInstitution(payment.clinicId, callerClinicId, "Payment not found.");
  res.json(await service.verifyPayment(req.params.id));
}

export async function reconcile(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const payment = await service.getPayment(req.params.id);
  const callerClinicId = await getCallerClinicId(req.user.id, req.user.role);
  assertSameInstitution(payment.clinicId, callerClinicId, "Payment not found.");
  res.json(await service.reconcileCashPayment(req.params.id));
}
