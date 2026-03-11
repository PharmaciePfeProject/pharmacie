import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function AdminRoute({ children }: { children: JSX.Element }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="min-h-screen grid place-items-center text-zinc-100">Loading...</div>;

  const isAdmin = user?.roles?.includes(1);
  if (!isAdmin) return <Navigate to="/" replace />;

  return children;
}