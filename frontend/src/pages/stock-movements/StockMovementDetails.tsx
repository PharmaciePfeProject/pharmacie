import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchStockMovementById } from "@/api/stock-movements";
import {
  DetailBackLink,
  DetailHero,
  DetailSection,
  DetailStatCard,
  DetailStatGrid,
  formatDetailValue,
} from "@/components/ui/detail-view";
import { EmptyState } from "@/components/ui/EmptyState";
import type { StockMovement } from "@/types/stock-movements";

export default function StockMovementDetails() {
  const { id } = useParams();
  const [item, setItem] = useState<StockMovement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const movementId = Number(id);

    if (!Number.isInteger(movementId) || movementId <= 0) {
      setError("Invalid movement id.");
      setLoading(false);
      return;
    }

    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const movement = await fetchStockMovementById(movementId);
        if (active) {
          setItem(movement);
        }
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message || "Failed to load stock movement.");
          setItem(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="space-y-6">
      <DetailBackLink to="/app/stock-movements" label="Back to movements" />

      {loading && (
        <div className="rounded-3xl border border-border bg-white p-8 text-center text-muted-foreground shadow-sm">
          Loading stock movement...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">
          {error}
        </div>
      )}

      {item && !loading && !error && (
        <>
          <DetailHero
            eyebrow="Stock movement"
            title={String(item.num_movement || `Movement #${item.movement_id}`)}
            description="This screen separates operational context from line-level quantities so the movement can be understood quickly by a new user."
            badge={`${item.lines.length} line${item.lines.length === 1 ? "" : "s"}`}
          />

          <DetailStatGrid>
            <DetailStatCard
              label="Movement date"
              value={item.date_movement ? new Date(item.date_movement).toLocaleString() : "Not available"}
              emphasis
            />
            <DetailStatCard
              label="Type / discriminator"
              value={`${formatDetailValue(item.type_mvt, "-")} / ${formatDetailValue(item.descriminator, "-")}`}
            />
            <DetailStatCard label="User" value={formatDetailValue(item.username)} />
            <DetailStatCard label="Lines" value={item.lines.length} emphasis />
          </DetailStatGrid>

          <DetailStatGrid>
            <DetailStatCard
              label="Reference type"
              value={`${formatDetailValue(item.reference_type_id, "-")} / ${formatDetailValue(item.reference_type_label, "-")}`}
            />
            <DetailStatCard
              label="Location"
              value={`${formatDetailValue(item.location_id, "-")} / ${formatDetailValue(item.location_label, "-")}`}
            />
            <DetailStatCard
              label="Business links"
              value={
                <div className="space-y-1 text-sm font-medium text-slate-700">
                  <div>Day: {formatDetailValue(item.day_id, "-")}</div>
                  <div>Distribution: {formatDetailValue(item.distribution_id, "-")}</div>
                  <div>Internal delivery: {formatDetailValue(item.internal_delivery_id, "-")}</div>
                  <div>Reception: {formatDetailValue(item.reception_id, "-")}</div>
                </div>
              }
            />
            <DetailStatCard label="Record ID" value={formatDetailValue(item.movement_id, "-")} />
          </DetailStatGrid>

          <DetailSection
            title="Movement lines"
            description="Product and lot details pulled from the real movement line table."
          >

            {item.lines.length === 0 ? (
              <EmptyState className="m-6 border-0 bg-muted/20 shadow-none" />
            ) : (
            <div className="overflow-x-auto">
            <table className="table-auto w-full border-collapse text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-sm font-semibold">Line ID</th>
                  <th className="px-4 py-3 text-sm font-semibold">Product</th>
                  <th className="px-4 py-3 text-sm font-semibold">Lot</th>
                  <th className="px-4 py-3 text-sm font-semibold">Quantity</th>
                  <th className="px-4 py-3 text-sm font-semibold">Motif ID</th>
                </tr>
              </thead>
                <tbody>
                  {item.lines.map((line) => (
                  <tr key={line.line_id} className="border-t border-slate-200 hover:bg-emerald-50/30">
                    <td className="px-4 py-3 font-medium">{line.line_id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{formatDetailValue(line.product_lib)}</div>
                      <div className="text-xs text-slate-500">Product ID: {formatDetailValue(line.product_id, "-")}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{formatDetailValue(line.lot_label)}</div>
                      <div className="text-xs text-slate-500">Lot ID: {formatDetailValue(line.lot_id, "-")}</div>
                    </td>
                    <td className="px-4 py-3">{line.movement_qte}</td>
                    <td className="px-4 py-3">{line.motif_id ?? "Not available"}</td>
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
