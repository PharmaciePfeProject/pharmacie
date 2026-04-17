import { api } from "./axios";
import type { AnalyticsKpiResponse } from "@/types/analytics";

export async function fetchAnalyticsKpis(days?: 7 | 30 | 90) {
  const res = await api.get<AnalyticsKpiResponse>("/api/analytics/kpis", {
    params: days ? { days } : undefined,
  });
  return res.data;
}
