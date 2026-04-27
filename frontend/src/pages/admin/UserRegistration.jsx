import { useEffect, useState } from "react";
import { fetchLocations } from "@/api/references";
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
    doctorSpecialty: "",
  assignedLocationId: "",
};
const roleOptions = [
    { value: "MEDECIN", label: "Medecin" },
    { value: "PHARMACIEN", label: "Pharmacien" },
    { value: "RESPONSABLE_REPORTING", label: "Responsable BI" },
];
const pharmacistFunctionOptions = [
  { value: "PRESCRIPTIONS", label: "Prescriptions" },
  { value: "DEPOT", label: "Depot" },
];
export default function UserRegistration() {
    const { t } = useLanguage();
    const [form, setForm] = useState(initialForm);
  const [locations, setLocations] = useState([]);
    const [locationsLoading, setLocationsLoading] = useState(true);
    const [locationsLoadError, setLocationsLoadError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const mustChooseDepot =
      form.role === "PHARMACIEN" && form.functionName === "DEPOT";
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLocationsLoading(true);
        setLocationsLoadError(false);
        const data = await fetchLocations();
        if (active) {
          setLocations(data);
        }
      }
      catch {
        if (active) {
          setLocations([]);
          setLocationsLoadError(true);
        }
      }
      finally {
        if (active) {
          setLocationsLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);
    const updateField = (field, value) => {
      setForm((prev) => {
        if (field === "role") {
          const next = {
            ...prev,
            role: value,
          };

          if (value !== "PHARMACIEN") {
            next.functionName = "";
            next.assignedLocationId = "";
          }

          if (value !== "MEDECIN") {
            next.doctorSpecialty = "";
          }

          return next;
        }

        if (field === "functionName") {
          const next = {
            ...prev,
            functionName: value,
          };

          if (value !== "DEPOT") {
            next.assignedLocationId = "";
          }

          return next;
        }

        return { ...prev, [field]: value };
      });
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
        if (form.role === "PHARMACIEN") {
          if (!form.functionName) {
            setError("Veuillez choisir la fonction du pharmacien (Prescriptions ou Depot).");
            return;
          }
          if (mustChooseDepot && !form.assignedLocationId) {
            setError("Veuillez choisir le depot du pharmacien.");
            return;
          }
        }
        if (form.role === "MEDECIN" && !form.doctorSpecialty.trim()) {
          setError("Veuillez renseigner la specialite du medecin.");
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
                functionName: form.role === "PHARMACIEN"
                  ? form.functionName
                  : form.functionName.trim() || undefined,
                doctorSpecialty: form.role === "MEDECIN"
                  ? form.doctorSpecialty.trim()
                  : undefined,
                assignedLocationId: mustChooseDepot ? Number(form.assignedLocationId) : undefined,
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

            {form.role === "PHARMACIEN" ? (<div className="space-y-2 md:col-span-2">
                <p className="text-sm font-medium">Fonction du pharmacien</p>
                <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus:border-primary" value={form.functionName} onChange={(event) => updateField("functionName", event.target.value)}>
                  <option value="">Selectionner une fonction</option>
                  {pharmacistFunctionOptions.map((option) => (<option key={option.value} value={option.value}>
                      {option.label}
                    </option>))}
                </select>
              </div>) : null}

            {mustChooseDepot ? (<div className="space-y-2 md:col-span-2">
                <p className="text-sm font-medium">Depot du pharmacien</p>
                <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus:border-primary" value={form.assignedLocationId} onChange={(event) => updateField("assignedLocationId", event.target.value)}>
                  <option value="">Selectionner un depot</option>
                  {locations.map((location) => (<option key={location.location_id} value={location.location_id}>
                      {location.location_id} / {location.lib || "Depot"}
                    </option>))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {locationsLoading
                      ? "Chargement des depots..."
                      : locationsLoadError
                          ? "Impossible de charger les depots. Verifiez les permissions/API."
                          : `${locations.length} depot(s) disponible(s) selon la base de donnees.`}
                </p>
              </div>) : null}

            {form.role === "MEDECIN" ? (<div className="space-y-2 md:col-span-2">
                <p className="text-sm font-medium">Specialite du medecin</p>
                <Input value={form.doctorSpecialty} onChange={(event) => updateField("doctorSpecialty", event.target.value)} placeholder="Exemple: Cardiologie"/>
              </div>) : null}

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
