import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Pill, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import AuthBackground from "../components/AuthBackground";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await login({ emailOrUsername, password });
      nav("/");
    } catch (error: any) {
      setErr(error?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <AuthBackground />
      <div className="relative grid w-full max-w-5xl gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="hidden flex-col justify-between rounded-[32px] border border-white/70 bg-white/80 p-10 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur lg:flex">
          <div className="flex items-center gap-4">
            <img src="/transtu-logo.jpg" alt="TRANSTU" className="h-16 w-16 rounded-2xl object-contain ring-1 ring-border" />
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">TRANSTU</p>
              <h1 className="mt-2 text-3xl font-semibold text-foreground">Pharmacy Platform & Decision Support</h1>
            </div>
          </div>

          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <ShieldCheck className="h-4 w-4" /> Secure access for authorized staff
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Stock & lots", "Track stock, expiry dates, and pharmacy inventory in one place."],
                ["Prescriptions", "Manage prescriptions, distributions, and medical workflows."],
                ["Reporting", "Follow KPIs, alerts, and decision dashboards with clear data."],
                ["Administration", "Control roles, users, and secure access centrally."],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-border/80 bg-background/80 p-4">
                  <div className="mb-2 inline-flex rounded-xl bg-secondary/10 p-2 text-secondary">
                    <Pill className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">Inspired by the existing TRANSTU platform, redesigned for a cleaner and more modern user experience.</p>
        </div>

        <Card className="border-white/80 bg-white/90 shadow-[0_30px_80px_rgba(15,23,42,0.1)] backdrop-blur">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex items-center gap-3 lg:hidden">
              <img src="/transtu-logo.jpg" alt="TRANSTU" className="h-12 w-12 rounded-2xl object-contain ring-1 ring-border" />
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary">TRANSTU</p>
                <p className="text-sm text-muted-foreground">Pharmacy platform</p>
              </div>
            </div>
            <CardTitle className="text-3xl">Welcome back</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">Sign in to continue to the TRANSTU pharmacy workspace.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>Email or Username</Label>
                <Input value={emailOrUsername} onChange={(e) => setEmailOrUsername(e.target.value)} placeholder="test@transtu.tn" className="h-11 bg-background" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-11 bg-background" />
              </div>
              {err && <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{err}</div>}
              <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                No account? <Link className="font-medium text-primary hover:underline" to="/register">Create one</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
