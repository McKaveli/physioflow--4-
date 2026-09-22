import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { createClinicSchema, updateClinicSchema } from "./validation.js";
import * as controller from "./controller.js";

const router = Router();

// Public: patients need to browse clinics/physiotherapists before registering.
router.get("/", asyncHandler(controller.list));
router.get("/lookup", asyncHandler(controller.lookup));
router.get("/:id", asyncHandler(controller.get));

router.get("/:id/overview", requireAuth, requireRole("CLINIC_ADMIN", "MANAGER"), asyncHandler(controller.overview));
router.post("/", requireAuth, requireRole("MANAGER"), validateBody(createClinicSchema), asyncHandler(controller.create));
router.patch("/:id", requireAuth, requireRole("MANAGER"), validateBody(updateClinicSchema), asyncHandler(controller.update));

export default router;
