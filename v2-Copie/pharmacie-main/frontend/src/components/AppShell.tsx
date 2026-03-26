import { useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Archive,
  ArrowLeftRight,
  Boxes,
  ChartColumnBig,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Command,
  LayoutDashboard,
  LogOut,
  Package,
  Shield,
  ShoppingCart,
  Stethoscope,
  Truck,
  Users,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { PERMISSIONS, ROLES, hasPermission, hasRole, type PermissionKey, type RoleKey } from "@/lib/roles";
import { cn } from "@/lib/utils";
type NavItem = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions?: PermissionKey[];
  roles?: RoleKey[];
};

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", to: "/app/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Operations",
    items: [
      { label: "Products", to: "/app/products", icon: Package, permissions: [PERMISSIONS.PRODUCTS_READ] },
      { label: "Stock", to: "/app/stock", icon: Archive, permissions: [PERMISSIONS.STOCK_READ] },
      { label: "Stock lots", to: "/app/stock-lots", icon: Archive, permissions: [PERMISSIONS.STOCKLOTS_READ] },
      { label: "Movements", to: "/app/stock-movements", icon: ArrowLeftRight, permissions: [PERMISSIONS.MOVEMENTS_READ] },
    ],
  },
  {
    title: "Distribution",
    items: [
      { label: "Distributions", to: "/app/distributions", icon: Stethoscope, permissions: [PERMISSIONS.DISTRIBUTIONS_READ] },
      { label: "Internal deliveries", to: "/app/internal-deliveries", icon: Truck, permissions: [PERMISSIONS.SUPPLY_READ] },
    ],
  },
  {
    title: "Doctors",
    items: [
      {
        label: "Prescriptions",
        to: "/app/doctors/prescriptions",
        icon: ClipboardList,
        permissions: [PERMISSIONS.DISTRIBUTIONS_READ],
        roles: [ROLES.MEDECIN, ROLES.ADMIN],
      },
    ],
  },
  {
    title: "Supply",
    items: [
      { label: "External orders", to: "/app/external-orders", icon: ShoppingCart, permissions: [PERMISSIONS.SUPPLY_READ] },
      { label: "Internal orders", to: "/app/internal-orders", icon: ClipboardList, permissions: [PERMISSIONS.SUPPLY_READ] },
      { label: "Receptions", to: "/app/receptions", icon: Boxes, permissions: [PERMISSIONS.SUPPLY_READ] },
    ],
  },
  {
    title: "Control",
    items: [{ label: "Inventories", to: "/app/inventories", icon: ClipboardCheck, permissions: [PERMISSIONS.INVENTORIES_READ] }],
  },
  {
    title: "Analytics",
    items: [{ label: "BI & Analytics", to: "/app/bi", icon: ChartColumnBig, permissions: [PERMISSIONS.ANALYTICS_READ] }],
  },
  {
    title: "Administration",
    items: [
      { label: "Admin home", to: "/app/admin", icon: Users, permissions: [PERMISSIONS.USERS_MANAGE, PERMISSIONS.ADMIN_ACCESS] },
      { label: "Users management", to: "/app/admin/users", icon: Users, permissions: [PERMISSIONS.USERS_MANAGE, PERMISSIONS.ADMIN_ACCESS] },
      { label: "Doctors", to: "/app/admin/doctors", icon: Stethoscope, permissions: [PERMISSIONS.USERS_MANAGE, PERMISSIONS.ADMIN_ACCESS] },
      { label: "Medicines", to: "/app/admin/medicines", icon: Package, permissions: [PERMISSIONS.PRODUCTS_MANAGE] },
      { label: "Security", to: "/app/admin/security", icon: Shield, permissions: [PERMISSIONS.USERS_MANAGE, PERMISSIONS.ADMIN_ACCESS] },
    ],
  },
];

const pageMeta: Record<string, { title: string; subtitle?: string }> = {
  "/app/dashboard": {
    title: "Dashboard",
    subtitle: "Overview of pharmacy activity, alerts, and KPIs.",
  },
  "/app/admin": {
    title: "Administration",
    subtitle: "Manage users, roles, and platform access.",
  },
  "/app/admin/security": {
    title: "Security",
    subtitle: "Review permissions and platform security settings.",
  },
  "/app/admin/users": {
    title: "Users Management",
    subtitle: "View platform users and update role assignments with RBAC protections.",
  },
  "/app/admin/doctors": {
    title: "Doctors Management",
    subtitle: "Create doctor accounts and manage doctor access for prescriptions.",
  },
  "/app/admin/medicines": {
    title: "Medicines Management",
    subtitle: "Admin area to add medicines using PRODUCT base fields.",
  },
  "/app/products": {
    title: "Products",
    subtitle: "Manage medicines, stock items, and product references.",
  },
  "/app/stock": {
    title: "Stock",
    subtitle: "Read stock quantities by product and location.",
  },
  "/app/stock-lots": {
    title: "Stock Lots",
    subtitle: "Read lot-level stock quantities by location.",
  },
  "/app/stock-movements": {
    title: "Stock Movements",
    subtitle: "Browse movement headers and line details from Oracle.",
  },
  "/app/distributions": {
    title: "Distributions",
    subtitle: "Browse distribution history and quantitative line details from Oracle.",
  },
  "/app/inventories": {
    title: "Inventories",
    subtitle: "Browse inventory sessions and compare counted vs system quantities.",
  },
  "/app/external-orders": {
    title: "External Orders",
    subtitle: "Browse supplier-facing order headers and lines from Oracle.",
  },
  "/app/internal-orders": {
    title: "Internal Orders",
    subtitle: "Browse internal order requests with their line details.",
  },
  "/app/receptions": {
    title: "Receptions",
    subtitle: "Browse reception headers and received line quantities.",
  },
  "/app/internal-deliveries": {
    title: "Internal Deliveries",
    subtitle: "Browse internal delivery headers and line quantities.",
  },
  "/app/bi": {
    title: "BI & Analytics",
    subtitle: "Access Power BI dashboards and embedded analytics for pharmacy operations.",
  },
  "/app/bi/reports": {
    title: "BI Reports",
    subtitle: "Browse the available Power BI dashboards configured for pharmacy analytics.",
  },
  "/app/doctors/prescriptions": {
    title: "Prescriptions",
    subtitle: "Create and review medical prescriptions from existing Oracle fields.",
  },
  "/app/ordonnances": {
    title: "Prescriptions",
    subtitle: "Create and review medical prescriptions from existing Oracle fields.",
  },
  "/app/orders": {
    title: "Orders",
    subtitle: "Manage internal and external pharmacy orders.",
  },
  "/app/reporting": {
    title: "Reporting",
    subtitle: "Explore reports, exports, and decision dashboards.",
  },
};

export default function AppShell() {
  const { user, logout } = useAuth();
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
      items: section.items.filter(
        (item) => {
          const allowedByPermission = !item.permissions || item.permissions.some((permission) => hasPermission(user, permission));
          const allowedByRole = !item.roles || item.roles.some((role) => hasRole(user, role));
          return allowedByPermission && allowedByRole;
        }
      ),
    }))
    .filter((section) => section.items.length > 0);

  const currentPage = pageMeta[location.pathname] ?? {
    title: "Workspace",
    subtitle: "Manage pharmacy and decision-support operations.",
  };

  return (
    <div className="h-screen overflow-hidden bg-[linear-gradient(180deg,#f9fcfd_0%,#f2f6f8_100%)] text-foreground">
      <div className="flex h-full overflow-hidden">
        <aside
          className={cn(
            "h-full flex-shrink-0 overflow-y-auto border-r border-border/70 bg-white/90 px-4 py-5 shadow-sm backdrop-blur transition-all duration-300",
            collapsed ? "w-[92px]" : "w-[280px]"
          )}
        >
          <div className="flex items-center justify-between gap-3 pb-5">
            <Link to="/app/dashboard" className="flex min-w-0 items-center gap-3">
              <img
                src="/transtu-logo.jpg"
                alt="TRANSTU"
                className="h-11 w-11 rounded-2xl object-contain ring-1 ring-border"
              />
              {!collapsed && (
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium uppercase tracking-[0.28em] text-primary">
                    TRANSTU
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    Pharmacy platform
                  </p>
                </div>
              )}
            </Link>

            <Button variant="ghost" size="icon" onClick={() => setCollapsed((s) => !s)}>
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="rounded-3xl border border-primary/10 bg-primary/5 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary font-semibold text-primary-foreground">
                {initials}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {user?.firstname} {user?.lastname}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {user?.function || "Workspace user"}
                  </p>
                </div>
              )}
            </div>
          </div>

          <nav className="mt-6 space-y-6">
            {visibleSections.map((section) => (
              <div key={section.title}>
                {!collapsed && (
                  <p className="mb-2 px-3 text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
                    {section.title}
                  </p>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;

                    return (
                      <NavLink
                        key={item.label}
                        to={item.to}
                        className={({ isActive }) =>
                          cn(
                            "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )
                        }
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>{item.label}</span>}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-6 rounded-3xl border border-border bg-muted/40 p-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Command className="h-4 w-4 text-secondary" />
              {!collapsed && <span>Ctrl + K quick search</span>}
            </div>
          </div>

          <div className="mt-6">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 rounded-2xl"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Logout</span>}
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex-shrink-0 border-b border-border/70 bg-white/88 px-6 py-4 backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-1 text-sm text-muted-foreground">
                  Home / <span className="text-foreground">{currentPage.title}</span>
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">{currentPage.title}</h1>
                {currentPage.subtitle && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {currentPage.subtitle}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden rounded-2xl border border-border bg-background px-4 py-2 text-sm text-muted-foreground lg:block">
                  Secure session: {user?.email}
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
    </div>
  );
}
