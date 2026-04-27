import { useEffect, useState } from "react";
import { Activity, CalendarRange, Pill, UserRound } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchDistributions } from "@/api/distribution";
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
export default function DistributionsList() {
    const { t } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();
    const [productId, setProductId] = useState(searchParams.get("product_id") || "");
    const [districtId, setDistrictId] = useState(searchParams.get("district_id") || "");
    const [emplacementId, setEmplacementId] = useState(searchParams.get("emplacement_id") || "");
    const [userId, setUserId] = useState(searchParams.get("user_id") || "");
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
                const result = await fetchDistributions({
                    product_id: parsePositiveInt(searchParams.get("product_id") || ""),
                    district_id: parsePositiveInt(searchParams.get("district_id") || ""),
                    emplacement_id: parsePositiveInt(searchParams.get("emplacement_id") || ""),
                    user_id: parsePositiveInt(searchParams.get("user_id") || ""),
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
                    setError(err?.response?.data?.message || t("distributions.loading"));
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
        if (districtId.trim())
            next.set("district_id", districtId.trim());
        if (emplacementId.trim())
            next.set("emplacement_id", emplacementId.trim());
        if (userId.trim())
            next.set("user_id", userId.trim());
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
      <Card className="overflow-hidden border-white/70 bg-white/95 shadow-sm">
        <CardContent className="space-y-5 p-5">
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4 text-primary"/>
                {t("page.distributions.title")}
              </div>
              <p className="mt-3 text-2xl font-semibold">{pagination.total}</p>
              <p className="text-sm text-muted-foreground">{t("distributions.summary.records")}</p>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Pill className="h-4 w-4 text-primary"/>
                {t("common.productId")}
              </div>
              <p className="mt-3 text-sm font-medium text-slate-900">{productId || t("common.all")}</p>
              <p className="text-sm text-muted-foreground">{t("distributions.summary.product")}</p>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserRound className="h-4 w-4 text-primary"/>
                {t("common.user")}
              </div>
              <p className="mt-3 text-sm font-medium text-slate-900">{userId || t("common.all")}</p>
              <p className="text-sm text-muted-foreground">{t("distributions.summary.user")}</p>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarRange className="h-4 w-4 text-primary"/>
                {t("common.date")}
              </div>
              <p className="mt-3 text-sm font-medium text-slate-900">
                {dateFrom || t("common.all")} - {dateTo || t("common.all")}
              </p>
              <p className="text-sm text-muted-foreground">{t("distributions.summary.date")}</p>
            </div>
          </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-2"><p className="text-sm font-medium">{t("common.productId")}</p><Input value={productId} onChange={(e) => setProductId(e.target.value)}/></div>
          <div className="space-y-2"><p className="text-sm font-medium">{t("distributions.districtId")}</p><Input value={districtId} onChange={(e) => setDistrictId(e.target.value)}/></div>
          <div className="space-y-2"><p className="text-sm font-medium">{t("common.locationId")}</p><Input value={emplacementId} onChange={(e) => setEmplacementId(e.target.value)}/></div>
          <div className="space-y-2"><p className="text-sm font-medium">{t("distributions.userId")}</p><Input value={userId} onChange={(e) => setUserId(e.target.value)}/></div>
          <div className="space-y-2"><p className="text-sm font-medium">{t("common.dateFrom")}</p><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full"/></div>
          <div className="space-y-2"><p className="text-sm font-medium">{t("common.dateTo")}</p><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full"/></div>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" className="rounded-xl" onClick={() => { setProductId(""); setDistrictId(""); setEmplacementId(""); setUserId(""); setDateFrom(""); setDateTo(""); setSearchParams(new URLSearchParams({ page: "1", pageSize: String(currentPageSize) })); }}>{t("common.reset")}</Button>
          <Button className="rounded-xl" onClick={applyFilters}>{t("common.apply")}</Button>
        </div>
        </CardContent>
      </Card>

      {loading && <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground shadow-sm">{t("distributions.loading")}</div>}
      {error && !loading && <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">{error}</div>}
      {!loading && !error && items.length === 0 && <EmptyState description={t("empty.description")}/>}
      {!loading && !error && items.length > 0 && (<>
          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b bg-slate-50/80 px-4 py-3">
              <div className="text-sm font-medium text-slate-700">{t("distributions.table.title")}</div>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {pagination.total} {t("distributions.table.headers")}
              </span>
            </div>
            <div className="overflow-x-auto">
            <table className="table-auto w-full border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-sm font-semibold">{t("distributions.distributionId")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.number")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.date")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("distributions.district")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.location")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.user")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("distributions.ordonnance")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.lines")}</th>
                  <th className="px-4 py-3 text-sm font-semibold">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (<tr key={item.distribution_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{item.distribution_id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.distribution_number || t("common.notAvailable")}</div>
                      <div className="text-xs text-muted-foreground">#{item.distribution_id}</div>
                    </td>
                    <td className="px-4 py-3">{item.date_dist ? new Date(item.date_dist).toLocaleString() : t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{item.district_id ?? t("common.notAvailable")} / {item.district_label || t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{item.emplacement_id ?? t("common.notAvailable")} / {item.emplacement_label || t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{item.username || t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{item.ordonnance_id ?? t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{item.lines.length}</td>
                    <td className="px-4 py-3"><Link to={`/app/distributions/${item.distribution_id}`}><Button size="sm" variant="outline" className="rounded-xl">{t("common.view")}</Button></Link></td>
                  </tr>))}
              </tbody>
            </table>
            </div>
          </div>
          <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} pageSize={pagination.pageSize} onPrevious={() => updatePagination(Math.max(1, pagination.page - 1))} onNext={() => updatePagination(Math.min(pagination.totalPages, pagination.page + 1))} onPageSizeChange={(pageSize) => updatePagination(1, pageSize)}/>
        </>)}
    </div>);
}
