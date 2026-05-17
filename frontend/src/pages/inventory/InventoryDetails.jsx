import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchInventoryById } from "@/api/inventory";
import { DetailBackLink, DetailHero, DetailSection, DetailStatCard, DetailStatGrid, formatDetailValue, } from "@/components/ui/detail-view";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLanguage } from "@/i18n/LanguageContext";
export default function InventoryDetails() {
    const { t } = useLanguage();
    const { id } = useParams();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        const inventoryId = Number(id);
        if (!Number.isInteger(inventoryId) || inventoryId <= 0) {
            setError(t("inventoryDetails.invalidId"));
            setLoading(false);
            return;
        }
        let active = true;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                const inventory = await fetchInventoryById(inventoryId);
                if (active) {
                    setItem(inventory);
                }
            }
            catch (err) {
                if (active) {
                    setError(err?.response?.data?.message || t("inventoryDetails.loadFailed"));
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
      <DetailBackLink to="/app/inventories" label={t("inventoryDetails.back")}/>

      {loading && (<div className="rounded-3xl border border-border bg-white p-8 text-center text-muted-foreground shadow-sm">
          {t("inventoryDetails.loading")}
        </div>)}

      {error && !loading && (<div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">
          {error}
        </div>)}

      {item && !loading && !error && (<>
          <DetailHero eyebrow={t("page.inventories.title")} title={String(item.date_inv ? `Inventory of ${new Date(item.date_inv).toLocaleDateString()}` : `Inventory #${item.inventory_id}`)} description={t("inventoryDetails.heroDescription")} badge={`${item.lines.length} ${item.lines.length === 1 ? t("common.line") : t("common.linesLabel")}`}/>

          <DetailStatGrid>
            <DetailStatCard label={t("inventoryDetails.date")} value={item.date_inv ? new Date(item.date_inv).toLocaleString() : t("common.notAvailable")} emphasis/>
            <DetailStatCard label={t("common.location")} value={`${formatDetailValue(item.location_id, "-")} / ${formatDetailValue(item.location_label, "-")}`}/>
            <DetailStatCard label={t("common.state")} value={`${formatDetailValue(item.state_id, "-")} / ${formatDetailValue(item.state_label, "-")}`}/>
            <DetailStatCard label={t("common.user")} value={formatDetailValue(item.username)}/>
          </DetailStatGrid>

          <DetailSection title={t("inventoryDetails.linesTitle")} description={t("inventoryDetails.linesDescription")}>
            {item.lines.length === 0 ? (<EmptyState className="m-6 border-0 bg-muted/20 shadow-none"/>) : (<div className="overflow-x-auto">
            <table className="table-auto w-full border-collapse text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.lineId")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.product")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.lot")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("inventoryDetails.inventQte")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("inventoryDetails.stockQte")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("inventoryDetails.stockQteLot")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("inventoryDetails.discard")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("products.price")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("products.vat")}</th>
                </tr>
              </thead>
                <tbody>
                  {item.lines.map((line) => (<tr key={line.line_id} className="border-t border-slate-200 hover:bg-emerald-50/30">
                    <td className="px-4 py-3 font-medium">{line.line_id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{formatDetailValue(line.product_lib)}</div>
                      <div className="text-xs text-slate-500">{t("common.productId")}: {formatDetailValue(line.product_id, "-")}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{formatDetailValue(line.lot_label)}</div>
                      <div className="text-xs text-slate-500">{t("common.lotId")}: {formatDetailValue(line.lot_id, "-")}</div>
                    </td>
                    <td className="px-4 py-3">{line.invent_qte}</td>
                    <td className="px-4 py-3">{line.stock_qte}</td>
                    <td className="px-4 py-3">{line.stock_qte_lot}</td>
                    <td className="px-4 py-3">{line.discard}</td>
                    <td className="px-4 py-3">{line.price}</td>
                    <td className="px-4 py-3">{line.vat_rate}</td>
                  </tr>))}
              </tbody>
            </table>
            </div>)}
          </DetailSection>
        </>)}
    </div>);
}
