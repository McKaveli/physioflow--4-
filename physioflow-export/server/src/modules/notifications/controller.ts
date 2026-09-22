import type { Request, Response } from "express";
import * as service from "./service.js";
import { AppError } from "../../lib/AppError.js";

export async function listMine(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  res.json(await service.listMyNotifications(req.user.id));
}

export async function markRead(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  res.json(await service.markRead(req.params.id, req.user.id));
}
