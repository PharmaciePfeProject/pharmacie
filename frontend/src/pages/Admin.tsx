import { ShieldCheck, UserCog, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";

export default function Admin() {
  const { t } = useLanguage();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {[
        [
          t("admin.home.usersTitle"),
          t("admin.home.usersBody"),
          Users,
          "/app/admin/users",
          t("admin.home.usersAction"),
        ],
        [
          t("admin.home.rolesTitle"),
          t("admin.home.rolesBody"),
          UserCog,
          "/app/admin/users",
          t("admin.home.rolesAction"),
        ],
        [
          t("admin.home.securityTitle"),
          t("admin.home.securityBody"),
          ShieldCheck,
          "/app/admin/security",
          t("admin.home.securityAction"),
        ],
      ].map(([title, description, Icon, to, actionLabel]) => {
        const LucideIcon = Icon as typeof Users;

        return (
          <Card key={title as string} className="border-white/70 bg-white/95 shadow-sm">
            <CardHeader>
              <div className="mb-4 inline-flex w-fit rounded-2xl bg-primary/10 p-3 text-primary">
                <LucideIcon className="h-5 w-5" />
              </div>
              <CardTitle>{title as string}</CardTitle>
              <CardDescription>{description as string}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-3xl border border-dashed border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
                  {t("admin.home.note")}
                </div>
                <Button asChild variant="outline" className="w-full rounded-xl">
                  <Link to={to as string}>{actionLabel as string}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
