import {
  Activity,
  ArrowLeftRight,
  ArrowRight,
  Boxes,
  ChartColumnBig,
  ClipboardCheck,
  Package,
  Truck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PERMISSIONS, hasPermission, type PermissionKey } from "@/lib/roles";

type WorkspaceCard = {
  title: string;
  description: string;
  to: string;
  permission: PermissionKey;
  icon: typeof Package;
};

const workspaceCards: WorkspaceCard[] = [
  {
    title: "Products",
    description: "Review master data, references, pricing, and product thresholds.",
    to: "/app/products",
    permission: PERMISSIONS.PRODUCTS_READ,
    icon: Package,
  },
  {
    title: "Stock",
    description: "Browse stock quantities and stock by lot without mixing them into product master data.",
    to: "/app/stock",
    permission: PERMISSIONS.STOCK_READ,
    icon: Boxes,
  },
  {
    title: "Movements",
    description: "Inspect stock movement headers and line details for traceability and control.",
    to: "/app/stock-movements",
    permission: PERMISSIONS.MOVEMENTS_READ,
    icon: ArrowLeftRight,
  },
  {
    title: "Distributions",
    description: "Follow medicine distribution activity, quantities delivered, and missing quantities.",
    to: "/app/distributions",
    permission: PERMISSIONS.DISTRIBUTIONS_READ,
    icon: Activity,
  },
  {
    title: "Inventories",
    description: "Compare counted quantities against system values and review inventory sessions.",
    to: "/app/inventories",
    permission: PERMISSIONS.INVENTORIES_READ,
    icon: ClipboardCheck,
  },
  {
    title: "Supply flow",
    description: "Open orders, receptions, and internal deliveries from the shared supply workflow.",
    to: "/app/receptions",
    permission: PERMISSIONS.SUPPLY_READ,
    icon: Truck,
  },
];

export default function Home() {
  const { user } = useAuth();
  const visibleCards = workspaceCards.filter((item) => hasPermission(user, item.permission));
  const canSeeAnalytics = hasPermission(user, PERMISSIONS.ANALYTICS_READ);

  return (
    <div className="space-y-6">
      <Card className="rounded-xl border bg-white shadow-sm">
        <CardHeader className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-3">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Activity className="h-4 w-4" />
              Operational workspace
            </div>
            <CardTitle className="text-3xl">Pharmacy operations home</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Use this dashboard as the entry point for daily pharmacy work. It keeps operational modules, access control,
              and BI navigation in one place without inventing analytics that are already handled in Power BI.
            </CardDescription>
          </div>

          <div className="grid gap-3 rounded-3xl bg-muted/30 p-5">
            <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm">
              <p className="text-sm font-medium">Authenticated user</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {user?.firstname} {user?.lastname} ({user?.username})
              </p>
            </div>
            <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm">
              <p className="text-sm font-medium">Visible modules</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {visibleCards.length} operational area{visibleCards.length === 1 ? "" : "s"} available from your current permissions.
              </p>
            </div>
            {canSeeAnalytics && (
              <Button asChild className="rounded-2xl">
                <Link to="/app/bi">
                  Open BI & Analytics
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {visibleCards.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.title} className="rounded-xl border bg-white shadow-sm">
              <CardHeader className="space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                  <CardDescription className="text-sm leading-6">{item.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full justify-between rounded-xl">
                  <Link to={item.to}>
                    Open module
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-xl border bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Operational reminders</CardTitle>
            <CardDescription>
              Use the current modules as the source of truth for day-to-day activity and traceability.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {[
              ["Products remain master data only", "Stock, lots, locations, and movements stay outside the product dimension."],
              ["List pages are paginated", "Use filters and page size controls to keep large Oracle datasets manageable."],
              ["RBAC is active", "Sidebar visibility, route access, and sensitive actions follow the permission model."],
              ["BI stays separate", "Analytics are accessed from Power BI dashboards rather than being recomputed in the frontend."],
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
            <CardTitle>BI & Analytics</CardTitle>
            <CardDescription>
              Open the Power BI catalog or embedded dashboards when report URLs are configured.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-primary/5 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                  <ChartColumnBig className="h-5 w-5" />
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  BI is presentation-ready even when only external report links are configured. The application keeps this section
                  focused on secure navigation and optional embedding.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {canSeeAnalytics ? (
                <>
                  <Button asChild className="rounded-xl">
                    <Link to="/app/bi">Open BI landing page</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link to="/app/bi/reports">Browse BI reports</Link>
                  </Button>
                </>
              ) : (
                <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  Your current role does not include analytics access.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
