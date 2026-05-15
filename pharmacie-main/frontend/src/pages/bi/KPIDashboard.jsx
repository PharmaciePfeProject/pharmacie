import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, ShieldCheck } from "lucide-react";

const trialUrl = "https://mohetn-my.sharepoint.com/:u:/g/personal/bourgou_mohamedkhalil_isccb_u-carthage_tn/IQDjyy7koOK6Q4PC-fC0JoAcATUYSouAWZUljUqosfWKYbc?e=IDO1jt";

export default function KPIDashboard() {
  const { language } = useLanguage();

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-900 text-white shadow-xl">
        <CardHeader className="space-y-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
            <ShieldCheck className="h-4 w-4" />
            {language === "fr" ? "Essai KPI" : "KPI trial"}
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl text-white md:text-4xl">
              {language === "fr" ? "Aperçu temporaire du dashboard" : "Temporary dashboard preview"}
            </CardTitle>
            <CardDescription className="max-w-3xl text-white/80">
              {language === "fr"
                ? "Cette page utilise votre lien SharePoint pour un essai rapide. Ce n’est pas encore le dashboard final."
                : "This page uses your SharePoint link for a quick trial. It is not the final dashboard yet."}
            </CardDescription>
          </div>
          <Button asChild className="w-fit rounded-2xl bg-white text-slate-900 hover:bg-slate-100">
            <a href={trialUrl} target="_blank" rel="noreferrer">
              {language === "fr" ? "Ouvrir le lien" : "Open link"}
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </CardHeader>
      </Card>

      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>{language === "fr" ? "Lien d’essai" : "Trial link"}</CardTitle>
          <CardDescription>
            {language === "fr"
              ? "Si l’aperçu intégré est bloqué, utilisez le bouton pour ouvrir le fichier directement."
              : "If the embedded preview is blocked, use the button to open the file directly."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-dashed bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">SharePoint</p>
            <p className="mt-2 break-all font-mono text-xs">{trialUrl}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            {language === "fr"
              ? "L’aperçu SharePoint ne peut pas être affiché dans un iframe ici. Utilisez le bouton pour l’ouvrir dans un nouvel onglet."
              : "The SharePoint preview cannot be displayed in an iframe here. Use the button to open it in a new tab."}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
