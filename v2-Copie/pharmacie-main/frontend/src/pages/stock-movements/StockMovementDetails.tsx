import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { fetchStockMovementById } from "@/api/stock-movements";
import { Button } from "@/components/ui/button";
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
      <Link to="/app/stock-movements">
        <Button variant="outline" className="rounded-2xl">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to movements
        </Button>
      </Link>

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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Movement number</p>
              <p className="mt-2 text-lg font-semibold">{item.num_movement || "-"}</p>
            </div>

            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Date movement</p>
              <p className="mt-2 text-lg font-semibold">
                {item.date_movement ? new Date(item.date_movement).toLocaleString() : "-"}
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Type / Descriminator</p>
              <p className="mt-2 text-lg font-semibold">
                {item.type_mvt || "-"} / {item.descriminator || "-"}
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">User</p>
              <p className="mt-2 text-lg font-semibold">{item.username || "-"}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Reference type</p>
              <p className="mt-2 font-semibold">
                {item.reference_type_id ?? "-"} / {item.reference_type_label || "-"}
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="mt-2 font-semibold">
                {item.location_id ?? "-"} / {item.location_label || "-"}
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Business links</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Day: {item.day_id ?? "-"} | Distribution: {item.distribution_id ?? "-"} | Internal delivery: {item.internal_delivery_id ?? "-"} | Reception: {item.reception_id ?? "-"}
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Lines</p>
              <p className="mt-2 text-2xl font-semibold">{item.lines.length}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <div className="border-b border-border px-6 py-4">
              <h3 className="text-lg font-semibold">Movement lines</h3>
              <p className="text-sm text-muted-foreground">
                Product and lot details from the real movement line table.
              </p>
            </div>

            {item.lines.length === 0 ? (
              <EmptyState className="m-6 border-0 bg-muted/20 shadow-none" />
            ) : (
            <table className="table-auto w-full border-collapse text-sm">
              <thead className="bg-muted/50">
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
                  <tr key={line.line_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{line.line_id}</td>
                    <td className="px-4 py-3">
                      {line.product_id ?? "Not available"} / {line.product_lib || "Not available"}
                    </td>
                    <td className="px-4 py-3">
                      {line.lot_id ?? "Not available"} / {line.lot_label || "Not available"}
                    </td>
                    <td className="px-4 py-3">{line.movement_qte}</td>
                    <td className="px-4 py-3">{line.motif_id ?? "Not available"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
