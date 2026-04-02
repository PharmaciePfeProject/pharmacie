import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { PERMISSIONS, hasPermission, hasRole, ROLES } from "@/lib/roles";

export default function AdminRoute() {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        {t("common.loading")}
      </div>
    );
  }

  const isAdmin =
    hasRole(user, ROLES.ADMIN) ||
    hasPermission(user, PERMISSIONS.USERS_MANAGE) ||
    hasPermission(user, PERMISSIONS.ADMIN_ACCESS);

  if (!isAdmin) return <Navigate to="/app/dashboard" replace />;

  return <Outlet />;
}
