import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { createTreatmentPlanSchema, updateStatusSchema } from "./validation.js";
import * as controller from "./controller.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(controller.list));
router.get("/:id", requireAuth, asyncHandler(controller.get));
router.post(
  "/",
  requireAuth,
  requireRole("PHYSIOTHERAPIST"),
  validateBody(createTreatmentPlanSchema),
  asyncHandler(controller.create)
);
router.patch(
  "/:id/status",
  requireAuth,
  requireRole("PHYSIOTHERAPIST"),
  validateBody(updateStatusSchema),
  asyncHandler(controller.updateStatus)
);
router.post("/:id/assign", requireAuth, requireRole("PHYSIOTHERAPIST"), asyncHandler(controller.assign));

export default router;
