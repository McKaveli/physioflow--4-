import { format } from "date-fns";
import { Search, Wallet, CreditCard, Banknote } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonCard } from "../components/ui/Skeleton";
import { usePayments, useReconcilePayment } from "../features/payments/hooks";
import type { PaymentStatus, PaymentMethod } from "../features/payments/hooks";
import { useCurrentUser } from "../features/auth/hooks";
import { useAuthStore } from "../lib/authStore";
import { Input } from "../components/ui/Input";

const STATUS_TONE: Record<PaymentStatus, "positive" | "attention" | "urgent" | "neutral"> = {
  SUCCEEDED: "positive",
  PENDING: "attention",
  FAILED: "urgent",
  REFUNDED: "neutral",
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  MOBILE_MONEY: "Mobile Money",
  CARD: "Card",
  CASH: "Cash",
};

function ReconcileButton({ paymentId }: { paymentId: string }) {
  const reconcile = useReconcilePayment();
  return (
    <Button size="sm" variant="secondary" isLoading={reconcile.isPending} onClick={() => reconcile.mutate(paymentId)}>
      Mark received
    </Button>
  );
}

export function PaymentsPage() {
  const { role } = useAuthStore();
  const { data: me } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState<"ALL" | PaymentMethod>("ALL");
  const [status, setStatus] = useState<"ALL" | PaymentStatus>("ALL");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const { data, isLoading, isError, refetch } = usePayments(role === "PATIENT" ? me?.patient?.id : undefined);
  const filteredPayments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (data ?? []).filter((payment) => {
      const matchesSearch = !needle || [payment.purpose, payment.providerRef, payment.patientId].some((value) => value?.toLowerCase().includes(needle));
      return matchesSearch && (method === "ALL" || payment.method === method) && (status === "ALL" || payment.status === status);
    }).sort((a, b) => sort === "newest" ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [data, method, search, sort, status]);
  const totalPaid = (data ?? []).filter((p) => p.status === "SUCCEEDED").reduce((sum, p) => sum + p.amount, 0);
  const cashReceived = (data ?? []).filter((p) => p.status === "SUCCEEDED" && p.method === "CASH").reduce((sum, p) => sum + p.amount, 0);
  const mobileMoneyReceived = (data ?? []).filter((p) => p.status === "SUCCEEDED" && p.method === "MOBILE_MONEY").reduce((sum, p) => sum + p.amount, 0);
  const outstanding = (data ?? []).filter((p) => p.status === "PENDING").reduce((sum, p) => sum + p.amount, 0);
  const isPatient = role === "PATIENT";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Payments</h1>
          <p className="mt-1 text-ink-500">{role === "PATIENT" ? "Your billing history." : "Clinic payment activity."}</p>
        </div>
      </div>

      {isPatient ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card><CardContent><p className="text-sm text-ink-500">Total paid</p><p className="mt-1 text-2xl font-semibold text-ink-900">GH₵{totalPaid.toFixed(2)}</p></CardContent></Card>
          <Card><CardContent><p className="text-sm text-ink-500">Outstanding balance</p><p className="mt-1 text-2xl font-semibold text-ink-900">Contact clinic</p><p className="mt-1 text-xs text-ink-500">Your clinic will confirm any balance due.</p></CardContent></Card>
        </div>
      ) : null}

      {!isPatient ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Total collected", totalPaid, "text-teal-700"],
              ["Cash received", cashReceived, "text-brand-700"],
              ["Mobile Money", mobileMoneyReceived, "text-indigo-700"],
              ["Outstanding", outstanding, "text-amber-700"],
            ].map(([label, amount, tone]) => (
              <Card key={label as string}><CardContent><p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{label}</p><p className={`mt-2 text-2xl font-semibold ${tone}`}>GH₵{(amount as number).toFixed(2)}</p><p className="mt-1 text-xs text-ink-500">Across this organisation</p></CardContent></Card>
            ))}
          </div>
          <Card>
            <CardContent className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                <Input label="Search payments" hideLabel placeholder="Search patient ID, service, or reference..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10" />
              </div>
              <select aria-label="Payment method" value={method} onChange={(event) => setMethod(event.target.value as typeof method)} className="h-11 rounded-xl border border-border bg-white px-3 text-sm text-ink-700">
                <option value="ALL">All methods</option><option value="CASH">Cash</option><option value="MOBILE_MONEY">Mobile Money</option><option value="CARD">Card</option>
              </select>
              <select aria-label="Payment status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-11 rounded-xl border border-border bg-white px-3 text-sm text-ink-700">
                <option value="ALL">All statuses</option><option value="SUCCEEDED">Paid</option><option value="PENDING">Pending</option><option value="FAILED">Failed</option><option value="REFUNDED">Refunded</option>
              </select>
              <select aria-label="Sort payments" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="h-11 rounded-xl border border-border bg-white px-3 text-sm text-ink-700">
                <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
              </select>
            </CardContent>
          </Card>
        </>
      ) : null}

      {isLoading ? (
        <SkeletonCard />
      ) : isError ? (
        <ErrorState message="We couldn't load payments." onRetry={() => refetch()} />
      ) : !filteredPayments || filteredPayments.length === 0 ? (
        <EmptyState icon={<Wallet className="size-6" />} title="No payments yet" description="Payment history will appear here." />
      ) : (
        <Card>
          <CardContent className="p-0">
            {filteredPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 last:border-0">
                <div className="min-w-0">
                  {!isPatient && p.patient ? <p className="flex items-center gap-2 font-medium text-ink-900">{p.patient.user.avatarUrl ? <img src={p.patient.user.avatarUrl} alt="" className="size-8 rounded-full object-cover" /> : <span className="flex size-8 items-center justify-center rounded-full bg-[#6c5ce7]/15 text-xs font-bold text-[#6c5ce7]">{p.patient.user.fullName.charAt(0)}</span>}{p.patient.user.fullName} <span className="font-normal text-ink-400">· {p.patient.patientCode}</span></p> : null}
                  <p className={isPatient ? "font-medium text-ink-900" : "text-sm font-medium text-ink-800"}>
                    {p.currency} {p.amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-ink-500">
                    {p.purpose ?? "Physiotherapy session"} · <span className="inline-flex items-center gap-1">{p.method === "CASH" ? <Banknote className="inline size-3" /> : <CreditCard className="inline size-3" />}{METHOD_LABEL[p.method]}</span> · {format(new Date(p.createdAt), "MMM d, yyyy · h:mm a")}
                  </p>
                  {!isPatient && <p className="mt-1 text-xs text-ink-400">Recorded by {p.recordedBy?.fullName ?? "System"}{p.providerRef ? ` · Ref ${p.providerRef}` : ""}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={STATUS_TONE[p.status]}>{p.status.toLowerCase()}</Badge>
                  {role === "CLINIC_ADMIN" && p.method === "CASH" && p.status === "PENDING" ? (
                    <ReconcileButton paymentId={p.id} />
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
