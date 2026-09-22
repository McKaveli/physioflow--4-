import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import { createInventoryItemSchema, recordMovementSchema, listInventoryQuerySchema } from "./validation.js";
import * as controller from "./controller.js";

const router = Router();

// Both physio and admin can view inventory (physio "according to permissions" — in this
// MVP that means read + record movements, but not create/delete items, which stays admin-only).
router.get("/", requireAuth, requireRole("PHYSIOTHERAPIST", "CLINIC_ADMIN", "MANAGER"), validateQuery(listInventoryQuerySchema), asyncHandler(controller.list));
router.get("/overview", requireAuth, requireRole("PHYSIOTHERAPIST", "CLINIC_ADMIN", "MANAGER"), asyncHandler(controller.overview));
router.get("/movements", requireAuth, requireRole("PHYSIOTHERAPIST", "CLINIC_ADMIN", "MANAGER"), asyncHandler(controller.listMovements));
router.get("/:id", requireAuth, requireRole("PHYSIOTHERAPIST", "CLINIC_ADMIN", "MANAGER"), asyncHandler(controller.get));

router.post("/", requireAuth, requireRole("CLINIC_ADMIN", "MANAGER"), validateBody(createInventoryItemSchema), asyncHandler(controller.create));
router.post(
  "/:id/movements",
  requireAuth,
  requireRole("PHYSIOTHERAPIST", "CLINIC_ADMIN", "MANAGER"),
  validateBody(recordMovementSchema),
  asyncHandler(controller.recordMovement)
);

export default router;
