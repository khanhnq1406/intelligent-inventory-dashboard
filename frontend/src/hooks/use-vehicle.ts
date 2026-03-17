import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { components } from "@/lib/api/types";

type Vehicle = components["schemas"]["Vehicle"];

export function useVehicle(id: string) {
  return useQuery({
    queryKey: ["vehicles", id],
    queryFn: () => apiFetch<Vehicle>(`/api/v1/vehicles/${id}`),
    enabled: !!id,
  });
}
