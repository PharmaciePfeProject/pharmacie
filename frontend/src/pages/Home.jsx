import { Activity, ArrowLeftRight, ArrowRight, Boxes, ChartColumnBig, CheckCircle2, ClipboardCheck, Package, ShieldCheck, Truck, } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { PERMISSIONS, hasPermission } from "@/lib/roles";
const workspaceCards = [
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
    const quickStartSteps = [
      { label: t("home.quickStep.oneLabel"), text: t("home.quickStep.one") },
      { label: t("home.quickStep.twoLabel"), text: t("home.quickStep.two") },
      { label: t("home.quickStep.threeLabel"), text: t("home.quickStep.three") },
    ];
    return (<div className="space-y-6">
      <Card className="rounded-xl border bg-white shadow-sm">
        <CardHeader className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-3">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Activity className="h-4 w-4"/>
              {t("home.badge")}
            </div>
            <CardTitle className="text-3xl">{t("home.title")}</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              {t("home.subtitle")}
            </CardDescription>
            <div className="flex flex-wrap gap-3 pt-2">
              {canSeeAnalytics ? (<Button asChild className="rounded-2xl">
                  <Link to="/app/bi">
                    {t("home.openBi")}
                    <ArrowRight className="ml-2 h-4 w-4"/>
                  </Link>
                </Button>) : null}
              <Button asChild variant="outline" className="rounded-2xl">
                <Link to={visibleCards[0]?.to || "/app/profile"}>
                  {t("home.openModule")}
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 rounded-3xl bg-muted/30 p-5">
            <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm">
              <p className="text-sm font-medium">{t("home.authenticatedUser")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {user?.firstname} {user?.lastname} ({user?.username})
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{t("home.userHint")}</p>
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
            {canSeeAnalytics && (<Button asChild className="rounded-2xl">
                <Link to="/app/bi">
                  {t("home.openBi")}
                  <ArrowRight className="ml-2 h-4 w-4"/>
                </Link>
              </Button>)}
          </div>
        </CardHeader>
      </Card>

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">{t("home.quickTitle")}</CardTitle>
          <CardDescription>{t("home.quickSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {quickStartSteps.map((step, index) => {
            const StepIcon = index === 0 ? CheckCircle2 : index === 1 ? ShieldCheck : Activity;
            return (<div key={step.label} className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <StepIcon className="h-4 w-4"/>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{step.label}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.text}</p>
                  </div>
                </div>
              </div>);
          })}
        </CardContent>
      </Card>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {visibleCards.map((item) => {
            const Icon = item.icon;
            return (<Card key={item.titleKey} className="rounded-xl border bg-white shadow-sm">
              <CardHeader className="space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5"/>
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
                    <ArrowRight className="h-4 w-4"/>
                  </Link>
                </Button>
              </CardContent>
            </Card>);
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
        ].map(([titleKey, descriptionKey]) => (<div key={titleKey} className="rounded-xl border bg-muted/30 p-5">
                <h3 className="font-semibold">{t(titleKey)}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(descriptionKey)}</p>
              </div>))}
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
                  <ChartColumnBig className="h-5 w-5"/>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {t("home.bi.body")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {canSeeAnalytics ? (<>
                  <Button asChild className="rounded-xl">
                    <Link to="/app/bi">{t("home.bi.openLanding")}</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link to="/app/bi/reports">{t("home.bi.openReports")}</Link>
                  </Button>
                </>) : (<div className="rounded-xl border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  {t("home.bi.noAccess")}
                </div>)}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>);
}
