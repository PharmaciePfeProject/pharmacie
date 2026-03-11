import { useAuth } from "../auth/AuthContext";

export default function Admin() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="mx-auto max-w-3xl space-y-3">
        <h1 className="text-2xl font-semibold">Admin Area</h1>
        <p className="text-zinc-400">
          Only users with roleId = <span className="text-zinc-200">1</span> should access this.
        </p>
        <pre className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm overflow-auto">
{JSON.stringify(user, null, 2)}
        </pre>
      </div>
    </div>
  );
}