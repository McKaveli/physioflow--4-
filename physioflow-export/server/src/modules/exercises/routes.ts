import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { createExerciseSchema, recordCompletionSchema } from "./validation.js";
import { exerciseMediaUpload } from "./upload.js";
import * as controller from "./controller.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(controller.list));

// Media routes before /:id so they're never shadowed, though segment count already disambiguates them.
router.post(
  "/upload",
  requireAuth,
  requireRole("PHYSIOTHERAPIST"),
  exerciseMediaUpload.single("file"),
  asyncHandler(controller.uploadMedia)
);
router.get("/media/:filename", requireAuth, asyncHandler(controller.serveMedia));

router.get("/:id", requireAuth, asyncHandler(controller.get));
router.post("/", requireAuth, requireRole("PHYSIOTHERAPIST"), validateBody(createExerciseSchema), asyncHandler(controller.create));
router.post(
  "/assignments/:assignmentId/complete",
  requireAuth,
  requireRole("PATIENT"),
  validateBody(recordCompletionSchema),
  asyncHandler(controller.complete)
);

export default router;
