import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { createPaymentSchema } from "./validation.js";
import * as controller from "./controller.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(controller.list));
router.get("/:id", requireAuth, asyncHandler(controller.get));
router.post("/", requireAuth, requireRole("CLINIC_ADMIN", "MANAGER"), validateBody(createPaymentSchema), asyncHandler(controller.create));
router.post("/:id/verify", requireAuth, requireRole("CLINIC_ADMIN", "MANAGER"), asyncHandler(controller.verify));
router.post("/:id/reconcile", requireAuth, requireRole("CLINIC_ADMIN", "MANAGER"), asyncHandler(controller.reconcile));

export default router;
