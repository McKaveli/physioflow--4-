import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { patients, physiotherapists, clinicAdmins, managers } from "../db/schema.js";
import { AppError } from "./AppError.js";
import type { Role } from "../db/schema.js";

/**
 * Resolves the clinic (institution) a request's authenticated user actually belongs to,
 * by looking up their own membership row — never by trusting a clinicId the client sent
 * in a query param or request body.
 *
 * This is the single source of truth for tenant scoping. Every service function that reads
 * or writes institution-owned data should call this first and filter by the result, not by
 * anything the client provided.
 */
export async function getCallerClinicId(userId: string, role: Role): Promise<string> {
  if (role === "PATIENT") {
    const patient = await db.query.patients.findFirst({ where: eq(patients.userId, userId) });
    if (!patient) throw AppError.notFound("Patient profile not found.");
    return patient.clinicId;
  }

  if (role === "PHYSIOTHERAPIST") {
    const physio = await db.query.physiotherapists.findFirst({ where: eq(physiotherapists.userId, userId) });
    if (!physio) throw AppError.notFound("Physiotherapist profile not found.");
    return physio.clinicId;
  }

  if (role === "MANAGER") {
    const membership = await db.query.managers.findFirst({ where: eq(managers.userId, userId) });
    if (!membership) throw AppError.forbidden("Your account isn't linked to a clinic yet.");
    return membership.clinicId;
  }

  // CLINIC_ADMIN
  const membership = await db.query.clinicAdmins.findFirst({ where: eq(clinicAdmins.userId, userId) });
  if (!membership) throw AppError.forbidden("Your account isn't linked to a clinic yet.");
  return membership.clinicId;
}

/**
 * Asserts that a resource's own clinicId matches the caller's clinicId. Throws a 404 (not a 403)
 * so that cross-tenant probing can't distinguish "doesn't exist" from "exists in another institution" —
 * leaking the latter is itself a data disclosure.
 */
export function assertSameInstitution(resourceClinicId: string, callerClinicId: string, notFoundMessage = "We couldn't find what you're looking for.") {
  if (resourceClinicId !== callerClinicId) {
    throw AppError.notFound(notFoundMessage);
  }
}
