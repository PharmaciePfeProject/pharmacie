import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ChartNoAxesColumn, ShieldCheck, Stethoscope, UserCog, Users } from "lucide-react";
import { fetchUsers } from "@/api/users";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLanguage } from "@/i18n/LanguageContext";
import { PERMISSIONS, ROLES, type RoleKey } from "@/lib/roles";
import type { AdminUser } from "@/types/users";

function formatRoleLabel(roleKey: RoleKey) {
  return roleKey
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export default function SecurityPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchUsers();
        if (!active) return;
        setUsers(result.items);
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message || t("security.loadFailed"));
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [t]);

  const activeUsers = useMemo(() => users.filter((item) => item.actived === 1), [users]);
  const adminUsers = useMemo(() => users.filter((item) => item.roles.includes(ROLES.ADMIN)), [users]);
  const doctorUsers = useMemo(() => users.filter((item) => item.roles.includes(ROLES.MEDECIN)), [users]);
  const analyticsUsers = useMemo(
    () => users.filter((item) => item.permissions.includes(PERMISSIONS.ANALYTICS_READ)),
    [users]
  );
  const roleDistribution = useMemo(() => {
    const counts = new Map<RoleKey, number>();
    for (const item of users) {
      for (const role of item.roles) {
        counts.set(role, (counts.get(role) || 0) + 1);
      }
    }

    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [users]);

  const sessionRoles = user?.roles ?? [];
  const sessionPermissions = user?.permissions ?? [];

  return (
    <div className="space-y-6">
      <Card className="border-white/70 bg-white/95 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <ShieldCheck className="h-4 w-4" />
            {t("security.badge")}
          </div>
          <CardTitle className="text-3xl">{t("security.title")}</CardTitle>
          <CardDescription>{t("security.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: t("security.totalUsers"), value: users.length, icon: Users },
            { label: t("security.activeUsers"), value: activeUsers.length, icon: ShieldCheck },
            { label: t("security.adminUsers"), value: adminUsers.length, icon: UserCog },
            { label: t("security.doctorUsers"), value: doctorUsers.length, icon: Stethoscope },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-3xl border border-border bg-muted/20 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{label}</p>
                <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-white/70 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle>{t("security.sessionTitle")}</CardTitle>
            <CardDescription>{t("security.sessionBody")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">{t("common.emailLabel")}</p>
                <p className="mt-1 font-medium">{user?.email || t("common.notAvailable")}</p>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">{t("common.functionLabel")}</p>
                <p className="mt-1 font-medium">{user?.functionName || user?.function || t("common.notAvailable")}</p>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium">{t("security.currentRoles")}</p>
              <div className="flex flex-wrap gap-2">
                {sessionRoles.length > 0 ? (
                  sessionRoles.map((role) => (
                    <span key={role} className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {formatRoleLabel(role)}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">{t("common.notAvailable")}</span>
                )}
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium">{t("security.currentPermissions")}</p>
              <div className="flex flex-wrap gap-2">
                {sessionPermissions.length > 0 ? (
                  sessionPermissions.map((permission) => (
                    <span key={permission} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                      {permission}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">{t("common.notAvailable")}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle>{t("security.quickActionsTitle")}</CardTitle>
            <CardDescription>{t("security.quickActionsBody")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { to: "/app/admin/users", label: t("security.action.users"), icon: Users },
              { to: "/app/admin/doctors", label: t("security.action.doctors"), icon: Stethoscope },
              { to: "/app/bi/reports", label: t("security.action.analytics"), icon: ChartNoAxesColumn },
            ].map(({ to, label, icon: Icon }) => (
              <Button key={to} asChild variant="outline" className="h-auto w-full justify-start gap-3 rounded-2xl px-4 py-4">
                <Link to={to}>
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/70 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle>{t("security.roleSummaryTitle")}</CardTitle>
            <CardDescription>{t("security.roleSummaryBody")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">{t("security.loading")}</div>
            ) : error ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">{error}</div>
            ) : roleDistribution.length === 0 ? (
              <EmptyState description={t("security.noRoles")} />
            ) : (
              <div className="space-y-3">
                {roleDistribution.map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between rounded-2xl border bg-muted/20 px-4 py-3">
                    <div>
                      <p className="font-medium">{formatRoleLabel(role)}</p>
                      <p className="text-sm text-muted-foreground">{t("security.accountsWithRole")}</p>
                    </div>
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle>{t("security.guidanceTitle")}</CardTitle>
            <CardDescription>{t("security.guidanceBody")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              t("security.tip.one"),
              t("security.tip.two"),
              t("security.tip.three"),
              `${t("security.analyticsUsers")}: ${analyticsUsers.length}`,
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border bg-muted/20 p-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-sm text-muted-foreground">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
