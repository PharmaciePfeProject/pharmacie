import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchInventoryById } from "@/api/inventory";
import {
  DetailBackLink,
  DetailHero,
  DetailSection,
  DetailStatCard,
  DetailStatGrid,
  formatDetailValue,
} from "@/components/ui/detail-view";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Inventory } from "@/types/inventory";

export default function InventoryDetails() {
  const { id } = useParams();
  const [item, setItem] = useState<Inventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const inventoryId = Number(id);

    if (!Number.isInteger(inventoryId) || inventoryId <= 0) {
      setError("Invalid inventory id.");
      setLoading(false);
      return;
    }

    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const inventory = await fetchInventoryById(inventoryId);
        if (active) {
          setItem(inventory);
        }
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message || "Failed to load inventory.");
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
      <DetailBackLink to="/app/inventories" label="Back to inventories" />

      {loading && (
        <div className="rounded-3xl border border-border bg-white p-8 text-center text-muted-foreground shadow-sm">
          Loading inventory...
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
            eyebrow="Inventory"
            title={String(item.date_inv ? `Inventory of ${new Date(item.date_inv).toLocaleDateString()}` : `Inventory #${item.inventory_id}`)}
            description="This view highlights the reconciliation context first, then shows counted versus system quantities in a cleaner line table."
            badge={`${item.lines.length} line${item.lines.length === 1 ? "" : "s"}`}
          />

          <DetailStatGrid>
            <DetailStatCard
              label="Inventory date"
              value={item.date_inv ? new Date(item.date_inv).toLocaleString() : "Not available"}
              emphasis
            />
            <DetailStatCard
              label="Location"
              value={`${formatDetailValue(item.location_id, "-")} / ${formatDetailValue(item.location_label, "-")}`}
            />
            <DetailStatCard
              label="State"
              value={`${formatDetailValue(item.state_id, "-")} / ${formatDetailValue(item.state_label, "-")}`}
            />
            <DetailStatCard label="User" value={formatDetailValue(item.username)} />
          </DetailStatGrid>

          <DetailSection
            title="Inventory lines"
            description="Counted values and system values are shown directly from Oracle."
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
                  <th className="px-4 py-3 text-sm font-semibold">Invent QTE</th>
                  <th className="px-4 py-3 text-sm font-semibold">Stock QTE</th>
                  <th className="px-4 py-3 text-sm font-semibold">Stock QTE lot</th>
                  <th className="px-4 py-3 text-sm font-semibold">Discard</th>
                  <th className="px-4 py-3 text-sm font-semibold">Price</th>
                  <th className="px-4 py-3 text-sm font-semibold">VAT</th>
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
                    <td className="px-4 py-3">{line.invent_qte}</td>
                    <td className="px-4 py-3">{line.stock_qte}</td>
                    <td className="px-4 py-3">{line.stock_qte_lot}</td>
                    <td className="px-4 py-3">{line.discard}</td>
                    <td className="px-4 py-3">{line.price}</td>
                    <td className="px-4 py-3">{line.vat_rate}</td>
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
