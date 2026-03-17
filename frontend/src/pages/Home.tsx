import {
  Activity,
  ArrowLeftRight,
  ArrowRight,
  Boxes,
  ChartColumnBig,
  TriangleAlert,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const overviewCards = [
  {
    label: "Low stock products",
    value: "42",
    change: "Prioritize replenishment for products approaching warning stock.",
    icon: TriangleAlert,
    tone: "bg-amber-100 text-amber-700",
  },
  {
    label: "Recent stock movements",
    value: "128",
    change: "Monitor recent inbound, outbound, and internal stock activity.",
    icon: ArrowLeftRight,
    tone: "bg-sky-100 text-sky-700",
  },
  {
    label: "Recent distributions",
    value: "64",
    change: "Review district distributions and completion of line quantities.",
    icon: Activity,
    tone: "bg-emerald-100 text-emerald-700",
  },
  {
    label: "Recent receptions",
    value: "18",
    change: "Confirm supplier receptions, invoices, and validated deliveries.",
    icon: Boxes,
    tone: "bg-violet-100 text-violet-700",
  },
];

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {overviewCards.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.label} className="rounded-xl border bg-white shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div>
                  <CardDescription>{item.label}</CardDescription>
                  <CardTitle className="mt-2 text-3xl">{item.value}</CardTitle>
                </div>
                <div className={`rounded-2xl p-3 ${item.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.change}</p>
              </CardContent>
            </Card>
          );
        })}

        <Card className="rounded-xl border bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Quick access to BI</CardTitle>
            <CardDescription>
              Open Power BI dashboards for stock, consumption, and inventory analytics.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-primary/5 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                  <ChartColumnBig className="h-5 w-5" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Operational analytics stay in Power BI while this platform provides secure access and navigation.
                </p>
              </div>
            </div>
            <Button asChild className="w-full rounded-xl">
              <Link to="/app/bi">
                Open Analytics / BI
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-xl border bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Operational focus</CardTitle>
            <CardDescription>
              Review the core areas that drive daily pharmacy operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {[
              ["Stock alerts", "Review products under warning and safety thresholds."],
              ["Movement history", "Track recent stock movement headers and line activity."],
              ["District distribution", "Monitor latest distributions and missing quantities."],
              ["Reception control", "Validate receptions, invoices, and supplier deliveries."],
            ].map(([title, description]) => (
              <div key={title} className="rounded-xl border bg-muted/30 p-5">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-xl border bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
            <CardDescription>
              Jump directly into the most used operational modules.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {[
              ["/app/products", "Products"],
              ["/app/stock", "Stock"],
              ["/app/stock-movements", "Stock movements"],
              ["/app/distributions", "Distributions"],
              ["/app/receptions", "Receptions"],
            ].map(([to, label]) => (
              <Button key={to} asChild variant="outline" className="justify-between rounded-xl">
                <Link to={to}>
                  {label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
