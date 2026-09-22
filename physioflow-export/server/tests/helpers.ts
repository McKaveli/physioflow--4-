import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "../src/db/client.js";
import { users, clinics, clinicAdmins, physiotherapists, patients } from "../src/db/schema.js";

/**
 * Creates a full institution with one admin, one physiotherapist, and one patient,
 * all with password "password123". Mirrors how the real product creates data now:
 * only institution (clinic admin) signup is self-service; physios and patients are
 * always created by an admin.
 *
 * Note: patientCode uses a random suffix rather than a sequential counter — Vitest
 * gives each test FILE its own module instance, so a shared in-memory counter here
 * would restart at 1 per file while writing into the same underlying test.db,
 * causing unique-constraint collisions across files.
 */
export async function seedTestInstitution(label: string) {
  const passwordHash = await bcrypt.hash("password123", 10);

  const [clinic] = await db.insert(clinics).values({ name: `Test Clinic ${label}` }).returning();

  const [adminUser] = await db
    .insert(users)
    .values({ email: `admin.${label}@test.dev`, passwordHash, role: "CLINIC_ADMIN", fullName: `Admin ${label}` })
    .returning();
  await db.insert(clinicAdmins).values({ clinicId: clinic.id, userId: adminUser.id });

  const [physioUser] = await db
    .insert(users)
    .values({ email: `physio.${label}@test.dev`, passwordHash, role: "PHYSIOTHERAPIST", fullName: `Physio ${label}` })
    .returning();
  const [physio] = await db.insert(physiotherapists).values({ userId: physioUser.id, clinicId: clinic.id }).returning();

  const [patientUser] = await db
    .insert(users)
    .values({ email: `patient.${label}@test.dev`, passwordHash, role: "PATIENT", fullName: `Patient ${label}` })
    .returning();
  const [patient] = await db
    .insert(patients)
    .values({
      patientCode: `PF-TEST-${randomUUID().slice(0, 8)}`,
      userId: patientUser.id,
      clinicId: clinic.id,
      primaryPhysioId: physio.id,
      status: "ACTIVE",
    })
    .returning();

  return {
    clinic,
    admin: { email: adminUser.email, userId: adminUser.id },
    physio: { id: physio.id, userId: physioUser.id, email: physioUser.email },
    patient: { id: patient.id, userId: patientUser.id, email: patientUser.email },
  };
}
