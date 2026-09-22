import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { invitationTokens, users, patients, clinics } from "../../db/schema.js";
import { AppError } from "../../lib/AppError.js";
import { recordAudit } from "../../lib/audit.js";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Generates a single-use invitation token for a newly-created patient. Only the SHA-256 hash
 * is persisted — the raw token is returned once, to be shown/sent by the admin, and can never
 * be recovered from the database afterward. Any previous unused invitation for this patient
 * is invalidated first, so only one link is ever valid at a time.
 */
export async function createInvitation(clinicId: string, patientId: string) {
  await db.update(invitationTokens).set({ usedAt: new Date() }).where(eq(invitationTokens.patientId, patientId));

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);

  await db.insert(invitationTokens).values({
    clinicId,
    patientId,
    tokenHash,
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
  });

  return rawToken;
}

/** Looks up an invitation by its raw token — used to render the "Welcome, <name>" step
 *  before the patient sets a password. Never exposes clinicId or other institution data. */
export async function getInvitationDetails(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const invitation = await db.query.invitationTokens.findFirst({ where: eq(invitationTokens.tokenHash, tokenHash) });

  if (!invitation || invitation.usedAt || invitation.expiresAt < new Date()) {
    throw AppError.badRequest("This invitation link is invalid or has expired.");
  }

  const patient = await db.query.patients.findFirst({
    where: eq(patients.id, invitation.patientId),
    with: { user: { columns: { fullName: true, email: true } } },
  });
  if (!patient) throw AppError.notFound("Patient record not found.");

  const clinic = await db.query.clinics.findFirst({
    where: eq(clinics.id, invitation.clinicId),
    columns: { orgCode: true },
  });
  if (!clinic) throw AppError.notFound("Organization not found.");

  return { fullName: patient.user.fullName, email: patient.user.email, orgCode: clinic.orgCode };
}

/** Consumes the invitation (single-use), sets the patient's password, and activates the account. */
export async function acceptInvitation(rawToken: string, password: string) {
  const tokenHash = hashToken(rawToken);
  const invitation = await db.query.invitationTokens.findFirst({ where: eq(invitationTokens.tokenHash, tokenHash) });

  if (!invitation || invitation.usedAt || invitation.expiresAt < new Date()) {
    throw AppError.badRequest("This invitation link is invalid or has expired.");
  }

  const patient = await db.query.patients.findFirst({ where: eq(patients.id, invitation.patientId) });
  if (!patient) throw AppError.notFound("Patient record not found.");

  const passwordHash = await bcrypt.hash(password, 12);

  await db.update(users).set({ passwordHash }).where(eq(users.id, patient.userId));
  await db.update(invitationTokens).set({ usedAt: new Date() }).where(eq(invitationTokens.id, invitation.id));
  await db.update(patients).set({ status: "ACTIVE", dateOnboarded: new Date() }).where(eq(patients.id, patient.id));

  // Actor is the patient's own account here — no admin/staff member is present in this
  // public, unauthenticated request.
  await recordAudit({
    clinicId: patient.clinicId,
    actorUserId: patient.userId,
    action: "PATIENT_INVITATION_ACCEPTED",
    resourceType: "patient",
    resourceId: patient.id,
  });

  return { userId: patient.userId, role: "PATIENT" as const };
}
