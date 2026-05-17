import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { hasPermission, hasRole } from "@/lib/roles";
export default function PermissionRoute({ permissions = [], roles = [], functions = [], match = "all", redirectTo = "/app/dashboard", }) {
    const { user, isLoading } = useAuth();
    const { t } = useLanguage();
    if (isLoading) {
        return (<div className="min-h-screen grid place-items-center bg-background text-foreground">
        {t("common.loading")}
      </div>);
    }
    const userFunction = String(user?.functionName || user?.function || "")
        .trim()
        .toUpperCase();
    const checks = [];
    if (permissions.length > 0) {
        checks.push(permissions.some((permissionKey) => hasPermission(user, permissionKey)));
    }
    if (roles.length > 0) {
        checks.push(roles.some((roleKey) => hasRole(user, roleKey)));
    }
    if (functions.length > 0) {
        const normalized = functions.map((value) => String(value).trim().toUpperCase());
        checks.push(normalized.includes(userFunction));
    }
    const isAllowed = checks.length === 0
        ? true
        : match === "any"
            ? checks.some(Boolean)
            : checks.every(Boolean);
    if (!isAllowed) {
        return <Navigate to={redirectTo} replace/>;
    }
    return <Outlet />;
}
