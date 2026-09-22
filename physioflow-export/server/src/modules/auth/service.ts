import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { users, clinics, clinicAdmins, managers, physiotherapists, patients, refreshTokens } from "../../db/schema.js";
import { AppError } from "../../lib/AppError.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt.js";
import type { registerInstitutionSchema } from "./validation.js";
import type { z } from "zod";

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The ONLY self-service signup path in the product: a brand-new institution joining the
 * platform, with its first clinic admin. Patients and physiotherapists are never created
 * this way — see patients/service.ts (admin creates patients + sends invitations) and
 * physiotherapists/service.ts createPhysiotherapistStaff (admin creates staff accounts).
 */
export async function registerInstitution(input: z.infer<typeof registerInstitutionSchema>) {
  const existing = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (existing) {
    throw AppError.conflict("An account with that email already exists.");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  // Auto-generate org code from name + random hex
  const baseCode = input.clinicName.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 10);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
  const orgCode = `${baseCode}-${randomSuffix}`;

  const [clinic] = await db.insert(clinics).values({ name: input.clinicName, orgCode }).returning();

  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      passwordHash,
      role: "MANAGER",
      fullName: input.fullName,
      phone: input.phone,
    })
    .returning();

  await db.insert(managers).values({ userId: user.id, clinicId: clinic.id });

  return issueTokens(user.id, user.role);
}

export async function loginUser(orgCode: string, email: string, password: string) {
  const clinic = await db.query.clinics.findFirst({
    where: eq(clinics.orgCode, orgCode.trim().toUpperCase()),
    columns: { id: true },
  });
  if (!clinic) {
    throw AppError.notFound("Organization ID not found.");
  }

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user || !user.isActive) {
    throw AppError.unauthorized("Incorrect email or password.");
  }

  if (!user.passwordHash) {
    throw AppError.unauthorized("This account hasn't been activated yet. Please use your invitation link first.");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw AppError.unauthorized("Incorrect email or password.");
  }

  const membership = user.role === "MANAGER"
    ? await db.query.managers.findFirst({ where: eq(managers.userId, user.id), columns: { clinicId: true } })
    : user.role === "CLINIC_ADMIN"
      ? await db.query.clinicAdmins.findFirst({ where: eq(clinicAdmins.userId, user.id), columns: { clinicId: true } })
      : user.role === "PHYSIOTHERAPIST"
        ? await db.query.physiotherapists.findFirst({ where: eq(physiotherapists.userId, user.id), columns: { clinicId: true } })
        : await db.query.patients.findFirst({ where: eq(patients.userId, user.id), columns: { clinicId: true } });

  if (!membership || membership.clinicId !== clinic.id) {
    throw AppError.unauthorized("This account does not belong to that organization.");
  }

  return issueTokens(user.id, user.role);
}

export async function issueTokens(userId: string, role: (typeof users.$inferSelect)["role"]) {
  const accessToken = signAccessToken({ sub: userId, role });
  const refreshToken = signRefreshToken({ sub: userId });

  await db.insert(refreshTokens).values({
    token: refreshToken,
    userId,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });

  return { accessToken, refreshToken, userId, role };
}

export async function rotateRefreshToken(oldToken: string) {
  const stored = await db.query.refreshTokens.findFirst({ where: eq(refreshTokens.token, oldToken) });

  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw AppError.unauthorized("Your session has expired. Please log in again.");
  }

  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(oldToken);
  } catch {
    throw AppError.unauthorized("Your session has expired. Please log in again.");
  }

  await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.id, stored.id));

  const user = await db.query.users.findFirst({ where: eq(users.id, payload.sub) });
  if (!user || !user.isActive) {
    throw AppError.unauthorized();
  }

  return issueTokens(user.id, user.role);
}

export async function revokeRefreshToken(token: string) {
  await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.token, token));
}

export async function getCurrentUser(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { passwordHash: false },
    with: {
      patient: true,
      physiotherapist: true,
    },
  });
  if (!user) throw AppError.notFound("User not found.");

  let clinicAdmin: { clinicId: string } | null = null;
  let manager: { clinicId: string } | null = null;
  if (user.role === "CLINIC_ADMIN") {
    const membership = await db.query.clinicAdmins.findFirst({ where: eq(clinicAdmins.userId, userId) });
    clinicAdmin = membership ? { clinicId: membership.clinicId } : null;
  } else if (user.role === "MANAGER") {
    const membership = await db.query.managers.findFirst({ where: eq(managers.userId, userId) });
    manager = membership ? { clinicId: membership.clinicId } : null;
  }

  return { ...user, clinicAdmin, manager };
}
