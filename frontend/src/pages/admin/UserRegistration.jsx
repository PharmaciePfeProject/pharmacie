import { useState } from "react";
import { createManagedUser } from "@/api/users";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/i18n/LanguageContext";
const initialForm = {
    firstname: "",
    lastname: "",
    email: "",
    username: "",
    password: "",
    role: "MEDECIN",
    functionName: "",
};
const roleOptions = [
    { value: "MEDECIN", label: "Medecin" },
    { value: "PHARMACIEN", label: "Pharmacien" },
    { value: "RESPONSABLE_REPORTING", label: "Responsable BI" },
];
export default function UserRegistration() {
    const { t } = useLanguage();
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const updateField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };
    const submit = async (event) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);
        if (!form.firstname.trim() ||
            !form.lastname.trim() ||
            !form.email.trim() ||
            !form.username.trim() ||
            !form.password.trim()) {
            setError("Veuillez renseigner tous les champs obligatoires.");
            return;
        }
        if (form.username.trim().length < 3) {
            setError("Le nom d'utilisateur doit contenir au moins 3 caracteres.");
            return;
        }
        if (form.password.length < 6) {
            setError("Le mot de passe doit contenir au moins 6 caracteres.");
            return;
        }
        try {
            setLoading(true);
            const user = await createManagedUser({
                firstname: form.firstname.trim(),
                lastname: form.lastname.trim(),
                email: form.email.trim(),
                username: form.username.trim(),
                password: form.password,
                role: form.role,
                functionName: form.functionName.trim() || undefined,
            });
            setSuccess(`Utilisateur ${user.username} cree avec succes.`);
            setForm(initialForm);
        }
        catch (err) {
            const issues = err?.response?.data?.issues;
            if (Array.isArray(issues) && issues.length > 0) {
                const firstIssue = issues[0];
                const pathLabel = Array.isArray(firstIssue?.path) && firstIssue.path.length > 0
                    ? firstIssue.path.join(".")
                    : "champ";
                setError(`${pathLabel}: ${firstIssue?.message || "valeur invalide"}`);
            }
            else {
                setError(err?.response?.data?.message ||
                    "Echec de creation du compte utilisateur.");
            }
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="space-y-6">
      <Card className="border-white/70 bg-white/95 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Gerer les utilisateurs</CardTitle>
          <CardDescription>
            L'administrateur cree les comptes Medecin, Pharmacien et Responsable
            BI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("auth.firstName")}</p>
              <Input value={form.firstname} onChange={(event) => updateField("firstname", event.target.value)}/>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">{t("auth.lastName")}</p>
              <Input value={form.lastname} onChange={(event) => updateField("lastname", event.target.value)}/>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">{t("common.emailLabel")}</p>
              <Input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)}/>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">{t("common.usernameLabel")}</p>
              <Input value={form.username} onChange={(event) => updateField("username", event.target.value)}/>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">{t("auth.password")}</p>
              <Input type="password" value={form.password} onChange={(event) => updateField("password", event.target.value)}/>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Role</p>
              <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus:border-primary" value={form.role} onChange={(event) => updateField("role", event.target.value)}>
                {roleOptions.map((role) => (<option key={role.value} value={role.value}>
                    {role.label}
                  </option>))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <p className="text-sm font-medium">Fonction (optionnel)</p>
              <Input value={form.functionName} onChange={(event) => updateField("functionName", event.target.value)} placeholder="Exemple: PHARMACIST"/>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "Creation..." : "Enregistrer l'utilisateur"}
              </Button>
            </div>
          </form>

          {error ? (<p className="mt-4 text-sm text-destructive">{error}</p>) : null}
          {success ? (<p className="mt-4 text-sm text-emerald-700">{success}</p>) : null}
        </CardContent>
      </Card>
    </div>);
}
