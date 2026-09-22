import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

interface InvitationDetails {
  fullName: string;
  email: string;
  orgCode: string;
}

async function fetchInvitationDetails(token: string) {
  const res = await api.get<InvitationDetails>(`/patients/invitations/${token}`);
  return res.data;
}

export function useInvitationDetails(token: string | undefined) {
  return useQuery({
    queryKey: ["invitations", token],
    queryFn: () => fetchInvitationDetails(token as string),
    enabled: !!token,
    retry: false,
  });
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: async (input: { token: string; password: string }) => {
      const res = await api.post<{ userId: string; role: string }>("/patients/invitations/accept", input);
      return res.data;
    },
  });
}
