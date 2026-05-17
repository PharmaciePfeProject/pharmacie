import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchReceptionById } from "@/api/supply-flow";
import { DetailBackLink, DetailHero, DetailSection, DetailStatCard, DetailStatGrid, formatDetailValue, } from "@/components/ui/detail-view";
import { EmptyState } from "@/components/ui/EmptyState";
export default function ReceptionDetails() {
    const { id } = useParams();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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
                if (active)
                    setItem(data);
            }
            catch (err) {
                if (active) {
                    setError(err?.response?.data?.message || "Failed to load reception.");
                    setItem(null);
                }
            }
            finally {
                if (active)
                    setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [id]);
    return (<div className="space-y-6">
      <DetailBackLink to="/app/receptions" label="Back to receptions"/>
      {loading && <div className="rounded-3xl border border-border bg-white p-8 text-center text-muted-foreground shadow-sm">Loading reception...</div>}
      {error && !loading && <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">{error}</div>}
      {item && !loading && !error && (<>
          <DetailHero eyebrow="Supply flow" title={String(item.reception_number || `Reception #${item.reception_id}`)} description="This detail view highlights the receiving context first, then the product, lot, quantity, and invoice fields below." badge={`${item.lines.length} line${item.lines.length === 1 ? "" : "s"}`}/>
          <DetailStatGrid>
            <DetailStatCard label="Reception date" value={item.date_reception ? new Date(item.date_reception).toLocaleString() : "Not available"} emphasis/>
            <DetailStatCard label="External order" value={`${formatDetailValue(item.external_order_id, "-")} / ${formatDetailValue(item.external_order_number, "-")}`}/>
            <DetailStatCard label="Location / state" value={`${formatDetailValue(item.emplacement_label, "-")} / ${formatDetailValue(item.state_label, "-")}`}/>
            <DetailStatCard label="User" value={formatDetailValue(item.username)}/>
          </DetailStatGrid>
          <DetailStatGrid>
            <DetailStatCard label="Invoice" value={formatDetailValue(item.num_invoice, "-")}/>
            <DetailStatCard label="External delivery" value={formatDetailValue(item.num_external_delivery, "-")}/>
            <DetailStatCard label="Type" value={`${formatDetailValue(item.type_id, "-")} / ${formatDetailValue(item.type_label, "-")}`}/>
            <DetailStatCard label="Day ID" value={formatDetailValue(item.day_id, "-")}/>
          </DetailStatGrid>
          <DetailSection title="Reception lines" description="These lines show the received lots, expiry dates, and commercial values from Oracle.">
            {item.lines.length === 0 ? (<EmptyState className="m-6 border-0 bg-muted/20 shadow-none"/>) : (<div className="overflow-x-auto">
            <table className="table-auto w-full border-collapse text-sm">
              <thead className="bg-slate-50"><tr className="text-left"><th className="px-4 py-3 text-sm font-semibold">Line ID</th><th className="px-4 py-3 text-sm font-semibold">Product</th><th className="px-4 py-3 text-sm font-semibold">Lot</th><th className="px-4 py-3 text-sm font-semibold">Expiry</th><th className="px-4 py-3 text-sm font-semibold">Invoice QTE</th><th className="px-4 py-3 text-sm font-semibold">Reception QTE</th><th className="px-4 py-3 text-sm font-semibold">Price</th><th className="px-4 py-3 text-sm font-semibold">VAT</th></tr></thead>
              <tbody>
                {item.lines.map((line) => (<tr key={line.line_id} className="border-t border-slate-200 hover:bg-emerald-50/30">
                    <td className="px-4 py-3 font-medium">{line.line_id}</td>
                    <td className="px-4 py-3"><div className="font-medium text-slate-900">{formatDetailValue(line.product_lib)}</div><div className="text-xs text-slate-500">Product ID: {formatDetailValue(line.product_id, "-")}</div></td>
                    <td className="px-4 py-3">{line.lot_label || "Not available"}</td>
                    <td className="px-4 py-3">{line.expiration_date ? new Date(line.expiration_date).toLocaleDateString() : "Not available"}</td>
                    <td className="px-4 py-3">{line.invoice_qte}</td>
                    <td className="px-4 py-3">{line.reception_qte}</td>
                    <td className="px-4 py-3">{line.price}</td>
                    <td className="px-4 py-3">{line.vat}</td>
                  </tr>))}
              </tbody>
            </table>
            </div>)}
          </DetailSection>
        </>)}
    </div>);
}
