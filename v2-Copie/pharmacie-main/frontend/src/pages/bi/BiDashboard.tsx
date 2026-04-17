import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, ExternalLink, Presentation, ShieldCheck } from "lucide-react";
import { fetchAnalyticsKpis } from "@/api/analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AnalyticsKpiKey, AnalyticsKpiResponse, PowerBiTopic } from "@/types/analytics";

const reportEmbeds = [
  {
    topic: "stock" as PowerBiTopic,
    title: "Stock analysis",
    url: import.meta.env.VITE_POWERBI_STOCK_REPORT as string | undefined,
  },
  {
    topic: "consumption" as PowerBiTopic,
    title: "Product consumption",
    url: import.meta.env.VITE_POWERBI_CONSUMPTION_REPORT as string | undefined,
  },
  {
    topic: "distribution" as PowerBiTopic,
    title: "Distribution by district",
    url: import.meta.env.VITE_POWERBI_DISTRIBUTION_REPORT as string | undefined,
  },
  {
    topic: "movements" as PowerBiTopic,
    title: "Stock movements trends",
    url: import.meta.env.VITE_POWERBI_MOVEMENTS_REPORT as string | undefined,
  },
  {
    topic: "inventory" as PowerBiTopic,
    title: "Inventory discrepancies",
    url: import.meta.env.VITE_POWERBI_INVENTORY_REPORT as string | undefined,
  },
];

const PERIOD_OPTIONS: Array<7 | 30 | 90> = [7, 30, 90];

export default function BiDashboard() {
  const [kpiData, setKpiData] = useState<AnalyticsKpiResponse | null>(null);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(30);
  const availableEmbeds = useMemo(() => {
    if (!kpiData) return [];
    const allowedTopics = new Set(kpiData.powerbi_topics);
    return reportEmbeds.filter((report) => Boolean(report.url) && allowedTopics.has(report.topic));
  }, [kpiData]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoadingKpis(true);
        setKpiError(null);
        const data = await fetchAnalyticsKpis(selectedPeriod);
        if (active) setKpiData(data);
      } catch (err: any) {
        if (active) setKpiError(err?.response?.data?.message || "Unable to load analytics KPIs.");
      } finally {
        if (active) setLoadingKpis(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedPeriod]);

  const cards = useMemo(() => {
    if (!kpiData) return [];

    const cardMap: Record<AnalyticsKpiKey, { label: string; value: number | undefined }> = {
      total_products: { label: "Total products", value: kpiData.kpis.total_products },
      total_stock_qty: { label: "Total stock qty", value: kpiData.kpis.total_stock_qty },
      low_stock_products: {
        label: `Low stock (<= ${kpiData.kpis.low_stock_threshold})`,
        value: kpiData.kpis.low_stock_products,
      },
      distributions_30d: {
        label: `Distributions (${kpiData.period_days}d)`,
        value: kpiData.kpis.distributions_30d,
      },
      distributed_qty_30d: {
        label: `Distributed qty (${kpiData.period_days}d)`,
        value: kpiData.kpis.distributed_qty_30d,
      },
      prescriptions_30d: {
        label: `Prescriptions (${kpiData.period_days}d)`,
        value: kpiData.kpis.prescriptions_30d,
      },
      stock_movements_30d: {
        label: `Stock movements (${kpiData.period_days}d)`,
        value: kpiData.kpis.stock_movements_30d,
      },
    };

    return kpiData.kpi_keys.map((key) => cardMap[key]).filter((item) => item && item.value !== undefined);
  }, [kpiData]);

  const formatNumber = (value: number) => new Intl.NumberFormat().format(value);

  return (
    <div className="space-y-6">
      <Card className="border-white/70 bg-white/95 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <BarChart3 className="h-4 w-4" />
            BI & Analytics
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <CardTitle className="text-3xl">Power BI analytics entry point</CardTitle>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                Analytics in this platform are powered by Power BI dashboards built on the data warehouse.
                Operational modules stay separate from BI logic; this section only provides safe navigation and embedding.
              </p>
            </div>
            <div className="grid gap-3 rounded-3xl bg-muted/30 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-5 w-5 text-primary" />
                <p className="text-sm leading-6 text-muted-foreground">
                  Use public embed URLs or report links from environment variables only. No secrets are stored in the frontend.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Presentation className="mt-1 h-5 w-5 text-secondary" />
                <p className="text-sm leading-6 text-muted-foreground">
                  Open the reports catalog or preview configured dashboards directly below when embed links are available.
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild className="rounded-2xl">
            <Link to="/app/bi/reports">Browse BI reports</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-2xl">
            <a
              href={availableEmbeds[0]?.url || "#"}
              target="_blank"
              rel="noreferrer"
            >
              Open Power BI
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>

      {loadingKpis ? (
        <p className="text-sm text-muted-foreground">Loading KPI data...</p>
      ) : null}

      {kpiError ? <p className="text-sm text-destructive">{kpiError}</p> : null}

      <Card className="border-white/70 bg-white/95 shadow-sm">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted-foreground">KPI period</p>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((days) => (
              <Button
                key={days}
                type="button"
                size="sm"
                variant={selectedPeriod === days ? "default" : "outline"}
                onClick={() => setSelectedPeriod(days)}
                disabled={loadingKpis && selectedPeriod === days}
                className="rounded-xl"
              >
                {days} days
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {kpiData ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((item) => (
              <Card key={item.label} className="border-white/70 bg-white/95 shadow-sm">
                <CardContent className="space-y-1 p-5">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="text-2xl font-semibold">{formatNumber(item.value || 0)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {kpiData.top_products.length > 0 ? (
            <Card className="border-white/70 bg-white/95 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Top distributed products ({kpiData.period_days} days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full table-auto border-collapse text-sm">
                    <thead className="bg-muted/40">
                      <tr className="text-left">
                        <th className="px-3 py-2">Product ID</th>
                        <th className="px-3 py-2">Product</th>
                        <th className="px-3 py-2">Delivered qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpiData.top_products.map((item) => (
                        <tr key={`${item.product_id}-${item.product_lib}`} className="border-t">
                          <td className="px-3 py-2">{item.product_id ?? "-"}</td>
                          <td className="px-3 py-2">{item.product_lib || "Unknown product"}</td>
                          <td className="px-3 py-2">{formatNumber(item.delivered_qty)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Updated at {new Date(kpiData.generated_at).toLocaleString()}.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}

      {availableEmbeds.length === 0 && (
        <EmptyState
          title="No embedded dashboards configured"
          description="Add public Power BI report URLs in the frontend environment to preview dashboards directly on this page."
          className="bg-white"
        />
      )}

      {availableEmbeds.length > 0 && (
        <div className="space-y-6">
          {availableEmbeds.map((report) => (
            <Card key={report.title} className="border-white/70 bg-white/95 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">{report.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <iframe
                  title={report.title}
                  src={report.url}
                  width="100%"
                  height="720"
                  className="rounded-2xl border border-border"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
