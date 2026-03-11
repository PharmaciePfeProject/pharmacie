import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
    <div className="relative min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <AuthBackground />

      <div className="relative w-full max-w-md">
        <Card className="bg-card/90 border-border backdrop-blur-xl shadow-xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <p className="text-sm text-muted-foreground">Sign in to continue.</p>
          </CardHeader>

          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>Email or Username</Label>
                <Input
                  className="bg-background border-input placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="test@transtu.tn"
                />
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  className="bg-background border-input placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {err && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {err}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                No account?{" "}
                <Link className="text-primary hover:text-primary/80 underline underline-offset-4" to="/register">
                  Create one
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}