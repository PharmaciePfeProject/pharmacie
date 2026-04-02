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
import { useLanguage } from "@/i18n/LanguageContext";
import { PERMISSIONS, hasPermission, type PermissionKey } from "@/lib/roles";

type WorkspaceCard = {
  titleKey: string;
  descriptionKey: string;
  to: string;
  permission: PermissionKey;
  icon: typeof Package;
};

const workspaceCards: WorkspaceCard[] = [
  {
    titleKey: "home.card.products.title",
    descriptionKey: "home.card.products.body",
    to: "/app/products",
    permission: PERMISSIONS.PRODUCTS_READ,
    icon: Package,
  },
  {
    titleKey: "home.card.stock.title",
    descriptionKey: "home.card.stock.body",
    to: "/app/stock",
    permission: PERMISSIONS.STOCK_READ,
    icon: Boxes,
  },
  {
    titleKey: "home.card.movements.title",
    descriptionKey: "home.card.movements.body",
    to: "/app/stock-movements",
    permission: PERMISSIONS.MOVEMENTS_READ,
    icon: ArrowLeftRight,
  },
  {
    titleKey: "home.card.distributions.title",
    descriptionKey: "home.card.distributions.body",
    to: "/app/distributions",
    permission: PERMISSIONS.DISTRIBUTIONS_READ,
    icon: Activity,
  },
  {
    titleKey: "home.card.inventories.title",
    descriptionKey: "home.card.inventories.body",
    to: "/app/inventories",
    permission: PERMISSIONS.INVENTORIES_READ,
    icon: ClipboardCheck,
  },
  {
    titleKey: "home.card.supply.title",
    descriptionKey: "home.card.supply.body",
    to: "/app/receptions",
    permission: PERMISSIONS.SUPPLY_READ,
    icon: Truck,
  },
];

export default function Home() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const visibleCards = workspaceCards.filter((item) => hasPermission(user, item.permission));
  const canSeeAnalytics = hasPermission(user, PERMISSIONS.ANALYTICS_READ);

  return (
    <div className="space-y-6">
      <Card className="rounded-xl border bg-white shadow-sm">
        <CardHeader className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-3">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Activity className="h-4 w-4" />
              {t("home.badge")}
            </div>
            <CardTitle className="text-3xl">{t("home.title")}</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              {t("home.subtitle")}
            </CardDescription>
          </div>

          <div className="grid gap-3 rounded-3xl bg-muted/30 p-5">
            <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm">
              <p className="text-sm font-medium">{t("home.authenticatedUser")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {user?.firstname} {user?.lastname} ({user?.username})
              </p>
            </div>
            <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm">
              <p className="text-sm font-medium">{t("home.visibleModules")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {visibleCards.length}{" "}
                {visibleCards.length === 1
                  ? t("home.visibleModules.single")
                  : t("home.visibleModules.multi")}
              </p>
            </div>
            {canSeeAnalytics && (
              <Button asChild className="rounded-2xl">
                <Link to="/app/bi">
                  {t("home.openBi")}
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
            <Card key={item.titleKey} className="rounded-xl border bg-white shadow-sm">
              <CardHeader className="space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-xl">{t(item.titleKey)}</CardTitle>
                  <CardDescription className="text-sm leading-6">{t(item.descriptionKey)}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full justify-between rounded-xl">
                  <Link to={item.to}>
                    {t("home.openModule")}
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
            <CardTitle>{t("home.reminders.title")}</CardTitle>
            <CardDescription>
              {t("home.reminders.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {[
              ["home.reminder.one.title", "home.reminder.one.body"],
              ["home.reminder.two.title", "home.reminder.two.body"],
              ["home.reminder.three.title", "home.reminder.three.body"],
              ["home.reminder.four.title", "home.reminder.four.body"],
            ].map(([titleKey, descriptionKey]) => (
              <div key={titleKey} className="rounded-xl border bg-muted/30 p-5">
                <h3 className="font-semibold">{t(titleKey)}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(descriptionKey)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-xl border bg-white shadow-sm">
          <CardHeader>
            <CardTitle>{t("home.bi.title")}</CardTitle>
            <CardDescription>
              {t("home.bi.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-primary/5 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                  <ChartColumnBig className="h-5 w-5" />
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {t("home.bi.body")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {canSeeAnalytics ? (
                <>
                  <Button asChild className="rounded-xl">
                    <Link to="/app/bi">{t("home.bi.openLanding")}</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link to="/app/bi/reports">{t("home.bi.openReports")}</Link>
                  </Button>
                </>
              ) : (
                <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  {t("home.bi.noAccess")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
