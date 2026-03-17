import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ROLES } from "@/lib/roles";

export default function AdminRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        Loading...
      </div>
    );
  }

  const isAdmin = user?.roles?.includes(ROLES.ADMIN);

  if (!isAdmin) return <Navigate to="/app/dashboard" replace />;

  return <Outlet />;
}