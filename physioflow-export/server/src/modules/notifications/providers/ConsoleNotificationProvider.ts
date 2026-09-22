import type { NotificationProvider, NotificationPayload } from "./NotificationProvider.js";

/** Dev/demo stand-in. A production deployment adds e.g. WhatsAppNotificationProvider or
 *  PushNotificationProvider implementing the same interface — nothing else changes. */
export class ConsoleNotificationProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<void> {
    console.log(`[notification] → user ${payload.userId} | ${payload.type} | ${payload.title}: ${payload.body}`);
  }
}
