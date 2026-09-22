import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Users, Search, Plus, Copy, Check, Camera, Upload } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { Textarea } from "../components/ui/Textarea";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonCard } from "../components/ui/Skeleton";
import { usePatientsList, useCreatePatient, useSendInvitation } from "../features/patients/directory";
import { useClinicOverview } from "../features/clinics/hooks";
import { useCurrentUser } from "../features/auth/hooks";
import { useAuthStore } from "../lib/authStore";
import { getErrorMessage } from "../lib/api";

const STATUS_TONE = { PENDING_ONBOARDING: "attention", ACTIVE: "positive", INACTIVE: "neutral", TREATMENT_COMPLETED: "positive", DISCHARGED: "neutral" } as const;
const BODY_AREAS = ["Knee", "Shoulder", "Back", "Hip", "Ankle", "General"];

/** After a patient is created, generates and displays their invitation link. */
function InvitationModal({ isOpen, onClose, patientId, patientName }: { isOpen: boolean; onClose: () => void; patientId: string; patientName: string }) {
  const sendInvitation = useSendInvitation();
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    const result = await sendInvitation.mutateAsync(patientId);
    setLink(`${window.location.origin}/invite/${result.token}`);
  };

  const handleCopy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!link) return;
    const svg = document.querySelector("#patient-invitation-qr");
    if (!(svg instanceof SVGElement)) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${patientName.replace(/\s+/g, "-").toLowerCase()}-invitation.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setLink(null);
        onClose();
      }}
      title="Patient invitation"
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-700">
          <span className="font-medium">{patientName}</span> will receive a secure link to access PhysioFlow.
        </p>

        {!link ? (
          <Button onClick={handleGenerate} isLoading={sendInvitation.isPending}>
            Generate invitation link
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface-sunken px-3 py-2.5">
              <span className="flex-1 truncate text-sm text-ink-700">{link}</span>
              <button onClick={handleCopy} className="shrink-0 text-brand-700 hover:text-brand-900" aria-label="Copy link">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </button>
            </div>
            <div className="flex flex-col items-center gap-3 rounded-[var(--radius-control)] border border-border bg-white p-4">
              <QRCodeSVG id="patient-invitation-qr" value={link} size={160} level="M" includeMargin />
              <Button type="button" variant="secondary" onClick={handleDownloadQr}>
                Download QR code
              </Button>
            </div>
            <p className="text-xs text-ink-500">
              This link expires in 7 days and can only be used once. Generating a new invitation will invalidate this one.
            </p>
          </div>
        )}
        {sendInvitation.isError ? <p className="text-sm text-urgent-700">{getErrorMessage(sendInvitation.error)}</p> : null}
      </div>
    </Modal>
  );
}

function AddPatientModal({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: (id: string, name: string) => void }) {
  const { clinicId } = useAuthStore();
  const { data: overview } = useClinicOverview(clinicId);
  const createPatient = useCreatePatient();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    phone: "",
    email: "",
    presentingComplaint: "",
    bodyArea: "",
    dateOfInjury: "",
    referringSource: "",
    intakeNotes: "",
    primaryPhysioId: "",
    avatarUrl: "",
  });
  const [photoName, setPhotoName] = useState("");

  const handlePhoto = (file: File | undefined) => {
    if (!file) return;
    setPhotoName(file.name);
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, avatarUrl: typeof reader.result === "string" ? reader.result : "" }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const fullName = `${form.firstName} ${form.lastName}`.trim();
      const result = await createPatient.mutateAsync({
        fullName,
        email: form.email,
        phone: form.phone || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        presentingComplaint: form.presentingComplaint || undefined,
        bodyArea: form.bodyArea || undefined,
        dateOfInjury: form.dateOfInjury || undefined,
        referringSource: form.referringSource || undefined,
        intakeNotes: form.intakeNotes || undefined,
        primaryPhysioId: form.primaryPhysioId || undefined,
        avatarUrl: form.avatarUrl || undefined,
      });
      onClose();
      onCreated(result.id, fullName);
      setForm({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        phone: "",
        email: "",
        presentingComplaint: "",
        bodyArea: "",
        dateOfInjury: "",
        referringSource: "",
        intakeNotes: "",
        primaryPhysioId: "",
        avatarUrl: "",
      });
      setPhotoName("");
    } catch {
      // surfaced below
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New patient"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-patient-form" isLoading={createPatient.isPending}>
            Create patient
          </Button>
        </>
      }
    >
      <form id="add-patient-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Personal information</p>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="First name" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              <Input label="Last name" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <Input label="Date of birth" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
            <div>
              <p className="mb-2 text-sm font-medium text-ink-700">Patient photo</p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-zinc-950 px-3 py-2 text-xs font-semibold text-white">
                  <Upload className="size-3.5" /> Upload photo
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => handlePhoto(event.target.files?.[0])} />
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border-strong px-3 py-2 text-xs font-semibold text-ink-700">
                  <Camera className="size-3.5" /> Take photo
                  <input type="file" accept="image/*" capture="user" className="hidden" onChange={(event) => handlePhoto(event.target.files?.[0])} />
                </label>
                {photoName ? <span className="text-xs text-ink-500">{photoName}</span> : null}
              </div>
              {form.avatarUrl ? <img src={form.avatarUrl} alt="Patient preview" className="mt-3 size-16 rounded-2xl object-cover" /> : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Clinical information</p>
          <div className="flex flex-col gap-3">
            <Textarea
              label="Presenting complaint"
              rows={2}
              value={form.presentingComplaint}
              onChange={(e) => setForm({ ...form, presentingComplaint: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Body area" value={form.bodyArea} onChange={(e) => setForm({ ...form, bodyArea: e.target.value })}>
                <option value="">Select</option>
                {BODY_AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
              <Input label="Date of injury" type="date" value={form.dateOfInjury} onChange={(e) => setForm({ ...form, dateOfInjury: e.target.value })} />
            </div>
            <Select label="Assign physiotherapist" value={form.primaryPhysioId} onChange={(e) => setForm({ ...form, primaryPhysioId: e.target.value })}>
              <option value="">Not yet assigned</option>
              {overview?.physiotherapists.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.user.fullName}
                </option>
              ))}
            </Select>
            <Input label="Referring source" value={form.referringSource} onChange={(e) => setForm({ ...form, referringSource: e.target.value })} />
            <Textarea label="Additional notes" rows={2} value={form.intakeNotes} onChange={(e) => setForm({ ...form, intakeNotes: e.target.value })} />
          </div>
        </div>

        {createPatient.isError ? <p className="text-sm text-urgent-700">{getErrorMessage(createPatient.error)}</p> : null}
      </form>
    </Modal>
  );
}

export function PatientsPage() {
  const { role } = useAuthStore();
  const { data: me } = useCurrentUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [invitationTarget, setInvitationTarget] = useState<{ id: string; name: string } | null>(null);

  const filters =
    role === "PHYSIOTHERAPIST" && me?.physiotherapist
      ? { physioId: me.physiotherapist.id, search: search || undefined }
      : { search: search || undefined };

  const { data, isLoading, isError, refetch } = usePatientsList(filters);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Patients</h1>
          <p className="mt-1 text-ink-500">Search, review, and manage patient care.</p>
        </div>
        {role === "CLINIC_ADMIN" || role === "PHYSIOTHERAPIST" || role === "MANAGER" ? (
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="size-4" /> Add patient
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
            <Input
              label="Search patients"
              hideLabel
              placeholder="Search by name, email, or patient ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <SkeletonCard />
      ) : isError ? (
        <ErrorState message="We couldn't load patients." onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" />}
          title="No patients yet"
          description={role === "CLINIC_ADMIN" || role === "PHYSIOTHERAPIST" || role === "MANAGER" ? "Add your first patient to get started." : "Patients assigned to you will appear here."}
          actionLabel={role === "CLINIC_ADMIN" || role === "PHYSIOTHERAPIST" || role === "MANAGER" ? "Add patient" : undefined}
          onAction={role === "CLINIC_ADMIN" || role === "PHYSIOTHERAPIST" || role === "MANAGER" ? () => setIsAddOpen(true) : undefined}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            {data.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 last:border-0">
                <button
                  onClick={() => navigate(`/patients/${p.id}`)}
                  className="flex flex-1 items-center gap-3 text-left hover:opacity-80"
                >
                  <div className="flex size-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800">
                    {p.user.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-ink-900">{p.user.fullName}</p>
                    <p className="text-sm text-ink-500">
                      {p.patientCode} · {p.condition ?? "No condition on file"}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-3">
                  <Badge tone={STATUS_TONE[p.status]}>{p.status.replace("_", " ").toLowerCase()}</Badge>
                  {role === "CLINIC_ADMIN" && p.status === "PENDING_ONBOARDING" ? (
                    <Button size="sm" variant="secondary" onClick={() => setInvitationTarget({ id: p.id, name: p.user.fullName })}>
                      Send invitation
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AddPatientModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onCreated={(id, name) => setInvitationTarget({ id, name })}
      />

      {invitationTarget ? (
        <InvitationModal
          isOpen={!!invitationTarget}
          onClose={() => setInvitationTarget(null)}
          patientId={invitationTarget.id}
          patientName={invitationTarget.name}
        />
      ) : null}
    </div>
  );
}
