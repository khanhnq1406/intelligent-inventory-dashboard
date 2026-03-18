import { useMemo } from "react";
import { useDashboardSummary } from "@/hooks/use-dashboard-summary";

interface UseMakesResult {
  makes: string[];
  isLoading: boolean;
}

export function useMakes(): UseMakesResult {
  const { data, isLoading } = useDashboardSummary();

  const makes = useMemo(() => {
    if (!data?.by_make) return [];
    return data.by_make
      .map((m) => m.make)
      .filter((make) => make.length > 0)
      .sort();
  }, [data?.by_make]);

  return { makes, isLoading };
}
