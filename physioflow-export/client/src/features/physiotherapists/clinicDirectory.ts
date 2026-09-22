import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

export interface ClinicPhysio {
  id: string;
  specialty: string | null;
  user: { fullName: string };
}

async function fetchClinicPhysios() {
  const res = await api.get<ClinicPhysio[]>("/physiotherapists");
  return res.data;
}

export function useClinicPhysios() {
  return useQuery({ queryKey: ["physiotherapists", "clinic-directory"], queryFn: fetchClinicPhysios });
}
