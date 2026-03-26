import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { fetchInventoryById } from "@/api/inventory";
import { Button } from "@/components/ui/button";
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
      <Link to="/app/inventories">
        <Button variant="outline" className="rounded-2xl">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to inventories
        </Button>
      </Link>

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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Date inventory</p>
              <p className="mt-2 text-lg font-semibold">
                {item.date_inv ? new Date(item.date_inv).toLocaleString() : "-"}
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="mt-2 text-lg font-semibold">
                {item.location_id ?? "-"} / {item.location_label || "-"}
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">State</p>
              <p className="mt-2 text-lg font-semibold">
                {item.state_id ?? "-"} / {item.state_label || "-"}
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">User</p>
              <p className="mt-2 text-lg font-semibold">{item.username || "-"}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <div className="border-b border-border px-6 py-4">
              <h3 className="text-lg font-semibold">Inventory lines</h3>
              <p className="text-sm text-muted-foreground">
                Counted values and system values are shown directly from Oracle.
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
                  <tr key={line.line_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{line.line_id}</td>
                    <td className="px-4 py-3">
                      {line.product_id ?? "Not available"} / {line.product_lib || "Not available"}
                    </td>
                    <td className="px-4 py-3">
                      {line.lot_id ?? "Not available"} / {line.lot_label || "Not available"}
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
            )}
          </div>
        </>
      )}
    </div>
  );
}
