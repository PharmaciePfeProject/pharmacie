import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { hasPermission, hasRole, type PermissionKey, type RoleKey } from "@/lib/roles";

type PermissionRouteProps = {
  permissions?: PermissionKey[];
  roles?: RoleKey[];
  redirectTo?: string;
};

export default function PermissionRoute({
  permissions = [],
  roles = [],
  redirectTo = "/app/dashboard",
}: PermissionRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        Loading...
      </div>
    );
  }

  const allowedByPermission =
    permissions.length === 0 || permissions.some((permissionKey) => hasPermission(user, permissionKey));
  const allowedByRole = roles.length === 0 || roles.some((roleKey) => hasRole(user, roleKey));

  if (!allowedByPermission || !allowedByRole) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
