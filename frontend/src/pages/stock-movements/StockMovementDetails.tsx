import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchStockMovementById } from "@/api/stock-movements";
import {
  DetailBackLink,
  DetailHero,
  DetailSection,
  DetailStatCard,
  DetailStatGrid,
  formatDetailValue,
} from "@/components/ui/detail-view";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLanguage } from "@/i18n/LanguageContext";
import type { StockMovement } from "@/types/stock-movements";

export default function StockMovementDetails() {
  const { t } = useLanguage();
  const { id } = useParams();
  const [item, setItem] = useState<StockMovement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const movementId = Number(id);

    if (!Number.isInteger(movementId) || movementId <= 0) {
      setError(t("movementDetails.invalidId"));
      setLoading(false);
      return;
    }

    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const movement = await fetchStockMovementById(movementId);
        if (active) {
          setItem(movement);
        }
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message || t("movementDetails.loadFailed"));
          setItem(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [id, t]);

  return (
    <div className="space-y-6">
      <DetailBackLink to="/app/stock-movements" label={t("movementDetails.back")} />

      {loading && (
        <div className="rounded-3xl border border-border bg-white p-8 text-center text-muted-foreground shadow-sm">
          {t("movementDetails.loading")}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">
          {error}
        </div>
      )}

      {item && !loading && !error && (
        <>
          <DetailHero
            eyebrow={t("page.movements.title")}
            title={String(item.num_movement || `Movement #${item.movement_id}`)}
            description={t("movementDetails.heroDescription")}
            badge={`${item.lines.length} ${item.lines.length === 1 ? t("common.line") : t("common.linesLabel")}`}
          />

          <DetailStatGrid>
            <DetailStatCard
              label={t("movementDetails.date")}
              value={item.date_movement ? new Date(item.date_movement).toLocaleString() : t("common.notAvailable")}
              emphasis
            />
            <DetailStatCard
              label={t("movementDetails.typeDiscriminator")}
              value={`${formatDetailValue(item.type_mvt, "-")} / ${formatDetailValue(item.descriminator, "-")}`}
            />
            <DetailStatCard label={t("common.user")} value={formatDetailValue(item.username)} />
            <DetailStatCard label={t("common.lines")} value={item.lines.length} emphasis />
          </DetailStatGrid>

          <DetailStatGrid>
            <DetailStatCard
              label={t("movements.referenceType")}
              value={`${formatDetailValue(item.reference_type_id, "-")} / ${formatDetailValue(item.reference_type_label, "-")}`}
            />
            <DetailStatCard
              label={t("common.location")}
              value={`${formatDetailValue(item.location_id, "-")} / ${formatDetailValue(item.location_label, "-")}`}
            />
            <DetailStatCard
              label={t("movementDetails.businessLinks")}
              value={
                <div className="space-y-1 text-sm font-medium text-slate-700">
                  <div>{t("common.dayId")}: {formatDetailValue(item.day_id, "-")}</div>
                  <div>{t("page.distributions.title")}: {formatDetailValue(item.distribution_id, "-")}</div>
                  <div>{t("page.internalDeliveries.title")}: {formatDetailValue(item.internal_delivery_id, "-")}</div>
                  <div>{t("page.receptions.title")}: {formatDetailValue(item.reception_id, "-")}</div>
                </div>
              }
            />
            <DetailStatCard label={t("common.recordId")} value={formatDetailValue(item.movement_id, "-")} />
          </DetailStatGrid>

          <DetailSection
            title={t("movementDetails.linesTitle")}
            description={t("movementDetails.linesDescription")}
          >

            {item.lines.length === 0 ? (
              <EmptyState className="m-6 border-0 bg-muted/20 shadow-none" />
            ) : (
            <div className="overflow-x-auto">
            <table className="table-auto w-full border-collapse text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.lineId")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.product")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.lot")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.quantity")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("movementDetails.motifId")}</th>
                </tr>
              </thead>
                <tbody>
                  {item.lines.map((line) => (
                  <tr key={line.line_id} className="border-t border-slate-200 hover:bg-emerald-50/30">
                    <td className="px-4 py-3 font-medium">{line.line_id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{formatDetailValue(line.product_lib)}</div>
                      <div className="text-xs text-slate-500">{t("common.productId")}: {formatDetailValue(line.product_id, "-")}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{formatDetailValue(line.lot_label)}</div>
                      <div className="text-xs text-slate-500">{t("common.lotId")}: {formatDetailValue(line.lot_id, "-")}</div>
                    </td>
                    <td className="px-4 py-3">{line.movement_qte}</td>
                    <td className="px-4 py-3">{line.motif_id ?? t("common.notAvailable")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            )}
          </DetailSection>
        </>
      )}
    </div>
  );
}
