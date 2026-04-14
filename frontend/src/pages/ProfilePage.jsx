import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Lock, Save, UserRound } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { updateMyPassword, updateMyProfile } from "@/api/profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/i18n/LanguageContext";

function formatRoleLabel(roleKey) {
  return String(roleKey || "")
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export default function ProfilePage() {
  const { user, refreshMe } = useAuth();
  const { t } = useLanguage();

  const [profileForm, setProfileForm] = useState({
    firstname: "",
    lastname: "",
    email: "",
    username: "",
    functionName: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    setProfileForm({
      firstname: user?.firstname || "",
      lastname: user?.lastname || "",
      email: user?.email || "",
      username: user?.username || "",
      functionName: user?.functionName || user?.function || "",
    });
  }, [user]);

  const initials = useMemo(() => {
    const first = profileForm.firstname?.[0] || "";
    const last = profileForm.lastname?.[0] || "";
    return (first + last).toUpperCase() || "U";
  }, [profileForm.firstname, profileForm.lastname]);

  const canSaveProfile = useMemo(() => {
    return (
      profileForm.firstname.trim() &&
      profileForm.lastname.trim() &&
      profileForm.email.trim() &&
      profileForm.username.trim()
    );
  }, [profileForm]);

  async function onSaveProfile(event) {
    event.preventDefault();
    if (!canSaveProfile) return;

    try {
      setSavingProfile(true);
      setProfileError("");
      setProfileSuccess("");

      await updateMyProfile({
        firstname: profileForm.firstname.trim(),
        lastname: profileForm.lastname.trim(),
        email: profileForm.email.trim(),
        username: profileForm.username.trim(),
        functionName: profileForm.functionName.trim() || undefined,
      });

      await refreshMe();
      setProfileSuccess(t("profile.saved"));
    } catch (error) {
      setProfileError(
        error?.response?.data?.message || t("profile.saveFailed"),
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function onSavePassword(event) {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordError(t("profile.password.needFields"));
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError(t("profile.password.minLength"));
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t("profile.password.mismatch"));
      return;
    }

    try {
      setSavingPassword(true);
      await updateMyPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordSuccess(t("profile.password.saved"));
    } catch (error) {
      setPasswordError(
        error?.response?.data?.message || t("profile.password.saveFailed"),
      );
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-white/70 bg-white/95 shadow-sm">
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-xl font-semibold text-primary-foreground">
              {initials}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("profile.myAccount")}</p>
              <h2 className="text-2xl font-semibold">
                {profileForm.firstname} {profileForm.lastname}
              </h2>
              <p className="text-sm text-muted-foreground">{profileForm.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(user?.roles || []).map((role) => (
              <span
                key={role}
                className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {formatRoleLabel(role)}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/70 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-primary" />
              {t("profile.personalInfo")}
            </CardTitle>
            <CardDescription>{t("profile.personalInfoDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSaveProfile}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("auth.firstName")}</p>
                  <Input
                    value={profileForm.firstname}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        firstname: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("auth.lastName")}</p>
                  <Input
                    value={profileForm.lastname}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        lastname: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("auth.email")}</p>
                  <Input
                    type="email"
                    value={profileForm.email}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("auth.username")}</p>
                  <Input
                    value={profileForm.username}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        username: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">{t("common.functionLabel")}</p>
                <Input
                  value={profileForm.functionName}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      functionName: event.target.value,
                    }))
                  }
                />
              </div>

              {profileError ? (
                <p className="text-sm text-destructive">{profileError}</p>
              ) : null}
              {profileSuccess ? (
                <p className="inline-flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  {profileSuccess}
                </p>
              ) : null}

              <Button type="submit" disabled={!canSaveProfile || savingProfile}>
                <Save className="mr-2 h-4 w-4" />
                {savingProfile ? t("profile.saving") : t("profile.saveChanges")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              {t("profile.password.title")}
            </CardTitle>
            <CardDescription>{t("profile.password.desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-4" onSubmit={onSavePassword}>
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("profile.password.current")}</p>
                <Input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("profile.password.new")}</p>
                <Input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("profile.password.confirm")}</p>
                <Input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                />
              </div>

              {passwordError ? (
                <p className="text-sm text-destructive">{passwordError}</p>
              ) : null}
              {passwordSuccess ? (
                <p className="inline-flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  {passwordSuccess}
                </p>
              ) : null}

              <Button type="submit" disabled={savingPassword}>
                {savingPassword
                  ? t("profile.password.saving")
                  : t("profile.password.save")}
              </Button>
            </form>

            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("profile.permissions")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(user?.permissions || []).length > 0 ? (
                  user.permissions.map((permission) => (
                    <span
                      key={permission}
                      className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                    >
                      {permission}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t("common.notAvailable")}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
