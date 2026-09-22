import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import * as controller from "./controller.js";

const router = Router();

router.get("/me", requireAuth, asyncHandler(controller.listMine));
router.post("/:id/read", requireAuth, asyncHandler(controller.markRead));

export default router;
