import { z } from "zod";
import { INVENTORY_CATEGORIES, INVENTORY_MOVEMENT_TYPES } from "../../db/schema.js";

export const createInventoryItemSchema = z.object({
  name: z.string().min(2),
  category: z.enum(INVENTORY_CATEGORIES),
  quantity: z.coerce.number().int().min(0).default(0),
  unit: z.string().min(1).default("unit"),
  minStockThreshold: z.coerce.number().int().min(0).default(5),
  supplier: z.string().optional(),
  expiryDate: z.coerce.date().optional(),
  batchNumber: z.string().optional(),
});

export const recordMovementSchema = z.object({
  type: z.enum(INVENTORY_MOVEMENT_TYPES),
  quantityDelta: z.coerce.number().int().refine((n) => n !== 0, "Quantity change cannot be zero."),
  reason: z.string().min(2, "Please provide a reason for this stock movement."),
});

export const listInventoryQuerySchema = z.object({
  category: z.enum(INVENTORY_CATEGORIES).optional(),
  search: z.string().optional(),
});
