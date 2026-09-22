import type { notifications } from "../../../db/schema.js";

export interface NotificationPayload {
  userId: string;
  type: (typeof notifications.$inferSelect)["type"];
  title: string;
  body: string;
}

export interface NotificationProvider {
  send(payload: NotificationPayload): Promise<void>;
}
