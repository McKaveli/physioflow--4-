import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import { createPatientSchema, updatePatientSchema, listPatientsQuerySchema, acceptInvitationSchema, dischargePatientSchema } from "./validation.js";
import * as controller from "./controller.js";

const router = Router();

router.get("/me/dashboard", requireAuth, requireRole("PATIENT"), asyncHandler(controller.myDashboard));
router.get("/me/progress", requireAuth, requireRole("PATIENT"), asyncHandler(controller.myProgress));

// Invitation acceptance is public by nature — the patient hasn't logged in yet.
router.get("/invitations/:token", asyncHandler(controller.getInvitation));
router.post("/invitations/accept", validateBody(acceptInvitationSchema), asyncHandler(controller.acceptInvitation));

router.get(
  "/",
  requireAuth,
  requireRole("PHYSIOTHERAPIST", "CLINIC_ADMIN", "MANAGER"),
  validateQuery(listPatientsQuerySchema),
  asyncHandler(controller.list)
);
// Only clinic admins register patients — matching the product's admin-is-entry-point model.
router.post("/", requireAuth, requireRole("PHYSIOTHERAPIST", "CLINIC_ADMIN", "MANAGER"), validateBody(createPatientSchema), asyncHandler(controller.create));
router.get("/:id", requireAuth, requireRole("PHYSIOTHERAPIST", "CLINIC_ADMIN", "MANAGER"), asyncHandler(controller.get));
router.get("/:id/discharge", requireAuth, asyncHandler(controller.getDischarge));
router.patch(
  "/:id",
  requireAuth,
  requireRole("PHYSIOTHERAPIST", "CLINIC_ADMIN", "MANAGER"),
  validateBody(updatePatientSchema),
  asyncHandler(controller.update)
);
router.post("/:id/discharge", requireAuth, requireRole("PHYSIOTHERAPIST"), validateBody(dischargePatientSchema), asyncHandler(controller.discharge));
router.post("/:id/invitations", requireAuth, requireRole("CLINIC_ADMIN", "MANAGER"), asyncHandler(controller.sendInvitation));

export default router;
