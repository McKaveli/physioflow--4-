import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { recoveryLogs } from "../../db/schema.js";

export async function listRecoveryLogs(patientId: string) {
  return db.query.recoveryLogs.findMany({
    where: eq(recoveryLogs.patientId, patientId),
    orderBy: (r, { desc }) => [desc(r.date)],
    limit: 90,
  });
}

export async function createRecoveryLog(input: { clinicId: string; patientId: string; painLevel?: number; mobility?: number; mood?: number; notes?: string }) {
  const [log] = await db.insert(recoveryLogs).values(input).returning();
  return log;
}
