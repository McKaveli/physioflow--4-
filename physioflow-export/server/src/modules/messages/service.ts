import { eq, and, isNull, ne } from "drizzle-orm";
import { db } from "../../db/client.js";
import { conversations, messages, patients } from "../../db/schema.js";
import { AppError } from "../../lib/AppError.js";

export async function getOrCreateConversation(clinicId: string, patientId: string) {
  let conversation = await db.query.conversations.findFirst({ where: eq(conversations.patientId, patientId) });
  if (!conversation) {
    const [created] = await db.insert(conversations).values({ clinicId, patientId }).returning();
    conversation = created;
  }
  return conversation;
}

export async function listConversations(clinicId: string, callerId: string, filters: { physioId?: string }) {
  // Always scoped to the caller's own institution — physioId (when present) narrows further
  // within that institution, it never substitutes for the clinic scope.
  const relevantPatients = await db.query.patients.findMany({
    where: (p, { eq: eqOp, and: andOp }) => {
      const clauses = [eqOp(p.clinicId, clinicId)];
      if (filters.physioId) clauses.push(eqOp(p.primaryPhysioId, filters.physioId));
      return andOp(...clauses);
    },
    with: { user: { columns: { fullName: true, avatarUrl: true } } },
  });

  const patientIds = relevantPatients.map((p) => p.id);
  if (patientIds.length === 0) return [];

  const convos = await db.query.conversations.findMany({
    where: (c, { inArray }) => inArray(c.patientId, patientIds),
    with: {
      messages: { orderBy: (m, { desc }) => [desc(m.createdAt)] },
    },
  });

  return convos.map((c) => {
    const patient = relevantPatients.find((p) => p.id === c.patientId)!;
    const unreadCount = c.messages.filter((m) => !m.readAt && m.senderId !== callerId).length;
    return {
      id: c.id,
      patientId: c.patientId,
      patientName: patient.user.fullName,
      patientAvatarUrl: patient.user.avatarUrl,
      lastMessage: c.messages[0] ?? null,
      unreadCount,
    };
  });
}

/** Total unread messages relevant to this caller — powers the top-bar messages badge.
 *  For a patient: unread in their own conversation. For staff: unread across their
 *  clinic's (or their own patients') conversations. */
export async function getUnreadCountForCaller(clinicId: string, callerId: string, filters: { physioId?: string; patientId?: string }) {
  if (filters.patientId) {
    const convo = await db.query.conversations.findFirst({ where: eq(conversations.patientId, filters.patientId) });
    if (!convo) return 0;
    const msgs = await db.query.messages.findMany({ where: eq(messages.conversationId, convo.id) });
    return msgs.filter((m) => !m.readAt && m.senderId !== callerId).length;
  }

  const convos = await listConversations(clinicId, callerId, { physioId: filters.physioId });
  return convos.reduce((sum, c) => sum + c.unreadCount, 0);
}

/** Fetches a conversation and verifies it belongs to the caller's institution. Throws 404 (not 403)
 *  on a mismatch so cross-tenant probing can't distinguish "wrong clinic" from "doesn't exist". */
async function getConversationInClinic(conversationId: string, clinicId: string) {
  const convo = await db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) });
  if (!convo || convo.clinicId !== clinicId) throw AppError.notFound("Conversation not found.");
  return convo;
}

export async function getMessages(conversationId: string, clinicId: string) {
  await getConversationInClinic(conversationId, clinicId);

  return db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
    with: { sender: { columns: { fullName: true, role: true } } },
  });
}

export async function sendMessage(conversationId: string, clinicId: string, senderId: string, body: string) {
  await getConversationInClinic(conversationId, clinicId);

  const [message] = await db.insert(messages).values({ conversationId, senderId, body }).returning();
  return message;
}

export async function markRead(conversationId: string, clinicId: string, readerId: string) {
  await getConversationInClinic(conversationId, clinicId);

  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(and(eq(messages.conversationId, conversationId), ne(messages.senderId, readerId), isNull(messages.readAt)));
}
