import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonCard } from "../components/ui/Skeleton";
import { api, getErrorMessage } from "../lib/api";
import { useAuthStore } from "../lib/authStore";

interface Clinic {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  currency: string;
}

function useClinic(clinicId: string | null) {
  return useQuery({
    queryKey: ["clinics", clinicId],
    queryFn: async () => {
      const res = await api.get<Clinic>(`/clinics/${clinicId}`);
      return res.data;
    },
    enabled: !!clinicId,
  });
}

function useUpdateClinic(clinicId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Clinic>) => {
      const res = await api.patch<Clinic>(`/clinics/${clinicId}`, input);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinics", clinicId] });
    },
  });
}

export function SettingsPage() {
  const { clinicId } = useAuthStore();
  const { data, isLoading, isError, refetch } = useClinic(clinicId);
  const update = useUpdateClinic(clinicId);

  const [form, setForm] = useState({ name: "", city: "", address: "", phone: "" });
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (data) setForm({ name: data.name, city: data.city ?? "", address: data.address ?? "", phone: data.phone ?? "" });
  }, [data]);

  if (!clinicId) {
    return (
      <EmptyState title="No clinic linked to your account" description="Ask a system administrator to link your admin account to a clinic." />
    );
  }
  if (isLoading) return <SkeletonCard />;
  if (isError || !data) return <ErrorState message="We couldn't load clinic settings." onRetry={() => refetch()} />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await update.mutateAsync(form);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } catch {
      // surfaced below
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Settings</h1>
        <p className="mt-1 text-ink-500">Manage your clinic profile.</p>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input label="Clinic name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Currency" value={data.currency} disabled hint="Currency is fixed to GHS for this deployment." />

            {update.isError ? <p className="text-sm text-urgent-700">{getErrorMessage(update.error)}</p> : null}
            {savedNotice ? <p className="text-sm text-positive-700">Saved.</p> : null}

            <Button type="submit" isLoading={update.isPending} className="mt-2 self-start">
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
