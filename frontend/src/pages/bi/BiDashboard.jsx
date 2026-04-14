import { Link } from "react-router-dom";
import { BarChart3, ExternalLink, Presentation, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLanguage } from "@/i18n/LanguageContext";
export default function BiDashboard() {
    const { t } = useLanguage();
    const reportEmbeds = [
        {
            title: t("bi.report.stock"),
            url: import.meta.env.VITE_POWERBI_STOCK_REPORT,
        },
        {
            title: t("bi.report.consumption"),
            url: import.meta.env.VITE_POWERBI_CONSUMPTION_REPORT,
        },
        {
            title: t("bi.report.distribution"),
            url: import.meta.env.VITE_POWERBI_DISTRIBUTION_REPORT,
        },
    ];
    const availableEmbeds = reportEmbeds.filter((report) => Boolean(report.url));
    return (<div className="space-y-6">
      <Card className="border-white/70 bg-white/95 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <BarChart3 className="h-4 w-4"/>
            {t("bi.badge")}
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <CardTitle className="text-3xl">{t("bi.title")}</CardTitle>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                {t("bi.subtitle")}
              </p>
            </div>
            <div className="grid gap-3 rounded-3xl bg-muted/30 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-5 w-5 text-primary"/>
                <p className="text-sm leading-6 text-muted-foreground">
                  {t("bi.security")}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Presentation className="mt-1 h-5 w-5 text-secondary"/>
                <p className="text-sm leading-6 text-muted-foreground">
                  {t("bi.preview")}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild className="rounded-2xl">
            <Link to="/app/bi/reports">{t("bi.browseReports")}</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-2xl">
            <a href={import.meta.env.VITE_POWERBI_STOCK_REPORT || "#"} target="_blank" rel="noreferrer">
              {t("bi.openPowerBi")}
              <ExternalLink className="ml-2 h-4 w-4"/>
            </a>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
            t("bi.report.stock"),
            t("bi.report.consumption"),
            t("bi.report.distribution"),
            t("bi.report.movements"),
            t("bi.report.inventory"),
        ].map((item) => (<Card key={item} className="border-white/70 bg-white/95 shadow-sm">
            <CardContent className="flex h-full items-center p-5 text-sm font-medium text-foreground">
              {item}
            </CardContent>
          </Card>))}
      </div>

      {availableEmbeds.length === 0 && (<EmptyState title={t("bi.emptyTitle")} description={t("bi.emptyBody")} className="bg-white"/>)}

      {availableEmbeds.length > 0 && (<div className="space-y-6">
          {availableEmbeds.map((report) => (<Card key={report.title} className="border-white/70 bg-white/95 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">{report.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <iframe title={report.title} src={report.url} width="100%" height="720" className="rounded-2xl border border-border"/>
              </CardContent>
            </Card>))}
        </div>)}
    </div>);
}
