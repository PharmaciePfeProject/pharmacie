import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function RoleBadge({ roles }: { roles: number[] | undefined }) {
  const isAdmin = roles?.includes(1);
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border",
        isAdmin
          ? "bg-emerald-500/10 text-emerald-200 border-emerald-500/20"
          : "bg-blue-500/10 text-blue-200 border-blue-500/20",
      ].join(" ")}
    >
      {isAdmin ? "Admin" : "User"}
    </span>
  );
}

export default function Home() {
  const { user, logout } = useAuth();

  const isAdmin = user?.roles?.includes(1);

  const initials = useMemo(() => {
    const a = user?.firstname?.[0] ?? "";
    const b = user?.lastname?.[0] ?? "";
    return (a + b).toUpperCase() || "U";
  }, [user?.firstname, user?.lastname]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Topbar */}
      <div className="sticky top-0 z-10 border-b border-zinc-800/70 bg-zinc-950/60 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600/60 to-fuchsia-600/60 border border-zinc-800 grid place-items-center font-semibold">
              {initials}
            </div>
            <div>
              <div className="text-sm text-zinc-400">Pharmacie Platform</div>
              <div className="text-lg font-semibold leading-tight">
                Welcome, {user?.firstname ?? "User"} 👋
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <RoleBadge roles={user?.roles} />

            {isAdmin && (
              <Link
                to="/admin"
                className="text-sm text-zinc-200 hover:text-white underline underline-offset-4"
              >
                Admin
              </Link>
            )}

            <Button variant="secondary" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Header cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-zinc-900/50 border-zinc-800/80 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-lg font-semibold">
                {user?.firstname} {user?.lastname}
              </div>
              <div className="text-sm text-zinc-400">{user?.email}</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800/80 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Username</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-lg font-semibold">@{user?.username}</div>
              <div className="text-sm text-zinc-400">
                Active: {user?.actived === 1 ? "Yes" : "No"}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800/80 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Function</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-lg font-semibold">{user?.function || "—"}</div>
              <div className="text-sm text-zinc-400">
                Roles: {user?.roles?.join(", ") || "—"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main panel */}
        <Card className="bg-zinc-900/35 border-zinc-800/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">Dashboard</CardTitle>
            <p className="text-sm text-zinc-400">
              This is your authenticated area. Next we’ll add real features here.
            </p>
          </CardHeader>

          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-4">
              <div className="text-sm text-zinc-400">Next step</div>
              <div className="mt-1 font-semibold">Admin panel routes</div>
              <div className="mt-2 text-sm text-zinc-400">
                If your role includes <span className="text-zinc-200">1</span>, you’ll see admin-only screens.
              </div>
              {isAdmin && (
                <div className="mt-3">
                  <Link
                    to="/admin"
                    className="text-sm text-blue-300 hover:text-blue-200 underline underline-offset-4"
                  >
                    Go to Admin →
                  </Link>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-4">
              <div className="text-sm text-zinc-400">Security</div>
              <div className="mt-1 font-semibold">Token-based access</div>
              <div className="mt-2 text-sm text-zinc-400">
                Frontend uses JWT stored in localStorage and automatically calls{" "}
                <span className="text-zinc-200">/api/auth/me</span>.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}