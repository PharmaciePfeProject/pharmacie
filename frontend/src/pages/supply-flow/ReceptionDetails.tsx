import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { fetchReceptionById } from "@/api/supply-flow";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Reception } from "@/types/supply-flow";

export default function ReceptionDetails() {
  const { id } = useParams();
  const [item, setItem] = useState<Reception | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const parsed = Number(id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setError("Invalid reception id.");
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchReceptionById(parsed);
        if (active) setItem(data);
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message || "Failed to load reception.");
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
      <Link to="/app/receptions"><Button variant="outline" className="rounded-2xl"><ArrowLeft className="mr-2 h-4 w-4" />Back to receptions</Button></Link>
      {loading && <div className="rounded-3xl border border-border bg-white p-8 text-center text-muted-foreground shadow-sm">Loading reception...</div>}
      {error && !loading && <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">{error}</div>}
      {item && !loading && !error && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm"><p className="text-sm text-muted-foreground">Reception number</p><p className="mt-2 text-lg font-semibold">{item.reception_number || "-"}</p></div>
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm"><p className="text-sm text-muted-foreground">Date reception</p><p className="mt-2 text-lg font-semibold">{item.date_reception ? new Date(item.date_reception).toLocaleString() : "-"}</p></div>
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm"><p className="text-sm text-muted-foreground">External order</p><p className="mt-2 text-lg font-semibold">{item.external_order_id ?? "-"} / {item.external_order_number || "-"}</p></div>
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm"><p className="text-sm text-muted-foreground">Emplacement / State</p><p className="mt-2 text-lg font-semibold">{item.emplacement_label || "-"} / {item.state_label || "-"}</p></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm"><p className="text-sm text-muted-foreground">User</p><p className="mt-2 font-semibold">{item.username || "-"}</p></div>
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm"><p className="text-sm text-muted-foreground">Invoice</p><p className="mt-2 font-semibold">{item.num_invoice || "-"}</p></div>
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm"><p className="text-sm text-muted-foreground">External delivery</p><p className="mt-2 font-semibold">{item.num_external_delivery || "-"}</p></div>
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm"><p className="text-sm text-muted-foreground">Type</p><p className="mt-2 font-semibold">{item.type_id ?? "-"} / {item.type_label || "-"}</p></div>
          </div>
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <div className="border-b border-border px-6 py-4"><h3 className="text-lg font-semibold">Reception lines</h3></div>
            {item.lines.length === 0 ? (
              <EmptyState className="m-6 border-0 bg-muted/20 shadow-none" />
            ) : (
            <table className="table-auto w-full border-collapse text-sm">
              <thead className="bg-muted/50"><tr className="text-left"><th className="px-4 py-3 text-sm font-semibold">Line ID</th><th className="px-4 py-3 text-sm font-semibold">Product</th><th className="px-4 py-3 text-sm font-semibold">Lot</th><th className="px-4 py-3 text-sm font-semibold">Expiry</th><th className="px-4 py-3 text-sm font-semibold">Invoice QTE</th><th className="px-4 py-3 text-sm font-semibold">Reception QTE</th><th className="px-4 py-3 text-sm font-semibold">Price</th><th className="px-4 py-3 text-sm font-semibold">VAT</th></tr></thead>
              <tbody>
                {item.lines.map((line) => (
                  <tr key={line.line_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{line.line_id}</td>
                    <td className="px-4 py-3">{line.product_id ?? "Not available"} / {line.product_lib || "Not available"}</td>
                    <td className="px-4 py-3">{line.lot_label || "Not available"}</td>
                    <td className="px-4 py-3">{line.expiration_date ? new Date(line.expiration_date).toLocaleDateString() : "Not available"}</td>
                    <td className="px-4 py-3">{line.invoice_qte}</td>
                    <td className="px-4 py-3">{line.reception_qte}</td>
                    <td className="px-4 py-3">{line.price}</td>
                    <td className="px-4 py-3">{line.vat}</td>
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
