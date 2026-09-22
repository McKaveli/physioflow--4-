import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { registerInstitutionSchema, loginSchema } from "./validation.js";
import * as controller from "./controller.js";

const router = Router();

// Stricter limiter on auth endpoints to slow down credential stuffing / brute force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

// This is institution signup, not general user signup — see auth/service.ts for why.
router.post("/register-institution", authLimiter, validateBody(registerInstitutionSchema), asyncHandler(controller.registerInstitution));
router.post("/login", authLimiter, validateBody(loginSchema), asyncHandler(controller.login));
router.post("/refresh", asyncHandler(controller.refresh));
router.post("/logout", asyncHandler(controller.logout));
router.get("/me", requireAuth, asyncHandler(controller.me));

export default router;
