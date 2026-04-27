import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchDistributionById } from "@/api/distribution";
import { DetailBackLink, DetailHero, DetailSection, DetailStatCard, DetailStatGrid, formatDetailValue, } from "@/components/ui/detail-view";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLanguage } from "@/i18n/LanguageContext";
export default function DistributionDetails() {
    const { t } = useLanguage();
    const { id } = useParams();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        const distributionId = Number(id);
        if (!Number.isInteger(distributionId) || distributionId <= 0) {
            setError(t("distributionDetails.invalidId"));
            setLoading(false);
            return;
        }
        let active = true;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                const distribution = await fetchDistributionById(distributionId);
                if (active) {
                    setItem(distribution);
                }
            }
            catch (err) {
                if (active) {
                    setError(err?.response?.data?.message || t("distributionDetails.loadFailed"));
                    setItem(null);
                }
            }
            finally {
                if (active) {
                    setLoading(false);
                }
            }
        })();
        return () => {
            active = false;
        };
    }, [id, t]);
    return (<div className="space-y-6">
      <DetailBackLink to="/app/distributions" label={t("distributionDetails.back")}/>

      {loading && (<div className="rounded-3xl border border-border bg-white p-8 text-center text-muted-foreground shadow-sm">
          {t("distributionDetails.loading")}
        </div>)}

      {error && !loading && (<div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">
          {error}
        </div>)}

      {item && !loading && !error && (<>
          <DetailHero eyebrow={t("page.distributions.title")} title={String(item.distribution_number || `Distribution #${item.distribution_id}`)} description={t("distributionDetails.heroDescription")} badge={`${item.lines.length} ${item.lines.length === 1 ? t("common.line") : t("common.linesLabel")}`}/>

          <DetailStatGrid>
            <DetailStatCard label={t("distributionDetails.date")} value={item.date_dist ? new Date(item.date_dist).toLocaleString() : t("common.notAvailable")} emphasis/>
            <DetailStatCard label={t("distributions.district")} value={`${formatDetailValue(item.district_id, "-")} / ${formatDetailValue(item.district_label, "-")}`}/>
            <DetailStatCard label={t("common.user")} value={formatDetailValue(item.username)}/>
            <DetailStatCard label={t("common.lines")} value={item.lines.length} emphasis/>
          </DetailStatGrid>

          <DetailStatGrid>
            <DetailStatCard label={t("common.dayId")} value={formatDetailValue(item.day_id, "-")}/>
            <DetailStatCard label={t("common.location")} value={`${formatDetailValue(item.emplacement_id, "-")} / ${formatDetailValue(item.emplacement_label, "-")}`}/>
            <DetailStatCard label={t("distributions.ordonnance")} value={formatDetailValue(item.ordonnance_id, "-")}/>
            <DetailStatCard label={t("common.recordId")} value={formatDetailValue(item.distribution_id, "-")}/>
          </DetailStatGrid>

          <DetailSection title={t("distributionDetails.linesTitle")} description={t("distributionDetails.linesDescription")}>
            {item.lines.length === 0 ? (<EmptyState className="m-6 border-0 bg-muted/20 shadow-none"/>) : (<div className="overflow-x-auto">
            <table className="table-auto w-full border-collapse text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.lineId")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.product")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("distributionDetails.deliveredQt")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("distributionDetails.missingQt")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("distributionDetails.toDistribute")}</th>
                </tr>
              </thead>
                <tbody>
                  {item.lines.map((line) => (<tr key={line.line_id} className="border-t border-slate-200 hover:bg-emerald-50/30">
                    <td className="px-4 py-3 font-medium">{line.line_id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{formatDetailValue(line.product_lib)}</div>
                      <div className="text-xs text-slate-500">{t("common.productId")}: {formatDetailValue(line.product_id, "-")}</div>
                    </td>
                    <td className="px-4 py-3">{line.delivered_qt}</td>
                    <td className="px-4 py-3">{line.missing_qt}</td>
                    <td className="px-4 py-3">{line.to_distribute}</td>
                  </tr>))}
              </tbody>
            </table>
            </div>)}
          </DetailSection>
        </>)}
    </div>);
}
