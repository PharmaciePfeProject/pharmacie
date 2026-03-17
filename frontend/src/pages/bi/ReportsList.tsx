import { BarChart3, ExternalLink, PackageSearch, PillBottle, Route, TriangleAlert, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ReportItem = {
  id: string;
  title: string;
  description: string;
  icon: typeof BarChart3;
  url?: string;
};

const reports: ReportItem[] = [
  {
    id: "stock",
    title: "Stock analysis",
    description: "Monitor stock levels, location balance, and availability trends in Power BI.",
    icon: Warehouse,
    url: import.meta.env.VITE_POWERBI_STOCK_REPORT,
  },
  {
    id: "consumption",
    title: "Product consumption",
    description: "Review product usage and distribution-driven consumption patterns.",
    icon: PillBottle,
    url: import.meta.env.VITE_POWERBI_CONSUMPTION_REPORT,
  },
  {
    id: "distribution",
    title: "Distribution by district",
    description: "Track operational distributions across districts and business zones.",
    icon: Route,
    url: import.meta.env.VITE_POWERBI_DISTRIBUTION_REPORT,
  },
  {
    id: "movements",
    title: "Stock movements trends",
    description: "Explore inbound and outbound movement history through BI dashboards.",
    icon: PackageSearch,
    url: import.meta.env.VITE_POWERBI_MOVEMENTS_REPORT,
  },
  {
    id: "inventory",
    title: "Inventory discrepancies",
    description: "Inspect count discrepancies between inventoried and system quantities.",
    icon: TriangleAlert,
    url: import.meta.env.VITE_POWERBI_INVENTORY_REPORT,
  },
];

export default function ReportsList() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon;
          const hasUrl = Boolean(report.url);

          return (
            <Card key={report.id} className="border-white/70 bg-white/95 shadow-sm">
              <CardHeader className="space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">{report.title}</CardTitle>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{report.description}</p>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {hasUrl ? "Available" : "Pending URL"}
                </span>
                <Button asChild variant={hasUrl ? "default" : "outline"} className="rounded-2xl" disabled={!hasUrl}>
                  <a href={hasUrl ? report.url : "#"} target="_blank" rel="noreferrer">
                    Open report
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
