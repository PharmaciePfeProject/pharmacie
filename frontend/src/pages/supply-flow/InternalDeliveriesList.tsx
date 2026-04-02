import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchInternalDeliveries } from "@/api/supply-flow";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/Pagination";
import { useLanguage } from "@/i18n/LanguageContext";
import { createDefaultPagination, parsePageParam, parsePageSizeParam } from "@/lib/pagination";
import type { PaginationMeta } from "@/types/pagination";
import type { InternalDelivery } from "@/types/supply-flow";

function parsePositiveInt(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export default function InternalDeliveriesList() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [productId, setProductId] = useState(searchParams.get("product_id") || "");
  const [locationId, setLocationId] = useState(searchParams.get("location_id") || "");
  const [stateId, setStateId] = useState(searchParams.get("state_id") || "");
  const [userId, setUserId] = useState(searchParams.get("user_id") || "");
  const [customerId, setCustomerId] = useState(searchParams.get("customer_id") || "");
  const [internalOrderId, setInternalOrderId] = useState(searchParams.get("internal_order_id") || "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("date_from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("date_to") || "");
  const [items, setItems] = useState<InternalDelivery[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(createDefaultPagination());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentPage = parsePageParam(searchParams.get("page"));
  const currentPageSize = parsePageSizeParam(searchParams.get("pageSize"));

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchInternalDeliveries({
          product_id: parsePositiveInt(searchParams.get("product_id") || ""),
          location_id: parsePositiveInt(searchParams.get("location_id") || ""),
          state_id: parsePositiveInt(searchParams.get("state_id") || ""),
          user_id: parsePositiveInt(searchParams.get("user_id") || ""),
          customer_id: parsePositiveInt(searchParams.get("customer_id") || ""),
          internal_order_id: parsePositiveInt(searchParams.get("internal_order_id") || ""),
          date_from: searchParams.get("date_from") || undefined,
          date_to: searchParams.get("date_to") || undefined,
          page: currentPage,
          pageSize: currentPageSize,
        });
        if (active) {
          setItems(result.items);
          setPagination(result.pagination);
        }
      } catch (err: any) {
        if (active) setError(err?.response?.data?.message || t("internalDeliveries.loading"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [searchParams, currentPage, currentPageSize, t]);

  const applyFilters = () => {
    const next = new URLSearchParams();
    if (productId.trim()) next.set("product_id", productId.trim());
    if (locationId.trim()) next.set("location_id", locationId.trim());
    if (stateId.trim()) next.set("state_id", stateId.trim());
    if (userId.trim()) next.set("user_id", userId.trim());
    if (customerId.trim()) next.set("customer_id", customerId.trim());
    if (internalOrderId.trim()) next.set("internal_order_id", internalOrderId.trim());
    if (dateFrom.trim()) next.set("date_from", dateFrom.trim());
    if (dateTo.trim()) next.set("date_to", dateTo.trim());
    next.set("page", "1");
    next.set("pageSize", String(currentPageSize));
    setSearchParams(next);
  };

  const updatePagination = (page: number, pageSize = currentPageSize) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(page));
    next.set("pageSize", String(pageSize));
    setSearchParams(next);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-2"><p className="text-sm font-medium">{t("common.productId")}</p><Input value={productId} onChange={(e) => setProductId(e.target.value)} /></div>
          <div className="space-y-2"><p className="text-sm font-medium">{t("common.locationId")}</p><Input value={locationId} onChange={(e) => setLocationId(e.target.value)} /></div>
          <div className="space-y-2"><p className="text-sm font-medium">{t("common.stateId")}</p><Input value={stateId} onChange={(e) => setStateId(e.target.value)} /></div>
          <div className="space-y-2"><p className="text-sm font-medium">{t("common.user")} ID</p><Input value={userId} onChange={(e) => setUserId(e.target.value)} /></div>
          <div className="space-y-2"><p className="text-sm font-medium">{t("internalDeliveries.customerId")}</p><Input value={customerId} onChange={(e) => setCustomerId(e.target.value)} /></div>
          <div className="space-y-2"><p className="text-sm font-medium">{t("internalDeliveries.internalOrderId")}</p><Input value={internalOrderId} onChange={(e) => setInternalOrderId(e.target.value)} /></div>
          <div className="space-y-2"><p className="text-sm font-medium">{t("common.dateFrom")}</p><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full" /></div>
          <div className="space-y-2"><p className="text-sm font-medium">{t("common.dateTo")}</p><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full" /></div>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" className="rounded-xl" onClick={() => { setProductId(""); setLocationId(""); setStateId(""); setUserId(""); setCustomerId(""); setInternalOrderId(""); setDateFrom(""); setDateTo(""); setSearchParams(new URLSearchParams({ page: "1", pageSize: String(currentPageSize) })); }}>{t("common.reset")}</Button>
          <Button className="rounded-xl" onClick={applyFilters}>{t("common.apply")}</Button>
        </div>
      </div>

      {loading && <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground shadow-sm">{t("internalDeliveries.loading")}</div>}
      {error && !loading && <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">{error}</div>}
      {!loading && !error && items.length === 0 && <EmptyState description={t("empty.description")} />}
      {!loading && !error && items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="table-auto w-full border-collapse text-sm">
              <thead className="bg-muted/50"><tr className="text-left"><th className="px-4 py-3 text-sm font-semibold">{t("externalOrders.id")}</th><th className="px-4 py-3 text-sm font-semibold">{t("common.number")}</th><th className="px-4 py-3 text-sm font-semibold">{t("common.date")}</th><th className="px-4 py-3 text-sm font-semibold">{t("internalDeliveries.customer")}</th><th className="px-4 py-3 text-sm font-semibold">{t("internalDeliveries.internalOrder")}</th><th className="px-4 py-3 text-sm font-semibold">{t("common.location")}</th><th className="px-4 py-3 text-sm font-semibold">{t("common.state")}</th><th className="px-4 py-3 text-sm font-semibold">{t("common.user")}</th><th className="px-4 py-3 text-sm font-semibold">{t("common.lines")}</th><th className="px-4 py-3 text-sm font-semibold">{t("common.actions")}</th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.internal_delivery_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{item.internal_delivery_id}</td>
                    <td className="px-4 py-3">{item.delivery_number || t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{item.date_delivery ? new Date(item.date_delivery).toLocaleString() : t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{item.customer_id ?? t("common.notAvailable")} / {item.customer_label || t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{item.internal_order_id ?? t("common.notAvailable")} / {item.internal_order_number || t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{item.location_id ?? t("common.notAvailable")} / {item.location_label || t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{item.state_id ?? t("common.notAvailable")} / {item.state_label || t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{item.username || t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{item.lines.length}</td>
                    <td className="px-4 py-3"><Link to={`/app/internal-deliveries/${item.internal_delivery_id}`}><Button size="sm" variant="outline" className="rounded-xl">{t("common.view")}</Button></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            onPrevious={() => updatePagination(Math.max(1, pagination.page - 1))}
            onNext={() => updatePagination(Math.min(pagination.totalPages, pagination.page + 1))}
            onPageSizeChange={(pageSize) => updatePagination(1, pageSize)}
          />
        </>
      )}
    </div>
  );
}
