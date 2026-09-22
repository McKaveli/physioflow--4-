import { api } from "../../lib/api";
import type { Role } from "../../lib/authStore";

export interface CurrentUser {
  id: string;
  email: string;
  role: Role;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  patient: { id: string; clinicId: string } | null;
  physiotherapist: { id: string; clinicId: string } | null;
  clinicAdmin: { clinicId: string } | null;
  manager: { clinicId: string } | null;
}

export interface LoginInput {
  orgCode: string;
  email: string;
  password: string;
}

// The only self-service signup left in the product: a brand-new institution joining the
// platform, with its first clinic admin. Patients and physiotherapists are always created
// by clinic staff — see features/patients (createPatient + invitations) and
// features/physiotherapists/staff.ts (createStaff).
export interface RegisterInstitutionInput {
  clinicName: string;
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}

export async function login(input: LoginInput) {
  const res = await api.post<{ userId: string; role: Role }>("/auth/login", input);
  return res.data;
}

export async function registerInstitution(input: RegisterInstitutionInput) {
  const res = await api.post<{ userId: string; role: Role }>("/auth/register-institution", input);
  return res.data;
}

export async function logout() {
  await api.post("/auth/logout");
}

export async function fetchCurrentUser() {
  const res = await api.get<CurrentUser>("/auth/me");
  return res.data;
}
