import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { createRecoveryLogSchema } from "./validation.js";
import * as controller from "./controller.js";

const router = Router();

router.get("/me", requireAuth, requireRole("PATIENT"), asyncHandler(controller.listMine));
router.post("/me", requireAuth, requireRole("PATIENT"), validateBody(createRecoveryLogSchema), asyncHandler(controller.createMine));
router.get(
  "/patient/:patientId",
  requireAuth,
  requireRole("PHYSIOTHERAPIST", "CLINIC_ADMIN", "MANAGER"),
  asyncHandler(controller.listForPatient)
);

export default router;
