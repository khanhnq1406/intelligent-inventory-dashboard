import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { components, operations } from "@/lib/api/types";

type RecentAction = components["schemas"]["RecentAction"];
type RecentActionsParams = operations["listRecentActions"]["parameters"]["query"];

export function useRecentActions(params?: RecentActionsParams) {
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
    queryKey: ["recent-actions", params ?? {}],
    queryFn: () =>
      apiFetch<RecentAction[]>(`/api/v1/actions/recent${query ? `?${query}` : ""}`),
  });
}
