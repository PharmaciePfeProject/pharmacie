import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pill, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import AuthBackground from "../components/AuthBackground";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/i18n/LanguageContext";
export default function Login() {
    const { login } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const nav = useNavigate();
    const [emailOrUsername, setEmailOrUsername] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState(null);
    const [loading, setLoading] = useState(false);
    const onSubmit = async (e) => {
        e.preventDefault();
        setErr(null);
        setLoading(true);
        try {
            await login({ emailOrUsername, password });
            nav("/");
        }
        catch (error) {
            setErr(error?.response?.data?.message || t("auth.loginFailed"));
        }
        finally {
            setLoading(false);
        }
    };
    const features = [
        [t("auth.feature.stock"), t("auth.feature.stockDesc")],
        [t("auth.feature.prescriptions"), t("auth.feature.prescriptionsDesc")],
        [t("auth.feature.reporting"), t("auth.feature.reportingDesc")],
        [t("auth.feature.administration"), t("auth.feature.administrationDesc")],
    ];
    return (<div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <AuthBackground />
      <div className="absolute right-4 top-4 z-10 inline-flex max-w-[calc(100%-2rem)] items-center gap-3 rounded-2xl border border-white/70 bg-white/90 px-3 py-2 shadow-sm backdrop-blur sm:right-6 sm:top-6 sm:px-4">
        <span className="hidden text-sm text-muted-foreground lg:inline">
          {t("login.languageToggle")}
        </span>
        <div className="inline-flex shrink-0 items-center rounded-xl border border-border bg-background/90 p-1">
          <Button type="button" size="sm" variant={language === "en" ? "default" : "ghost"} className="h-8 min-w-[48px] rounded-lg px-3" onClick={() => setLanguage("en")}>
            EN
          </Button>
          <Button type="button" size="sm" variant={language === "fr" ? "default" : "ghost"} className="h-8 min-w-[48px] rounded-lg px-3" onClick={() => setLanguage("fr")}>
            FR
          </Button>
        </div>
      </div>
      <div className="relative grid w-full max-w-5xl gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="hidden flex-col justify-between rounded-[32px] border border-white/70 bg-white/80 p-10 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur lg:flex">
          <div className="flex items-center gap-4">
            <img src="/transtu-logo.jpg" alt="TRANSTU" className="h-16 w-16 rounded-2xl object-contain ring-1 ring-border"/>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">
                TRANSTU
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-foreground">
                {t("auth.brandTitle")}
              </h1>
            </div>
          </div>

          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <ShieldCheck className="h-4 w-4"/>
              {t("auth.secureAccess")}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {features.map(([title, text]) => (<div key={title} className="rounded-2xl border border-border/80 bg-background/80 p-4">
                  <div className="mb-2 inline-flex rounded-xl bg-secondary/10 p-2 text-secondary">
                    <Pill className="h-4 w-4"/>
                  </div>
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {text}
                  </p>
                </div>))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{t("auth.inspired")}</p>
        </div>

        <Card className="border-white/80 bg-white/90 shadow-[0_30px_80px_rgba(15,23,42,0.1)] backdrop-blur">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex items-center gap-3 lg:hidden">
              <img src="/transtu-logo.jpg" alt="TRANSTU" className="h-12 w-12 rounded-2xl object-contain ring-1 ring-border"/>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary">
                  TRANSTU
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("nav.pharmacyPlatform")}
                </p>
              </div>
            </div>
            <CardTitle className="text-3xl">{t("auth.loginTitle")}</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              {t("auth.loginSubtitle")}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>{t("auth.emailOrUsername")}</Label>
                <Input value={emailOrUsername} onChange={(e) => setEmailOrUsername(e.target.value)} placeholder="test@transtu.tn" className="h-11 bg-background"/>
              </div>
              <div className="space-y-2">
                <Label>{t("auth.password")}</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" className="h-11 bg-background"/>
              </div>
              {err && (<div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {err}
                </div>)}
              <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
                {loading ? t("auth.signingIn") : t("auth.signIn")}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {t("auth.secureAccess")}
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>);
}
