import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchStock } from "@/api/stock";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/Pagination";
import { useLanguage } from "@/i18n/LanguageContext";
import { createDefaultPagination, parsePageParam, parsePageSizeParam } from "@/lib/pagination";
import type { PaginationMeta } from "@/types/pagination";
import type { StockRecord } from "@/types/stock";

function parsePositiveInt(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export default function StockList() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [productId, setProductId] = useState(searchParams.get("product_id") || "");
  const [emplacementId, setEmplacementId] = useState(searchParams.get("emplacement_id") || "");
  const [items, setItems] = useState<StockRecord[]>([]);
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
      } catch (err: any) {
        if (active) setError(err?.response?.data?.message || t("stock.loading"));
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
    if (emplacementId.trim()) next.set("emplacement_id", emplacementId.trim());
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
          <div className="col-span-2 space-y-2 md:col-span-1">
            <p className="text-sm font-medium">{t("common.productId")}</p>
            <Input value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="e.g. 92114" />
          </div>
          <div className="col-span-2 space-y-2 md:col-span-1">
            <p className="text-sm font-medium">{t("common.locationId")}</p>
            <Input value={emplacementId} onChange={(e) => setEmplacementId(e.target.value)} placeholder="e.g. 1" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              setProductId("");
              setEmplacementId("");
              setSearchParams(new URLSearchParams({ page: "1", pageSize: String(currentPageSize) }));
            }}
          >
            {t("common.reset")}
          </Button>
          <Button className="rounded-xl" onClick={applyFilters}>
            {t("common.apply")}
          </Button>
        </div>
      </div>

      {loading && <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground shadow-sm">{t("stock.loading")}</div>}
      {error && !loading && <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">{error}</div>}
      {!loading && !error && items.length === 0 && <EmptyState description={t("empty.description")} />}
      {!loading && !error && items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
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
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.stock_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{item.stock_id}</td>
                    <td className="px-4 py-3">{item.product_lib || t("common.notAvailable")}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.product_bar_code || t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{item.quantity}</td>
                    <td className="px-4 py-3">{item.locker || t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{item.emplacement_id ?? t("common.notAvailable")}</td>
                    <td className="px-4 py-3">{item.emplacement_label || t("common.notAvailable")}</td>
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
