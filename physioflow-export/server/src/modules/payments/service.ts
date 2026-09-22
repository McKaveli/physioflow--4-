import { eq, and } from "drizzle-orm";
import { db } from "../../db/client.js";
import { payments } from "../../db/schema.js";
import { AppError } from "../../lib/AppError.js";
import { getProviderForMethod } from "./providers/index.js";

// listPayments is always scoped to a clinic. patientId (when present) narrows further
// within that clinic — it never substitutes for clinic scoping.
export async function listPayments(clinicId: string, patientId?: string) {
  return db.query.payments.findMany({
    where: patientId ? and(eq(payments.clinicId, clinicId), eq(payments.patientId, patientId)) : eq(payments.clinicId, clinicId),
    orderBy: (p, { desc }) => [desc(p.createdAt)],
    with: {
      patient: { with: { user: true } },
      recordedBy: true,
      appointment: true,
    },
  });
}

export async function getPayment(id: string) {
  const payment = await db.query.payments.findFirst({ where: eq(payments.id, id) });
  if (!payment) throw AppError.notFound("Payment not found.");
  return payment;
}

export async function createPayment(input: {
  clinicId: string;
  patientId: string;
  appointmentId?: string;
  amount: number;
  currency?: string;
  method: "MOBILE_MONEY" | "CARD" | "CASH";
  purpose?: string;
  recordedByUserId: string;
}) {
  // Insert first so we have an internal id to use as the provider reference correlation key.
  const [payment] = await db
    .insert(payments)
    .values({ ...input, currency: input.currency ?? "GHS", status: "PENDING" })
    .returning();

  const provider = getProviderForMethod(input.method);
  const result = await provider.initiate({
    amount: input.amount,
    currency: input.currency ?? "GHS",
    method: input.method,
    reference: payment.id,
  });

  const [updated] = await db
    .update(payments)
    .set({ status: result.status, providerRef: result.providerRef, updatedAt: new Date() })
    .where(eq(payments.id, payment.id))
    .returning();

  return updated;
}

export async function verifyPayment(id: string) {
  const payment = await getPayment(id);
  if (!payment.providerRef) throw AppError.badRequest("This payment has no provider reference to verify.");

  const provider = getProviderForMethod(payment.method);
  const status = await provider.verify(payment.providerRef);

  const [updated] = await db.update(payments).set({ status, updatedAt: new Date() }).where(eq(payments.id, id)).returning();
  return updated;
}

/** Clinic admin manually confirms a cash payment was received. */
export async function reconcileCashPayment(id: string) {
  const payment = await getPayment(id);
  if (payment.method !== "CASH") throw AppError.badRequest("Only cash payments can be manually reconciled.");

  const [updated] = await db.update(payments).set({ status: "SUCCEEDED", updatedAt: new Date() }).where(eq(payments.id, id)).returning();
  return updated;
}
