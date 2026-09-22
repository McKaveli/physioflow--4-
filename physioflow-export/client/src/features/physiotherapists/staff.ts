import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

interface CreateStaffInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  specialty?: string;
  clinicId: string;
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStaffInput) => {
      const res = await api.post("/physiotherapists/staff", input);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["clinics", variables.clinicId, "overview"] });
    },
  });
}
