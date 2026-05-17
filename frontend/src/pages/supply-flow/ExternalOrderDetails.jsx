import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchExternalOrderById, registerExternalInvoice } from "@/api/supply-flow";
import { fetchProducts } from "@/api/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DetailBackLink,
  DetailHero,
  DetailSection,
  DetailStatCard,
  DetailStatGrid,
  formatDetailValue,
} from "@/components/ui/detail-view";
import { EmptyState } from "@/components/ui/EmptyState";

function buildDefaultInvoiceDate() {
  return new Date().toISOString();
}

function toOracleTzString(date) {
  return date.toISOString().replace("Z", "+00:00");
}

function formatCompactDateUtc(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function buildLogicalLotNumber(productId, seedDate, lineIndex) {
  const safeProductId = String(productId || "UNK").replace(/\s+/g, "").slice(0, 12);
  return `LOT-${safeProductId}-${formatCompactDateUtc(seedDate)}-${lineIndex + 1}`;
}

function buildLogicalExpirationDate(seedDate) {
  const expiration = new Date(seedDate.getTime());
  expiration.setUTCMonth(expiration.getUTCMonth() + 24);
  return toOracleTzString(expiration);
}

function buildInvoiceLines(sourceLines = [], products = [], seedDate = new Date()) {
  const productMap = new Map(products.map((product) => [String(product.product_id), product]));

  return sourceLines.map((line, index) => {
    const productId = String(line.product_id);
    return {
      product_id: productId,
      order_qte: String(line.order_qte || 0),
      invoice_qte: String(line.order_qte || 0),
      price: String(line.price ?? productMap.get(productId)?.price ?? 0),
      vat_rate: String(line.vat_rate ?? productMap.get(productId)?.vat_rate ?? 0),
      lot_number: line.lot_number || buildLogicalLotNumber(productId, seedDate, index),
      expiration_date: line.expiration_date || buildLogicalExpirationDate(seedDate),
    };
  });
}

export default function ExternalOrderDetails() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(buildDefaultInvoiceDate());
  const [deliveryNumber, setDeliveryNumber] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(buildDefaultInvoiceDate());
  const [supplierLabel, setSupplierLabel] = useState("Pharmacie Centrale");
  const [notes, setNotes] = useState("");
  const [invoiceLines, setInvoiceLines] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [products, setProducts] = useState([]);

  const totalAmount = useMemo(() => {
    return invoiceLines.reduce((sum, line) => {
      const quantity = Number(line.invoice_qte || 0);
      const price = Number(line.price || 0);
      return sum + quantity * price;
    }, 0);
  }, [invoiceLines]);

  const loadOrder = async (orderId) => {
    const [data, productResult] = await Promise.all([
      fetchExternalOrderById(orderId),
      fetchProducts({ page: 1, pageSize: 500 }),
    ]);

    setProducts(productResult.items || []);
    setItem(data);
    setInvoiceLines(buildInvoiceLines(data.lines || [], productResult.items || [], new Date()));
    setInvoiceNumber(`INV-${orderId}`);
    setDeliveryNumber(`DEL-${orderId}`);
    setInvoiceDate(buildDefaultInvoiceDate());
    setDeliveryDate(buildDefaultInvoiceDate());
    setSupplierLabel("Pharmacie Centrale");
    setNotes("");
  };

  useEffect(() => {
    const parsed = Number(id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setError("Invalid external order id.");
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        await loadOrder(parsed);
        if (!active) return;
      } catch (err) {
        if (active) {
          setError(err?.response?.data?.message || "Failed to load external order.");
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

  const updateInvoiceLine = (index, field, value) => {
    setInvoiceLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line,
      ),
    );
  };

  const submitInvoice = async () => {
    if (!item) return;
    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(null);
      const normalizedLines = invoiceLines.map((line) => ({
        product_id: Number(line.product_id),
        invoice_qte: Number(line.invoice_qte),
        order_qte: Number(line.order_qte),
        price: Number(line.price),
        vat_rate: Number(line.vat_rate),
        lot_number: line.lot_number || undefined,
        expiration_date: line.expiration_date || undefined,
      }));
      await registerExternalInvoice(item.external_order_id, {
        supplier_label: supplierLabel.trim(),
        invoice_number: invoiceNumber.trim() || undefined,
        invoice_date: invoiceDate,
        delivery_number: deliveryNumber.trim() || undefined,
        delivery_date: deliveryDate,
        total_amount: totalAmount,
        notes: notes.trim() || undefined,
        lines: normalizedLines,
      });
      setSaveSuccess("Invoice registered successfully.");
      await loadOrder(item.external_order_id);
    } catch (err) {
      setSaveError(err?.response?.data?.message || "Unable to register invoice.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <DetailBackLink to="/app/external-orders" label="Back to external orders" />
      {loading && <div className="rounded-3xl border border-border bg-white p-8 text-center text-muted-foreground shadow-sm">Loading external order...</div>}
      {error && !loading && <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">{error}</div>}
      {item && !loading && !error && (
        <>
          <DetailHero
            eyebrow="Supply flow"
            title={String(item.order_number || `External order #${item.external_order_id}`)}
            description="Review the purchase order summary, then register the supplier invoice and received lines below."
            badge={`${item.lines.length} line${item.lines.length === 1 ? "" : "s"}`}
          />
          <DetailStatGrid>
            <DetailStatCard label="Order date" value={item.order_date ? new Date(item.order_date).toLocaleString() : "Not available"} emphasis />
            <DetailStatCard label="Location" value={`${formatDetailValue(item.emplacement_id, "-")} / ${formatDetailValue(item.emplacement_label, "-")}`} />
            <DetailStatCard label="State" value={`${formatDetailValue(item.state_id, "-")} / ${formatDetailValue(item.state_label, "-")}`} />
            <DetailStatCard label="Day ID" value={formatDetailValue(item.day_id, "-")} />
          </DetailStatGrid>

          <DetailSection title="Register invoice" description="Fill the supplier invoice details, adjust quantities if needed, and save the full reception trail.">
            <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">Supplier label</p>
                <Input value={supplierLabel} readOnly />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Invoice number</p>
                <Input value={invoiceNumber} readOnly />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Invoice date</p>
                <Input value={invoiceDate} readOnly />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Delivery number</p>
                <Input value={deliveryNumber} readOnly />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Delivery date</p>
                <Input value={deliveryDate} readOnly />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Notes</p>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
              </div>
            </div>

            <div className="px-6 pb-6">
              <div className="grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Estimated total</p>
                  <p className="text-lg font-bold text-emerald-900">{totalAmount.toFixed(3)} TND</p>
                </div>
                <div className="sm:col-span-2 flex items-end justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setInvoiceLines(buildInvoiceLines(item.lines || [], products, new Date()))}>
                    Reset lines
                  </Button>
                  <Button type="button" onClick={submitInvoice} disabled={saving}>
                    {saving ? "Saving..." : "Register invoice"}
                  </Button>
                </div>
              </div>

              {saveError ? <p className="mt-4 text-sm text-destructive">{saveError}</p> : null}
              {saveSuccess ? <p className="mt-4 text-sm text-emerald-700">{saveSuccess}</p> : null}

              <div className="mt-6 space-y-3">
                {invoiceLines.map((line, index) => (
                  <div key={`${line.product_id}-${index}`} className="grid gap-3 rounded-xl border p-4 xl:grid-cols-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Product</p>
                      <p className="font-medium text-slate-900">{item.lines[index]?.product_lib || `Product ${line.product_id}`}</p>
                      <p className="text-xs text-muted-foreground">Order qty: {item.lines[index]?.order_qte ?? "-"}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Invoice qty</p>
                      <Input type="number" min="0" step="1" value={line.invoice_qte} onChange={(e) => updateInvoiceLine(index, "invoice_qte", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Price</p>
                      <Input type="number" min="0" step="0.001" value={line.price} onChange={(e) => updateInvoiceLine(index, "price", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">VAT %</p>
                      <Input type="number" min="0" step="0.001" value={line.vat_rate} onChange={(e) => updateInvoiceLine(index, "vat_rate", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Lot / Expiry</p>
                      <Input placeholder="Lot number" value={line.lot_number} onChange={(e) => updateInvoiceLine(index, "lot_number", e.target.value)} />
                      <Input placeholder="Expiration date" value={line.expiration_date} onChange={(e) => updateInvoiceLine(index, "expiration_date", e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DetailSection>

          <DetailSection title="External order lines" description="Ordered quantities, price, and VAT are shown directly from the Oracle order lines.">
            {item.lines.length === 0 ? (
              <EmptyState className="m-6 border-0 bg-muted/20 shadow-none" />
            ) : (
              <div className="overflow-x-auto">
                <table className="table-auto w-full border-collapse text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left">
                      <th className="px-4 py-3 text-sm font-semibold">Line ID</th>
                      <th className="px-4 py-3 text-sm font-semibold">Product</th>
                      <th className="px-4 py-3 text-sm font-semibold">Order QTE</th>
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
                        <td className="px-4 py-3">{line.order_qte}</td>
                        <td className="px-4 py-3">{line.price ?? "Not available"}</td>
                        <td className="px-4 py-3">{line.vat_rate ?? "Not available"}</td>
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