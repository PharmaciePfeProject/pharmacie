import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import AuthBackground from "../components/AuthBackground";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();

  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    firstname: "",
    lastname: "",
    functionName: "",
    roleId: 2,
  });

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onChange = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await register(form);
      nav("/");
    } catch (error: any) {
      setErr(error?.response?.data?.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <AuthBackground />

      <div className="relative w-full max-w-lg">
        <Card className="bg-card/90 border-border backdrop-blur-xl shadow-xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Create account</CardTitle>
            <p className="text-sm text-muted-foreground">Register to start using the platform.</p>
          </CardHeader>

          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First name</Label>
                  <Input
                    className="bg-background border-input text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                    value={form.firstname}
                    onChange={(e) => onChange("firstname", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last name</Label>
                  <Input
                    className="bg-background border-input text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                    value={form.lastname}
                    onChange={(e) => onChange("lastname", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  className="bg-background border-input text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                  value={form.email}
                  onChange={(e) => onChange("email", e.target.value)}
                  placeholder="test@transtu.tn"
                />
              </div>

              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  className="bg-background border-input text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                  value={form.username}
                  onChange={(e) => onChange("username", e.target.value)}
                  placeholder="testuser"
                />
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  className="bg-background border-input text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                  value={form.password}
                  onChange={(e) => onChange("password", e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <Label>Function</Label>
                <Input
                  className="bg-background border-input text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                  value={form.functionName}
                  onChange={(e) => onChange("functionName", e.target.value)}
                  placeholder="Pharmacien"
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
                {loading ? "Creating..." : "Create account"}
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{" "}
                <Link className="text-primary hover:text-primary/80 underline underline-offset-4" to="/login">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}