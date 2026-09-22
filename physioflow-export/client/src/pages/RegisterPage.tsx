import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Building2 } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useRegisterInstitution } from "../features/auth/hooks";
import { getErrorMessage } from "../lib/api";

// This is institution signup — a brand-new clinic joining the platform, with its first
// admin account. Patients and physiotherapists are never created here; clinic admins
// create them from inside the product (Staff page, Add Patient flow).
export function RegisterPage() {
  const [clinicName, setClinicName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const register = useRegisterInstitution();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register.mutateAsync({ clinicName, fullName, email, password });
      navigate("/", { replace: true });
    } catch {
      // surfaced below
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2 text-brand-800">
          <Building2 className="size-5" />
          <span className="text-sm font-medium">New institution</span>
        </div>
        <h1 className="text-xl font-semibold text-ink-900">Set up your clinic</h1>
        <p className="mt-1 text-sm text-ink-500">
          This creates your clinic's workspace on PhysioFlow, with you as the first administrator. You'll add
          physiotherapists and patients from inside the app.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Input label="Clinic name" required value={clinicName} onChange={(e) => setClinicName(e.target.value)} />
          <Input label="Your full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="Password"
            type="password"
            required
            hint="At least 8 characters."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {register.isError ? <p className="text-sm text-urgent-700">{getErrorMessage(register.error)}</p> : null}

          <Button type="submit" isLoading={register.isPending} className="mt-2 w-full">
            Create clinic workspace
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-700 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
