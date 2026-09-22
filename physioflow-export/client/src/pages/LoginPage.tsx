import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { useLogin } from "../features/auth/hooks";
import { useLookupClinic } from "../features/clinics/hooks";
import { getErrorMessage } from "../lib/api";

const DEMO_ACCOUNTS = [
  { label: "Patient", email: "lawson.bediako@physioflow.demo" },
  { label: "Physiotherapist", email: "sarah.mensah@physiocare.demo" },
  { label: "Clinic Admin", email: "admin@physiocare.demo" },
  { label: "Manager", email: "manager@physiocare.demo" },
];

const features = [
  { label: "Smarter Scheduling", icon: CalendarDays },
  { label: "Better Patient Outcomes", icon: Users },
  { label: "Streamlined Operations", icon: BarChart3 },
  { label: "Complete Care Journey", icon: ShieldCheck },
];

export function LoginPage() {
  const [step, setStep] = useState<"ORG" | "LOGIN">("ORG");
  const [orgCode, setOrgCode] = useState("");
  const [clinic, setClinic] = useState<{ name: string; orgCode: string } | null>(null);
  const [orgError, setOrgError] = useState("");
  const [orgLookupSuccess, setOrgLookupSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const lookup = useLookupClinic();
  const navigate = useNavigate();

  const lookupOrganization = async (code: string) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setOrgError("Enter your Organization ID to continue.");
      setOrgLookupSuccess(false);
      return;
    }
    if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/.test(normalized)) {
      setOrgError("Use the format PHYSIOCARE-AC-001.");
      setOrgLookupSuccess(false);
      return;
    }

    setOrgError("");
    try {
      const result = await lookup.mutateAsync(normalized);
      setOrgCode(normalized);
      setClinic(result);
      setOrgLookupSuccess(true);
      setStep("LOGIN");
    } catch {
      setOrgLookupSuccess(false);
    }
  };

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    await lookupOrganization(orgCode);
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await login.mutateAsync({ orgCode: clinic?.orgCode ?? "", email, password });
      navigate("/", { replace: true });
    } catch {
      // API-level auth errors are shown inline under the form.
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Demo1234!");
    setOrgCode("PHYSIOCARE-001");
    setClinic({ name: "PhysioCare Accra", orgCode: "PHYSIOCARE-001" });
    setOrgLookupSuccess(true);
    setStep("LOGIN");
  };

  const orgFormError = orgError || (lookup.isError ? getErrorMessage(lookup.error) : undefined);

  return (
    <main className="min-h-screen bg-[#f5f7fb] md:flex">
      <section className="relative flex min-h-[520px] flex-col overflow-hidden px-6 py-6 text-white sm:px-10 md:min-h-screen md:w-[56%] md:px-14 md:py-12 lg:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(94,234,212,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.2),_transparent_28%),linear-gradient(120deg,_#081a2f_0%,_#0d2d55_32%,_#0f5079_70%,_#0f6b82_100%)]" />
        <div className="absolute right-8 top-20 h-52 w-52 rounded-full border border-white/10 bg-white/5 blur-[2px]" />
        <div className="absolute right-20 bottom-28 h-60 w-60 rounded-[36px] border border-cyan-200/15 bg-slate-900/25 shadow-[0_30px_80px_rgba(5,15,35,0.38)] backdrop-blur-sm" />
        <div className="absolute right-28 bottom-16 h-16 w-28 rounded-full bg-cyan-300/30 blur-2xl" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-[radial-gradient(circle_at_20%_0%,_rgba(45,212,191,0.7),_transparent_35%),radial-gradient(circle_at_60%_25%,_rgba(59,130,246,0.8),_transparent_35%),linear-gradient(180deg,_rgba(8,23,38,0)_0%,_rgba(8,23,38,0.35)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 900 240%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath d=%22M0 180 C180 110 310 220 510 150 S760 50 900 30 V240 H0 Z%22 fill=%22%2302d5c7%22 fill-opacity=%22.52%22/%3E%3Cpath d=%22M0 200 C220 150 360 250 580 180 S800 130 900 70 V240 H0 Z%22 fill=%22%230d83d6%22 fill-opacity=%22.5%22/%3E%3C/svg%3E')] bg-cover bg-bottom opacity-90" />

        <div className="relative z-10 flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-cyan-400 text-[#061a31] shadow-[0_0_0_7px_rgba(34,211,238,0.14)]">
            <Activity className="size-6" strokeWidth={2.5} />
          </span>
          <div>
            <strong className="block text-xl tracking-tight">PhysioFlow</strong>
            <small className="font-semibold uppercase tracking-[0.18em] text-cyan-300">Care command center</small>
          </div>
        </div>

        <div className="relative z-10 my-auto max-w-2xl py-8 md:py-14">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Connected clinical care</p>
          <h1 className="max-w-xl text-3xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Recovery doesn&apos;t stop
            <br />
            <span className="text-cyan-300">when the session ends.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100 sm:mt-6 sm:text-base sm:leading-7">
            Manage appointments, treatment plans, exercises, and patient progress in one connected workspace.
          </p>

          <div className="mt-6 grid max-w-2xl grid-cols-2 gap-4 sm:mt-10 sm:grid-cols-4">
            {features.map(({ label, icon: Icon }) => (
              <div key={label} className="flex flex-col gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-blue-900/70 text-cyan-300 ring-1 ring-white/10">
                  <Icon className="size-5" />
                </span>
                <span className="text-xs font-semibold leading-5 text-white/90">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex max-w-xl items-center gap-6 rounded-2xl border border-cyan-300/20 bg-blue-950/30 px-5 py-4 shadow-[0_24px_55px_rgba(6,19,35,0.35)] backdrop-blur-md sm:gap-10 sm:px-7">
          <div>
            <p className="text-3xl font-bold">72% <span className="text-xl text-cyan-300">↑</span></p>
            <p className="mt-1 text-xs text-blue-100">Avg. recovery adherence</p>
          </div>
          <div className="h-12 w-px bg-white/20" />
          <div>
            <p className="text-3xl font-bold">4 <Users className="ml-1 inline size-5 text-cyan-300" /></p>
            <p className="mt-1 text-xs text-blue-100">Roles, one workspace</p>
          </div>
        </div>
      </section>

      <section className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-10 sm:px-10 lg:px-20">
        <div className="pointer-events-none absolute -bottom-20 -right-12 size-64 rounded-full bg-cyan-200/80 blur-3xl" />
        <div className="pointer-events-none absolute bottom-12 right-28 size-40 rounded-full bg-blue-100/80 blur-2xl" />

        <div className="relative w-full max-w-[500px]">
          <div className="mb-10 flex items-center justify-end gap-2 text-xs font-semibold text-slate-500 sm:mb-12">
            <span className="h-0.5 w-6 bg-gradient-to-r from-blue-600 to-cyan-400" />
            Better Movement. Healthier Lives.
          </div>

          {step === "ORG" ? (
            <>
              <div className="mb-8">
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Building2 className="size-6" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Find your clinic</h2>
                <p className="mt-2 text-sm text-slate-500">Enter your organization ID to continue.</p>
              </div>

              <form onSubmit={handleLookup} className="flex flex-col gap-5" noValidate>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="organization-id" className="text-sm font-medium text-slate-700">Organization ID</label>
                    <button
                      type="button"
                      aria-label="Organization ID help"
                      className="flex size-6 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-blue-200 hover:text-blue-600"
                    >
                      <CircleHelp className="size-4" />
                    </button>
                  </div>

                  <div
                    className={`flex items-center gap-3 rounded-2xl border bg-white px-3.5 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 ${orgFormError ? "border-red-300" : "border-slate-200"}`}
                  >
                    <Building2 className={`size-5 ${orgFormError ? "text-red-500" : "text-slate-400"}`} />
                    <input
                      id="organization-id"
                      type="text"
                      required
                      autoComplete="organization"
                      value={orgCode}
                      onChange={(event) => {
                        setOrgCode(event.target.value.toUpperCase());
                        setOrgError("");
                        setOrgLookupSuccess(false);
                      }}
                      placeholder="e.g. PHYSIOCARE-AC-001"
                      aria-invalid={!!orgFormError}
                      aria-describedby={orgFormError ? "organization-id-error" : undefined}
                      className="w-full border-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>

                  {orgFormError ? (
                    <p id="organization-id-error" className="text-xs text-red-600" role="alert">
                      {orgFormError}
                    </p>
                  ) : orgLookupSuccess ? (
                    <p role="status" className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
                      <CheckCircle2 className="size-4" /> Organization verified.
                    </p>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  isLoading={lookup.isPending}
                  className="mt-1 h-14 w-full bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 text-base font-bold shadow-[0_18px_28px_-16px_rgba(14,116,144,0.72)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_32px_-18px_rgba(14,116,144,0.82)] active:translate-y-0"
                >
                  Continue <ArrowRight className="size-5" />
                </Button>
              </form>

              <div className="my-8 flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                Demo shortcuts
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => lookupOrganization("PHYSIOCARE-001")}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-blue-50 px-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  <Building2 className="size-4" />
                  Demo Clinic
                </button>
                <button
                  type="button"
                  onClick={() => lookupOrganization("GREENFIELD-002")}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-cyan-50 px-3 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100"
                >
                  <Building2 className="size-4" />
                  Demo Clinic 2
                </button>
              </div>

              <div className="mt-8 flex items-start gap-3 rounded-2xl bg-gradient-to-r from-blue-50 to-cyan-50 p-4">
                <ShieldCheck className="mt-0.5 size-6 shrink-0 text-teal-500" />
                <div>
                  <p className="text-sm font-bold text-slate-800">Secure &amp; Trusted</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Your data is protected with enterprise-grade security.</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep("ORG")}
                className="mb-8 flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <ArrowLeft className="size-4" />
                Back to search
              </button>

              <div className="mb-8">
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <HeartPulse className="size-6" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Log in</h2>
                <p className="mt-2 text-sm text-slate-500">Welcome to {clinic?.name ?? "your clinic"}</p>
              </div>

              <form onSubmit={handleLogin} className="flex flex-col gap-5" noValidate>
                <div className="space-y-2">
                  <label htmlFor="login-email" className="text-sm font-medium text-slate-700">Email</label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.04)] placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="login-password" className="text-sm font-medium text-slate-700">Password</label>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.04)] placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                {login.isError ? (
                  <p role="alert" className="text-sm text-red-600">
                    {getErrorMessage(login.error)}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  isLoading={login.isPending}
                  className="mt-1 h-14 w-full bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 text-base font-bold shadow-[0_18px_28px_-16px_rgba(14,116,144,0.72)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_32px_-18px_rgba(14,116,144,0.82)] active:translate-y-0"
                >
                  Log in <ArrowRight className="size-5" />
                </Button>
              </form>

              <div className="mt-8 border-t border-slate-200 pt-5">
                <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Try a demo account</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {DEMO_ACCOUNTS.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => fillDemo(account.email)}
                      className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      {account.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
            <Sparkles className="size-3.5 text-cyan-500" /> Built for better clinical outcomes.
          </p>
        </div>
      </section>
    </main>
  );
}
