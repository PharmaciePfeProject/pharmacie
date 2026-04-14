import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { hasPermission, hasRole } from "@/lib/roles";
export default function PermissionRoute({ permissions = [], roles = [], redirectTo = "/app/dashboard", }) {
    const { user, isLoading } = useAuth();
    const { t } = useLanguage();
    if (isLoading) {
        return (<div className="min-h-screen grid place-items-center bg-background text-foreground">
        {t("common.loading")}
      </div>);
    }
    const allowedByPermission = permissions.length === 0 || permissions.some((permissionKey) => hasPermission(user, permissionKey));
    const allowedByRole = roles.length === 0 || roles.some((roleKey) => hasRole(user, roleKey));
    if (!allowedByPermission || !allowedByRole) {
        return <Navigate to={redirectTo} replace/>;
    }
    return <Outlet />;
}
