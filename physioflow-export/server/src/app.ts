import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import authRoutes from "./modules/auth/routes.js";
import clinicRoutes from "./modules/clinics/routes.js";
import physioRoutes from "./modules/physiotherapists/routes.js";
import patientRoutes from "./modules/patients/routes.js";
import appointmentRoutes from "./modules/appointments/routes.js";
import treatmentPlanRoutes from "./modules/treatment-plans/routes.js";
import exerciseRoutes from "./modules/exercises/routes.js";
import recoveryRoutes from "./modules/recovery/routes.js";
import messageRoutes from "./modules/messages/routes.js";
import paymentRoutes from "./modules/payments/routes.js";
import notificationRoutes from "./modules/notifications/routes.js";
import inventoryRoutes from "./modules/inventory/routes.js";
import sessionNoteRoutes from "./modules/session-notes/routes.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  if (!env.isProduction) {
    app.use(morgan("dev"));
  }

  // Global rate limit as a baseline defense; individual routes can layer stricter limits.
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.get("/api/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

  app.use("/api/auth", authRoutes);
  app.use("/api/clinics", clinicRoutes);
  app.use("/api/physiotherapists", physioRoutes);
  app.use("/api/patients", patientRoutes);
  app.use("/api/appointments", appointmentRoutes);
  app.use("/api/treatment-plans", treatmentPlanRoutes);
  app.use("/api/exercises", exerciseRoutes);
  app.use("/api/recovery", recoveryRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/inventory", inventoryRoutes);
  app.use("/api/session-notes", sessionNoteRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
