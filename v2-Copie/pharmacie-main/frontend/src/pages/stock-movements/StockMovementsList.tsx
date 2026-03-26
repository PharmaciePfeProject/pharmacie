import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchStockMovements } from "@/api/stock-movements";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/Pagination";
import { createDefaultPagination, parsePageParam, parsePageSizeParam } from "@/lib/pagination";
import type { PaginationMeta } from "@/types/pagination";
import type { StockMovement } from "@/types/stock-movements";

function parsePositiveInt(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export default function StockMovementsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [productId, setProductId] = useState(searchParams.get("product_id") || "");
  const [emplacementId, setEmplacementId] = useState(searchParams.get("emplacement_id") || "");
  const [referenceTypeId, setReferenceTypeId] = useState(searchParams.get("reference_type_id") || "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("date_from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("date_to") || "");
  const [items, setItems] = useState<StockMovement[]>([]);
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
      } catch (err: any) {
        if (active) setError(err?.response?.data?.message || "Failed to load stock movements.");
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
    if (referenceTypeId.trim()) next.set("reference_type_id", referenceTypeId.trim());
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
          <div className="space-y-2">
            <p className="text-sm font-medium">Product ID</p>
            <Input value={productId} onChange={(e) => setProductId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Location ID</p>
            <Input value={emplacementId} onChange={(e) => setEmplacementId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Reference type ID</p>
            <Input value={referenceTypeId} onChange={(e) => setReferenceTypeId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Date from</p>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Date to</p>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              setProductId("");
              setEmplacementId("");
              setReferenceTypeId("");
              setDateFrom("");
              setDateTo("");
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

      {loading && <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground shadow-sm">Loading stock movements...</div>}
      {error && !loading && <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">{error}</div>}
      {!loading && !error && items.length === 0 && <EmptyState description="No data found for the current filters." />}
      {!loading && !error && items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="table-auto w-full border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-sm font-semibold">Movement ID</th>
                  <th className="px-4 py-3 text-sm font-semibold">Number</th>
                  <th className="px-4 py-3 text-sm font-semibold">Date</th>
                  <th className="px-4 py-3 text-sm font-semibold">Type</th>
                  <th className="px-4 py-3 text-sm font-semibold">Reference type</th>
                  <th className="px-4 py-3 text-sm font-semibold">Location</th>
                  <th className="px-4 py-3 text-sm font-semibold">User</th>
                  <th className="px-4 py-3 text-sm font-semibold">Lines</th>
                  <th className="px-4 py-3 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.movement_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{item.movement_id}</td>
                    <td className="px-4 py-3">{item.num_movement || "Not available"}</td>
                    <td className="px-4 py-3">
                      {item.date_movement ? new Date(item.date_movement).toLocaleString() : "Not available"}
                    </td>
                    <td className="px-4 py-3">{item.type_mvt || "Not available"}</td>
                    <td className="px-4 py-3">
                      {item.reference_type_id ?? "Not available"} / {item.reference_type_label || "Not available"}
                    </td>
                    <td className="px-4 py-3">
                      {item.location_id ?? "Not available"} / {item.location_label || "Not available"}
                    </td>
                    <td className="px-4 py-3">{item.username || "Not available"}</td>
                    <td className="px-4 py-3">{item.lines.length}</td>
                    <td className="px-4 py-3">
                      <Link to={`/app/stock-movements/${item.movement_id}`}>
                        <Button size="sm" variant="outline" className="rounded-xl">
                          View
                        </Button>
                      </Link>
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
