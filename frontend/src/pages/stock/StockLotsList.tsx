import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchStockLots } from "@/api/stock";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/Pagination";
import { createDefaultPagination, parsePageParam, parsePageSizeParam } from "@/lib/pagination";
import type { PaginationMeta } from "@/types/pagination";
import type { StockLotRecord } from "@/types/stock";

function parsePositiveInt(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export default function StockLotsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [productId, setProductId] = useState(searchParams.get("product_id") || "");
  const [emplacementId, setEmplacementId] = useState(searchParams.get("emplacement_id") || "");
  const [lotId, setLotId] = useState(searchParams.get("lot_id") || "");
  const [items, setItems] = useState<StockLotRecord[]>([]);
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
        const result = await fetchStockLots({
          product_id: parsePositiveInt(searchParams.get("product_id") || ""),
          emplacement_id: parsePositiveInt(searchParams.get("emplacement_id") || ""),
          lot_id: parsePositiveInt(searchParams.get("lot_id") || ""),
          page: currentPage,
          pageSize: currentPageSize,
        });
        if (active) {
          setItems(result.items);
          setPagination(result.pagination);
        }
      } catch (err: any) {
        if (active) setError(err?.response?.data?.message || "Failed to load stock lots.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [searchParams, currentPage, currentPageSize]);

  const applyFilters = () => {
    const next = new URLSearchParams();
    if (productId.trim()) next.set("product_id", productId.trim());
    if (emplacementId.trim()) next.set("emplacement_id", emplacementId.trim());
    if (lotId.trim()) next.set("lot_id", lotId.trim());
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
            <p className="text-sm font-medium">Product ID</p>
            <Input value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="e.g. 92114" />
          </div>
          <div className="col-span-2 space-y-2 md:col-span-1">
            <p className="text-sm font-medium">Emplacement ID</p>
            <Input value={emplacementId} onChange={(e) => setEmplacementId(e.target.value)} placeholder="e.g. 1" />
          </div>
          <div className="col-span-2 space-y-2 md:col-span-1">
            <p className="text-sm font-medium">Lot ID</p>
            <Input value={lotId} onChange={(e) => setLotId(e.target.value)} placeholder="e.g. 3949707" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              setProductId("");
              setEmplacementId("");
              setLotId("");
              setSearchParams(new URLSearchParams({ page: "1", pageSize: String(currentPageSize) }));
            }}
          >
            Reset
          </Button>
          <Button className="rounded-xl" onClick={applyFilters}>
            Apply
          </Button>
        </div>
      </div>

      {loading && <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground shadow-sm">Loading stock lots...</div>}
      {error && !loading && <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">{error}</div>}
      {!loading && !error && items.length === 0 && <EmptyState description="No data found for the current filters." />}
      {!loading && !error && items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="table-auto w-full border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-sm font-semibold">Stock lot ID</th>
                  <th className="px-4 py-3 text-sm font-semibold">Product</th>
                  <th className="px-4 py-3 text-sm font-semibold">Lot ID</th>
                  <th className="px-4 py-3 text-sm font-semibold">Lot label</th>
                  <th className="px-4 py-3 text-sm font-semibold">State</th>
                  <th className="px-4 py-3 text-sm font-semibold">Date refusal</th>
                  <th className="px-4 py-3 text-sm font-semibold">Quantity</th>
                  <th className="px-4 py-3 text-sm font-semibold">Emplacement</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.stock_lot_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{item.stock_lot_id}</td>
                    <td className="px-4 py-3">{item.product_lib || "Not available"}</td>
                    <td className="px-4 py-3">{item.lot_id ?? "Not available"}</td>
                    <td className="px-4 py-3">{item.lot_label || "Not available"}</td>
                    <td className="px-4 py-3">{item.lot_state ?? "Not available"}</td>
                    <td className="px-4 py-3">
                      {item.date_refusal ? new Date(item.date_refusal).toLocaleDateString() : "Not available"}
                    </td>
                    <td className="px-4 py-3">{item.quantity}</td>
                    <td className="px-4 py-3">
                      {item.emplacement_id ?? "Not available"} / {item.emplacement_label || "Not available"}
                    </td>
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
