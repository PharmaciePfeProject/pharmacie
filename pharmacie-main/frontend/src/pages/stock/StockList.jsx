import { Fragment, useEffect, useState } from "react";
import { Boxes, MapPin, PackageSearch } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { fetchStock, fetchStockLots } from "@/api/stock";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/Pagination";
import { useLanguage } from "@/i18n/LanguageContext";
import { createDefaultPagination, parsePageParam, parsePageSizeParam } from "@/lib/pagination";
function parsePositiveInt(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
export default function StockList() {
    const { t } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();
    const [productId, setProductId] = useState(searchParams.get("product_id") || "");
    const [emplacementId, setEmplacementId] = useState(searchParams.get("emplacement_id") || "");
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState(createDefaultPagination());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openedStockId, setOpenedStockId] = useState(null);
    const [lotsLoading, setLotsLoading] = useState(false);
    const [lotsError, setLotsError] = useState(null);
    const [lotsRows, setLotsRows] = useState([]);
    const currentPage = parsePageParam(searchParams.get("page"));
    const currentPageSize = parsePageSizeParam(searchParams.get("pageSize"));
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                const result = await fetchStock({
                    product_id: parsePositiveInt(searchParams.get("product_id") || ""),
                    emplacement_id: parsePositiveInt(searchParams.get("emplacement_id") || ""),
                    page: currentPage,
                    pageSize: currentPageSize,
                });
                if (active) {
                    setItems(result.items);
                    setPagination(result.pagination);
                }
            }
            catch (err) {
                if (active)
                    setError(err?.response?.data?.message || t("stock.loading"));
            }
            finally {
                if (active)
                    setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [searchParams, currentPage, currentPageSize, t]);
    const applyFilters = () => {
        const next = new URLSearchParams();
        if (productId.trim())
            next.set("product_id", productId.trim());
        if (emplacementId.trim())
            next.set("emplacement_id", emplacementId.trim());
        next.set("page", "1");
        next.set("pageSize", String(currentPageSize));
        setSearchParams(next);
    };
    const updatePagination = (page, pageSize = currentPageSize) => {
        const next = new URLSearchParams(searchParams);
        next.set("page", String(page));
        next.set("pageSize", String(pageSize));
        setSearchParams(next);
    };
    const toggleLotsDetails = async (stockRow) => {
        if (openedStockId === stockRow.stock_id) {
            setOpenedStockId(null);
            setLotsRows([]);
            setLotsError(null);
            return;
        }
        setOpenedStockId(stockRow.stock_id);
        setLotsRows([]);
        setLotsError(null);
        setLotsLoading(true);
        try {
            const result = await fetchStockLots({
                product_id: stockRow.product_id || undefined,
                emplacement_id: stockRow.emplacement_id || undefined,
                page: 1,
                pageSize: 20,
            });
            setLotsRows(result.items || []);
        }
        catch (err) {
            setLotsError(err?.response?.data?.message || t("stockLots.loading"));
        }
        finally {
            setLotsLoading(false);
        }
    };
    return (<div className="space-y-6">
      <Card className="overflow-hidden border-white/70 bg-white/95 shadow-sm">
        <CardContent className="space-y-5 p-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Boxes className="h-4 w-4 text-primary"/>
                {t("page.stock.title")}
              </div>
              <p className="mt-3 text-2xl font-semibold">{pagination.total}</p>
              <p className="text-sm text-muted-foreground">{t("stock.summary.rows")}</p>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <PackageSearch className="h-4 w-4 text-primary"/>
                {t("common.productId")}
              </div>
              <p className="mt-3 text-sm font-medium text-slate-900">{productId || t("common.all")}</p>
              <p className="text-sm text-muted-foreground">{t("stock.summary.product")}</p>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary"/>
                {t("common.locationId")}
              </div>
              <p className="mt-3 text-sm font-medium text-slate-900">{emplacementId || t("common.all")}</p>
              <p className="text-sm text-muted-foreground">{t("stock.summary.location")}</p>
            </div>
          </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 space-y-2 md:col-span-1">
            <p className="text-sm font-medium">{t("common.productId")}</p>
            <Input value={productId} onChange={(e) => setProductId(e.target.value)} placeholder={t("stock.productPlaceholder")}/>
          </div>
          <div className="col-span-2 space-y-2 md:col-span-1">
            <p className="text-sm font-medium">{t("common.locationId")}</p>
            <Input value={emplacementId} onChange={(e) => setEmplacementId(e.target.value)} placeholder={t("stock.locationPlaceholder")}/>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" className="rounded-xl" onClick={() => {
            setProductId("");
            setEmplacementId("");
            setSearchParams(new URLSearchParams({ page: "1", pageSize: String(currentPageSize) }));
        }}>
            {t("common.reset")}
          </Button>
          <Button className="rounded-xl" onClick={applyFilters}>
            {t("common.apply")}
          </Button>
        </div>
        </CardContent>
      </Card>

      {loading && <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground shadow-sm">{t("stock.loading")}</div>}
      {error && !loading && <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">{error}</div>}
      {!loading && !error && items.length === 0 && <EmptyState description={t("empty.description")}/>}
      {!loading && !error && items.length > 0 && (<>
          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b bg-slate-50/80 px-4 py-3">
              <div className="text-sm font-medium text-slate-700">{t("stock.table.title")}</div>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {pagination.total} {t("stock.table.rows")}
              </span>
            </div>
            <div className="overflow-x-auto">
            <table className="table-auto w-full border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-sm font-semibold">{t("stock.stockId")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.product")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.barcode")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.quantity")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("stock.locker")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.locationId")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.location")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (<Fragment key={item.stock_id}>
                    <tr className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{item.stock_id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{item.product_lib || t("common.notAvailable")}</div>
                        <div className="text-xs text-muted-foreground">{item.product_id ?? t("common.notAvailable")}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{item.product_bar_code || t("common.notAvailable")}</td>
                      <td className="px-4 py-3">{item.quantity}</td>
                      <td className="px-4 py-3">{item.locker || t("common.notAvailable")}</td>
                      <td className="px-4 py-3">{item.emplacement_id ?? t("common.notAvailable")}</td>
                      <td className="px-4 py-3">{item.emplacement_label || t("common.notAvailable")}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => toggleLotsDetails(item)}>
                          {openedStockId === item.stock_id ? t("stock.hideLots") : t("stock.viewLots")}
                        </Button>
                      </td>
                    </tr>
                    {openedStockId === item.stock_id && (<tr className="border-t bg-muted/20">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="rounded-xl border bg-white p-4">
                            <p className="mb-3 text-sm font-semibold text-slate-800">{t("stock.lotsDetailsTitle")}</p>
                            {lotsLoading && <p className="text-sm text-muted-foreground">{t("stockLots.loading")}</p>}
                            {!lotsLoading && lotsError && <p className="text-sm text-destructive">{lotsError}</p>}
                            {!lotsLoading && !lotsError && lotsRows.length === 0 && (<p className="text-sm text-muted-foreground">{t("stock.noLotsFound")}</p>)}
                            {!lotsLoading && !lotsError && lotsRows.length > 0 && (<div className="overflow-x-auto">
                                <table className="table-auto w-full border-collapse text-sm">
                                  <thead className="bg-muted/50">
                                    <tr className="text-left">
                                      <th className="px-3 py-2 text-xs font-semibold">{t("stockLots.stockLotId")}</th>
                                      <th className="px-3 py-2 text-xs font-semibold">{t("stockLots.lotId")}</th>
                                      <th className="px-3 py-2 text-xs font-semibold">{t("stockLots.lotLabel")}</th>
                                      <th className="px-3 py-2 text-xs font-semibold">{t("stockLots.state")}</th>
                                      <th className="px-3 py-2 text-xs font-semibold">{t("common.quantity")}</th>
                                      <th className="px-3 py-2 text-xs font-semibold">{t("stockLots.dateRefusal")}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {lotsRows.map((lot) => (<tr key={lot.stock_lot_id} className="border-t hover:bg-gray-50">
                                        <td className="px-3 py-2">{lot.stock_lot_id}</td>
                                        <td className="px-3 py-2">{lot.lot_id ?? t("common.notAvailable")}</td>
                                        <td className="px-3 py-2">{lot.lot_label || t("common.notAvailable")}</td>
                                        <td className="px-3 py-2">{lot.lot_state ?? t("common.notAvailable")}</td>
                                        <td className="px-3 py-2">{lot.quantity}</td>
                                        <td className="px-3 py-2">
                                          {lot.date_refusal
                                    ? new Date(lot.date_refusal).toLocaleDateString()
                                    : t("common.notAvailable")}
                                        </td>
                                      </tr>))}
                                  </tbody>
                                </table>
                              </div>)}
                          </div>
                        </td>
                    </tr>)}
                  </Fragment>))}
              </tbody>
            </table>
            </div>
          </div>
          <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} pageSize={pagination.pageSize} onPrevious={() => updatePagination(Math.max(1, pagination.page - 1))} onNext={() => updatePagination(Math.min(pagination.totalPages, pagination.page + 1))} onPageSizeChange={(pageSize) => updatePagination(1, pageSize)}/>
        </>)}
    </div>);
}
