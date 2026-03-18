import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { components } from "@/lib/api/types";

type Dealership = components["schemas"]["Dealership"];

export function useDealerships() {
  return useQuery({
    queryKey: ["dealerships"],
    queryFn: () => apiFetch<Dealership[]>("/api/v1/dealerships"),
    staleTime: 5 * 60 * 1000, // 5 minutes — dealerships rarely change
  });
}
