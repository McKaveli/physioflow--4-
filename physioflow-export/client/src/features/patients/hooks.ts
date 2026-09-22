import { useQuery } from "@tanstack/react-query";
import * as api from "./api";

export function usePatientDashboard() {
  return useQuery({ queryKey: ["patients", "me", "dashboard"], queryFn: api.fetchPatientDashboard });
}

export function useMyProgress() {
  return useQuery({ queryKey: ["patients", "me", "progress"], queryFn: api.fetchMyProgress });
}
