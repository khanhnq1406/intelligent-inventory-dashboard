import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { components, operations } from "@/lib/api/types";

type PaginatedVehicles = components["schemas"]["PaginatedVehicles"];
type VehicleParams = operations["listVehicles"]["parameters"]["query"];

export function useVehicles(params?: VehicleParams) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        searchParams.set(key, String(value));
      }
    });
  }
  const query = searchParams.toString();

  return useQuery({
    queryKey: ["vehicles", params ?? {}],
    queryFn: () =>
      apiFetch<PaginatedVehicles>(`/api/v1/vehicles${query ? `?${query}` : ""}`),
  });
}
