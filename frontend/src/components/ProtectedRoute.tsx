import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen grid place-items-center text-zinc-100">Loading...</div>;
  }

  if (!token) return <Navigate to="/login" replace />;

  return children;
}