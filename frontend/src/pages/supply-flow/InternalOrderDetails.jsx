import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchInternalOrderById } from "@/api/supply-flow";
import { DetailBackLink, DetailHero, DetailSection, DetailStatCard, DetailStatGrid, formatDetailValue, } from "@/components/ui/detail-view";
import { EmptyState } from "@/components/ui/EmptyState";
export default function InternalOrderDetails() {
    const { id } = useParams();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        const parsed = Number(id);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            setError("Invalid internal order id.");
            setLoading(false);
            return;
        }
        let active = true;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await fetchInternalOrderById(parsed);
                if (active)
                    setItem(data);
            }
            catch (err) {
                if (active) {
                    setError(err?.response?.data?.message || "Failed to load internal order.");
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
      <DetailBackLink to="/app/internal-orders" label="Back to internal orders"/>
      {loading && <div className="rounded-3xl border border-border bg-white p-8 text-center text-muted-foreground shadow-sm">Loading internal order...</div>}
      {error && !loading && <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">{error}</div>}
      {item && !loading && !error && (<>
          <DetailHero eyebrow="Supply flow" title={String(item.order_number || `Internal order #${item.internal_order_id}`)} description="This view helps the user understand destination, state, and ordered items at a glance before digging into the individual lines." badge={`${item.lines.length} line${item.lines.length === 1 ? "" : "s"}`}/>
          <DetailStatGrid>
            <DetailStatCard label="Order date" value={item.order_date ? new Date(item.order_date).toLocaleString() : "Not available"} emphasis/>
            <DetailStatCard label="Location" value={`${formatDetailValue(item.emplacement_id, "-")} / ${formatDetailValue(item.emplacement_label, "-")}`}/>
            <DetailStatCard label="State / type" value={`${formatDetailValue(item.state_label, "-")} / ${formatDetailValue(item.type_label, "-")}`}/>
            <DetailStatCard label="Day ID" value={formatDetailValue(item.day_id, "-")}/>
          </DetailStatGrid>
          <DetailSection title="Internal order lines" description="These are the requested products and ordered quantities from the Oracle internal order lines.">
            {item.lines.length === 0 ? (<EmptyState className="m-6 border-0 bg-muted/20 shadow-none"/>) : (<div className="overflow-x-auto">
            <table className="table-auto w-full border-collapse text-sm">
              <thead className="bg-slate-50"><tr className="text-left"><th className="px-4 py-3 text-sm font-semibold">Line ID</th><th className="px-4 py-3 text-sm font-semibold">Product</th><th className="px-4 py-3 text-sm font-semibold">Order QTE</th></tr></thead>
              <tbody>
                {item.lines.map((line) => <tr key={line.line_id} className="border-t border-slate-200 hover:bg-emerald-50/30"><td className="px-4 py-3 font-medium">{line.line_id}</td><td className="px-4 py-3"><div className="font-medium text-slate-900">{formatDetailValue(line.product_lib)}</div><div className="text-xs text-slate-500">Product ID: {formatDetailValue(line.product_id, "-")}</div></td><td className="px-4 py-3">{line.order_qte}</td></tr>)}
              </tbody>
            </table>
            </div>)}
          </DetailSection>
        </>)}
    </div>);
}
