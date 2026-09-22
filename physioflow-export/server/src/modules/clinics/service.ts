import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { clinics, physiotherapists, patients, users, inventoryItems, appointments } from "../../db/schema.js";
import { AppError } from "../../lib/AppError.js";

export async function listClinics() {
  return db.query.clinics.findMany();
}

export async function getClinic(id: string) {
  const clinic = await db.query.clinics.findFirst({ where: eq(clinics.id, id) });
  if (!clinic) throw AppError.notFound("Clinic not found.");
  return clinic;
}

export async function lookupByOrgCode(orgCode: string) {
  const clinic = await db.query.clinics.findFirst({
    where: eq(clinics.orgCode, orgCode),
    columns: { id: true, name: true, orgCode: true },
  });
  if (!clinic) throw AppError.notFound("Organization not found. Please check the code and try again.");
  return clinic;
}

export async function createClinic(input: { name: string; orgCode: string; city?: string; address?: string; phone?: string; currency?: string }) {
  const [clinic] = await db.insert(clinics).values(input).returning();
  return clinic;
}

export async function updateClinic(id: string, input: Partial<{ name: string; city: string; address: string; phone: string; currency: string }>) {
  await getClinic(id);
  const [updated] = await db.update(clinics).set(input).where(eq(clinics.id, id)).returning();
  return updated;
}

export async function getClinicOverview(clinicId: string) {
  await getClinic(clinicId);

  const clinicPhysios = await db.query.physiotherapists.findMany({
    where: eq(physiotherapists.clinicId, clinicId),
    with: { user: { columns: { fullName: true, email: true, avatarUrl: true } } },
  });

  const clinicPatients = await db.query.patients.findMany({
    where: eq(patients.clinicId, clinicId),
    with: { user: { columns: { fullName: true, email: true } } },
  });

  const items = await db.query.inventoryItems.findMany({ where: eq(inventoryItems.clinicId, clinicId) });
  const lowStockCount = items.filter((i) => i.quantity <= i.minStockThreshold && i.quantity > 0).length;
  const outOfStockCount = items.filter((i) => i.quantity <= 0).length;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAppointments = await db.query.appointments.findMany({
    where: eq(appointments.clinicId, clinicId),
  });
  const appointmentsThisWeek = weekAppointments.filter((a) => a.startsAt >= weekAgo && a.startsAt <= now).length;

  return {
    physiotherapistCount: clinicPhysios.length,
    patientCount: clinicPatients.length,
    appointmentsThisWeek,
    physiotherapists: clinicPhysios,
    patients: clinicPatients,
    inventoryAlerts: { lowStockCount, outOfStockCount },
  };
}
