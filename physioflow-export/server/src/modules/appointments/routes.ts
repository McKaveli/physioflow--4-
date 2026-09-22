import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { createAppointmentSchema, rescheduleAppointmentSchema, updateStatusSchema, createRescheduleRequestSchema, resolveRescheduleRequestSchema } from "./validation.js";
import * as controller from "./controller.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(controller.list));
router.get("/reschedule-requests", requireAuth, asyncHandler(controller.listRescheduleRequests));
router.post("/reschedule-requests", requireAuth, requireRole("PATIENT"), validateBody(createRescheduleRequestSchema), asyncHandler(controller.createRescheduleRequest));
router.patch("/reschedule-requests/:id", requireAuth, requireRole("PHYSIOTHERAPIST", "CLINIC_ADMIN", "MANAGER"), validateBody(resolveRescheduleRequestSchema), asyncHandler(controller.resolveRescheduleRequest));
router.get("/:id", requireAuth, asyncHandler(controller.get));

// Scheduling is a staff-only action — patients never book their own appointments.
router.post(
  "/",
  requireAuth,
  requireRole("PHYSIOTHERAPIST", "CLINIC_ADMIN", "MANAGER"),
  validateBody(createAppointmentSchema),
  asyncHandler(controller.create)
);
router.patch(
  "/:id/status",
  requireAuth,
  requireRole("PHYSIOTHERAPIST", "CLINIC_ADMIN", "MANAGER"),
  validateBody(updateStatusSchema),
  asyncHandler(controller.updateStatus)
);
router.patch(
  "/:id/reschedule",
  requireAuth,
  requireRole("PHYSIOTHERAPIST", "CLINIC_ADMIN", "MANAGER"),
  validateBody(rescheduleAppointmentSchema),
  asyncHandler(controller.reschedule)
);
router.patch(
  "/:id/cancel",
  requireAuth,
  requireRole("PHYSIOTHERAPIST", "CLINIC_ADMIN", "MANAGER"),
  asyncHandler(controller.cancel)
);

export default router;
