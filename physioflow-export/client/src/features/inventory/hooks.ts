import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export type InventoryCategory = "INJECTION" | "TABLET" | "OINTMENT" | "OTHER_SUPPLY";
export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "EXPIRED";
export type MovementType = "ADDED" | "REMOVED" | "ADJUSTED" | "EXPIRED";

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: string;
  minStockThreshold: number;
  supplier: string | null;
  expiryDate: string | null;
  batchNumber: string | null;
  status: StockStatus;
}

export interface InventoryOverview {
  totalItems: number;
  lowStock: number;
  outOfStock: number;
  expired: number;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  type: MovementType;
  quantityDelta: number;
  reason: string;
  createdAt: string;
  recordedBy: { fullName: string };
  item: { name: string };
}

interface ListFilters {
  category?: InventoryCategory | "";
  search?: string;
}

async function fetchInventory(filters: ListFilters) {
  const params = { ...filters, category: filters.category || undefined };
  const res = await api.get<InventoryItem[]>("/inventory", { params });
  return res.data;
}

export function useInventory(filters: ListFilters) {
  return useQuery({ queryKey: ["inventory", filters], queryFn: () => fetchInventory(filters) });
}

async function fetchInventoryOverview() {
  const res = await api.get<InventoryOverview>("/inventory/overview");
  return res.data;
}

export function useInventoryOverview() {
  return useQuery({ queryKey: ["inventory", "overview"], queryFn: fetchInventoryOverview });
}

async function fetchMovements(itemId?: string) {
  const res = await api.get<InventoryMovement[]>("/inventory/movements", { params: itemId ? { itemId } : {} });
  return res.data;
}

export function useMovements(itemId?: string) {
  return useQuery({ queryKey: ["inventory", "movements", itemId], queryFn: () => fetchMovements(itemId) });
}

export interface CreateInventoryItemInput {
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: string;
  minStockThreshold: number;
  supplier?: string;
  expiryDate?: string;
  batchNumber?: string;
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateInventoryItemInput) => {
      const res = await api.post<InventoryItem>("/inventory", input);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["physiotherapists", "me", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["clinics"] });
    },
  });
}

export function useRecordMovement(itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { type: MovementType; quantityDelta: number; reason: string }) => {
      const res = await api.post(`/inventory/${itemId}/movements`, input);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["physiotherapists", "me", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["clinics"] });
    },
  });
}
