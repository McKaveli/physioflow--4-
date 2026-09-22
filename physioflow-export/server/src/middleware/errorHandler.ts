import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { MulterError } from "multer";
import { AppError } from "../lib/AppError.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Some of the information provided isn't valid.",
      fields: err.flatten().fieldErrors,
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.publicMessage,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err instanceof MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "That file is too large. The limit is 50MB." : "We couldn't process that file upload.";
    return res.status(400).json({ error: message });
  }

  // The exercise upload's fileFilter throws a plain Error for unsupported MIME types.
  if (err instanceof Error && err.message.startsWith("Unsupported file type")) {
    return res.status(400).json({ error: err.message });
  }

  // Unknown error — never leak internals (stack traces, SQL, etc.) to the client.
  console.error("[unhandled error]", err);
  return res.status(500).json({ error: "Something went wrong on our end. Please try again." });
};

export function notFoundHandler(req: import("express").Request, res: import("express").Response) {
  res.status(404).json({ error: "That endpoint doesn't exist." });
}
