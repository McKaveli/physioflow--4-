import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Activity, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { ErrorState } from "../components/ui/ErrorState";
import { useInvitationDetails, useAcceptInvitation } from "../features/patients/invitation";
import { useLogin } from "../features/auth/hooks";
import { getErrorMessage } from "../lib/api";

export function InvitationAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { data: invitation, isLoading, isError } = useInvitationDetails(token);
  const acceptInvitation = useAcceptInvitation();
  const login = useLogin();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [mismatchError, setMismatchError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMismatchError("");
    if (password !== confirmPassword) {
      setMismatchError("Passwords don't match.");
      return;
    }
    if (!token) return;
    try {
      await acceptInvitation.mutateAsync({ token, password });
      // Log the patient straight in with the password they just set.
      await login.mutateAsync({ orgCode: invitation!.orgCode, email: invitation!.email, password });
      navigate("/", { replace: true });
    } catch {
      // surfaced below
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="size-8 animate-spin rounded-full border-2 border-brand-700 border-t-transparent" aria-label="Loading" />
      </div>
    );
  }

  if (isError || !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-6">
        <div className="w-full max-w-sm">
          <ErrorState message="This invitation link is invalid or has expired. Ask your clinic to send a new one." />
          <p className="mt-4 text-center text-sm text-ink-500">
            <Link to="/login" className="font-medium text-brand-700 hover:underline">
              Go to login
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2 text-brand-800">
          <Activity className="size-5" />
          <span className="text-sm font-medium">PhysioFlow</span>
        </div>

        <h1 className="text-xl font-semibold text-ink-900">Welcome, {invitation.fullName.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-ink-500">
          Your clinic has set up your PhysioFlow account. Create a password to get started with your recovery plan.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Input label="Email" value={invitation.email} disabled />
          <Input
            label="Create password"
            type="password"
            required
            hint="At least 8 characters."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            label="Confirm password"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <label className="flex items-start gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5"
              required
            />
            I agree to PhysioFlow's terms of service and privacy policy.
          </label>

          {mismatchError ? <p className="text-sm text-urgent-700">{mismatchError}</p> : null}
          {acceptInvitation.isError ? <p className="text-sm text-urgent-700">{getErrorMessage(acceptInvitation.error)}</p> : null}
          {login.isError ? <p className="text-sm text-urgent-700">Account created — please log in.</p> : null}

          <Button type="submit" isLoading={acceptInvitation.isPending || login.isPending} disabled={!agreedToTerms} className="mt-2 w-full">
            <CheckCircle2 className="size-4" /> Create account & continue
          </Button>
        </form>
      </div>
    </div>
  );
}
