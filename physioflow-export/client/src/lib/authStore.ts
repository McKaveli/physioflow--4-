import { create } from "zustand";

export type Role = "PATIENT" | "PHYSIOTHERAPIST" | "CLINIC_ADMIN" | "MANAGER";

interface AuthState {
  isAuthResolved: boolean; // has the initial /me check completed?
  userId: string | null;
  role: Role | null;
  fullName: string | null;
  clinicId: string | null;
  setSession: (session: { userId: string; role: Role; fullName: string; clinicId?: string | null } | null) => void;
  markResolved: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthResolved: false,
  userId: null,
  role: null,
  fullName: null,
  clinicId: null,
  setSession: (session) =>
    set(
      session
        ? { userId: session.userId, role: session.role, fullName: session.fullName, clinicId: session.clinicId ?? null, isAuthResolved: true }
        : { userId: null, role: null, fullName: null, clinicId: null, isAuthResolved: true }
    ),
  markResolved: () => set({ isAuthResolved: true }),
}));
