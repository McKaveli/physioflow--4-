import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { createSessionNoteSchema } from "./validation.js";
import * as controller from "./controller.js";

const router = Router();

router.get("/patient/:patientId", requireAuth, requireRole("PHYSIOTHERAPIST", "CLINIC_ADMIN", "MANAGER"), asyncHandler(controller.listForPatient));
router.post("/", requireAuth, requireRole("PHYSIOTHERAPIST"), validateBody(createSessionNoteSchema), asyncHandler(controller.create));

export default router;
