import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchInternalDeliveryById } from "@/api/supply-flow";
import {
  DetailBackLink,
  DetailHero,
  DetailSection,
  DetailStatCard,
  DetailStatGrid,
  formatDetailValue,
} from "@/components/ui/detail-view";
import { EmptyState } from "@/components/ui/EmptyState";
import type { InternalDelivery } from "@/types/supply-flow";

export default function InternalDeliveryDetails() {
  const { id } = useParams();
  const [item, setItem] = useState<InternalDelivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const parsed = Number(id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setError("Invalid internal delivery id.");
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchInternalDeliveryById(parsed);
        if (active) setItem(data);
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message || "Failed to load internal delivery.");
          setItem(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="space-y-6">
      <DetailBackLink to="/app/internal-deliveries" label="Back to internal deliveries" />
      {loading && <div className="rounded-3xl border border-border bg-white p-8 text-center text-muted-foreground shadow-sm">Loading internal delivery...</div>}
      {error && !loading && <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">{error}</div>}
      {item && !loading && !error && (
        <>
          <DetailHero
            eyebrow="Distribution"
            title={String(item.delivery_number || `Internal delivery #${item.internal_delivery_id}`)}
            description="Use this view to understand destination, linked internal order, and missing quantities without digging through a dense table first."
            badge={`${item.lines.length} line${item.lines.length === 1 ? "" : "s"}`}
          />
          <DetailStatGrid>
            <DetailStatCard label="Delivery date" value={item.date_delivery ? new Date(item.date_delivery).toLocaleString() : "Not available"} emphasis />
            <DetailStatCard label="Customer" value={`${formatDetailValue(item.customer_id, "-")} / ${formatDetailValue(item.customer_label, "-")}`} />
            <DetailStatCard label="Location / state" value={`${formatDetailValue(item.location_label, "-")} / ${formatDetailValue(item.state_label, "-")}`} />
            <DetailStatCard label="User" value={formatDetailValue(item.username)} />
          </DetailStatGrid>
          <DetailStatGrid>
            <DetailStatCard label="Internal order" value={`${formatDetailValue(item.internal_order_id, "-")} / ${formatDetailValue(item.internal_order_number, "-")}`} />
            <DetailStatCard label="Day ID" value={formatDetailValue(item.day_id, "-")} />
            <DetailStatCard label="Record ID" value={formatDetailValue(item.internal_delivery_id, "-")} />
            <DetailStatCard label="Lines" value={item.lines.length} emphasis />
          </DetailStatGrid>
          <DetailSection title="Internal delivery lines" description="The table below keeps quantities and missing values easy to scan for distribution follow-up.">
            {item.lines.length === 0 ? (
              <EmptyState className="m-6 border-0 bg-muted/20 shadow-none" />
            ) : (
            <div className="overflow-x-auto">
            <table className="table-auto w-full border-collapse text-sm">
              <thead className="bg-slate-50"><tr className="text-left"><th className="px-4 py-3 text-sm font-semibold">Line ID</th><th className="px-4 py-3 text-sm font-semibold">Product</th><th className="px-4 py-3 text-sm font-semibold">Lot</th><th className="px-4 py-3 text-sm font-semibold">QTE</th><th className="px-4 py-3 text-sm font-semibold">Missing QTE</th></tr></thead>
              <tbody>
                {item.lines.map((line) => (
                  <tr key={line.line_id} className="border-t border-slate-200 hover:bg-emerald-50/30">
                    <td className="px-4 py-3 font-medium">{line.line_id}</td>
                    <td className="px-4 py-3"><div className="font-medium text-slate-900">{formatDetailValue(line.product_lib)}</div><div className="text-xs text-slate-500">Product ID: {formatDetailValue(line.product_id, "-")}</div></td>
                    <td className="px-4 py-3"><div className="font-medium text-slate-900">{formatDetailValue(line.lot_label)}</div><div className="text-xs text-slate-500">Lot ID: {formatDetailValue(line.lot_id, "-")}</div></td>
                    <td className="px-4 py-3">{line.qte}</td>
                    <td className="px-4 py-3">{line.missing_qte}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            )}
          </DetailSection>
        </>
      )}
    </div>
  );
}
