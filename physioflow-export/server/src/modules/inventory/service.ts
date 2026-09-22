import { eq, and, lte, lt } from "drizzle-orm";
import { db } from "../../db/client.js";
import { inventoryItems, inventoryMovements } from "../../db/schema.js";
import { AppError } from "../../lib/AppError.js";

export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "EXPIRED";

function computeStatus(item: { quantity: number; minStockThreshold: number; expiryDate: Date | null }): StockStatus {
  if (item.expiryDate && item.expiryDate < new Date()) return "EXPIRED";
  if (item.quantity <= 0) return "OUT_OF_STOCK";
  if (item.quantity <= item.minStockThreshold) return "LOW_STOCK";
  return "IN_STOCK";
}

export async function listInventory(clinicId: string, filters: { category?: string; search?: string }) {
  const rows = await db.query.inventoryItems.findMany({
    where: (i, { eq: eqOp, and: andOp }) => {
      const clauses = [eqOp(i.clinicId, clinicId)];
      if (filters.category) clauses.push(eqOp(i.category, filters.category as any));
      return andOp(...clauses);
    },
    orderBy: (i, { asc }) => [asc(i.name)],
  });

  const withStatus = rows.map((item) => ({ ...item, status: computeStatus(item) }));

  if (filters.search) {
    const term = filters.search.toLowerCase();
    return withStatus.filter((r) => r.name.toLowerCase().includes(term) || r.supplier?.toLowerCase().includes(term));
  }
  return withStatus;
}

export async function getInventoryItem(id: string) {
  const item = await db.query.inventoryItems.findFirst({ where: eq(inventoryItems.id, id) });
  if (!item) throw AppError.notFound("Inventory item not found.");
  return { ...item, status: computeStatus(item) };
}

export async function getInventoryOverview(clinicId: string) {
  const items = await listInventory(clinicId, {});
  return {
    totalItems: items.length,
    lowStock: items.filter((i) => i.status === "LOW_STOCK").length,
    outOfStock: items.filter((i) => i.status === "OUT_OF_STOCK").length,
    expired: items.filter((i) => i.status === "EXPIRED").length,
  };
}

export async function createInventoryItem(input: {
  clinicId: string;
  actorUserId: string;
  name: string;
  category: "INJECTION" | "TABLET" | "OINTMENT" | "OTHER_SUPPLY";
  quantity: number;
  unit: string;
  minStockThreshold?: number;
  supplier?: string;
  expiryDate?: Date;
  batchNumber?: string;
}) {
  const { actorUserId, ...itemInput } = input;
  const [item] = await db.insert(inventoryItems).values(itemInput).returning();

  // The initial stock is itself a movement, so the audit trail always accounts for 100%
  // of an item's current quantity, not just changes after creation.
  if (input.quantity > 0) {
    await db.insert(inventoryMovements).values({
      clinicId: input.clinicId,
      itemId: item.id,
      type: "ADDED",
      quantityDelta: input.quantity,
      reason: "Initial stock",
      recordedByUserId: actorUserId,
    });
  }

  return { ...item, status: computeStatus(item) };
}

/** Applies a signed quantity change and records the movement in the same operation.
 *  The sign is normalized server-side for ADDED/REMOVED/EXPIRED (always +/− respectively)
 *  so a client can't accidentally increase stock while recording a "removed" reason —
 *  only ADJUSTED allows an explicit sign, for manual stocktake corrections in either direction. */
export async function recordMovement(input: {
  clinicId: string;
  itemId: string;
  type: "ADDED" | "REMOVED" | "ADJUSTED" | "EXPIRED";
  quantityDelta: number;
  reason: string;
  recordedByUserId: string;
}) {
  const item = await getInventoryItem(input.itemId);

  const magnitude = Math.abs(input.quantityDelta);
  const normalizedDelta = input.type === "ADDED" ? magnitude : input.type === "ADJUSTED" ? input.quantityDelta : -magnitude;

  const newQuantity = item.quantity + normalizedDelta;
  if (newQuantity < 0) {
    throw AppError.badRequest("This movement would reduce stock below zero.");
  }

  const [updated] = await db
    .update(inventoryItems)
    .set({ quantity: newQuantity, updatedAt: new Date() })
    .where(eq(inventoryItems.id, input.itemId))
    .returning();

  const [movement] = await db.insert(inventoryMovements).values({ ...input, quantityDelta: normalizedDelta }).returning();

  return { item: { ...updated, status: computeStatus(updated) }, movement };
}

export async function listMovements(clinicId: string, itemId?: string) {
  return db.query.inventoryMovements.findMany({
    where: itemId ? and(eq(inventoryMovements.clinicId, clinicId), eq(inventoryMovements.itemId, itemId)) : eq(inventoryMovements.clinicId, clinicId),
    orderBy: (m, { desc }) => [desc(m.createdAt)],
    limit: 100,
    with: {
      recordedBy: { columns: { fullName: true } },
      item: { columns: { name: true } },
    },
  });
}
