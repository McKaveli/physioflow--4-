import { useState } from "react";
import { format } from "date-fns";
import { Package, Plus, AlertTriangle, History } from "lucide-react";
import clsx from "clsx";
import { Card, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonCard } from "../components/ui/Skeleton";
import {
  useInventory,
  useInventoryOverview,
  useCreateInventoryItem,
  useRecordMovement,
  useMovements,
} from "../features/inventory/hooks";
import type { InventoryCategory, InventoryItem, StockStatus, MovementType } from "../features/inventory/hooks";
import { useAuthStore } from "../lib/authStore";
import { getErrorMessage } from "../lib/api";

const CATEGORY_LABEL: Record<InventoryCategory, string> = {
  INJECTION: "Injections",
  TABLET: "Tablets",
  OINTMENT: "Ointments",
  OTHER_SUPPLY: "Other supplies",
};

const STATUS_TONE: Record<StockStatus, "positive" | "attention" | "urgent" | "neutral"> = {
  IN_STOCK: "positive",
  LOW_STOCK: "attention",
  OUT_OF_STOCK: "urgent",
  EXPIRED: "urgent",
};

const STATUS_LABEL: Record<StockStatus, string> = {
  IN_STOCK: "In stock",
  LOW_STOCK: "Low stock",
  OUT_OF_STOCK: "Out of stock",
  EXPIRED: "Expired",
};

function Metric({ value, label, tone }: { value: number; label: string; tone?: "attention" | "urgent" }) {
  return (
    <div>
      <p className={clsx("text-2xl font-semibold", tone === "urgent" ? "text-urgent-700" : tone === "attention" ? "text-attention-700" : "text-ink-900")}>
        {value}
      </p>
      <p className="text-sm text-ink-500">{label}</p>
    </div>
  );
}

function AddItemModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    name: "",
    category: "INJECTION" as InventoryCategory,
    quantity: "0",
    unit: "unit",
    minStockThreshold: "5",
    supplier: "",
    expiryDate: "",
    batchNumber: "",
  });
  const create = useCreateInventoryItem();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({
        ...form,
        quantity: Number(form.quantity),
        minStockThreshold: Number(form.minStockThreshold),
        supplier: form.supplier || undefined,
        expiryDate: form.expiryDate || undefined,
        batchNumber: form.batchNumber || undefined,
      });
      onClose();
      setForm({ name: "", category: "INJECTION", quantity: "0", unit: "unit", minStockThreshold: "5", supplier: "", expiryDate: "", batchNumber: "" });
    } catch {
      // surfaced below
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add inventory item"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-item-form" isLoading={create.isPending}>
            Add item
          </Button>
        </>
      }
    >
      <form id="add-item-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Item name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as InventoryCategory })}>
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Input label="Unit" placeholder="vial, tablet, tube..." value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Starting quantity" type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <Input
            label="Low-stock threshold"
            type="number"
            min={0}
            value={form.minStockThreshold}
            onChange={(e) => setForm({ ...form, minStockThreshold: e.target.value })}
          />
        </div>
        <Input label="Supplier (optional)" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Expiry date (optional)" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
          <Input label="Batch/lot (optional)" value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} />
        </div>
        {create.isError ? <p className="text-sm text-urgent-700">{getErrorMessage(create.error)}</p> : null}
      </form>
    </Modal>
  );
}

function StockMovementModal({ isOpen, onClose, item }: { isOpen: boolean; onClose: () => void; item: InventoryItem | null }) {
  const [type, setType] = useState<MovementType>("REMOVED");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const recordMovement = useRecordMovement(item?.id ?? "");
  const { data: movements } = useMovements(item?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    try {
      await recordMovement.mutateAsync({ type, quantityDelta: Number(quantity), reason });
      setQuantity("1");
      setReason("");
    } catch {
      // surfaced below
    }
  };

  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item.name}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between rounded-[var(--radius-control)] bg-surface-sunken px-4 py-3">
          <div>
            <p className="text-2xl font-semibold text-ink-900">
              {item.quantity} <span className="text-sm font-normal text-ink-500">{item.unit}</span>
            </p>
            <p className="text-sm text-ink-500">Current stock</p>
          </div>
          <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Record a stock movement</p>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" value={type} onChange={(e) => setType(e.target.value as MovementType)}>
              <option value="REMOVED">Used / dispensed</option>
              <option value="ADDED">Restocked</option>
              <option value="ADJUSTED">Correction (stocktake)</option>
              <option value="EXPIRED">Expired / discarded</option>
            </Select>
            <Input label="Quantity" type="number" min={1} required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <Input label="Reason" required placeholder="e.g. Used for patient treatment" value={reason} onChange={(e) => setReason(e.target.value)} />
          {recordMovement.isError ? <p className="text-sm text-urgent-700">{getErrorMessage(recordMovement.error)}</p> : null}
          <Button type="submit" size="sm" isLoading={recordMovement.isPending} className="self-start">
            Record movement
          </Button>
        </form>

        <div className="border-t border-border pt-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
            <History className="size-3.5" /> Movement history
          </p>
          {!movements || movements.length === 0 ? (
            <p className="text-sm text-ink-500">No movements recorded yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {movements.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-ink-900">
                      {m.quantityDelta > 0 ? "+" : ""}
                      {m.quantityDelta} · {m.reason}
                    </p>
                    <p className="text-xs text-ink-500">
                      {m.recordedBy.fullName} · {format(new Date(m.createdAt), "d MMM yyyy · h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function InventoryPage() {
  const { role } = useAuthStore();
  const [category, setCategory] = useState<InventoryCategory | "">("");
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const { data: overview } = useInventoryOverview();
  const { data, isLoading, isError, refetch } = useInventory({ category, search: search || undefined });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Inventory</h1>
          <p className="mt-1 text-ink-500">Track clinic stock — medication and supplies.</p>
        </div>
        {role === "CLINIC_ADMIN" ? (
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="size-4" /> Add item
          </Button>
        ) : null}
      </div>

      {overview ? (
        <Card>
          <CardContent className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <Metric value={overview.totalItems} label="Total items" />
            <Metric value={overview.lowStock} label="Low stock" tone="attention" />
            <Metric value={overview.outOfStock} label="Out of stock" tone="urgent" />
            <Metric value={overview.expired} label="Expired" tone="urgent" />
          </CardContent>
        </Card>
      ) : null}

      {overview && overview.lowStock + overview.outOfStock > 0 ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-control)] border border-attention-500/30 bg-attention-50 px-4 py-3 text-sm text-attention-700">
          <AlertTriangle className="size-4 shrink-0" />
          {overview.lowStock + overview.outOfStock} item{overview.lowStock + overview.outOfStock === 1 ? "" : "s"} need
          {overview.lowStock + overview.outOfStock === 1 ? "s" : ""} attention.
        </div>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Input label="Search inventory" hideLabel placeholder="Search by item name or supplier..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {(["", "INJECTION", "TABLET", "OINTMENT", "OTHER_SUPPLY"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={clsx(
                  "rounded-full border px-3 py-1.5 text-sm font-medium",
                  category === c ? "border-brand-700 bg-brand-50 text-brand-800" : "border-border-strong text-ink-700"
                )}
              >
                {c === "" ? "All" : CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <SkeletonCard />
      ) : isError ? (
        <ErrorState message="We couldn't load inventory." onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<Package className="size-6" />}
          title="No inventory items yet"
          description="Add clinic stock like medication and supplies to start tracking."
          actionLabel={role === "CLINIC_ADMIN" ? "Add item" : undefined}
          onAction={role === "CLINIC_ADMIN" ? () => setIsAddOpen(true) : undefined}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            {data.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="flex w-full items-center justify-between gap-4 border-b border-border px-5 py-4 text-left last:border-0 hover:bg-surface-sunken"
              >
                <div>
                  <p className="font-medium text-ink-900">{item.name}</p>
                  <p className="text-sm text-ink-500">
                    {CATEGORY_LABEL[item.category]} · {item.quantity} {item.unit}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <AddItemModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <StockMovementModal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} item={selectedItem} />
    </div>
  );
}
