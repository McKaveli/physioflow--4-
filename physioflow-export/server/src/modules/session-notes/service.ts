import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { sessionNotes, patients } from "../../db/schema.js";
import { AppError } from "../../lib/AppError.js";

export async function listForPatient(patientId: string) {
  return db.query.sessionNotes.findMany({
    where: eq(sessionNotes.patientId, patientId),
    orderBy: (n, { desc }) => [desc(n.date)],
    with: { physio: { with: { user: { columns: { fullName: true } } } } },
  });
}

export async function createNote(input: {
  clinicId: string;
  patientId: string;
  physioId: string;
  summary: string;
  observations?: string;
  treatmentPerformed?: string;
  patientResponse?: string;
  nextSteps?: string;
}) {
  // Cross-tenant guard: the patient this note is about must belong to the same clinic.
  const patient = await db.query.patients.findFirst({ where: eq(patients.id, input.patientId) });
  if (!patient || patient.clinicId !== input.clinicId) throw AppError.notFound("Patient not found.");

  const [note] = await db.insert(sessionNotes).values(input).returning();
  return note;
}
