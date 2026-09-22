import { eq, isNull, and } from "drizzle-orm";
import { db } from "../../db/client.js";
import { notifications } from "../../db/schema.js";
import { AppError } from "../../lib/AppError.js";
import { ConsoleNotificationProvider } from "./providers/ConsoleNotificationProvider.js";
import type { NotificationProvider } from "./providers/NotificationProvider.js";

const provider: NotificationProvider = new ConsoleNotificationProvider();

export async function listMyNotifications(userId: string) {
  return db.query.notifications.findMany({
    where: eq(notifications.userId, userId),
    orderBy: (n, { desc }) => [desc(n.createdAt)],
    limit: 50,
  });
}

export async function createAndDispatch(input: {
  userId: string;
  type: (typeof notifications.$inferSelect)["type"];
  title: string;
  body: string;
}) {
  const [notification] = await db.insert(notifications).values(input).returning();
  await provider.send(input);
  return notification;
}

export async function markRead(id: string, userId: string) {
  const notification = await db.query.notifications.findFirst({ where: eq(notifications.id, id) });
  if (!notification || notification.userId !== userId) throw AppError.notFound("Notification not found.");

  const [updated] = await db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.id, id)).returning();
  return updated;
}
