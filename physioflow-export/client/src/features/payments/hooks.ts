import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
export type PaymentMethod = "MOBILE_MONEY" | "CARD" | "CASH";

export interface Payment {
  id: string;
  patientId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  providerRef: string | null;
  purpose: string | null;
  createdAt: string;
  patient?: { patientCode: string; user: { fullName: string; avatarUrl: string | null } };
  recordedBy?: { fullName: string } | null;
  appointment?: { startsAt: string; endsAt: string } | null;
}

async function fetchPayments(patientId?: string) {
  const res = await api.get<Payment[]>("/payments", { params: patientId ? { patientId } : {} });
  return res.data;
}

export function usePayments(patientId?: string) {
  return useQuery({ queryKey: ["payments", patientId], queryFn: () => fetchPayments(patientId) });
}

interface CreatePaymentInput {
  patientId: string;
  amount: number;
  method: PaymentMethod;
  appointmentId?: string;
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePaymentInput) => {
      const res = await api.post<Payment>("/payments", input);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payments"] }),
  });
}

export function useReconcilePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<Payment>(`/payments/${id}/reconcile`);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payments"] }),
  });
}
