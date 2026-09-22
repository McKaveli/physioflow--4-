import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonCard } from "../components/ui/Skeleton";
import { useCurrentUser } from "../features/auth/hooks";
import { useLogout } from "../features/auth/hooks";

export function ProfilePage() {
  const { data: me, isLoading, isError, refetch } = useCurrentUser();
  const logout = useLogout();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (me) {
      setFullName(me.fullName);
      setPhone(me.phone ?? "");
    }
  }, [me]);

  if (isLoading) return <SkeletonCard />;
  if (isError || !me) return <ErrorState message="We couldn't load your profile." onRetry={() => refetch()} />;

  const roleLabel = me.role.replace("_", " ").toLowerCase();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Profile</h1>
        <p className="mt-1 text-ink-500">Your account details.</p>
      </div>

      <Card>
        <CardContent>
          <div className="mb-6 flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-brand-100 text-xl font-semibold text-brand-800">
              {me.fullName.charAt(0)}
            </div>
            <div>
              <p className="text-lg font-semibold text-ink-900">{me.fullName}</p>
              <Badge tone="brand" className="mt-1 capitalize">
                {roleLabel}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled />
            <Input label="Email" value={me.email} disabled />
            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Not set" disabled />
          </div>
          <p className="mt-3 text-xs text-ink-400">Profile editing isn't available yet — reach out to your clinic to update these details.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-ink-700">
            <User className="size-4 text-ink-400" />
            Signed in as {me.email}
          </div>
          <Button variant="secondary" size="sm" onClick={() => logout.mutate()}>
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
