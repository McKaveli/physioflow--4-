import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import * as authApi from "./api";
import { useAuthStore } from "../../lib/authStore";

export const CURRENT_USER_KEY = ["auth", "me"] as const;

export function useCurrentUser() {
  const setSession = useAuthStore((s) => s.setSession);
  const markResolved = useAuthStore((s) => s.markResolved);

  const query = useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: authApi.fetchCurrentUser,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.isSuccess && query.data) {
      setSession({
        userId: query.data.id,
        role: query.data.role,
        fullName: query.data.fullName,
        clinicId: query.data.clinicAdmin?.clinicId ?? query.data.manager?.clinicId ?? query.data.physiotherapist?.clinicId ?? query.data.patient?.clinicId ?? null,
      });
    } else if (query.isError) {
      setSession(null);
    }
  }, [query.isSuccess, query.isError, query.data, setSession]);

  useEffect(() => {
    if (query.isFetched) markResolved();
  }, [query.isFetched, markResolved]);

  return query;
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CURRENT_USER_KEY }),
  });
}

export function useRegisterInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.registerInstitution,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CURRENT_USER_KEY }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      setSession(null);
      queryClient.clear();
    },
  });
}
