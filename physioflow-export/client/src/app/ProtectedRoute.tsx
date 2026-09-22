import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore, type Role } from "../lib/authStore";
import { useCurrentUser } from "../features/auth/hooks";

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

/** Full-page spinner shown only during the very first auth check on app load. */
function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="size-8 animate-spin rounded-full border-2 border-brand-700 border-t-transparent" aria-label="Loading" />
    </div>
  );
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isLoading } = useCurrentUser();
  const { isAuthResolved, role, userId } = useAuthStore();

  if (isLoading && !isAuthResolved) {
    return <AuthLoadingScreen />;
  }

  if (!userId) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Never expose role-specific functionality to unauthorized users — redirect to their own home.
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
