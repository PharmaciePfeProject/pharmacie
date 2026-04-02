import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, UserRoundPlus } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import AuthBackground from "../components/AuthBackground";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/i18n/LanguageContext";

const FUNCTION_OPTIONS = [
  { value: "PHARMACIST", labelKey: "auth.function.pharmacist" },
  { value: "PREPARATEUR", labelKey: "auth.function.technician" },
  { value: "STOCK_MANAGER", labelKey: "auth.function.stockManager" },
  { value: "REPORTING", labelKey: "auth.function.reporting" },
];

export default function Register() {
  const { register } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const nav = useNavigate();

  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    firstname: "",
    lastname: "",
    functionName: "PHARMACIST",
  });

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onChange = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (
      !form.firstname.trim() ||
      !form.lastname.trim() ||
      !form.email.trim() ||
      !form.username.trim() ||
      !form.password.trim() ||
      !form.functionName.trim()
    ) {
      setErr(t("auth.fillAllFields"));
      return;
    }

    setLoading(true);

    try {
      await register(form);
      nav("/app/dashboard");
    } catch (error: any) {
      setErr(error?.response?.data?.message || t("auth.registerFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <AuthBackground />
      <div className="absolute right-6 top-6 z-10 flex items-center gap-2 rounded-2xl border border-white/70 bg-white/85 px-3 py-2 shadow-sm backdrop-blur">
        <span className="text-sm text-muted-foreground">{t("login.languageToggle")}</span>
        <Button
          type="button"
          size="sm"
          variant={language === "en" ? "default" : "ghost"}
          className="rounded-xl px-3"
          onClick={() => setLanguage("en")}
        >
          EN
        </Button>
        <Button
          type="button"
          size="sm"
          variant={language === "fr" ? "default" : "ghost"}
          className="rounded-xl px-3"
          onClick={() => setLanguage("fr")}
        >
          FR
        </Button>
      </div>

      <div className="relative grid w-full max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="order-2 border-white/80 bg-white/90 shadow-[0_30px_80px_rgba(15,23,42,0.1)] backdrop-blur lg:order-1">
          <CardHeader className="space-y-3 pb-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-secondary/10 px-4 py-2 text-sm font-medium text-secondary">
              <UserRoundPlus className="h-4 w-4" />
              {t("auth.registerBadge")}
            </div>

            <CardTitle className="text-3xl">{t("auth.registerTitle")}</CardTitle>

            <p className="text-sm leading-6 text-muted-foreground">{t("auth.registerSubtitle")}</p>
          </CardHeader>

          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstname">{t("auth.firstName")}</Label>
                  <Input
                    id="firstname"
                    className="h-11 bg-background"
                    value={form.firstname}
                    onChange={(e) => onChange("firstname", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastname">{t("auth.lastName")}</Label>
                  <Input
                    id="lastname"
                    className="h-11 bg-background"
                    value={form.lastname}
                    onChange={(e) => onChange("lastname", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  className="h-11 bg-background"
                  value={form.email}
                  onChange={(e) => onChange("email", e.target.value)}
                  placeholder="test@transtu.tn"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="username">{t("auth.username")}</Label>
                  <Input
                    id="username"
                    className="h-11 bg-background"
                    value={form.username}
                    onChange={(e) => onChange("username", e.target.value)}
                    placeholder="testuser"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="functionName">{t("auth.function")}</Label>
                  <select
                    id="functionName"
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    value={form.functionName}
                    onChange={(e) => onChange("functionName", e.target.value)}
                  >
                    {FUNCTION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  className="h-11 bg-background"
                  value={form.password}
                  onChange={(e) => onChange("password", e.target.value)}
                  placeholder="********"
                />
              </div>

              {err && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {err}
                </div>
              )}

              <Button
                type="submit"
                className="h-11 w-full text-base"
                disabled={loading}
              >
                {loading ? t("auth.creating") : t("auth.createAccount")}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {t("auth.haveAccount")}{" "}
                <Link
                  className="font-medium text-primary hover:underline"
                  to="/login"
                >
                  {t("auth.signIn")}
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        <div className="order-1 flex flex-col justify-between rounded-[32px] border border-white/70 bg-white/80 p-10 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur lg:order-2">
          <div className="flex items-center gap-4">
            <img
              src="/transtu-logo.jpg"
              alt="TRANSTU"
              className="h-16 w-16 rounded-2xl object-contain ring-1 ring-border"
            />
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">
                TRANSTU
              </p>
              <h2 className="mt-2 text-3xl font-semibold">
                {t("auth.modernWorkspace")}
              </h2>
            </div>
          </div>

          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-4 py-2 text-sm font-medium text-foreground">
              <Building2 className="h-4 w-4" />
              {t("auth.lightInterface")}
            </div>

            <div className="space-y-3 rounded-3xl bg-muted/80 p-6">
              <h3 className="text-xl font-semibold">{t("auth.whatNext")}</h3>
              <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
                <li>- {t("auth.whatNext.one")}</li>
                <li>- {t("auth.whatNext.two")}</li>
                <li>- {t("auth.whatNext.three")}</li>
              </ul>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {t("auth.registerSafeNote")}
          </p>
        </div>
      </div>
    </div>
  );
}
