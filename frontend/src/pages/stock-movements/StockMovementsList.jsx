import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchStockMovements } from "@/api/stock-movements";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/Pagination";
import { useLanguage } from "@/i18n/LanguageContext";
import { createDefaultPagination, parsePageParam, parsePageSizeParam } from "@/lib/pagination";
function parsePositiveInt(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
export default function StockMovementsList() {
    const { t } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();
    const [productId, setProductId] = useState(searchParams.get("product_id") || "");
    const [emplacementId, setEmplacementId] = useState(searchParams.get("emplacement_id") || "");
    const [referenceTypeId, setReferenceTypeId] = useState(searchParams.get("reference_type_id") || "");
    const [dateFrom, setDateFrom] = useState(searchParams.get("date_from") || "");
    const [dateTo, setDateTo] = useState(searchParams.get("date_to") || "");
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState(createDefaultPagination());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const currentPage = parsePageParam(searchParams.get("page"));
    const currentPageSize = parsePageSizeParam(searchParams.get("pageSize"));
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                const result = await fetchStockMovements({
                    product_id: parsePositiveInt(searchParams.get("product_id") || ""),
                    emplacement_id: parsePositiveInt(searchParams.get("emplacement_id") || ""),
                    reference_type_id: parsePositiveInt(searchParams.get("reference_type_id") || ""),
                    date_from: searchParams.get("date_from") || undefined,
                    date_to: searchParams.get("date_to") || undefined,
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
                    setError(err?.response?.data?.message || t("movements.loading"));
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
        if (referenceTypeId.trim())
            next.set("reference_type_id", referenceTypeId.trim());
        if (dateFrom.trim())
            next.set("date_from", dateFrom.trim());
        if (dateTo.trim())
            next.set("date_to", dateTo.trim());
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
    return (<div className="space-y-6">
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("common.productId")}</p>
            <Input value={productId} onChange={(e) => setProductId(e.target.value)}/>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("common.locationId")}</p>
            <Input value={emplacementId} onChange={(e) => setEmplacementId(e.target.value)}/>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("movements.referenceType")}</p>
            <Input value={referenceTypeId} onChange={(e) => setReferenceTypeId(e.target.value)}/>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("common.dateFrom")}</p>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full"/>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("common.dateTo")}</p>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full"/>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" className="rounded-xl" onClick={() => {
            setProductId("");
            setEmplacementId("");
            setReferenceTypeId("");
            setDateFrom("");
            setDateTo("");
            setSearchParams(new URLSearchParams({ page: "1", pageSize: String(currentPageSize) }));
        }}>
            {t("common.reset")}
          </Button>
          <Button className="rounded-xl" onClick={applyFilters}>
            {t("common.apply")}
          </Button>
        </div>
      </div>

      {loading && <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground shadow-sm">{t("movements.loading")}</div>}
      {error && !loading && <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">{error}</div>}
      {!loading && !error && items.length === 0 && <EmptyState description={t("empty.description")}/>}
      {!loading && !error && items.length > 0 && (<>
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="table-auto w-full border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-sm font-semibold">{t("movements.movementId")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.number")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.date")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.type")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("movements.referenceType")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.location")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.user")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.lines")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (<tr key={item.movement_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{item.movement_id}</td>
                    <td className="px-4 py-3">{item.num_movement || t("common.notAvailable")}</td>
                    <td className="px-4 py-3">
                      {item.date_movement ? new Date(item.date_movement).toLocaleString() : t("common.notAvailable")}
                    </td>
                    <td className="px-4 py-3">{item.type_mvt || t("common.notAvailable")}</td>
                    <td className="px-4 py-3">
                      {item.reference_type_id ?? t("common.notAvailable")} / {item.reference_type_label || t("common.notAvailable")}
                    </td>
                    <td className="px-4 py-3">
                      {item.location_id ?? t("common.notAvailable")} / {item.location_label || t("common.notAvailable")}
                    </td>
                    <td className="px-4 py-3">{item.username || t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{item.lines.length}</td>
                    <td className="px-4 py-3">
                      <Link to={`/app/stock-movements/${item.movement_id}`}>
                        <Button size="sm" variant="outline" className="rounded-xl">
                          {t("common.view")}
                        </Button>
                      </Link>
                    </td>
                  </tr>))}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} pageSize={pagination.pageSize} onPrevious={() => updatePagination(Math.max(1, pagination.page - 1))} onNext={() => updatePagination(Math.min(pagination.totalPages, pagination.page + 1))} onPageSizeChange={(pageSize) => updatePagination(1, pageSize)}/>
        </>)}
    </div>);
}
