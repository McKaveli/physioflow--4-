import { z } from "zod";
import { DIFFICULTY_LEVELS } from "../../db/schema.js";

const YOUTUBE_URL_PATTERN = /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]+/i;

export const createExerciseSchema = z.object({
  name: z.string().min(2),
  bodyArea: z.string().min(2),
  difficulty: z.enum(DIFFICULTY_LEVELS).default("BEGINNER"),
  description: z.string().min(5),
  instructions: z.string().min(5, "Please write your own clinical instructions for this exercise."),
  safetyNotes: z.string().optional(),
  // A relative API path (e.g. /api/exercises/media/<uuid>.mp4) from the upload endpoint —
  // not a public absolute URL, so plain .url() validation doesn't apply here.
  mediaUrl: z.string().min(1).optional(),
  youtubeUrl: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || YOUTUBE_URL_PATTERN.test(v), "Please enter a valid YouTube URL."),
  defaultSets: z.coerce.number().int().positive().optional(),
  defaultReps: z.coerce.number().int().positive().optional(),
  defaultDurationSec: z.coerce.number().int().positive().optional(),
  defaultRestSec: z.coerce.number().int().positive().optional(),
});

export const recordCompletionSchema = z.object({
  state: z.enum(["IN_PROGRESS", "COMPLETED", "SKIPPED"]),
  setsCompleted: z.coerce.number().int().min(0).optional(),
  painLevel: z.coerce.number().int().min(0).max(10).optional(),
  difficultyRating: z.coerce.number().int().min(1).max(5).optional(),
  notes: z.string().max(500).optional(),
});
