import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { sendMessageSchema } from "./validation.js";
import * as controller from "./controller.js";

const router = Router();

// Patient: their single conversation with their care team
router.get("/me", requireAuth, requireRole("PATIENT"), asyncHandler(controller.myConversation));
router.get("/unread-count", requireAuth, asyncHandler(controller.unreadCount));

// Physio/admin: list of patient conversations
router.get("/", requireAuth, requireRole("PHYSIOTHERAPIST", "CLINIC_ADMIN", "MANAGER"), asyncHandler(controller.listConversations));

router.get("/:conversationId", requireAuth, asyncHandler(controller.getMessages));
router.post("/:conversationId", requireAuth, validateBody(sendMessageSchema), asyncHandler(controller.send));
router.post("/:conversationId/read", requireAuth, asyncHandler(controller.markRead));

export default router;
