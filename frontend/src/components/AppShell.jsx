import { useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Archive, ArrowLeftRight, Boxes, ChartColumnBig, ChevronLeft, ChevronRight, ClipboardCheck, ClipboardList, Command, LayoutDashboard, LogOut, Package, Shield, ShoppingCart, Stethoscope, Truck, Users, } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { PERMISSIONS, hasPermission, hasRole, } from "@/lib/roles";
import { cn } from "@/lib/utils";
const navSections = [
    {
        titleKey: "nav.overview",
        items: [
            {
                labelKey: "nav.dashboard",
                to: "/app/dashboard",
                icon: LayoutDashboard,
            },
            {
                labelKey: "nav.profile",
                to: "/app/profile",
                icon: Users,
            },
        ],
    },
    {
        titleKey: "nav.operations",
        items: [
            {
                labelKey: "nav.products",
                to: "/app/products",
                icon: Package,
                permissions: [PERMISSIONS.PRODUCTS_READ],
            },
            {
                labelKey: "nav.stock",
                to: "/app/stock",
                icon: Archive,
                permissions: [PERMISSIONS.STOCK_READ],
            },
            {
                labelKey: "nav.movements",
                to: "/app/stock-movements",
                icon: ArrowLeftRight,
                permissions: [PERMISSIONS.MOVEMENTS_READ],
            },
        ],
    },
    {
        titleKey: "nav.doctors",
        items: [
            {
                labelKey: "nav.prescriptions",
                to: "/app/doctors/prescriptions",
                icon: ClipboardList,
                permissions: [PERMISSIONS.PRESCRIPTIONS_READ],
            },
            {
                labelKey: "nav.distributions",
                to: "/app/distributions",
                icon: Stethoscope,
                permissions: [PERMISSIONS.DISTRIBUTIONS_READ],
            },
        ],
    },
    {
        titleKey: "nav.supply",
        items: [
            {
                labelKey: "nav.externalOrders",
                to: "/app/external-orders",
                icon: ShoppingCart,
                permissions: [PERMISSIONS.SUPPLY_READ],
            },
            {
                labelKey: "nav.internalOrders",
                to: "/app/internal-orders",
                icon: ClipboardList,
                permissions: [PERMISSIONS.SUPPLY_READ],
            },
            {
                labelKey: "nav.receptions",
                to: "/app/receptions",
                icon: Boxes,
                permissions: [PERMISSIONS.SUPPLY_READ],
            },
            {
                labelKey: "nav.internalDeliveries",
                to: "/app/internal-deliveries",
                icon: Truck,
                permissions: [PERMISSIONS.SUPPLY_READ],
            },
        ],
    },
    {
        titleKey: "nav.control",
        items: [
            {
                labelKey: "nav.inventories",
                to: "/app/inventories",
                icon: ClipboardCheck,
                permissions: [PERMISSIONS.INVENTORIES_READ],
            },
        ],
    },
    {
        titleKey: "nav.analytics",
        items: [
            {
                labelKey: "nav.biAnalytics",
                to: "/app/bi",
                icon: ChartColumnBig,
                permissions: [PERMISSIONS.ANALYTICS_READ],
            },
        ],
    },
    {
        titleKey: "nav.administration",
        items: [
            {
                labelKey: "nav.adminHome",
                to: "/app/admin",
                icon: Users,
                permissions: [PERMISSIONS.USERS_MANAGE, PERMISSIONS.ADMIN_ACCESS],
            },
            {
                labelKey: "nav.usersManagement",
                to: "/app/admin/users",
                icon: Users,
                permissions: [PERMISSIONS.USERS_MANAGE, PERMISSIONS.ADMIN_ACCESS],
            },
            {
                labelKey: "auth.createAccount",
                to: "/app/admin/user-registration",
                icon: Users,
                permissions: [PERMISSIONS.USERS_MANAGE, PERMISSIONS.ADMIN_ACCESS],
            },
            {
                labelKey: "nav.medicines",
                to: "/app/admin/medicines",
                icon: Package,
                permissions: [PERMISSIONS.PRODUCTS_MANAGE],
            },
            {
                labelKey: "nav.security",
                to: "/app/admin/security",
                icon: Shield,
                permissions: [PERMISSIONS.USERS_MANAGE, PERMISSIONS.ADMIN_ACCESS],
            },
        ],
    },
];
const pageMeta = {
    "/app/dashboard": {
        titleKey: "page.dashboard.title",
        subtitleKey: "page.dashboard.subtitle",
    },
    "/app/profile": {
        titleKey: "page.profile.title",
        subtitleKey: "page.profile.subtitle",
    },
    "/app/admin": {
        titleKey: "page.admin.title",
        subtitleKey: "page.admin.subtitle",
    },
    "/app/admin/security": {
        titleKey: "page.adminSecurity.title",
        subtitleKey: "page.adminSecurity.subtitle",
    },
    "/app/admin/users": {
        titleKey: "page.adminUsers.title",
        subtitleKey: "page.adminUsers.subtitle",
    },
    "/app/admin/user-registration": {
        titleKey: "auth.createAccount",
    },
    "/app/admin/medicines": {
        titleKey: "page.adminMedicines.title",
        subtitleKey: "page.adminMedicines.subtitle",
    },
    "/app/products": {
        titleKey: "page.products.title",
        subtitleKey: "page.products.subtitle",
    },
    "/app/stock": {
        titleKey: "page.stock.title",
        subtitleKey: "page.stock.subtitle",
    },
    "/app/stock-movements": {
        titleKey: "page.movements.title",
        subtitleKey: "page.movements.subtitle",
    },
    "/app/distributions": {
        titleKey: "page.distributions.title",
        subtitleKey: "page.distributions.subtitle",
    },
    "/app/inventories": {
        titleKey: "page.inventories.title",
        subtitleKey: "page.inventories.subtitle",
    },
    "/app/external-orders": {
        titleKey: "page.externalOrders.title",
        subtitleKey: "page.externalOrders.subtitle",
    },
    "/app/internal-orders": {
        titleKey: "page.internalOrders.title",
        subtitleKey: "page.internalOrders.subtitle",
    },
    "/app/receptions": {
        titleKey: "page.receptions.title",
        subtitleKey: "page.receptions.subtitle",
    },
    "/app/internal-deliveries": {
        titleKey: "page.internalDeliveries.title",
        subtitleKey: "page.internalDeliveries.subtitle",
    },
    "/app/bi": {
        titleKey: "page.bi.title",
        subtitleKey: "page.bi.subtitle",
    },
    "/app/bi/reports": {
        titleKey: "page.biReports.title",
        subtitleKey: "page.biReports.subtitle",
    },
    "/app/doctors/prescriptions": {
        titleKey: "page.prescriptions.title",
        subtitleKey: "page.prescriptions.subtitle",
    },
    "/app/ordonnances": {
        titleKey: "page.prescriptions.title",
        subtitleKey: "page.prescriptions.subtitle",
    },
    "/app/orders": {
        titleKey: "page.orders.title",
        subtitleKey: "page.orders.subtitle",
    },
    "/app/reporting": {
        titleKey: "page.reporting.title",
        subtitleKey: "page.reporting.subtitle",
    },
};
export default function AppShell() {
    const { user, logout } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const initials = useMemo(() => {
        const first = user?.firstname?.[0] ?? "";
        const last = user?.lastname?.[0] ?? "";
        return (first + last).toUpperCase() || "U";
    }, [user?.firstname, user?.lastname]);
    const visibleSections = navSections
        .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
            const allowedByPermission = !item.permissions ||
                item.permissions.some((permission) => hasPermission(user, permission));
            const allowedByRole = !item.roles || item.roles.some((role) => hasRole(user, role));
            return allowedByPermission && allowedByRole;
        }),
    }))
        .filter((section) => section.items.length > 0);
    const currentPage = pageMeta[location.pathname];
    const pageTitle = currentPage ? t(currentPage.titleKey) : t("nav.workspace");
    const pageSubtitle = currentPage?.subtitleKey
        ? t(currentPage.subtitleKey)
        : t("nav.workspaceSubtitle");
    return (<div className="h-screen overflow-hidden bg-[linear-gradient(180deg,#f9fcfd_0%,#f2f6f8_100%)] text-foreground">
      <div className="flex h-full overflow-hidden">
        <aside className={cn("h-full flex-shrink-0 overflow-y-auto border-r border-border/70 bg-white/90 px-4 py-5 shadow-sm backdrop-blur transition-all duration-300", collapsed ? "w-[92px]" : "w-[280px]")}>
          <div className="flex items-center justify-between gap-3 pb-5">
            <Link to="/app/dashboard" className="flex min-w-0 items-center gap-3">
              <img src="/transtu-logo.jpg" alt="TRANSTU" className="h-11 w-11 rounded-2xl object-contain ring-1 ring-border"/>
              {!collapsed && (<div className="min-w-0">
                  <p className="truncate text-xs font-medium uppercase tracking-[0.28em] text-primary">
                    TRANSTU
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {t("nav.pharmacyPlatform")}
                  </p>
                </div>)}
            </Link>

            <Button variant="ghost" size="icon" onClick={() => setCollapsed((s) => !s)}>
              {collapsed ? (<ChevronRight className="h-4 w-4"/>) : (<ChevronLeft className="h-4 w-4"/>)}
            </Button>
          </div>

          <div className="rounded-3xl border border-primary/10 bg-primary/5 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary font-semibold text-primary-foreground">
                {initials}
              </div>
              {!collapsed && (<div className="min-w-0">
                  <p className="truncate font-semibold">
                    {user?.firstname} {user?.lastname}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {user?.function || t("nav.workspaceUser")}
                  </p>
                </div>)}
            </div>
          </div>

          <nav className="mt-6 space-y-6">
            {visibleSections.map((section) => (<div key={section.titleKey}>
                {!collapsed && (<p className="mb-2 px-3 text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
                    {t(section.titleKey)}
                  </p>)}
                <div className="space-y-1">
                  {section.items.map((item) => {
                const Icon = item.icon;
                return (<NavLink key={item.labelKey} to={item.to} className={({ isActive }) => cn("group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all", isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                        <Icon className="h-5 w-5 shrink-0"/>
                        {!collapsed && <span>{t(item.labelKey)}</span>}
                      </NavLink>);
            })}
                </div>
              </div>))}
          </nav>

          <div className="mt-6 rounded-3xl border border-border bg-muted/40 p-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Command className="h-4 w-4 text-secondary"/>
              {!collapsed && <span>{t("nav.quickSearch")}</span>}
            </div>
          </div>

          <div className="mt-6">
            <Button variant="outline" className="w-full justify-start gap-3 rounded-2xl" onClick={logout}>
              <LogOut className="h-4 w-4"/>
              {!collapsed && <span>{t("nav.logout")}</span>}
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex-shrink-0 border-b border-border/70 bg-white/88 px-6 py-4 backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-1 text-sm text-muted-foreground">
                  {t("nav.home")} /{" "}
                  <span className="text-foreground">{pageTitle}</span>
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {pageTitle}
                </h1>
                {pageSubtitle && (<p className="mt-1 text-sm text-muted-foreground">
                    {pageSubtitle}
                  </p>)}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-2 py-2">
                  <span className="px-2 text-sm text-muted-foreground">
                    {t("language.switch")}
                  </span>
                  <Button type="button" size="sm" variant={language === "en" ? "default" : "ghost"} className="rounded-xl px-3" onClick={() => setLanguage("en")}>
                    EN
                  </Button>
                  <Button type="button" size="sm" variant={language === "fr" ? "default" : "ghost"} className="rounded-xl px-3" onClick={() => setLanguage("fr")}>
                    FR
                  </Button>
                </div>
                <div className="hidden rounded-2xl border border-border bg-background px-4 py-2 text-sm text-muted-foreground lg:block">
                  {t("nav.secureSession")}: {user?.email}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>);
}
