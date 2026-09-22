import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { updatePhysioSchema, createStaffSchema } from "./validation.js";
import * as controller from "./controller.js";

const router = Router();

// Institution-scoped directory — requires auth so we can resolve the caller's own clinic
// and never return staff from other institutions.
router.get("/", requireAuth, asyncHandler(controller.list));
router.get("/me/dashboard", requireAuth, requireRole("PHYSIOTHERAPIST"), asyncHandler(controller.myDashboard));
router.post("/staff", requireAuth, requireRole("CLINIC_ADMIN", "MANAGER"), validateBody(createStaffSchema), asyncHandler(controller.createStaff));
router.get("/:id", requireAuth, asyncHandler(controller.get));
router.patch("/:id", requireAuth, requireRole("PHYSIOTHERAPIST"), validateBody(updatePhysioSchema), asyncHandler(controller.update));

export default router;
