import { db } from "../db/client.js";
import { auditLogs, type AUDIT_ACTIONS } from "../db/schema.js";

type AuditAction = (typeof AUDIT_ACTIONS)[number];

/**
 * Records an audit entry. Never throws — a failed audit write should never block the
 * actual operation it's recording, so failures are swallowed (and logged) rather than
 * propagated. `metadata` must never contain sensitive information (AGENT.md §28) — pass
 * only non-sensitive summary fields (e.g. an appointment's new status, not a patient's
 * clinical notes).
 */
export async function recordAudit(entry: {
  clinicId: string;
  actorUserId: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.insert(auditLogs).values({
      clinicId: entry.clinicId,
      actorUserId: entry.actorUserId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : undefined,
    });
  } catch (err) {
    console.error("[audit] failed to record entry", entry.action, err);
  }
}
