import { useState } from "react";
import { Plus, Building2 } from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonCard } from "../components/ui/Skeleton";
import { useClinicOverview } from "../features/clinics/hooks";
import { useCreateStaff } from "../features/physiotherapists/staff";
import { useAuthStore } from "../lib/authStore";
import { getErrorMessage } from "../lib/api";

function AddStaffModal({ isOpen, onClose, clinicId }: { isOpen: boolean; onClose: () => void; clinicId: string }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialty, setSpecialty] = useState("");
  const createStaff = useCreateStaff();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createStaff.mutateAsync({ fullName, email, password, specialty: specialty || undefined, clinicId });
      onClose();
      setFullName("");
      setEmail("");
      setPassword("");
      setSpecialty("");
    } catch {
      // surfaced below
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add physiotherapist"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-staff-form" isLoading={createStaff.isPending}>
            Add to clinic
          </Button>
        </>
      }
    >
      <form id="add-staff-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          label="Temporary password"
          type="password"
          required
          hint="At least 8 characters. Share this with the new staff member securely."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input label="Specialty (optional)" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
        {createStaff.isError ? <p className="text-sm text-urgent-700">{getErrorMessage(createStaff.error)}</p> : null}
      </form>
    </Modal>
  );
}

export function StaffPage() {
  const { clinicId } = useAuthStore();
  const { data, isLoading, isError, refetch } = useClinicOverview(clinicId);
  const [isAddOpen, setIsAddOpen] = useState(false);

  if (!clinicId) {
    return (
      <EmptyState
        title="No clinic linked to your account"
        description="Ask a system administrator to link your admin account to a clinic."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Staff</h1>
          <p className="mt-1 text-ink-500">Manage physiotherapists at your clinic.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="size-4" /> Add physiotherapist
        </Button>
      </div>

      {isLoading ? (
        <SkeletonCard />
      ) : isError || !data ? (
        <ErrorState message="We couldn't load staff." onRetry={() => refetch()} />
      ) : data.physiotherapists.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-6" />}
          title="No physiotherapists yet"
          description="Add your first staff member to start scheduling appointments."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            {data.physiotherapists.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800">
                    {p.user.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-ink-900">{p.user.fullName}</p>
                    <p className="text-sm text-ink-500">{p.specialty ?? "General practice"}</p>
                  </div>
                </div>
                <p className="text-sm text-ink-500">{p.user.email}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AddStaffModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} clinicId={clinicId} />
    </div>
  );
}
