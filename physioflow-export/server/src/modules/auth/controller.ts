import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import * as authService from "./service.js";
import { AppError } from "../../lib/AppError.js";

const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000; // 15 min
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const cookieOpts = {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax" as const,
    path: "/",
  };
  res.cookie("access_token", accessToken, { ...cookieOpts, maxAge: ACCESS_COOKIE_MAX_AGE });
  res.cookie("refresh_token", refreshToken, { ...cookieOpts, maxAge: REFRESH_COOKIE_MAX_AGE, path: "/api/auth" });
}

export async function registerInstitution(req: Request, res: Response) {
  const result = await authService.registerInstitution(req.body);
  setAuthCookies(res, result.accessToken, result.refreshToken);
  res.status(201).json({ userId: result.userId, role: result.role });
}

export async function login(req: Request, res: Response) {
  const { orgCode, email, password } = req.body;
  const result = await authService.loginUser(orgCode, email, password);
  setAuthCookies(res, result.accessToken, result.refreshToken);
  res.json({ userId: result.userId, role: result.role });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.refresh_token;
  if (!token) throw AppError.unauthorized("Please log in again.");
  const result = await authService.rotateRefreshToken(token);
  setAuthCookies(res, result.accessToken, result.refreshToken);
  res.json({ userId: result.userId, role: result.role });
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.refresh_token;
  if (token) await authService.revokeRefreshToken(token);
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/api/auth" });
  res.status(204).send();
}

export async function me(req: Request, res: Response) {
  const user = await authService.getCurrentUser(req.user!.id);
  res.json(user);
}
