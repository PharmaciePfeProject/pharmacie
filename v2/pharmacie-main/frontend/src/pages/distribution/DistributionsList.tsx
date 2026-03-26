import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchDistributions } from "@/api/distribution";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/Pagination";
import { createDefaultPagination, parsePageParam, parsePageSizeParam } from "@/lib/pagination";
import type { PaginationMeta } from "@/types/pagination";
import type { Distribution } from "@/types/distribution";

function parsePositiveInt(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export default function DistributionsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [productId, setProductId] = useState(searchParams.get("product_id") || "");
  const [districtId, setDistrictId] = useState(searchParams.get("district_id") || "");
  const [emplacementId, setEmplacementId] = useState(searchParams.get("emplacement_id") || "");
  const [userId, setUserId] = useState(searchParams.get("user_id") || "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("date_from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("date_to") || "");
  const [items, setItems] = useState<Distribution[]>([]);
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
      } catch (err: any) {
        if (active) setError(err?.response?.data?.message || "Failed to load distributions.");
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
    if (districtId.trim()) next.set("district_id", districtId.trim());
    if (emplacementId.trim()) next.set("emplacement_id", emplacementId.trim());
    if (userId.trim()) next.set("user_id", userId.trim());
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
          <div className="space-y-2"><p className="text-sm font-medium">Product ID</p><Input value={productId} onChange={(e) => setProductId(e.target.value)} /></div>
          <div className="space-y-2"><p className="text-sm font-medium">District ID</p><Input value={districtId} onChange={(e) => setDistrictId(e.target.value)} /></div>
          <div className="space-y-2"><p className="text-sm font-medium">Location ID</p><Input value={emplacementId} onChange={(e) => setEmplacementId(e.target.value)} /></div>
          <div className="space-y-2"><p className="text-sm font-medium">User ID</p><Input value={userId} onChange={(e) => setUserId(e.target.value)} /></div>
          <div className="space-y-2"><p className="text-sm font-medium">Date from</p><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full" /></div>
          <div className="space-y-2"><p className="text-sm font-medium">Date to</p><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full" /></div>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" className="rounded-xl" onClick={() => { setProductId(""); setDistrictId(""); setEmplacementId(""); setUserId(""); setDateFrom(""); setDateTo(""); setSearchParams(new URLSearchParams({ page: "1", pageSize: String(currentPageSize) })); }}>Reset</Button>
          <Button className="rounded-xl" onClick={applyFilters}>Apply</Button>
        </div>
      </div>

      {loading && <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground shadow-sm">Loading distributions...</div>}
      {error && !loading && <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">{error}</div>}
      {!loading && !error && items.length === 0 && <EmptyState description="No data found for the current filters." />}
      {!loading && !error && items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="table-auto w-full border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-sm font-semibold">Distribution ID</th>
                  <th className="px-4 py-3 text-sm font-semibold">Number</th>
                  <th className="px-4 py-3 text-sm font-semibold">Date</th>
                  <th className="px-4 py-3 text-sm font-semibold">District</th>
                  <th className="px-4 py-3 text-sm font-semibold">Location</th>
                  <th className="px-4 py-3 text-sm font-semibold">User</th>
                  <th className="px-4 py-3 text-sm font-semibold">Ordonnance</th>
                  <th className="px-4 py-3 text-sm font-semibold">Lines</th>
                  <th className="px-4 py-3 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.distribution_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{item.distribution_id}</td>
                    <td className="px-4 py-3">{item.distribution_number || "Not available"}</td>
                    <td className="px-4 py-3">{item.date_dist ? new Date(item.date_dist).toLocaleString() : "Not available"}</td>
                    <td className="px-4 py-3">{item.district_id ?? "Not available"} / {item.district_label || "Not available"}</td>
                    <td className="px-4 py-3">{item.emplacement_id ?? "Not available"} / {item.emplacement_label || "Not available"}</td>
                    <td className="px-4 py-3">{item.username || "Not available"}</td>
                    <td className="px-4 py-3">{item.ordonnance_id ?? "Not available"}</td>
                    <td className="px-4 py-3">{item.lines.length}</td>
                    <td className="px-4 py-3"><Link to={`/app/distributions/${item.distribution_id}`}><Button size="sm" variant="outline" className="rounded-xl">View</Button></Link></td>
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
