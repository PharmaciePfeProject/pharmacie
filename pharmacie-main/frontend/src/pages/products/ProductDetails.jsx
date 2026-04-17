import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchProductById } from "@/api/products";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { DetailBackLink, DetailHero, DetailSection, DetailStatCard, DetailStatGrid, formatDetailValue, } from "@/components/ui/detail-view";
import { useLanguage } from "@/i18n/LanguageContext";
import { PERMISSIONS, hasPermission } from "@/lib/roles";
function formatDecimal(value) {
    return typeof value === "number" ? value.toFixed(3) : null;
}
export default function ProductDetails() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const canManageProducts = hasPermission(user, PERMISSIONS.PRODUCTS_MANAGE);
    const canReadStock = hasPermission(user, PERMISSIONS.STOCK_READ);
    useEffect(() => {
        const productId = Number(id);
        if (!Number.isInteger(productId) || productId <= 0) {
            setError(t("products.details.invalidId"));
            setLoading(false);
            return;
        }
        let active = true;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                const item = await fetchProductById(productId);
                if (active) {
                    setProduct(item);
                }
            }
            catch (err) {
                if (active) {
                    setError(err?.response?.data?.message || t("products.details.loadFailed"));
                    setProduct(null);
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <DetailBackLink to="/app/products" label={t("products.details.back")}/>

        <div className="flex gap-3">
          {product && canReadStock && (<Link to={`/app/stock?product_id=${product.product_id}`}>
              <Button variant="outline" className="rounded-2xl">
                {t("products.details.viewStock")}
              </Button>
            </Link>)}
          {canManageProducts && (<>
              <Link to={`/app/admin/medicines?productId=${product?.product_id}`}>
                <Button variant="outline" className="rounded-2xl">
                  {t("common.edit")}
                </Button>
              </Link>
              <Link to={`/app/admin/medicines?productId=${product?.product_id}`}>
                <Button className="rounded-2xl">{t("products.details.updateMasterData")}</Button>
              </Link>
            </>)}
        </div>
      </div>

      {loading && (<div className="rounded-3xl border border-border bg-white p-8 text-center text-muted-foreground shadow-sm">
          {t("products.details.loading")}
        </div>)}

      {error && !loading && (<div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">
          {error}
        </div>)}

      {product && !loading && !error && (<>
          <DetailHero eyebrow={t("products.table.title")} title={product.lib || t("products.details.unnamed")} description={t("products.details.description")} badge={`${t("common.product")} #${product.product_id}`}/>

          <DetailStatGrid>
            <DetailStatCard label={t("common.barcode")} value={formatDetailValue(product.bar_code, "-")}/>
            <DetailStatCard label="DCI" value={formatDetailValue(product.dci, "-")}/>
            <DetailStatCard label={t("products.price")} value={formatDetailValue(formatDecimal(product.price), t("common.notAvailable"))} emphasis/>
            <DetailStatCard label={t("products.details.vatRate")} value={typeof product.vat_rate === "number" ? `${product.vat_rate}%` : t("common.notAvailable")}/>
          </DetailStatGrid>

          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <DetailSection title={t("products.details.thresholdsTitle")} description={t("products.details.thresholdsDescription")}>
              <div className="grid gap-4 p-6 md:grid-cols-2">
                <div className="rounded-2xl bg-primary/5 p-4">
                  <p className="text-sm text-muted-foreground">{t("products.wauCost")}</p>
                  <p className="mt-1 text-3xl font-semibold text-primary">{formatDetailValue(formatDecimal(product.wau_cost), t("common.notAvailable"))}</p>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">{t("products.details.minimumStock")}</p>
                  <p className="mt-1 font-medium">{product.min_stock ?? t("common.notAvailable")}</p>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">{t("products.details.safetyStock")}</p>
                  <p className="mt-1 font-medium">{product.safety_stock ?? t("common.notAvailable")}</p>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">{t("products.warningStock")}</p>
                  <p className="mt-1 font-medium">{product.warning_stock ?? t("common.notAvailable")}</p>
                </div>
              </div>
            </DetailSection>

            <DetailSection title={t("products.details.referenceTitle")} description={t("products.details.referenceDescription")}>
              <div className="grid gap-4 p-6 md:grid-cols-2">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">{t("products.details.pharmaClassId")}</p>
                  <p className="mt-2 text-2xl font-semibold">{product.pharma_class_id ?? "-"}</p>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">{t("products.details.typeId")}</p>
                  <p className="mt-2 text-2xl font-semibold">{product.type_id ?? "-"}</p>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4 md:col-span-2">
                  <p className="text-sm text-muted-foreground">{t("products.details.scopeTitle")}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {t("products.details.scopeDescription")}
                  </p>
                </div>
              </div>
            </DetailSection>
          </div>
        </>)}
    </div>);
}
