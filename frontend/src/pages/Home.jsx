import { Activity, ArrowLeftRight, ArrowRight, Boxes, CalendarDays, ChartColumnBig, ClipboardCheck, Package, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { PERMISSIONS, ROLES, hasPermission, hasRole } from "@/lib/roles";
import PowerBIEmbed from "@/components/PowerBIEmbed";

const workspaceCards = [
  {
    titleKey: "home.card.appointments.title",
    descriptionKey: "home.card.appointments.body",
    to: "/app/appointments",
    roles: [ROLES.SECRETAIRE_GENERAL, ROLES.ADMIN],
    functions: ["SECRETAIRE_GENERAL"],
    match: "any",
    icon: CalendarDays,
  },
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
  const { t, language } = useLanguage();
  const visibleCards = workspaceCards.filter((item) => {
    const checks = [];

    if (item.permission) {
      checks.push(hasPermission(user, item.permission));
    }

    if (item.roles) {
      checks.push(item.roles.some((role) => hasRole(user, role)));
    }

    if (item.functions) {
      const userFunction = String(user?.functionName || user?.function || "").trim().toUpperCase();
      const normalizedFunctions = item.functions.map((value) => String(value).trim().toUpperCase());
      checks.push(normalizedFunctions.includes(userFunction));
    }

    if (checks.length === 0) {
      return true;
    }

    return item.match === "any" ? checks.some(Boolean) : checks.every(Boolean);
  });
  const canSeeAnalytics = hasRole(user, ROLES.ADMIN) || hasRole(user, ROLES.RESPONSABLE_REPORTING);

  const kpiAreas = [
    {
      title: language === "fr" ? "KPIs Stock" : "Stock KPIs",
      body: language === "fr"
        ? "Disponibilité, ruptures, vitesse de consommation et valeur du stock."
        : "Availability, outages, consumption speed, and stock value.",
      to: "/app/bi/kpis",
    },
    {
      title: language === "fr" ? "KPIs Prescriptions" : "Prescription KPIs",
      body: language === "fr"
        ? "Prescriptions totales, par médecin, plus prescrits et quantités moyennes."
        : "Total prescriptions, by doctor, top medicines, and average quantities.",
      to: "/app/bi/kpis",
    },
    {
      title: language === "fr" ? "KPIs Distribution" : "Distribution KPIs",
      body: language === "fr"
        ? "Produits les plus distribués et volumes par jour, semaine et mois."
        : "Top distributed products and volumes by day, week, and month.",
      to: "/app/bi/kpis",
    },
    {
      title: language === "fr" ? "BI & Reporting" : "BI & Reporting",
      body: language === "fr"
        ? "Consommation mensuelle, évolution du stock et analyse des mouvements."
        : "Monthly consumption, stock evolution, and movement analysis.",
      to: "/app/bi",
    },
  ];

  return (
    <div className="space-y-6">
      {canSeeAnalytics && (
      <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_45%,#0f766e_100%)] text-white shadow-xl">
        <CardHeader className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
              <ChartColumnBig className="h-4 w-4" />
              {language === "fr" ? "Espace analytique" : "Analytics workspace"}
            </div>
            <div className="space-y-3">
              <CardTitle className="text-3xl text-white md:text-4xl">
                {language === "fr"
                  ? "Interface d’intégration des KPIs Power BI"
                  : "Power BI KPI integration interface"}
              </CardTitle>
              <CardDescription className="max-w-3xl text-white/80">
                {language === "fr"
                  ? "Cette zone sert à connecter vos tableaux de bord Power BI aux modules métier sans embarquer la logique analytique dans l’application."
                  : "This area connects your Power BI dashboards to the business modules without embedding analytics logic in the app."}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild className="rounded-2xl bg-white text-slate-900 hover:bg-slate-100">
                <Link to="/app/bi/kpis">
                  {language === "fr" ? "Configurer les KPIs" : "Configure KPIs"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl border-white/25 bg-white/10 text-white hover:bg-white/15">
                <Link to="/app/bi">
                  {language === "fr" ? "Voir BI" : "Open BI"}
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 rounded-3xl bg-white/10 p-5 backdrop-blur">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-sm">
              <p className="text-sm font-medium text-white">{language === "fr" ? "Utilisateur connecté" : "Signed in user"}</p>
              <p className="mt-1 text-sm text-white/75">
                {user?.firstname} {user?.lastname} ({user?.username})
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-sm">
              <p className="text-sm font-medium text-white">{language === "fr" ? "Accès analytics" : "Analytics access"}</p>
              <p className="mt-1 text-sm text-white/75">
                {canSeeAnalytics
                  ? (language === "fr" ? "Prêt pour les emplacements Power BI" : "Ready for Power BI slots")
                  : (language === "fr" ? "Accès limité" : "Restricted access")}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>
      )}

      {canSeeAnalytics && (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiAreas.map((area) => (
          <Card key={area.title} className="border-slate-200/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{area.title}</CardTitle>
              <CardDescription>{area.body}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full justify-between rounded-xl">
                <Link to={area.to}>
                  {language === "fr" ? "Ouvrir" : "Open"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-slate-200/80 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>{language === "fr" ? "Modules opérationnels" : "Operational modules"}</CardTitle>
            <CardDescription>
              {language === "fr"
                ? "Les écrans métier restent disponibles pour préparer et vérifier les données qui alimenteront Power BI."
                : "Operational screens remain available to prepare and validate the data that will feed Power BI."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {visibleCards.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.titleKey} to={item.to} className="group rounded-2xl border bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{t(item.titleKey)}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{t(item.descriptionKey)}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>{language === "fr" ? "Guide d’intégration" : "Integration guide"}</CardTitle>
            <CardDescription>
              {language === "fr"
                ? "Préparez la page avant de coller les rapports Power BI."
                : "Prepare the page before embedding your Power BI reports."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              language === "fr" ? "Publier les rapports dans Power BI" : "Publish the reports in Power BI",
              language === "fr" ? "Copier les URLs d’embed dans .env" : "Copy embed URLs into .env",
              language === "fr" ? "Brancher les iframes dans la page KPI" : "Plug iframes into the KPI page",
              language === "fr" ? "Garder la couche métier séparée de la BI" : "Keep the business layer separate from BI",
            ].map((label, index) => (
              <div key={label} className="rounded-2xl border bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{index + 1}. {label}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {canSeeAnalytics && (
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {language === "fr" ? "Rapports Power BI" : "Power BI Reports"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {language === "fr"
                ? "Les rapports Power BI s'affichent directement ci-dessous."
                : "Power BI reports are embedded directly below."}
            </p>
          </div>
          
          <div className="grid gap-6 lg:grid-cols-1">
            <PowerBIEmbed 
              title={language === "fr" ? "Stock" : "Stock"}
              url={import.meta.env.VITE_POWERBI_STOCK_REPORT}
              height="700px"
            />
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
            <p className="text-sm text-blue-900">
              {language === "fr"
                ? "📌 Astuce : Accédez à tous les rapports Power BI dans la section "
                : "📌 Tip: Access all Power BI reports in the "}
              <Link to="/app/bi" className="font-semibold underline hover:no-underline">
                {language === "fr" ? "Analyse BI" : "BI Analytics"}
              </Link>
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
